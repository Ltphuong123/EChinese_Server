const db = require("../config/db");

const notebookModel = {
  create: async (notebookData) => {
    // Trích xuất các thuộc tính từ object notebookData.
    // Các giá trị mặc định (ví dụ: is_premium = false) đã được xử lý ở lớp service.
    const {
      name,
      options,
      is_premium,
      status,
      user_id, // Có thể là null (do admin tạo) hoặc một UUID (do user tạo hoặc admin gán)
      created_by, // Luôn là một UUID của người thực hiện hành động
    } = notebookData;

    // Xây dựng câu lệnh SQL INSERT.
    // Sử dụng RETURNING * để PostgreSQL trả về toàn bộ bản ghi vừa được tạo,
    // giúp tiết kiệm một câu lệnh SELECT sau đó.
    const queryText = `
      INSERT INTO "Notebooks" (name, options, is_premium, status, user_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    // Tạo mảng các giá trị tương ứng với các placeholder ($1, $2, ...)
    // Thứ tự phải khớp chính xác với thứ tự các cột trong câu lệnh INSERT.
    const values = [name, options, is_premium, status, user_id, created_by];

    // Thực thi câu truy vấn với các tham số đã được bảo vệ (chống SQL Injection).
    const result = await db.query(queryText, values);

    // Trả về bản ghi đầu tiên trong kết quả (vì chúng ta chỉ chèn một hàng).
    return result.rows[0];
  },

  async findAll(filters) {
    const { limit, offset, search, status, premium, userId, userCreated } =
      filters;

    const queryParams = [];
    let whereClauses = "WHERE 1=1";

    // Xây dựng các điều kiện WHERE động
    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses += ` AND name ILIKE $${queryParams.length}`;
    }

    if (status && status !== "all") {
      queryParams.push(status);
      whereClauses += ` AND status = $${queryParams.length}`;
    }

    if (premium && premium !== "all") {
      const isPremiumValue = premium === "true";
      queryParams.push(isPremiumValue);
      whereClauses += ` AND is_premium = $${queryParams.length}`;
    }

    // --- Logic phân quyền cốt lõi ---
    if (userId) {
      if (userId === "NULL") {
        whereClauses += ` AND user_id IS NULL`;
      } else if (userId !== "all") {
        // Đây là trường hợp lấy sổ tay cá nhân
        queryParams.push(userId);
        whereClauses += ` AND user_id = $${queryParams.length}`;

        // Logic mới: phân biệt notebook user tự tạo vs copy từ template
        if (userCreated === true) {
          // Lấy notebook user tự tạo (user_id = created_by)
          whereClauses += ` AND user_id = created_by`;
        } else if (userCreated === false) {
          // Lấy notebook copy từ template (user_id != created_by)
          whereClauses += ` AND user_id != created_by`;
        }
      }
      // Nếu userId === 'all', không thêm điều kiện gì cả -> lấy tất cả.
    }

    // --- Truy vấn 1: Đếm tổng số ---
    const countQuery = `SELECT COUNT(*) FROM "Notebooks" ${whereClauses}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    // --- Truy vấn 2: Lấy dữ liệu phân trang ---
    const selectQuery = `
      SELECT id, name, vocab_count, created_at, status, is_premium, user_id, created_by 
      FROM "Notebooks" 
      ${whereClauses} 
      ORDER BY created_at DESC
    `;

    queryParams.push(limit, offset);
    const finalSelectQuery = `${selectQuery} LIMIT $${
      queryParams.length - 1
    } OFFSET $${queryParams.length}`;

    const notebooksResult = await db.query(finalSelectQuery, queryParams);
    console.log("notebooksResult.rows:", notebooksResult.rows);

    return {
      notebooks: notebooksResult.rows,
      totalItems: totalItems,
    };
  },

  async findVocabulariesInPersonalNotebook(notebookId, filters) {
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

    // Câu lệnh SELECT lấy thêm cột `status` từ bảng `NotebookVocabItems`
    const selectQuery = `
      SELECT v.id, v.hanzi, v.pinyin, v.meaning, v.level, v.image_url, 
             nvi.status as status_in_notebook, -- << ĐIỂM QUAN TRỌNG
             nvi.added_at
      FROM "NotebookVocabItems" nvi
      JOIN "Vocabulary" v ON nvi.vocab_id = v.id
      ${whereClauses}
      ORDER BY nvi.added_at DESC
    `;

    queryParams.push(limit, offset);
    const finalSelectQuery = `${selectQuery} LIMIT $${
      queryParams.length - 1
    } OFFSET $${queryParams.length}`;
    const vocabResult = await db.query(finalSelectQuery, queryParams);

    return { vocabularies: vocabResult.rows, totalItems };
  },

  async findVocabulariesInSystemNotebook(notebookId, filters) {
    // Logic gần như tương tự, nhưng không có cột `status`
    const { limit, offset, search } = filters;
    const queryParams = [notebookId];
    // Điều kiện lọc `status` (đã thuộc, chưa thuộc) không có ý nghĩa ở đây nên ta bỏ qua.
    let whereClauses = `WHERE nvi.notebook_id = $1`;

    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses += ` AND (v.hanzi ILIKE $${queryParams.length} OR v.pinyin ILIKE $${queryParams.length} OR v.meaning ILIKE $${queryParams.length})`;
    }

    const countQuery = `SELECT COUNT(*) FROM "NotebookVocabItems" nvi JOIN "Vocabulary" v ON nvi.vocab_id = v.id ${whereClauses}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    // Câu lệnh SELECT chỉ lấy thông tin gốc của từ vựng
    const selectQuery = `
      SELECT v.id, v.hanzi, v.pinyin, v.meaning, v.level, v.image_url,
             nvi.added_at -- Vẫn có thể giữ lại added_at để biết khi nào nó được thêm vào sổ hệ thống
      FROM "NotebookVocabItems" nvi
      JOIN "Vocabulary" v ON nvi.vocab_id = v.id
      ${whereClauses}
      ORDER BY nvi.added_at DESC
    `;

    queryParams.push(limit, offset);
    const finalSelectQuery = `${selectQuery} LIMIT $${
      queryParams.length - 1
    } OFFSET $${queryParams.length}`;
    const vocabResult = await db.query(finalSelectQuery, queryParams);

    return { vocabularies: vocabResult.rows, totalItems };
  },

  async findById(notebookId) {
    // Câu lệnh SQL để chọn tất cả các cột (*) từ bảng "Notebooks"
    // nơi mà cột "id" khớp với giá trị được cung cấp.
    const queryText = `SELECT * FROM "Notebooks" WHERE id = $1;`;

    // Thực thi câu truy vấn, truyền notebookId vào mảng tham số.
    // Việc này đảm bảo an toàn, chống lại SQL Injection.
    const result = await db.query(queryText, [notebookId]);

    // kết quả trả về từ db.query là một object có thuộc tính 'rows', là một mảng các bản ghi.
    // Vì chúng ta tìm theo khóa chính, mảng này sẽ có tối đa 1 phần tử.
    // Chúng ta trả về phần tử đầu tiên của mảng. Nếu không tìm thấy bản ghi nào,
    // mảng 'rows' sẽ rỗng, và result.rows[0] sẽ là `undefined`.
    return result.rows[0];
  },

  addVocabularies: async (notebookId, vocabIds, status) => {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      // --- Thao tác 1: Thêm các liên kết vào bảng NotebookVocabItems ---
      // Xây dựng câu lệnh INSERT với nhiều giá trị
      // ON CONFLICT DO NOTHING: Nếu một cặp (notebook_id, vocab_id) đã tồn tại,
      // câu lệnh sẽ bỏ qua nó một cách nhẹ nhàng mà không báo lỗi. Điều này rất hữu ích.
      // 'chưa thuộc' là giá trị mặc định cho status khi thêm từ mới.
      const insertQuery = `
        INSERT INTO "NotebookVocabItems" (notebook_id, vocab_id, status)
        SELECT $1, unnest($2::uuid[]), '${status}'
        ON CONFLICT (notebook_id, vocab_id) DO NOTHING
        RETURNING vocab_id;
      `;

      // unnest($2::uuid[]) là một cách hiệu quả trong PostgreSQL để biến một mảng thành các hàng.
      const insertResult = await client.query(insertQuery, [
        notebookId,
        vocabIds,
      ]);
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
        throw new Error("Notebook không tồn tại.");
      }

      const newTotalVocabCount = updateResult.rows[0].vocab_count;

      await client.query("COMMIT");

      return { addedCount, newTotalVocabCount };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(
        "Lỗi trong transaction khi thêm từ vựng vào notebook:",
        error
      );
      throw error;
    } finally {
      client.release();
    }
  },

  async findByIdAndUserId(notebookId, userId) {
    const query = `SELECT * FROM "Notebooks" WHERE id = $1 AND user_id = $2;`;
    const result = await db.query(query, [notebookId, userId]);
    return result.rows[0];
  },

  removeVocabularies: async (notebookId, vocabIds) => {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      // --- Thao tác 1: Xóa các liên kết trong bảng NotebookVocabItems ---
      // RETURNING *: Lấy lại các bản ghi đã xóa để biết chính xác đã xóa bao nhiêu.
      const deleteQuery = `
        DELETE FROM "NotebookVocabItems"
        WHERE notebook_id = $1 AND vocab_id = ANY($2::uuid[])
        RETURNING *;
      `;
      const deleteResult = await client.query(deleteQuery, [
        notebookId,
        vocabIds,
      ]);
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
        await client.query("ROLLBACK");
        client.release();
        throw new Error("Notebook không tồn tại.");
      }

      const newTotalVocabCount = updateResult.rows[0].vocab_count;

      await client.query("COMMIT");

      return { removedCount, newTotalVocabCount };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(
        "Lỗi trong transaction khi xóa từ vựng khỏi notebook:",
        error
      );
      throw error;
    } finally {
      client.release();
    }
  },

  async addVocabulariesByLevel(notebookId, level) {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      // --- Thao tác 1: Thêm hàng loạt từ vựng ---
      // Sử dụng một subquery để tìm tất cả vocab_id thuộc level được chỉ định,
      // sau đó INSERT chúng vào NotebookVocabItems.
      // ON CONFLICT DO NOTHING sẽ tự động bỏ qua các từ đã tồn tại trong sổ tay.
      const insertQuery = `
        WITH vocabs_to_add AS (
          SELECT id FROM "Vocabulary" WHERE $1 = ANY(level)
        )
        INSERT INTO "NotebookVocabItems" (notebook_id, vocab_id, status)
        SELECT $2, id, 'chưa thuộc'
        FROM vocabs_to_add
        ON CONFLICT (notebook_id, vocab_id) DO NOTHING
        RETURNING vocab_id;
      `;
      const insertResult = await client.query(insertQuery, [level, notebookId]);
      const addedCount = insertResult.rowCount;

      // --- Thao tác 2: Cập nhật lại vocab_count ---
      // Đếm lại toàn bộ để đảm bảo chính xác
      const updateCountQuery = `
        UPDATE "Notebooks"
        SET vocab_count = (
          SELECT COUNT(*) FROM "NotebookVocabItems" WHERE notebook_id = $1
        )
        WHERE id = $1
        RETURNING vocab_count;
      `;
      const updateResult = await client.query(updateCountQuery, [notebookId]);

      if (updateResult.rowCount === 0) {
        throw new Error("Notebook không tồn tại.");
      }

      const newTotalVocabCount = updateResult.rows[0].vocab_count;

      await client.query("COMMIT");

      return { addedCount, newTotalVocabCount };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(
        "Lỗi trong transaction khi thêm từ vựng theo level:",
        error
      );
      throw error;
    } finally {
      client.release();
    }
  },

  updateByUser: async (notebookId, userId, updateData) => {
    const fieldsToUpdate = Object.keys(updateData);
    if (fieldsToUpdate.length === 0) return null;

    const setClause = fieldsToUpdate
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(", ");
    const values = Object.values(updateData);

    const queryText = `
      UPDATE "Notebooks"
      SET ${setClause}
      WHERE id = $${fieldsToUpdate.length + 1} AND user_id = $${
      fieldsToUpdate.length + 2
    }
      RETURNING *;
    `;
    const result = await db.query(queryText, [...values, notebookId, userId]);
    return result.rows[0];
  },

  updateVocabStatus: async (notebookId, vocabId, status) => {
    const queryText = `
      UPDATE "NotebookVocabItems"
      SET status = $1
      WHERE notebook_id = $2 AND vocab_id = $3
      RETURNING *;
    `;
    const result = await db.query(queryText, [status, notebookId, vocabId]);
    return result.rows[0];
  },

  findVocabsByNotebookId: async (notebookId) => {
    const queryText = `
      SELECT 
        v.id,
        v.hanzi,
        v.pinyin,
        v.meaning,
        v.notes,
        v.level,
        v.image_url,
        nvi.status, -- Lấy trạng thái của từ trong sổ tay này (đã thuộc, chưa thuộc...)
        nvi.added_at, -- Lấy ngày thêm từ vào sổ tay
        COALESCE(
          (SELECT array_agg(vwt.word_type) FROM "VocabularyWordType" vwt WHERE vwt.vocab_id = v.id),
          '{}'
        ) as word_types
      FROM "NotebookVocabItems" nvi
      JOIN "Vocabulary" v ON nvi.vocab_id = v.id
      WHERE nvi.notebook_id = $1
      ORDER BY nvi.added_at DESC; -- Sắp xếp theo ngày thêm gần nhất
    `;
    const result = await db.query(queryText, [notebookId]);
    return result.rows;
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

  findAllByOwner: async (userId, { limit, offset }) => {
    // Điều kiện: user_id phải khớp
    const where = `WHERE user_id = $1`;

    const countQuery = `SELECT COUNT(*) FROM "Notebooks" ${where};`;
    const totalResult = await db.query(countQuery, [userId]);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    const selectQuery = `
      SELECT * 
      FROM "Notebooks"
      ${where}
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const notebooksResult = await db.query(selectQuery, [
      userId,
      limit,
      offset,
    ]);
    return { notebooks: notebooksResult.rows, totalItems };
  },

  // --- HÀM MỚI 2: Lấy sổ tay của hệ thống ---
  findAllSystemPublic: async ({ limit, offset }) => {
    // Điều kiện: user_id phải là NULL VÀ status phải là 'published'
    const where = `WHERE user_id IS NULL AND status = 'published'`;

    const countQuery = `SELECT COUNT(*) FROM "Notebooks" ${where};`;
    const totalResult = await db.query(countQuery);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    const selectQuery = `
      SELECT * 
      FROM "Notebooks"
      ${where}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `;
    const notebooksResult = await db.query(selectQuery, [limit, offset]);
    return { notebooks: notebooksResult.rows, totalItems };
  },

  findAllPaginated: async (filters) => {
    const { userId, limit, offset, search, status, premium } = filters;

    const queryParams = [];

    // Xây dựng các phần của câu truy vấn
    let baseQuery = `FROM "Notebooks" WHERE 1=1`;
    let whereClauses = "";

    // Lọc theo userId (sổ tay cá nhân và sổ tay hệ thống)
    if (userId) {
      queryParams.push(userId);
      whereClauses += ` AND (user_id = $${queryParams.length} OR user_id IS NULL)`;
    }

    // Lọc theo status
    if (status && status !== "all") {
      queryParams.push(status);
      whereClauses += ` AND status = $${queryParams.length}`;
    }

    // Lọc theo is_premium
    if (premium && premium !== "all") {
      // Chuyển đổi string 'true'/'false' thành boolean
      const isPremiumValue = premium === "true";
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
      const current = await db.query(
        'SELECT * FROM "Notebooks" WHERE id = $1',
        [id]
      );
      return current.rows[0];
    }

    // Xây dựng chuỗi SET: "name" = $1, "status" = $2,...
    const setClause = fieldsToUpdate
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(", ");

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

  // findById: async (id) => {
  //   const queryText = `SELECT * FROM "Notebooks" WHERE id = $1;`;
  //   const result = await db.query(queryText, [id]);

  //   // result.rows[0] sẽ là object notebook hoặc undefined nếu không có kết quả
  //   return result.rows[0];
  // },

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
    selectQuery += ` LIMIT $${queryParams.length - 1} OFFSET $${
      queryParams.length
    }`;

    const vocabResult = await db.query(selectQuery, queryParams);
    return { vocabularies: vocabResult.rows, totalItems };
  },

  findAll1: async () => {
    const queryText = `SELECT * FROM "Notebooks" ORDER BY created_at DESC;`;
    const result = await db.query(queryText);
    return result.rows;
  },

  // findAll: async ({ userId, type, limit, offset }) => {
  //   let whereClauses = [];
  //   let queryParams = [];
  //   let paramIndex = 1;

  //   // Điều kiện cơ bản: Lấy sổ tay của user HOẶC sổ tay hệ thống
  //   whereClauses.push(`(user_id = $${paramIndex} OR user_id IS NULL)`);
  //   queryParams.push(userId);
  //   paramIndex++;

  //   // Thêm điều kiện lọc theo `type`
  //   if (type === "personal") {
  //     // Chỉ lấy sổ tay của user này
  //     whereClauses = [`user_id = $1`]; // Ghi đè điều kiện cơ bản
  //   } else if (type === "system") {
  //     // Chỉ lấy sổ tay hệ thống (không premium)
  //     whereClauses.push(`user_id IS NULL`);
  //     whereClauses.push(`is_premium = false`);
  //   } else if (type === "premium") {
  //     // Chỉ lấy sổ tay premium (cũng là sổ tay hệ thống)
  //     whereClauses.push(`user_id IS NULL`);
  //     whereClauses.push(`is_premium = true`);
  //   }

  //   const whereString = `WHERE ${whereClauses.join(" AND ")}`;

  //   // Câu truy vấn lấy dữ liệu (có phân trang)
  //   const dataQueryText = `
  //     SELECT id, user_id, name, vocab_count, options, is_premium, created_at
  //     FROM "Notebooks"
  //     ${whereString}
  //     ORDER BY user_id DESC NULLS LAST, created_at DESC
  //     LIMIT $${paramIndex++}
  //     OFFSET $${paramIndex++};
  //   `;

  //   // Câu truy vấn đếm tổng số kết quả
  //   const countQueryText = `
  //     SELECT COUNT(*) as total
  //     FROM "Notebooks"
  //     ${whereString};
  //   `;

  //   // Lấy params cho câu lệnh COUNT (không bao gồm LIMIT và OFFSET)
  //   const countParams = queryParams.slice();

  //   // Thực thi song song
  //   const [dataResult, countResult] = await Promise.all([
  //     db.query(dataQueryText, [...queryParams, limit, offset]),
  //     db.query(countQueryText, countParams),
  //   ]);

  //   const totalItems = parseInt(countResult.rows[0].total, 10);
  //   const totalPages = Math.ceil(totalItems / limit);
  //   const currentPage = Math.floor(offset / limit) + 1;

  //   return {
  //     notebooks: dataResult.rows,
  //     pagination: { totalItems, totalPages, currentPage, itemsPerPage: limit },
  //   };
  // },

  findAllSystem: async (sortBy = "created_at") => {
    // Whitelist các cột được phép sắp xếp để tránh SQL Injection
    const allowedColumns = {
      name: "name",
      created_at: "created_at",
      vocab_count: "vocab_count",
    };
    const sortColumn = allowedColumns[sortBy] || "created_at"; // Mặc định là 'created_at' nếu sortBy không hợp lệ

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

  findVocabulariesByNotebookId: async ({
    notebookId,
    filters,
    limit,
    offset,
  }) => {
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
      hanzi_asc: "v.hanzi ASC",
      hanzi_desc: "v.hanzi DESC",
      pinyin_asc: "v.pinyin ASC",
      pinyin_desc: "v.pinyin DESC",
      added_at_asc: "nvi.added_at ASC",
      added_at_desc: "nvi.added_at DESC",
    };
    const orderBy = sortOptions[sortBy] || "nvi.added_at DESC"; // Mặc định

    const whereString = `WHERE ${whereClauses.join(" AND ")}`;

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
      db.query(countQueryText, queryParams),
    ]);

    const totalItems = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalItems / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      vocabularies: dataResult.rows,
      pagination: { totalItems, totalPages, currentPage, itemsPerPage: limit },
    };
  },
  removeVocabulary: async (notebookId, vocabId) => {
    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");

      // Bước 1: Xóa bản ghi khỏi "NotebookVocabItems"
      const deleteQuery = `
        DELETE FROM "NotebookVocabItems"
        WHERE notebook_id = $1 AND vocab_id = $2
        RETURNING vocab_id;
      `;
      const deleteResult = await client.query(deleteQuery, [
        notebookId,
        vocabId,
      ]);

      // Nếu không có dòng nào bị xóa, nghĩa là từ vựng không tồn tại trong sổ tay
      if (deleteResult.rowCount === 0) {
        // Không cần rollback vì chưa có thay đổi gì, nhưng trả về null để báo hiệu
        await client.query("ROLLBACK"); // Hoặc COMMIT cũng được vì không có thay đổi
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

      await client.query("COMMIT");

      return {
        newVocabCount: updateResult.rows[0].vocab_count,
      };
    } catch (error) {
      await client.query("ROLLBACK");
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
    const result = await db.query(
      `SELECT id, user_id FROM "Notebooks" WHERE id = $1`,
      [notebookId]
    );
    return result.rows[0];
  },
  updateById: async (notebookId, updateData) => {
    const keys = Object.keys(updateData);
    const values = Object.values(updateData);

    // Xây dựng phần SET của câu lệnh SQL một cách động
    const setClause = keys
      .map((key, index) => `"${key}" = $${index + 1}`)
      .join(", ");

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
