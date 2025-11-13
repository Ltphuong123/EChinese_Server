// services/vocabularyService.js

const vocabularyModel = require('../models/vocabularyModel');
const { v4: uuidv4 } = require('uuid'); // Import để tạo giá trị duy nhất


// const generateUpdateDetails = (newData, existingData) => {
//     const changes = [];

//     // So sánh các trường đơn giản
//     if (newData.pinyin && newData.pinyin !== existingData.pinyin) {
//         changes.push(`pinyin`);
//     }
//     if (newData.meaning && newData.meaning !== existingData.meaning) {
//         changes.push(`meaning`);
//     }
//     // So sánh mảng level (cần chuyển về chuỗi để so sánh)
//     if (newData.level && JSON.stringify(newData.level.sort()) !== JSON.stringify(existingData.level.sort())) {
//         changes.push(`level`);
//     }
    
//     // So sánh và tìm các word_types mới
//     const mergedWordTypes = newData.word_types.filter(type => !existingData.word_types.includes(type));
//     if (mergedWordTypes.length > 0) {
//         changes.push(`thêm word_types [${mergedWordTypes.join(', ')}]`);
//     }

//     if (changes.length > 0) {
//         return `Từ đã tồn tại. Đã cập nhật: ${changes.join('; ')}.`;
//     }

//     return "Từ đã tồn tại."; // Không có gì thay đổi
// };

/**
 * Hàm trợ giúp kiểm tra một chuỗi có phải là định dạng UUID hợp lệ không.
 * @param {string} str - Chuỗi cần kiểm tra.
 * @returns {boolean}
 */
const isUuid = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

/**
 * Hàm trợ giúp để so sánh và tạo ra chuỗi chi tiết về các thay đổi.
 * @param {object} newData - Dữ liệu mới từ input.
 * @param {object} existingData - Dữ liệu đã có trong database.
 * @returns {string} - Một chuỗi mô tả các thay đổi, hoặc chuỗi rỗng nếu không có gì thay đổi.
 */
const generateUpdateDetails = (newData, existingData) => {
    const changes = [];
    const existingWordTypes = existingData.word_types || [];
    const newWordTypes = newData.word_types || [];
    
    // So sánh các trường đơn giản
    if (newData.hanzi && newData.hanzi !== existingData.hanzi) {
        changes.push(`hanzi`);
    }
    if (newData.pinyin && newData.pinyin !== existingData.pinyin) {
        changes.push(`pinyin`);
    }
    if (newData.meaning && newData.meaning !== existingData.meaning) {
        changes.push(`meaning`);
    }
    // So sánh mảng level
    if (newData.level && JSON.stringify(newData.level.sort()) !== JSON.stringify((existingData.level || []).sort())) {
        changes.push(`level`);
    }
    
    // So sánh và tìm các word_types mới
    const mergedWordTypes = newWordTypes.filter(type => !existingWordTypes.includes(type));
    if (mergedWordTypes.length > 0) {
        changes.push(`thêm word_types [${mergedWordTypes.join(', ')}]`);
    }

    if (changes.length > 0) {
        return `Từ đã tồn tại. Đã cập nhật: ${changes.join('; ')}.`;
    }

    return "Từ đã tồn tại."; // Không có gì thay đổi
};



