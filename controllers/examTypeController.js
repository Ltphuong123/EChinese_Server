// file: controllers/examTypeController.js

const examTypeService = require('../services/examTypeService');

const examTypeController = {
  createExamTypeAdmin: async (req, res) => {
    const payload = req.body;
    try {
      if (!payload.name) {
        return res.status(400).json({
          success: false,
          message: "Trường 'name' là bắt buộc."
        });
      }

      const newExamType = await examTypeService.createExamType(payload);

      res.status(201).json({
        success: true,
        message: 'Tạo loại bài thi thành công.',
        data: newExamType
      });

    } catch (error) {
      if (error.code === '23505') { 
        return res.status(409).json({ 
          success: false, 
          message: `Tên loại bài thi '${payload.name}' đã tồn tại.` 
        });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi tạo loại bài thi', error: error.message });
    }
  },

  getAllExamTypes: async (req, res) => {
    try {
      const examTypes = await examTypeService.getAllExamTypes();
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách loại bài thi thành công.',
        data: examTypes
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách loại bài thi', error: error.message });
    }
  },

  deleteExamTypeAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      await examTypeService.deleteExamType(id);
      res.status(200).send(
        { success: true, message: 'thành công' }
      ); 
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi xóa loại bài thi', error: error.message });
    }
  },


};

module.exports = examTypeController;