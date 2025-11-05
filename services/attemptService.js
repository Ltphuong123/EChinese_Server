// file: services/attemptService.js

const attemptModel = require('../models/attemptModel');
const examModel = require('../models/examModel');
const examService = require('./examService'); 
// Cần để lấy đáp án
 // Cần để lấy đáp án
const db = require('../config/db');

const attemptService = {
  startNewAttempt: async (examId, userId) => {
    const examStructure = await examModel.findFullStructureForAttempt(examId);
    if (!examStructure) {
      throw new Error('Bài thi không tồn tại hoặc chưa được công bố.');
    }
    
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + examStructure.total_time_minutes * 60000);

    // Object truyền xuống model đã được sửa, bỏ total_questions
    const newAttempt = await attemptModel.createAttempt({
      exam_id: examId,
      user_id: userId,
      start_time: startTime,
      end_time: endTime
    });

    // Object trả về cho client cũng bỏ total_questions (nếu có)
    return {
      attemptId: newAttempt.id,
      startTime,
      endTime,
      exam: examStructure
    };
  },

  // API: saveAnswers
  saveUserAnswers: async (attemptId, userId, answers) => {
    // 1. Kiểm tra xem lượt làm bài có hợp lệ và thuộc về người dùng này không.
    const attempt = await attemptModel.findAttemptByIdAndUser(attemptId, userId);
    if (!attempt) {
      throw new Error('Lượt làm bài không hợp lệ.');
    }

    // 2. Kiểm tra xem bài thi đã được nộp chưa (score_total có giá trị).
    if (attempt.score_total !== null) {
      throw new Error('Không thể lưu câu trả lời vì bài thi đã được nộp.');
    }
    
    // 3. (Tùy chọn) Kiểm tra xem thời gian làm bài còn không.
    const now = new Date();
    if (now > new Date(attempt.end_time)) {
        throw new Error('Đã hết thời gian làm bài.');
    }
    
    // 4. Nếu không có câu trả lời nào để lưu, không cần làm gì cả.
    if (answers.length === 0) {
        return;
    }

    // 5. Gọi model để thực hiện ghi dữ liệu vào database.
    await attemptModel.upsertAnswers(attemptId, answers);
  },




  // API: submitAttempt
  submitAndGradeAttempt: async (attemptId, userId) => {
      const attempt = await attemptModel.findAttemptByIdAndUser(attemptId, userId);
      if (!attempt) {
          throw new Error('Lượt làm bài không hợp lệ.');
      }
      
      const allQuestionsAndAnswers = await attemptModel.getAllQuestionsAndUserAnswersForGrading(attemptId);
      
      // Trường hợp nộp bài mà không trả lời câu nào
      if (allQuestionsAndAnswers.length === 0) {
          await attemptModel.finalizeAttempt(attemptId, 0, false, []); // Điểm 0, không đạt
          return { attemptId };
      }

      let totalScore = 0;
      const sectionScoresMap = new Map();

      for (const item of allQuestionsAndAnswers) {
          let isCorrect = false;
          const userResponse = item.user_response;
          const questionPoints = item.question_points || 0;
          
          if (userResponse) {
              switch (item.question_type_name) {
                  case 'Đúng/Sai':
                  case 'Trắc nghiệm (3 đáp án)':
                  case 'Trắc nghiệm (4 đáp án)':
                  case 'Trắc nghiệm (5 đáp án - Nối)':
                      isCorrect = item.options.some(opt => opt.id === userResponse && opt.is_correct);
                      break;
                  case 'Sắp xếp từ':
                  case 'Sắp xếp câu':
                      isCorrect = item.correct_answers.some(ans => ans.answer === userResponse);
                      break;
                  case 'Viết câu trả lời':
                      if (item.correct_answers.length > 0) {
                          isCorrect = item.correct_answers.some(ans => ans.answer.toLowerCase() === userResponse.toLowerCase());
                      } else {
                          isCorrect = userResponse.trim().length > 0;
                      }
                      break;
                  case 'Trả lời bằng ghi âm':
                      isCorrect = !!userResponse; // Chỉ cần có câu trả lời là được
                      break;
              }
          }
          
          if (isCorrect) {
              totalScore += questionPoints;
              // Tính điểm từng phần
              const currentSectionScore = sectionScoresMap.get(item.section_id) || 0;
              sectionScoresMap.set(item.section_id, currentSectionScore + questionPoints);
          }

          // Cập nhật is_correct cho từng câu trả lời trong DB
          await attemptModel.updateAnswerResult(item.user_answer_id, isCorrect);
      }
      
      const sectionScores = Array.from(sectionScoresMap, ([section_id, score]) => ({ section_id, score }));

      // --- LOGIC ĐÃ ĐƯỢC THAY ĐỔI TẠI ĐÂY ---
      // Logic cũ: const isPassed = totalScore >= (attempt.exam_passing_score || 0);
      // Logic mới: Coi là "Đạt" nếu người dùng có điểm lớn hơn 0.
      // Bạn có thể thay đổi logic này thành `false` nếu muốn tất cả đều là "Không đạt".
      const isPassed = totalScore > 0;
      
      await attemptModel.finalizeAttempt(attemptId, totalScore, isPassed, sectionScores);
      
      return { attemptId };
  },


  // API: getAttemptResult
  getGradedResult: async (attemptId, userId) => {
    const result = await attemptModel.getFinalResult(attemptId, userId);
    if (!result) {
      throw new Error('Lượt làm bài không hợp lệ hoặc chưa hoàn thành.');
    }
    return result;
  },



  // startAttempt: async (userId, examId) => {
  //   // Có thể thêm logic kiểm tra xem user có quyền làm bài test này không (ví dụ: đã mua, ...)
  //   const attemptId = await attemptModel.createAttempt(userId, examId);
  //   return { attemptId };
  // },

  // saveAnswer: async (attemptId, questionId, userResponse) => {
  //   // Có thể thêm logic validate câu trả lời ở đây
  //   await attemptModel.saveAnswer(attemptId, questionId, userResponse);
  //   return { success: true };
  // },

  // submitAndGradeAttempt: async (attemptId, userAnswers) => {
  //     // 1. Lấy thông tin attempt để biết examId
  //     const attempt = await db.query('SELECT exam_id FROM "User_Exam_Attempts" WHERE id = $1', [attemptId]);
  //     if (attempt.rowCount === 0) throw new Error("Lượt làm bài không tồn tại.");
  //     const examId = attempt.rows[0].exam_id;

  //     // 2. Lấy toàn bộ bài thi GỐC (bao gồm cả đáp án)
  //     const examWithAnswers = await examModel.findAllComponentsByExamId(examId, true);

  //     // 3. Logic chấm điểm
  //     let totalScore = 0;
  //     const answerScores = [];
  //     // (Đây là ví dụ đơn giản, bạn cần mở rộng logic này)
  //     for (const userAnswer of userAnswers) {
  //         const question = examWithAnswers.questions.find(q => q.id === userAnswer.questionId);
  //         if (question) {
  //             let isCorrect = false;
  //             // Logic chấm cho câu trắc nghiệm
  //             const correctOption = examWithAnswers.options.find(o => o.question_id === question.id && o.is_correct);
  //             if (correctOption && correctOption.label === userAnswer.response) {
  //                 isCorrect = true;
  //             }
  //             // Thêm logic chấm cho các loại câu hỏi khác ở đây...

  //             const score = isCorrect ? question.points : 0;
  //             totalScore += score;
  //             answerScores.push({
  //                 questionId: question.id,
  //                 isCorrect,
  //                 score
  //             });
  //         }
  //     }
      
  //     // TODO: Tính điểm từng phần (sectionScores) và trạng thái qua/trượt (isPassed)

  //     const scores = { totalScore, answerScores, sectionScores: [], isPassed: false };

  //     // 4. Lưu kết quả vào DB
  //     await attemptModel.submitAttempt(attemptId, scores);

  //     return { resultId: attemptId };
  // },

  // getDetailedResults: async (attemptId) => {
  //   // 1. Lấy thông tin cơ bản về lượt làm bài (attempt)
  //   const attemptInfo = await attemptModel.findAttemptInfoById(attemptId);
  //   if (!attemptInfo) {
  //     throw new Error("Lượt làm bài không tồn tại.");
  //   }

  //   const { exam_id } = attemptInfo;

  //   // 2. Lấy toàn bộ cấu trúc bài thi gốc (bao gồm cả đáp án)
  //   // Giả sử hàm getCompleteExamById đã có và hoạt động tốt
  //   const examStructure = await examService.getCompleteExamById(exam_id, true);

  //   // 3. Lấy tất cả các câu trả lời của người dùng cho lượt làm bài này
  //   const userAnswers = await attemptModel.findAllUserAnswersByAttemptId(attemptId);
  //   const userAnswersMap = new Map(userAnswers.map(ans => [ans.question_id, ans]));
    
  //   // 4. Lấy điểm số của từng phần thi
  //   const sectionScores = await attemptModel.findSectionScoresByAttemptId(attemptId);
  //   const sectionScoresMap = new Map(sectionScores.map(ss => [ss.section_id, ss]));

  //   // 5. Gắn (merge) dữ liệu của người dùng vào cấu trúc bài thi gốc
  //   let totalCorrectAnswers = 0;
    
  //   examStructure.sections.forEach(section => {
  //     let sectionCorrectAnswers = 0;
  //     let sectionTotalQuestions = 0;

  //     section.subsections.forEach(subsection => {
  //       const processQuestions = (questions) => {
  //         questions.forEach(question => {
  //           sectionTotalQuestions++;
  //           const userAnswer = userAnswersMap.get(question.id);
  //           if (userAnswer) {
  //             question.user_answer = userAnswer; // Gắn toàn bộ object user_answer
  //             if (userAnswer.is_correct) {
  //               sectionCorrectAnswers++;
  //               totalCorrectAnswers++;
  //             }
  //           } else {
  //             // Nếu không có câu trả lời, coi như sai
  //             question.user_answer = null; 
  //           }
  //         });
  //       };
        
  //       // Xử lý cả câu hỏi độc lập và câu hỏi trong prompt
  //       processQuestions(subsection.questions || []);
  //       (subsection.prompts || []).forEach(prompt => {
  //         processQuestions(prompt.questions || []);
  //       });
  //     });

  //     // Gắn thông tin điểm số và số câu đúng cho section
  //     const scoreInfo = sectionScoresMap.get(section.id);
  //     section.user_score = scoreInfo ? scoreInfo.score : 0;
  //     section.correct_answers_count = sectionCorrectAnswers;
  //     section.total_questions_count = sectionTotalQuestions;
  //   });

  //   // 6. Xây dựng object kết quả cuối cùng
  //   const finalResult = {
  //     attempt_info: attemptInfo,
  //     exam_structure: examStructure, // Cấu trúc bài thi đã được gắn thêm câu trả lời của người dùng
  //   };

  //   return finalResult;
  // },

};

module.exports = attemptService;