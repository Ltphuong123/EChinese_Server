// file: controllers/attemptController.js

const attemptService = require('../services/attemptService');

const attemptController = {
  startNewAttempt: async (req, res) => {
    try {
      const { id: examId } = req.params;
      const { id: userId } = req.user;
      const result = await attemptService.startAttempt(userId, examId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi bắt đầu lượt làm bài', error: error.message });
    }
  },

  saveUserAnswer: async (req, res) => {
      try {
          const { attemptId } = req.params;
          const { questionId, userResponse } = req.body;
          const result = await attemptService.saveAnswer(attemptId, questionId, userResponse);
          res.status(200).json({ success: true, data: result });
      } catch (error) {
           res.status(500).json({ success: false, message: 'Lỗi khi lưu câu trả lời', error: error.message });
      }
  },

  submitAttempt: async (req, res) => {
      try {
          const { attemptId } = req.params;
          const { answers } = req.body; // Mảng câu trả lời từ client
          const result = await attemptService.submitAndGradeAttempt(attemptId, answers);
          res.status(200).json({ success: true, data: result });
      } catch (error) {
           res.status(500).json({ success: false, message: 'Lỗi khi nộp bài', error: error.message });
      }
  },

 getAttemptResults: async (req, res) => {
      try {
          const { attemptId } = req.params;
          // Có thể truyền userId vào để kiểm tra xem người dùng có quyền xem kết quả này không
          // const { id: userId } = req.user;
          
          const result = await attemptService.getDetailedResults(attemptId);
          res.status(200).json({ success: true, data: result });
      } catch (error) {
          if (error.message.includes('không tồn tại')) {
            return res.status(404).json({ success: false, message: error.message });
          }
           res.status(500).json({ success: false, message: 'Lỗi khi lấy kết quả chi tiết', error: error.message });
      }
  }
};

module.exports = attemptController;