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
   * Lấy danh sách log có phân trang.
   * @param {object} filters - Các tùy chọn lọc.
   * @returns {Promise<object>} Dữ liệu đã được định dạng cho response.
   */
  getAllLogs: async () => {
    // Gọi thẳng đến model mới và trả về dữ liệu
    const logs = await adminLogModel.findAll();
    return logs;
  }

};

module.exports = adminLogService;