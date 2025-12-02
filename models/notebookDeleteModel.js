const db = require("../config/db");

const notebookDeleteModel = {
  /**
   * Xóa tất cả dữ liệu liên quan đến notebook system
   * CẢNH BÁO: API này sẽ xóa TẤT CẢ dữ liệu notebook
   */
  async deleteAllNotebookData() {
    const client = await db.pool.connect();
    
    try {
      await client.query("BEGIN");

      const results = {};

      // 1. Xóa NotebookSyncStatus
      const deleteSyncStatus = await client.query(`
        DELETE FROM "NotebookSyncStatus"
        RETURNING id
      `);
      results.syncStatusDeleted = deleteSyncStatus.rowCount;

      // 2. Xóa NotebookChangelog
      const deleteChangelog = await client.query(`
        DELETE FROM "NotebookChangelog"
        RETURNING id
      `);
      results.changelogDeleted = deleteChangelog.rowCount;

      // 3. Xóa NotebookVocabItems
      const deleteVocabItems = await client.query(`
        DELETE FROM "NotebookVocabItems"
        RETURNING notebook_id
      `);
      results.vocabItemsDeleted = deleteVocabItems.rowCount;

      // 4. Xóa Notebooks (cả system và user notebooks)
      const deleteNotebooks = await client.query(`
        DELETE FROM "Notebooks"
        RETURNING id, user_id, name
      `);
      results.notebooksDeleted = deleteNotebooks.rowCount;
      
      // Phân loại notebooks đã xóa
      const deletedNotebooks = deleteNotebooks.rows;
      results.systemNotebooksDeleted = deletedNotebooks.filter(n => n.user_id === null).length;
      results.userNotebooksDeleted = deletedNotebooks.filter(n => n.user_id !== null).length;

      await client.query("COMMIT");

      return {
        success: true,
        message: "Đã xóa toàn bộ dữ liệu notebook.",
        details: results
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Lấy thống kê trước khi xóa
   */
  async getDeleteStatistics() {
    const queries = [
      { name: 'notebooks', query: 'SELECT COUNT(*) as count FROM "Notebooks"' },
      { name: 'systemNotebooks', query: 'SELECT COUNT(*) as count FROM "Notebooks" WHERE user_id IS NULL' },
      { name: 'userNotebooks', query: 'SELECT COUNT(*) as count FROM "Notebooks" WHERE user_id IS NOT NULL' },
      { name: 'vocabItems', query: 'SELECT COUNT(*) as count FROM "NotebookVocabItems"' },
      { name: 'changelog', query: 'SELECT COUNT(*) as count FROM "NotebookChangelog"' },
      { name: 'syncStatus', query: 'SELECT COUNT(*) as count FROM "NotebookSyncStatus"' }
    ];

    const stats = {};

    for (const q of queries) {
      const result = await db.query(q.query);
      stats[q.name] = parseInt(result.rows[0].count);
    }

    return stats;
  }
};

module.exports = notebookDeleteModel;
