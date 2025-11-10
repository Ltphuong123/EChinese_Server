// models/usageModel.js

const db = require('../config/db');

const usageModel = {
  upsert: async (usageData, client = db) => {
    const { user_id, feature, daily_count, last_reset } = usageData;
    // NOTE: ON CONFLICT requires a UNIQUE constraint on (user_id, feature).
    // The user requested not to change DB schema, so we implement upsert
    // with a safe SELECT -> UPDATE or INSERT fallback. Caller may pass
    // a transaction client; we use it directly (do not begin/commit here).

    // First try to find existing record
    const selectQuery = `SELECT id FROM "UserUsage" WHERE user_id = $1 AND feature = $2 LIMIT 1;`;
    const selectRes = await client.query(selectQuery, [user_id, feature]);

    if (selectRes.rowCount > 0) {
      // Update existing
      const updateQuery = `
        UPDATE "UserUsage"
        SET daily_count = $1, last_reset = $2
        WHERE user_id = $3 AND feature = $4
        RETURNING *;
      `;
      const updateRes = await client.query(updateQuery, [daily_count, last_reset, user_id, feature]);
      return updateRes.rows[0];
    }

    // Insert new
    const insertQuery = `
      INSERT INTO "UserUsage" (user_id, feature, daily_count, last_reset)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const insertRes = await client.query(insertQuery, [user_id, feature, daily_count, last_reset]);
    return insertRes.rows[0];
  },

  
  create: async (usageData) => {
    const { user_id, feature, daily_count } = usageData;
    
    const queryText = `
    INSERT INTO "UserUsage" (
    user_id, 
    feature, 
    daily_count
    
) VALUES (
    $1, 
    $2,                         
    $3                                                       
);`;


    const values = [user_id, feature, daily_count];
    const result = await db.query(queryText,values);
    
    return result.rows[0];
    // return values;
  },

  findAll: async ({ limit, offset, search }) => {
    let queryParams = [];
    let countQueryParams = [];

    // Mệnh đề WHERE động, tìm kiếm theo tên/email user hoặc tên feature
    let whereClause = '';
    if (search) {
      whereClause = `WHERE u.username ILIKE $1 OR u.email ILIKE $1 OR uu.feature ILIKE $1`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm);
      countQueryParams.push(searchTerm);
    }
    
    // Câu truy vấn chính để lấy dữ liệu, JOIN với bảng Users để lấy thông tin user
    const dataQueryText = `
      SELECT 
        uu.id,
        uu.user_id,
        u.username,
        u.email,
        uu.feature,
        uu.daily_count,
        uu.last_reset
      FROM "UserUsage" uu
      JOIN "Users" u ON uu.user_id = u.id
      ${whereClause}
      ORDER BY uu.last_reset DESC, u.username ASC
      LIMIT $${queryParams.length + 1}
      OFFSET $${queryParams.length + 2};
    `;
    queryParams.push(limit, offset);

    // Câu truy vấn để đếm tổng số bản ghi
    const countQueryText = `
      SELECT COUNT(uu.id) as total
      FROM "UserUsage" uu
      JOIN "Users" u ON uu.user_id = u.id
      ${whereClause};
    `;

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQueryText, queryParams),
      db.query(countQueryText, countQueryParams)
    ]);
    
    const totalItems = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalItems / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      usageRecords: dataResult.rows,
      pagination: {
        totalItems,
        totalPages,
        currentPage,
        itemsPerPage: limit
      }
    };
  }
};

module.exports = usageModel;