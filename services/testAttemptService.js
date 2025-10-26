// services/testAttemptService.js

const testAttemptModel = require('../models/testAttemptModel');
const db = require('../config/db');

const testAttemptService = {
  saveAnswer: async (attemptId, userId, answerData) => {
    const attempt = await testAttemptModel.findAttemptByIdAndUser(attemptId, userId);
    if (!attempt || attempt.submitted_at) {
      throw new Error('ATTEMPT_NOT_FOUND_OR_SUBMITTED');
    }
    const { questionId, selectedAnswer, timeSpent } = answerData;
    return await testAttemptModel.saveAnswer(attemptId, questionId, selectedAnswer, timeSpent);
  },

  submitAttempt: async (attemptId, userId) => {
    const attempt = await testAttemptModel.findAttemptByIdAndUser(attemptId, userId);
    if (!attempt || attempt.submitted_at) {
      throw new Error('ATTEMPT_NOT_FOUND_OR_SUBMITTED');
    }
    
    // Logic chấm điểm
    const userAnswers = await testAttemptModel.getAnswersForScoring(attemptId);
    let totalScore = 0;
    const sectionScores = {};

    for (const answer of userAnswers) {
      const isCorrect = answer.selected_answer === answer.correct_answer;
      // Giả sử mỗi câu đúng được 1 điểm (cần logic phức tạp hơn nếu điểm khác nhau)
      const score = isCorrect ? 1 : 0; 
      
      // Cập nhật is_correct vào DB
      await db.query(`UPDATE "UserTestAnswers" SET is_correct = $1 WHERE id = $2`, [isCorrect, answer.id]);
      
      totalScore += score;
      
      // Tính điểm theo section
      if (!sectionScores[answer.section_id]) {
        sectionScores[answer.section_id] = { score: 0, completed_questions: 0 };
      }
      sectionScores[answer.section_id].score += score;
      sectionScores[answer.section_id].completed_questions++;
    }
    
    const submittedAttempt = await testAttemptModel.submitAttempt(attemptId, totalScore, sectionScores);
    
    // Cập nhật điểm cao nhất
    await testAttemptModel.updateHighestScore(userId, attempt.test_id, totalScore);
    
    return submittedAttempt;
  },

  getAttemptResult: async (attemptId, userId) => {
    const attempt = await testAttemptModel.findAttemptByIdAndUser(attemptId, userId);
    if (!attempt) {
      throw new Error('ATTEMPT_NOT_FOUND');
    }
    return await testAttemptModel.getDetailedResult(attemptId);
  },
  
  getHistory: async (userId, page, limit) => {
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const data = await testAttemptModel.findHistoryByUser(userId, limit, offset);
      return {
          ...data,
          pagination: {
              totalItems: data.total,
              totalPages: Math.ceil(data.total / limit),
              currentPage: parseInt(page, 10),
          }
      }
  },
  
  getScores: async(userId) => {
      return await testAttemptModel.findScoresByUser(userId);
  }
};

module.exports = testAttemptService;

// Thêm db import ở đầu file
