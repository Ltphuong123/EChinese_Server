// file: services/tipService.js

const tipModel = require('../models/tipModel');

const tipService = {

  createTip: async (payload, userId) => {
    // Xây dựng object dữ liệu an toàn để truyền xuống model
    const tipData = {
      topic: payload.topic,
      level: payload.level,
      content: payload.content,
      is_pinned: payload.is_pinned || false, // Mặc định là false nếu không được cung cấp
      created_by: userId, // Lấy userId từ token đã xác thực, không tin tưởng payload
    };

    const newTip = await tipModel.create(tipData);
    return newTip;
  },

   getPaginatedTips: async (filters) => {
    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    // Truyền tất cả filters xuống model để xử lý
    const { tips, totalItems } = await tipModel.findAllPaginated({
      ...filters,
      limit,
      offset,
    });
    
    const totalPages = Math.ceil(totalItems / limit);
    
    // Định dạng dữ liệu trả về theo yêu cầu
    return {
      data: tips,
      meta: {
        page: page,
        limit: limit,
        total: totalItems,
        totalPages: totalPages,
      }
    };
  },

  getTipById: async (id) => {
    const tip = await tipModel.findById(id);

    if (!tip) {
      throw new Error('Tip không tồn tại.');
    }

    return tip;
  },

  updateTip: async (tipId, payload, editorId) => {
    // Tạo một bản sao an toàn của payload
    const updateData = { ...payload };

    // Không cho phép cập nhật các trường do hệ thống quản lý
    delete updateData.id;
    delete updateData.created_by;
    delete updateData.created_at; 
    // Trong tương lai, bạn có thể muốn thêm một cột `updated_by` và `updated_at`
    // updateData.updated_by = editorId;
    // updateData.updated_at = new Date();

    const updatedTip = await tipModel.update(tipId, updateData);

    if (!updatedTip) {
      throw new Error('Tip không tồn tại.');
    }

    return updatedTip;
  },

  deleteTip: async (tipId) => {
    const deletedCount = await tipModel.delete(tipId);

    // Nếu không có hàng nào bị xóa, nghĩa là tip không tồn tại
    if (deletedCount === 0) {
      throw new Error('Tip không tồn tại.');
    }
    
    // Không cần trả về gì vì đã xóa thành công
  },

  bulkCreateTips: async (tips, userId) => {
    const created_tips = [];
    const errors = [];

    // Sử dụng for...of để có thể dùng await bên trong vòng lặp
    for (const tipPayload of tips) {
      try {
        // Validation cho từng mục
        if (!tipPayload.topic || !tipPayload.level || !tipPayload.content) {
          throw new Error("Thiếu các trường bắt buộc 'topic', 'level', hoặc 'content'.");
        }
        
        // Xây dựng object dữ liệu an toàn, tương tự hàm createTip đơn lẻ
        const tipData = {
          topic: tipPayload.topic,
          level: tipPayload.level,
          content: tipPayload.content,
          answer: tipPayload.answer || null, // Cho phép answer là optional
          is_pinned: tipPayload.is_pinned || false,
          created_by: userId,
        };
        
        const newTip = await tipModel.create(tipData);
        created_tips.push(newTip);
      } catch (error) {
        errors.push({
          item: tipPayload, // Gửi lại item lỗi để client biết
          error: error.message
        });
      }
    }

    return {
      created_tips,
      errors,
      success_count: created_tips.length,
      error_count: errors.length,
    };
  },



};

module.exports = tipService;