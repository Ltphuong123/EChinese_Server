// file: controllers/aiController.js

const { generateChineseLesson } = require('../services/aiService');
const aiLessonService = require('../services/aiLessonService');
const aiTranslationService = require('../services/aiTranslationService');

const aiController = {
  generateLesson: async (req, res) => {
    try {
      const { theme, level } = req.body || {};
      if (!theme || !level) {
        return res.status(400).json({ success: false, message: "Thiếu 'theme' hoặc 'level'" });
      }
      const validLevels = ['Cơ bản', 'Trung cấp', 'Cao cấp'];
      if (!validLevels.includes(level)) {
        return res.status(400).json({ success: false, message: `level phải là một trong: ${validLevels.join(', ')}` });
      }
      const result = await generateChineseLesson(theme, level);
      const userId = req.user?.id || null;
      const lesson = result && result.data ? result.data : result;
      const model = result && result.model ? result.model : null;
      const saved = await aiLessonService.saveLesson({ userId, theme, level, content: lesson, model });
      return res.status(200).json({ success: true, data: lesson, saved: { id: saved.id, model: saved.model } });
    } catch (error) {
      if (error.message && error.message.includes('JSON không hợp lệ')) {
        return res.status(502).json({ success: false, message: 'AI trả về dữ liệu không hợp lệ', error: error.message });
      }
      if (error.message && error.message.includes('GEMINI_API_KEY')) {
        return res.status(500).json({ success: false, message: 'Thiếu cấu hình GEMINI_API_KEY', error: error.message });
      }
      return res.status(500).json({ success: false, message: 'Lỗi tạo bài học bằng AI', error: error.message });
    }
  },
  translate: async (req, res) => {
    try {
      const { text, direction } = req.body || {};
      if (!text) return res.status(400).json({ success: false, message: 'Thiếu text cần dịch' });
      if (text.length > 5000) return res.status(400).json({ success: false, message: 'Text quá dài (>5000 ký tự)' });
      const userId = req.user?.id || null;
      const result = await aiTranslationService.translateText({ text, direction, userId });
      return res.status(200).json({ success: true, data: result.translation });
    } catch (error) {
      if (error.message.includes('direction')) return res.status(400).json({ success: false, message: error.message });
      if (error.message.includes('Thiếu')) return res.status(400).json({ success: false, message: error.message });
      return res.status(500).json({ success: false, message: 'Lỗi dịch văn bản', error: error.message });
    }
  },
  getMyTranslations: async (req, res) => {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const result = await aiTranslationService.getUserTranslations(userId, { page, limit });
      return res.status(200).json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi khi lấy lịch sử dịch', error: error.message });
    }
  },
  deleteMyTranslation: async (req, res) => {
    try {
      const userId = req.user.id;
      const { translationId } = req.params;
      const deleted = await aiTranslationService.deleteUserTranslation(userId, translationId);
      if (deleted === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy bản dịch' });
      return res.status(200).send({ success: true, message: 'Đã xóa bản dịch' });
    } catch (error) {
      if (error.message.includes('Thiếu translationId')) return res.status(400).json({ success: false, message: error.message });
      return res.status(500).json({ success: false, message: 'Lỗi khi xóa bản dịch', error: error.message });
    }
  },
  clearMyTranslations: async (req, res) => {
    try {
      const userId = req.user.id;
      const count = await aiTranslationService.clearUserTranslations(userId);
      return res.status(200).json({ success: true, message: 'Đã xóa lịch sử dịch', deleted: count });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi khi xóa toàn bộ lịch sử dịch', error: error.message });
    }
  },

  getMyLessons: async (req, res) => {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const result = await aiLessonService.getUserLessons(userId, { page, limit });
      return res.status(200).json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách bài học', error: error.message });
    }
  },

  getLessonDetail: async (req, res) => {
    try {
      const { lessonId } = req.params;
      const requester = { id: req.user.id, role: req.user.role };
      const lesson = await aiLessonService.getLessonById(lessonId, requester);
      if (!lesson) return res.status(404).json({ success: false, message: 'Không tìm thấy bài học' });
      return res.status(200).json({ success: true, data: lesson });
    } catch (error) {
      if (error.statusCode === 403) return res.status(403).json({ success: false, message: error.message });
      return res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết bài học', error: error.message });
    }
  },

  deleteLesson: async (req, res) => {
    try {
      const { lessonId } = req.params;
      const requester = { id: req.user.id, role: req.user.role };
      const deleted = await aiLessonService.deleteLesson(lessonId, requester);
      if (deleted === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy bài học' });
      return res.status(204).send();
    } catch (error) {
      if (error.statusCode === 403) return res.status(403).json({ success: false, message: error.message });
      return res.status(500).json({ success: false, message: 'Lỗi khi xóa bài học', error: error.message });
    }
  },
};

module.exports = aiController;
