// controllers/mockTestController.js

const mockTestService = require('../services/mockTestService');

const mockTestController = {
  createTest: async (req, res) => {
    try {
      const created_by = req.user.id; // Lấy ID admin từ token
      const newTest = await mockTestService.createTest({ ...req.body, created_by });
      res.status(201).json({
        success: true,
        message: 'Tạo bài test thành công.',
        data: newTest
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi tạo bài test', error: error.message });
    }
  },
  createSection: async (req, res) => {
    try {
      const { testId } = req.params;
      const newSection = await mockTestService.createSection(testId, req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo section thành công.',
        data: newSection
      });
    } catch (error) {
      if (error.message === 'TEST_NOT_FOUND') {
        return res.status(404).json({ success: false, message: `Bài test với ID ${req.params.testId} không tồn tại.` });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi tạo section', error: error.message });
    }
  },
  createQuestion: async (req, res) => {
    try {
      const { sectionId } = req.params;
      const newQuestion = await mockTestService.createQuestion(sectionId, req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo câu hỏi thành công.',
        data: newQuestion
      });
    } catch (error) {
      if (error.message === 'SECTION_NOT_FOUND') {
        return res.status(404).json({ success: false, message: `Section với ID ${req.params.sectionId} không tồn tại.` });
      }
      if (error.code === '23503') { // Foreign key (media_id)
           return res.status(409).json({ success: false, message: `Media với ID ${req.body.media_id} không tồn tại.` });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi tạo câu hỏi', error: error.message });
    }
  },
  createFullTest: async (req, res) => {
    try {
      const created_by = req.user.id; // Lấy ID admin
      const testPayload = req.body; // Đối tượng JSON lớn

      // --- Validation cơ bản ---
      if (!testPayload.title || !testPayload.sections || !Array.isArray(testPayload.sections)) {
          return res.status(400).json({
              success: false,
              message: 'Body không hợp lệ. Yêu cầu title và mảng sections.'
          });
      }

      // Gọi service để xử lý transaction phức tạp
      const fullTest = await mockTestService.createFullTestWithTransaction({ ...testPayload, created_by });

      res.status(201).json({
        success: true,
        message: 'Tạo bài test hoàn chỉnh thành công.',
        data: fullTest // Trả về đối tượng lồng nhau
      });
    } catch (error) {
      // Xử lý các lỗi cụ thể nếu cần
      if (error.code === '23503') {
          return res.status(409).json({ 
            success: false,
            message: 'Lỗi dữ liệu (ví dụ: media_id không tồn tại).',
            error: error.detail 
          });
      }
      res.status(500).json({ 
        success: false,
        message: 'Lỗi khi tạo bài test hoàn chỉnh', 
        error: error.message 
      });
    }
  },
  getAllTests: async (req, res) => {
    try {
      const { search = '', page = 1, limit = 10 } = req.query;
      const result = await mockTestService.getAllTests({ search, page, limit });
      res.status(200).json({ success: true, message: 'Lấy danh sách bài test thành công.', data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách bài test.', error: error.message });
    }
  },
  getTestById: async (req, res) => {
    try {
      const { testId } = req.params;
      const test = await mockTestService.getTestById(testId);
      if (!test) {
        return res.status(404).json({ success: false, message: 'Bài test không tồn tại.' });
      }
      res.status(200).json({ success: true, message: 'Lấy chi tiết bài test thành công.', data: test });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết bài test.', error: error.message });
    }
  },
  getActiveTestsForUser: async (req, res) => {
    try {
      const { type, level, page = 1, limit = 10 } = req.query;
      
      const result = await mockTestService.getActiveTests({
        type,
        level,
        page,
        limit
      });

      res.status(200).json({
        success: true,
        message: 'Lấy danh sách bài thi thành công.',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách bài thi',
        error: error.message
      });
    }
  },
  updateTest: async (req, res) => {
    try {
      const { testId } = req.params;
      const updatedTest = await mockTestService.updateTest(testId, req.body);
       if (!updatedTest) {
        return res.status(404).json({ success: false, message: 'Bài test không tồn tại.' });
      }
      res.status(200).json({ success: true, message: 'Cập nhật bài test thành công.', data: updatedTest });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật bài test.', error: error.message });
    }
  },
  updateSection: async (req, res) => {
    try {
      const { sectionId } = req.params;
      const updatedSection = await mockTestService.updateSection(sectionId, req.body);
      if (!updatedSection) {
        return res.status(404).json({ success: false, message: 'Section không tồn tại.' });
      }
      res.status(200).json({ success: true, message: 'Cập nhật section thành công.', data: updatedSection });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật section.', error: error.message });
    }
  },
  updateQuestion: async (req, res) => {
    try {
      const { questionId } = req.params;
      const updatedQuestion = await mockTestService.updateQuestion(questionId, req.body);
       if (!updatedQuestion) {
        return res.status(404).json({ success: false, message: 'Câu hỏi không tồn tại.' });
      }
      res.status(200).json({ success: true, message: 'Cập nhật câu hỏi thành công.', data: updatedQuestion });
    } catch (error) {
       if (error.code === '23503') { // Foreign key (media_id)
           return res.status(409).json({ success: false, message: `Media với ID ${req.body.media_id} không tồn tại.` });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật câu hỏi.', error: error.message });
    }
  },
  deleteTest: async (req, res) => {
    try {
      const { testId } = req.params;
      const deleted = await mockTestService.deleteTest(testId);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Bài test không tồn tại.' });
      }
      res.status(200).json({ success: true, message: 'Xóa bài test thành công.', data: { id: testId } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi xóa bài test.', error: error.message });
    }
  },
  deleteSection: async (req, res) => {
    try {
      const { sectionId } = req.params;
      const deleted = await mockTestService.deleteSection(sectionId);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Section không tồn tại.' });
      }
      res.status(200).json({ success: true, message: 'Xóa section thành công.', data: { id: sectionId } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi xóa section.', error: error.message });
    }
  },
  deleteQuestion: async (req, res) => {
    try {
      const { questionId } = req.params;
      const deleted = await mockTestService.deleteQuestion(questionId);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Câu hỏi không tồn tại.' });
      }
      res.status(200).json({ success: true, message: 'Xóa câu hỏi thành công.', data: { id: questionId } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi xóa câu hỏi.', error: error.message });
    }
  },
  getTestDetailsForUser: async (req, res) => {
    try {
        const test = await mockTestService.getTestDetailsForUser(req.params.testId);
        if (!test) return res.status(404).json({ success: false, message: 'Bài thi không tồn tại hoặc không hoạt động.' });
        res.json({ success: true, data: test });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
},

startTestAttempt: async (req, res) => {
    try {
        const attempt = await mockTestService.startTestAttempt(req.user.id, req.params.testId);
        res.status(201).json({ success: true, message: 'Bắt đầu làm bài thành công.', data: attempt });
    } catch (error) {
        if (error.message === 'TEST_NOT_FOUND') return res.status(404).json({ success: false, message: 'Bài thi không tồn tại.' });
        res.status(500).json({ success: false, message: error.message });
    }
},

};

module.exports = mockTestController;