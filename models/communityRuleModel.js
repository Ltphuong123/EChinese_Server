// file: models/communityRuleModel.js
const db = require('../config/db');

const communityRuleModel = {
  create: async (data) => {
    const { title, description, severity_default } = data;
    const query = `INSERT INTO "CommunityRules" (title, description, severity_default) VALUES ($1, $2, $3) RETURNING *;`;
    const result = await db.query(query, [title, description, severity_default]);
    return result.rows[0];
  },

  findAll: async () => {
    const query = `SELECT * FROM "CommunityRules" ORDER BY created_at ASC;`;
    const result = await db.query(query);
    return result.rows;
  },

  update: async (id, data) => {
    const { title, description, severity_default, is_active } = data;
    const query = `UPDATE "CommunityRules" SET title = $1, description = $2, severity_default = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *;`;
    const result = await db.query(query, [title, description, severity_default, is_active, id]);
    return result.rows[0];
  },

  delete: async (id) => {
    const query = `DELETE FROM "CommunityRules" WHERE id = $1;`;
    const result = await db.query(query, [id]);
    return result.rowCount;
  }
};

module.exports = communityRuleModel;
