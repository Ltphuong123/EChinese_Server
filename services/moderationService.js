// file: services/moderationService.js
const moderationModel = require("../models/moderationModel");
const postService = require("./postService");
const commentService = require("./commentService");
const notificationService = require("./notificationService");

const moderationService = {
  createReport: (data) => moderationModel.createReport(data),

  getReports: async (filters) => {
    const { page = 1, limit = 10, status, target_type, search } = filters;
    const offset = (page - 1) * limit;

    const { reports, totalItems } = await moderationModel.findReports({
      status,
      target_type,
      search,
      offset,
      limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: reports,
      meta: {
        total: totalItems,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
      },
    };
  },

  updateReportStatus: async (reportId, data) => {
    // 1. Lấy thông tin báo cáo gốc để có target_id, target_type, và user_id của người bị báo cáo
    const report = await moderationModel.findReportById(reportId);
    if (!report) {
      throw new Error("Báo cáo không tồn tại.");
    }

    // 2. Cập nhật trạng thái của bản ghi Report
    const updatedReport = await moderationModel.updateReportStatus(reportId, {
      status: data.status,
      resolved_by: data.resolved_by, // adminId
      resolution: data.resolution,
    });
    if (!updatedReport) {
      throw new Error("Cập nhật trạng thái báo cáo thất bại.");
    }

    // 3. Logic tự động tạo Vi phạm nếu status là 'resolved'
    if (data.status === "resolved") {
      // Điều kiện để tạo vi phạm: phải có severity và phải xác định được người dùng bị báo cáo
      if (!data.severity || !report.target_user_id) {
        console.warn(
          `Báo cáo ${reportId} được giải quyết nhưng thiếu 'severity' hoặc không xác định được 'target_user_id' để tạo vi phạm.`
        );
        // Trả về report đã cập nhật mà không làm gì thêm
        return updatedReport;
      }

      // 3.1. Chuẩn bị dữ liệu cho bản ghi Violation
      const violationData = {
        user_id: report.target_user_id, // ID của người dùng đã vi phạm
        target_type: report.target_type,
        target_id: report.target_id,
        severity: data.severity,
        detected_by: "admin", // Vi phạm được xác nhận bởi admin qua xử lý báo cáo
        handled: true, // Đã xử lý
        resolution:
          data.resolution || `Vi phạm được xác nhận từ báo cáo #${report.id}`,
      };

      // 3.2. Gọi model để tạo bản ghi Violation (không cần rules)
      const newViolation = await moderationModel.createViolation(violationData);

      // 3.3. Liên kết vi phạm vừa tạo ngược lại với báo cáo để tiện truy vết
      await moderationModel.linkViolationToReport(reportId, newViolation.id);

      // 3.4. Gắn ID vi phạm vào đối tượng trả về cho client
      updatedReport.related_violation_id = newViolation.id;

      // 3.5. Thực thi biện pháp xử lý nội dung hoặc cấm bình luận + gửi thông báo
      const adminUser = { id: data.resolved_by, role: "admin" };
      const resolutionReason =
        data.resolution || "Nội dung vi phạm quy tắc cộng đồng.";
      const enforcement = data.enforcement || "remove_content"; // 'remove_content' | 'ban_comment'

      try {
        if (enforcement === "ban_comment") {
          // Cấm bình luận (không gửi thông báo riêng)
          const banDays = parseInt(data.ban_days || 7, 10);
          const expires = new Date(Date.now() + banDays * 24 * 60 * 60 * 1000);
          // Logic cấm bình luận sẽ được xử lý ở đây nếu cần
        } else {
          // Gỡ nội dung vi phạm theo loại mục tiêu
          if (report.target_type === "post") {
            await postService.removePost(
              report.target_id,
              adminUser,
              resolutionReason
            );
          } else if (report.target_type === "comment") {
            await commentService.removeComment(
              report.target_id,
              adminUser,
              resolutionReason
            );
          }
        }

        // Gửi thông báo gỡ nội dung vi phạm (chỉ khi không phải ban_comment)
        if (enforcement !== "ban_comment") {
          const contentType =
            report.target_type === "post" ? "Bài viết" : "Bình luận";
          const removeType =
            report.target_type === "post" ? "post_remove" : "comment_remove";

          // Lấy chi tiết đối tượng bị gỡ
          let targetDetails = null;
          let contentPreview = "";

          try {
            if (report.target_type === "post") {
              targetDetails = await postService.getPostById(report.target_id);
              contentPreview =
                typeof targetDetails.content === "string"
                  ? targetDetails.content.substring(0, 150)
                  : (
                      targetDetails.content?.text ||
                      targetDetails.content?.html ||
                      ""
                    ).substring(0, 150);
            } else if (report.target_type === "comment") {
              targetDetails = await commentService.getCommentById(
                report.target_id
              );
              contentPreview =
                typeof targetDetails.content === "string"
                  ? targetDetails.content.substring(0, 150)
                  : (
                      targetDetails.content?.text ||
                      targetDetails.content?.html ||
                      ""
                    ).substring(0, 150);
            }
          } catch (err) {
            console.error("Error fetching target details:", err);
          }

          await notificationService.createNotification({
            recipient_id: report.target_user_id,
            audience: "user",
            type: "violation",
            title: `${contentType} của bạn đã bị gỡ`,
            content: {
              html: `<p>${contentType} của bạn đã bị quản trị viên gỡ bỏ do vi phạm quy định cộng đồng.</p>${
                targetDetails && report.target_type === "post"
                  ? `<p><strong>Tiêu đề:</strong> ${targetDetails.title}</p>`
                  : ""
              }<p><strong>Lý do:</strong> ${resolutionReason}</p>${
                contentPreview
                  ? `<p><em>Nội dung ${contentType.toLowerCase()}:</em> "${contentPreview}${
                      contentPreview.length >= 150 ? "..." : ""
                    }"</p>`
                  : ""
              }<hr><p><small><strong>Thông tin chi tiết:</strong></small></p><ul style="font-size: 0.9em;"><li><strong>Loại nội dung:</strong> ${contentType}</li><li><strong>Gỡ bởi:</strong> Quản trị viên</li><li><strong>Thời gian:</strong> ${new Date().toLocaleString(
                "vi-VN"
              )}</li><li><strong>Mã báo cáo:</strong> ${
                report.id
              }</li></ul><p><small>Vui lòng tuân thủ quy định cộng đồng.</small></p>`,
            },
            redirect_type: "community_rules",
            data: {
              id: report.target_id,
              type: removeType,
            },
            expires_at: null,
            priority: 2,
            from_system: true,
          }, true);
        }
      } catch (enfErr) {
        console.error("Lỗi khi thực thi biện pháp xử lý/Thông báo:", enfErr);
      }
    }

    return updatedReport;
  },

  createViolation: async (payload, adminId) => {
    const violationData = {
      user_id: payload.user_id,
      target_type: payload.target_type,
      target_id: payload.target_id,
      severity: payload.severity,
      detected_by: "admin", // Vì đây là API admin tạo thủ công
      handled: true, // Mặc định là đã xử lý
      resolution:
        payload.resolution ||
        "Vi phạm được ghi nhận thủ công bởi quản trị viên.",
    };

    // Mảng các ID của CommunityRules
    const ruleIds = payload.rules;

    // Gọi model để thực hiện trong transaction
    const newViolation = await moderationModel.createViolationWithRules(
      violationData,
      ruleIds
    );
    return newViolation;
  },

  getViolations: async (filters) => {
    const { page = 1, limit = 12, severity, targetType, search } = filters;
    const offset = (page - 1) * limit;

    const { violations, totalItems } = await moderationModel.findViolations({
      severity,
      targetType,
      search,
      limit,
      offset,
    });

    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: violations,
      meta: { total: totalItems, page, limit, totalPages },
    };
  },

  deleteViolation: async (violationId) => {
    const deletedCount = await moderationModel.deleteViolation(violationId);

    // Nếu không có hàng nào bị xóa, nghĩa là vi phạm không tồn tại
    if (deletedCount === 0) {
      throw new Error("Vi phạm không tồn tại.");
    }
  },

  createAppeal: async (userId, violationId, reason) => {
    // Lấy snapshot của vi phạm để lưu lại
    const violationSnapshot = await moderationModel.findViolationById(
      violationId
    );
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
      violation_snapshot: violationSnapshot,
    });
  },

  getUserAppeals: async (userId, filters) => {
    const { page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;
    const { appeals, totalItems } = await moderationModel.findAppealsByUserId(
      userId,
      { limit, offset }
    );
    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: appeals,
      meta: { total: totalItems, page, limit, totalPages },
    };
  },

  getAdminAppeals: async (filters) => {
    const { page = 1, limit = 12, status, search } = filters;
    const offset = (page - 1) * limit;
    const { appeals, totalItems } = await moderationModel.findAllAppeals({
      status,
      search,
      offset,
      limit,
    });
    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: appeals,
      meta: { total: totalItems, page, limit, totalPages },
    };
  },

  getAppealDetails: async (appealId) => {
    const appeal = await moderationModel.findAppealById(appealId);
    if (!appeal) {
      throw new Error("Khiếu nại không tồn tại.");
    }
    return appeal;
  },

  getAppealsByViolationId: async (violationId, userId = null) => {
    // Nếu có userId, kiểm tra xem violation có thuộc về user đó không
    if (userId) {
      const violation = await moderationModel.findViolationById(violationId);
      if (!violation) {
        throw new Error("Vi phạm không tồn tại.");
      }
      if (violation.user_id !== userId) {
        throw new Error("Bạn không có quyền xem khiếu nại cho vi phạm này.");
      }
    }

    const appeals = await moderationModel.findAppealsByViolationId(violationId);
    return appeals;
  },

  processAppeal: async (appealId, adminId, action, notes) => {
    const appeal = await moderationModel.findAppealById(appealId);
    if (!appeal) throw new Error("Khiếu nại không tồn tại.");
    if (appeal.status !== "pending")
      throw new Error("Khiếu nại đã được xử lý.");

    // Lấy thông tin violation đầy đủ
    const violation = await moderationModel.findViolationById(
      appeal.violation_id
    );
    if (!violation) throw new Error("Vi phạm liên quan không tồn tại.");

    // Cập nhật trạng thái của appeal
    const processedAppeal = await moderationModel.processAppeal(appealId, {
      status: action,
      resolved_by: adminId,
      notes,
    });

    // Nếu chấp nhận khiếu nại, thực hiện hành động hoàn tác
    if (action === "accepted") {
      // 1. Khôi phục nội dung bị xóa
      if (violation.target_type === "post") {
        await postService.restorePost(violation.target_id, adminId);
      } else if (violation.target_type === "comment") {
        await commentService.restoreComment(violation.target_id, adminId);
      }

      // 2. Xóa bản ghi vi phạm
      await moderationModel.deleteViolation(violation.id);
    }

    return processedAppeal;
  },

  // Lấy danh sách các giá trị constraint của target_type trong bảng Violations
  getViolationTargetTypes: async () => {
    return await moderationModel.getViolationTargetTypes();
  },

  deleteReport: async (reportId) => {
    const deletedCount = await moderationModel.deleteReport(reportId);
    
    // Nếu không có hàng nào bị xóa, nghĩa là report không tồn tại
    if (deletedCount === 0) {
      throw new Error("Báo cáo không tồn tại.");
    }
  },

  // Lấy số lượng báo cáo theo trạng thái
  getReportCountByStatus: async (status) => {
    return await moderationModel.countReportsByStatus(status);
  },

  // Xác thực tất cả người dùng
  verifyAllUsers: async () => {
    const userModel = require("../models/userModel");
    return await userModel.verifyAllUsers();
  },
};

module.exports = moderationService;
