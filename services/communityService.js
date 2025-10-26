// file: services/communityService.js

const communityModel = require('../models/communityModel');

const communityService = {
  getStats: async () => {
    return await communityModel.getDashboardStats();
  },
  getModerationLogs: async (options) => {
      const { page, limit } = options;
      const offset = (page - 1) * limit;

      const { logs, totalItems } = await communityModel.findModerationLogs({ limit, offset });
      
      const totalPages = Math.ceil(totalItems / limit);

      return {
          data: logs,
          meta: { page, limit, total: totalItems, totalPages }
      };
  },
};

module.exports = communityService;