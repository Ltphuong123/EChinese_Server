// file: services/attemptService.js

const attemptModel = require('../models/attemptModel');
const examModel = require('../models/examModel');
const examService = require('./examService'); 
// Cần để lấy đáp án
 // Cần để lấy đáp án
const db = require('../config/db');

const attemptService = {
  startAttempt: async (userId, examId) => {
    // Có thể thêm logic kiểm tra xem user có quyền làm bài test này không (ví dụ: đã mua, ...)
    const attemptId = await attemptModel.createAttempt(userId, examId);
    return { attemptId };
  },

  saveAnswer: async (attemptId, questionId, userResponse) => {
    // Có thể thêm logic validate câu trả lời ở đây
    await attemptModel.saveAnswer(attemptId, questionId, userResponse);
    return { success: true };
  },

  submitAndGradeAttempt: async (attemptId, userAnswers) => {
      // 1. Lấy thông tin attempt để biết examId
      const attempt = await db.query('SELECT exam_id FROM "User_Exam_Attempts" WHERE id = $1', [attemptId]);
      if (attempt.rowCount === 0) throw new Error("Lượt làm bài không tồn tại.");
      const examId = attempt.rows[0].exam_id;

      // 2. Lấy toàn bộ bài thi GỐC (bao gồm cả đáp án)
      const examWithAnswers = await examModel.findAllComponentsByExamId(examId, true);

      // 3. Logic chấm điểm
      let totalScore = 0;
      const answerScores = [];
      // (Đây là ví dụ đơn giản, bạn cần mở rộng logic này)
      for (const userAnswer of userAnswers) {
          const question = examWithAnswers.questions.find(q => q.id === userAnswer.questionId);
          if (question) {
              let isCorrect = false;
              // Logic chấm cho câu trắc nghiệm
              const correctOption = examWithAnswers.options.find(o => o.question_id === question.id && o.is_correct);
              if (correctOption && correctOption.label === userAnswer.response) {
                  isCorrect = true;
              }
              // Thêm logic chấm cho các loại câu hỏi khác ở đây...

              const score = isCorrect ? question.points : 0;
              totalScore += score;
              answerScores.push({
                  questionId: question.id,
                  isCorrect,
                  score
              });
          }
      }
      
      // TODO: Tính điểm từng phần (sectionScores) và trạng thái qua/trượt (isPassed)

      const scores = { totalScore, answerScores, sectionScores: [], isPassed: false };

      // 4. Lưu kết quả vào DB
      await attemptModel.submitAttempt(attemptId, scores);

      return { resultId: attemptId };
  },

  getDetailedResults: async (attemptId) => {
    // 1. Lấy thông tin cơ bản về lượt làm bài (attempt)
    const attemptInfo = await attemptModel.findAttemptInfoById(attemptId);
    if (!attemptInfo) {
      throw new Error("Lượt làm bài không tồn tại.");
    }

    const { exam_id } = attemptInfo;

    // 2. Lấy toàn bộ cấu trúc bài thi gốc (bao gồm cả đáp án)
    // Giả sử hàm getCompleteExamById đã có và hoạt động tốt
    const examStructure = await examService.getCompleteExamById(exam_id, true);

    // 3. Lấy tất cả các câu trả lời của người dùng cho lượt làm bài này
    const userAnswers = await attemptModel.findAllUserAnswersByAttemptId(attemptId);
    const userAnswersMap = new Map(userAnswers.map(ans => [ans.question_id, ans]));
    
    // 4. Lấy điểm số của từng phần thi
    const sectionScores = await attemptModel.findSectionScoresByAttemptId(attemptId);
    const sectionScoresMap = new Map(sectionScores.map(ss => [ss.section_id, ss]));

    // 5. Gắn (merge) dữ liệu của người dùng vào cấu trúc bài thi gốc
    let totalCorrectAnswers = 0;
    
    examStructure.sections.forEach(section => {
      let sectionCorrectAnswers = 0;
      let sectionTotalQuestions = 0;

      section.subsections.forEach(subsection => {
        const processQuestions = (questions) => {
          questions.forEach(question => {
            sectionTotalQuestions++;
            const userAnswer = userAnswersMap.get(question.id);
            if (userAnswer) {
              question.user_answer = userAnswer; // Gắn toàn bộ object user_answer
              if (userAnswer.is_correct) {
                sectionCorrectAnswers++;
                totalCorrectAnswers++;
              }
            } else {
              // Nếu không có câu trả lời, coi như sai
              question.user_answer = null; 
            }
          });
        };
        
        // Xử lý cả câu hỏi độc lập và câu hỏi trong prompt
        processQuestions(subsection.questions || []);
        (subsection.prompts || []).forEach(prompt => {
          processQuestions(prompt.questions || []);
        });
      });

      // Gắn thông tin điểm số và số câu đúng cho section
      const scoreInfo = sectionScoresMap.get(section.id);
      section.user_score = scoreInfo ? scoreInfo.score : 0;
      section.correct_answers_count = sectionCorrectAnswers;
      section.total_questions_count = sectionTotalQuestions;
    });

    // 6. Xây dựng object kết quả cuối cùng
    const finalResult = {
      attempt_info: attemptInfo,
      exam_structure: examStructure, // Cấu trúc bài thi đã được gắn thêm câu trả lời của người dùng
    };

    return finalResult;
  },

};

module.exports = attemptService;