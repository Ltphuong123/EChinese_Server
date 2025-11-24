// file: services/paymentService.js

const paymentModel = require('../models/paymentModel');
const userSubscriptionService = require('./userSubscriptionService'); // Sử dụng lại service đã có
const subscriptionModel = require('../models/subscriptionModel');
const userSubscriptionModel = require('../models/userSubscriptionModel');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Hàm trợ giúp kích hoạt gói đăng ký sau khi thanh toán thành công
 */
async function activateSubscriptionForPayment(payment, client) {
    if (!payment || !payment.user_id || !payment.subscription_id) {
        console.error("Payment is missing required data to activate subscription", payment);
        return;
    }
    // Sử dụng lại logic đã viết trong userSubscriptionService
    // Chúng ta giả định việc thêm mới đã bao gồm việc hủy gói cũ
    await userSubscriptionService.addSubscription(
        payment.user_id, 
        payment.subscription_id,
        { paymentId: payment.id }
    );
}


const paymentService = {

  requestManualPayment: async (userId, subscriptionId, paymentMethod) => {
    // 1. Lấy thông tin gói đăng ký để biết giá tiền
    const subscription = await subscriptionModel.findById(subscriptionId);
    if (!subscription || !subscription.is_active) {
      throw new Error('Subscription plan not found or is not active.');
    }
    if (parseFloat(subscription.price) <= 0) {
        throw new Error('This plan is free and does not require payment.');
    }

    // **QUAN TRỌNG**: Thông tin này nên được lưu trong biến môi trường (.env)
    // thay vì hard-code để dễ dàng thay đổi và bảo mật.
    const bankInfo = {
      bankName: process.env.BANK_NAME || "Vietcombank",
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || "999988887777",
      accountName: process.env.BANK_ACCOUNT_NAME || "NGUYEN VAN A",
      branch: process.env.BANK_BRANCH || "Chi nhánh Hà Nội"
    };

    // Gửi thông báo hướng dẫn thanh toán
    try {
      const notificationService = require('./notificationService');
      await notificationService.createNotification({
        recipient_id: userId,
        audience: 'user',
        type: 'system',
        title: 'Đơn hàng đã được tạo',
        content: {
          html: `<p>Đơn hàng của bạn đã được tạo thành công.</p><p><strong>Gói:</strong> ${subscription.name}</p><p><strong>Giá:</strong> ${subscription.price.toLocaleString('vi-VN')} VNĐ</p><p><strong>Trạng thái:</strong> Chờ thanh toán</p><p><strong>Thông tin chuyển khoản:</strong></p><ul><li>Ngân hàng: ${bankInfo.bankName}</li><li>Số tài khoản: ${bankInfo.accountNumber}</li><li>Chủ tài khoản: ${bankInfo.accountName}</li><li>Chi nhánh: ${bankInfo.branch}</li></ul><hr><p><small><strong>📌 Thông tin chi tiết:</strong></small></p><ul style="font-size: 0.9em;"><li><strong>Gói:</strong> ${subscription.name}</li><li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li><li><strong>Phương thức:</strong> ${paymentMethod}</li></ul><p><small>💳 Vui lòng thanh toán để kích hoạt gói.</small></p>`
        },
        redirect_type: 'subscription',
        data: {
          id: subscriptionId,
          type: 'payment'
        }
      }, true); // auto push = true
    } catch (notifError) {
      console.error('Error sending payment instruction notification:', notifError);
      // Không throw để không ảnh hưởng đến việc tạo yêu cầu thanh toán
    }

    return {
      transferInfo: {
        ...bankInfo,
        amount: subscription.price,
      },
      subscriptionDetails: subscription
    };
  },

  createPayment: async (paymentData, user_id) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Bổ sung các thông tin cần thiết
      const fullPaymentData = {
        ...paymentData,
        user_id,
        gateway_transaction_id: paymentData.gateway_transaction_id || `MANUAL-${uuidv4()}`, 
        payment_channel: 'manual',
      };

      const newPayment = await paymentModel.create(fullPaymentData, client);

      // Nếu trạng thái là 'manual_confirmed', kích hoạt gói ngay
      // if (newPayment.status === 'manual_confirmed') {
      //   // Hàm này đã được viết từ trước, tái sử dụng nó
      //   await activateSubscriptionForPayment(newPayment, client);
      // }
      
      await client.query('COMMIT');
      return newPayment;
      
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') { // unique_violation
          throw new Error(`Gateway Transaction ID '${paymentData.gateway_transaction_id}' already exists.`);
      }
      if (error.code === '23503') { // foreign_key_violation
          throw new Error('User or Subscription plan not found.');
      }
      throw error;
    } finally {
      client.release();
    }
  },

  getAll: async (options) => {
    const { payments, totalItems } = await paymentModel.findAllAndPaginate(options);
    const totalPages = Math.ceil(totalItems / options.limit);
    
    return {
      data: payments,
      meta: {
        total: totalItems,
        page: options.page,
        limit: options.limit,
        totalPages,
      }
    };
  },

  updateStatus: async (paymentId, status, adminId) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      const payment = await paymentModel.findById(paymentId, client);
      if (!payment) {
        throw new Error('Payment not found.');
      }
      if (payment.status !== 'pending') {
          throw new Error('Only pending payments can be updated.');
      }

      const updatedPayment = await paymentModel.updateStatus(paymentId, status, adminId, client);

      // Nếu xác nhận thành công, kích hoạt gói cho người dùng
      if (status === 'manual_confirmed') {
        await activateSubscriptionForPayment(updatedPayment, client);
        
        // Lấy thông tin gói đăng ký
        const subscription = await subscriptionModel.findById(updatedPayment.subscription_id);
        
        // Gửi thông báo xác nhận thanh toán thành công
        const notificationService = require('./notificationService');
        const userSub = await userSubscriptionModel.findActiveSubscriptionByUserId(updatedPayment.user_id, client);
        const expiresAt = userSub?.expiry_date ? new Date(userSub.expiry_date).toLocaleString('vi-VN') : 'N/A';
        
        await notificationService.createNotification({
          recipient_id: updatedPayment.user_id,
          audience: 'user',
          type: 'system',
          title: 'Thanh toán thành công',
          content: {
            html: `<p>Thanh toán cho đơn hàng của bạn đã thành công!</p><p><strong>Gói:</strong> ${subscription?.name || 'Premium'}</p><p><strong>Số tiền:</strong> ${updatedPayment.amount.toLocaleString('vi-VN')} VNĐ</p><p><strong>Thời hạn:</strong> ${subscription?.duration_days || 30} ngày</p><hr><p><small><strong>📌 Thông tin chi tiết:</strong></small></p><ul style="font-size: 0.9em;"><li><strong>Mã giao dịch:</strong> ${updatedPayment.id}</li><li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li><li><strong>Hết hạn:</strong> ${expiresAt}</li><li><strong>Phương thức:</strong> ${updatedPayment.payment_method}</li></ul><p><small>🎉 Cảm ơn bạn đã sử dụng dịch vụ!</small></p>`
          },
          redirect_type: 'subscription',
          data: {
            id: updatedPayment.id,
            type: 'payment'
          }
        }, true); // auto push = true
      } else if (status === 'failed') {
        // Lấy thông tin gói đăng ký
        const subscription = await subscriptionModel.findById(updatedPayment.subscription_id);
        
        // Gửi thông báo thanh toán bị từ chối
        const notificationService = require('./notificationService');
        await notificationService.createNotification({
          recipient_id: updatedPayment.user_id,
          audience: 'user',
          type: 'system',
          title: 'Thanh toán thất bại',
          content: {
            html: `<p>Thanh toán cho đơn hàng của bạn đã thất bại.</p><p><strong>Gói:</strong> ${subscription?.name || 'Premium'}</p><p><strong>Số tiền:</strong> ${updatedPayment.amount.toLocaleString('vi-VN')} VNĐ</p><p><strong>Lý do:</strong> Thanh toán bị từ chối</p><hr><p><small><strong>📌 Thông tin chi tiết:</strong></small></p><ul style="font-size: 0.9em;"><li><strong>Mã đơn:</strong> ${updatedPayment.id}</li><li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li><li><strong>Phương thức:</strong> ${updatedPayment.payment_method}</li></ul><p><small>💡 Vui lòng thử lại hoặc liên hệ hỗ trợ.</small></p>`
          },
          redirect_type: 'subscription',
          data: {
            id: updatedPayment.id,
            type: 'payment_failed'
          }
        }, true); // auto push = true
      }
      
      await client.query('COMMIT');
      return updatedPayment;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  bulkUpdateStatus: async (paymentIds, status, adminId) => {
    // Lưu ý: Logic này phức tạp hơn nếu cần kích hoạt gói cho từng người.
    // Để đơn giản, ta sẽ chỉ cập nhật status.
    // Nếu cần kích hoạt gói, nên lặp qua từng paymentId và gọi updateStatus.
    
    if (status !== 'manual_confirmed') {
        throw new Error("Bulk update is only allowed for 'manual_confirmed' status.");
    }

    // Logic nâng cao: Lặp và xử lý từng cái trong transaction
    let successCount = 0;
    for (const paymentId of paymentIds) {
        try {
            // Mỗi lần gọi updateStatus sẽ là một transaction riêng
            await paymentService.updateStatus(paymentId, status, adminId);
            successCount++;
        } catch (error) {
            console.error(`Failed to process payment ${paymentId} in bulk update:`, error.message);
            // Bỏ qua và tiếp tục với cái tiếp theo
        }
    }
    return { successCount };
  },

  search: async (query) => {
    if (!query || query.trim().length < 2) {
        return []; // Không tìm kiếm nếu query quá ngắn
    }
    return await paymentModel.search(query);
  },
  
  getHistoryForUser: async (userId) => {
    return await paymentModel.findByUserId(userId);
  },
};

module.exports = paymentService;

