// file: services/paymentService.js

const paymentModel = require('../models/paymentModel');
const userSubscriptionService = require('./userSubscriptionService'); // Sử dụng lại service đã có
const subscriptionModel = require('../models/subscriptionModel'); 
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid'); 
const { application } = require('express');

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
        title: '💳 Hướng dẫn thanh toán',
        content: {
          message: `Vui lòng chuyển khoản ${subscription.price}đ để kích hoạt gói "${subscription.name}". Sau khi chuyển khoản, vui lòng chờ xác nhận từ hệ thống.`,
          action: 'payment_instruction',
          subscription_name: subscription.name,
          amount: subscription.price
        },
        redirect_type: 'subscription',
        data: {
          subscription_id: subscriptionId,
          subscription_name: subscription.name,
          amount: subscription.price,
          payment_method: paymentMethod,
          bank_info: bankInfo,
          created_at: new Date().toISOString()
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
        await notificationService.createNotification({
          recipient_id: updatedPayment.user_id,
          audience: 'user',
          type: 'system',
          title: '✅ Thanh toán đã được xác nhận',
          content: {
            message: `Thanh toán của bạn đã được xác nhận thành công. Gói "${subscription?.name || 'Premium'}" đã được kích hoạt.`,
            action: 'payment_confirmed',
            payment_amount: updatedPayment.amount,
            subscription_name: subscription?.name || 'Premium'
          },
          redirect_type: 'subscription',
          data: {
            payment_id: updatedPayment.id,
            subscription_id: updatedPayment.subscription_id,
            subscription_name: subscription?.name || 'Premium',
            amount: updatedPayment.amount,
            payment_method: updatedPayment.payment_method,
            confirmed_at: new Date().toISOString(),
            confirmed_by: adminId
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
          title: '❌ Thanh toán bị từ chối',
          content: {
            message: `Thanh toán của bạn cho gói "${subscription?.name || 'Premium'}" đã bị từ chối. Vui lòng kiểm tra lại thông tin thanh toán hoặc liên hệ hỗ trợ.`,
            action: 'payment_failed',
            payment_amount: updatedPayment.amount,
            subscription_name: subscription?.name || 'Premium'
          },
          redirect_type: 'subscription',
          data: {
            payment_id: updatedPayment.id,
            subscription_id: updatedPayment.subscription_id,
            subscription_name: subscription?.name || 'Premium',
            amount: updatedPayment.amount,
            payment_method: updatedPayment.payment_method,
            failed_at: new Date().toISOString(),
            rejected_by: adminId
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

