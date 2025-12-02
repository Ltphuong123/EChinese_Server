const db = require("../config/db");

const notebookCopyModel = {
  /**
   * Kiểm tra sổ tay hệ thống có tồn tại và published không
   */
  async findSystemNotebookById(notebookId) {
    const query = `
      SELECT id, name, options, is_premium, status, vocab_count
      FROM "Notebooks"
      WHERE id = $1 AND user_id IS NULL AND status = 'published'
    `;
    const result = await db.query(query, [notebookId]);
    return result.rows[0] || null;
  },

  /**
   * Kiểm tra user đã copy sổ tay này chưa
   */
  async hasUserCopiedNotebook(userId, templateId) {
    const query = `
      SELECT id
      FROM "Notebooks"
      WHERE user_id = $1 AND template_id = $2
      LIMIT 1
    `;
    const result = await db.query(query, [userId, templateId]);
    return result.rows.length > 0;
  },

  /**
   * Tạo bản sao sổ tay cho user
   */
  async copyNotebookForUser(userId, templateNotebook) {
    const client = await db.pool.connect();
    
    try {
      await client.query("BEGIN");

      // 1. Tạo notebook mới cho user
      const insertNotebookQuery = `
        INSERT INTO "Notebooks" (user_id, name, options, is_premium, status, template_id, vocab_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, user_id, name, options, is_premium, status, template_id, vocab_count, created_at
      `;
      const notebookResult = await client.query(insertNotebookQuery, [
        userId,
        templateNotebook.name,
        templateNotebook.options,
        templateNotebook.is_premium,
        'published', // Sổ tay copy luôn published
        templateNotebook.id, // template_id
        0 // vocab_count ban đầu = 0
      ]);

      const newNotebook = notebookResult.rows[0];

      // 2. Copy tất cả từ vựng từ template sang notebook mới
      const copyVocabQuery = `
        INSERT INTO "NotebookVocabItems" (notebook_id, vocab_id, status)
        SELECT $1, vocab_id, 'chưa thuộc'
        FROM "NotebookVocabItems"
        WHERE notebook_id = $2
      `;
      await client.query(copyVocabQuery, [newNotebook.id, templateNotebook.id]);

      // 3. Cập nhật vocab_count cho notebook mới
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
      const countResult = await client.query(updateCountQuery, [newNotebook.id]);
      newNotebook.vocab_count = countResult.rows[0].vocab_count;

      await client.query("COMMIT");
      return newNotebook;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Lấy danh sách sổ tay user đã copy từ template
   */
  async getUserCopiedNotebooks(userId, templateId) {
    const query = `
      SELECT id, name, vocab_count, created_at, template_id
      FROM "Notebooks"
      WHERE user_id = $1 AND template_id = $2
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [userId, templateId]);
    return result.rows;
  },

  /**
   * Ghi log thay đổi vào NotebookChangelog
   * @param {string} templateId - ID của template (sổ tay hệ thống)
   * @param {Array} vocabIds - Danh sách vocab IDs
   * @param {string} action - 'added' hoặc 'removed'
   * @param {string} performedBy - ID của admin thực hiện
   */
  async logNotebookChanges(templateId, vocabIds, action, performedBy) {
    if (!vocabIds || vocabIds.length === 0) return;

    const values = vocabIds.map((vocabId, index) => {
      const offset = index * 4;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
    }).join(', ');

    const params = vocabIds.flatMap(vocabId => [
      templateId,
      vocabId,
      action,
      performedBy
    ]);

    const query = `
      INSERT INTO "NotebookChangelog" (template_id, vocab_id, action, performed_by)
      VALUES ${values}
    `;

    await db.query(query, params);
  },

  /**
   * Lấy thống kê số lượng user đã copy một template
   */
  async getTemplateCopyStats(templateId) {
    const query = `
      SELECT 
        COUNT(DISTINCT user_id) as total_users_copied,
        COUNT(*) as total_copies
      FROM "Notebooks"
      WHERE template_id = $1
    `;
    const result = await db.query(query, [templateId]);
    return result.rows[0];
  },

  /**
   * Kiểm tra user có quyền truy cập sổ tay premium không
   * User phải có gói đăng ký KHÁC gói miễn phí (FREE_PLAN_ID)
   */
  async canUserAccessPremiumNotebook(userId) {
    const FREE_PLAN_ID = process.env.FREE_PLAN_ID || 'cc8ee1e7-3ce7-4b60-9ea3-d8e840823514';
    
    // Kiểm tra user có subscription active VÀ không phải gói miễn phí
    const query = `
      SELECT us.id
      FROM "UserSubscriptions" us
      WHERE us.user_id = $1 
        AND us.is_active = true
        AND (us.expiry_date IS NULL OR us.expiry_date > NOW())
        AND us.subscription_id != $2
      LIMIT 1
    `;
    const result = await db.query(query, [userId, FREE_PLAN_ID]);
    return result.rows.length > 0;
  },

  /**
   * Lấy tất cả từ vựng từ các sổ tay của user, nhóm theo từ và trạng thái
   * @param {string} userId - ID của user
   * @param {string|null} status - Lọc theo trạng thái (null = tất cả)
   */
  async getAllUserVocabulariesGrouped(userId, status = null) {
    let query = `
      SELECT 
        v.id as vocab_id,
        v.hanzi,
        v.pinyin,
        v.meaning,
        v.notes,
        v.level,
        v.image_url,
        nvi.status,
        COALESCE(
          json_agg(
            DISTINCT vwt.word_type
          ) FILTER (WHERE vwt.word_type IS NOT NULL),
          '[]'
        ) as word_types,
        array_agg(DISTINCT n.id) as notebook_ids,
        COUNT(DISTINCT n.id) as notebook_count
      FROM "Notebooks" n
      JOIN "NotebookVocabItems" nvi ON n.id = nvi.notebook_id
      JOIN "Vocabulary" v ON nvi.vocab_id = v.id
      LEFT JOIN "VocabularyWordType" vwt ON v.id = vwt.vocab_id
      WHERE n.user_id = $1
    `;

    const params = [userId];

    // Nếu có filter theo status
    if (status) {
      query += ` AND nvi.status = $2`;
      params.push(status);
    }

    query += `
      GROUP BY v.id, v.hanzi, v.pinyin, v.meaning, v.notes, v.level, v.image_url, nvi.status
      ORDER BY v.hanzi ASC
    `;

    const result = await db.query(query, params);
    return result.rows;
  },

  /**
   * Cập nhật trạng thái của một từ vựng trên nhiều sổ tay cùng lúc
   * @param {string} userId - ID của user
   * @param {string} vocabId - ID của từ vựng
   * @param {Array} notebookIds - Danh sách notebook IDs
   * @param {string} newStatus - Trạng thái mới
   */
  async updateVocabStatusAcrossNotebooks(userId, vocabId, notebookIds, newStatus) {
    const client = await db.pool.connect();
    
    try {
      await client.query("BEGIN");

      // Kiểm tra tất cả notebooks thuộc về user
      const checkQuery = `
        SELECT id FROM "Notebooks"
        WHERE id = ANY($1) AND user_id = $2
      `;
      const checkResult = await client.query(checkQuery, [notebookIds, userId]);
      
      if (checkResult.rows.length !== notebookIds.length) {
        throw new Error("Một số notebook không tồn tại hoặc bạn không có quyền truy cập.");
      }

      // Cập nhật trạng thái trên tất cả notebooks
      const updateQuery = `
        UPDATE "NotebookVocabItems"
        SET status = $1
        WHERE vocab_id = $2 AND notebook_id = ANY($3)
        RETURNING notebook_id
      `;
      const updateResult = await client.query(updateQuery, [newStatus, vocabId, notebookIds]);

      await client.query("COMMIT");
      
      return {
        updatedCount: updateResult.rows.length,
        notebookIds: updateResult.rows.map(r => r.notebook_id)
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Cập nhật trạng thái hàng loạt cho nhiều từ vựng trong sổ tay
   * @param {string} notebookId - ID của notebook
   * @param {string} userId - ID của user (để kiểm tra quyền)
   * @param {Array} updates - Mảng các object {vocabId, status}
   */
  async bulkUpdateVocabStatus(notebookId, userId, updates) {
    const client = await db.pool.connect();
    
    try {
      await client.query("BEGIN");

      // 1. Kiểm tra notebook thuộc về user
      const checkQuery = `
        SELECT id FROM "Notebooks"
        WHERE id = $1 AND user_id = $2
      `;
      const checkResult = await client.query(checkQuery, [notebookId, userId]);
      
      if (checkResult.rows.length === 0) {
        throw new Error("Notebook không tồn tại hoặc bạn không có quyền truy cập.");
      }

      // 2. Cập nhật từng từ vựng
      const updatePromises = updates.map(({ vocabId, status }) => {
        const updateQuery = `
          UPDATE "NotebookVocabItems"
          SET status = $1
          WHERE notebook_id = $2 AND vocab_id = $3
          RETURNING vocab_id, status
        `;
        return client.query(updateQuery, [status, notebookId, vocabId]);
      });

      const results = await Promise.all(updatePromises);
      
      // Đếm số từ vựng đã cập nhật thành công
      const updatedCount = results.filter(r => r.rows.length > 0).length;

      await client.query("COMMIT");
      
      return {
        updatedCount,
        total: updates.length,
        failed: updates.length - updatedCount
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Lấy chi tiết notebook kèm danh sách từ vựng đầy đủ
   * @param {string} notebookId - ID của notebook
   * @param {number|null} page - Số trang (null = lấy tất cả)
   * @param {number|null} limit - Số từ mỗi trang (null = lấy tất cả)
   */
  async getNotebookWithVocabularies(notebookId, page = null, limit = null) {
    // 1. Lấy thông tin notebook
    const notebookQuery = `
      SELECT id, user_id, name, options, is_premium, status, template_id, vocab_count, created_at
      FROM "Notebooks"
      WHERE id = $1
    `;
    const notebookResult = await db.query(notebookQuery, [notebookId]);
    
    if (notebookResult.rows.length === 0) {
      return null;
    }

    const notebook = notebookResult.rows[0];

    // 2. Xây dựng query lấy từ vựng với chi tiết đầy đủ (bao gồm word types)
    let vocabQuery = `
      SELECT 
        v.id,
        v.hanzi,
        v.pinyin,
        v.meaning,
        v.notes,
        v.level,
        v.image_url,
        nvi.status,
        nvi.added_at,
        COALESCE(
          json_agg(
            DISTINCT vwt.word_type
          ) FILTER (WHERE vwt.word_type IS NOT NULL),
          '[]'
        ) as word_types
      FROM "NotebookVocabItems" nvi
      JOIN "Vocabulary" v ON nvi.vocab_id = v.id
      LEFT JOIN "VocabularyWordType" vwt ON v.id = vwt.vocab_id
      WHERE nvi.notebook_id = $1
      GROUP BY v.id, v.hanzi, v.pinyin, v.meaning, v.notes, v.level, v.image_url, nvi.status, nvi.added_at
      ORDER BY nvi.added_at DESC
    `;

    let vocabResult;
    let totalVocabs;

    // 3. Nếu có limit -> phân trang, nếu không -> lấy tất cả
    if (limit !== null && page !== null) {
      const offset = (page - 1) * limit;
      vocabQuery += ` LIMIT $2 OFFSET $3`;
      vocabResult = await db.query(vocabQuery, [notebookId, limit, offset]);

      // Đếm tổng số từ vựng
      const countQuery = `
        SELECT COUNT(*) as total
        FROM "NotebookVocabItems"
        WHERE notebook_id = $1
      `;
      const countResult = await db.query(countQuery, [notebookId]);
      totalVocabs = parseInt(countResult.rows[0].total);

      // Gộp kết quả với pagination
      notebook.vocabularies = {
        data: vocabResult.rows,
        pagination: {
          page: page,
          limit: limit,
          total: totalVocabs,
          totalPages: Math.ceil(totalVocabs / limit)
        }
      };
    } else {
      // Lấy tất cả từ vựng (không phân trang)
      vocabResult = await db.query(vocabQuery, [notebookId]);
      totalVocabs = vocabResult.rows.length;

      // Gộp kết quả không có pagination
      notebook.vocabularies = {
        data: vocabResult.rows,
        total: totalVocabs
      };
    }

    return notebook;
  }
};

module.exports = notebookCopyModel;
