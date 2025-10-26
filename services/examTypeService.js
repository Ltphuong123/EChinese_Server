const examTypeModel = require('../models/examTypeModel');

const examTypeService = {
  createExamType: async (payload) => {
    // Hiện tại, service chỉ cần truyền dữ liệu xuống model.
    // Trong tương lai, có thể thêm logic kiểm tra quyền hạn phức tạp hoặc business rules ở đây.
    const newExamType = await examTypeModel.create(payload);
    return newExamType;
  },

  getAllExamTypes: async () => {
    return await examTypeModel.findAll();
  },

  deleteExamType: async (id) => {
    const deletedCount = await examTypeModel.delete(id);
    if (deletedCount === 0) {
      throw new Error('Loại bài thi không tồn tại.');
    }
  },

  
};

module.exports = examTypeService;