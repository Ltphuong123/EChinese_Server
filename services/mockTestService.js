// services/mockTestService.js

const mockTestModel = require('../models/mockTestModel');
const testAttemptModel = require('../models/testAttemptModel');

const mockTestService = {
  createTest: async (testData) => {
    return await mockTestModel.createTest(testData);
  },
  createSection: async (testId, sectionData) => {
    // Kiểm tra xem bài test có tồn tại không
    const testExists = await mockTestModel.exists('MockTests', testId);
    if (!testExists) {
      throw new Error('TEST_NOT_FOUND');
    }
    return await mockTestModel.createSection({ ...sectionData, test_id: testId });
  },
  createQuestion: async (sectionId, questionData) => {
    // Kiểm tra xem section có tồn tại không
    const sectionExists = await mockTestModel.exists('MockTestSections', sectionId);
    if (!sectionExists) {
      throw new Error('SECTION_NOT_FOUND');
    }
    return await mockTestModel.createQuestion({ ...questionData, section_id: sectionId });
  },
  createFullTestWithTransaction: async (fullTestData) => {
    // Gọi đến model để thực hiện tất cả trong 1 transaction
    return await mockTestModel.createFullWithTransaction(fullTestData);
  },
  getAllTests: async ({ search, page, limit }) => {
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;
    return await mockTestModel.findAllTests({ search, limit: limitInt, offset });
  },
  getTestById: async (testId) => {
    return await mockTestModel.findTestById(testId);
  },
  getActiveTests: async ({ type, level, page, limit }) => {
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;

    return await mockTestModel.findAllActive({
      type,
      level,
      limit: limitInt,
      offset
    });
  },
  updateTest: async (testId, updateData) => {
    // Lọc các trường không được phép sửa
    const allowedUpdates = { ...updateData };
    delete allowedUpdates.id;
    delete allowedUpdates.created_by;
    delete allowedUpdates.created_at;
    
    return await mockTestModel.update('MockTests', testId, allowedUpdates);
  },
  updateSection: async (sectionId, updateData) => {
    const allowedUpdates = { ...updateData };
    delete allowedUpdates.id;
    delete allowedUpdates.test_id;

    return await mockTestModel.update('MockTestSections', sectionId, allowedUpdates);
  },
  updateQuestion: async (questionId, updateData) => {
    const allowedUpdates = { ...updateData };
    delete allowedUpdates.id;
    delete allowedUpdates.section_id;

    // Nhớ stringify options nếu nó được cập nhật
    if (allowedUpdates.options) {
        allowedUpdates.options = JSON.stringify(allowedUpdates.options);
    }
    
    return await mockTestModel.update('MockTestQuestions', questionId, allowedUpdates);
  },
  deleteTest: async (testId) => {
    return await mockTestModel.deleteById('MockTests', testId);
  },
  deleteSection: async (sectionId) => {
    return await mockTestModel.deleteById('MockTestSections', sectionId);
  },
  deleteQuestion: async (questionId) => {
    return await mockTestModel.deleteById('MockTestQuestions', questionId);
  },
  getTestDetailsForUser: async (testId) => {
  return await mockTestModel.findTestForUserById(testId);
},

startTestAttempt: async (userId, testId) => {
  // Kiểm tra xem bài test có tồn tại và active không
  const testExists = await mockTestModel.exists('MockTests', testId);
  if (!testExists) {
    throw new Error('TEST_NOT_FOUND');
  }
  return await testAttemptModel.createAttempt(userId, testId);
},

  
};

module.exports = mockTestService;