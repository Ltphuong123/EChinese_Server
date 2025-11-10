// services/vocabularyService.js

const vocabularyModel = require('../models/vocabularyModel');
const { v4: uuidv4 } = require('uuid'); // Import để tạo giá trị duy nhất

const vocabularyService = {
  bulkCreateOrUpdateVocabularies: async (vocabulariesData) => {
    const processedItems = [];
    const errors = [];

    for (const [index, vocabData] of vocabulariesData.entries()) {
      let originalHanzi = vocabData.hanzi;
      let errorDetail = null;
      let isError = false;

      try {
        // --- 1. Xử lý giá trị mặc định và validation ---
        if (!vocabData.hanzi) {
            vocabData.hanzi = `DEFAULT_HANZI_${uuidv4()}`;
            errorDetail = 'Thiếu thông tin bắt buộc: hanzi. Đã tạo giá trị mặc định duy nhất.';
            isError = true;
        }
        if (!vocabData.pinyin) {
            vocabData.pinyin = 'chưa có phiên âm';
            if(!errorDetail) errorDetail = 'Thiếu thông tin bắt buộc: pinyin. Đã thêm giá trị mặc định.';
            isError = true;
        }
        if (!vocabData.meaning) {
            vocabData.meaning = 'chưa có nghĩa';
            if(!errorDetail) errorDetail = 'Thiếu thông tin bắt buộc: meaning. Đã thêm giá trị mặc định.';
            isError = true;
        }
        if (!vocabData.word_types || !Array.isArray(vocabData.word_types) || vocabData.word_types.length === 0) {
            vocabData.word_types = ['Danh từ'];
            if(!errorDetail) errorDetail = 'Thiếu thông tin bắt buộc: wordTypes. Đã thêm giá trị mặc định [DT].';
            isError = true;
        }
        if (!vocabData.level || !Array.isArray(vocabData.level) || vocabData.level.length === 0) {
            vocabData.level = ['HSK1'];
            if(!errorDetail) errorDetail = 'Thiếu thông tin bắt buộc: level. Đã thêm giá trị mặc định [HSK1].';
            isError = true;
        }

        // --- 2. Logic kiểm tra ID và quyết định hành động (create/update) ---
        let action = 'create';
        if (vocabData.id) {
          const idExists = await vocabularyModel.exists(vocabData.id);
          if (idExists) {
            action = 'update';
          } else {
            // ID được cung cấp nhưng không hợp lệ, vẫn tạo mới.
            // >>> THAY ĐỔI Ở ĐÂY: Không còn gán lỗi cho trường hợp này nữa. <<<
            // if(!errorDetail) errorDetail = `ID '${vocabData.id}' không tồn tại. Đã tạo một bản ghi mới thay vì cập nhật.`;
            // isError = true; // <-- BỎ DÒNG NÀY
            vocabData.id = null; // Vẫn loại bỏ ID không hợp lệ để đảm bảo hành động 'create' thành công.
          }
        }
        
        // --- 3. Luôn thử lưu vào Database ---
        let result;
        if (action === 'update') {
          result = await vocabularyModel.updateWithWordTypes(vocabData.id, vocabData);
        } else {
          delete vocabData.id;
          result = await vocabularyModel.createWithWordTypes(vocabData);
        }
        
        // --- 4. Ghi nhận kết quả ---
        if (isError) {
          errors.push({
            index: index,
            hanzi: result.hanzi,
            id: result.id,
            detail: errorDetail
          });
        }
        processedItems.push({ ...result, action });

      } catch (dbError) {
        errors.push({
          index: index,
          hanzi: originalHanzi || vocabData.hanzi,
          id: vocabData.id || null,
          detail: dbError.detail || dbError.message
        });
      }
    }

    return { processedItems, errors };
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