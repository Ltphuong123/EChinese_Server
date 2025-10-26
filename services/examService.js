// file: services/examService.js

const examModel = require('../models/examModel');
const { v4: uuidv4 } = require('uuid'); 

const examService = {
  createExam: async (payload, userId) => {
    // Service có thể thực hiện validation ở đây
    // Ví dụ: kiểm tra xem exam_type_id và exam_level_id có tồn tại không.
    // (Để đơn giản, ví dụ này bỏ qua bước đó)
    
    const newExam = await examModel.createCompleteExam(payload, userId);
    return newExam;
  },

  getCompleteExamById: async (examId) => {
    // 1. Lấy thông tin cơ bản của bài thi
    const exam = await examModel.findExamById(examId);
    if (!exam) {
      throw new Error('Bài thi không tồn tại.');
    }

    // 2. Lấy tất cả các thành phần con của bài thi trong một lần gọi DB hiệu quả
    const components = await examModel.findAllComponentsByExamId(examId);
    const { sections, subsections, prompts, questions, options, explanations, correctAnswers, promptQuestions } = components;
    
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
    for(const pq of promptQuestions) {
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
        const promptId = [...promptQuestionLinks.entries()].find(([key, val]) => val.includes(questionId))?.[0];
        if (promptId && promptsMap.has(promptId)) {
            // Câu hỏi này thuộc về một prompt
        } else if (subsectionsMap.has(question.subsection_id)) {
            // Câu hỏi độc lập
            subsectionsMap.get(question.subsection_id).questions.push(question);
        }
    }

    // Xử lý các câu hỏi thuộc prompt
    for (const [promptId, questionIds] of promptQuestionLinks.entries()) {
        if(promptsMap.has(promptId)){
            const prompt = promptsMap.get(promptId);
            for(const qid of questionIds) {
                if(questionsMap.has(qid)){
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

  getPaginatedExams: async (filters) => {
    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    // Sử dụng toán tử spread (...) để truyền TẤT CẢ các bộ lọc xuống model,
    // đồng thời thêm/ghi đè thuộc tính `offset` đã được tính toán.
    const { exams, totalItems } = await examModel.findAllPaginated({
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
      }
    };
  },

  updateExam: async (examId, payload, userId) => {
    // Logic cập nhật sẽ được xử lý hoàn toàn trong model bằng transaction
    const updatedExam = await examModel.updateCompleteExam(examId, payload, userId);
    return updatedExam;
  },

  setExamDeletedStatus: async (examId, isDeleted) => {
    const updatedExam = await examModel.setDeletedStatus(examId, isDeleted);
    if (!updatedExam) {
      throw new Error('Bài thi không tồn tại.');
    }
    return updatedExam;
  },

  forceDeleteExam: async (examId) => {
    const deletedCount = await examModel.hardDelete(examId);
    if (deletedCount === 0) {
      throw new Error('Bài thi không tồn tại.');
    }
  },

  duplicateExam: async (examIdToCopy, newName, userId) => {
    // 1. Lấy toàn bộ dữ liệu của bài thi gốc
    const originalExam = await examService.getCompleteExamById(examIdToCopy);
    if (!originalExam) {
      throw new Error('Bài thi gốc không tồn tại.');
    }

    // 2. Chuẩn bị payload mới để tạo bài thi sao chép
    
    // Tạo một hàm đệ quy để xóa các ID cũ và tạo ID mới cho tất cả các cấp
    const preparePayload = (data) => {
        // Ánh xạ ID cũ -> ID mới
        const idMap = new Map();

        const generateNewIds = (obj) => {
            if (obj && typeof obj === 'object') {
                if (obj.id) {
                    const oldId = obj.id;
                    const newId = uuidv4();
                    obj.id = newId;
                    idMap.set(oldId, newId);
                }

                // Xử lý các khóa ngoại
                if (obj.section_id) obj.section_id = idMap.get(obj.section_id);
                if (obj.subsection_id) obj.subsection_id = idMap.get(obj.subsection_id);
                if (obj.question_id) obj.question_id = idMap.get(obj.question_id);
                if (obj.prompt_id) obj.prompt_id = idMap.get(obj.prompt_id);


                // Lặp qua tất cả các khóa của object
                for (const key in obj) {
                    if (Array.isArray(obj[key])) {
                        // Nếu là mảng, lặp qua các phần tử
                        obj[key].forEach(item => generateNewIds(item));
                    } else if (obj[key] && typeof obj[key] === 'object') {
                        // Nếu là object, gọi đệ quy
                        generateNewIds(obj[key]);
                    }
                }
            }
        };

        generateNewIds(data);
        return data;
    }

    // Xóa các thông tin không cần thiết và cập nhật thông tin mới
    delete originalExam.id;
    delete originalExam.created_at;
    delete originalExam.updated_at;
    delete originalExam.created_by; // Sẽ được gán lại bởi hàm create
    originalExam.name = newName;
    originalExam.is_published = false; // Bản sao chép mặc định là bản nháp

    const newPayload = preparePayload(originalExam);


    // 3. Gọi hàm tạo bài thi mới với payload đã được chuẩn bị
    // Hàm createExam sẽ sử dụng model `createCompleteExam` để tạo trong một transaction
    const newExam = await examService.createExam(newPayload, userId);

    return newExam;
  },




    getPaginatedExams: async (filters) => {
        // ... (Hàm này đã có, chỉ cần đảm bảo nó có thể nhận `is_published`)
        const { page, limit } = filters;
        const offset = (page - 1) * limit;

        const { exams, totalItems } = await examModel.findAllPaginated({ ...filters, offset });
        
        const totalPages = Math.ceil(totalItems / limit);

        return { data: exams, meta: { page, limit, total: totalItems, totalPages } };
    },

    getPublicDetailsById: async (examId) => {
        const details = await examModel.findPublicDetailsById(examId);
        if (!details) {
        throw new Error('Bài thi không tồn tại hoặc chưa được công bố.');
        }
        return details;
    },
    
    // Sửa đổi hàm này để có tùy chọn không lấy đáp án
  getCompleteExamById: async (examId, includeAnswers = true) => {
    // 1. Lấy thông tin cơ bản của bài thi
    const exam = await examModel.findExamById(examId);
    if (!exam) {
      throw new Error('Bài thi không tồn tại.');
    }

    // 2. Lấy tất cả các thành phần con của bài thi
    const components = await examModel.findAllComponentsByExamId(examId);
    const { sections, subsections, prompts, questions, options, explanations, correctAnswers, promptQuestions } = components;
    
    // 3. Tái cấu trúc dữ liệu (phiên bản an toàn)

    const questionsMap = new Map();
    if (Array.isArray(questions)) {
      for (const q of questions) {
        q.options = [];
        q.correct_answers = [];
        q.explanation = null;
        questionsMap.set(q.id, q);
      }
    }

    if (Array.isArray(options)) {
      for (const opt of options) {
        if (questionsMap.has(opt.question_id)) {
          questionsMap.get(opt.question_id).options.push(opt);
        }
      }
    }

    if (Array.isArray(explanations)) {
      for (const exp of explanations) {
        if (questionsMap.has(exp.question_id)) {
          questionsMap.get(exp.question_id).explanation = exp;
        }
      }
    }
    
    if (Array.isArray(correctAnswers)) {
      for (const ca of correctAnswers) {
        if (questionsMap.has(ca.question_id)) {
          questionsMap.get(ca.question_id).correct_answers.push(ca);
        }
      }
    }

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
    
    for (const [questionId, question] of questionsMap.entries()) {
      const promptId = [...promptQuestionLinks.entries()].find(([key, val]) => val.includes(questionId))?.[0];
      if (promptId && promptsMap.has(promptId)) {
        // Câu hỏi này thuộc về một prompt, sẽ được xử lý ở bước sau
      } else if (subsectionsMap.has(question.subsection_id)) {
        const subsection = subsectionsMap.get(question.subsection_id);
        if (subsection) {
            subsection.questions.push(question);
        }
      }
    }

    for (const [promptId, questionIds] of promptQuestionLinks.entries()) {
      if(promptsMap.has(promptId)){
        const prompt = promptsMap.get(promptId);
        if (prompt) {
            for(const qid of questionIds) {
                if(questionsMap.has(qid)){
                    prompt.questions.push(questionsMap.get(qid));
                }
            }
            if (subsectionsMap.has(prompt.subsection_id)) {
              const subsection = subsectionsMap.get(prompt.subsection_id);
              if (subsection) {
                  subsection.prompts.push(prompt);
              }
            }
        }
      }
    }

    const sectionsMap = new Map();
    if (Array.isArray(sections)) {
      for (const sec of sections) {
        sec.subsections = [];
        sectionsMap.set(sec.id, sec);
      }

      for (const [subId, sub] of subsectionsMap.entries()) {
        if (sectionsMap.has(sub.section_id)) {
          const section = sectionsMap.get(sub.section_id);
          if (section) {
              section.subsections.push(sub);
          }
        }
      }
    }

    // Gán kết quả cuối cùng
    exam.sections = Array.isArray(sections) ? sections : [];

    // 4. Lọc bỏ đáp án nếu không được yêu cầu (sau khi đã tái cấu trúc xong)
    if (!includeAnswers) {
      questionsMap.forEach(q => {
        delete q.correct_answers;
        delete q.explanation;
        if (Array.isArray(q.options)) {
          q.options.forEach(opt => delete opt.is_correct);
        }
      });
    }
    
    return exam;
  },     
  
  getLeaderboardForExam: async (examId) => {
    // 1. Kiểm tra xem bài thi có tồn tại không
    const examExists = await examModel.findExamById(examId);
    if (!examExists) {
      throw new Error('Bài thi không tồn tại.');
    }

    // 2. Gọi model để lấy dữ liệu bảng xếp hạng
    const leaderboard = await examModel.findTopScoresForExam(examId, 3); // Lấy top 3
    
    return leaderboard;
  },
  

};


module.exports = examService;