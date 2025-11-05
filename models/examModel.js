// file: models/examModel.js

const db = require('../config/db');

const examModel = {
  createFullExam: async (examData, createdById) => {
    const client = await db.pool.connect();
    const promptIdMap = new Map();

    // --- THAY ĐỔI: Khởi tạo object để xây dựng lại cấu trúc bài thi ---
    let finalExamStructure = {};

    try {
      await client.query('BEGIN');

      // --- 1. Tạo bản ghi Exam chính ---
      const examQuery = `
        INSERT INTO "Exams" (name, description, instructions, total_time_minutes, exam_type_id, exam_level_id, created_by, is_published)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      const examResult = await client.query(examQuery, [
        examData.name, examData.description, examData.instructions, examData.total_time_minutes,
        examData.exam_type_id, examData.exam_level_id, createdById, examData.is_published || false
      ]);
      const newExam = examResult.rows[0];
      
      // Bắt đầu xây dựng lại cấu trúc
      finalExamStructure = { ...newExam, sections: [] };

      // --- 2. Lặp qua và tạo các Sections ---
      for (const [sectionIndex, section] of examData.sections.entries()) {
        const sectionQuery = `
          INSERT INTO "Sections" (exam_id, name, description, time_minutes, "order")
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;
        `;
        const sectionResult = await client.query(sectionQuery, [
          newExam.id, section.name, section.description, section.time_minutes, sectionIndex
        ]);
        const newSection = sectionResult.rows[0];
        
        // Thêm section mới vào cấu trúc trả về
        finalExamStructure.sections.push({ ...newSection, subsections: [] });

        // --- 3. Lặp qua và tạo các Subsections ---
        for (const [subsectionIndex, subsection] of section.subsections.entries()) {
          const subsectionQuery = `
            INSERT INTO "Subsections" (section_id, name, description, audio_url, "order")
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
          `;
          const subsectionResult = await client.query(subsectionQuery, [
            newSection.id, subsection.name, subsection.description, subsection.audio_url, subsectionIndex
          ]);
          const newSubsection = subsectionResult.rows[0];

          // Thêm subsection mới vào cấu trúc trả về
          finalExamStructure.sections[sectionIndex].subsections.push({ ...newSubsection, prompts: [], questions: [] });

          // --- 4. Lặp qua và tạo các Prompts (nếu có) ---
          if (subsection.prompts && subsection.prompts.length > 0) {
            for (const [promptIndex, prompt] of subsection.prompts.entries()) {
              const promptQuery = `
                INSERT INTO "Prompts" (subsection_id, content, image, audio_url, "order")
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *;
              `;
              const promptResult = await client.query(promptQuery, [
                newSubsection.id, prompt.content, prompt.image_url || null, prompt.audio_url, promptIndex
              ]);
              const newPrompt = promptResult.rows[0];
              promptIdMap.set(prompt.id, newPrompt.id);
              
              // Thêm prompt mới vào cấu trúc trả về
              finalExamStructure.sections[sectionIndex].subsections[subsectionIndex].prompts.push(newPrompt);
            }
          }
          
          // --- 5. Lặp qua và tạo các Questions ---
          for (const [questionIndex, question] of subsection.questions.entries()) {
            const questionQuery = `
              INSERT INTO "Questions" (subsection_id, question_type_id, content, points, image_url, audio_url, "order", correct_answer)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              RETURNING *;
            `;
            const questionResult = await client.query(questionQuery, [
              newSubsection.id, question.question_type_id, question.content,
              question.points, question.image_url, question.audio_url, questionIndex, question.correct_answer
            ]);
            const newQuestion = questionResult.rows[0];
            
            // Khởi tạo cấu trúc cho câu hỏi mới
            const newQuestionStructure = { ...newQuestion, options: [], explanation: null, correct_answers: [] };
            
            // --- 5.1 Tạo liên kết trong Prompt_Questions ---
            if (question.prompt_id) {
              const newPromptId = promptIdMap.get(question.prompt_id);
              if (newPromptId) {
                await client.query(`INSERT INTO "Prompt_Questions" (prompt_id, question_id) VALUES ($1, $2);`, [newPromptId, newQuestion.id]);
                // Gán lại prompt_id thật vào cấu trúc trả về
                newQuestionStructure.prompt_id = newPromptId;
              }
            }

            // --- 6. Tạo và lấy các Options (nếu có) ---
            if (question.options && question.options.length > 0) {
                for (const [optionIndex, option] of question.options.entries()) {
                    const optionQuery = `
                        INSERT INTO "Options" (question_id, label, content, is_correct, image_url, "order")
                        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
                    `;
                    const optionResult = await client.query(optionQuery, [
                        newQuestion.id, option.label, option.content, option.is_correct, option.image_url, optionIndex
                    ]);
                    newQuestionStructure.options.push(optionResult.rows[0]);
                }
            }
            
            // --- 7. Tạo và lấy Explanation (nếu có) ---
            if (question.explanation && question.explanation.content) {
              const explanationQuery = `INSERT INTO "Explanations" (question_id, content) VALUES ($1, $2) RETURNING *;`;
              const explanationResult = await client.query(explanationQuery, [newQuestion.id, question.explanation.content]);
              newQuestionStructure.explanation = explanationResult.rows[0];
            }

            // --- 8. Tạo và lấy Correct_Answers (nếu có) ---
            if (question.correct_answers && question.correct_answers.length > 0) {
                for (const answer of question.correct_answers) {
                    const answerQuery = `INSERT INTO "Correct_Answers" (question_id, answer) VALUES ($1, $2) RETURNING *;`;
                    const answerResult = await client.query(answerQuery, [newQuestion.id, answer.answer]);
                    newQuestionStructure.correct_answers.push(answerResult.rows[0]);
                }
            }
            
            // Thêm cấu trúc câu hỏi hoàn chỉnh vào subsection tương ứng
            finalExamStructure.sections[sectionIndex].subsections[subsectionIndex].questions.push(newQuestionStructure);
          }
        }
      }

      await client.query('COMMIT');
      
      // --- THAY ĐỔI: Trả về cấu trúc đã được xây dựng lại ---
      return finalExamStructure;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Lỗi trong transaction tạo bài thi, tất cả thay đổi đã được hoàn tác:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  findById: async (id) => {
    // Câu truy vấn này gần như giống hệt với truy vấn trong `findAllPaginated`,
    // chỉ khác ở điều kiện WHERE và không có LIMIT/OFFSET.
    const queryText = `
      SELECT
        e.*,
        (
          SELECT jsonb_agg(sections_agg ORDER BY sections_agg."order" ASC)
          FROM (
            SELECT
              s.*,
              (
                SELECT jsonb_agg(subsections_agg ORDER BY subsections_agg."order" ASC)
                FROM (
                  SELECT
                    ss.*,
                    (
                      SELECT jsonb_agg(p.* ORDER BY p."order" ASC)
                      FROM "Prompts" p
                      WHERE p.subsection_id = ss.id
                    ) AS prompts,
                    (
                      SELECT jsonb_agg(questions_agg ORDER BY questions_agg."order" ASC)
                      FROM (
                        SELECT
                          q.*,
                          -- Lấy prompt_id từ bảng liên kết Prompt_Questions
                          (SELECT pq.prompt_id FROM "Prompt_Questions" pq WHERE pq.question_id = q.id LIMIT 1) as prompt_id,
                          (
                            SELECT jsonb_agg(o.* ORDER BY o."order" ASC)
                            FROM "Options" o
                            WHERE o.question_id = q.id
                          ) AS options,
                          (
                            SELECT jsonb_agg(ca.*)
                            FROM "Correct_Answers" ca
                            WHERE ca.question_id = q.id
                          ) AS correct_answers,
                          (
                            SELECT jsonb_build_object('id', ex.id, 'content', ex.content, 'question_id', ex.question_id)
                            FROM "Explanations" ex
                            WHERE ex.question_id = q.id
                            LIMIT 1
                          ) AS explanation
                        FROM "Questions" q
                        WHERE q.subsection_id = ss.id
                      ) AS questions_agg
                    ) AS questions
                  FROM "Subsections" ss
                  WHERE ss.section_id = s.id
                ) AS subsections_agg
              ) AS subsections
            FROM "Sections" s
            WHERE s.exam_id = e.id
          ) AS sections_agg
        ) AS sections
      FROM "Exams" e
      WHERE e.id = $1 AND e.is_deleted = false
      GROUP BY e.id;
    `;
    
    const result = await db.query(queryText, [id]);
    
    return result.rows[0] || null;
  },

  findAllPaginated: async (filters) => {
    const { limit, offset, search, examTypeId, examLevelId, is_published } = filters;
    
    const queryParams = [];
    let whereClauses = 'WHERE e.is_deleted = false';

    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses += ` AND e.name ILIKE $${queryParams.length}`;
    }
    if (examTypeId) {
      queryParams.push(examTypeId);
      whereClauses += ` AND e.exam_type_id = $${queryParams.length}`;
    }
    if (examLevelId) {
      queryParams.push(examLevelId);
      whereClauses += ` AND e.exam_level_id = $${queryParams.length}`;
    }
    if (is_published !== undefined && is_published !== null ) {
      if(String(is_published).toLowerCase() !== 'all'){
        const isPublishedValue = String(is_published).toLowerCase() === 'true';
        queryParams.push(isPublishedValue);
        whereClauses += ` AND e.is_published = $${queryParams.length}`;
      }
    }
    
    // --- Truy vấn 1: Đếm tổng số bài thi ---
    const countQuery = `SELECT COUNT(*) FROM "Exams" e ${whereClauses}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);
    
    // --- Truy vấn 2: Tái tạo cấu trúc JSON (PHIÊN BẢN SỬA LỖI) ---
    // Sử dụng subquery lồng nhau thay vì CTE để tránh lỗi DISTINCT
    const selectQuery = `
      SELECT
        e.*,
        (
          SELECT jsonb_agg(sections_agg)
          FROM (
            SELECT
              s.*,
              (
                SELECT jsonb_agg(subsections_agg)
                FROM (
                  SELECT
                    ss.*,
                    (
                      SELECT jsonb_agg(p.* ORDER BY p."order" ASC)
                      FROM "Prompts" p
                      WHERE p.subsection_id = ss.id
                    ) AS prompts,
                    (
                      SELECT jsonb_agg(questions_agg)
                      FROM (
                        SELECT
                          q.*,
                          (
                            SELECT jsonb_agg(o.* ORDER BY o."order" ASC)
                            FROM "Options" o
                            WHERE o.question_id = q.id
                          ) AS options,
                          (
                            SELECT jsonb_agg(ca.*)
                            FROM "Correct_Answers" ca
                            WHERE ca.question_id = q.id
                          ) AS correct_answers,
                          (
                            -- Sử dụng jsonb_build_object để lấy ra 1 object thay vì mảng
                            SELECT jsonb_build_object('id', ex.id, 'content', ex.content)
                            FROM "Explanations" ex
                            WHERE ex.question_id = q.id
                            LIMIT 1
                          ) AS explanation
                        FROM "Questions" q
                        WHERE q.subsection_id = ss.id
                        ORDER BY q."order" ASC
                      ) AS questions_agg
                    ) AS questions
                  FROM "Subsections" ss
                  WHERE ss.section_id = s.id
                  ORDER BY ss."order" ASC
                ) AS subsections_agg
              ) AS subsections
            FROM "Sections" s
            WHERE s.exam_id = e.id
            ORDER BY s."order" ASC
          ) AS sections_agg
        ) AS sections
      FROM "Exams" e
      ${whereClauses}
      ORDER BY e.created_at DESC
      LIMIT $${queryParams.length + 1}
      OFFSET $${queryParams.length + 2};
    `;
    
    const examsResult = await db.query(selectQuery, [...queryParams, limit, offset]);

    return {
      exams: examsResult.rows,
      totalItems,
    };
  },

  updateFullExam: async (examId, examData, updatedById) => {
    const client = await db.pool.connect();
    const promptIdMap = new Map();
    let finalExamStructure = {};

    try {
      await client.query('BEGIN');

      // --- Bước 1: Tìm tất cả các ID con cần xóa ---
      // Lấy tất cả các question_id và prompt_id thuộc về bài thi này.
      const getChildIdsQuery = `
        SELECT DISTINCT
          q.id AS question_id,
          p.id AS prompt_id
        FROM "Exams" e
        JOIN "Sections" s ON e.id = s.exam_id
        JOIN "Subsections" ss ON s.id = ss.section_id
        LEFT JOIN "Questions" q ON ss.id = q.subsection_id
        LEFT JOIN "Prompts" p ON ss.id = p.subsection_id
        WHERE e.id = $1;
      `;
      const childIdsResult = await client.query(getChildIdsQuery, [examId]);
      
      const questionIds = childIdsResult.rows
        .map(row => row.question_id)
        .filter(Boolean); // Lọc ra các giá trị null (nếu subsection không có question)
      
      const promptIds = childIdsResult.rows
        .map(row => row.prompt_id)
        .filter(Boolean); // Lọc ra các giá trị null

      // --- Bước 2: Xóa thủ công các bản ghi con có ràng buộc RESTRICT ---
      // Chỉ thực hiện xóa nếu có question_id để tránh truy vấn thừa
      if (questionIds.length > 0) {
        // Xóa các liên kết trong bảng Prompt_Questions trước
        await client.query(`DELETE FROM "Prompt_Questions" WHERE question_id = ANY($1::uuid[])`, [questionIds]);
        
        // Xóa các đáp án của người dùng (rất quan trọng)
        // Lưu ý: Bảng User_Answers có thể không liên kết trực tiếp với Question, mà qua User_Exam_Attempts.
        // Giả định User_Answers có question_id trực tiếp. Nếu không, truy vấn này cần phức tạp hơn.
        await client.query(`DELETE FROM "User_Answers" WHERE question_id = ANY($1::uuid[])`, [questionIds]);
        
        // Xóa các đáp án đúng
        await client.query(`DELETE FROM "Correct_Answers" WHERE question_id = ANY($1::uuid[])`, [questionIds]);

        // Xóa các giải thích
        await client.query(`DELETE FROM "Explanations" WHERE question_id = ANY($1::uuid[])`, [questionIds]);
        
        // Lưu ý: Bảng Options có ON DELETE CASCADE trỏ đến Questions, nên không cần xóa thủ công.
      }
      
      // Xóa các liên kết trong bảng Prompt_Questions từ prompt_id
      if (promptIds.length > 0) {
          await client.query(`DELETE FROM "Prompt_Questions" WHERE prompt_id = ANY($1::uuid[])`, [promptIds]);
      }
      
      // --- Bước 3: Bây giờ mới xóa Sections, và để CASCADE lo phần còn lại ---
      // Sau khi gỡ các ràng buộc RESTRICT, lệnh DELETE CASCADE này sẽ hoạt động
      // Nó sẽ xóa Sections -> Subsections -> Prompts & Questions -> Options
      await client.query(`DELETE FROM "Sections" WHERE exam_id = $1`, [examId]);


      // --- Bước 4: Cập nhật thông tin chính của Exam ---
      const examQuery = `
        UPDATE "Exams"
        SET 
          name = $1, description = $2, instructions = $3, total_time_minutes = $4,
          exam_type_id = $5, exam_level_id = $6, is_published = $7, updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING *;
      `;
      const examResult = await client.query(examQuery, [
        examData.name, examData.description, examData.instructions, examData.total_time_minutes,
        examData.exam_type_id, examData.exam_level_id, examData.is_published || false, examId
      ]);

      if (examResult.rowCount === 0) {
        throw new Error('Bài thi không tồn tại.');
      }
      const updatedExam = examResult.rows[0];
      finalExamStructure = { ...updatedExam, sections: [] };

      // --- Bước 5: Tạo lại toàn bộ cấu trúc mới (logic giống hệt hàm createFullExam) ---
      for (const [sectionIndex, section] of examData.sections.entries()) {
        const sectionQuery = `INSERT INTO "Sections" (exam_id, name, description, time_minutes, "order") VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
        const sectionResult = await client.query(sectionQuery, [examId, section.name, section.description, section.time_minutes, sectionIndex]);
        const newSection = sectionResult.rows[0];
        finalExamStructure.sections.push({ ...newSection, subsections: [] });

        for (const [subsectionIndex, subsection] of section.subsections.entries()) {
          const subsectionQuery = `INSERT INTO "Subsections" (section_id, name, description, audio_url, "order") VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
          const subsectionResult = await client.query(subsectionQuery, [newSection.id, subsection.name, subsection.description, subsection.audio_url, subsectionIndex]);
          const newSubsection = subsectionResult.rows[0];
          finalExamStructure.sections[sectionIndex].subsections.push({ ...newSubsection, prompts: [], questions: [] });

          if (subsection.prompts && subsection.prompts.length > 0) {
            for (const [promptIndex, prompt] of subsection.prompts.entries()) {
              const promptQuery = `INSERT INTO "Prompts" (subsection_id, content, image, audio_url, "order") VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
              const promptResult = await client.query(promptQuery, [newSubsection.id, prompt.content, prompt.image_url || null, prompt.audio_url, promptIndex]);
              const newPrompt = promptResult.rows[0];
              promptIdMap.set(prompt.id, newPrompt.id);
              finalExamStructure.sections[sectionIndex].subsections[subsectionIndex].prompts.push(newPrompt);
            }
          }
          
          for (const [questionIndex, question] of subsection.questions.entries()) {
            const questionQuery = `INSERT INTO "Questions" (subsection_id, question_type_id, content, points, image_url, audio_url, "order", correct_answer) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;`;
            const questionResult = await client.query(questionQuery, [newSubsection.id, question.question_type_id, question.content, question.points, question.image_url, question.audio_url, questionIndex, question.correct_answer]);
            const newQuestion = questionResult.rows[0];
            const newQuestionStructure = { ...newQuestion, options: [], explanation: null, correct_answers: [] };
            
            if (question.prompt_id) {
              const newPromptId = promptIdMap.get(question.prompt_id);
              if (newPromptId) {
                await client.query(`INSERT INTO "Prompt_Questions" (prompt_id, question_id) VALUES ($1, $2);`, [newPromptId, newQuestion.id]);
                newQuestionStructure.prompt_id = newPromptId;
              }
            }
            if (question.options && question.options.length > 0) {
                for (const [optionIndex, option] of question.options.entries()) {
                    const optionQuery = `INSERT INTO "Options" (question_id, label, content, is_correct, image_url, "order") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`;
                    const optionResult = await client.query(optionQuery, [newQuestion.id, option.label, option.content, option.is_correct, option.image_url, optionIndex]);
                    newQuestionStructure.options.push(optionResult.rows[0]);
                }
            }
            if (question.explanation && question.explanation.content) {
              const explanationQuery = `INSERT INTO "Explanations" (question_id, content) VALUES ($1, $2) RETURNING *;`;
              const explanationResult = await client.query(explanationQuery, [newQuestion.id, question.explanation.content]);
              newQuestionStructure.explanation = explanationResult.rows[0];
            }
            if (question.correct_answers && question.correct_answers.length > 0) {
                for (const answer of question.correct_answers) {
                    const answerQuery = `INSERT INTO "Correct_Answers" (question_id, answer) VALUES ($1, $2) RETURNING *;`;
                    const answerResult = await client.query(answerQuery, [newQuestion.id, answer.answer]);
                    newQuestionStructure.correct_answers.push(answerResult.rows[0]);
                }
            }
            finalExamStructure.sections[sectionIndex].subsections[subsectionIndex].questions.push(newQuestionStructure);
          }
        }
      }

      await client.query('COMMIT');
      return finalExamStructure;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Lỗi trong transaction cập nhật bài thi:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  ////////user///////
  findPublishedExams: async (filters) => {
    const { limit, offset, search, examTypeId, examLevelId } = filters;
    
    const queryParams = [];
    // Điều kiện cứng: Chỉ lấy bài thi đã công bố và chưa bị xóa
    let whereClauses = 'WHERE e.is_published = true AND e.is_deleted = false'; 

    // Xây dựng các điều kiện lọc động
    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses += ` AND e.name ILIKE $${queryParams.length}`;
    }
    if (examTypeId) {
      queryParams.push(examTypeId);
      whereClauses += ` AND e.exam_type_id = $${queryParams.length}`;
    }
    if (examLevelId) {
      queryParams.push(examLevelId);
      whereClauses += ` AND e.exam_level_id = $${queryParams.length}`;
    }
    
    // --- Truy vấn 1: Đếm tổng số bài thi khớp điều kiện ---
    const countQuery = `SELECT COUNT(*) FROM "Exams" e ${whereClauses}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);
    
    // --- Truy vấn 2: Lấy dữ liệu cơ bản, có phân trang ---
    // Chỉ SELECT các cột cần thiết, không lấy toàn bộ cấu trúc
    const selectQuery = `
      SELECT 
        e.id,
        e.name,
        e.description,
        e.total_time_minutes,
        e.total_questions,
        e.exam_type_id,
        et.name as exam_type_name,
        e.exam_level_id,
        el.name as exam_level_name
      FROM "Exams" e
      JOIN "Exam_Types" et ON e.exam_type_id = et.id
      JOIN "Exam_Levels" el ON e.exam_level_id = el.id
      ${whereClauses}
      ORDER BY e.created_at DESC
      LIMIT $${queryParams.length + 1}
      OFFSET $${queryParams.length + 2};
    `;
    
    const examsResult = await db.query(selectQuery, [...queryParams, limit, offset]);

    return {
      exams: examsResult.rows,
      totalItems,
    };
  },

  findDetailsById: async (id) => {
    const queryText = `
      SELECT
        e.id, e.name, e.description, e.instructions, e.total_time_minutes, e.total_questions,
        (
          SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'order', s."order") ORDER BY s."order" ASC)
          FROM "Sections" s
          WHERE s.exam_id = e.id
        ) as sections
      FROM "Exams" e
      WHERE e.id = $1 AND e.is_published = true AND e.is_deleted = false;
    `;
    const result = await db.query(queryText, [id]);
    return result.rows[0];
  },

  findFullStructureForAttempt: async (id) => {
    // Tái sử dụng và sửa đổi hàm findById
    // BỎ các trường đáp án: correct_answer, is_correct, explanation
    const queryText = `
      SELECT
        e.id, e.name, e.description, e.instructions, e.total_time_minutes, e.total_questions,
        (
          SELECT jsonb_agg(sections_agg ORDER BY sections_agg."order" ASC)
          FROM (
            SELECT
              s.id, s.name, s.description, s.time_minutes, s."order",
              (
                SELECT jsonb_agg(subsections_agg ORDER BY subsections_agg."order" ASC)
                FROM (
                  SELECT
                    ss.id, ss.name, ss.description, ss.audio_url, ss."order",
                    (
                      SELECT jsonb_agg(p.* ORDER BY p."order" ASC) FROM "Prompts" p WHERE p.subsection_id = ss.id
                    ) AS prompts,
                    (
                      SELECT jsonb_agg(questions_agg ORDER BY questions_agg."order" ASC)
                      FROM (
                        SELECT
                          q.id, q.subsection_id, q.content, q.points, q.image_url, q.audio_url, q."order",
                          (SELECT pq.prompt_id FROM "Prompt_Questions" pq WHERE pq.question_id = q.id LIMIT 1) as prompt_id,
                          (
                            SELECT jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'content', o.content, 'image_url', o.image_url) ORDER BY o."order" ASC)
                            FROM "Options" o
                            WHERE o.question_id = q.id
                          ) AS options
                        FROM "Questions" q
                        WHERE q.subsection_id = ss.id
                      ) AS questions_agg
                    ) AS questions
                  FROM "Subsections" ss
                  WHERE ss.section_id = s.id
                ) AS subsections_agg
              ) AS subsections
            FROM "Sections" s
            WHERE s.exam_id = e.id
          ) AS sections_agg
        ) AS sections
      FROM "Exams" e
      WHERE e.id = $1 AND e.is_published = true AND e.is_deleted = false
      GROUP BY e.id;
    `;
    const result = await db.query(queryText, [id]);
    return result.rows[0];
  },

  findAllQuestionIdsByExamId: async (examId) => {
    const queryText = `
      SELECT q.id
      FROM "Questions" q
      JOIN "Subsections" ss ON q.subsection_id = ss.id
      JOIN "Sections" s ON ss.section_id = s.id
      WHERE s.exam_id = $1;
    `;
    const result = await db.query(queryText, [examId]);
    // .map(row => row.id) để chuyển từ [{id: '...'}, {id: '...'}] thành ['...', '...']
    return result.rows.map(row => row.id);
  },























  


    findExamById: async (examId) => {
    const queryText = `SELECT * FROM "Exams" WHERE id = $1 AND is_deleted = false;`;
    const result = await db.query(queryText, [examId]);
    return result.rows[0];
  },
  updateCompleteExam: async (examId, examData, updatedByUserId) => {
    const client = await db.pool.connect();
    const idMap = new Map();

    try {
      await client.query('BEGIN');

      // --- Bước 1: Cập nhật thông tin chính của Exam ---
      const updateExamQuery = `
        UPDATE "Exams"
        SET 
          exam_type_id = $1, 
          exam_level_id = $2, 
          name = $3, 
          description = $4, 
          instructions = $5, 
          total_time_minutes = $6, 
          is_published = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8;
      `;
      const updateExamResult = await client.query(updateExamQuery, [
        examData.exam_type_id, examData.exam_level_id, examData.name,
        examData.description, examData.instructions, examData.total_time_minutes,
        examData.is_published || false, examId
      ]);

      if (updateExamResult.rowCount === 0) {
        throw new Error('Bài thi không tồn tại.');
      }

      // --- Bước 2: XÓA TẤT CẢ các thành phần con cũ của bài thi (ĐÃ CẬP NHẬT) ---
      
      // 2.1. Tìm tất cả các Question ID thuộc về bài thi này
      const getQuestionIdsQuery = `
        SELECT q.id FROM "Questions" q
        JOIN "Subsections" ss ON q.subsection_id = ss.id
        JOIN "Sections" s ON ss.section_id = s.id
        WHERE s.exam_id = $1;
      `;
      const questionsResult = await client.query(getQuestionIdsQuery, [examId]);
      const questionIdsToDelete = questionsResult.rows.map(row => row.id);

      // 2.2. Nếu có câu hỏi nào tồn tại, xóa các bản ghi phụ thuộc của chúng trước
      if (questionIdsToDelete.length > 0) {
        // Xóa các bản ghi trong Correct_Answers
        await client.query(`DELETE FROM "Correct_Answers" WHERE question_id = ANY($1::uuid[])`, [questionIdsToDelete]);
        
        // Xóa các bản ghi trong Explanations
        await client.query(`DELETE FROM "Explanations" WHERE question_id = ANY($1::uuid[])`, [questionIdsToDelete]);
      }

      // 2.3. Bây giờ mới xóa Sections. ON DELETE CASCADE sẽ lo phần còn lại (Subsections, Prompts, Questions, Options, Prompt_Questions)
      await client.query(`DELETE FROM "Sections" WHERE exam_id = $1`, [examId]);


      // --- Bước 3: TẠO LẠI toàn bộ cấu trúc từ payload mới ---
      // (Phần code này giữ nguyên, không cần thay đổi)
      for (const section of examData.sections || []) {
        const sectionQuery = `
          INSERT INTO "Sections" (exam_id, name, "order", time_minutes, description, audio_url)
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
        `;
        const sectionResult = await client.query(sectionQuery, [
          examId, section.name, section.order, section.time_minutes,
          section.description, section.audio_url
        ]);
        const newSectionId = sectionResult.rows[0].id;
        idMap.set(section.id, newSectionId);

        for (const subsection of section.subsections || []) {
          const subsectionQuery = `
            INSERT INTO "Subsections" (section_id, name, "order", audio_url, description)
            VALUES ($1, $2, $3, $4, $5) RETURNING id;
          `;
          const subsectionResult = await client.query(subsectionQuery, [
            newSectionId, subsection.name, subsection.order,
            subsection.audio_url, subsection.description
          ]);
          const newSubsectionId = subsectionResult.rows[0].id;
          idMap.set(subsection.id, newSubsectionId);
          
          for (const prompt of subsection.prompts || []) {
            const promptQuery = `
              INSERT INTO "Prompts" (subsection_id, content, image, audio_url, "order")
              VALUES ($1, $2, $3, $4, $5) RETURNING id;
            `;
            const promptResult = await client.query(promptQuery, [
              newSubsectionId, prompt.content, prompt.image,
              prompt.audio_url, prompt.order
            ]);
            const newPromptId = promptResult.rows[0].id;
            idMap.set(prompt.id, newPromptId);
          }
          
          for (const question of subsection.questions || []) {
            const actualPromptId = question.prompt_id ? idMap.get(question.prompt_id) : null;
              
            const questionQuery = `
              INSERT INTO "Questions" (subsection_id, question_type_id, "order", content, image_url, audio_url, points)
              VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
            `;
            const questionResult = await client.query(questionQuery, [
              newSubsectionId, question.question_type_id, question.order,
              question.content, question.image_url, question.audio_url, question.points
            ]);
            const newQuestionId = questionResult.rows[0].id;
            idMap.set(question.id, newQuestionId);

            if (actualPromptId) {
                await client.query(
                    `INSERT INTO "Prompt_Questions" (prompt_id, question_id) VALUES ($1, $2)`,
                    [actualPromptId, newQuestionId]
                );
            }

            for (const option of question.options || []) {
              const optionQuery = `
                INSERT INTO "Options" (question_id, label, content, image_url, audio_url, is_correct, "order")
                VALUES ($1, $2, $3, $4, $5, $6, $7);
              `;
              await client.query(optionQuery, [
                newQuestionId, option.label, option.content, option.image_url,
                option.audio_url, option.is_correct, option.order
              ]);
            }

            for (const answer of question.correct_answers || []) {
                await client.query(
                    `INSERT INTO "Correct_Answers" (question_id, answer) VALUES ($1, $2)`,
                    [newQuestionId, answer.answer]
                );
            }
            
            if (question.explanation && question.explanation.content) {
                await client.query(
                    `INSERT INTO "Explanations" (question_id, content) VALUES ($1, $2)`,
                    [newQuestionId, question.explanation.content]
                );
            }
          }
        }
      }

      await client.query('COMMIT');
      return { id: examId, ...examData };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Lỗi transaction khi cập nhật bài thi:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  setDeletedStatus: async (examId, isDeleted) => {
    const queryText = `
      UPDATE "Exams"
      SET is_deleted = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;
    const result = await db.query(queryText, [isDeleted, examId]);
    return result.rows[0];
  },

  hardDelete: async (examId) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      // --- Xóa từ dưới lên trên ---
      
      // 1. Tìm tất cả Question IDs thuộc bài thi
      const getQuestionIdsQuery = `
        SELECT q.id FROM "Questions" q
        JOIN "Subsections" ss ON q.subsection_id = ss.id
        JOIN "Sections" s ON ss.section_id = s.id
        WHERE s.exam_id = $1;
      `;
      const questionsResult = await client.query(getQuestionIdsQuery, [examId]);
      const questionIdsToDelete = questionsResult.rows.map(row => row.id);

      // 2. Nếu có câu hỏi, xóa các thành phần con của chúng trước
      if (questionIdsToDelete.length > 0) {
        await client.query(`DELETE FROM "Options" WHERE question_id = ANY($1::uuid[])`, [questionIdsToDelete]);
        await client.query(`DELETE FROM "Prompt_Questions" WHERE question_id = ANY($1::uuid[])`, [questionIdsToDelete]);
        await client.query(`DELETE FROM "Correct_Answers" WHERE question_id = ANY($1::uuid[])`, [questionIdsToDelete]);
        await client.query(`DELETE FROM "Explanations" WHERE question_id = ANY($1::uuid[])`, [questionIdsToDelete]);
        // Thêm các bảng con khác của Questions nếu có...
      }

      // 3. Xóa Questions, Prompts, Subsections, Sections
      // Cách an toàn nhất là xóa theo thứ tự ngược lại của sự phụ thuộc
      const getSubsectionsIdsQuery = `SELECT ss.id FROM "Subsections" ss JOIN "Sections" s ON ss.section_id = s.id WHERE s.exam_id = $1`;
      const subsectionsResult = await client.query(getSubsectionsIdsQuery, [examId]);
      const subsectionIds = subsectionsResult.rows.map(r => r.id);

      if (subsectionIds.length > 0) {
        await client.query(`DELETE FROM "Questions" WHERE subsection_id = ANY($1::uuid[])`, [subsectionIds]);
        await client.query(`DELETE FROM "Prompts" WHERE subsection_id = ANY($1::uuid[])`, [subsectionIds]);
      }
      
      const getSectionsIdsQuery = `SELECT s.id FROM "Sections" s WHERE s.exam_id = $1`;
      const sectionsResult = await client.query(getSectionsIdsQuery, [examId]);
      const sectionIds = sectionsResult.rows.map(r => r.id);

      if (sectionIds.length > 0) {
        await client.query(`DELETE FROM "Subsections" WHERE section_id = ANY($1::uuid[])`, [sectionIds]);
      }

      await client.query(`DELETE FROM "Sections" WHERE exam_id = $1`, [examId]);

      // 4. Cuối cùng, xóa Exam
      const deleteResult = await client.query(`DELETE FROM "Exams" WHERE id = $1;`, [examId]);

      await client.query('COMMIT');
      return deleteResult.rowCount;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Lỗi transaction khi xóa vĩnh viễn bài thi:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  findPublicDetailsById: async (examId) => {
      const query = `
        SELECT id, name, description, instructions, total_time_minutes, total_questions
        FROM "Exams"
        WHERE id = $1 AND is_deleted = false AND is_published = true;
      `;
      const result = await db.query(query, [examId]);
      return result.rows[0];
  },

  

  getCompleteExamById: async (examId, includeAnswers = true) => {
    // 1. Lấy thông tin cơ bản của bài thi
    const exam = await examModel.findExamById(examId);
    if (!exam) {
      throw new Error('Bài thi không tồn tại.');
    }

    // 2. Lấy tất cả các thành phần con
    const components = await examModel.findAllComponentsByExamId(examId);
    const { sections, subsections, prompts, questions, options, explanations, correctAnswers, promptQuestions } = components;

    // 3. Tái cấu trúc dữ liệu (phiên bản an toàn hơn)

    // Ánh xạ câu hỏi với các thành phần của nó
    const questionsMap = new Map();
    // Kiểm tra xem questions có phải là mảng không
    if (Array.isArray(questions)) {
      for (const q of questions) {
        q.options = [];
        q.correct_answers = [];
        q.explanation = null;
        questionsMap.set(q.id, q);
      }
    }

    // Gắn options vào questions
    if (Array.isArray(options)) {
        for (const opt of options) {
            if (questionsMap.has(opt.question_id)) {
                questionsMap.get(opt.question_id).options.push(opt);
            }
        }
    }

    // Gắn explanations vào questions
    if (Array.isArray(explanations)) {
        for (const exp of explanations) {
            if (questionsMap.has(exp.question_id)) {
                questionsMap.get(exp.question_id).explanation = exp;
            }
        }
    }
    
    // Gắn correctAnswers vào questions
    if (Array.isArray(correctAnswers)) {
        for (const ca of correctAnswers) {
            if (questionsMap.has(ca.question_id)) {
                questionsMap.get(ca.question_id).correct_answers.push(ca);
            }
        }
    }

    // Chuẩn bị các cấu trúc map khác
    const promptsMap = new Map();
    if (Array.isArray(prompts)) {
      for (const p of prompts) {
        p.questions = [];
        promptsMap.set(p.id, p);
      }
    }
    
    const promptQuestionLinks = new Map();
    if (Array.isArray(promptQuestions)) {
        for(const pq of promptQuestions) {
            if (!promptQuestionLinks.has(pq.prompt_id)) {
                promptQuestionLinks.set(pq.prompt_id, []);
            }
            promptQuestionLinks.get(pq.prompt_id).push(pq.question_id);
        }
    }

    const subsectionsMap = new Map();
    if (Array.isArray(subsections)) {
      for (const sub of subsections) {
        sub.prompts = [];
        sub.questions = [];
        subsectionsMap.set(sub.id, sub);
      }
    }
    
    // Gắn questions vào subsections hoặc prompts
    for (const [questionId, question] of questionsMap.entries()) {
        const promptId = [...promptQuestionLinks.entries()].find(([key, val]) => val.includes(questionId))?.[0];
        if (promptId && promptsMap.has(promptId)) {
            // Câu hỏi này thuộc về một prompt, sẽ được xử lý ở bước sau
        } else if (subsectionsMap.has(question.subsection_id)) {
            subsectionsMap.get(question.subsection_id).questions.push(question);
        }
    }

    // Gắn prompts (đã chứa questions) vào subsections
    for (const [promptId, questionIds] of promptQuestionLinks.entries()) {
        if(promptsMap.has(promptId)){
            const prompt = promptsMap.get(promptId);
            for(const qid of questionIds) {
                if(questionsMap.has(qid)){
                    prompt.questions.push(questionsMap.get(qid));
                }
            }
             if (subsectionsMap.has(prompt.subsection_id)) {
                // Lấy subsection từ map và push prompt vào
                const subsection = subsectionsMap.get(prompt.subsection_id);
                if (subsection) {
                    subsection.prompts.push(prompt);
                }
             }
        }
    }

    // Gắn subsections vào sections
    const sectionsMap = new Map();
    if (Array.isArray(sections)) {
        for (const sec of sections) {
            sec.subsections = [];
            sectionsMap.set(sec.id, sec);
        }

        for (const [subId, sub] of subsectionsMap.entries()) {
            if (sectionsMap.has(sub.section_id)) {
                sectionsMap.get(sub.section_id).subsections.push(sub);
            }
        }
    }

    // Lọc bỏ đáp án nếu không được yêu cầu
    if (!includeAnswers) {
        questionsMap.forEach(q => {
            delete q.correct_answer; // Xóa cả trường này nếu có
            delete q.correct_answers;
            delete q.explanation;
            if (Array.isArray(q.options)) {
                q.options.forEach(opt => delete opt.is_correct);
            }
        });
    }

    exam.sections = Array.isArray(sections) ? sections : [];
    
    return exam;
  },

  findTopScoresForExam: async (examId, limit) => {
    const queryText = `
      SELECT
        u.id as user_id,
        u.name as user_name,
        u.avatar_url as user_avatar,
        u.level as user_level,
        MAX(uea.score_total) as max_score -- Lấy điểm cao nhất của mỗi người
      FROM "User_Exam_Attempts" uea
      JOIN "Users" u ON uea.user_id = u.id
      WHERE uea.exam_id = $1 AND uea.end_time IS NOT NULL -- Chỉ xét các bài đã nộp
      GROUP BY u.id -- Nhóm theo người dùng
      ORDER BY max_score DESC, u.name ASC -- Sắp xếp theo điểm giảm dần, sau đó theo tên
      LIMIT $2;
    `;
    
    const result = await db.query(queryText, [examId, limit]);
    
    return result.rows;
  },

  



};

module.exports = examModel;