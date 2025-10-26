// models/userStreaksModel.js
const db = require('../config/db');

const userStreaksModel = {
  findByUserId: async (userId) => {
    const queryText = `SELECT * FROM "UserStreaks" WHERE user_id = $1;`;
    const result = await db.query(queryText, [userId]);
    return result.rows[0];
  },

  // Hàm này sẽ tạo mới hoặc cập nhật streak
  upsert: async (streakData) => {
    const { user_id, current_streak, longest_streak, last_login_date } = streakData;
    const queryText = `
      INSERT INTO "UserStreaks" (user_id, current_streak, longest_streak, last_login_date)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id)
      DO UPDATE SET
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        last_login_date = EXCLUDED.last_login_date;
    `;
    const values = [user_id, current_streak, longest_streak, last_login_date];
    await db.query(queryText, values);
  },
};

module.exports = userStreaksModel;