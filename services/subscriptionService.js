// file: services/subscriptionService.js

const subscriptionModel = require('../models/subscriptionModel');
const db = require('../config/db');
const subscriptionService = {
  getAll: async (options) => {
    const { subscriptions, totalItems } = await subscriptionModel.findAllAndPaginate(options);
    const totalPages = Math.ceil(totalItems / options.limit);
    
    return {
      data: subscriptions,
      meta: {
        total: totalItems,
        page: options.page,
        limit: options.limit,
        totalPages,
      }
    };
  },

  getUsage: async (subscriptionId) => {
    const subscription = await subscriptionModel.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    const activeUsers = await subscriptionModel.countActiveUsers(subscriptionId);
    return { activeUsers };
  },

  create: async (payload) => {
    return await subscriptionModel.create(payload);
  },

  update: async (id, payload) => {
    const subscription = await subscriptionModel.findById(id);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    return await subscriptionModel.update(id, payload);
  },

deletePermanently: async (id) => {
        // ...
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Các bước xóa...
            // 1. Vô hiệu hóa UserSubscriptions
            await subscriptionModel.deleteRelatedUserSubscriptions(id, client);

            // 2. Hủy liên kết Payments
            await subscriptionModel.deleteRelatedPayments(id, client);

            // 3. Xóa Subscription
            await subscriptionModel.delete(id, client);

            await client.query('COMMIT');
        } catch (error) { // <--- THAY ĐỔI Ở ĐÂY
            await client.query('ROLLBACK');
            
            // In lỗi GỐC từ database ra console của server để debug
            console.error('TRANSACTION FAILED, ROLLING BACK. Original Error:', error); 
            
            // Ném ra một lỗi mới với thông điệp rõ ràng hơn
            throw new Error('Xóa gói đăng ký thất bại. Dữ liệu đã được khôi phục.');
        } finally {
            client.release();
        }
    },


};

module.exports = subscriptionService;