// file: services/refundService.js

const refundModel = require('../models/refundModel');
const paymentModel = require('../models/paymentModel'); // Cần để cập nhật payment
const userSubscriptionModel = require('../models/userSubscriptionModel'); // Cần để hủy gói
const userSubscriptionService = require('./userSubscriptionService');
const userModel = require('../models/userModel');
const db = require('../config/db');
class ValidationError extends Error { /* ... */ }
class BusinessLogicError extends Error { /* ... */ }


const refundService = {
  // --- Services cho Admin ---
  getAll: async (options) => {
    const { refundRequests, totalItems } = await refundModel.findAllAndPaginate(options);
    const totalPages = Math.ceil(totalItems / options.limit);
    
    return {
      data: refundRequests,
      meta: {
        total: totalItems,
        page: options.page,
        limit: options.limit,
        totalPages,
      }
    };
  },

  // --- Services cho User ---
  requestRefund: async (userId, paymentId, reason) => {
      // Logic kiểm tra điều kiện hoàn tiền (ví dụ: trong vòng 7 ngày) có thể thêm ở đây
      const payment = await paymentModel.findById(paymentId);
      if (!payment || payment.user_id !== userId) {
          throw new Error("Payment not found or does not belong to the user.");
      }
      if (payment.status !== 'successful' && payment.status !== 'manual_confirmed') {
          throw new Error("Only successful payments can be refunded.");
      }
      
      // Kiểm tra xem đã có yêu cầu refund cho payment này chưa
      // ...
      
      return await refundModel.create({ payment_id: paymentId, user_id: userId, reason });
  },

  getRefundHistory: async (userId) => {
      return await refundModel.findByUserId(userId);
  },

  



  processRefundRequest: async (refundId, adminId, payload) => {
        // --- BƯỚC 1: VALIDATION DỮ LIỆU ĐẦU VÀO ---
        const { action, notes, amount, method } = payload;

        if (!action || !['approve', 'reject'].includes(action)) {
            const error = new Error('Action phải là "approve" hoặc "reject".');
            error.statusCode = 400; // Bad Request
            throw error;
        }
        if (!adminId) {
            const error = new Error('Thiếu thông tin người xử lý (adminId).');
            error.statusCode = 400;
            throw error;
        }
        if (action === 'approve') {
            if (typeof amount !== 'number' || amount <= 0) {
                const error = new Error('Số tiền hoàn trả (amount) phải là một số dương.');
                error.statusCode = 400;
                throw error;
            }
            if (!method) {
                const error = new Error('Phương thức hoàn tiền (method) là bắt buộc khi chấp thuận.');
                error.statusCode = 400;
                throw error;
            }
        }
        
        // --- BƯỚC 2: MỞ TRANSACTION VÀ XỬ LÝ LOGIC ---
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 2.1. Lấy và kiểm tra yêu cầu hoàn tiền
            const refundRequest = await refundModel.findById(refundId, client);
            if (!refundRequest) {
                const error = new Error(`Yêu cầu hoàn tiền với ID ${refundId} không tồn tại.`);
                error.statusCode = 404; // Not Found
                throw error;
            }
            if (refundRequest.status !== 'pending') {
                const error = new Error(`Yêu cầu này đã được xử lý trước đó (trạng thái: ${refundRequest.status}).`);
                error.statusCode = 409; // Conflict
                throw error;
            }
            
            // 2.2. Chuẩn bị dữ liệu để cập nhật
            const updateData = {
                processed_by_admin: adminId,
                processed_at: new Date(),
                status: action === 'approve' ? 'completed' : 'rejected',
            };

            if (action === 'approve') {
                updateData.refund_amount = amount;
                updateData.refund_method = method;
                
                // 2.3. Nếu chấp thuận, cập nhật trạng thái thanh toán gốc
                await refundModel.updatePaymentStatus(refundRequest.payment_id, 'refunded', client);
            }

            // 2.4. Cập nhật bản ghi hoàn tiền
            const updatedRefund = await refundModel.update(refundId, updateData, client);

            await client.query('COMMIT');

            // Sau khi commit thành công, nếu refund được chấp thuận thì
            // kiểm tra xem user có gói đăng ký đang hoạt động hay không.
            // Nếu có, gọi hàm updateSubscriptionDetails để hủy ngay (cancel_now).
            if (action === 'approve') {
                try {
                    const activeSub = await userSubscriptionModel.findActiveSubscriptionByUserId(refundRequest.user_id);
                    if (activeSub && activeSub.is_active) {
                        // Gọi service để thực hiện cancel_now. Gói này tự quản transaction.
                        await userSubscriptionService.updateSubscriptionDetails(activeSub.id, { action: 'cancel_now' });
                    }
                } catch (e) {
                    // Không làm rollback refund đã commit; log lỗi để admin/ops xử lý.
                    console.error('Lỗi khi hủy gói sau khi hoàn tiền:', e);
                }
            }

            // 🔔 GỬI THÔNG BÁO KẾT QUẢ XỬ LÝ HOÀN TIỀN
            try {
                const notificationService = require('./notificationService');
                const paymentInfo = await paymentModel.findById(refundRequest.payment_id);
                
                if (action === 'approve') {
                    // Thông báo chấp nhận hoàn tiền
                    await notificationService.createNotification({
                        recipient_id: refundRequest.user_id,
                        audience: 'user',
                        type: 'refund_approved',
                        title: '✅ Yêu cầu hoàn tiền đã được chấp nhận',
                        content: { 
                            message: `Yêu cầu hoàn tiền cho gói ${paymentInfo?.package_name || 'đăng ký'} đã được chấp nhận. Tiền sẽ được hoàn về trong 3-5 ngày làm việc.` 
                        },
                        redirect_type: 'refund_detail',
                        data: { 
                            refund_id: refundId,
                            subscription_id: paymentInfo?.subscription_id || '',
                            package_name: paymentInfo?.package_name || '',
                            refund_amount: String(amount),
                            currency: 'VND',
                            refund_method: method,
                            approved_by: 'admin',
                            approved_at: new Date().toISOString(),
                            estimated_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
                        },
                        priority: 2,
                        from_system: true
                    });
                } else {
                    // Thông báo từ chối hoàn tiền
                    await notificationService.createNotification({
                        recipient_id: refundRequest.user_id,
                        audience: 'user',
                        type: 'refund_rejected',
                        title: '❌ Yêu cầu hoàn tiền đã bị từ chối',
                        content: { 
                            message: `Yêu cầu hoàn tiền cho gói ${paymentInfo?.package_name || 'đăng ký'} không được chấp nhận. Lý do: ${notes || 'Không đủ điều kiện hoàn tiền'}` 
                        },
                        redirect_type: 'refund_detail',
                        data: { 
                            refund_id: refundId,
                            subscription_id: paymentInfo?.subscription_id || '',
                            package_name: paymentInfo?.package_name || '',
                            refund_amount: String(refundRequest.amount || 0),
                            currency: 'VND',
                            reason: notes || 'Không đủ điều kiện hoàn tiền',
                            rejected_by: 'admin',
                            rejected_at: new Date().toISOString()
                        },
                        priority: 2,
                        from_system: true
                    });
                }
            } catch (error) {
                console.error('❌ Error sending refund notification:', error);
            }
            return updatedRefund;

        } catch (error) {
            await client.query('ROLLBACK');
            // Ném lại lỗi để controller bắt
            throw error;
        } finally {
            client.release();
        }
    },




};

// Cần thêm hàm findBy vào userSubscriptionModel
// file: models/userSubscriptionModel.js
// async findBy(field, value, client = db) {
//     const queryText = `SELECT * FROM "UserSubscriptions" WHERE "${field}" = $1 LIMIT 1;`;
//     const result = await client.query(queryText, [value]);
//     return result.rows[0];
// }

module.exports = refundService;