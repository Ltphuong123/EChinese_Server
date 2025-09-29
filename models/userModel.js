const db = require('../config/db');

const userModel = {
  // Lấy tất cả users (không lấy password_hash và bỏ isVerify nếu không tồn tại)
  getAllUsers: async () => {
    const queryText = `
      SELECT id, username, name, avatar_url, email, provider, role, is_active, 
             community_points, subscription_id, level, badge_level, 
             language, created_at, last_login, achievements 
      FROM users;
    `;
    const result = await db.query(queryText);
    return result.rows;
  },

  // Tạo user mới
  createUser: async (userData) => {
    const { username, password_hash, name, avatar_url, email, provider, provider_id, 
            role, is_active, verification_token, verification_token_expiry, 
            community_points, subscription_id, subscription_expiry, level, badge_level, 
            language, achievements } = userData;

    const queryText = `
      INSERT INTO users (
        username, password_hash, name, avatar_url, email, provider, provider_id, 
        role, is_active, verification_token, verification_token_expiry, 
        community_points, subscription_id, subscription_expiry, level, badge_level, 
        language, achievements
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING *;
    `;

    const values = [
      username, password_hash, name, avatar_url, email, provider, provider_id, 
      role, is_active, verification_token, verification_token_expiry, 
      community_points, subscription_id, subscription_expiry, level, badge_level, 
      language, achievements
    ];

    const result = await db.query(queryText, values);
    return result.rows[0];
  },

  // Tìm user bằng username
  findUserByUsername: async (username) => {
    const queryText = `SELECT * FROM users WHERE username = $1;`;
    const result = await db.query(queryText, [username]);
    return result.rows[0];
  },
};

module.exports = userModel;