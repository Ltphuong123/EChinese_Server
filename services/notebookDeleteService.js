const notebookDeleteModel = require("../models/notebookDeleteModel");

const notebookDeleteService = {
  /**
   * Lấy thống kê trước khi xóa
   */
  async getDeleteStatistics() {
    return await notebookDeleteModel.getDeleteStatistics();
  },

  /**
   * Xóa toàn bộ dữ liệu notebook
   * CẢNH BÁO: Hành động này không thể hoàn tác
   */
  async deleteAllNotebookData() {
    // Lấy thống kê trước khi xóa
    const statsBefore = await notebookDeleteModel.getDeleteStatistics();

    // Thực hiện xóa
    const result = await notebookDeleteModel.deleteAllNotebookData();

    return {
      ...result,
      statsBefore
    };
  }
};

module.exports = notebookDeleteService;
