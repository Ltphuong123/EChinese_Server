// file: models/examLevelModel.js

const db = require('../config/db');

const examLevelModel = {
  create: async (examLevelData) => {
    const { exam_type_id, name, order } = examLevelData;
    const queryText = `
      INSERT INTO "Exam_Levels" (exam_type_id, name, "order")
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const values = [exam_type_id, name, order];
    const result = await db.query(queryText, values);
    return result.rows[0];
  },

  // findAll: async () => {
  //   // Join với Exam_Types để lấy cả tên của loại bài thi
  //   const queryText = `
  //     SELECT el.*, et.name as exam_type_name
  //     FROM "Exam_Levels" el
  //     JOIN "Exam_Types" et ON el.exam_type_id = et.id
  //     WHERE el.is_deleted = false
  //     ORDER BY et.name, el."order" ASC;
  //   `;
  //   const result = await db.query(queryText);
  //   return result.rows;
  // },

  findAll: async (examTypeId) => {
    let queryText = `
      SELECT el.*, et.name as exam_type_name
      FROM "Exam_Levels" el
      JOIN "Exam_Types" et ON el.exam_type_id = et.id
      WHERE el.is_deleted = false
    `;
    const queryParams = [];

    // Nếu examTypeId được cung cấp, thêm điều kiện lọc vào câu truy vấn
    if (examTypeId) {
      queryParams.push(examTypeId);
      queryText += ` AND el.exam_type_id = $1`;
    }

    queryText += ` ORDER BY et.name, el."order" ASC;`;
    
    const result = await db.query(queryText, queryParams);
    return result.rows;
  },


  delete: async (id) => {
    const queryText = `DELETE FROM "Exam_Levels" WHERE id = $1;`;
    const result = await db.query(queryText, [id]);
    return result.rowCount;
  },

  updateOrder: async (levels) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const updatedLevels = [];
      
      for (const level of levels) {
        const queryText = `
          UPDATE "Exam_Levels"
          SET "order" = $1
          WHERE id = $2
          RETURNING *;
        `;
        const result = await client.query(queryText, [level.order, level.id]);
        
        if (result.rows[0]) {
          updatedLevels.push(result.rows[0]);
        }
      }

      await client.query('COMMIT');
      return updatedLevels;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

module.exports = examLevelModel;
