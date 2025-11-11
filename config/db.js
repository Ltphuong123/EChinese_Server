// const { Pool } = require('pg');
// require('dotenv').config();

// const pool = new Pool({
//   host: 'localhost',
//   port: 5432,
//   user:'postgres',
//   password: '123456',
//   database:  'DBEChinese',
// });

// module.exports = {
//   query: (text, params) => pool.query(text, params),
//   pool: pool,
// };

const { Pool } = require('pg');

// Tạo pool kết nối với Railway
const pool = new Pool({
  connectionString: 'postgresql://postgres:TghHWktPmtgPLoPdkHKeCownJCPbISzy@metro.proxy.rlwy.net:22354/railway',
  ssl: {
    rejectUnauthorized: false // bắt buộc với Railway
  }
});

// Export để dùng query từ các file khác
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool,
};
