const notebookModel = require('../models/notebookModel');
const userModel = require('../models/userModel'); // Dùng để kiểm tra user tồn tại nếu cần
const notebookVocabItemModel = require('../models/notebookVocabItemModel');
const db = require('../config/db'); 


const notebookService = {
  createNotebook: async (notebookData) => {
    return await notebookModel.create(notebookData);
  },

  getPaginatedNotebooks: async (filters) => {
    const { page, limit, search, status, premium } = filters;
    const offset = (page - 1) * limit;

    const { notebooks, totalItems } = await notebookModel.findAllPaginated({
      limit,
      offset,
      search,
      status,
      premium,
    });
    
    const totalPages = Math.ceil(totalItems / limit);
    
    // Định dạng dữ liệu trả về theo yêu cầu
    return {
      data: {
        data:notebooks,
          meta: {
          page: page,
          limit: limit,
          total: totalItems,
          totalPages: totalPages,
        }
      }
    };
  },

  getUserNotebooks: async (userId, filters) => {
    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    const { notebooks, totalItems } = await notebookModel.findAllByOwner(userId, { limit, offset });
    
    const totalPages = Math.ceil(totalItems / limit);
    return { data: notebooks, meta: { total: totalItems, page, limit, totalPages } };
  },

  // --- HÀM MỚI ---
  getSystemNotebooks: async (filters) => {
    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    const { notebooks, totalItems } = await notebookModel.findAllSystemPublic({ limit, offset });

    const totalPages = Math.ceil(totalItems / limit);
    return { data: notebooks, meta: { total: totalItems, page, limit, totalPages } };
  },


  getNotebookById: async (id) => {
    const notebook = await notebookModel.findById(id);

    // Nếu model trả về null/undefined, nghĩa là không tìm thấy
    if (!notebook) {
      throw new Error('Notebook không tồn tại.');
    }

    return notebook;
  },


  updateNotebook: async (id, updateData) => {
    // Loại bỏ trường 'id' khỏi dữ liệu cập nhật để tránh lỗi
    const safeUpdateData = { ...updateData };
    delete safeUpdateData.id;

    const updatedNotebook = await notebookModel.update(id, safeUpdateData);

    // Nếu model không trả về gì, nghĩa là không tìm thấy notebook với ID đó
    if (!updatedNotebook) {
      throw new Error('Notebook không tồn tại.');
    }
    return updatedNotebook;
  },

  addVocabulariesToNotebook: async (notebookId, vocabIds) => {
    // Service có thể thêm logic kiểm tra xem notebook có tồn tại không trước khi gọi model,
    // nhưng để tối ưu, chúng ta có thể để transaction trong model xử lý việc này.
    
    const result = await notebookModel.addVocabularies(notebookId, vocabIds);
    return result;
  },

  removeVocabulariesFromNotebook: async (notebookId, vocabIds) => {
    const result = await notebookModel.removeVocabularies(notebookId, vocabIds);
    return result;
  },

  bulkUpdateStatus: async (ids, status) => {
    const updatedCount = await notebookModel.bulkUpdateStatus(ids, status);
    return updatedCount;
  },

  bulkDeleteNotebooks: async (ids) => {
    const deletedCount = await notebookModel.bulkDelete(ids);
    return deletedCount;
  },

  //user
  async createUserNotebook(userId, name) {
    return notebookModel.createUserNoteBook(userId, name);
  },

  async addVocabulariesUser(notebookId, userId, vocabIds) {
    const notebook = await notebookModel.findByIdAndUserId(notebookId, userId);
    if (!notebook) throw new Error('Notebook không tồn tại hoặc bạn không có quyền truy cập.');
    // Dùng lại logic transaction từ model của admin
    return notebookModel.addVocabularies(notebookId, vocabIds);
  },

  async removeVocabulariesUser(notebookId, userId, vocabIds) {
    const notebook = await notebookModel.findByIdAndUserId(notebookId, userId);
    if (!notebook) throw new Error('Notebook không tồn tại hoặc bạn không có quyền truy cập.');
    // Dùng lại logic transaction từ model của admin
    return notebookModel.removeVocabularies(notebookId, vocabIds);
  },
   async updateNotebookUser(notebookId, userId, name) {
    const updated = await notebookModel.update(notebookId, userId, name);
    if (!updated) throw new Error('Notebook không tồn tại hoặc bạn không có quyền truy cập.');
    return updated;
  },

    async getNotebookDetails(notebookId, userId, vocabFilters) {
    const notebook = await notebookModel.findByIdAndUserId(notebookId, userId);
    if (!notebook) throw new Error('Notebook không tồn tại hoặc bạn không có quyền truy cập.');

    const { page, limit } = vocabFilters;
    const offset = (page - 1) * limit;
    const { vocabularies, totalItems } = await notebookModel.findVocabulariesByNotebookId(notebookId, { ...vocabFilters, offset });
    
    notebook.vocabularies = {
      data: vocabularies,
      meta: { page, limit, total: totalItems, totalPages: Math.ceil(totalItems / limit) }
    };
    return notebook;
  },
  









  // createNotebook: async (notebookData) => {
  //   return await notebookModel.create(notebookData);
  // },
  listNotebooks: async ({ userId, type, page, limit }) => {
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;

    return await notebookModel.findAll({
      userId,
      type,
      limit: limitInt,
      offset
    });
  },
  getGroupedNotebooks: async (sortBy) => {
    // Lấy tất cả sổ tay hệ thống từ model
    const allSystemNotebooks = await notebookModel.findAllSystem(sortBy);

    // Phân nhóm kết quả thành 'free' và 'premium'
    const groupedResult = {
      free: [],
      premium: []
    };

    for (const notebook of allSystemNotebooks) {
      if (notebook.is_premium) {
        groupedResult.premium.push(notebook);
      } else {
        groupedResult.free.push(notebook);
      }
    }
    
    return groupedResult;
  },
  addVocabToNotebook: async ({ notebookId, vocabIds, status, userId, isAdmin }) => {
    // Bước 1: Kiểm tra xem sổ tay có tồn tại và người dùng có quyền truy cập không.
    const notebook = await notebookModel.findByIdSimple(notebookId);

    if (!notebook) {
      throw new Error('NOTEBOOK_NOT_FOUND_OR_FORBIDDEN');
    }
    
    // Nếu không phải admin, user chỉ được sửa sổ tay của chính mình.
    if (!isAdmin && notebook.user_id !== userId) {
      throw new Error('NOTEBOOK_NOT_FOUND_OR_FORBIDDEN');
    }
    
    // Bước 2: Gọi model để thực hiện thêm từ vựng (model sẽ xử lý transaction)
    return await notebookModel.addVocabularies(notebookId, vocabIds, status);
  },
  getVocabInNotebook: async ({ notebookId, userId, isAdmin, filters, pagination }) => {
    // Bước 1: Kiểm tra quyền truy cập
    const notebook = await notebookModel.findByIdSimple(notebookId);

    if (!notebook) {
      throw new Error('NOTEBOOK_NOT_FOUND_OR_FORBIDDEN');
    }

    // Nếu không phải admin và sổ tay không phải của user cũng không phải sổ tay hệ thống
    if (!isAdmin && notebook.user_id !== userId && notebook.user_id !== null) {
      throw new Error('NOTEBOOK_NOT_FOUND_OR_FORBIDDEN');
    }

    // Bước 2: Gọi model để lấy dữ liệu
    const pageInt = parseInt(pagination.page, 10);
    const limitInt = parseInt(pagination.limit, 10);
    const offset = (pageInt - 1) * limitInt;
    
    return await notebookModel.findVocabulariesByNotebookId({
        notebookId,
        filters,
        limit: limitInt,
        offset
    });
  },
  removeVocabFromNotebook: async ({ notebookId, vocabId, userId, isAdmin }) => {
    // Bước 1: Kiểm tra quyền truy cập, tương tự như API thêm từ vựng
    const notebook = await notebookModel.findByIdSimple(notebookId);

    if (!notebook) {
      throw new Error('NOTEBOOK_NOT_FOUND_OR_FORBIDDEN');
    }
    
    if (!isAdmin && notebook.user_id !== userId) {
      throw new Error('NOTEBOOK_NOT_FOUND_OR_FORBIDDEN');
    }
    
    // Bước 2: Gọi model để thực hiện xóa (model sẽ xử lý transaction)
    return await notebookModel.removeVocabulary(notebookId, vocabId);
  },
  updateVocabStatus: async ({ notebookId, vocabId, status, userId, isAdmin }) => {
    // Bước 1: Kiểm tra quyền truy cập
    const notebook = await notebookModel.findByIdSimple(notebookId);

    if (!notebook) {
      throw new Error('NOTEBOOK_NOT_FOUND_OR_FORBIDDEN');
    }
    
    if (!isAdmin && notebook.user_id !== userId) {
      throw new Error('NOTEBOOK_NOT_FOUND_OR_FORBIDDEN');
    }
    
    // Bước 2: Gọi model để thực hiện cập nhật
    return await notebookModel.updateVocabularyStatus(notebookId, vocabId, status);
  },
  deleteUserNotebook: async (notebookId, userId) => {
    // Bước 1: Lấy thông tin sổ tay để kiểm tra chủ sở hữu
    const notebook = await notebookModel.findByIdSimple(notebookId);

    // Kiểm tra sổ tay không tồn tại hoặc không thuộc sở hữu của user
    if (!notebook || notebook.user_id !== userId) {
      // Trả về null để controller biết và gửi lỗi 404
      return null; 
    }

    // Bước 2: Gọi model để thực hiện xóa
    return await notebookModel.deleteById(notebookId);
  },
  deleteSystemNotebook: async (notebookId) => {
    // Bước 1: Lấy thông tin sổ tay để kiểm tra
    const notebook = await notebookModel.findByIdSimple(notebookId);

    // Kiểm tra sổ tay không tồn tại HOẶC nó LÀ sổ tay của người dùng (không phải của hệ thống)
    if (!notebook || notebook.user_id !== null) {
      // Trả về null để controller biết và gửi lỗi 404
      return null; 
    }

    // Bước 2: Gọi model để thực hiện xóa
    // Tái sử dụng hàm deleteById đã viết ở yêu cầu trước
    return await notebookModel.deleteById(notebookId);
  },
  updateSystemNotebook: async (notebookId, updateData) => {
    // Bước 1: Kiểm tra xem sổ tay có phải của hệ thống không
    const notebook = await notebookModel.findByIdSimple(notebookId);

    if (!notebook || notebook.user_id !== null) {
      return null; // Không tồn tại hoặc là sổ tay của user
    }
    
    // Lọc ra các trường không được phép cập nhật (nếu có)
    const allowedUpdates = { ...updateData };
    delete allowedUpdates.id;
    delete allowedUpdates.user_id;
    delete allowedUpdates.vocab_count; // vocab_count chỉ được cập nhật khi thêm/xóa từ
    
    if (Object.keys(allowedUpdates).length === 0) {
        throw new Error('Không có trường hợp lệ nào để cập nhật.');
    }

    // Bước 2: Gọi model để thực hiện cập nhật
    return await notebookModel.updateById(notebookId, allowedUpdates);
  },
  


};

module.exports = notebookService;