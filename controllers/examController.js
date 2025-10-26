// file: controllers/examController.js

const examService = require('../services/examService');

const examController = {
  createExamAdmin: async (req, res) => {
    const payload = req.body;
    const userId = req.user.id; // Lấy từ token đã xác thực

    try {
      if (!payload.name || !payload.exam_type_id || !payload.exam_level_id) {
        return res.status(400).json({
          success: false,
          message: "Các trường 'name', 'exam_type_id', 'exam_level_id' là bắt buộc."
        });
      }

      const newExam = await examService.createExam(payload, userId);

      res.status(201).json({
        success: true,
        message: 'Tạo bài thi thành công.',
        data: { id: newExam.id } // Chỉ trả về ID của bài thi mới
      });

    } catch (error) {
       if (error.code === '23503') { // Foreign key constraint
        return res.status(404).json({ success: false, message: `Lỗi ràng buộc khóa ngoại: ${error.detail}` });
      }
       if (error.code === '23505') { // Unique constraint
        return res.status(409).json({ success: false, message: `Lỗi trùng lặp: ${error.detail}` });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi tạo bài thi', error: error.message });
    }
  },

  getExamDetailsAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      const examDetails = await examService.getCompleteExamById(id);
      
      res.status(200).json({
        success: true,
        message: 'Lấy chi tiết bài thi thành công.',
        data: examDetails
      });

    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết bài thi', error: error.message });
    }
  },

  getExamsAdmin: async (req, res) => {
    try {
      // Thu thập tất cả các tham số lọc từ query string
      const filters = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
        search: req.query.search || '',
        examTypeId: req.query.examTypeId || '',
        examLevelId: req.query.examLevelId || '',
        is_deleted: req.query.is_deleted, // Sẽ là 'true', 'false', 'all' hoặc undefined
      };

      // Truyền toàn bộ object filters xuống service
      const result = await examService.getPaginatedExams(filters);

      res.status(200).json({
        success: true,
        message: 'Lấy danh sách bài thi thành công.',
        data: result.data,
        meta: result.meta
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách bài thi', error: error.message });
    }
  },

  updateExamAdmin: async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    const userId = req.user.id; // Người thực hiện cập nhật

    try {
      if (!payload.name || !payload.exam_type_id || !payload.exam_level_id) {
        return res.status(400).json({
          success: false,
          message: "Các trường 'name', 'exam_type_id', 'exam_level_id' là bắt buộc."
        });
      }

      const updatedExam = await examService.updateExam(id, payload, userId);

      res.status(200).json({
        success: true,
        message: 'Cập nhật bài thi thành công.',
        data: { id: updatedExam.id }
      });
    } catch (error) {
       if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
       if (error.code === '23503') {
        return res.status(404).json({ success: false, message: `Lỗi ràng buộc khóa ngoại: ${error.detail}` });
      }
       if (error.code === '23505') {
        return res.status(409).json({ success: false, message: `Lỗi trùng lặp: ${error.detail}` });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật bài thi', error: error.message });
    }
  },

  softDeleteExamAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      await examService.setExamDeletedStatus(id, true);
      res.status(200).send({ success: true, message: 'Thành công'});
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi xóa mềm bài thi', error: error.message });
    }
  },

  restoreExamAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      const restoredExam = await examService.setExamDeletedStatus(id, false);
      res.status(200).json({
        success: true,
        message: 'Khôi phục bài thi thành công.',
        data: restoredExam
      });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi khôi phục bài thi', error: error.message });
    }
  },

  forceDeleteExamAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      await examService.forceDeleteExam(id);
      res.status(200).send({ success: true, message: 'Thành công' });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi xóa vĩnh viễn bài thi', error: error.message });
    }
  },

  duplicateExamAdmin: async (req, res) => {
    try {
      const { examIdToCopy } = req.params;
      const { newName } = req.body;
      const userId = req.user.id; // Người thực hiện hành động sao chép

      if (!newName || newName.trim() === '') {
        return res.status(400).json({ success: false, message: 'Tên mới (newName) là bắt buộc.' });
      }

      const newExam = await examService.duplicateExam(examIdToCopy, newName, userId);

      res.status(201).json({
        success: true,
        message: 'Sao chép bài thi thành công.',
        data: newExam // Trả về bài thi mới đã được sao chép
      });

    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi sao chép bài thi', error: error.message });
    }
  },




  getPublishedExams: async (req, res) => {
    try {
      const filters = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
        examTypeId: req.query.examTypeId || '',
        examLevelId: req.query.examLevelId || '',
      };
      const result = await examService.getPaginatedExams({ ...filters, is_published: true });
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách bài thi', error: error.message });
    }
  },
  
  getExamPublicDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const details = await examService.getPublicDetailsById(id);
      res.status(200).json({ success: true, data: details });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết bài thi', error: error.message });
    }
  },

  getExamContentForDoing: async (req, res) => {
    try {
        const { id } = req.params;
        // Gọi service với tham số thứ hai là `false` để không lấy đáp án
        const examContent = await examService.getCompleteExamById(id, false);
        
        res.status(200).json({ success: true, data: examContent });
    } catch (error) {
        if (error.message.includes('không tồn tại')) {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Lỗi khi lấy nội dung bài thi', error: error.message });
    }
  },

  getExamLeaderboard: async (req, res) => {
    try {
      const { id: examId } = req.params;
      const leaderboard = await examService.getLeaderboardForExam(examId);
      
      res.status(200).json({
        success: true,
        message: 'Lấy bảng xếp hạng thành công.',
        data: leaderboard
      });

    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi lấy bảng xếp hạng', error: error.message });
    }
  },

  
};

module.exports = examController;