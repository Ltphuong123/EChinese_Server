// file: services/adminLogService.js

const adminLogModel = require('../models/adminLogModel');

const adminLogService = {
  /**
   * Tạo một bản ghi log.
   * @param {object} logData - Dữ liệu log thô.
   * @param {string} adminId - ID của admin thực hiện hành động (từ token).
   * @returns {Promise<object>}
   */
  createLog: async (logData, adminId) => {
    const dataToSave = {
      ...logData,
      user_id: adminId, // Ghi đè user_id bằng ID từ token đã xác thực
    };
    return await adminLogModel.create(dataToSave);
  },

  /**
   * Lấy danh sách log có phân trang và filter.
   * @param {object} filters - Các tùy chọn lọc và phân trang.
   * @returns {Promise<object>} Dữ liệu đã được định dạng cho response.
   */
  getAllLogs: async (filters) => {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const { logs, totalItems } = await adminLogModel.findAll({
      ...filters,
      offset,
      limit
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: logs,
      meta: {
        total: totalItems,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    };
  }

};

module.exports = adminLogService;