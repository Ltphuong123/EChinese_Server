// file: controllers/attemptController.js

const attemptService = require('../services/attemptService');

const attemptController = {
  startAttempt: async (req, res) => {
    try {
      const { id: examId } = req.params;
      const userId = req.user.id;
      const result = await attemptService.startNewAttempt(examId, userId);
      res.status(201).json({ success: true, message: 'Bắt đầu làm bài thành công.', data: result });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi bắt đầu làm bài', error: error.message });
    }
  },

  // POST /api/attempts/:attemptId/answers
  saveAnswers: async (req, res) => {
    try {
      // 1. Trích xuất dữ liệu từ request
      const { attemptId } = req.params;
      const userId = req.user.id; // Lấy từ token sau khi middleware xác thực
      const { answers } = req.body;

      // 2. Validation cơ bản
      if (!answers || !Array.isArray(answers)) {
          return res.status(400).json({
              success: false,
              message: "Body của request phải chứa một mảng 'answers'."
          });
      }

      // 3. Gọi service để xử lý logic nghiệp vụ
      await attemptService.saveUserAnswers(attemptId, userId, answers);

      // 4. Trả về response thành công
      res.status(200).json({
        success: true,
        message: 'Lưu câu trả lời thành công.'
      });
      
    } catch (error) {
      // Bắt các lỗi cụ thể từ service
      if (error.message.includes('không hợp lệ') || error.message.includes('đã nộp')) {
        return res.status(403).json({ success: false, message: error.message });
      }
      // Bắt các lỗi chung
      res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lưu câu trả lời', error: error.message });
    }
  },



  // POST /api/attempts/:attemptId/submit
  submitAttempt: async (req, res) => {
    try {
        const { attemptId } = req.params;
        const userId = req.user.id;
        const result = await attemptService.submitAndGradeAttempt(attemptId, userId);
        res.status(200).json({ success: true, message: 'Nộp bài thành công.', data: result });
    } catch (error) {
        if (error.message.includes('không hợp lệ')) {
            return res.status(403).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Lỗi khi nộp bài', error: error.message });
    }
  },

  // GET /api/attempts/:attemptId/result
  getAttemptResult: async (req, res) => {
    try {
      const { attemptId } = req.params;
      const userId = req.user.id;
      const result = await attemptService.getGradedResult(attemptId, userId);
      res.status(200).json({ success: true, message: 'Lấy kết quả thành công.', data: result });
    } catch (error) {
      if (error.message.includes('không hợp lệ')) {
        return res.status(403).json({ success: false, message: error.message });
      }
       if (error.message.includes('chưa hoàn thành')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi lấy kết quả', error: error.message });
    }
  },





//   startNewAttempt: async (req, res) => {
//     try {
//       const { id: examId } = req.params;
//       const { id: userId } = req.user;
//       const result = await attemptService.startAttempt(userId, examId);
//       res.status(201).json({ success: true, data: result });
//     } catch (error) {
//       res.status(500).json({ success: false, message: 'Lỗi khi bắt đầu lượt làm bài', error: error.message });
//     }
//   },

//   saveUserAnswer: async (req, res) => {
//       try {
//           const { attemptId } = req.params;
//           const { questionId, userResponse } = req.body;
//           const result = await attemptService.saveAnswer(attemptId, questionId, userResponse);
//           res.status(200).json({ success: true, data: result });
//       } catch (error) {
//            res.status(500).json({ success: false, message: 'Lỗi khi lưu câu trả lời', error: error.message });
//       }
//   },

//   submitAttempt: async (req, res) => {
//       try {
//           const { attemptId } = req.params;
//           const { answers } = req.body; // Mảng câu trả lời từ client
//           const result = await attemptService.submitAndGradeAttempt(attemptId, answers);
//           res.status(200).json({ success: true, data: result });
//       } catch (error) {
//            res.status(500).json({ success: false, message: 'Lỗi khi nộp bài', error: error.message });
//       }
//   },

//  getAttemptResults: async (req, res) => {
//       try {
//           const { attemptId } = req.params;
//           // Có thể truyền userId vào để kiểm tra xem người dùng có quyền xem kết quả này không
//           // const { id: userId } = req.user;
          
//           const result = await attemptService.getDetailedResults(attemptId);
//           res.status(200).json({ success: true, data: result });
//       } catch (error) {
//           if (error.message.includes('không tồn tại')) {
//             return res.status(404).json({ success: false, message: error.message });
//           }
//            res.status(500).json({ success: false, message: 'Lỗi khi lấy kết quả chi tiết', error: error.message });
//       }
//   },

  /**
   * GET /api/attempts/history/by-exam-info
   * Lấy lịch sử làm bài theo exam_type_id + exam_level_id + name
   */
  getAttemptHistoryByExamInfo: async (req, res) => {
    try {
      const userId = req.user.id;
      const { exam_type_id, exam_level_id, exam_name } = req.query;

      // Validation
      if (!exam_type_id || !exam_level_id || !exam_name) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu tham số: exam_type_id, exam_level_id, exam_name là bắt buộc'
        });
      }

      const history = await attemptService.getAttemptHistoryByExamInfo(
        userId,
        exam_type_id,
        exam_level_id,
        exam_name
      );

      res.status(200).json({
        success: true,
        message: 'Lấy lịch sử làm bài thành công',
        data: history
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy lịch sử làm bài',
        error: error.message
      });
    }
  }
};

module.exports = attemptController;