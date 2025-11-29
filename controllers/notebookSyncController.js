const notebookSyncService = require("../services/notebookSyncService");

const notebookSyncController = {
  /**
   * Kiểm tra các thay đổi chưa đồng bộ
   * GET /api/notebooks/:notebookId/sync/check
   */
  checkPendingChanges: async (req, res) => {
    try {
      const userId = req.user.id;
      const { notebookId } = req.params;

      const result = await notebookSyncService.checkPendingChanges(userId, notebookId);

      res.status(200).json({
        success: true,
        message: result.hasPendingChanges 
          ? `Có ${result.counts.total} thay đổi chưa đồng bộ.`
          : "Sổ tay đã được đồng bộ.",
        data: result
      });
    } catch (error) {
      if (error.message.includes("không tồn tại") || error.message.includes("không phải bản sao")) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: "Lỗi khi kiểm tra thay đổi",
        error: error.message
      });
    }
  },

  /**
   * Đồng bộ notebook với template
   * POST /api/notebooks/:notebookId/sync
   */
  syncNotebook: async (req, res) => {
    try {
      const userId = req.user.id;
      const { notebookId } = req.params;

      const result = await notebookSyncService.syncNotebook(userId, notebookId);

      const statusCode = result.synced ? 200 : 200;

      res.status(statusCode).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      if (error.message.includes("không tồn tại") || error.message.includes("không phải bản sao")) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: "Lỗi khi đồng bộ sổ tay",
        error: error.message
      });
    }
  },

  /**
   * Đồng bộ tất cả notebooks từ template
   * POST /api/templates/:templateId/sync-all
   */
  syncAllNotebooks: async (req, res) => {
    try {
      const userId = req.user.id;
      const { templateId } = req.params;

      const result = await notebookSyncService.syncAllUserNotebooksFromTemplate(
        userId,
        templateId
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi đồng bộ tất cả sổ tay",
        error: error.message
      });
    }
  },

  /**
   * Lấy lịch sử thay đổi của template (Admin)
   * GET /api/admin/templates/:templateId/changelog
   */
  getTemplateChangelog: async (req, res) => {
    try {
      const { templateId } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      const changelog = await notebookSyncService.getTemplateChangelog(templateId, limit);

      res.status(200).json({
        success: true,
        message: "Lấy lịch sử thay đổi thành công.",
        data: {
          templateId,
          changelog,
          total: changelog.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy lịch sử thay đổi",
        error: error.message
      });
    }
  },

  /**
   * Lấy tất cả thay đổi chưa đồng bộ cho tất cả sổ tay của user
   * GET /api/notebooks/sync/all-changes
   */
  getAllUnsyncedChanges: async (req, res) => {
    try {
      const userId = req.user.id;

      const result = await notebookSyncService.getAllUnsyncedChanges(userId);

      res.status(200).json({
        success: true,
        message: result.notebooksWithChanges > 0
          ? `Có ${result.notebooksWithChanges} sổ tay cần đồng bộ.`
          : "Tất cả sổ tay đã được đồng bộ.",
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy danh sách thay đổi",
        error: error.message
      });
    }
  }
};

module.exports = notebookSyncController;
