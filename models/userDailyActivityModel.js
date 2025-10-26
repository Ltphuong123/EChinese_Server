// models/userDailyActivityModel.js
const db = require('../config/db');

const userDailyActivityModel = {
  upsert: async (userId) => {
    const today = new Date().toISOString().slice(0, 10); // Lấy ngày hiện tại theo định dạng YYYY-MM-DD
    const queryText = `
      INSERT INTO "UserDailyActivity" (user_id, date, login_count, minutes_online)
      VALUES ($1, $2, 1, 0)
      ON CONFLICT (user_id, date)
      DO UPDATE SET login_count = "UserDailyActivity".login_count + 1;
    `;
    await db.query(queryText, [userId, today]);
  },
};

module.exports = userDailyActivityModel;