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
  },

  /**
   * Xóa tất cả admin logs (chỉ super admin)
   * @param {string} adminId - ID của super admin thực hiện
   * @param {string} confirmationCode - Mã xác nhận
   * @returns {Promise<object>}
   */
  deleteAllLogs: async (adminId, confirmationCode) => {
    // Mã xác nhận để tránh xóa nhầm
    const REQUIRED_CODE = process.env.DELETE_ALL_LOGS_CODE || 'DELETE_ALL_ADMIN_LOGS';
    
    if (confirmationCode !== REQUIRED_CODE) {
      throw new Error('Mã xác nhận không đúng. Vui lòng kiểm tra lại.');
    }

    const deletedCount = await adminLogModel.deleteAll();
    
    return { deletedCount };
  }

};

module.exports = adminLogService;