const vocabularyService = {
  




  
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















  // bulkCreateOrUpdateVocabularies: async (vocabulariesData) => {
  //   const processedItems = [];
  //   const errors = [];

  //   for (const [index, vocabData] of vocabulariesData.entries()) {
  //     let isError = false;
  //     let errorDetail = null;

  //     try {
  //       // --- 1. Validation và xử lý giá trị mặc định (giữ nguyên) ---
  //       if (!vocabData.hanzi) {
  //           vocabData.hanzi = `DEFAULT_HANZI_${uuidv4()}`;
  //           isError = true;
  //           errorDetail = 'Thiếu thông tin bắt buộc: hanzi. Đã tạo giá trị mặc định duy nhất.';
  //       }
  //       // ... (Các validation khác cho pinyin, meaning, word_types, level giữ nguyên) ...
  //       if (!vocabData.pinyin) { vocabData.pinyin = 'chưa có phiên âm'; if(!errorDetail) { isError = true; errorDetail = 'Thiếu pinyin.'; } }
  //       if (!vocabData.meaning) { vocabData.meaning = 'chưa có nghĩa'; if(!errorDetail) { isError = true; errorDetail = 'Thiếu meaning.'; } }
  //       if (!vocabData.word_types || !Array.isArray(vocabData.word_types)) { vocabData.word_types = []; }
  //       if (vocabData.word_types.length === 0) { vocabData.word_types = ['DT']; if(!errorDetail) { isError = true; errorDetail = 'Thiếu word_types.'; } }
  //       if (!vocabData.level || !Array.isArray(vocabData.level) || vocabData.level.length === 0) { vocabData.level = ['HSK1']; if(!errorDetail) { isError = true; errorDetail = 'Thiếu level.'; } }

  //       // --- 2. Logic UPSERT & MERGE đã được cải tiến ---
  //       let result;
  //       let action;

  //       const existingVocab = await vocabularyModel.findByHanzi(vocabData.hanzi);

  //       if (existingVocab) {
  //         action = 'update';
  //         vocabData.id = existingVocab.id;

  //         // Tạo thông báo chi tiết TRƯỚC khi cập nhật
  //         const updateDetails = generateUpdateDetails(vocabData, existingVocab);
          
  //         // Chỉ thực hiện ghi vào DB nếu có sự thay đổi thực sự
  //         if (updateDetails !== "Từ đã tồn tại.") {
  //             result = await vocabularyModel.upsertAndMerge(vocabData);
  //         } else {
  //             // Nếu không có gì thay đổi, trả về dữ liệu hiện có
  //             result = existingVocab;
  //         }

  //         // Luôn báo cáo về trường hợp "đã tồn tại" này
  //         isError = true;
  //         errorDetail = updateDetails;

  //       } else {
  //         action = 'create';
  //         delete vocabData.id;
  //         result = await vocabularyModel.createWithWordTypes(vocabData);
  //       }
        
  //       // --- 3. Ghi nhận kết quả ---
  //       if (isError) {
  //         errors.push({
  //           index: index,
  //           hanzi: result.hanzi,
  //           id: result.id,
  //           detail: errorDetail
  //         });
  //       }
  //       processedItems.push({ ...result, action });

  //     } catch (dbError) {
  //       errors.push({
  //         index: index,
  //         hanzi: vocabData.hanzi,
  //         id: vocabData.id || null,
  //         detail: dbError.detail || dbError.message
  //       });
  //     }
  //   }

  //   return { processedItems, errors };
  // },

  // bulkCreateOrUpdateVocabularies: async (vocabulariesData) => {
  //   const processedItems = [];
  //   const errors = [];

  //   for (const [index, vocabData] of vocabulariesData.entries()) {
  //     let isError = false;
  //     let errorDetail = null;

  //     try {
  //       // --- 1. Validation và xử lý giá trị mặc định ---
  //       if (!vocabData.hanzi) {
  //           vocabData.hanzi = `DEFAULT_HANZI_${uuidv4()}`;
  //           isError = true;
  //           errorDetail = 'Thiếu thông tin bắt buộc: hanzi. Đã tạo giá trị mặc định.';
  //       }
  //       if (!vocabData.pinyin) {
  //           vocabData.pinyin = 'chưa có phiên âm';
  //           if(!errorDetail) { isError = true; errorDetail = 'Thiếu pinyin. Đã thêm giá trị mặc định.'; }
  //       }
  //       if (!vocabData.meaning) {
  //           vocabData.meaning = 'chưa có nghĩa';
  //           if(!errorDetail) { isError = true; errorDetail = 'Thiếu meaning. Đã thêm giá trị mặc định.'; }
  //       }
  //       if (!vocabData.word_types || !Array.isArray(vocabData.word_types)) {
  //           vocabData.word_types = [];
  //       }
  //       if (vocabData.word_types.length === 0) {
  //           vocabData.word_types = ['DT'];
  //           if(!errorDetail) { isError = true; errorDetail = 'Thiếu word_types. Đã thêm giá trị mặc định [DT].'; }
  //       }
  //       if (!vocabData.level || !Array.isArray(vocabData.level) || vocabData.level.length === 0) {
  //           vocabData.level = ['HSK1'];
  //           if(!errorDetail) { isError = true; errorDetail = 'Thiếu level. Đã thêm giá trị mặc định [HSK1].'; }
  //       }

  //       // --- 2. Logic xử lý: Ưu tiên ID, sau đó đến Hanzi ---
  //       let result;
  //       let action = 'pending';

  //       // BƯỚC 2.1: KIỂM TRA ID TRƯỚC
  //       if (vocabData.id) {
  //           const existingVocabById = await vocabularyModel.findById(vocabData.id);
  //           if (existingVocabById) {
  //               action = 'update';
  //               const updateDetails = generateUpdateDetails(vocabData, existingVocabById);
                
  //               if (updateDetails !== "Từ đã tồn tại.") {
  //                   result = await vocabularyModel.upsertAndMerge(vocabData);
  //               } else {
  //                   result = existingVocabById;
  //               }
  //               isError = true;
  //               errorDetail = updateDetails;
  //           }
  //       }

  //       // BƯỚC 2.2: NẾU CHƯA XỬ LÝ, KIỂM TRA HANZI
  //       if (action === 'pending') {
  //           const existingVocabByHanzi = await vocabularyModel.findByHanzi(vocabData.hanzi);
  //           if (existingVocabByHanzi) {
  //               action = 'update';
  //               vocabData.id = existingVocabByHanzi.id;
  //               const updateDetails = generateUpdateDetails(vocabData, existingVocabByHanzi);

  //               if (updateDetails !== "Từ đã tồn tại.") {
  //                   result = await vocabularyModel.upsertAndMerge(vocabData);
  //               } else {
  //                   result = existingVocabByHanzi;
  //               }
  //               isError = true;
  //               errorDetail = updateDetails;
  //           }
  //       }
        
  //       // BƯỚC 2.3: NẾU VẪN CHƯA XỬ LÝ, TẠO MỚI
  //       if (action === 'pending') {
  //           action = 'create';
  //           delete vocabData.id;
  //           result = await vocabularyModel.createWithWordTypes(vocabData);
  //       }

  //       // --- 3. Ghi nhận kết quả ---
  //       if (isError) {
  //         errors.push({
  //           index: index,
  //           hanzi: result.hanzi,
  //           id: result.id,
  //           detail: errorDetail
  //         });
  //       }
  //       processedItems.push({ ...result, action });

  //     } catch (dbError) {
  //       errors.push({
  //         index: index,
  //         hanzi: vocabData.hanzi,
  //         id: vocabData.id || null,
  //         detail: dbError.detail || dbError.message
  //       });
  //     }
  //   }

  //   return { processedItems, errors };
  // },

  // bulkCreateOrUpdateVocabularies: async (vocabulariesData) => {
  //   const processedItems = [];
  //   const errors = [];

  //   for (const [index, vocabData] of vocabulariesData.entries()) {
  //     let isError = false;
  //     let errorDetail = null;

  //     try {
  //       // --- 1. Validation và xử lý giá trị mặc định ---
  //       if (!vocabData.hanzi) {
  //           vocabData.hanzi = `DEFAULT_HANZI_${uuidv4()}`;
  //           isError = true;
  //           errorDetail = 'Thiếu thông tin bắt buộc: hanzi. Đã tạo giá trị mặc định.';
  //       }
  //       if (!vocabData.pinyin) {
  //           vocabData.pinyin = 'chưa có phiên âm';
  //           if(!errorDetail) { isError = true; errorDetail = 'Thiếu pinyin. Đã thêm giá trị mặc định.'; }
  //       }
  //       if (!vocabData.meaning) {
  //           vocabData.meaning = 'chưa có nghĩa';
  //           if(!errorDetail) { isError = true; errorDetail = 'Thiếu meaning. Đã thêm giá trị mặc định.'; }
  //       }
  //       if (!vocabData.word_types || !Array.isArray(vocabData.word_types)) {
  //           vocabData.word_types = [];
  //       }
  //       if (vocabData.word_types.length === 0) {
  //           vocabData.word_types = ['DT'];
  //           if(!errorDetail) { isError = true; errorDetail = 'Thiếu word_types. Đã thêm giá trị mặc định [DT].'; }
  //       }
  //       if (!vocabData.level || !Array.isArray(vocabData.level) || vocabData.level.length === 0) {
  //           vocabData.level = ['HSK1'];
  //           if(!errorDetail) { isError = true; errorDetail = 'Thiếu level. Đã thêm giá trị mặc định [HSK1].'; }
  //       }

  //       // --- 2. Logic xử lý: Ưu tiên ID hợp lệ, sau đó đến Hanzi ---
  //       let result;
  //       let action;
  //       let existingVocab = null;

  //       // BƯỚC 2.1: KIỂM TRA ID HỢP LỆ VÀ TÌM KIẾM
  //       if (vocabData.id && isUuid(vocabData.id)) {
  //           existingVocab = await vocabularyModel.findById(vocabData.id);
  //       }
        
  //       // BƯỚC 2.2: NẾU KHÔNG TÌM THẤY BẰNG ID, TÌM BẰNG HANZI
  //       if (!existingVocab) {
  //           existingVocab = await vocabularyModel.findByHanzi(vocabData.hanzi);
  //       }
        
  //       // BƯỚC 2.3: QUYẾT ĐỊNH HÀNH ĐỘNG DỰA TRÊN KẾT QUẢ TÌM KIẾM
  //       if (existingVocab) {
  //           action = 'update';
  //           vocabData.id = existingVocab.id;
            
  //           const updateDetails = generateUpdateDetails(vocabData, existingVocab);
            
  //           if (updateDetails !== "Từ đã tồn tại.") {
  //               result = await vocabularyModel.upsertAndMerge(vocabData);
  //           } else {
  //               result = existingVocab;
  //           }
  //           isError = true;
  //           errorDetail = updateDetails;
  //       } else {
  //           action = 'create';
  //           delete vocabData.id;
  //           result = await vocabularyModel.createWithWordTypes(vocabData);
  //       }

  //       // --- 3. Ghi nhận kết quả ---
  //       if (isError) {
  //         errors.push({
  //           index: index,
  //           hanzi: result.hanzi,
  //           id: result.id,
  //           detail: errorDetail
  //         });
  //       }
  //       processedItems.push({ ...result, action });

  //     } catch (dbError) {
  //       errors.push({
  //         index: index,
  //         hanzi: vocabData.hanzi,
  //         id: vocabData.id || null,
  //         detail: dbError.detail || dbError.message
  //       });
  //     }
  //   }

  //   return { processedItems, errors };
  // },

  bulkCreateOrUpdateVocabularies: async (vocabulariesData) => {
    const processedItems = [];
    const errors = [];

    for (const [index, vocabData] of vocabulariesData.entries()) {
      let isError = false;
      let errorDetail = null;

      try {
        // --- 1. Validation và xử lý giá trị mặc định ---
        if (!vocabData.hanzi) {
            vocabData.hanzi = `DEFAULT_HANZI_${uuidv4()}`;
            isError = true;
            errorDetail = 'Thiếu thông tin bắt buộc: hanzi. Đã tạo giá trị mặc định.';
        }
        if (!vocabData.pinyin) {
            vocabData.pinyin = 'chưa có phiên âm';
            if(!errorDetail) { isError = true; errorDetail = 'Thiếu pinyin. Đã thêm giá trị mặc định.'; }
        }
        if (!vocabData.meaning) {
            vocabData.meaning = 'chưa có nghĩa';
            if(!errorDetail) { isError = true; errorDetail = 'Thiếu meaning. Đã thêm giá trị mặc định.'; }
        }
        if (!vocabData.word_types || !Array.isArray(vocabData.word_types)) {
            vocabData.word_types = [];
        }
        if (vocabData.word_types.length === 0) {
            vocabData.word_types = ['DT'];
            if(!errorDetail) { isError = true; errorDetail = 'Thiếu word_types. Đã thêm giá trị mặc định [DT].'; }
        }
        if (!vocabData.level || !Array.isArray(vocabData.level) || vocabData.level.length === 0) {
            vocabData.level = ['HSK1'];
            if(!errorDetail) { isError = true; errorDetail = 'Thiếu level. Đã thêm giá trị mặc định [HSK1].'; }
        }

        // --- 2. Logic xử lý: Ưu tiên ID, sau đó đến Hanzi ---
        let result;
        let action = 'pending';

        // BƯỚC 2.1: KIỂM TRA ID HỢP LỆ VÀ XỬ LÝ (HÀNH ĐỘNG "IM LẶNG")
        if (vocabData.id && isUuid(vocabData.id)) {
            const existingVocabById = await vocabularyModel.findById(vocabData.id);
            if (existingVocabById) {
                action = 'update';
                // Không cần generateUpdateDetails ở đây nữa vì đây là hành động "im lặng"
                result = await vocabularyModel.upsertAndMerge(vocabData);
                // Không set isError = true
            }
        }
        
        // BƯỚC 2.2: NẾU CHƯA XỬ LÝ, KIỂM TRA HANZI (HÀNH ĐỘNG CÓ THÔNG BÁO)
        if (action === 'pending') {
            const existingVocabByHanzi = await vocabularyModel.findByHanzi(vocabData.hanzi);
            if (existingVocabByHanzi) {
                action = 'update';
                vocabData.id = existingVocabByHanzi.id;
                
                const updateDetails = generateUpdateDetails(vocabData, existingVocabByHanzi);
                
                if (updateDetails !== null) { // Chỉ update và báo lỗi nếu có thay đổi
                    result = await vocabularyModel.upsertAndMerge(vocabData);
                    isError = true;
                    errorDetail = updateDetails;
                } else {
                    result = existingVocabByHanzi;
                }
            }
        }
        
        // BƯỚC 2.3: NẾU VẪN CHƯA XỬ LÝ, TẠO MỚI
        if (action === 'pending') {
            action = 'create';
            delete vocabData.id;
            result = await vocabularyModel.createWithWordTypes(vocabData);
        }

        // --- 3. Ghi nhận kết quả ---
        // Chỉ ghi lỗi nếu nó được set (từ validation hoặc update qua hanzi)
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
          hanzi: vocabData.hanzi,
          id: vocabData.id || null,
          detail: dbError.detail || dbError.message
        });
      }
    }

    return { processedItems, errors };
  },



  createWordType: async (code) => {
    return await vocabularyModel.createWordType(code);
  },

};

module.exports = vocabularyService;