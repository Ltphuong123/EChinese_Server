// models/vocabularyModel.js

const db = require('../config/db');
const uuid = require('uuid'); 

const vocabularyModel = {
  createWithWordTypes: async (vocabData) => {
    const { hanzi, pinyin, meaning, notes, level, image_url, word_types = [] } = vocabData;
    
    // Lấy một client từ connection pool để quản lý transaction
    const client = await db.pool.connect();

    try {
      // Bắt đầu transaction
      await client.query('BEGIN');

      // --- Thao tác 1: Thêm vào bảng Vocabulary ---
      // RETURNING id là rất quan trọng để có id cho thao tác tiếp theo
      const vocabQuery = `
        INSERT INTO "Vocabulary" (hanzi, pinyin, meaning, notes, level, image_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id;
      `;
      const vocabResult = await client.query(vocabQuery, [hanzi, pinyin, meaning, notes, level, image_url]);
      const newVocabId = vocabResult.rows[0].id;
      
      // --- Thao tác 2: Xử lý các loại từ (Word Types) ---
      if (word_types && word_types.length > 0) {
        // Đảm bảo tất cả các loại từ đều tồn tại trong bảng WordType để không vi phạm foreign key
        // ON CONFLICT DO NOTHING sẽ bỏ qua việc insert nếu loại từ đã tồn tại
        const upsertWordTypesQuery = `
          INSERT INTO "WordType" (code)
          VALUES ${word_types.map((_, i) => `($${i + 1})`).join(', ')}
          ON CONFLICT (code) DO NOTHING;
        `;
        await client.query(upsertWordTypesQuery, word_types);
        
        // Tạo các bản ghi trong bảng liên kết VocabularyWordType
        const linkWordTypesQuery = `
          INSERT INTO "VocabularyWordType" (vocab_id, word_type)
          VALUES ${word_types.map((_, i) => `($1, $${i + 2})`).join(', ')};
        `;
        await client.query(linkWordTypesQuery, [newVocabId, ...word_types]);
      }

      // Nếu tất cả thành công, commit transaction
      await client.query('COMMIT');

      // Trả về dữ liệu đã được tạo đầy đủ
      return { id: newVocabId, ...vocabData };

    } catch (error) {
      // Nếu có bất kỳ lỗi nào, rollback tất cả các thay đổi
      await client.query('ROLLBACK');
      console.error('Lỗi trong transaction khi tạo từ vựng:', error);
      // Ném lỗi ra ngoài để service có thể bắt được
      throw error;
    } finally {
      // Luôn luôn giải phóng client trở lại pool
      client.release();
    }
  },
  
  updateWithWordTypes: async (vocabId, vocabData) => {
    const { hanzi, pinyin, meaning, notes, level, image_url, word_types = [] } = vocabData;
    
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // --- Thao tác 1: Cập nhật bảng Vocabulary chính ---
      const updateVocabQuery = `
        UPDATE "Vocabulary"
        SET hanzi = $1, pinyin = $2, meaning = $3, notes = $4, level = $5, image_url = $6
        WHERE id = $7;
      `;
      const updateResult = await client.query(updateVocabQuery, [hanzi, pinyin, meaning, notes, level, image_url, vocabId]);

      // Nếu không có hàng nào được cập nhật, nghĩa là vocabId không tồn tại
      if (updateResult.rowCount === 0) {
        throw new Error(`Từ vựng với ID ${vocabId} không tồn tại.`);
      }

      // --- Thao tác 2: Đồng bộ hóa Word Types ---
      // 2.1. Xóa tất cả các liên kết word_type cũ của từ vựng này
      await client.query('DELETE FROM "VocabularyWordType" WHERE vocab_id = $1', [vocabId]);

      // 2.2. Thêm lại các liên kết mới (logic tương tự hàm create)
      if (word_types && word_types.length > 0) {
        // Đảm bảo các loại từ tồn tại trong bảng WordType
        const upsertWordTypesQuery = `
          INSERT INTO "WordType" (code)
          VALUES ${word_types.map((_, i) => `($${i + 1})`).join(', ')}
          ON CONFLICT (code) DO NOTHING;
        `;
        await client.query(upsertWordTypesQuery, word_types);
        
        // Thêm các bản ghi liên kết mới
        const linkWordTypesQuery = `
          INSERT INTO "VocabularyWordType" (vocab_id, word_type)
          VALUES ${word_types.map((_, i) => `($1, $${i + 2})`).join(', ')};
        `;
        await client.query(linkWordTypesQuery, [vocabId, ...word_types]);
      }
      
      await client.query('COMMIT');

      // Trả về dữ liệu đã được cập nhật
      return { id: vocabId, ...vocabData };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Lỗi trong transaction khi cập nhật từ vựng ${vocabId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  },

  findAllPaginated: async (filters) => {
    const { limit, offset, search, level, notebookId } = filters;
    
    const queryParams = [];
    let whereClauses = 'WHERE 1=1';

    // Lọc theo từ khóa tìm kiếm (hanzi, pinyin, meaning)
    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses += ` AND (v.hanzi ILIKE $${queryParams.length} OR v.pinyin ILIKE $${queryParams.length} OR v.meaning ILIKE $${queryParams.length})`;
    }

    // Lọc theo level (cột `level` là một mảng)
    if (level) {
      queryParams.push(level);
      whereClauses += ` AND $${queryParams.length} = ANY(v.level)`;
    }

    // Lọc theo notebookId
    if (notebookId) {
      queryParams.push(notebookId);
      whereClauses += ` AND EXISTS (
        SELECT 1 FROM "NotebookVocabItems" nvi
        WHERE nvi.vocab_id = v.id AND nvi.notebook_id = $${queryParams.length}
      )`;
    }
    
    // --- Truy vấn 1: Đếm tổng số bản ghi ---
    const countQuery = `SELECT COUNT(v.id) FROM "Vocabulary" v ${whereClauses}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);
    
    // --- Truy vấn 2: Lấy dữ liệu với phân trang và word_types ---
    let selectQuery = `
      SELECT 
        v.*, 
        COALESCE(
          (SELECT array_agg(vwt.word_type) FROM "VocabularyWordType" vwt WHERE vwt.vocab_id = v.id),
          '{}'
        ) as word_types
      FROM "Vocabulary" v
      ${whereClauses}
      GROUP BY v.id
      ORDER BY v.hanzi ASC -- SỬA LỖI Ở ĐÂY: Sắp xếp theo hanzi thay vì created_at
    `;

    // Thêm LIMIT và OFFSET
    queryParams.push(limit);
    selectQuery += ` LIMIT $${queryParams.length}`;
    
    queryParams.push(offset);
    selectQuery += ` OFFSET $${queryParams.length}`;
    
    const vocabResult = await db.query(selectQuery, queryParams);

    return {
      vocabularies: vocabResult.rows,
      totalItems: totalItems,
    };
  },

  bulkDeleteWithRelations: async (vocabIds) => {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // --- Bước 1: Cập nhật `vocab_count` cho các notebook bị ảnh hưởng ---
      // Logic này rất quan trọng để giữ dữ liệu nhất quán.
      const updateCountQuery = `
        WITH affected_notebooks AS (
          SELECT DISTINCT notebook_id FROM "NotebookVocabItems" WHERE vocab_id = ANY($1::uuid[])
        )
        UPDATE "Notebooks" n
        SET vocab_count = (
          SELECT COUNT(*) FROM "NotebookVocabItems" nvi 
          WHERE nvi.notebook_id = n.id AND NOT (nvi.vocab_id = ANY($1::uuid[]))
        )
        WHERE n.id IN (SELECT notebook_id FROM affected_notebooks);
      `;
      await client.query(updateCountQuery, [vocabIds]);

      // --- Bước 2: Xóa các bản ghi liên quan để gỡ ràng buộc RESTRICT ---
      // 2.1. Xóa khỏi bảng NotebookVocabItems
      await client.query(`DELETE FROM "NotebookVocabItems" WHERE vocab_id = ANY($1::uuid[])`, [vocabIds]);
      
      // 2.2. Xóa khỏi bảng VocabularyWordType
      await client.query(`DELETE FROM "VocabularyWordType" WHERE vocab_id = ANY($1::uuid[])`, [vocabIds]);

      // --- Bước 3: Bây giờ mới xóa các từ vựng chính một cách an toàn ---
      const deleteVocabQuery = `DELETE FROM "Vocabulary" WHERE id = ANY($1::uuid[]);`;
      const deleteResult = await client.query(deleteVocabQuery, [vocabIds]);

      await client.query('COMMIT');
      
      // Trả về số lượng từ vựng đã bị xóa
      return deleteResult.rowCount;

    } catch (error) {
      // Nếu có bất kỳ lỗi nào, hoàn tác tất cả
      await client.query('ROLLBACK');
      console.error('Lỗi trong transaction khi xóa từ vựng:', error);
      throw error; // Ném lỗi ra để controller bắt được
    } finally {
      // Luôn trả client về pool
      client.release();
    }
  },

  findById: async (id) => {
    // Thêm bước kiểm tra định dạng vào đây nữa để bảo vệ cả hàm này
    // if (!UUID_REGEX.test(id)) {
    //   return null; // Trả về null vì id không hợp lệ, chắc chắn không tìm thấy
    // }

    const queryText = `
      SELECT 
        v.*, 
        COALESCE(
          (SELECT array_agg(vwt.word_type) FROM "VocabularyWordType" vwt WHERE vwt.vocab_id = v.id),
          '{}'
        ) as word_types
      FROM "Vocabulary" v
      WHERE v.id = $1
      GROUP BY v.id;
    `;
    const result = await db.query(queryText, [id]);
    return  result.rows[0];
  },

  // exists: async (id) => {
  //   // --- THAY ĐỔI Ở ĐÂY ---
  //   // Sử dụng dynamic import() để tải ESM module
  //   const uuid = await import('uuid');

  //   // Bước 1: Kiểm tra UUID
  //   // Cách gọi hàm cũng khác một chút ở v9
  //   if (!uuid.validate(id) || uuid.version(id) !== 4) {
  //     return false;
  //   }

  //   // Bước 2: Truy vấn database
  //   const queryText = `SELECT 1 FROM "Vocabulary" WHERE id = $1 LIMIT 1;`;
  //   const result = await db.query(queryText, [id]);
  //   return result.rowCount > 0;
  // },







  create: async (vocabData) => {
    const { hanzi, pinyin, meaning, level, notes, image_url, wordTypes } = vocabData;
    
    const client = await db.pool.connect();

    
    try {
      // Bắt đầu khối transaction
      await client.query('BEGIN');

      // Bước 1: Thêm vào bảng "Vocabulary" và lấy ra bản ghi vừa thêm
      const vocabQueryText = `
        INSERT INTO "Vocabulary" (hanzi, pinyin, meaning, level, notes, image_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const vocabValues = [hanzi, pinyin, meaning, level, notes, image_url];
      const vocabResult = await client.query(vocabQueryText, vocabValues);
      const newVocabulary = vocabResult.rows[0];

      // Bước 2: Nếu có wordTypes được cung cấp, thêm tất cả liên kết trong MỘT câu lệnh
      if (wordTypes && wordTypes.length > 0) {
        // Sử dụng `unnest` của PostgreSQL để xử lý một mảng đầu vào và insert nhiều dòng.
        // Cách này hiệu quả hơn nhiều so với việc lặp và gọi query nhiều lần.
        const wordTypeQueryText = `
          INSERT INTO "VocabularyWordType" (vocab_id, word_type)
          SELECT $1, unnest($2::varchar[]);
        `;
        // Tất cả các query trong transaction phải được thực hiện trên cùng một 'client'
        await client.query(wordTypeQueryText, [newVocabulary.id, wordTypes]);
      }
      
      // Nếu tất cả các lệnh trên thành công, commit transaction để lưu thay đổi
      await client.query('COMMIT');
      
      // Trả về từ vựng mới cùng với loại từ của nó để xác nhận
      return {
        ...newVocabulary,
        word_types: wordTypes || [] // Đảm bảo luôn trả về một mảng
      };

    } catch (error) {
      // Nếu có bất kỳ lỗi nào xảy ra trong khối try, rollback transaction
      // để hủy bỏ tất cả các thay đổi đã thực hiện
      await client.query('ROLLBACK');
      throw error; // Ném lỗi ra để các lớp cao hơn (service, controller) có thể xử lý
    } finally {
      // Dù thành công hay thất bại, luôn phải giải phóng client về lại pool kết nối
      client.release();
    }
  },
  search: async ({ query, level, limit, offset }) => {
    let whereClauses = [];
    let queryParams = [];
    let paramIndex = 1;

    // 1. Xây dựng mệnh đề WHERE cho từ khóa tìm kiếm
    if (query) {
      // Tìm kiếm trên các cột hanzi, pinyin, và meaning
      whereClauses.push(`(hanzi ILIKE $${paramIndex} OR pinyin ILIKE $${paramIndex} OR meaning ILIKE $${paramIndex})`);
      queryParams.push(`%${query}%`);
      paramIndex++;
    }

    // 2. Xây dựng mệnh đề WHERE cho level (HSK)
    if (level) {
      // Kiểm tra xem `level` có phải là một trong các giá trị trong mảng `level` của từ vựng không
      whereClauses.push(`$${paramIndex} = ANY(level)`);
      queryParams.push(level);
      paramIndex++;
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    // Câu truy vấn lấy dữ liệu (có phân trang)
    const dataQueryText = `
      SELECT id, hanzi, pinyin, meaning, level
      FROM "Vocabulary"
      ${whereString}
      ORDER BY hanzi
      LIMIT $${paramIndex++}
      OFFSET $${paramIndex++};
    `;

    // Câu truy vấn đếm tổng số kết quả
    const countQueryText = `
      SELECT COUNT(*) as total
      FROM "Vocabulary"
      ${whereString};
    `;

    // Thực thi song song
    const [dataResult, countResult] = await Promise.all([
      db.query(dataQueryText, [...queryParams, limit, offset]),
      db.query(countQueryText, queryParams.slice(0, paramIndex - 3)) // Chỉ lấy params của WHERE
    ]);

    const totalItems = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalItems / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      vocabularies: dataResult.rows,
      pagination: { totalItems, totalPages, currentPage, itemsPerPage: limit }
    };
  },

  findAllForAdmin: async ({ search, level, limit, offset }) => {
    let whereClauses = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filter theo từ khóa (search)
    if (search) {
      // Tìm kiếm trên các cột hanzi, pinyin, và meaning
      whereClauses.push(`(hanzi ILIKE $${paramIndex} OR pinyin ILIKE $${paramIndex} OR meaning ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Filter theo level (HSK)
    if (level) {
      // Sử dụng toán tử `@>` (contains) của PostgreSQL để kiểm tra xem mảng `level` trong DB
      // có chứa level được cung cấp hay không.
      whereClauses.push(`level @> ARRAY[$${paramIndex}]::text[]`);
      queryParams.push(level);
      paramIndex++;
    }
    
    // Nối các điều kiện WHERE lại với nhau
    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    // Câu truy vấn lấy dữ liệu (có phân trang)
    // Lấy thêm các loại từ liên quan
    const dataQueryText = `
      SELECT 
        v.id,
        v.hanzi,
        v.pinyin,
        v.meaning,
        v.level,
        array_agg(vwt.word_type) FILTER (WHERE vwt.word_type IS NOT NULL) AS word_types
      FROM "Vocabulary" v
      LEFT JOIN "VocabularyWordType" vwt ON v.id = vwt.vocab_id
      ${whereString}
      GROUP BY v.id
      ORDER BY v.hanzi ASC
      LIMIT $${paramIndex++}
      OFFSET $${paramIndex++};
    `;

    // Câu truy vấn đếm tổng số kết quả khớp với điều kiện lọc
    const countQueryText = `
      SELECT COUNT(*) as total
      FROM "Vocabulary"
      ${whereString};
    `;
    
    // Lấy params cho câu lệnh COUNT (không bao gồm LIMIT và OFFSET)
    const countParams = queryParams.slice();

    // Thực thi song song để tối ưu
    const [dataResult, countResult] = await Promise.all([
      db.query(dataQueryText, [...queryParams, limit, offset]),
      db.query(countQueryText, countParams)
    ]);

    const totalItems = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalItems / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      vocabularies: dataResult.rows,
      pagination: { totalItems, totalPages, currentPage, itemsPerPage: limit }
    };
  },
  deleteById: async (vocabId) => {
    const queryText = `
      DELETE FROM "Vocabulary"
      WHERE id = $1
      RETURNING id; -- Chỉ cần trả về id để xác nhận đã xóa
    `;
    const result = await db.query(queryText, [vocabId]);

    // Nếu result.rowCount > 0, có nghĩa là đã xóa thành công.
    // result.rows[0] sẽ là { id: '...' }
    return result.rows[0];
  },
  updateById: async (vocabId, updateData) => {
    const { wordTypes, ...vocabDetails } = updateData;

    // Bắt đầu một transaction
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      const vocabKeys = Object.keys(vocabDetails);
      let updatedVocabulary = null;

      if (vocabKeys.length > 0) {
        const setClause = vocabKeys.map((key, index) => `"${key}" = $${index + 1}`).join(', ');
        const vocabQueryText = `
          UPDATE "Vocabulary"
          SET ${setClause}
          WHERE id = $${vocabKeys.length + 1}
          RETURNING *;
        `;
        const vocabValues = [...Object.values(vocabDetails), vocabId];
        const result = await client.query(vocabQueryText, vocabValues);
        
        // Nếu không tìm thấy từ vựng, ném lỗi để rollback
        if (result.rowCount === 0) {
            throw new Error('NOT_FOUND');
        }
        updatedVocabulary = result.rows[0];
      }

      // Bước 2: Cập nhật các loại từ (nếu có)
      // `wordTypes` có thể là mảng (kể cả mảng rỗng) hoặc undefined
      if (wordTypes !== undefined) {
        // 2a: Xóa tất cả các loại từ cũ của từ vựng này
        await client.query(`DELETE FROM "VocabularyWordType" WHERE vocab_id = $1`, [vocabId]);

        // 2b: Thêm lại các loại từ mới (nếu mảng không rỗng)
        if (wordTypes.length > 0) {
          const wordTypeQueryText = `
            INSERT INTO "VocabularyWordType" (vocab_id, word_type)
            SELECT $1, unnest($2::varchar[]);
          `;
          await client.query(wordTypeQueryText, [vocabId, wordTypes]);
        }
      }

      // Nếu tất cả thành công, commit transaction
      await client.query('COMMIT');

      // Lấy lại dữ liệu cuối cùng để trả về (để đảm bảo có cả word_types)
      const finalResult = await this.findById(vocabId);
      return finalResult;

    } catch (error) {
      // Nếu có lỗi, rollback
      await client.query('ROLLBACK');
      
      // Xử lý lỗi đặc biệt 'NOT_FOUND'
      if (error.message === 'NOT_FOUND') {
          return null; // Trả về null để service/controller biết là 404
      }
      
      throw error; // Ném các lỗi khác (unique, foreign key,...)
    } finally {
      // Luôn giải phóng client
      client.release();
    }
  },



 














  
  

  













  //   /**
  //  * Tìm một từ vựng dựa trên hanzi (UNIQUE field), trả về word_types.
  //  */
  // findByHanzi: async (hanzi) => {
  //   const queryText = `
  //       SELECT v.*, array_remove(array_agg(vwt.word_type), NULL) as "word_types"
  //       FROM "Vocabulary" v
  //       LEFT JOIN "VocabularyWordType" vwt ON v.id = vwt.vocab_id
  //       WHERE v.hanzi = $1
  //       GROUP BY v.id;
  //   `;
  //   const result = await db.query(queryText, [hanzi]);
  //   return result.rows[0];
  // },

  // /**
  //  * Cập nhật và hợp nhất (MERGE) một từ vựng.
  //  */
  // upsertAndMerge: async (vocabData) => {
  //   // Sử dụng snake_case và gán giá trị mặc định là mảng rỗng nếu không có
  //   const { id, pinyin, meaning, notes, level, image_url, word_types: new_word_types = [] } = vocabData;
  //   const client = await db.pool.connect();
    
  //   try {
  //     await client.query('BEGIN');

  //     const vocabQuery = `
  //       UPDATE "Vocabulary" 
  //       SET pinyin = $1, meaning = $2, notes = $3, level = $4, image_url = $5
  //       WHERE id = $6 RETURNING *;
  //     `;
  //     const vocabResult = await client.query(vocabQuery, [pinyin, meaning, notes, level, image_url, id]);
  //     const updatedVocab = vocabResult.rows[0];
      
  //     const existingTypesQuery = `SELECT word_type FROM "VocabularyWordType" WHERE vocab_id = $1;`;
  //     const existingTypesResult = await client.query(existingTypesQuery, [id]);
  //     const existingTypes = existingTypesResult.rows.map(r => r.word_type);

  //     const typesToAdd = new_word_types.filter(type => !existingTypes.includes(type));

  //     if (typesToAdd.length > 0) {
  //       const typeValues = typesToAdd.map(typeCode => `('${id}', '${typeCode}')`).join(',');
  //       await client.query(`INSERT INTO "VocabularyWordType" (vocab_id, word_type) VALUES ${typeValues};`);
  //     }
      
  //     await client.query('COMMIT');

  //     return { ...updatedVocab, word_types: [...existingTypes, ...typesToAdd] };
  //   } catch (e) {
  //     await client.query('ROLLBACK');
  //     throw e;
  //   } finally {
  //     client.release();
  //   }
  // },

  // /**
  //  * Tạo một từ vựng mới và các liên kết word type của nó.
  //  */
  // createWithWordTypes: async (vocabData) => {
  //   const { hanzi, pinyin, meaning, notes, level, image_url, word_types } = vocabData;
  //   const client = await db.pool.connect();
  //   try {
  //     await client.query('BEGIN');
      
  //     const vocabQuery = `
  //       INSERT INTO "Vocabulary" (hanzi, pinyin, meaning, notes, level, image_url)
  //       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
  //     `;
  //     const vocabResult = await client.query(vocabQuery, [hanzi, pinyin, meaning, notes, level, image_url]);
  //     const newVocab = vocabResult.rows[0];

  //     if (word_types && word_types.length > 0) {
  //       const typeValues = word_types.map(typeCode => `('${newVocab.id}', '${typeCode}')`).join(',');
  //       await client.query(`INSERT INTO "VocabularyWordType" (vocab_id, word_type) VALUES ${typeValues};`);
  //     }
      
  //     await client.query('COMMIT');
  //     return { ...newVocab, word_types };
  //   } catch (e) {
  //     await client.query('ROLLBACK');
  //     throw e;
  //   } finally {
  //     client.release();
  //   }
  // },

  /**
   * Kiểm tra sự tồn tại của một từ vựng bằng ID.
   */
  exists: async (id) => {
    const queryText = `SELECT 1 FROM "Vocabulary" WHERE id = $1;`;
    const result = await db.query(queryText, [id]);
    return result.rowCount > 0;
  },

  /**
   * Tìm một từ vựng dựa trên ID, trả về đầy đủ thông tin kèm word_types.
   */
  findById: async (id) => {
    const queryText = `
        SELECT v.*, array_remove(array_agg(vwt.word_type), NULL) as "word_types"
        FROM "Vocabulary" v
        LEFT JOIN "VocabularyWordType" vwt ON v.id = vwt.vocab_id
        WHERE v.id = $1
        GROUP BY v.id;
    `;
    const result = await db.query(queryText, [id]);
    return result.rows[0];
  },

  /**
   * Tìm một từ vựng dựa trên hanzi (UNIQUE field), trả về đầy đủ thông tin kèm word_types.
   */
  findByHanzi: async (hanzi) => {
    const queryText = `
        SELECT v.*, array_remove(array_agg(vwt.word_type), NULL) as "word_types"
        FROM "Vocabulary" v
        LEFT JOIN "VocabularyWordType" vwt ON v.id = vwt.vocab_id
        WHERE v.hanzi = $1
        GROUP BY v.id;
    `;
    const result = await db.query(queryText, [hanzi]);
    return result.rows[0];
  },
  
  /**
   * Tạo một từ vựng mới và các liên kết word type của nó.
   */
  createWithWordTypes: async (vocabData) => {
    const { hanzi, pinyin, meaning, notes, level, image_url, word_types } = vocabData;
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      const vocabQuery = `
        INSERT INTO "Vocabulary" (hanzi, pinyin, meaning, notes, level, image_url)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
      `;
      const vocabResult = await client.query(vocabQuery, [hanzi, pinyin, meaning, notes, level, image_url]);
      const newVocab = vocabResult.rows[0];

      if (word_types && word_types.length > 0) {
        const typeValues = word_types.map(typeCode => `('${newVocab.id}', '${typeCode}')`).join(',');
        await client.query(`INSERT INTO "VocabularyWordType" (vocab_id, word_type) VALUES ${typeValues};`);
      }
      
      await client.query('COMMIT');
      return { ...newVocab, word_types };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  /**
   * Cập nhật và hợp nhất (MERGE) một từ vựng.
   */
  upsertAndMerge: async (vocabData) => {
    const { id, hanzi, pinyin, meaning, notes, level, image_url, word_types: new_word_types = [] } = vocabData;
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      const vocabQuery = `
        UPDATE "Vocabulary" 
        SET hanzi = $1, pinyin = $2, meaning = $3, notes = $4, level = $5, image_url = $6
        WHERE id = $7 RETURNING *;
      `;
      const vocabResult = await client.query(vocabQuery, [hanzi, pinyin, meaning, notes, level, image_url, id]);
      const updatedVocab = vocabResult.rows[0];
      
      const existingTypesQuery = `SELECT word_type FROM "VocabularyWordType" WHERE vocab_id = $1;`;
      const existingTypesResult = await client.query(existingTypesQuery, [id]);
      const existingTypes = existingTypesResult.rows.map(r => r.word_type);

      const typesToAdd = new_word_types.filter(type => !existingTypes.includes(type));

      if (typesToAdd.length > 0) {
        const typeValues = typesToAdd.map(typeCode => `('${id}', '${typeCode}')`).join(',');
        await client.query(`INSERT INTO "VocabularyWordType" (vocab_id, word_type) VALUES ${typeValues};`);
      }
      
      await client.query('COMMIT');

      return { ...updatedVocab, word_types: [...existingTypes, ...typesToAdd] };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },


  createWordType: async (code) => {
    const queryText = `INSERT INTO "WordType" (code) VALUES ($1) RETURNING *;`;
    const result = await db.query(queryText, [code]); // Luôn lưu mã dưới dạng chữ hoa
    return result.rows[0];
  },

};

module.exports = vocabularyModel;