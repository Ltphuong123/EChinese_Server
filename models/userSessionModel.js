// models/userSessionModel.js
const db = require('../config/db');

const userSessionModel = {
  create: async (sessionData) => {
    const { user_id, device, ip_address } = sessionData;
    const queryText = `
      INSERT INTO "UserSessions" (user_id, device, ip_address)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;
    const values = [user_id, device, ip_address];
    await db.query(queryText, values);
  },
};

module.exports = userSessionModel;