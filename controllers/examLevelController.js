// file: controllers/examLevelController.js

const examLevelService = require('../services/examLevelService');

const examLevelController = {
  createExamLevelAdmin: async (req, res) => {
    try {
      const payload = req.body;
      if (!payload.exam_type_id || !payload.name) {
        return res.status(400).json({
          success: false,
          message: "Các trường 'exam_type_id' và 'name' là bắt buộc."
        });
      }
      const newExamLevel = await examLevelService.createExamLevel(payload);
      res.status(201).json({
        success: true,
        message: 'Tạo cấp độ bài thi thành công.',
        data: newExamLevel
      });
    } catch (error) {
      if (error.code === '23505') { // Unique constraint
        return res.status(409).json({ success: false, message: 'Tên cấp độ này đã tồn tại cho loại bài thi này.' });
      }
      if (error.code === '23503') { // Foreign key constraint
        return res.status(404).json({ success: false, message: 'Loại bài thi (exam_type_id) không tồn tại.' });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi tạo cấp độ bài thi', error: error.message });
    }
  },

  // getAllExamLevels: async (req, res) => {
  //   try {
  //     const examLevels = await examLevelService.getAllExamLevels();
  //     res.status(200).json({
  //       success: true,
  //       message: 'Lấy danh sách cấp độ bài thi thành công.',
  //       data: examLevels
  //     });
  //   } catch (error) {
  //     res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách cấp độ bài thi', error: error.message });
  //   }
  // },

  getAllExamLevels: async (req, res) => { // Tên hàm cho người dùng
    try {
      // Lấy examTypeId từ query string
      const { examTypeId } = req.query; 

      // Truyền examTypeId xuống service
      const examLevels = await examLevelService.getAllExamLevels(examTypeId);
      
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách cấp độ bài thi thành công.',
        data: examLevels
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách cấp độ bài thi', error: error.message });
    }
  },


  deleteExamLevelAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      await examLevelService.deleteExamLevel(id);
      res.status(200).send(
        { success: true, message: 'thành công' }
      ); 
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi xóa cấp độ bài thi', error: error.message });
    }
  },
};

module.exports = examLevelController;