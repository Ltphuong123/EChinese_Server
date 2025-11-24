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
              title: 'Yêu cầu hoàn tiền đã được gửi',
              content: {
                  html: `<p>Yêu cầu hoàn tiền cho gói <strong>"${subscription?.name || 'đăng ký'}"</strong> đã được gửi.</p><p><strong>Số tiền:</strong> ${payment.amount.toLocaleString('vi-VN')} VNĐ</p><p><strong>Lý do:</strong> ${reason}</p><p><strong>Trạng thái:</strong> Đang xử lý</p><hr><p><small><strong>📌 Thông tin chi tiết:</strong></small></p><ul style="font-size: 0.9em;"><li><strong>Mã yêu cầu:</strong> ${refundRequest.id}</li><li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li><li><strong>Thời gian xử lý:</strong> 3-5 ngày làm việc</li></ul><p><small>⏳ Chúng tôi sẽ xem xét và phản hồi sớm.</small></p>`
              },
              redirect_type: 'subscription',
              data: {
                  id: refundRequest.id,
                  type: 'refund'
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
                        title: 'Yêu cầu hoàn tiền đã được chấp nhận',
                        content: { 
                            html: `<p>Yêu cầu hoàn tiền cho gói <strong>"${subscription?.name || 'đăng ký'}"</strong> đã được chấp nhận.</p><p><strong>Số tiền:</strong> ${amount.toLocaleString('vi-VN')} VNĐ</p><p><strong>Phương thức:</strong> ${method}</p>${notes ? `<p><strong>Ghi chú:</strong> ${notes}</p>` : ''}<hr><p><small><strong>📌 Thông tin chi tiết:</strong></small></p><ul style="font-size: 0.9em;"><li><strong>Mã yêu cầu:</strong> ${refundId}</li><li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li><li><strong>Hoàn tiền trong:</strong> 5-7 ngày làm việc</li></ul><p><small>💰 Số tiền sẽ được hoàn về tài khoản của bạn.</small></p>`
                        },
                        redirect_type: 'subscription',
                        data: { 
                            id: refundId,
                            type: 'refund'
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
                        title: 'Yêu cầu hoàn tiền bị từ chối',
                        content: { 
                            html: `<p>Yêu cầu hoàn tiền cho gói <strong>"${subscription?.name || 'đăng ký'}"</strong> đã bị từ chối.</p><p><strong>Lý do:</strong> ${notes || 'Không đủ điều kiện hoàn tiền'}</p><p><strong>Số tiền yêu cầu:</strong> ${(paymentInfo?.amount || 0).toLocaleString('vi-VN')} VNĐ</p><hr><p><small><strong>📌 Thông tin chi tiết:</strong></small></p><ul style="font-size: 0.9em;"><li><strong>Mã yêu cầu:</strong> ${refundId}</li><li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li><li><strong>Xử lý bởi:</strong> Quản trị viên</li></ul><p><small>💡 Vui lòng liên hệ hỗ trợ nếu có thắc mắc.</small></p>`
                        },
                        redirect_type: 'subscription',
                        data: { 
                            id: refundId,
                            type: 'refund_rejected'
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


  deleteAllRefunds: async (adminId, confirmationCode) => {
    const REQUIRED_CODE = process.env.DELETE_ALL_REFUNDS_CODE || 'DELETE_ALL_REFUNDS';
    
    if (confirmationCode !== REQUIRED_CODE) {
      throw new Error('Mã xác nhận không đúng. Vui lòng kiểm tra lại.');
    }

    const deletedCount = await refundModel.deleteAll();
    
    return { deletedCount };
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