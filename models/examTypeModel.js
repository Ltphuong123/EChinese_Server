const db = require('../config/db');

const examTypeModel = {
  create: async (examTypeData) => {
    const { name, description='', is_active = true } = examTypeData;

    const queryText = `
      INSERT INTO "Exam_Types" (name, description, is_active)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const values = [name, description, is_active];
    
    const result = await db.query(queryText, values);
    return result.rows[0];
  },

  findAll: async () => {
    const queryText = `SELECT * FROM "Exam_Types" WHERE is_deleted = false ORDER BY created_at ASC;`;
    const result = await db.query(queryText);
    return result.rows;
  },

  delete: async (id) => {
    // Nhờ ON DELETE CASCADE, các Exam_Levels liên quan sẽ tự động bị xóa.
    const queryText = `DELETE FROM "Exam_Types" WHERE id = $1;`;
    const result = await db.query(queryText, [id]);
    return result.rowCount;
  },


};

module.exports = examTypeModel;