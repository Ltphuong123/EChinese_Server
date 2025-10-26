// models/usageModel.js

const db = require('../config/db');

const usageModel = {
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