// file: services/aiLessonService.js
const aiLessonModel = require('../models/aiLessonModel');

const aiLessonService = {
  saveLesson: async ({ userId, theme, level, content, model }) => {
    const row = await aiLessonModel.create({
      user_id: userId,
      theme,
      level,
      content,
      model,
    });
    return row;
  },
  getUserLessons: async (userId, { page = 1, limit = 10 } = {}) => {
    const offset = (page - 1) * limit;
    const { lessons, totalItems } = await aiLessonModel.findByUser(userId, { limit, offset });
    const totalPages = Math.ceil(totalItems / limit);
    return { data: lessons, meta: { total: totalItems, page, limit, totalPages } };
  },
  getLessonById: async (lessonId, requester) => {
    const row = await aiLessonModel.findById(lessonId);
    if (!row) return null;
    const isAdmin = requester && (requester.role === 'admin' || requester.role === 'super admin');
    const isOwner = requester && row.user_id === requester.id;
    if (!isAdmin && !isOwner) {
      const err = new Error('Bạn không có quyền truy cập bài học này.');
      err.statusCode = 403;
      throw err;
    }
    return row;
  },
  deleteLesson: async (lessonId, requester) => {
    const row = await aiLessonModel.findById(lessonId);
    if (!row) return 0;
    const isAdmin = requester && (requester.role === 'admin' || requester.role === 'super admin');
    const isOwner = requester && row.user_id === requester.id;
    if (!isAdmin && !isOwner) {
      const err = new Error('Bạn không có quyền xóa bài học này.');
      err.statusCode = 403;
      throw err;
    }
    return await aiLessonModel.deleteById(lessonId);
  },
};

module.exports = aiLessonService;
