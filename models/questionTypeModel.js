// file: models/questionTypeModel.js

const db = require('../config/db');

const questionTypeModel = {
  /**
   * Tạo một Question Type mới.
   */
  create: async (data) => {
    const { name, description, num_options, has_prompt } = data;
    const queryText = `
      INSERT INTO "Question_Types" (name, description, num_options, has_prompt)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [name, description, num_options, has_prompt];
    const result = await db.query(queryText, values);
    return result.rows[0];
  },

  /**
   * Lấy tất cả các Question Types.
   */
  findAll: async () => {
    const queryText = `SELECT * FROM "Question_Types" WHERE is_deleted = false ORDER BY created_at ASC;`;
    const result = await db.query(queryText);
    return result.rows;
  },

  /**
   * Tìm một Question Type theo ID.
   */
  findById: async (id) => {
    const queryText = `SELECT * FROM "Question_Types" WHERE id = $1 AND is_deleted = false;`;
    const result = await db.query(queryText, [id]);
    return result.rows[0];
  },

  /**
   * Cập nhật một Question Type.
   */
  update: async (id, data) => {
    const fieldsToUpdate = Object.keys(data);
    if (fieldsToUpdate.length === 0) return null;

    const setClause = fieldsToUpdate.map((field, index) => `"${field}" = $${index + 1}`).join(', ');
    const values = Object.values(data);

    const queryText = `
      UPDATE "Question_Types"
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fieldsToUpdate.length + 1}
      RETURNING *;
    `;
    const result = await db.query(queryText, [...values, id]);
    return result.rows[0];
  },

  /**
   * Xóa một Question Type (soft delete).
   */
  delete: async (id) => {
    const queryText = `
      UPDATE "Question_Types"
      SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `;
    const result = await db.query(queryText, [id]);
    return result.rowCount;
  },
};

module.exports = questionTypeModel;