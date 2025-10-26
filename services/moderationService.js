// file: services/moderationService.js
const moderationModel = require('../models/moderationModel');

const moderationService = {
  createReport: (data) => moderationModel.createReport(data),
  getReports: async (filters) => {
    const { page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;
    const { reports, totalItems } = await moderationModel.findReports({ ...filters, offset, limit });
    const totalPages = Math.ceil(totalItems / limit);
    return { data: reports, meta: { total: totalItems, page, limit, totalPages } };
  },
  updateReportStatus: (reportId, data) => moderationModel.updateReportStatus(reportId, data),



  createViolation: async (payload, adminId) => {
    const violationData = {
      user_id: payload.user_id,
      target_type: payload.target_type,
      target_id: payload.target_id,
      severity: payload.severity,
      detected_by: 'admin', // Vì đây là API admin tạo thủ công
      handled: true, // Mặc định là đã xử lý
      resolution: payload.resolution || 'Vi phạm được ghi nhận thủ công bởi quản trị viên.',
    };
    
    // Mảng các ID của CommunityRules
    const ruleIds = payload.rules; 

    // Gọi model để thực hiện trong transaction
    const newViolation = await moderationModel.createViolationWithRules(violationData, ruleIds);
    return newViolation;
  },
  getViolations: async (filters) => {
    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    const { violations, totalItems } = await moderationModel.findViolations({ ...filters, limit, offset });
    
    const totalPages = Math.ceil(totalItems / limit);
    return { data: violations, meta: { total: totalItems, page, limit, totalPages } };
  },


  deleteViolation: async (violationId) => {
    const deletedCount = await moderationModel.deleteViolation(violationId);
    
    // Nếu không có hàng nào bị xóa, nghĩa là vi phạm không tồn tại
    if (deletedCount === 0) {
      throw new Error('Vi phạm không tồn tại.');
    }
  },


  createAppeal: async (userId, violationId, reason) => {
    // Lấy snapshot của vi phạm để lưu lại
    const violationSnapshot = await moderationModel.findViolationById(violationId);
    if (!violationSnapshot) {
      throw new Error("Vi phạm không tồn tại.");
    }
    // Đảm bảo chỉ người dùng bị vi phạm mới có thể khiếu nại
    if (violationSnapshot.user_id !== userId) {
        throw new Error("Bạn không có quyền khiếu nại cho vi phạm này.");
    }

    return moderationModel.createAppeal({
      user_id: userId,
      violation_id: violationId,
      reason,
      violation_snapshot: violationSnapshot
    });
  },

  getUserAppeals: async (userId, filters) => {
    const { page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;
    const { appeals, totalItems } = await moderationModel.findAppealsByUserId(userId, { limit, offset });
    const totalPages = Math.ceil(totalItems / limit);
    return { data: appeals, meta: { total: totalItems, page, limit, totalPages } };
  },

  getAdminAppeals: async (filters) => {
    const { page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;
    const { appeals, totalItems } = await moderationModel.findAllAppeals({ ...filters, offset, limit });
    const totalPages = Math.ceil(totalItems / limit);
    return { data: appeals, meta: { total: totalItems, page, limit, totalPages } };
  },
  
  getAppealDetails: async (appealId) => {
    const appeal = await moderationModel.findAppealById(appealId);
    if (!appeal) {
      throw new Error("Khiếu nại không tồn tại.");
    }
    return appeal;
  },

  processAppeal: async (appealId, adminId, action, notes) => {
    const appeal = await moderationModel.findAppealById(appealId);
    if (!appeal) throw new Error("Khiếu nại không tồn tại.");
    if (appeal.status !== 'pending') throw new Error("Khiếu nại đã được xử lý.");

    // Cập nhật trạng thái của appeal
    const processedAppeal = await moderationModel.processAppeal(appealId, {
      status: action,
      resolved_by: adminId,
      notes,
    });
    
    // Nếu chấp nhận khiếu nại, thực hiện hành động hoàn tác
    if (action === 'accepted') {
        const violation = appeal.violation_snapshot;
        
        // Hoàn tác hành động kiểm duyệt
        if (violation.target_type === 'post') {
            // Ví dụ: khôi phục bài viết (bạn cần có hàm này trong postModel)
            // await postModel.restore(violation.target_id);
        } else if (violation.target_type === 'comment') {
            // Ví dụ: khôi phục bình luận
            // await commentModel.restore(violation.target_id);
        }
        
        // Đồng thời có thể xóa bản ghi vi phạm
        await moderationModel.deleteViolation(violation.id);
    }
    
    // TODO: Gửi thông báo đến người dùng về kết quả khiếu nại
    
    return processedAppeal;
  }



};

module.exports = moderationService;