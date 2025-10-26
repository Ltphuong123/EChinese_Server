// file: services/refundService.js

const refundModel = require('../models/refundModel');
const paymentModel = require('../models/paymentModel'); // Cần để cập nhật payment
const userSubscriptionModel = require('../models/userSubscriptionModel'); // Cần để hủy gói
const db = require('../config/db');

const refundService = {
  // --- Services cho Admin ---
  getAll: async (options) => {
    const { refunds, totalItems } = await refundModel.findAllAndPaginate(options);
    const totalPages = Math.ceil(totalItems / options.limit);
    
    return {
      data: refunds,
      meta: {
        total: totalItems,
        page: options.page,
        limit: options.limit,
        totalPages,
      }
    };
  },

  processRefund: async (refundId, payload) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        const refund = await refundModel.findById(refundId, client);
        if (!refund) throw new Error('Refund request not found.');
        if (refund.status !== 'pending') throw new Error('Only pending requests can be processed.');
        
        const { action, adminId, notes, amount, method } = payload;
        let newStatus = '';
        const updateData = {
            processed_by_admin: adminId,
            processed_at: new Date(),
        };

        if (action === 'approve') {
            if (!amount || !method) throw new Error('Amount and method are required for approval.');
            newStatus = 'completed';
            updateData.refund_amount = amount;
            updateData.refund_method = method;
        } else if (action === 'reject') {
            newStatus = 'rejected';
        } else {
            throw new Error('Invalid action.');
        }
        
        updateData.status = newStatus;

        // 1. Cập nhật bản ghi Refund
        const updatedRefund = await refundModel.update(refundId, updateData, client);

        // 2. Nếu approve, cập nhật Payment và hủy Subscription
        if (action === 'approve') {
            // Đánh dấu Payment là đã hoàn tiền
            await paymentModel.updateStatus(refund.payment_id, 'refunded', adminId, client);
            
            // Tìm và hủy gói đăng ký liên quan đến payment này
            const userSub = await userSubscriptionModel.findBy('last_payment_id', refund.payment_id);
            if(userSub) {
                await userSubscriptionModel.update(userSub.id, { is_active: false }, client);
            }
        }
        
        await client.query('COMMIT');
        return updatedRefund;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
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
  }
};

// Cần thêm hàm findBy vào userSubscriptionModel
// file: models/userSubscriptionModel.js
// async findBy(field, value, client = db) {
//     const queryText = `SELECT * FROM "UserSubscriptions" WHERE "${field}" = $1 LIMIT 1;`;
//     const result = await client.query(queryText, [value]);
//     return result.rows[0];
// }

module.exports = refundService;