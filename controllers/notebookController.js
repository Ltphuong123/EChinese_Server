const notebookService = require('../services/notebookService');

const notebookController = {

  createNotebookAdmin: async (req, res) => {
    try {
      const notebookData = req.body;

      // --- Validation cơ bản ---
      if (!notebookData.name || !notebookData.status) {
        return res.status(400).json({
          success: false,
          message: "Các trường 'name' và 'status' là bắt buộc."
        });
      }

      if (!['published', 'draft'].includes(notebookData.status)) {
         return res.status(400).json({
          success: false,
          message: "Trường 'status' chỉ có thể là 'published' hoặc 'draft'."
        });
      }

      // Đảm bảo options là một object
      if (typeof notebookData.options !== 'object' || notebookData.options === null) {
          notebookData.options = {};
      }
      
      const Notebook = await notebookService.createNotebook(notebookData);

      
      res.status(201).json({
        // success: true,
        // message: 'Tạo notebook thành công và trả về danh sách tất cả notebook.',
        data: Notebook
      });

    } catch (error) {
      // Bắt lỗi ràng buộc duy nhất (unique constraint) nếu có
      if (error.code === '23505') { 
        return res.status(409).json({ success: false, message: `Lỗi: ${error.detail}` });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi tạo notebook', error: error.message });
    }
  },

  getNotebooksAdmin: async (req, res) => {
    try {
      // Lấy các tham số query và đặt giá trị mặc định
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const search = req.query.search || '';
      const status = req.query.status || 'all'; // 'all', 'published', 'draft'
      const premium = req.query.premium || 'all'; // 'all', 'true', 'false'

      const result = await notebookService.getPaginatedNotebooks({
        page,
        limit,
        search,
        status,
        premium,
      });
      
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách notebooks thành công',
        data: result.data
      });

    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách notebooks', error: error.message });
    }
  },

  getNotebookByIdAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      const notebook = await notebookService.getNotebookById(id);
      
      res.status(200).json({
        success: true,
        message: 'Lấy thông tin notebook thành công.',
        data: notebook
      });

    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin notebook', error: error.message });
    }
  },

  updateNotebookAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validation: Đảm bảo có dữ liệu để cập nhật
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: 'Không có dữ liệu để cập nhật.' });
      }
      
      // Validation: Nếu status được cung cấp, nó phải hợp lệ
      if (updateData.status && !['published', 'draft'].includes(updateData.status)) {
         return res.status(400).json({
          success: false,
          message: "Trường 'status' chỉ có thể là 'published' hoặc 'draft'."
        });
      }

      const updatedNotebook = await notebookService.updateNotebook(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Cập nhật notebook thành công.',
        data: updatedNotebook
      });

    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.code === '23505') { // Lỗi unique constraint (ví dụ: tên notebook bị trùng nếu bạn có ràng buộc)
        return res.status(409).json({ success: false, message: `Lỗi: ${error.detail}` });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật notebook', error: error.message });
    }
  },

  addVocabulariesToNotebookAdmin: async (req, res) => {
    try {
      const { notebookId } = req.params;
      const { vocabIds } = req.body;

      // --- Validation ---
      if (!vocabIds || !Array.isArray(vocabIds) || vocabIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'vocabIds phải là một mảng và không được rỗng.'
        });
      }

      const result = await notebookService.addVocabulariesToNotebook(notebookId, vocabIds);

      res.status(200).json({
        success: true,
        message: `Đã thêm thành công ${result.addedCount} từ vựng vào notebook.`,
        addedCount: result.addedCount
      });

    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi thêm từ vựng vào notebook', error: error.message });
    }
  },

  removeVocabulariesFromNotebookAdmin: async (req, res) => {
    try {
      const { notebookId } = req.params;
      const { vocabIds } = req.body;

      // Validation
      if (!vocabIds || !Array.isArray(vocabIds) || vocabIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'vocabIds phải là một mảng và không được rỗng.'
        });
      }

      const result = await notebookService.removeVocabulariesFromNotebook(notebookId, vocabIds);
      
      res.status(200).json({
        success: true,
        message: `Đã xóa thành công ${result.removedCount} từ vựng khỏi notebook.`,
        // data: {
        //   notebookId: notebookId,
        //   removedCount: result.removedCount,
        //   newTotalVocabCount: result.newTotalVocabCount
        // }
      });

    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi xóa từ vựng khỏi notebook', error: error.message });
    }
  },

  bulkUpdateNotebookStatusAdmin: async (req, res) => {
    try {
      const { ids, status } = req.body;

      // --- Validation ---
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ids phải là một mảng và không được rỗng.'
        });
      }

      if (!status || !['published', 'draft'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trường 'status' là bắt buộc và chỉ có thể là 'published' hoặc 'draft'."
        });
      }

      const updatedCount = await notebookService.bulkUpdateStatus(ids, status);
      
      res.status(200).json({
        success: true,
        message: `Đã cập nhật trạng thái thành công cho ${updatedCount} notebook.`,
      });

    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái notebooks', error: error.message });
    }
  },

  bulkDeleteNotebooksAdmin: async (req, res) => {
    try {
      const { ids } = req.body;

      // Validation
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ids phải là một mảng và không được rỗng.'
        });
      }

      const deletedCount = await notebookService.bulkDeleteNotebooks(ids);

      res.status(200).json({
        success: true,
        message: `Đã xóa thành công ${deletedCount} notebook.`,
        data: {
          deletedCount: deletedCount
        }
      });

    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi xóa notebooks', error: error.message });
    }
  },

    async getNotebookDetails(req, res) {
    try {
        const userId = req.user.id;
        const { notebookId } = req.params;
        const vocabFilters = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            search: req.query.search || '',
            status: req.query.status || '',
        };
        const notebook = await notebookService.getNotebookDetails(notebookId, userId, vocabFilters);
        res.status(200).json({ success: true, data: notebook });
    } catch (error) {
        if (error.message.includes('không tồn tại')) return res.status(404).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: error.message });
    }
  },

  //user 
  async createUserNotebook(req, res) {
    try {
      const userId = req.user.id;
      const { name } = req.body;
      if (!name) return res.status(400).json({ success: false, message: 'Tên sổ tay là bắt buộc.' });
      
      const newNotebook = await notebookService.createUserNotebook(userId, name);
      res.status(201).json({ success: true, data: newNotebook });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getNotebooksUser: async (req, res) => {
    try {
      // Lấy các tham số query và đặt giá trị mặc định
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const search = req.query.search || '';
      const status = 'published';
      const premium = req.query.premium || 'all'; // 'all', 'true', 'false'

      const result = await notebookService.getPaginatedNotebooks({
        page,
        limit,
        search,
        status,
        premium,
      });
      
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách notebooks thành công',
        data: result.data
      });

    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách notebooks', error: error.message });
    }
  },

  async addVocabulariesToNotebookUser(req, res) {
    try {
      const userId = req.user.id;
      const { notebookId } = req.params;
      const { vocabIds } = req.body;
      if (!vocabIds || !Array.isArray(vocabIds) || vocabIds.length === 0) {
        return res.status(400).json({ success: false, message: 'vocabIds là một mảng bắt buộc.' });
      }

      const result = await notebookService.addVocabulariesUser(notebookId, userId, vocabIds);
      res.status(200).json({ 
        success: true, 
        message: `Đã thêm thành công ${result.addedCount} từ vựng.`,
        data: { newTotalVocabCount: result.newTotalVocabCount }
      });
    } catch (error) {
      if (error.message.includes('không tồn tại')) return res.status(404).json({ success: false, message: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async updateNotebookUser(req, res) {
    try {
      const userId = req.user.id;
      const { notebookId } = req.params;
      const { name } = req.body;
      if (!name) return res.status(400).json({ success: false, message: 'Tên sổ tay là bắt buộc.' });

      const updatedNotebook = await notebookService.updateNotebookUser(notebookId, userId, name);
      res.status(200).json({ success: true, data: updatedNotebook });
    } catch (error) {
      if (error.message.includes('không tồn tại')) return res.status(404).json({ success: false, message: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async removeVocabulariesFromNotebookUser(req, res) {
    try {
      const userId = req.user.id;
      const { notebookId } = req.params;
      const { vocabIds } = req.body;
      if (!vocabIds || !Array.isArray(vocabIds) || vocabIds.length === 0) {
        return res.status(400).json({ success: false, message: 'vocabIds là một mảng bắt buộc.' });
      }

      const result = await notebookService.removeVocabulariesUser(notebookId, userId, vocabIds);
      res.status(200).json({ 
        success: true, 
        message: `Đã xóa thành công ${result.removedCount} từ vựng.`,
        data: { newTotalVocabCount: result.newTotalVocabCount }
      });
    } catch (error) {
      if (error.message.includes('không tồn tại')) return res.status(404).json({ success: false, message: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  },



  


  listNotebooks: async (req, res) => {
    try {
      const userId = req.user.id; // Lấy ID của người dùng đang đăng nhập
      const { type, page = 1, limit = 20 } = req.query;

      // --- Validation cho `type` ---
      const allowedTypes = ['personal', 'system', 'premium', undefined];
      if (!allowedTypes.includes(type)) {
          return res.status(400).json({
              success: false,
              message: 'Giá trị của "type" không hợp lệ. Chỉ chấp nhận: personal, system, premium.'
          });
      }
      
      const result = await notebookService.listNotebooks({
        userId,
        type,
        page,
        limit
      });

      res.status(200).json({
        success: true,
        message: 'Lấy danh sách sổ tay thành công.',
        data: result
      });

    } catch (error) {
       res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách sổ tay',
        error: error.message
      });
    }
  },
  getGroupedNotebooks: async (req, res) => {
    try {
      const { sortBy = 'created_at' } = req.query; // Mặc định sắp xếp theo ngày tạo

      // --- Validation cho `sortBy` ---
      const allowedSorts = ['name', 'created_at', 'vocab_count'];
      if (!allowedSorts.includes(sortBy)) {
          return res.status(400).json({
              success: false,
              message: 'Giá trị của "sortBy" không hợp lệ. Chỉ chấp nhận: name, created_at, vocab_count.'
          });
      }

      const groupedNotebooks = await notebookService.getGroupedNotebooks(sortBy);

      res.status(200).json({
        success: true,
        message: 'Lấy danh sách sổ tay đã phân nhóm thành công.',
        data: groupedNotebooks
      });

    } catch (error) {
       res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách sổ tay',
        error: error.message
      });
    }
  },
  
  getVocabInNotebook: async (req, res) => {
    try {
      const { id: notebookId } = req.params;
      const { status, sortBy, page = 1, limit = 20 } = req.query;
      const { id: userId, role } = req.user;

      // --- Validation ---
      if (status) {
        const allowedStatus = ['đã thuộc', 'chưa thuộc', 'yêu thích', 'không chắc'];
        if (!allowedStatus.includes(status)) {
             return res.status(400).json({
                success: false,
                message: 'Giá trị của "status" không hợp lệ.'
            });
        }
      }
      if (sortBy) {
        const allowedSorts = ['hanzi_asc', 'hanzi_desc', 'pinyin_asc', 'pinyin_desc', 'added_at_asc', 'added_at_desc'];
        if (!allowedSorts.includes(sortBy)) {
             return res.status(400).json({
                success: false,
                message: 'Giá trị của "sortBy" không hợp lệ.'
            });
        }
      }

      const result = await notebookService.getVocabInNotebook({
        notebookId,
        userId,
        isAdmin: role === 'admin' || role === 'super admin',
        filters: { status, sortBy },
        pagination: { page, limit }
      });

      res.status(200).json({
        success: true,
        message: 'Lấy từ vựng trong sổ tay thành công.',
        data: result
      });

    } catch (error) {
       // Lỗi do notebook không tồn tại hoặc user không có quyền
      if (error.message === 'NOTEBOOK_NOT_FOUND_OR_FORBIDDEN') {
           return res.status(404).json({
              success: false,
              message: 'Sổ tay không tồn tại hoặc bạn không có quyền xem.'
          });
      }
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy từ vựng trong sổ tay',
        error: error.message
      });
    }
  },
  removeVocabFromNotebook: async (req, res) => {
    try {
      const { id: notebookId, vocabId } = req.params;
      const { id: userId, role } = req.user;

      const result = await notebookService.removeVocabFromNotebook({
        notebookId,
        vocabId,
        userId,
        isAdmin: role === 'admin' || role === 'super admin'
      });

      if (!result) {
          return res.status(404).json({
              success: false,
              message: 'Không tìm thấy từ vựng trong sổ tay này để xóa.'
          });
      }

      res.status(200).json({
        success: true,
        message: 'Xóa từ vựng khỏi sổ tay thành công.',
        data: {
          notebookId: notebookId,
          removedVocabId: vocabId,
          newVocabCount: result.newVocabCount
        }
      });

    } catch (error) {
       // Lỗi do notebook không tồn tại hoặc user không có quyền
      if (error.message === 'NOTEBOOK_NOT_FOUND_OR_FORBIDDEN') {
           return res.status(404).json({
              success: false,
              message: 'Sổ tay không tồn tại hoặc bạn không có quyền chỉnh sửa.'
          });
      }
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa từ vựng khỏi sổ tay',
        error: error.message
      });
    }
  },
  updateVocabStatus: async (req, res) => {
    try {
      const { id: notebookId, vocabId } = req.params;
      const { status } = req.body;
      const { id: userId, role } = req.user;

      // --- Validation ---
      if (!status) {
          return res.status(400).json({
              success: false,
              message: 'Trường "status" là bắt buộc.'
          });
      }
      const allowedStatus = ['đã thuộc', 'chưa thuộc', 'yêu thích', 'không chắc'];
      if (!allowedStatus.includes(status)) {
           return res.status(400).json({
              success: false,
              message: 'Giá trị của "status" không hợp lệ.'
          });
      }

      const updatedItem = await notebookService.updateVocabStatus({
        notebookId,
        vocabId,
        status,
        userId,
        isAdmin: role === 'admin' || role === 'super admin'
      });

      if (!updatedItem) {
          return res.status(404).json({
              success: false,
              message: 'Không tìm thấy từ vựng trong sổ tay này để cập nhật.'
          });
      }

      res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái từ vựng thành công.',
        data: updatedItem
      });

    } catch (error) {
       // Lỗi do notebook không tồn tại hoặc user không có quyền
      if (error.message === 'NOTEBOOK_NOT_FOUND_OR_FORBIDDEN') {
           return res.status(404).json({
              success: false,
              message: 'Sổ tay không tồn tại hoặc bạn không có quyền chỉnh sửa.'
          });
      }
      res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật trạng thái từ vựng',
        error: error.message
      });
    }
  },
  deleteUserNotebook: async (req, res) => {
    try {
      const { id: notebookId } = req.params;
      const userId = req.user.id; // Lấy ID của người dùng từ token

      const result = await notebookService.deleteUserNotebook(notebookId, userId);

      if (!result) {
          return res.status(404).json({
              success: false,
              message: 'Sổ tay không tồn tại hoặc bạn không có quyền xóa.'
          });
      }

      res.status(200).json({
        success: true,
        message: 'Xóa sổ tay thành công.',
        data: { id: result.id } // Trả về ID để xác nhận
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa sổ tay',
        error: error.message
      });
    }
  },


};

module.exports = notebookController;