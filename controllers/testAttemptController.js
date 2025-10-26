// controllers/testAttemptController.js

const testAttemptService = require('../services/testAttemptService');

const testAttemptController = {
  saveAnswer: async (req, res) => {
    try {
      const answer = await testAttemptService.saveAnswer(req.params.attemptId, req.user.id, req.body);
      res.status(201).json({ success: true, message: 'Lưu câu trả lời thành công.', data: answer });
    } catch (error) {
      if (error.message === 'ATTEMPT_NOT_FOUND_OR_SUBMITTED') {
        return res.status(403).json({ success: false, message: 'Lượt làm bài không tồn tại, đã nộp hoặc không thuộc về bạn.' });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  },

  submitAttempt: async (req, res) => {
    try {
      const result = await testAttemptService.submitAttempt(req.params.attemptId, req.user.id);
      res.json({ success: true, message: 'Nộp bài thành công!', data: result });
    } catch (error) {
       if (error.message === 'ATTEMPT_NOT_FOUND_OR_SUBMITTED') {
        return res.status(403).json({ success: false, message: 'Lượt làm bài không tồn tại, đã nộp hoặc không thuộc về bạn.' });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  getAttemptResult: async (req, res) => {
      try {
        const result = await testAttemptService.getAttemptResult(req.params.attemptId, req.user.id);
         if (!result) return res.status(404).json({ success: false, message: 'Không tìm thấy kết quả.' });
        res.json({ success: true, data: result });
      } catch (error) {
           if (error.message === 'ATTEMPT_NOT_FOUND') {
            return res.status(404).json({ success: false, message: 'Lượt làm bài không thuộc về bạn.' });
          }
          res.status(500).json({ success: false, message: error.message });
      }
  },
};

module.exports = testAttemptController;