// models/mediaModel.js
const db = require('../config/db');

const mediaModel = {
  // Tái sử dụng hàm này
  create: async (mediaData) => {
    const {
      original_name, s3_path, mime_type, size_bytes,
      uploaded_by, usage_type, display_name
    } = mediaData;

    const queryText = `
      INSERT INTO "Media" (
        original_name, s3_path, mime_type, size_bytes,
        uploaded_by, usage_type, display_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [
      original_name, s3_path, mime_type || null, size_bytes || null,
      uploaded_by, usage_type || 'system', display_name || null
    ];
    const result = await db.query(queryText, values);
    return result.rows[0];
  },

   findAll: async ({ limit, offset, search }) => {
    let queryParams = [];
    let countQueryParams = [];
    
    let whereClause = '';
    if (search) {
      whereClause = `WHERE original_name ILIKE $1 OR display_name ILIKE $1 OR s3_path ILIKE $1`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm);
      countQueryParams.push(searchTerm);
    }
    
    const dataQueryText = `
      SELECT * 
      FROM "Media"
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${queryParams.length + 1}
      OFFSET $${queryParams.length + 2};
    `;
    queryParams.push(limit, offset);

    const countQueryText = `
      SELECT COUNT(*) as total 
      FROM "Media"
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
      media: dataResult.rows,
      pagination: { totalItems, totalPages, currentPage, itemsPerPage: limit }
    };
  },

  // === HÀM MỚI: XÓA MỘT MEDIA BẰNG ID ===
  deleteById: async (mediaId) => {
    const queryText = `
      DELETE FROM "Media"
      WHERE id = $1
      RETURNING *; -- Trả về toàn bộ bản ghi đã xóa để service có thể lấy s3_path
    `;
    const result = await db.query(queryText, [mediaId]);
    return result.rows[0];
  },
};

module.exports = mediaModel;