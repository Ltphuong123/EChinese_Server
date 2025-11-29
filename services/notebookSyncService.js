const notebookSyncModel = require("../models/notebookSyncModel");
const notebookCopyModel = require("../models/notebookCopyModel");

const notebookSyncService = {
  /**
   * Kiểm tra các thay đổi chưa đồng bộ cho một notebook
   * @param {string} userId - ID của user
   * @param {string} notebookId - ID của notebook
   */
  async checkPendingChanges(userId, notebookId) {
    // 1. Lấy thông tin notebook trực tiếp từ database
    const db = require("../config/db");
    const notebookQuery = await db.query(
      `SELECT id, user_id, template_id, name FROM "Notebooks" WHERE id = $1`,
      [notebookId]
    );

    if (notebookQuery.rows.length === 0) {
      throw new Error("Notebook không tồn tại.");
    }

    const notebook = notebookQuery.rows[0];

    // Kiểm tra notebook thuộc về user
    if (notebook.user_id !== userId) {
      throw new Error("Bạn không có quyền truy cập notebook này.");
    }

    // Kiểm tra notebook có phải là bản sao từ template không
    if (!notebook.template_id) {
      throw new Error("Notebook này không phải bản sao từ template.");
    }

    // 2. Lấy trạng thái đồng bộ
    const syncStatus = await notebookSyncModel.getSyncStatus(userId, notebookId);
    const lastSyncedAt = syncStatus ? syncStatus.last_synced_at : null;

    // 3. Lấy các thay đổi chưa đồng bộ
    const changes = await notebookSyncModel.getUnsyncedChanges(
      notebook.template_id,
      lastSyncedAt
    );

    // 4. Đếm số lượng thay đổi
    const counts = await notebookSyncModel.countUnsyncedChanges(
      notebook.template_id,
      lastSyncedAt
    );

    return {
      notebookId,
      templateId: notebook.template_id,
      lastSyncedAt,
      hasPendingChanges: changes.length > 0,
      pendingChanges: changes,
      counts: {
        total: parseInt(counts.total),
        added: parseInt(counts.added_count),
        removed: parseInt(counts.removed_count)
      }
    };
  },

  /**
   * Đồng bộ các thay đổi từ template vào notebook của user
   * @param {string} userId - ID của user
   * @param {string} notebookId - ID của notebook
   */
  async syncNotebook(userId, notebookId) {
    // 1. Kiểm tra pending changes
    const pendingInfo = await this.checkPendingChanges(userId, notebookId);

    if (!pendingInfo.hasPendingChanges) {
      return {
        synced: false,
        message: "Không có thay đổi mới để đồng bộ.",
        changes: []
      };
    }

    // 2. Áp dụng các thay đổi
    const result = await notebookSyncModel.applyChangesToNotebook(
      notebookId,
      pendingInfo.pendingChanges
    );

    // 3. Cập nhật trạng thái đồng bộ
    const lastChange = pendingInfo.pendingChanges[pendingInfo.pendingChanges.length - 1];
    await notebookSyncModel.upsertSyncStatus(
      userId,
      pendingInfo.templateId,
      notebookId,
      lastChange.id
    );

    return {
      synced: true,
      message: `Đã đồng bộ ${result.addedCount + result.removedCount} thay đổi.`,
      changes: pendingInfo.pendingChanges,
      result: {
        added: result.addedCount,
        removed: result.removedCount,
        skipped: result.skippedCount,
        newVocabCount: result.newVocabCount
      }
    };
  },

  /**
   * Đồng bộ tất cả notebooks của user từ một template
   * @param {string} userId - ID của user
   * @param {string} templateId - ID của template
   */
  async syncAllUserNotebooksFromTemplate(userId, templateId) {
    // 1. Lấy tất cả notebooks của user từ template này
    const notebooks = await notebookSyncModel.getUserNotebooksFromTemplate(userId, templateId);

    if (notebooks.length === 0) {
      return {
        synced: false,
        message: "Không có sổ tay nào được tạo từ template này.",
        results: []
      };
    }

    // 2. Đồng bộ từng notebook
    const results = [];
    let totalSynced = 0;

    for (const notebook of notebooks) {
      try {
        const syncResult = await this.syncNotebook(userId, notebook.id);
        results.push({
          notebookId: notebook.id,
          notebookName: notebook.name,
          success: true,
          ...syncResult
        });

        if (syncResult.synced) {
          totalSynced++;
        }
      } catch (error) {
        results.push({
          notebookId: notebook.id,
          notebookName: notebook.name,
          success: false,
          error: error.message
        });
      }
    }

    return {
      synced: totalSynced > 0,
      message: `Đã đồng bộ ${totalSynced}/${notebooks.length} sổ tay.`,
      totalNotebooks: notebooks.length,
      syncedCount: totalSynced,
      results
    };
  },

  /**
   * Lấy lịch sử thay đổi của template
   * @param {string} templateId - ID của template
   * @param {number} limit - Số lượng thay đổi tối đa
   */
  async getTemplateChangelog(templateId, limit = 50) {
    const changes = await notebookSyncModel.getUnsyncedChanges(templateId, null);
    return changes.slice(0, limit);
  },

  /**
   * Lấy tất cả thay đổi chưa đồng bộ cho tất cả sổ tay của user
   * @param {string} userId - ID của user
   */
  async getAllUnsyncedChanges(userId) {
    // 1. Lấy tất cả notebooks của user có template_id (là bản sao)
    const notebooksQuery = await notebookCopyModel.getUserCopiedNotebooks(userId, null);
    
    // Lọc ra các notebook có template_id
    const copiedNotebooks = [];
    for (const nb of notebooksQuery) {
      if (nb.template_id) {
        copiedNotebooks.push(nb);
      }
    }

    if (copiedNotebooks.length === 0) {
      return {
        totalNotebooks: 0,
        notebooksWithChanges: 0,
        notebooks: []
      };
    }

    // 2. Kiểm tra pending changes cho từng notebook
    const results = [];
    let notebooksWithChanges = 0;

    for (const notebook of copiedNotebooks) {
      try {
        // Lấy sync status
        const syncStatus = await notebookSyncModel.getSyncStatus(userId, notebook.id);
        const lastSyncedAt = syncStatus ? syncStatus.last_synced_at : null;

        // Lấy unsynced changes
        const changes = await notebookSyncModel.getUnsyncedChanges(
          notebook.template_id,
          lastSyncedAt
        );

        // Đếm số lượng thay đổi
        const counts = await notebookSyncModel.countUnsyncedChanges(
          notebook.template_id,
          lastSyncedAt
        );

        const hasPendingChanges = changes.length > 0;
        if (hasPendingChanges) {
          notebooksWithChanges++;
        }

        results.push({
          notebookId: notebook.id,
          notebookName: notebook.name,
          templateId: notebook.template_id,
          lastSyncedAt,
          hasPendingChanges,
          counts: {
            total: parseInt(counts.total),
            added: parseInt(counts.added_count),
            removed: parseInt(counts.removed_count)
          },
          changes: changes // Danh sách chi tiết các thay đổi
        });
      } catch (error) {
        results.push({
          notebookId: notebook.id,
          notebookName: notebook.name,
          error: error.message
        });
      }
    }

    return {
      totalNotebooks: copiedNotebooks.length,
      notebooksWithChanges,
      notebooks: results
    };
  }
};

module.exports = notebookSyncService;
