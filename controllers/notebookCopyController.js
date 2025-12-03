const notebookCopyService = require("../services/notebookCopyService");

const notebookCopyController = {
  /**
   * User copy sổ tay hệ thống
   * POST /api/notebooks/:notebookId/copy
   */
  copySystemNotebook: async (req, res) => {
    try {
      const userId = req.user.id;
      const { notebookId } = req.params;

      const result = await notebookCopyService.copySystemNotebook(userId, notebookId);

      res.status(201).json({
        success: true,
        message: "Sao chép sổ tay thành công.",
        data: result
      });
    } catch (error) {
      // Xử lý các lỗi cụ thể
      if (error.message.includes("không tồn tại") || error.message.includes("chưa được xuất bản")) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes("đã sao chép")) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes("premium")) {
        return res.status(403).json({
          success: false,
          message: error.message,
          requiresPremium: true
        });
      }

      res.status(500).json({
        success: false,
        message: "Lỗi khi sao chép sổ tay",
        error: error.message
      });
    }
  },

  /**
   * Kiểm tra user có thể copy sổ tay không
   * GET /api/notebooks/:notebookId/can-copy
   */
  checkCanCopy: async (req, res) => {
    try {
      const userId = req.user.id;
      const { notebookId } = req.params;

      const result = await notebookCopyService.canCopyNotebook(userId, notebookId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi kiểm tra quyền sao chép",
        error: error.message
      });
    }
  },

  /**
   * Lấy hoặc tạo bản sao sổ tay từ template (Get or Create)
   * GET /api/notebooks/template/:templateId/copy
   * 
   * Nếu user đã có bản sao -> trả về bản sao đó
   * Nếu chưa có -> tạo mới và trả về
   */
  getOrCreateCopiedNotebook: async (req, res) => {
    try {
      const userId = req.user.id;
      const { templateId } = req.params;
      
      // Nếu không có limit -> lấy tất cả từ vựng
      // Nếu có limit -> phân trang
      const page = req.query.page ? parseInt(req.query.page) : null;
      const limit = req.query.limit ? parseInt(req.query.limit) : null;

      const result = await notebookCopyService.getOrCreateCopiedNotebook(
        userId, 
        templateId,
        page,
        limit
      );

      // Status code: 200 nếu đã có, 201 nếu tạo mới
      const statusCode = result.isNew ? 201 : 200;

      res.status(statusCode).json({
        success: true,
        message: result.message,
        data: {
          notebook: result.notebook,
          isNew: result.isNew,
          template: result.template || { id: templateId }
        }
      });
    } catch (error) {
      // Xử lý các lỗi cụ thể
      if (error.message.includes("không tồn tại") || error.message.includes("chưa được xuất bản")) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes("premium")) {
        return res.status(403).json({
          success: false,
          message: error.message,
          requiresPremium: true
        });
      }

      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy hoặc tạo bản sao sổ tay",
        error: error.message
      });
    }
  },

  /**
   * Admin xem thống kê về template
   * GET /api/admin/notebooks/template/:templateId/stats
   */
  getTemplateStats: async (req, res) => {
    try {
      const { templateId } = req.params;

      const stats = await notebookCopyService.getTemplateStats(templateId);

      res.status(200).json({
        success: true,
        message: "Lấy thống kê template thành công.",
        data: stats
      });
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy thống kê template",
        error: error.message
      });
    }
  },

  /**
   * Cập nhật trạng thái hàng loạt cho nhiều từ vựng
   * PUT /api/notebooks/:notebookId/vocabularies/bulk-status
   * 
   * Body: {
   *   updates: [
   *     { vocabId: "uuid-1", status: "đã thuộc" },
   *     { vocabId: "uuid-2", status: "yêu thích" }
   *   ]
   * }
   */
  bulkUpdateVocabStatus: async (req, res) => {
    try {
      const userId = req.user.id;
      const { notebookId } = req.params;
      const { updates } = req.body;

      // Validation
      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Trường 'updates' phải là một mảng và không được rỗng."
        });
      }

      const result = await notebookCopyService.bulkUpdateVocabStatus(
        userId,
        notebookId,
        updates
      );

      res.status(200).json({
        success: true,
        message: `Đã cập nhật thành công ${result.updatedCount}/${result.total} từ vựng.`,
        data: result
      });
    } catch (error) {
      // Xử lý các lỗi cụ thể
      if (error.message.includes("không tồn tại") || error.message.includes("không có quyền")) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes("không hợp lệ")) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: "Lỗi khi cập nhật trạng thái từ vựng",
        error: error.message
      });
    }
  },

  /**
   * Lấy tất cả từ vựng của user từ các sổ tay, nhóm theo từ và trạng thái
   * GET /api/user/vocabularies
   * 
   * Query params:
   * - status: lọc theo trạng thái (optional)
   */
  getAllUserVocabularies: async (req, res) => {
    try {
      const userId = req.user.id;
      const { status } = req.query;

      const vocabularies = await notebookCopyService.getAllUserVocabularies(
        userId,
        status || null
      );

      res.status(200).json({
        success: true,
        message: "Lấy danh sách từ vựng thành công.",
        data: {
          vocabularies,
          total: vocabularies.length
        }
      });
    } catch (error) {
      if (error.message.includes("không hợp lệ")) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy danh sách từ vựng",
        error: error.message
      });
    }
  },

  /**
   * Lấy random từ vựng chưa thuộc và không chắc để ôn tập
   * GET /api/user/vocabularies/review
   * 
   * Query params:
   * - limit: số lượng từ (optional, default: 50, max: 100)
   */
  getRandomVocabulariesForReview: async (req, res) => {
    try {
      const userId = req.user.id;
      let limit = parseInt(req.query.limit) || 50;
      
      // Giới hạn tối đa 100 từ
      if (limit > 100) limit = 100;
      if (limit < 1) limit = 1;

      const vocabularies = await notebookCopyService.getRandomVocabulariesForReview(userId, limit);

      res.status(200).json({
        success: true,
        message: `Lấy ${vocabularies.length} từ vựng để ôn tập thành công.`,
        data: {
          vocabularies,
          total: vocabularies.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy từ vựng ôn tập",
        error: error.message
      });
    }
  },

  /**
   * Lấy random từ vựng chưa thuộc hoặc không chắc trong sổ tay
   * GET /api/notebooks/:notebookId/vocabularies/random-unlearned
   * 
   * Query params:
   * - limit: số lượng từ cần lấy (default: 50, max: 100)
   * 
   * Response: {
   *   success: true,
   *   data: {
   *     vocabularies: [...],
   *     total: 150,      // Tổng số từ chưa thuộc/không chắc
   *     returned: 50     // Số từ trả về
   *   }
   * }
   */
  getRandomUnlearnedVocabs: async (req, res) => {
    try {
      const userId = req.user.id;
      const { notebookId } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      const result = await notebookCopyService.getRandomUnlearnedVocabs(
        userId,
        notebookId,
        limit
      );

      res.status(200).json({
        success: true,
        message: `Lấy ${result.returned} từ vựng ngẫu nhiên thành công.`,
        data: result
      });
    } catch (error) {
      if (error.message.includes("không tồn tại") || error.message.includes("không có quyền")) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes("Số lượng từ")) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy từ vựng ngẫu nhiên",
        error: error.message
      });
    }
  },

  /**
   * Cập nhật trạng thái của một từ vựng trên nhiều sổ tay
   * PUT /api/user/vocabularies/:vocabId/status
   * 
   * Body: {
   *   notebookIds: ["uuid-1", "uuid-2", "uuid-3"],
   *   status: "đã thuộc"
   * }
   */
  updateVocabAcrossNotebooks: async (req, res) => {
    try {
      const userId = req.user.id;
      const { vocabId } = req.params;
      const { notebookIds, status } = req.body;

      // Validation
      if (!notebookIds || !Array.isArray(notebookIds) || notebookIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Trường 'notebookIds' phải là một mảng và không được rỗng."
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Trường 'status' là bắt buộc."
        });
      }

      const result = await notebookCopyService.updateVocabAcrossNotebooks(
        userId,
        vocabId,
        notebookIds,
        status
      );

      res.status(200).json({
        success: true,
        message: `Đã cập nhật trạng thái trên ${result.updatedCount} sổ tay.`,
        data: result
      });
    } catch (error) {
      if (error.message.includes("không tồn tại") || error.message.includes("không có quyền")) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes("không hợp lệ")) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: "Lỗi khi cập nhật trạng thái từ vựng",
        error: error.message
      });
    }
  }
};

module.exports = notebookCopyController;
