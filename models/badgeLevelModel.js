// file: models/badgeLevelModel.js

const db = require('../config/db');

const badgeLevelModel = {
  /**
   * Tìm level cao nhất hiện có trong bảng BadgeLevels.
   * @returns {Promise<number>} Level cao nhất, hoặc 0 nếu bảng trống.
   */
  findMaxLevel: async () => {
    const queryText = `SELECT MAX(level) as max_level FROM "BadgeLevels";`;
    const result = await db.query(queryText);
    // Nếu bảng trống, max_level sẽ là null.
    return result.rows[0].max_level || 0;
  },

  /**
   * Tạo một Badge Level mới.
   * @param {object} badgeData - Dữ liệu của huy hiệu.
   * @returns {Promise<object>} Huy hiệu vừa được tạo.
   */
  create: async (badgeData) => {
    const { level, name, icon, min_points, rule_description, is_active } = badgeData;

    const queryText = `
      INSERT INTO "BadgeLevels" (level, name, icon, min_points, rule_description, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [level, name, icon, min_points, rule_description, is_active];
    
    const result = await db.query(queryText, values);
    return result.rows[0];
  },

  findAll: async () => {
    const queryText = `SELECT * FROM "BadgeLevels" ORDER BY level ASC;`;
    const result = await db.query(queryText);
    return result.rows;
  },
  
  findAllDesc: async () => {
    // Dùng cho resync, cần sắp xếp giảm dần
    const queryText = `SELECT * FROM "BadgeLevels" WHERE is_active = true ORDER BY min_points DESC;`;
    const result = await db.query(queryText);
    return result.rows;
  },

  update: async (id, updateData) => {
    const fieldsToUpdate = Object.keys(updateData);
    if (fieldsToUpdate.length === 0) return null;
    
    const setClause = fieldsToUpdate.map((field, index) => `"${field}" = $${index + 1}`).join(', ');
    const values = Object.values(updateData);
    
    const queryText = `
      UPDATE "BadgeLevels" SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fieldsToUpdate.length + 1} RETURNING *;
    `;
    const queryParams = [...values, id];
    const result = await db.query(queryText, queryParams);
    return result.rows[0];
  },

  checkMinPointsConflict: async (min_points, excludeId) => {
    const queryText = `SELECT id FROM "BadgeLevels" WHERE min_points = $1 AND id != $2;`;
    const result = await db.query(queryText, [min_points, excludeId]);
    return result.rowCount > 0;
  },

  delete: async (id) => {
    const queryText = `DELETE FROM "BadgeLevels" WHERE id = $1;`;
    const result = await db.query(queryText, [id]);
    return result.rowCount;
  },


  
};

module.exports = badgeLevelModel;