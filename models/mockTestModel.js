// models/mockTestModel.js

const db = require('../config/db');

const mockTestModel = {

  
  //admin
  createTest: async (testData) => {
    const { type, level, title, total_time_limit, total_max_score, instructions, created_by } = testData;
    const queryText = `
      INSERT INTO "MockTests" (type, level, title, total_time_limit, total_max_score, instructions, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [type, level, title, total_time_limit, total_max_score, instructions, created_by];
    const result = await db.query(queryText, values);
    return result.rows[0];
  },
  createSection: async (sectionData) => {
    const { test_id, name, order_no, time_limit, max_score, total_questions } = sectionData;
    const queryText = `
      INSERT INTO "MockTestSections" (test_id, name, order_no, time_limit, max_score, total_questions)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [test_id, name, order_no, time_limit, max_score, total_questions];
    const result = await db.query(queryText, values);
    return result.rows[0];
  },
  createQuestion: async (questionData) => {
    const {
      section_id, order_no, type, text, options,
      correct_answer, explanation, media_id, start_time,
      end_time, is_visual
    } = questionData;
    const optionsAsJsonString = options ? JSON.stringify(options) : null;

    const queryText = `
      INSERT INTO "MockTestQuestions" (
          section_id,     
          order_no,       
          type,            -- Loại câu hỏi, ví dụ: 'mcq' (multiple choice question)
          text,            -- Nội dung câu hỏi
          options,         -- Các lựa chọn, lưu dưới dạng JSON array
          correct_answer,  -- Đáp án đúng (với MCQ, đây là chỉ số của mảng options, bắt đầu từ 0)
          explanation,     -- Giải thích đáp án
          media_id,        -- ID của file media (nếu có), để NULL nếu không có
          start_time,      -- Thời gian bắt đầu trong file media (giây), NULL nếu không có
          end_time,        -- Thời gian kết thúc trong file media (giây), NULL nếu không có
          is_visual        -- Câu hỏi có dựa trên hình ảnh không
      )
      VALUES (
          $1, $2, $3, $4, $5, $6,$7, $8, $9, $10, $11
      )
      RETURNING *; 
    `;
    const values = [
      section_id, order_no, type, text, optionsAsJsonString,
      correct_answer, explanation, media_id, start_time,
      end_time, is_visual
    ];
    const result = await db.query(queryText, values);
    return result.rows[0];
  },
  exists: async (tableName, id) => {
      const queryText = `SELECT 1 FROM "${tableName}" WHERE id = $1`;
      const result = await db.query(queryText, [id]);
      return result.rowCount > 0;
  },
  createFullWithTransaction: async (data) => {
    const { sections, ...testInfo } = data;
    
    // Lấy một client riêng từ pool
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN'); // Bắt đầu transaction

      // 1. Tạo MockTest
      const testQuery = `
        INSERT INTO "MockTests" (type, level, title, total_time_limit, total_max_score, instructions, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const testValues = [testInfo.type, testInfo.level, testInfo.title, testInfo.total_time_limit, testInfo.total_max_score, testInfo.instructions, testInfo.created_by];
      const testResult = await client.query(testQuery, testValues);
      const newTest = testResult.rows[0];
      newTest.sections = []; // Chuẩn bị mảng để chứa sections trả về

      // 2. Duyệt qua mảng 'sections' và tạo từng section
      if (sections && sections.length > 0) {
        for (const sectionData of sections) {
          const { questions, ...sectionInfo } = sectionData;
          
          const sectionQuery = `
            INSERT INTO "MockTestSections" (test_id, name, order_no, time_limit, max_score, total_questions)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
          `;
          const sectionValues = [newTest.id, sectionInfo.name, sectionInfo.order_no, sectionInfo.time_limit, sectionInfo.max_score, sectionInfo.total_questions];
          const sectionResult = await client.query(sectionQuery, sectionValues);
          const newSection = sectionResult.rows[0];
          newSection.questions = []; // Chuẩn bị mảng để chứa questions

          // 3. Duyệt qua mảng 'questions' của section này và tạo từng câu hỏi
          if (questions && questions.length > 0) {
            for (const questionData of questions) {
                // Nhớ stringify options!
                const optionsAsJsonString = questionData.options ? JSON.stringify(questionData.options) : null;

                const questionQuery = `
                    INSERT INTO "MockTestQuestions" (
                        section_id, order_no, type, text, options,
                        correct_answer, explanation, media_id, start_time,
                        end_time, is_visual
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING *;
                `;
                const questionValues = [
                    newSection.id, questionData.order_no, questionData.type, questionData.text, optionsAsJsonString,
                    questionData.correct_answer, questionData.explanation, questionData.media_id, questionData.start_time,
                    questionData.end_time, questionData.is_visual
                ];
                const questionResult = await client.query(questionQuery, questionValues);
                newSection.questions.push(questionResult.rows[0]);
            }
          }
          // Thêm section đã hoàn chỉnh (có questions) vào bài test
          newTest.sections.push(newSection);
        }
      }

      await client.query('COMMIT'); // Nếu tất cả thành công
      return newTest; // Trả về đối tượng lồng nhau đầy đủ

    } catch (error) {
      await client.query('ROLLBACK'); // Nếu có bất kỳ lỗi nào, hủy bỏ hết
      throw error; // Ném lỗi để controller xử lý
    } finally {
      client.release(); // Trả client về pool
    }
  },
  findAllTests: async ({ search, limit, offset }) => {
    let whereClause = '';
    let queryParams = [];
    if (search) {
      whereClause = `WHERE title ILIKE $1 OR type ILIKE $1 OR level ILIKE $1`;
      queryParams.push(`%${search}%`);
    }
    
    const dataQuery = `SELECT * FROM "MockTests" ${whereClause} ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    const countQuery = `SELECT COUNT(*) as total FROM "MockTests" ${whereClause}`;
    
    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, [...queryParams, limit, offset]),
      db.query(countQuery, queryParams)
    ]);
    
    const totalItems = parseInt(countResult.rows[0].total, 10);
    return {
      tests: dataResult.rows,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: Math.floor(offset / limit) + 1,
        itemsPerPage: limit
      }
    };
  },
  findTestById: async (testId) => {
    // Sử dụng Common Table Expressions (CTE) và JSON aggregation để lấy dữ liệu lồng nhau trong 1 query
    const queryText = `
      WITH questions AS (
        SELECT 
          qs.section_id,
          jsonb_agg(qs.* ORDER BY qs.order_no) as questions
        FROM "MockTestQuestions" qs
        GROUP BY qs.section_id
      ),
      sections AS (
        SELECT 
          s.test_id,
          jsonb_agg(
            jsonb_build_object(
              'id', s.id,
              'name', s.name,
              'order_no', s.order_no,
              'time_limit', s.time_limit,
              'max_score', s.max_score,
              'total_questions', s.total_questions,
              'questions', COALESCE(q.questions, '[]'::jsonb)
            ) ORDER BY s.order_no
          ) as sections
        FROM "MockTestSections" s
        LEFT JOIN questions q ON s.id = q.section_id
        GROUP BY s.test_id
      )
      SELECT 
        t.*, 
        COALESCE(s.sections, '[]'::jsonb) as sections
      FROM "MockTests" t
      LEFT JOIN sections s ON t.id = s.test_id
      WHERE t.id = $1;
    `;
    const result = await db.query(queryText, [testId]);
    return result.rows[0];
  },
  findAllActive: async ({ type, level, limit, offset }) => {
    let whereClauses = [`is_active = true`, `deleted_at IS NULL`];
    let queryParams = [];
    let paramIndex = 1;

    // Filter theo `type` (HSK, TOCFL,...)
    if (type) {
      whereClauses.push(`type = $${paramIndex++}`);
      queryParams.push(type);
    }
    
    // Filter theo `level` (HSK1, HSK2,...)
    if (level) {
      whereClauses.push(`level = $${paramIndex++}`);
      queryParams.push(level);
    }

    const whereString = `WHERE ${whereClauses.join(' AND ')}`;

    // Câu truy vấn lấy dữ liệu
    const dataQuery = `
      SELECT id, type, level, title, total_time_limit, total_max_score
      FROM "MockTests"
      ${whereString}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++}
      OFFSET $${paramIndex++};
    `;
    
    // Câu truy vấn đếm
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "MockTests"
      ${whereString};
    `;

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, [...queryParams, limit, offset]),
      db.query(countQuery, queryParams)
    ]);
    
    const totalItems = parseInt(countResult.rows[0].total, 10);
    return {
      tests: dataResult.rows,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: Math.floor(offset / limit) + 1,
        itemsPerPage: limit
      }
    };
  },
  update: async (tableName, id, data) => {
    const keys = Object.keys(data);
    if (keys.length === 0) return null; // Không có gì để cập nhật
    
    const setClause = keys.map((key, i) => `"${key}" = $${i + 1}`).join(', ');
    const queryText = `UPDATE "${tableName}" SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
    const result = await db.query(queryText, [...Object.values(data), id]);
    return result.rows[0];
  },
  deleteById: async (tableName, id) => {
      const queryText = `DELETE FROM "${tableName}" WHERE id = $1 RETURNING id`;
      const result = await db.query(queryText, [id]);
      return result.rows[0];
  },
  findTestForUserById: async (testId) => {
  const queryText = `
    SELECT
      t.id, t.type, t.level, t.title, t.total_time_limit, t.instructions,
      (
        SELECT jsonb_agg(sections_agg ORDER BY order_no)
        FROM (
          SELECT
            s.id, s.name, s.order_no, s.time_limit, s.total_questions,
            (
              SELECT jsonb_agg(questions_agg ORDER BY order_no)
              FROM (
                SELECT
                  q.id, q.order_no, q.type, q.text, q.options,
                  q.media_id, q.start_time, q.end_time, q.is_visual
                FROM "MockTestQuestions" q
                WHERE q.section_id = s.id
              ) AS questions_agg
            ) AS questions
          FROM "MockTestSections" s
          WHERE s.test_id = t.id
        ) AS sections_agg
      ) AS sections
    FROM "MockTests" t
    WHERE t.id = $1 AND t.is_active = true AND t.deleted_at IS NULL;
  `;
  const result = await db.query(queryText, [testId]);
  return result.rows[0];
},

};

module.exports = mockTestModel;
