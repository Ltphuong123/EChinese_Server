const notebookCopyModel = require("../models/notebookCopyModel");

const notebookCopyService = {
  /**
   * Copy sổ tay hệ thống cho user
   */
  async copySystemNotebook(userId, notebookId) {
    // 1. Kiểm tra sổ tay hệ thống có tồn tại không
    const systemNotebook = await notebookCopyModel.findSystemNotebookById(notebookId);
    
    if (!systemNotebook) {
      throw new Error("Sổ tay hệ thống không tồn tại hoặc chưa được xuất bản.");
    }

    // 2. Kiểm tra quyền truy cập nếu là premium
    if (systemNotebook.is_premium) {
      const hasAccess = await notebookCopyModel.canUserAccessPremiumNotebook(userId);
      if (!hasAccess) {
        throw new Error("Bạn cần có gói premium để sao chép sổ tay này.");
      }
    }

    // 3. Kiểm tra user đã copy sổ tay này chưa
    const alreadyCopied = await notebookCopyModel.hasUserCopiedNotebook(userId, notebookId);
    
    if (alreadyCopied) {
      throw new Error("Bạn đã sao chép sổ tay này rồi.");
    }

    // 4. Thực hiện copy
    const copiedNotebook = await notebookCopyModel.copyNotebookForUser(userId, systemNotebook);

    return {
      notebook: copiedNotebook,
      template: {
        id: systemNotebook.id,
        name: systemNotebook.name
      }
    };
  },

  /**
   * Lấy hoặc tạo bản sao sổ tay từ template (Get or Create)
   * Nếu user đã có bản sao -> trả về bản sao đó kèm từ vựng
   * Nếu chưa có -> tạo mới và trả về kèm từ vựng
   * 
   * @param {string} userId - ID của user
   * @param {string} templateId - ID của template
   * @param {number|null} page - Số trang (null = lấy tất cả)
   * @param {number|null} limit - Số từ mỗi trang (null = lấy tất cả)
   */
  async getOrCreateCopiedNotebook(userId, templateId, page = null, limit = null) {
    // 1. Kiểm tra user đã có bản sao chưa
    const existingCopies = await notebookCopyModel.getUserCopiedNotebooks(userId, templateId);
    
    if (existingCopies.length > 0) {
      // Đã có bản sao -> lấy chi tiết kèm từ vựng
      const notebookWithVocabs = await notebookCopyModel.getNotebookWithVocabularies(
        existingCopies[0].id,
        page,
        limit
      );

      return {
        notebook: notebookWithVocabs,
        isNew: false,
        message: "Bạn đã có bản sao của sổ tay này."
      };
    }

    // 2. Chưa có bản sao -> tạo mới
    // Kiểm tra template tồn tại
    const systemNotebook = await notebookCopyModel.findSystemNotebookById(templateId);
    
    if (!systemNotebook) {
      throw new Error("Sổ tay hệ thống không tồn tại hoặc chưa được xuất bản.");
    }

    // Kiểm tra quyền premium
    if (systemNotebook.is_premium) {
      const hasAccess = await notebookCopyModel.canUserAccessPremiumNotebook(userId);
      if (!hasAccess) {
        throw new Error("Bạn cần có gói premium để sao chép sổ tay này.");
      }
    }

    // Tạo bản sao mới
    const copiedNotebook = await notebookCopyModel.copyNotebookForUser(userId, systemNotebook);

    // Lấy chi tiết kèm từ vựng
    const notebookWithVocabs = await notebookCopyModel.getNotebookWithVocabularies(
      copiedNotebook.id,
      page,
      limit
    );

    return {
      notebook: notebookWithVocabs,
      isNew: true,
      message: "Đã tạo bản sao mới của sổ tay.",
      template: {
        id: systemNotebook.id,
        name: systemNotebook.name
      }
    };
  },

  /**
   * Kiểm tra user có thể copy sổ tay không
   */
  async canCopyNotebook(userId, notebookId) {
    // 1. Kiểm tra sổ tay tồn tại
    const systemNotebook = await notebookCopyModel.findSystemNotebookById(notebookId);
    
    if (!systemNotebook) {
      return {
        canCopy: false,
        reason: "Sổ tay không tồn tại hoặc chưa được xuất bản"
      };
    }

    // 2. Kiểm tra đã copy chưa
    const alreadyCopied = await notebookCopyModel.hasUserCopiedNotebook(userId, notebookId);
    
    if (alreadyCopied) {
      return {
        canCopy: false,
        reason: "Bạn đã sao chép sổ tay này rồi"
      };
    }

    // 3. Kiểm tra quyền premium
    if (systemNotebook.is_premium) {
      const hasAccess = await notebookCopyModel.canUserAccessPremiumNotebook(userId);
      if (!hasAccess) {
        return {
          canCopy: false,
          reason: "Cần gói premium để sao chép sổ tay này",
          requiresPremium: true
        };
      }
    }

    return {
      canCopy: true,
      notebook: systemNotebook
    };
  },

  /**
   * Lấy thống kê về template (dành cho admin)
   */
  async getTemplateStats(templateId) {
    const stats = await notebookCopyModel.getTemplateCopyStats(templateId);
    const systemNotebook = await notebookCopyModel.findSystemNotebookById(templateId);

    if (!systemNotebook) {
      throw new Error("Template không tồn tại.");
    }

    return {
      template: systemNotebook,
      stats: {
        totalUsersCopied: parseInt(stats.total_users_copied),
        totalCopies: parseInt(stats.total_copies)
      }
    };
  },

  /**
   * Cập nhật trạng thái hàng loạt cho nhiều từ vựng
   * @param {string} userId - ID của user
   * @param {string} notebookId - ID của notebook
   * @param {Array} updates - Mảng các object {vocabId, status}
   */
  async bulkUpdateVocabStatus(userId, notebookId, updates) {
    // Validation
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error("Danh sách cập nhật không hợp lệ.");
    }

    // Kiểm tra tất cả status hợp lệ
    const validStatuses = ['đã thuộc', 'chưa thuộc', 'yêu thích', 'không chắc'];
    for (const update of updates) {
      if (!update.vocabId || !update.status) {
        throw new Error("Mỗi item phải có vocabId và status.");
      }
      if (!validStatuses.includes(update.status)) {
        throw new Error(`Status không hợp lệ: ${update.status}`);
      }
    }

    // Gọi model để cập nhật
    return await notebookCopyModel.bulkUpdateVocabStatus(notebookId, userId, updates);
  },

  /**
   * Lấy tất cả từ vựng của user, nhóm theo từ và trạng thái
   * @param {string} userId - ID của user
   * @param {string|null} status - Lọc theo trạng thái
   */
  async getAllUserVocabularies(userId, status = null) {
    // Validation status nếu có
    if (status) {
      const validStatuses = ['đã thuộc', 'chưa thuộc', 'yêu thích', 'không chắc'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Status không hợp lệ: ${status}`);
      }
    }

    return await notebookCopyModel.getAllUserVocabulariesGrouped(userId, status);
  },

  /**
   * Lấy random từ vựng chưa thuộc và không chắc để ôn tập
   * @param {string} userId - ID của user
   * @param {number} limit - Số lượng từ (mặc định 50)
   */
  async getRandomVocabulariesForReview(userId, limit = 50) {
    return await notebookCopyModel.getRandomVocabulariesForReview(userId, limit);
  },

  /**
   * Lấy random từ vựng chưa thuộc hoặc không chắc trong sổ tay
   * @param {string} userId - ID của user
   * @param {string} notebookId - ID của notebook
   * @param {number} limit - Số lượng từ cần lấy (mặc định 50)
   */
  async getRandomUnlearnedVocabs(userId, notebookId, limit = 50) {
    // Validation
    if (limit < 1 || limit > 100) {
      throw new Error("Số lượng từ phải từ 1 đến 100.");
    }

    return await notebookCopyModel.getRandomUnlearnedVocabs(notebookId, userId, limit);
  },

  /**
   * Cập nhật trạng thái của một từ vựng trên nhiều sổ tay
   * @param {string} userId - ID của user
   * @param {string} vocabId - ID của từ vựng
   * @param {Array} notebookIds - Danh sách notebook IDs
   * @param {string} newStatus - Trạng thái mới
   */
  async updateVocabAcrossNotebooks(userId, vocabId, notebookIds, newStatus) {
    // Validation
    if (!Array.isArray(notebookIds) || notebookIds.length === 0) {
      throw new Error("Danh sách notebook không hợp lệ.");
    }

    const validStatuses = ['đã thuộc', 'chưa thuộc', 'yêu thích', 'không chắc'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Status không hợp lệ: ${newStatus}`);
    }

    return await notebookCopyModel.updateVocabStatusAcrossNotebooks(
      userId,
      vocabId,
      notebookIds,
      newStatus
    );
  }
};

module.exports = notebookCopyService;
