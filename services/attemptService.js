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

      // Lấy thông tin tổng số câu hỏi trong mỗi section
      const sectionQuestionCounts = await attemptModel.getSectionQuestionCounts(attempt.exam_id);
      const sectionCountsMap = new Map(
        sectionQuestionCounts.map(s => [s.section_id, { total: parseInt(s.total_questions), correct: 0 }])
      );

      // Đếm số câu đúng trong mỗi section
      for (const item of allQuestionsAndAnswers) {
          let isCorrect = false;
          const userResponse = item.user_response;
          
          if (userResponse) {
              switch (item.question_type_name) {
                  case 'Đúng/Sai':
                  case 'Trắc nghiệm (3 đáp án)':
                  case 'Trắc nghiệm (4 đáp án)':
                  case 'Trắc nghiệm (5 đáp án - Nối)':
                      isCorrect = item.options?.some(opt => opt.id === userResponse && opt.is_correct) || false;
                      break;
                  case 'Sắp xếp từ':
                  case 'Sắp xếp câu':
                      isCorrect = item.correct_answers?.some(ans => ans.answer === userResponse) || false;
                      break;
                  case 'Viết câu trả lời':
                      if (item.correct_answers && item.correct_answers.length > 0) {
                          isCorrect = item.correct_answers.some(ans => 
                              ans.answer?.toLowerCase() === userResponse.toLowerCase()
                          );
                      } else {
                          isCorrect = userResponse.trim().length > 0;
                      }
                      break;
                  case 'Trả lời bằng ghi âm':
                      isCorrect = !!userResponse; // Chỉ cần có câu trả lời là được
                      break;
              }
          }
          
          // Cập nhật số câu đúng trong section
          if (isCorrect && sectionCountsMap.has(item.section_id)) {
              const sectionData = sectionCountsMap.get(item.section_id);
              sectionData.correct += 1;
          }

          // Cập nhật is_correct cho từng câu trả lời trong DB
          await attemptModel.updateAnswerResult(item.user_answer_id, isCorrect);
      }

      // Tính điểm theo loại bài thi
      const examTypeName = attempt.exam_type_name;
      let totalScore = 0;
      const sectionScores = [];
      
      if (examTypeName === 'HSK') {
          // HSK: Điểm từng phần = (Số câu đúng / Tổng số câu) × 100
          for (const [section_id, data] of sectionCountsMap.entries()) {
              const sectionScore = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;

              sectionScores.push({ 
                  section_id, 
                  score: sectionScore,
                  correct_count: data.correct,
                  total_questions: data.total
              });
              totalScore += sectionScore;
          }
      } else if (examTypeName === 'HSKK') {
          // HSKK: Điểm từng phần = (Số câu đúng / Tổng số câu) × 100, Tổng = 100
          for (const [section_id, data] of sectionCountsMap.entries()) {
              const sectionScore = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;

              sectionScores.push({ 
                  section_id, 
                  score: sectionScore,
                  correct_count: data.correct,
                  total_questions: data.total
              });
              totalScore += sectionScore;
          }
      } else if (examTypeName === 'TOCFL') {
          // TOCFL: Điểm từng phần = (Số câu đúng / Tổng số câu) × 80
          for (const [section_id, data] of sectionCountsMap.entries()) {
              const sectionScore = data.total > 0 ? Math.round((data.correct / data.total) * 80) : 0;

              sectionScores.push({ 
                  section_id, 
                  score: sectionScore,
                  correct_count: data.correct,
                  total_questions: data.total
              });
              totalScore += sectionScore;
          }
      } else {
          // Mặc định: Tính theo điểm gốc (points) - giống logic cũ
          const sectionScoresMap = new Map();
          
          // Lặp lại để tính điểm theo points
          for (const item of allQuestionsAndAnswers) {
              let isCorrect = false;
              const userResponse = item.user_response;
              
              if (userResponse) {
                  switch (item.question_type_name) {
                      case 'Đúng/Sai':
                      case 'Trắc nghiệm (3 đáp án)':
                      case 'Trắc nghiệm (4 đáp án)':
                      case 'Trắc nghiệm (5 đáp án - Nối)':
                          isCorrect = item.options?.some(opt => opt.id === userResponse && opt.is_correct) || false;
                          break;
                      case 'Sắp xếp từ':
                      case 'Sắp xếp câu':
                          isCorrect = item.correct_answers?.some(ans => ans.answer === userResponse) || false;
                          break;
                      case 'Viết câu trả lời':
                          if (item.correct_answers && item.correct_answers.length > 0) {
                              isCorrect = item.correct_answers.some(ans => 
                                  ans.answer?.toLowerCase() === userResponse.toLowerCase()
                              );
                          } else {
                              isCorrect = userResponse.trim().length > 0;
                          }
                          break;
                      case 'Trả lời bằng ghi âm':
                          isCorrect = !!userResponse;
                          break;
                  }
              }
              
              if (isCorrect) {
                  const questionPoints = item.question_points || 0;
                  totalScore += questionPoints;
                  const currentScore = sectionScoresMap.get(item.section_id) || 0;
                  sectionScoresMap.set(item.section_id, currentScore + questionPoints);
              }
          }
          
          for (const [section_id, score] of sectionScoresMap.entries()) {
              sectionScores.push({ section_id, score });
          }
      }

      // Xác định đạt/không đạt theo loại bài thi
      let isPassed = false;
      const numSections = sectionScores.length;
      
      if (examTypeName === 'HSK') {
          // HSK 1-2: ≥120/200 (2 phần), HSK 3-6: ≥180/300 (3 phần)
          if (numSections === 2) {
              isPassed = totalScore >= 120;
          } else if (numSections === 3) {
              isPassed = totalScore >= 180;
          } else {
              isPassed = totalScore > 0;
          }
      } else if (examTypeName === 'HSKK') {
          // HSKK: Tổng ≥60/100
          isPassed = totalScore >= 60;
      } else if (examTypeName === 'TOCFL') {
          // TOCFL: Tổng ≥120/160
          isPassed = totalScore >= 120;
      } else {
          // Mặc định: Có điểm là đạt
          isPassed = totalScore > 0;
      }
      
      await attemptModel.finalizeAttempt(attemptId, totalScore, isPassed, sectionScores);
      
      return { attemptId };
  },


  // API: getAttemptResult
  getGradedResult: async (attemptId, userId) => {
    // Kiểm tra xem attempt có tồn tại không
    const attempt = await attemptModel.findAttemptByIdAndUser(attemptId, userId);
    if (!attempt) {
      throw new Error('Lượt làm bài không tồn tại hoặc không thuộc về bạn.');
    }
    
    // Kiểm tra xem đã nộp bài chưa
    if (attempt.score_total === null) {
      throw new Error('Bài thi chưa được nộp. Vui lòng nộp bài trước khi xem kết quả.');
    }
    
    const result = await attemptModel.getFinalResult(attemptId, userId);
    if (!result) {
      throw new Error('Không thể lấy kết quả bài thi.');
    }
    return result;
  },

  
 /**
   * Lấy lịch sử làm bài của user theo exam_type_id + exam_level_id + name
   * @param {string} userId - ID của user
   * @param {string} examTypeId - ID của loại bài thi (HSK, HSKK, TOCFL)
   * @param {string} examLevelId - ID của cấp độ (HSK1, HSK2, ...)
   * @param {string} examName - Tên bài thi
   * @returns {Promise<Array>} Danh sách lịch sử làm bài
   */
  getAttemptHistoryByExamInfo: async (userId, examTypeId, examLevelId, examName) => {
    const query = `
      SELECT 
        uea.id as attempt_id,
        uea.exam_id,
        e.name as exam_name,
        et.name as exam_type_name,
        el.name as exam_level_name,
        uea.start_time,
        uea.end_time,
        uea.score_total,
        uea.is_passed,
        uea.attempt_number,
        uea.created_at
      FROM "User_Exam_Attempts" uea
      JOIN "Exams" e ON uea.exam_id = e.id
      JOIN "Exam_Types" et ON e.exam_type_id = et.id
      JOIN "Exam_Levels" el ON e.exam_level_id = el.id
      WHERE uea.user_id = $1
        AND e.exam_type_id = $2
        AND e.exam_level_id = $3
        AND e.name = $4
        AND uea.end_time IS NOT NULL
      ORDER BY uea.created_at DESC
    `;

    const result = await db.query(query, [userId, examTypeId, examLevelId, examName]);
    return result.rows;
  },


};

module.exports = attemptService;
 
