// const { Pool } = require("pg");
// require("dotenv").config();

// const pool = new Pool({
//   host: "localhost",
//   port: 5432,
//   user: "postgres",
//   password: "123456",
//   database: "DBEChinese",
// });

// module.exports = {
//   query: (text, params) => pool.query(text, params),
//   pool: pool,
// };


// const { Pool } = require('pg');

// const pool = new Pool({
//   connectionString: 'postgresql://postgres:TghHWktPmtgPLoPdkHKeCownJCPbISzy@metro.proxy.rlwy.net:22354/railway',
//   ssl: {
//     rejectUnauthorized: false // bắt buộc với Railway
//   }
// });

// // Export để dùng query từ các file khác
// module.exports = {
//   query: (text, params) => pool.query(text, params),
//   pool: pool,
// };



const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: "dpg-d4ad7rnpm1nc73cq1eh0-a.singapore-postgres.render.com", // host Render
  port: 5432,
  user: "dbechinese",        // username Render
  password: "XGX9njj0LTTZtZtqtEkBZKZLa6QIv8y8", // password Render
  database: "mydb",    // database name Render
  ssl: {
    rejectUnauthorized: false, // cần cho Render
  },
  charset: 'UTF8' 
});

module.exports = { 
  query: (text, params) => pool.query(text, params),
  pool: pool,
};
