// file: services/subscriptionService.js

const subscriptionModel = require('../models/subscriptionModel');

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

  delete: async (id) => {
    const subscription = await subscriptionModel.findById(id);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    await subscriptionModel.delete(id);
  },
};

module.exports = subscriptionService;