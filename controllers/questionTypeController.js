// file: controllers/questionTypeController.js

const questionTypeService = require('../services/questionTypeService');

const questionTypeController = {
  // CREATE
  createQuestionTypeAdmin: async (req, res) => {
    const payload = req.body;
    try {
      if (!payload.name) {
        return res.status(400).json({ success: false, message: "Trường 'name' là bắt buộc." });
      }
      const newType = await questionTypeService.createQuestionType(payload);
      res.status(201).json({ success: true, message: 'Tạo loại câu hỏi thành công.', data: newType });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ success: false, message: `Tên '${payload.name}' đã tồn tại.` });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi tạo loại câu hỏi', error: error.message });
    }
  },

  // READ (All)
  getAllQuestionTypesAdmin: async (req, res) => {
    try {
      const types = await questionTypeService.getAllQuestionTypes();
      res.status(200).json({ success: true, message: 'Lấy danh sách thành công.', data: types });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách', error: error.message });
    }
  },

  // READ (One)
  getQuestionTypeByIdAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      const type = await questionTypeService.getQuestionTypeById(id);
      res.status(200).json({ success: true, message: 'Lấy thông tin thành công.', data: type });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin', error: error.message });
    }
  },

  // UPDATE
  updateQuestionTypeAdmin: async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    try {
      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ success: false, message: 'Không có dữ liệu để cập nhật.' });
      }
      const updatedType = await questionTypeService.updateQuestionType(id, payload);
      res.status(200).json({ success: true, message: 'Cập nhật thành công.', data: updatedType });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
       if (error.code === '23505') {
        return res.status(409).json({ success: false, message: `Tên '${payload.name}' đã tồn tại.` });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật', error: error.message });
    }
  },

  // DELETE
  deleteQuestionTypeAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      await questionTypeService.deleteQuestionType(id);
      res.status(200).send({ success: true, message: 'thành công' });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi xóa', error: error.message });
    }
  },
};

module.exports = questionTypeController;