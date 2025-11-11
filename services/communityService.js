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

  createLog: async (logData) => {
    // Service có thể thêm các bước validation ở đây nếu cần.
    // Ví dụ: kiểm tra xem target_type có hợp lệ không.
    if (!['post', 'comment'].includes(logData.target_type)) {
      throw new Error(`Loại mục tiêu không hợp lệ: ${logData.target_type}`);
    }

    return await communityModel.createModerationLog(logData);
  },

};

module.exports = communityService;