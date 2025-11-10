// controllers/vocabularyController.js

const vocabularyService = require('../services/vocabularyService');

const vocabularyController = {
  createOrUpdateVocabulariesAdmin: async (req, res) => {
    try {
      const vocabulariesData = req.body;

      if (!Array.isArray(vocabulariesData) || vocabulariesData.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu đầu vào phải là một mảng và không được rỗng.'
        });
      }
      
      // Gọi service mới
      const result = await vocabularyService.bulkCreateOrUpdateVocabularies(vocabulariesData);

      const totalProcessed = vocabulariesData.length;
      const successCount = result.processedItems.length;
      const failureCount = result.errors.length;

      res.status(201).json({
        success: true,
        message: `Đã xử lý ${totalProcessed} mục. Thành công: ${successCount}, Thất bại: ${failureCount}.`,
        data: result.processedItems,
        errors: result.errors
      });

    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xử lý từ vựng', error: error.message });
    }
  },

  getVocabulariesAdmin: async (req, res) => {
    try {
      const filters = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
        search: req.query.search || '',
        level: req.query.level || '',
        notebookId: req.query.notebookId || '',
      };

      const result = await vocabularyService.getPaginatedVocabularies(filters);
      
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách từ vựng thành công.',
        data: result,
      });

    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách từ vựng', error: error.message });
    }
  },

  bulkDeleteVocabulariesAdmin: async (req, res) => {
    try {
      const { ids } = req.body;

      // Validation
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ids phải là một mảng và không được rỗng.'
        });
      }

      const deletedCount = await vocabularyService.bulkDeleteVocabularies(ids);

      res.status(200).json({
        success: true,
        message: `Đã xóa thành công ${deletedCount} từ vựng.`,
      });

    } catch (error) {
      // Bắt các lỗi cụ thể nếu cần, ví dụ lỗi ràng buộc foreign key nếu không có ON DELETE CASCADE
      res.status(500).json({ success: false, message: 'Lỗi khi xóa từ vựng', error: error.message });
    }
  },

  getVocabularyByIdAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      const vocabulary = await vocabularyService.getVocabularyById(id);

      res.status(200).json({
        success: true,
        message: 'Lấy thông tin từ vựng thành công.',
        data: vocabulary
      });

    } catch (error) {
      // Bắt lỗi cụ thể khi không tìm thấy
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin từ vựng', error: error.message });
    }
  },







  createVocabulary: async (req, res) => {
    try {
      const { hanzi, pinyin, meaning, level, notes, image_url, wordTypes } = req.body;

      // --- Validation cơ bản ---
      if (!hanzi || !pinyin || !meaning || !level) {
        return res.status(400).json({
          success: false,
          message: 'Các trường hanzi, pinyin, meaning, và level là bắt buộc.'
        });
      }

      const newVocabulary = await vocabularyService.createVocabulary({
        hanzi,
        pinyin,
        meaning,
        level,
        notes,
        image_url,
        wordTypes // Đây là một mảng, ví dụ: ["Danh từ", "Động từ"]
      });

      res.status(201).json({
        success: true,
        message: 'Tạo từ vựng mới thành công.',
        data: newVocabulary
      });

    } catch (error) {
      // Lỗi unique violation cho (hanzi, pinyin)
      if (error.code === '23505' && error.constraint === 'Vocabulary_hanzi_pinyin_key') {
        return res.status(409).json({
          success: false,
          message: `Từ vựng với Hán tự '${req.body.hanzi}' và Pinyin '${req.body.pinyin}' đã tồn tại.`
        });
      }
      
      // Lỗi foreign key nếu một `word_type` không tồn tại
       if (error.code === '23503') {
          return res.status(409).json({
              success: false,
              message: `Tạo thất bại. Một trong các loại từ cung cấp không hợp lệ.`,
              error: error.detail
          });
      }

      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo từ vựng',
        error: error.message
      });
    }
  },
  searchVocabularies: async (req, res) => {
    try {
      const { query = '', level, page = 1, limit = 20 } = req.query;

      const result = await vocabularyService.searchVocabularies({ 
        query, 
        level, 
        page, 
        limit 
      });
      
      res.status(200).json({
        success: true,
        message: 'Tìm kiếm từ vựng thành công.',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tìm kiếm từ vựng',
        error: error.message
      });
    }
  },
  getVocabularyById: async (req, res) => {
    try {
      const { id } = req.params;
      const vocabulary = await vocabularyService.getVocabularyById(id);

      if (!vocabulary) {
        return res.status(404).json({
          success: false,
          message: 'Từ vựng không tồn tại.'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Lấy chi tiết từ vựng thành công.',
        data: vocabulary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy chi tiết từ vựng',
        error: error.message
      });
    }
  },
  getAdminVocabularies: async (req, res) => {
    try {
      // Lấy các tham số từ query string
      const { search = '', level, page = 1, limit = 10 } = req.query;

      const result = await vocabularyService.getAdminVocabularies({
        search,
        level,
        page,
        limit
      });

      res.status(200).json({
        success: true,
        message: 'Lấy danh sách từ vựng cho admin thành công.',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách từ vựng',
        error: error.message
      });
    }
  },
  deleteVocabulary: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await vocabularyService.deleteVocabulary(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Từ vựng không tồn tại.'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Xóa từ vựng thành công.',
        data: { id: result.id } // Trả về ID để xác nhận
      });

    } catch (error) {
      // Xử lý lỗi foreign_key_violation (code 23503)
      // Lỗi này xảy ra khi cố gắng xóa một từ vựng vẫn còn trong sổ tay của người dùng.
      if (error.code === '23503') {
        return res.status(409).json({ // 409 Conflict
          success: false,
          message: 'Không thể xóa từ vựng vì nó đang được sử dụng trong sổ tay của người dùng.',
          error: error.detail
        });
      }

      res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa từ vựng',
        error: error.message
      });
    }
  },
  updateVocabulary: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Kiểm tra nếu body rỗng
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Yêu cầu nội dung để cập nhật.'
        });
      }

      const updatedVocabulary = await vocabularyService.updateVocabulary(id, updateData);

      if (!updatedVocabulary) {
        return res.status(404).json({
          success: false,
          message: 'Từ vựng không tồn tại.'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Cập nhật từ vựng thành công.',
        data: updatedVocabulary
      });

    } catch (error) {
      // Xử lý lỗi unique (hanzi, pinyin)
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: `Cập nhật thất bại. Cặp Hán tự và Pinyin này đã tồn tại.`,
          error: error.detail
        });
      }
      
      // Lỗi foreign key nếu một `word_type` không tồn tại
       if (error.code === '23503') {
          return res.status(409).json({
              success: false,
              message: `Cập nhật thất bại. Một trong các loại từ cung cấp không hợp lệ.`,
              error: error.detail
          });
      }

      res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật từ vựng',
        error: error.message
      });
    }
  },

};

module.exports = vocabularyController;