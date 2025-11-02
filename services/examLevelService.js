// file: services/examLevelService.js

const examLevelModel = require('../models/examLevelModel');

const examLevelService = {
  createExamLevel: async (payload) => {
    return await examLevelModel.create(payload);
  },

  // getAllExamLevels: async () => {
  //   return await examLevelModel.findAll();
  // },

  getAllExamLevels: async (examTypeId) => { 
    return await examLevelModel.findAll(examTypeId);
  },

  deleteExamLevel: async (id) => {
    const deletedCount = await examLevelModel.delete(id);
    if (deletedCount === 0) {
      throw new Error('Cấp độ bài thi không tồn tại.');
    }
  },
};

module.exports = examLevelService;