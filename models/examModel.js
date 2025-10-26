// file: models/examModel.js

const db = require('../config/db');

const examModel = {
  createCompleteExam: async (examData, createdByUserId) => {
    const client = await db.pool.connect();

    // Ánh xạ để theo dõi ID mới được tạo, so với ID cũ từ frontend
    const idMap = new Map();

    try {
      await client.query('BEGIN');

      // --- 1. Tạo Exam ---
      const examQuery = `
        INSERT INTO "Exams" (exam_type_id, exam_level_id, name, description, instructions, total_time_minutes, is_published, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;
      `;
      const examResult = await client.query(examQuery, [
        examData.exam_type_id, examData.exam_level_id, examData.name,
        examData.description, examData.instructions, examData.total_time_minutes,
        examData.is_published || false, createdByUserId
      ]);
      const newExamId = examResult.rows[0].id;
      idMap.set(examData.id, newExamId);

      // --- 2. Lặp qua các Sections ---
      for (const section of examData.sections || []) {
        const sectionQuery = `
          INSERT INTO "Sections" (exam_id, name, "order", time_minutes, description, audio_url)
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
        `;
        const sectionResult = await client.query(sectionQuery, [
          newExamId, section.name, section.order, section.time_minutes,
          section.description, section.audio_url
        ]);
        const newSectionId = sectionResult.rows[0].id;
        idMap.set(section.id, newSectionId);

        // --- 3. Lặp qua các Subsections ---
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

          // --- 4. Lặp qua các Prompts ---
          for (const prompt of subsection.prompts || []) {
            const promptQuery = `
              INSERT INTO "Prompts" (subsection_id, content, image, audio_url, "order")
              VALUES ($1, $2, $3, $4, $5) RETURNING id;
            `;
            const promptResult = await client.query(promptQuery, [
              newSubsectionId, prompt.content, prompt.image, // Giả sử image là JSON
              prompt.audio_url, prompt.order
            ]);
            const newPromptId = promptResult.rows[0].id;
            idMap.set(prompt.id, newPromptId);
          }
          
          // --- 5. Lặp qua các Questions ---
          for (const question of subsection.questions || []) {
            // Xác định prompt_id thực tế (nếu có)
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

            // 5.1. Liên kết Question với Prompt (nếu có)
            if (actualPromptId) {
                await client.query(
                    `INSERT INTO "Prompt_Questions" (prompt_id, question_id) VALUES ($1, $2)`,
                    [actualPromptId, newQuestionId]
                );
            }

            // 5.2. Lặp qua các Options
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

            // 5.3. Lặp qua các Correct Answers (cho dạng điền từ, ghi âm)
            for (const answer of question.correct_answers || []) {
                await client.query(
                    `INSERT INTO "Correct_Answers" (question_id, answer) VALUES ($1, $2)`,
                    [newQuestionId, answer.answer]
                );
            }
            
            // 5.4. Thêm Explanation
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
      return { id: newExamId, ...examData };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Lỗi transaction khi tạo bài thi:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  findExamById: async (examId) => {
    const queryText = `SELECT * FROM "Exams" WHERE id = $1 AND is_deleted = false;`;
    const result = await db.query(queryText, [examId]);
    return result.rows[0];
  },

  findAllComponentsByExamId: async (examId) => {
    // Sử dụng Promise.all để chạy tất cả các truy vấn con song song
    const [
      sectionsRes,
      subsectionsRes,
      promptsRes,
      questionsRes,
      optionsRes,
      explanationsRes,
      correctAnswersRes,
      promptQuestionsRes
    ] = await Promise.all([
      db.query(`SELECT * FROM "Sections" WHERE exam_id = $1 AND is_deleted = false ORDER BY "order" ASC`, [examId]),
      db.query(`SELECT ss.* FROM "Subsections" ss JOIN "Sections" s ON ss.section_id = s.id WHERE s.exam_id = $1 AND ss.is_deleted = false ORDER BY ss."order" ASC`, [examId]),
      db.query(`SELECT p.* FROM "Prompts" p JOIN "Subsections" ss ON p.subsection_id = ss.id JOIN "Sections" s ON ss.section_id = s.id WHERE s.exam_id = $1 AND p.is_deleted = false ORDER BY p."order" ASC`, [examId]),
      db.query(`SELECT q.* FROM "Questions" q JOIN "Subsections" ss ON q.subsection_id = ss.id JOIN "Sections" s ON ss.section_id = s.id WHERE s.exam_id = $1 AND q.is_deleted = false ORDER BY q."order" ASC`, [examId]),
      db.query(`SELECT o.* FROM "Options" o JOIN "Questions" q ON o.question_id = q.id JOIN "Subsections" ss ON q.subsection_id = ss.id JOIN "Sections" s ON ss.section_id = s.id WHERE s.exam_id = $1 AND o.is_deleted = false ORDER BY o."order" ASC`, [examId]),
      db.query(`SELECT e.* FROM "Explanations" e JOIN "Questions" q ON e.question_id = q.id JOIN "Subsections" ss ON q.subsection_id = ss.id JOIN "Sections" s ON ss.section_id = s.id WHERE s.exam_id = $1 AND e.is_deleted = false`, [examId]),
      db.query(`SELECT ca.* FROM "Correct_Answers" ca JOIN "Questions" q ON ca.question_id = q.id JOIN "Subsections" ss ON q.subsection_id = ss.id JOIN "Sections" s ON ss.section_id = s.id WHERE s.exam_id = $1`, [examId]),
      db.query(`SELECT pq.* FROM "Prompt_Questions" pq JOIN "Prompts" p ON pq.prompt_id = p.id JOIN "Subsections" ss ON p.subsection_id = ss.id JOIN "Sections" s ON ss.section_id = s.id WHERE s.exam_id = $1`, [examId]),
    ]);

    return {
      sections: sectionsRes.rows,
      subsections: subsectionsRes.rows,
      prompts: promptsRes.rows,
      questions: questionsRes.rows,
      options: optionsRes.rows,
      explanations: explanationsRes.rows,
      correctAnswers: correctAnswersRes.rows,
      promptQuestions: promptQuestionsRes.rows
    };
  },

  findAllPaginated: async (filters) => {
    // Trích xuất tất cả các tham số cần thiết từ object filters
    const {
      limit,
      offset,
      search,
      examTypeId,
      examLevelId,
      is_published,
      is_deleted
    } = filters;
    
    const queryParams = [];
    let whereClauses = 'WHERE 1=1'; // Bắt đầu với một điều kiện luôn đúng để dễ dàng nối các điều kiện `AND`

    // Xử lý logic lọc is_deleted cho trang quản trị
    if (is_deleted === 'true') {
        whereClauses += ' AND e.is_deleted = true';
    } else if (is_deleted === 'false') {
        whereClauses += ' AND e.is_deleted = false';
    } else if (is_deleted === 'all') {
        // Không thêm điều kiện lọc is_deleted, lấy tất cả
    } else {
        // Mặc định cho trang quản trị nếu không có param: chỉ lấy các bài chưa bị xóa
        whereClauses += ' AND e.is_deleted = false';
    }

    // Lọc theo trạng thái công bố (dành cho cả trang người dùng và admin)
    if (is_published !== undefined) {
        queryParams.push(is_published);
        whereClauses += ` AND e.is_published = $${queryParams.length}`;
    }

    // Lọc theo từ khóa tìm kiếm (tên bài thi)
    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses += ` AND e.name ILIKE $${queryParams.length}`;
    }

    // Lọc theo loại bài thi
    if (examTypeId) {
      queryParams.push(examTypeId);
      whereClauses += ` AND e.exam_type_id = $${queryParams.length}`;
    }

    // Lọc theo cấp độ bài thi
    if (examLevelId) {
      queryParams.push(examLevelId);
      whereClauses += ` AND e.exam_level_id = $${queryParams.length}`;
    }
    
    const baseQuery = `
      FROM "Exams" e
      LEFT JOIN "Exam_Types" et ON e.exam_type_id = et.id
      LEFT JOIN "Exam_Levels" el ON e.exam_level_id = el.id
      ${whereClauses}
    `;

    // --- Truy vấn 1: Đếm tổng số bản ghi khớp với tất cả các điều kiện lọc ---
    const countQuery = `SELECT COUNT(e.id) ${baseQuery}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);
    
    // --- Truy vấn 2: Lấy dữ liệu thực tế đã phân trang và sắp xếp ---
    let selectQuery = `
      SELECT 
        e.*,
        et.name as exam_type_name,
        el.name as exam_level_name
      ${baseQuery}
      ORDER BY e.created_at DESC
    `;

    // Thêm LIMIT và OFFSET vào câu truy vấn và mảng tham số
    queryParams.push(limit);
    selectQuery += ` LIMIT $${queryParams.length}`;
    
    queryParams.push(offset);
    selectQuery += ` OFFSET $${queryParams.length}`;
    
    const examsResult = await db.query(selectQuery, queryParams);

    return {
      exams: examsResult.rows,
      totalItems,
    };
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

  findAllComponentsByExamId: async (examId) => {
    // Sử dụng Promise.all để chạy tất cả các truy vấn con song song
    const [
      sectionsRes,
      subsectionsRes,
      promptsRes,
      questionsRes,
      optionsRes,
      explanationsRes,
      correctAnswersRes,
      promptQuestionsRes
    ] = await Promise.all([
      db.query(`SELECT * FROM "Sections" WHERE exam_id = $1 AND is_deleted = false ORDER BY "order" ASC`, [examId]),
      db.query(`SELECT ss.* FROM "Subsections" ss JOIN "Sections" s ON ss.section_id = s.id WHERE s.exam_id = $1 AND ss.is_deleted = false ORDER BY ss."order" ASC`, [examId]),
      db.query(`SELECT p.* FROM "Prompts" p JOIN "Subsections" ss ON p.subsection_id = ss.id JOIN "Sections" s ON ss.section_id = s.id WHERE s.exam_id = $1 AND p.is_deleted = false ORDER BY p."order" ASC`, [examId]),
      db.query(`SELECT q.* FROM "Questions" q JOIN "Subsections" ss ON q.subsection_id = ss.id JOIN "Sections" s ON ss.section_id = s.id WHERE s.exam_id = $1 AND q.is_deleted = false ORDER BY q."order" ASC`, [examId]),
      db.query(`SELECT o.* FROM "Options" o JOIN "Questions" q ON o.question_id = q.id JOIN "Subsections" ss ON q.subsection_id = ss.id JOIN "Sections" s ON ss.section_id = s.id WHERE s.exam_id = $1 AND o.is_deleted = false ORDER BY o."order" ASC`, [examId]),
      db.query(`SELECT e.* FROM "Explanations" e JOIN "Questions" q ON e.question_id = q.id JOIN "Subsections" ss ON q.subsection_id = ss.id JOIN "Sections" s ON ss.section_id = s.id WHERE s.exam_id = $1 AND e.is_deleted = false`, [examId]),
      db.query(`SELECT ca.* FROM "Correct_Answers" ca JOIN "Questions" q ON ca.question_id = q.id JOIN "Subsections" ss ON q.subsection_id = ss.id JOIN "Sections" s ON ss.section_id = s.id WHERE s.exam_id = $1`, [examId]),
      db.query(`SELECT pq.* FROM "Prompt_Questions" pq JOIN "Prompts" p ON pq.prompt_id = p.id JOIN "Subsections" ss ON p.subsection_id = ss.id JOIN "Sections" s ON ss.section_id = s.id WHERE s.exam_id = $1`, [examId]),
    ]);

    return {
      sections: sectionsRes.rows,
      subsections: subsectionsRes.rows,
      prompts: promptsRes.rows,
      questions: questionsRes.rows,
      options: optionsRes.rows,
      explanations: explanationsRes.rows,
      correctAnswers: correctAnswersRes.rows,
      promptQuestions: promptQuestionsRes.rows
    };
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