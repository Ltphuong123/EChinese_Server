// File: models/notebookVocabItemModel.js

const db = require('../config/db');

const notebookVocabItemModel = {

  addVocabItemsToNotebook: async (notebookId, vocabIds) => {
    // Nếu mảng vocabIds rỗng hoặc không hợp lệ, không thực hiện truy vấn.
    if (!vocabIds || vocabIds.length === 0) {
      return 0;
    }
    let valuePlaceholders = [];
    let queryValues = [notebookId];

    vocabIds.forEach(vocabId => {
      queryValues.push(vocabId);
      valuePlaceholders.push(`($1, $${queryValues.length}, 'chưa thuộc')`); 
    });

    const queryText = `
      INSERT INTO "NotebookVocabItems" (notebook_id, vocab_id, status)
      VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT (notebook_id, vocab_id) DO NOTHING;
    `;
    
    
    // Thực thi câu lệnh và trả về số lượng dòng đã được thêm vào.
    const result = await db.query(queryText, queryValues);
    return result.rowCount;
  },

  removeVocabItemsFromNotebook: async (notebookId, vocabIds) => {
    // Nếu mảng vocabIds rỗng hoặc không hợp lệ, không làm gì cả.
    if (!vocabIds || vocabIds.length === 0) {
      return 0;
    }
    
    // Sử dụng toán tử ANY của PostgreSQL để so sánh với một mảng giá trị.
    // Đây là cách hiệu quả để xóa nhiều dòng khớp với một danh sách ID.
    const queryText = `
      DELETE FROM "NotebookVocabItems"
      WHERE notebook_id = $1 AND vocab_id = ANY($2::uuid[]);
    `;

    const result = await db.query(queryText, [notebookId, vocabIds]);
    return result.rowCount;
  },

  findVocabItemsInNotebook: async (notebookId, options) => {
    const { limit, offset } = options;

    // Câu lệnh JOIN để lấy thông tin từ cả hai bảng.
    const queryText = `
      SELECT
        v.id,
        v.hanzi,
        v.pinyin,
        v.meaning,
        v.level,
        v.word_type,
        nvi.status,
        nvi.added_at
      FROM "NotebookVocabItems" AS nvi
      JOIN "Vocabulary" AS v ON nvi.vocab_id = v.id
      WHERE nvi.notebook_id = $1
      ORDER BY nvi.added_at DESC -- Sắp xếp theo ngày thêm gần nhất
      LIMIT $2 OFFSET $3;
    `;
    
    const result = await db.query(queryText, [notebookId, limit, offset]);
    return result.rows;
  },

  removeAllItemsFromNotebook: async (notebookId) => {
    const queryText = `DELETE FROM "NotebookVocabItems" WHERE notebook_id = $1;`;
    const result = await db.query(queryText, [notebookId]);
    return result.rowCount;
  },
  
  findUserVocabItems: async (notebookId, filters) => {
    const { status, sortBy = 'added_at', sortOrder = 'DESC', limit, offset } = filters;

    let queryValues = [notebookId];
    let whereClauses = [`nvi.notebook_id = $1`];
    let valueIndex = 2;

    // Xây dựng mệnh đề WHERE động cho status
    if (status) {
      queryValues.push(status);
      whereClauses.push(`nvi.status = $${valueIndex++}`);
    }

    const whereCondition = whereClauses.join(' AND ');
    
    // Whitelist tên cột sắp xếp (ví dụ: hanzi, pinyin, status, added_at)
    const allowedSortBy = ['hanzi', 'pinyin', 'meaning', 'status', 'added_at'];
    const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'added_at';
    const sortColumn = (safeSortBy === 'added_at' || safeSortBy === 'status') ? `nvi."${safeSortBy}"` : `v."${safeSortBy}"`;
    const safeSortOrder = (sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

    // --- Query 1: Lấy tổng số lượng kết quả khớp với bộ lọc ---
    const countQueryText = `
      SELECT COUNT(*)
      FROM "NotebookVocabItems" AS nvi
      WHERE ${whereCondition};
    `;
    const countResult = await db.query(countQueryText, queryValues);
    const totalItems = parseInt(countResult.rows[0].count, 10);

    // --- Query 2: Lấy dữ liệu thực tế có phân trang ---
    queryValues.push(limit, offset);
    const dataQueryText = `
      SELECT
        v.id,
        v.hanzi,
        v.pinyin,
        v.meaning,
        v.level,
        nvi.status,
        nvi.added_at
      FROM "NotebookVocabItems" AS nvi
      JOIN "Vocabulary" AS v ON nvi.vocab_id = v.id
      WHERE ${whereCondition}
      ORDER BY ${sortColumn} ${safeSortOrder}
      LIMIT $${valueIndex++} OFFSET $${valueIndex++};
    `;
    const dataResult = await db.query(dataQueryText, queryValues);
    
    return {
      items: dataResult.rows,
      totalItems: totalItems
    };
  },
  

  removeSingleVocabItem: async (notebookId, vocabId) => {
    const queryText = `
      DELETE FROM "NotebookVocabItems"
      WHERE notebook_id = $1 AND vocab_id = $2
      RETURNING notebook_id;
    `;
    const result = await db.query(queryText, [notebookId, vocabId]);
    return result.rowCount;
  },


  updateVocabItemStatus: async (notebookId, vocabId, newStatus) => {
    const queryText = `
      UPDATE "NotebookVocabItems"
      SET status = $3
      WHERE notebook_id = $1 AND vocab_id = $2
      RETURNING *;
    `;
    const result = await db.query(queryText, [notebookId, vocabId, newStatus]);
    return result.rows[0];
  },


  syncVocabChanges: async (changes) => {
    const client = await db.getClient();
    let updatedCount = 0;

    try {
      await client.query('BEGIN');

      // Tối ưu: Dùng mảng giá trị cho câu lệnh UPDATE hàng loạt
      const updates = changes.map(change => {
          return client.query(`
              UPDATE "NotebookVocabItems"
              SET status = $3, added_at = $4 -- Có thể cập nhật added_at để thể hiện lần cập nhật cuối
              WHERE notebook_id = $1 AND vocab_id = $2
              RETURNING *;
          `, [change.notebook_id, change.vocab_id, change.status, change.timestamp || new Date()]);
      });

      const results = await Promise.all(updates);
      results.forEach(res => {
          if (res.rowCount > 0) updatedCount++;
      });

      await client.query('COMMIT');
      return updatedCount;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }


};

module.exports = notebookVocabItemModel;