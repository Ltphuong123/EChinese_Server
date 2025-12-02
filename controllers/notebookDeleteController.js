const notebookDeleteService = require("../services/notebookDeleteService");

const notebookDeleteController = {
  /**
   * Lấy thống kê trước khi xóa
   * GET /api/admin/notebooks/delete-stats
   */
  getDeleteStatistics: async (req, res) => {
    try {
      const stats = await notebookDeleteService.getDeleteStatistics();

      res.status(200).json({
        success: true,
        message: "Lấy thống kê thành công.",
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy thống kê",
        error: error.message
      });
    }
  },

  /**
   * Xóa toàn bộ dữ liệu notebook
   * DELETE /api/admin/notebooks/delete-all
   * 
   * CẢNH BÁO: API này sẽ xóa TẤT CẢ:
   * - Notebooks (system + user)
   * - NotebookVocabItems
   * - NotebookChangelog
   * - NotebookSyncStatus
   */
  deleteAllNotebookData: async (req, res) => {
    try {
      const { confirmPassword } = req.body;

      // Yêu cầu xác nhận bằng password hoặc confirmation string
      if (confirmPassword !== "DELETE_ALL_NOTEBOOKS") {
        return res.status(400).json({
          success: false,
          message: "Vui lòng xác nhận bằng cách gửi confirmPassword: 'DELETE_ALL_NOTEBOOKS'"
        });
      }

      const result = await notebookDeleteService.deleteAllNotebookData();

      res.status(200).json({
        success: true,
        message: "Đã xóa toàn bộ dữ liệu notebook.",
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi xóa dữ liệu",
        error: error.message
      });
    }
  }
};

module.exports = notebookDeleteController;
