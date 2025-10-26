// file: services/questionTypeService.js

const questionTypeModel = require('../models/questionTypeModel');

const questionTypeService = {
  createQuestionType: async (payload) => {
    return await questionTypeModel.create(payload);
  },

  getAllQuestionTypes: async () => {
    return await questionTypeModel.findAll();
  },

  getQuestionTypeById: async (id) => {
    const questionType = await questionTypeModel.findById(id);
    if (!questionType) {
      throw new Error('Loại câu hỏi không tồn tại.');
    }
    return questionType;
  },

  updateQuestionType: async (id, payload) => {
    const updatedQuestionType = await questionTypeModel.update(id, payload);
    if (!updatedQuestionType) {
      throw new Error('Loại câu hỏi không tồn tại.');
    }
    return updatedQuestionType;
  },

  deleteQuestionType: async (id) => {
    // Lưu ý: Cần kiểm tra xem có câu hỏi nào đang sử dụng loại này không trước khi xóa
    // Tuy nhiên, vì bạn dùng soft delete, chúng ta có thể bỏ qua bước này.
    // Nếu là hard delete, cần thêm logic kiểm tra ràng buộc.
    const deletedCount = await questionTypeModel.delete(id);
    if (deletedCount === 0) {
      throw new Error('Loại câu hỏi không tồn tại.');
    }
  },
};

module.exports = questionTypeService;