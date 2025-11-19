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
      
      const refundRequest = await refundModel.create({ payment_id: paymentId, user_id: userId, reason });
      
      // Gửi thông báo xác nhận đã nhận yêu cầu hoàn tiền
      try {
          const notificationService = require('./notificationService');
          const subscriptionModel = require('../models/subscriptionModel');
          const subscription = payment.subscription_id 
              ? await subscriptionModel.findById(payment.subscription_id)
              : null;
          
          await notificationService.createNotification({
              recipient_id: userId,
              audience: 'user',
              type: 'system',
              title: '📝 Yêu cầu hoàn tiền đã được gửi',
              content: {
                  message: `Yêu cầu hoàn tiền cho gói "${subscription?.name || 'đăng ký'}" đã được gửi thành công. Chúng tôi sẽ xem xét và phản hồi trong vòng 24-48 giờ.`,
                  action: 'refund_requested',
                  subscription_name: subscription?.name || 'Premium',
                  amount: payment.amount
              },
              redirect_type: 'refund',
              data: {
                  refund_id: refundRequest.id,
                  payment_id: paymentId,
                  subscription_id: payment.subscription_id || null,
                  subscription_name: subscription?.name || 'Premium',
                  amount: payment.amount,
                  currency: 'VND',
                  reason: reason,
                  requested_at: new Date().toISOString(),
                  estimated_response_time: '24-48 giờ'
              },
              priority: 1,
              from_system: true
          }, true); // auto push = true
      } catch (notifError) {
          console.error('Error sending refund request notification:', notifError);
          // Không throw để không ảnh hưởng đến việc tạo yêu cầu
      }
      
      return refundRequest;
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
                
                // Lấy thông tin gói đăng ký
                const subscriptionModel = require('../models/subscriptionModel');
                const subscription = paymentInfo?.subscription_id 
                    ? await subscriptionModel.findById(paymentInfo.subscription_id)
                    : null;
                
                if (action === 'approve') {
                    // Thông báo chấp nhận hoàn tiền với auto push
                    await notificationService.createNotification({
                        recipient_id: refundRequest.user_id,
                        audience: 'user',
                        type: 'system',
                        title: '✅ Yêu cầu hoàn tiền đã được chấp nhận',
                        content: { 
                            message: `Yêu cầu hoàn tiền cho gói "${subscription?.name || 'đăng ký'}" đã được chấp nhận. Số tiền ${amount.toLocaleString('vi-VN')}đ sẽ được hoàn về trong 3-5 ngày làm việc.`,
                            action: 'refund_approved',
                            refund_amount: amount,
                            subscription_name: subscription?.name || 'Premium',
                            refund_method: method
                        },
                        redirect_type: 'refund',
                        data: { 
                            refund_id: refundId,
                            payment_id: refundRequest.payment_id,
                            subscription_id: paymentInfo?.subscription_id || null,
                            subscription_name: subscription?.name || 'Premium',
                            refund_amount: amount,
                            original_amount: paymentInfo?.amount || amount,
                            currency: 'VND',
                            refund_method: method,
                            approved_by: adminId,
                            approved_at: new Date().toISOString(),
                            estimated_refund_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                            admin_notes: notes || null
                        },
                        priority: 2,
                        from_system: true
                    }, true); // auto push = true
                } else {
                    // Thông báo từ chối hoàn tiền với auto push
                    await notificationService.createNotification({
                        recipient_id: refundRequest.user_id,
                        audience: 'user',
                        type: 'system',
                        title: '❌ Yêu cầu hoàn tiền đã bị từ chối',
                        content: { 
                            message: `Yêu cầu hoàn tiền cho gói "${subscription?.name || 'đăng ký'}" không được chấp nhận. Lý do: ${notes || 'Không đủ điều kiện hoàn tiền'}`,
                            action: 'refund_rejected',
                            subscription_name: subscription?.name || 'Premium',
                            rejection_reason: notes || 'Không đủ điều kiện hoàn tiền'
                        },
                        redirect_type: 'refund',
                        data: { 
                            refund_id: refundId,
                            payment_id: refundRequest.payment_id,
                            subscription_id: paymentInfo?.subscription_id || null,
                            subscription_name: subscription?.name || 'Premium',
                            requested_amount: paymentInfo?.amount || 0,
                            currency: 'VND',
                            rejection_reason: notes || 'Không đủ điều kiện hoàn tiền',
                            rejected_by: adminId,
                            rejected_at: new Date().toISOString(),
                            user_reason: refundRequest.reason || null
                        },
                        priority: 2,
                        from_system: true
                    }, true); // auto push = true
                }
            } catch (error) {
                console.error('❌ Error sending refund notification:', error);
                // Không throw để không ảnh hưởng đến việc xử lý hoàn tiền
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