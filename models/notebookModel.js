const db = require('../config/db');

const notebookModel = {
  create: async (notebookData) => {
    const {
      name,
      options,
      is_premium = false,
      status,
      user_id = null // Cho phép admin tạo notebook hệ thống không thuộc về user nào
    } = notebookData;

    const queryText = `
      INSERT INTO "Notebooks" (name, options, is_premium, status, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    // pg driver sẽ tự động chuyển đổi object options thành JSON
    const values = [name, options, is_premium, status, user_id];
    
    const result = await db.query(queryText, values);
    return result.rows[0];
  },

  async createUserNoteBook(userId, name) {
    const query = `
      INSERT INTO "Notebooks" (user_id, name, status, options) 
      VALUES ($1, $2, 'published', '{}') 
      RETURNING *;
    `;
    const result = await db.query(query, [userId, name]);
    return result.rows[0];
  },

  findAllPaginated: async (filters) => {
    const { limit, offset, search, status, premium } = filters;
    
    const queryParams = [];
    
    // Xây dựng các phần của câu truy vấn
    let baseQuery = `FROM "Notebooks" WHERE 1=1`;
    let whereClauses = '';

    // Lọc theo status
    if (status && status !== 'all') {
      queryParams.push(status);
      whereClauses += ` AND status = $${queryParams.length}`;
    }

    // Lọc theo is_premium
    if (premium && premium !== 'all') {
      // Chuyển đổi string 'true'/'false' thành boolean
      const isPremiumValue = premium === 'true';
      queryParams.push(isPremiumValue);
      whereClauses += ` AND is_premium = $${queryParams.length}`;
    }

    // Tìm kiếm theo tên notebook
    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses += ` AND name ILIKE $${queryParams.length}`;
    }
    
    // --- Truy vấn 1: Đếm tổng số bản ghi khớp điều kiện ---
    const countQuery = `SELECT COUNT(*) ${baseQuery} ${whereClauses}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);
    
    // --- Truy vấn 2: Lấy dữ liệu đã phân trang ---
    let selectQuery = `SELECT * ${baseQuery} ${whereClauses} ORDER BY created_at DESC`;

    // Thêm LIMIT và OFFSET vào câu truy vấn và params
    queryParams.push(limit);
    selectQuery += ` LIMIT $${queryParams.length}`;
    
    queryParams.push(offset);
    selectQuery += ` OFFSET $${queryParams.length}`;
    
    const notebooksResult = await db.query(selectQuery, queryParams);

    return {
      notebooks: notebooksResult.rows,
      totalItems: totalItems,
    };
  },

  update: async (id, updateData) => {
    const fieldsToUpdate = Object.keys(updateData);
    if (fieldsToUpdate.length === 0) {
      // Không thể trả về lỗi ở đây, vì có thể người dùng chỉ gửi id
      // service sẽ xử lý logic này. Ta có thể tìm và trả về bản ghi hiện tại.
      const current = await db.query('SELECT * FROM "Notebooks" WHERE id = $1', [id]);
      return current.rows[0];
    }
    
    // Xây dựng chuỗi SET: "name" = $1, "status" = $2,...
    const setClause = fieldsToUpdate
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(', ');
      
    const values = Object.values(updateData);
    
    const queryText = `
      UPDATE "Notebooks"
      SET ${setClause}
      WHERE id = $${fieldsToUpdate.length + 1}
      RETURNING *;
    `;
    
    const queryParams = [...values, id];
    
    const result = await db.query(queryText, queryParams);
    
    return result.rows[0];
  },

  addVocabularies: async (notebookId, vocabIds) => {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // --- Thao tác 1: Thêm các liên kết vào bảng NotebookVocabItems ---
      // Xây dựng câu lệnh INSERT với nhiều giá trị
      // ON CONFLICT DO NOTHING: Nếu một cặp (notebook_id, vocab_id) đã tồn tại,
      // câu lệnh sẽ bỏ qua nó một cách nhẹ nhàng mà không báo lỗi. Điều này rất hữu ích.
      // 'chưa thuộc' là giá trị mặc định cho status khi thêm từ mới.
      const insertQuery = `
        INSERT INTO "NotebookVocabItems" (notebook_id, vocab_id, status)
        SELECT $1, unnest($2::uuid[]), 'chưa thuộc'
        ON CONFLICT (notebook_id, vocab_id) DO NOTHING
        RETURNING vocab_id;
      `;

      // unnest($2::uuid[]) là một cách hiệu quả trong PostgreSQL để biến một mảng thành các hàng.
      const insertResult = await client.query(insertQuery, [notebookId, vocabIds]);
      const addedCount = insertResult.rowCount;

      // --- Thao tác 2: Cập nhật lại cột vocab_count trong bảng Notebooks ---
      // Cách làm an toàn nhất là đếm lại toàn bộ từ trong notebook thay vì chỉ cộng thêm.
      // Điều này giúp tránh lỗi đồng bộ nếu có thao tác xóa xảy ra đồng thời.
      const updateCountQuery = `
        UPDATE "Notebooks"
        SET vocab_count = (
          SELECT COUNT(*) FROM "NotebookVocabItems" WHERE notebook_id = $1
        )
        WHERE id = $1
        RETURNING vocab_count;
      `;
      const updateResult = await client.query(updateCountQuery, [notebookId]);
      
      // Kiểm tra xem notebook có tồn tại không
      if (updateResult.rowCount === 0) {
        throw new Error('Notebook không tồn tại.');
      }
      
      const newTotalVocabCount = updateResult.rows[0].vocab_count;

      await client.query('COMMIT');
      
      return { addedCount, newTotalVocabCount };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Lỗi trong transaction khi thêm từ vựng vào notebook:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  findById: async (id) => {
    const queryText = `SELECT * FROM "Notebooks" WHERE id = $1;`;
    const result = await db.query(queryText, [id]);
    
    // result.rows[0] sẽ là object notebook hoặc undefined nếu không có kết quả
    return result.rows[0];
  },

  removeVocabularies: async (notebookId, vocabIds) => {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // --- Thao tác 1: Xóa các liên kết trong bảng NotebookVocabItems ---
      // RETURNING *: Lấy lại các bản ghi đã xóa để biết chính xác đã xóa bao nhiêu.
      const deleteQuery = `
        DELETE FROM "NotebookVocabItems"
        WHERE notebook_id = $1 AND vocab_id = ANY($2::uuid[])
        RETURNING *;
      `;
      const deleteResult = await client.query(deleteQuery, [notebookId, vocabIds]);
      const removedCount = deleteResult.rowCount;
      
      // Nếu không có gì bị xóa, có thể dừng sớm để tránh cập nhật count không cần thiết,
      // nhưng việc chạy tiếp vẫn đảm bảo count luôn đúng.

      // --- Thao tác 2: Cập nhật lại cột vocab_count trong bảng Notebooks ---
      // Đếm lại toàn bộ số từ còn lại trong notebook để đảm bảo tính chính xác.
      const updateCountQuery = `
        UPDATE "Notebooks"
        SET vocab_count = (
          SELECT COUNT(*) FROM "NotebookVocabItems" WHERE notebook_id = $1
        )
        WHERE id = $1
        RETURNING vocab_count;
      `;
      const updateResult = await client.query(updateCountQuery, [notebookId]);

      // Kiểm tra xem notebook có tồn tại không
      if (updateResult.rowCount === 0) {
        // Nếu không tìm thấy notebook, rollback transaction
        await client.query('ROLLBACK');
        client.release();
        throw new Error('Notebook không tồn tại.');
      }

      const newTotalVocabCount = updateResult.rows[0].vocab_count;
      
      await client.query('COMMIT');

      return { removedCount, newTotalVocabCount };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Lỗi trong transaction khi xóa từ vựng khỏi notebook:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  bulkUpdateStatus: async (ids, status) => {
    // Sử dụng toán tử ANY của PostgreSQL để cập nhật các hàng có id nằm trong một mảng.
    // Đây là cách làm hiệu quả nhất cho các hành động hàng loạt.
    const queryText = `
      UPDATE "Notebooks"
      SET status = $1
      WHERE id = ANY($2::uuid[]);
    `;
    
    const result = await db.query(queryText, [status, ids]);
    
    // rowCount chứa số lượng hàng đã bị ảnh hưởng (được cập nhật).
    return result.rowCount;
  },

  bulkDelete: async (ids) => {
    // Câu lệnh DELETE đơn giản, hiệu quả
    const queryText = `
      DELETE FROM "Notebooks"
      WHERE id = ANY($1::uuid[]);
    `;
    
    const result = await db.query(queryText, [ids]);
    
    // rowCount trả về số hàng đã bị xóa
    return result.rowCount;
  },

 async updateNoteBookUser(notebookId, userId, name) {
     const query = `
       UPDATE "Notebooks" SET name = $1 
       WHERE id = $2 AND user_id = $3 
       RETURNING *;
     `;
     const result = await db.query(query, [name, notebookId, userId]);
     return result.rows[0];
   }, 




  async findByIdAndUserId(notebookId, userId) {
      const query = `SELECT * FROM "Notebooks" WHERE id = $1 AND user_id = $2;`;
      const result = await db.query(query, [notebookId, userId]);
      return result.rows[0];
  },

   async findVocabulariesByNotebookId(notebookId, filters) {
      const { limit, offset, search, status } = filters;
      const queryParams = [notebookId];
      let whereClauses = `WHERE nvi.notebook_id = $1`;
  
      if (search) {
        queryParams.push(`%${search}%`);
        whereClauses += ` AND (v.hanzi ILIKE $${queryParams.length} OR v.pinyin ILIKE $${queryParams.length} OR v.meaning ILIKE $${queryParams.length})`;
      }
  
      if (status) {
        queryParams.push(status);
        whereClauses += ` AND nvi.status = $${queryParams.length}`;
      }
  
      const countQuery = `SELECT COUNT(*) FROM "NotebookVocabItems" nvi JOIN "Vocabulary" v ON nvi.vocab_id = v.id ${whereClauses}`;
      const totalResult = await db.query(countQuery, queryParams);
      const totalItems = parseInt(totalResult.rows[0].count, 10);
      
      let selectQuery = `
        SELECT v.id, v.hanzi, v.pinyin, v.meaning, nvi.status as status_in_notebook
        FROM "NotebookVocabItems" nvi
        JOIN "Vocabulary" v ON nvi.vocab_id = v.id
        ${whereClauses}
        ORDER BY nvi.added_at DESC
      `;
      queryParams.push(limit, offset);
      selectQuery += ` LIMIT $${queryParams.length-1} OFFSET $${queryParams.length}`;
  
      const vocabResult = await db.query(selectQuery, queryParams);
      return { vocabularies: vocabResult.rows, totalItems };
    },
  

















  findAll1: async () => {
    const queryText = `SELECT * FROM "Notebooks" ORDER BY created_at DESC;`;
    const result = await db.query(queryText);
    return result.rows;
  },

  findAll: async ({ userId, type, limit, offset }) => {
    let whereClauses = [];
    let queryParams = [];
    let paramIndex = 1;

    // Điều kiện cơ bản: Lấy sổ tay của user HOẶC sổ tay hệ thống
    whereClauses.push(`(user_id = $${paramIndex} OR user_id IS NULL)`);
    queryParams.push(userId);
    paramIndex++;
    
    // Thêm điều kiện lọc theo `type`
    if (type === 'personal') {
      // Chỉ lấy sổ tay của user này
      whereClauses = [`user_id = $1`]; // Ghi đè điều kiện cơ bản
    } else if (type === 'system') {
      // Chỉ lấy sổ tay hệ thống (không premium)
      whereClauses.push(`user_id IS NULL`);
      whereClauses.push(`is_premium = false`);
    } else if (type === 'premium') {
      // Chỉ lấy sổ tay premium (cũng là sổ tay hệ thống)
      whereClauses.push(`user_id IS NULL`);
      whereClauses.push(`is_premium = true`);
    }
    
    const whereString = `WHERE ${whereClauses.join(' AND ')}`;
    
    // Câu truy vấn lấy dữ liệu (có phân trang)
    const dataQueryText = `
      SELECT id, user_id, name, vocab_count, options, is_premium, created_at
      FROM "Notebooks"
      ${whereString}
      ORDER BY user_id DESC NULLS LAST, created_at DESC
      LIMIT $${paramIndex++}
      OFFSET $${paramIndex++};
    `;

    // Câu truy vấn đếm tổng số kết quả
    const countQueryText = `
      SELECT COUNT(*) as total
      FROM "Notebooks"
      ${whereString};
    `;
    
    // Lấy params cho câu lệnh COUNT (không bao gồm LIMIT và OFFSET)
    const countParams = queryParams.slice();
    
    // Thực thi song song
    const [dataResult, countResult] = await Promise.all([
      db.query(dataQueryText, [...queryParams, limit, offset]),
      db.query(countQueryText, countParams)
    ]);
    
    const totalItems = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalItems / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      notebooks: dataResult.rows,
      pagination: { totalItems, totalPages, currentPage, itemsPerPage: limit }
    };
  },

  findAllSystem: async (sortBy = 'created_at') => {
    // Whitelist các cột được phép sắp xếp để tránh SQL Injection
    const allowedColumns = {
      'name': 'name',
      'created_at': 'created_at',
      'vocab_count': 'vocab_count'
    };
    const sortColumn = allowedColumns[sortBy] || 'created_at'; // Mặc định là 'created_at' nếu sortBy không hợp lệ
    
    // Luôn sắp xếp theo is_premium trước để nhóm chúng lại, sau đó mới đến cột được chọn
    const queryText = `
      SELECT id, name, vocab_count, options, is_premium, created_at
      FROM "Notebooks"
      WHERE user_id IS NULL
      ORDER BY ${sortColumn} ASC;
    `;
    
    const result = await db.query(queryText);
    
    return result.rows;
  },
  // addVocabularies: async (notebookId, vocabIds, status) => {
  //   const client = await db.pool.connect();
  //   try {
  //     await client.query('BEGIN');

  //     // Bước 1: Thêm các bản ghi vào bảng "NotebookVocabItems"
  //     const insertQueryText = `
  //       INSERT INTO "NotebookVocabItems" (notebook_id, vocab_id, status)
  //       SELECT $1, unnest($2::uuid[]), $3;
  //     `;
  //     // Sử dụng `unnest` để thêm nhiều dòng hiệu quả
  //     await client.query(insertQueryText, [notebookId, vocabIds, status]);

  //     // Bước 2: Cập nhật lại `vocab_count` trong bảng "Notebooks"
  //     // Đếm lại toàn bộ số từ trong sổ tay để đảm bảo tính chính xác
  //     const updateCountQueryText = `
  //       UPDATE "Notebooks"
  //       SET vocab_count = (
  //           SELECT COUNT(*) FROM "NotebookVocabItems" WHERE notebook_id = $1
  //       )
  //       WHERE id = $1;
  //     `;
  //     await client.query(updateCountQueryText, [notebookId]);

  //     await client.query('COMMIT');
      
  //     return {
  //         notebookId: notebookId,
  //         addedCount: vocabIds.length,
  //         status: status
  //     };

  //   } catch (error) {
  //     await client.query('ROLLBACK');
  //     throw error;
  //   } finally {
  //     client.release();
  //   }
  // },
  findVocabulariesByNotebookId: async ({ notebookId, filters, limit, offset }) => {
    const { status, sortBy } = filters;
    let whereClauses = [`nvi.notebook_id = $1`];
    let queryParams = [notebookId];
    let paramIndex = 2;

    // 1. Xây dựng mệnh đề WHERE cho status
    if (status) {
      whereClauses.push(`nvi.status = $${paramIndex++}`);
      queryParams.push(status);
    }

    // 2. Xây dựng mệnh đề ORDER BY
    const sortOptions = {
      'hanzi_asc': 'v.hanzi ASC',
      'hanzi_desc': 'v.hanzi DESC',
      'pinyin_asc': 'v.pinyin ASC',
      'pinyin_desc': 'v.pinyin DESC',
      'added_at_asc': 'nvi.added_at ASC',
      'added_at_desc': 'nvi.added_at DESC',
    };
    const orderBy = sortOptions[sortBy] || 'nvi.added_at DESC'; // Mặc định

    const whereString = `WHERE ${whereClauses.join(' AND ')}`;
    
    // Câu truy vấn lấy dữ liệu
    const dataQueryText = `
      SELECT 
        v.*,
        nvi.status,
        nvi.added_at
      FROM "NotebookVocabItems" AS nvi
      JOIN "Vocabulary" AS v ON nvi.vocab_id = v.id
      ${whereString}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex++}
      OFFSET $${paramIndex++};
    `;
    
    // Câu truy vấn đếm tổng số kết quả
    const countQueryText = `
      SELECT COUNT(*) as total
      FROM "NotebookVocabItems" AS nvi
      ${whereString};
    `;
    
    const [dataResult, countResult] = await Promise.all([
      db.query(dataQueryText, [...queryParams, limit, offset]),
      db.query(countQueryText, queryParams)
    ]);
    
    const totalItems = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalItems / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      vocabularies: dataResult.rows,
      pagination: { totalItems, totalPages, currentPage, itemsPerPage: limit }
    };
  },
  removeVocabulary: async (notebookId, vocabId) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Bước 1: Xóa bản ghi khỏi "NotebookVocabItems"
      const deleteQuery = `
        DELETE FROM "NotebookVocabItems"
        WHERE notebook_id = $1 AND vocab_id = $2
        RETURNING vocab_id;
      `;
      const deleteResult = await client.query(deleteQuery, [notebookId, vocabId]);
      
      // Nếu không có dòng nào bị xóa, nghĩa là từ vựng không tồn tại trong sổ tay
      if (deleteResult.rowCount === 0) {
        // Không cần rollback vì chưa có thay đổi gì, nhưng trả về null để báo hiệu
        await client.query('ROLLBACK'); // Hoặc COMMIT cũng được vì không có thay đổi
        return null;
      }

      // Bước 2: Cập nhật lại `vocab_count` trong bảng "Notebooks"
      const updateCountQuery = `
        UPDATE "Notebooks"
        SET vocab_count = vocab_count - 1
        WHERE id = $1
        RETURNING vocab_count;
      `;
      const updateResult = await client.query(updateCountQuery, [notebookId]);

      await client.query('COMMIT');
      
      return {
        newVocabCount: updateResult.rows[0].vocab_count
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  updateVocabularyStatus: async (notebookId, vocabId, newStatus) => {
    const queryText = `
      UPDATE "NotebookVocabItems"
      SET status = $1
      WHERE notebook_id = $2 AND vocab_id = $3
      RETURNING *;
    `;
    
    const result = await db.query(queryText, [newStatus, notebookId, vocabId]);
    
    // Nếu không có dòng nào được cập nhật, trả về null
    return result.rows[0];
  },
  deleteById: async (notebookId) => {
    const queryText = `
      DELETE FROM "Notebooks"
      WHERE id = $1
      RETURNING id; -- Trả về id để xác nhận đã xóa
    `;
    const result = await db.query(queryText, [notebookId]);

    // Nếu result.rowCount > 0, có nghĩa là đã xóa thành công.
    return result.rows[0];
  },
  findByIdSimple: async (notebookId) => {
    const result = await db.query(`SELECT id, user_id FROM "Notebooks" WHERE id = $1`, [notebookId]);
    return result.rows[0];
  },
  updateById: async (notebookId, updateData) => {
    const keys = Object.keys(updateData);
    const values = Object.values(updateData);
    
    // Xây dựng phần SET của câu lệnh SQL một cách động
    const setClause = keys
      .map((key, index) => `"${key}" = $${index + 1}`)
      .join(', ');

    const queryText = `
      UPDATE "Notebooks"
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *;
    `;

    const result = await db.query(queryText, [...values, notebookId]);
    
    return result.rows[0];
  },



};

module.exports = notebookModel;