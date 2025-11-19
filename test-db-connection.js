require('dotenv').config();
const { Pool } = require('pg');

console.log('=== KIỂM TRA CẤU HÌNH DATABASE ===');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-4) : 'KHÔNG CÓ');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_SSL:', process.env.DB_SSL);
console.log('');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
});

console.log('Đang thử kết nối...');

pool.query('SELECT NOW() as current_time, current_database() as db_name, current_user as user_name', (err, res) => {
  if (err) {
    console.error('❌ LỖI KẾT NỐI:');
    console.error('   Message:', err.message);
    console.error('   Code:', err.code);
    console.error('   Detail:', err.detail);
  } else {
    console.log('✅ KẾT NỐI THÀNH CÔNG!');
    console.log('   Thời gian:', res.rows[0].current_time);
    console.log('   Database:', res.rows[0].db_name);
    console.log('   User:', res.rows[0].user_name);
  }
  pool.end();
});
