const db = require("../config/db");

const notebookSyncModel = {
  /**
   * Lấy các thay đổi chưa được đồng bộ cho một notebook
   * @param {string} templateId - ID của template
   * @param {string} lastSyncedAt - Thời điểm đồng bộ cuối cùng (hoặc null nếu chưa sync bao giờ)
   */
  async getUnsyncedChanges(templateId, lastSyncedAt = null) {
    let query = `
      SELECT 
        nc.id,
        nc.template_id,
        nc.vocab_id,
        nc.action,
        nc.created_at,
        v.hanzi,
        v.pinyin,
        v.meaning,
        v.level
      FROM "NotebookChangelog" nc
      JOIN "Vocabulary" v ON nc.vocab_id = v.id
      WHERE nc.template_id = $1
    `;

    const params = [templateId];

    if (lastSyncedAt) {
      query += ` AND nc.created_at > $2`;
      params.push(lastSyncedAt);
    }

    query += ` ORDER BY nc.created_at ASC`;

    const result = await db.query(query, params);
    return result.rows;
  },

  /**
   * Lấy trạng thái đồng bộ của một notebook
   * @param {string} userId - ID của user
   * @param {string} notebookId - ID của notebook
   */
  async getSyncStatus(userId, notebookId) {
    const query = `
      SELECT 
        nss.id,
        nss.user_id,
        nss.template_id,
        nss.notebook_id,
        nss.last_synced_at,
        nss.last_changelog_id,
        nss.created_at,
        nss.updated_at
      FROM "NotebookSyncStatus" nss
      WHERE nss.user_id = $1 AND nss.notebook_id = $2
    `;

    const result = await db.query(query, [userId, notebookId]);
    return result.rows[0] || null;
  },

  /**
   * Tạo hoặc cập nhật trạng thái đồng bộ
   * @param {string} userId - ID của user
   * @param {string} templateId - ID của template
   * @param {string} notebookId - ID của notebook
   * @param {string} lastChangelogId - ID của changelog entry cuối cùng đã sync
   */
  async upsertSyncStatus(userId, templateId, notebookId, lastChangelogId) {
    const query = `
      INSERT INTO "NotebookSyncStatus" (user_id, template_id, notebook_id, last_synced_at, last_changelog_id)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
      ON CONFLICT (user_id, template_id, notebook_id)
      DO UPDATE SET
        last_synced_at = CURRENT_TIMESTAMP,
        last_changelog_id = $4
      RETURNING *
    `;

    const result = await db.query(query, [userId, templateId, notebookId, lastChangelogId]);
    return result.rows[0];
  },

  /**
   * Áp dụng các thay đổi vào notebook của user
   * @param {string} notebookId - ID của notebook
   * @param {Array} changes - Mảng các thay đổi cần áp dụng
   */
  async applyChangesToNotebook(notebookId, changes) {
    const client = await db.pool.connect();
    
    try {
      await client.query("BEGIN");

      let addedCount = 0;
      let removedCount = 0;
      let skippedCount = 0;

      for (const change of changes) {
        if (change.action === 'added') {
          // Thêm từ vựng (nếu chưa có)
          const insertQuery = `
            INSERT INTO "NotebookVocabItems" (notebook_id, vocab_id, status)
            VALUES ($1, $2, 'chưa thuộc')
            ON CONFLICT (notebook_id, vocab_id) DO NOTHING
            RETURNING vocab_id
          `;
          const insertResult = await client.query(insertQuery, [notebookId, change.vocab_id]);
          
          if (insertResult.rows.length > 0) {
            addedCount++;
          } else {
            skippedCount++;
          }
        } else if (change.action === 'removed') {
          // Xóa từ vựng
          const deleteQuery = `
            DELETE FROM "NotebookVocabItems"
            WHERE notebook_id = $1 AND vocab_id = $2
            RETURNING vocab_id
          `;
          const deleteResult = await client.query(deleteQuery, [notebookId, change.vocab_id]);
          
          if (deleteResult.rows.length > 0) {
            removedCount++;
          } else {
            skippedCount++;
          }
        }
      }

      // Cập nhật vocab_count
      const updateCountQuery = `
        UPDATE "Notebooks"
        SET vocab_count = (
          SELECT COUNT(*)
          FROM "NotebookVocabItems"
          WHERE notebook_id = $1
        )
        WHERE id = $1
        RETURNING vocab_count
      `;
      const countResult = await client.query(updateCountQuery, [notebookId]);

      await client.query("COMMIT");

      return {
        addedCount,
        removedCount,
        skippedCount,
        newVocabCount: countResult.rows[0].vocab_count
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Lấy danh sách tất cả notebooks của user đã copy từ template
   * @param {string} userId - ID của user
   * @param {string} templateId - ID của template
   */
  async getUserNotebooksFromTemplate(userId, templateId) {
    const query = `
      SELECT id, name, vocab_count, created_at
      FROM "Notebooks"
      WHERE user_id = $1 AND template_id = $2
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [userId, templateId]);
    return result.rows;
  },

  /**
   * Đếm số lượng thay đổi chưa đồng bộ
   * @param {string} templateId - ID của template
   * @param {string} lastSyncedAt - Thời điểm đồng bộ cuối cùng
   */
  async countUnsyncedChanges(templateId, lastSyncedAt = null) {
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE action = 'added') as added_count,
        COUNT(*) FILTER (WHERE action = 'removed') as removed_count
      FROM "NotebookChangelog"
      WHERE template_id = $1
    `;

    const params = [templateId];

    if (lastSyncedAt) {
      query += ` AND created_at > $2`;
      params.push(lastSyncedAt);
    }

    const result = await db.query(query, params);
    return result.rows[0];
  }
};

module.exports = notebookSyncModel;
