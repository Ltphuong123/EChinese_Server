// services/vocabularyService.js

const vocabularyModel = require('../models/vocabularyModel');

const vocabularyService = {
  bulkCreateOrUpdateVocabularies: async (vocabulariesData) => {
    const processedItems = [];
    const failedItems = [];

    for (const vocabData of vocabulariesData) {
      try {
        // --- Validation cơ bản ---
        if (!vocabData.hanzi || !vocabData.pinyin || !vocabData.meaning) {
            throw new Error('Thiếu thông tin bắt buộc (hanzi, pinyin, meaning).');
        }

        let result;
        let action = 'create'; // Giả định hành động mặc định là 'create'

        // --- Logic kiểm tra ID ---
        if (vocabData.id) {
          // Nếu có ID, kiểm tra xem nó có thực sự tồn tại trong database không
          const idExists = await vocabularyModel.exists(vocabData.id);
          
          if (idExists) {
            // ID tồn tại -> thực hiện cập nhật
            action = 'update';
          } else {
            // ID không tồn tại -> coi như tạo mới, loại bỏ ID không hợp lệ
            // Đặt id thành null để đảm bảo hàm create không bị ảnh hưởng
            vocabData.id = null; 
          }
        }

        // --- Thực hiện hành động ---
        if (action === 'update') {
          result = await vocabularyModel.updateWithWordTypes(vocabData.id, vocabData);
        } else { // action === 'create'
          // Đảm bảo không truyền id rác vào hàm create
          delete vocabData.id;
          result = await vocabularyModel.createWithWordTypes(vocabData);
        }
        
        // Thêm thông tin về hành động đã thực hiện để dễ debug
        processedItems.push({ ...result, action });

      } catch (error) {
        failedItems.push({
          item: vocabData,
          error: error.message,
          detail: error.detail
        });
      }
    }

    return { processedItems, failedItems };
  },
  
  getPaginatedVocabularies: async (filters) => {
    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    // Truyền tất cả filters xuống model
    const { vocabularies, totalItems } = await vocabularyModel.findAllPaginated({
      ...filters,
      limit,
      offset,
    });
    
    const totalPages = Math.ceil(totalItems / limit);
    
    return {
      data: vocabularies,
      meta: {
        page,
        limit,
        total: totalItems,
        totalPages,
      }
    };
  },

  bulkDeleteVocabularies: async (ids) => {
    // Gọi một hàm duy nhất trong model, hàm này sẽ xử lý toàn bộ transaction.
    const deletedCount = await vocabularyModel.bulkDeleteWithRelations(ids);
    return deletedCount;
  },

  getVocabularyById: async (id) => {
    const vocabulary = await vocabularyModel.findById(id);
    
    if (!vocabulary) {
      throw new Error(`Từ vựng với ID ${id} không tồn tại.`);
    }

    return vocabulary;
  },









  createVocabulary: async (vocabData) => {
    return await vocabularyModel.create(vocabData);
  },
  searchVocabularies: async ({ query, level, page, limit }) => {
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;
    
    return await vocabularyModel.search({ query, level, limit: limitInt, offset });
  },
  getAdminVocabularies: async ({ search, level, page, limit }) => {
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;

    return await vocabularyModel.findAllForAdmin({
      search,
      level,
      limit: limitInt,
      offset
    });
  },
  deleteVocabulary: async (vocabId) => {
    return await vocabularyModel.deleteById(vocabId);
  },
  updateVocabulary: async (vocabId, updateData) => {
    return await vocabularyModel.updateById(vocabId, updateData);
  },

};

module.exports = vocabularyService;