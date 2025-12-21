// file: models/tipModel.js

const db = require('../config/db');

const tipModel = {
  findAllPaginated: async (filters) => {
    const { limit, offset, search, topic, level, is_pinned, excludeTopic } = filters;
    
    const queryParams = [];
    let whereClauses = 'WHERE 1=1';

    // Lọc theo topic
    if (topic && topic !== "undefined" && topic !== null) {
      queryParams.push(topic);
      whereClauses += ` AND topic = $${queryParams.length}`;
    }

    // Loại trừ topic
    if (excludeTopic && excludeTopic !== "undefined" && excludeTopic !== null) {
      queryParams.push(excludeTopic);
      whereClauses += ` AND topic != $${queryParams.length}`;
    }

    // Lọc theo level
    if (level && level !== "undefined" && level !== null) {
      queryParams.push(level);
      whereClauses += ` AND level = $${queryParams.length}`;
    }

    // Lọc theo is_pinned
    if (is_pinned !== "undefined" && is_pinned !== null) {
      const isPinnedValue = String(is_pinned).toLowerCase() === 'true';
      queryParams.push(isPinnedValue);
      whereClauses += ` AND is_pinned = $${queryParams.length}`;
    }

    // Tìm kiếm trong cột content (kiểu jsonb)
    if (search && search !== "undefined" && search !== null) {
      queryParams.push(`%${search}%`);
      whereClauses += ` AND content::text ILIKE $${queryParams.length}`;
    }
    
    // Truy vấn 1: Đếm tổng số bản ghi
    const countQuery = `SELECT COUNT(*) FROM "Tips" ${whereClauses}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);
    
    // Truy vấn 2: Lấy dữ liệu đã phân trang
    let selectQuery = `SELECT * FROM "Tips" ${whereClauses} ORDER BY is_pinned DESC, created_at DESC`;

    queryParams.push(limit);
    selectQuery += ` LIMIT $${queryParams.length}`;
    
    queryParams.push(offset);
    selectQuery += ` OFFSET $${queryParams.length}`;
    
    const tipsResult = await db.query(selectQuery, queryParams);

    return {
      tips: tipsResult.rows,
      totalItems: totalItems,
    };
  },

  findById: async (id) => {
    const queryText = `SELECT * FROM "Tips" WHERE id = $1;`;
    const result = await db.query(queryText, [id]);
    return result.rows[0];
  },

  update: async (id, updateData) => {
    const fieldsToUpdate = Object.keys(updateData);
    if (fieldsToUpdate.length === 0) {
      const current = await db.query('SELECT * FROM "Tips" WHERE id = $1', [id]);
      return current.rows[0];
    }
    
    const setClause = fieldsToUpdate
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(', ');
      
    const values = Object.values(updateData);
    
    const queryText = `
      UPDATE "Tips"
      SET ${setClause}
      WHERE id = $${fieldsToUpdate.length + 1}
      RETURNING *;
    `;
    
    const queryParams = [...values, id];
    const result = await db.query(queryText, queryParams);
    return result.rows[0];
  },

  delete: async (id) => {
    const queryText = `DELETE FROM "Tips" WHERE id = $1;`;
    const result = await db.query(queryText, [id]);
    return result.rowCount;
  },

  create: async (tipData) => {
    const { topic, level, content = '', answer, is_pinned, created_by } = tipData;

    const queryText = `
      INSERT INTO "Tips" (topic, level, content, answer, is_pinned, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [topic, level, content, answer, is_pinned, created_by];
    const result = await db.query(queryText, values);
    return result.rows[0];
  },
};

module.exports = tipModel;
