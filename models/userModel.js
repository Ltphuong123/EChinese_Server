const db = require('../config/db');

const userModel = {
  // Lấy tất cả users (không lấy password_hash và bỏ isVerify nếu không tồn tại)
  getAllUsers: async () => {
    const queryText = `
      SELECT * FROM users;
    `;
    const result = await db.query(queryText);
    return result.rows;
  },

  createUser: async (userData) => {
    const {
      username,
      password_hash,
      name,
      email,
      provider = 'local',
      provider_id= null,
      role = 'user',
      is_active = true,
      verification_token= false,
      community_points = 0,
      level = '1',
      badge_level = 0,
      language = 'Tiếng Việt'
    } = userData;

    const queryText = `
      INSERT INTO users (
        username,
        password_hash,
        name,
        email,
        provider,
        provider_id,
        role,
        is_active,
        isverify,
        community_points,
        level,
        badge_level,
        language
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13
      )
      RETURNING *;
    `;

    const values = [
      username,
      password_hash,
      name,
      email,
      provider ,
      provider_id,
      role ,
      is_active ,
      verification_token,
      community_points,
      level,
      badge_level,
      language
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