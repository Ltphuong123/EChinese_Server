// file: services/examService.js

const examModel = require("../models/examModel");
const attemptModel = require("../models/attemptModel");

const { v4: uuidv4 } = require("uuid");

const examService = {
  createFullExam: async (examData, userId) => {
    // Service này có thể thêm các logic validation phức tạp trước khi gọi model
    // Ví dụ: kiểm tra xem exam_type_id có tồn tại không, v.v.
    // Hiện tại, chúng ta chỉ cần truyền dữ liệu xuống.
    const newExam = await examModel.createFullExam(examData, userId);
    return newExam;
  },

  getExamById: async (id) => {
    const exam = await examModel.findById(id);
    if (!exam) {
      throw new Error("Bài thi không tồn tại.");
    }
    return exam;
  },

  getPaginatedExams: async (filters) => {
    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    // Sử dụng toán tử spread (...) để truyền TẤT CẢ các bộ lọc xuống model,
    // đồng thời thêm/ghi đè thuộc tính `offset` đã được tính toán.
    const { exams, totalItems } = await examModel.findAllPaginatedAdmin({
      ...filters,
      offset,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: exams,
      meta: {
        page,
        limit,
        total: totalItems,
        totalPages,
      },
    };
  },

  updateFullExam: async (examId, examData, userId) => {
    const db = require("../config/db");

    // Kiểm tra xem có ai đã làm bài thi này chưa
    const attemptCheckResult = await db.query(
      'SELECT COUNT(*) as count FROM "User_Exam_Attempts" WHERE exam_id = $1',
      [examId]
    );
    const hasAttempts = parseInt(attemptCheckResult.rows[0].count) > 0;

    if (!hasAttempts) {
      // ===== TRƯỜNG HỢP 1: CHƯA CÓ AI LÀM BÀI =====
      // Unpublish trước khi sửa
      await examModel.updateStatus(examId, { is_published: false });

      // Sửa bình thường
      const updatedExam = await examModel.updateFullExam(
        examId,
        examData,
        userId
      );

      if (!updatedExam) {
        throw new Error("Bài thi không tồn tại.");
      }

      // Thêm version_at vào response
      updatedExam.version_at = null;

      // Trả về mảng chỉ có 1 đề thi
      return [updatedExam];
    } else {
      // ===== TRƯỜNG HỢP 2: ĐÃ CÓ NGƯỜI LÀM BÀI =====
      const client = await db.pool.connect();

      try {
        await client.query("BEGIN");

        // 1. Lấy thông tin bài thi cũ
        const oldExamResult = await client.query(
          'SELECT * FROM "Exams" WHERE id = $1',
          [examId]
        );

        if (oldExamResult.rows.length === 0) {
          throw new Error("Bài thi không tồn tại.");
        }

        const oldExam = oldExamResult.rows[0];

        // 2. Unpublish bài thi cũ và set version_at
        const versionAtTime = new Date();
        await client.query(
          `UPDATE "Exams" 
           SET is_published = false, 
               version_at = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [examId, versionAtTime]
        );

        // 3. Lấy cấu trúc đầy đủ của bài thi cũ
        const oldExamFull = await examModel.findById(examId);
        oldExamFull.version_at = versionAtTime;

        // 4. Chuẩn bị dữ liệu cho bài thi mới
        const newExamData = {
          ...examData,
          name: oldExam.name, // Giữ nguyên tên cũ
          exam_type_id: oldExam.exam_type_id,
          exam_level_id: oldExam.exam_level_id,
          is_published: false, // Unpublish bản mới
        };

        // 5. Tạo bài thi mới với cấu trúc đã cập nhật
        const newExam = await examModel.createFullExam(newExamData, userId);

        await client.query("COMMIT");

        // Thêm version_at vào response
        newExam.version_at = null;

        // Trả về mảng gồm 2 đề thi: [đề cũ, đề mới]
        return [oldExamFull, newExam];
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  },

  duplicateExam: async (examIdToCopy, userId) => {
    // --- Bước 1: Đọc toàn bộ cấu trúc của bài thi gốc ---
    // Tái sử dụng hàm findById đã viết, nó trả về đúng cấu trúc JSON chúng ta cần
    const originalExam = await examModel.findById(examIdToCopy);

    if (!originalExam) {
      throw new Error("Bài thi gốc không tồn tại.");
    }

    // --- Bước 2: Chuẩn bị dữ liệu cho bài thi mới ---
    const newExamData = { ...originalExam };

    // Chỉnh sửa các thông tin cần thiết
    newExamData.name = `${originalExam.name} (Bản sao)`;
    newExamData.is_published = false; // Mặc định bản sao là bản nháp

    // Xóa các ID và timestamp cũ để database tự tạo mới
    delete newExamData.id;
    delete newExamData.created_at;
    delete newExamData.updated_at;

    // Cần xóa ID của tất cả các thành phần con để chúng được tạo mới
    // Hàm này sẽ đệ quy qua toàn bộ cấu trúc
    const cleanIds = (obj) => {
      if (Array.isArray(obj)) {
        obj.forEach(cleanIds);
      } else if (obj && typeof obj === "object") {
        // Giữ lại ID của prompt để mapping, nhưng xóa ID của các thực thể khác
        if (!obj.hasOwnProperty("content")) {
          // Giả định prompt luôn có 'content'
          delete obj.id;
        }
        delete obj.created_at;
        delete obj.updated_at;
        // Các trường khóa ngoại trỏ đến ID cha cũng sẽ được tạo lại, không cần xóa
        // Ví dụ: section_id, subsection_id, question_id...

        Object.values(obj).forEach(cleanIds);
      }
    };

    // Tạo ID tạm thời mới cho các prompt để logic mapping trong createFullExam hoạt động
    const remapPromptIds = (sections) => {
      if (!sections) return;
      sections.forEach((section) => {
        if (!section.subsections) return;
        section.subsections.forEach((subsection) => {
          const oldToNewPromptIdMap = new Map();
          if (subsection.prompts) {
            subsection.prompts.forEach((prompt) => {
              const oldId = prompt.id;
              const newTempId = `temp_prompt_${Date.now()}_${Math.random()}`;
              prompt.id = newTempId;
              oldToNewPromptIdMap.set(oldId, newTempId);
            });
          }
          if (subsection.questions) {
            subsection.questions.forEach((question) => {
              if (
                question.prompt_id &&
                oldToNewPromptIdMap.has(question.prompt_id)
              ) {
                question.prompt_id = oldToNewPromptIdMap.get(
                  question.prompt_id
                );
              }
            });
          }
        });
      });
    };

    remapPromptIds(newExamData.sections);
    cleanIds(newExamData.sections);

    // --- Bước 3: Tạo bài thi mới từ dữ liệu đã chuẩn bị ---
    // Tái sử dụng hàm createFullExam một cách hoàn hảo
    const duplicatedExam = await examModel.createFullExam(newExamData, userId);

    return duplicatedExam;
  },

  /////////////user
  getPublishedExams: async (filters) => {
    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    const { exams, totalItems } = await examModel.findPublishedExams({
      ...filters,
      limit,
      offset,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: exams,
      meta: {
        page,
        limit,
        total: totalItems,
        totalPages,
      },
    };
  },

  getExamDetails: async (examId, userId) => {
    // Chạy song song để tăng hiệu suất
    const [examInfo, userHistory] = await Promise.all([
      examModel.findDetailsById(examId),
      attemptModel.findHistoryByExamAndUser(examId, userId),
    ]);

    if (!examInfo) {
      throw new Error("Bài thi không tồn tại hoặc chưa được công bố.");
    }
    return { ...examInfo, userHistory };
  },

  getCompleteExamById: async (examId) => {
    // 1. Lấy thông tin cơ bản của bài thi
    const exam = await examModel.findExamById(examId);
    if (!exam) {
      throw new Error("Bài thi không tồn tại.");
    }

    // 2. Lấy tất cả các thành phần con của bài thi trong một lần gọi DB hiệu quả
    const components = await examModel.findAllComponentsByExamId(examId);
    const {
      sections,
      subsections,
      prompts,
      questions,
      options,
      explanations,
      correctAnswers,
      promptQuestions,
    } = components;

    // 3. Tái cấu trúc dữ liệu
    // Ánh xạ câu hỏi với các thành phần của nó
    const questionsMap = new Map();
    for (const q of questions) {
      q.options = [];
      q.correct_answers = [];
      q.explanation = null;
      questionsMap.set(q.id, q);
    }
    for (const opt of options) {
      if (questionsMap.has(opt.question_id)) {
        questionsMap.get(opt.question_id).options.push(opt);
      }
    }
    for (const exp of explanations) {
      if (questionsMap.has(exp.question_id)) {
        questionsMap.get(exp.question_id).explanation = exp;
      }
    }
    for (const ca of correctAnswers) {
      if (questionsMap.has(ca.question_id)) {
        questionsMap.get(ca.question_id).correct_answers.push(ca);
      }
    }

    // Ánh xạ prompt với câu hỏi
    const promptsMap = new Map();
    for (const p of prompts) {
      p.questions = [];
      promptsMap.set(p.id, p);
    }
    const promptQuestionLinks = new Map();
    for (const pq of promptQuestions) {
      if (!promptQuestionLinks.has(pq.prompt_id)) {
        promptQuestionLinks.set(pq.prompt_id, []);
      }
      promptQuestionLinks.get(pq.prompt_id).push(pq.question_id);
    }

    // Ánh xạ subsection với prompt và question
    const subsectionsMap = new Map();
    for (const sub of subsections) {
      sub.prompts = [];
      sub.questions = [];
      subsectionsMap.set(sub.id, sub);
    }
    for (const [questionId, question] of questionsMap.entries()) {
      const promptId = [...promptQuestionLinks.entries()].find(([key, val]) =>
        val.includes(questionId)
      )?.[0];
      if (promptId && promptsMap.has(promptId)) {
        // Câu hỏi này thuộc về một prompt
      } else if (subsectionsMap.has(question.subsection_id)) {
        // Câu hỏi độc lập
        subsectionsMap.get(question.subsection_id).questions.push(question);
      }
    }

    // Xử lý các câu hỏi thuộc prompt
    for (const [promptId, questionIds] of promptQuestionLinks.entries()) {
      if (promptsMap.has(promptId)) {
        const prompt = promptsMap.get(promptId);
        for (const qid of questionIds) {
          if (questionsMap.has(qid)) {
            prompt.questions.push(questionsMap.get(qid));
          }
        }
        if (subsectionsMap.has(prompt.subsection_id)) {
          subsectionsMap.get(prompt.subsection_id).prompts.push(prompt);
        }
      }
    }

    // Ánh xạ section với subsection
    const sectionsMap = new Map();
    for (const sec of sections) {
      sec.subsections = [];
      sectionsMap.set(sec.id, sec);
    }
    for (const sub of subsections) {
      if (sectionsMap.has(sub.section_id)) {
        sectionsMap.get(sub.section_id).subsections.push(sub);
      }
    }

    // Gắn các section đã được cấu trúc vào exam
    exam.sections = sections;

    return exam;
  },

  updateExam: async (examId, payload, userId) => {
    // Logic cập nhật sẽ được xử lý hoàn toàn trong model bằng transaction
    const updatedExam = await examModel.updateCompleteExam(
      examId,
      payload,
      userId
    );
    return updatedExam;
  },

  /**
   * Đặt trạng thái công bố (published) cho một bài thi.
   * @param {string} examId - ID của bài thi.
   * @param {boolean} isPublished - Trạng thái mới (true hoặc false).
   * @returns {Promise<object>} Toàn bộ cấu trúc bài thi đã được cập nhật.
   */
  setPublishedStatus: async (examId, isPublished) => {
    // Bước 1: Cập nhật trạng thái
    const updatedExamStatus = await examModel.updateStatus(examId, {
      is_published: isPublished,
    });
    if (!updatedExamStatus) {
      throw new Error("Bài thi không tồn tại.");
    }

    // Bước 2: Lấy lại toàn bộ cấu trúc bài thi bằng hàm findById đã có
    const fullExamStructure = await examModel.findById(examId);

    return fullExamStructure;
  },

  /**
   * Đặt trạng thái xóa mềm (deleted) cho một bài thi.
   * @param {string} examId - ID của bài thi.
   * @param {boolean} isDeleted - Trạng thái mới (true hoặc false).
   * @returns {Promise<object|null>} Toàn bộ cấu trúc bài thi nếu khôi phục, null nếu xóa.
   */
  setDeletedStatus: async (examId, isDeleted) => {
    const statusToUpdate = { is_deleted: isDeleted };
    // Khi xóa mềm, tự động hủy công bố.
    // Khi khôi phục, tự động đặt về trạng thái nháp.
    if (isDeleted) {
      statusToUpdate.is_published = false;
    } else {
      statusToUpdate.is_published = false;
    }

    // Bước 1: Cập nhật trạng thái
    const updatedExamStatus = await examModel.updateStatus(
      examId,
      statusToUpdate
    );
    if (!updatedExamStatus) {
      throw new Error("Bài thi không tồn tại.");
    }

    const fullExamStructure = await examModel.findById(examId);
    return fullExamStructure;
  },

  forceDeleteExam: async (examId) => {
    const deletedCount = await examModel.hardDelete(examId);
    if (deletedCount === 0) {
      throw new Error("Bài thi không tồn tại.");
    }
  },

  // duplicateExam: async (examIdToCopy, newName, userId) => {
  //   // 1. Lấy toàn bộ dữ liệu của bài thi gốc
  //   const originalExam = await examService.getCompleteExamById(examIdToCopy);
  //   if (!originalExam) {
  //     throw new Error('Bài thi gốc không tồn tại.');
  //   }

  //   // 2. Chuẩn bị payload mới để tạo bài thi sao chép

  //   // Tạo một hàm đệ quy để xóa các ID cũ và tạo ID mới cho tất cả các cấp
  //   const preparePayload = (data) => {
  //       // Ánh xạ ID cũ -> ID mới
  //       const idMap = new Map();

  //       const generateNewIds = (obj) => {
  //           if (obj && typeof obj === 'object') {
  //               if (obj.id) {
  //                   const oldId = obj.id;
  //                   const newId = uuidv4();
  //                   obj.id = newId;
  //                   idMap.set(oldId, newId);
  //               }

  //               // Xử lý các khóa ngoại
  //               if (obj.section_id) obj.section_id = idMap.get(obj.section_id);
  //               if (obj.subsection_id) obj.subsection_id = idMap.get(obj.subsection_id);
  //               if (obj.question_id) obj.question_id = idMap.get(obj.question_id);
  //               if (obj.prompt_id) obj.prompt_id = idMap.get(obj.prompt_id);

  //               // Lặp qua tất cả các khóa của object
  //               for (const key in obj) {
  //                   if (Array.isArray(obj[key])) {
  //                       // Nếu là mảng, lặp qua các phần tử
  //                       obj[key].forEach(item => generateNewIds(item));
  //                   } else if (obj[key] && typeof obj[key] === 'object') {
  //                       // Nếu là object, gọi đệ quy
  //                       generateNewIds(obj[key]);
  //                   }
  //               }
  //           }
  //       };

  //       generateNewIds(data);
  //       return data;
  //   }

  //   // Xóa các thông tin không cần thiết và cập nhật thông tin mới
  //   delete originalExam.id;
  //   delete originalExam.created_at;
  //   delete originalExam.updated_at;
  //   delete originalExam.created_by; // Sẽ được gán lại bởi hàm create
  //   originalExam.name = newName;
  //   originalExam.is_published = false; // Bản sao chép mặc định là bản nháp

  //   const newPayload = preparePayload(originalExam);

  //   // 3. Gọi hàm tạo bài thi mới với payload đã được chuẩn bị
  //   // Hàm createExam sẽ sử dụng model `createCompleteExam` để tạo trong một transaction
  //   const newExam = await examService.createExam(newPayload, userId);

  //   return newExam;
  // },

  // getPaginatedExams: async (filters) => {
  //   const { page, limit } = filters;
  //   const offset = (page - 1) * limit;

  //   const { exams, totalItems } = await examModel.findAllPaginated({
  //     ...filters,
  //     limit,
  //     offset,
  //   });

  //   const totalPages = Math.ceil(totalItems / limit);

  //   return {
  //     data: exams,
  //     meta: {
  //       page,
  //       limit,
  //       total: totalItems,
  //       totalPages,
  //     }
  //   };
  // },

  getPublicDetailsById: async (examId) => {
    const details = await examModel.findPublicDetailsById(examId);
    if (!details) {
      throw new Error("Bài thi không tồn tại hoặc chưa được công bố.");
    }
    return details;
  },

  getLeaderboardForExam: async (examId) => {
    // 1. Kiểm tra xem bài thi có tồn tại không
    const examExists = await examModel.findExamById(examId);
    if (!examExists) {
      throw new Error("Bài thi không tồn tại.");
    }

    // 2. Gọi model để lấy dữ liệu bảng xếp hạng
    const leaderboard = await examModel.findTopScoresForExam(examId, 10); // Lấy top 10

    return leaderboard;
  },

  /**
   * Kiểm tra xem đề thi đã có người làm chưa
   * @param {string} examId - ID của đề thi
   * @returns {Promise<object>} Thông tin về số lượng người đã làm
   */
  checkExamHasAttempts: async (examId) => {
    const db = require("../config/db");

    // Kiểm tra đề thi có tồn tại không
    const examExists = await examModel.findExamById(examId);
    if (!examExists) {
      throw new Error("Bài thi không tồn tại.");
    }

    // Đếm số lượng attempts
    const result = await db.query(
      `SELECT 
        COUNT(*) as total_attempts,
        COUNT(DISTINCT user_id) as unique_users,
        MIN(start_time) as first_attempt_at,
        MAX(start_time) as last_attempt_at
       FROM "User_Exam_Attempts" 
       WHERE exam_id = $1`,
      [examId]
    );

    const stats = result.rows[0];
    const hasAttempts = parseInt(stats.total_attempts) > 0;

    return {
      exam_id: examId,
      has_attempts: hasAttempts,
      total_attempts: parseInt(stats.total_attempts),
      unique_users: parseInt(stats.unique_users),
      first_attempt_at: stats.first_attempt_at,
      last_attempt_at: stats.last_attempt_at,
    };
  },
};

module.exports = examService;
