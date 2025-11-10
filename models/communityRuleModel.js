// file: models/communityRuleModel.js
const db = require('../config/db');

const communityRuleModel = {
  create: async (data) => {
    const { title, description, severity_default } = data;
    const query = `INSERT INTO "CommunityRules" (title, description, severity_default) VALUES ($1, $2, $3) RETURNING *;`;
    const result = await db.query(query, [title, description, severity_default]);
    return result.rows[0];
  },

  findAll: async () => {
    const query = `SELECT * FROM "CommunityRules" ORDER BY created_at ASC;`;
    const result = await db.query(query);
    return result.rows;
  },

update: async (id, data) => {
    // Lấy danh sách các trường hợp lệ có thể được cập nhật trong bảng
    const allowedFields = ['title', 'description', 'severity_default', 'is_active'];
    
    // Lọc ra các trường có trong `data` và cũng nằm trong danh sách `allowedFields`
    const fieldsToUpdate = Object.keys(data).filter(key => allowedFields.includes(key));

    // Nếu không có trường hợp lệ nào để cập nhật, ném lỗi hoặc trả về
    if (fieldsToUpdate.length === 0) {
      throw new Error("Không có trường hợp lệ nào để cập nhật.");
    }

    // Xây dựng phần "SET" của câu truy vấn một cách động
    // Ví dụ: "title" = $1, "is_active" = $2
    const setClause = fieldsToUpdate
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(', ');

    // Lấy các giá trị tương ứng từ object `data`
    const values = fieldsToUpdate.map(field => data[field]);

    // Xây dựng toàn bộ câu truy vấn
    const queryText = `
      UPDATE "CommunityRules"
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fieldsToUpdate.length + 1}
      RETURNING *;
    `;

    // Thêm `id` vào cuối mảng giá trị cho điều kiện WHERE
    const queryParams = [...values, id];

    // Thực thi truy vấn
    const result = await db.query(queryText, queryParams);

    // Nếu result.rows[0] tồn tại, nghĩa là đã cập nhật thành công
    // Nếu không, nghĩa là không tìm thấy rule với `id` cung cấp
    return result.rows[0] || null;
  },


  delete: async (id) => {
    const query = `DELETE FROM "CommunityRules" WHERE id = $1;`;
    const result = await db.query(query, [id]);
    return result.rowCount;
  }
};

module.exports = communityRuleModel;
