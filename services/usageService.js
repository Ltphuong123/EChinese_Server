// services/usageService.js

const usageModel = require('../models/usageModel');
const userModel = require('../models/userModel'); // Import để kiểm tra user tồn tại

const usageService = {
  
  createUsage: async (usageData) => {
    const user = await userModel.findUserById(usageData.user_id);
    if (!user) {
      throw new Error(`Người dùng với ID ${usageData.user_id} không tồn tại.`);
    }
    return await usageModel.create(usageData);
  },
  getAllUsageRecords: async ({ page, limit, search }) => {
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;

    return await usageModel.findAll({ limit: limitInt, offset, search });
  }
};

module.exports = usageService;