// file: controllers/moderationController.js
const moderationService = require("../services/moderationService");

const moderationController = {
  // --- User-facing ---
  createUserReport: async (req, res) => {
    try {
      const { target_type, target_id, reason, details, attachments } = req.body;

      // Validation cơ bản
      if (!target_type || !target_id || !reason) {
        return res.status(400).json({
          success: false,
          message:
            "Các trường 'target_type', 'target_id', và 'reason' là bắt buộc.",
        });
      }

      // Validate attachments nếu có
      if (attachments) {
        if (!Array.isArray(attachments)) {
          return res.status(400).json({
            success: false,
            message: "Trường 'attachments' phải là một mảng.",
          });
        }

        // Giới hạn số lượng ảnh (tối đa 5 ảnh)
        if (attachments.length > 5) {
          return res.status(400).json({
            success: false,
            message: "Chỉ được đính kèm tối đa 5 ảnh.",
          });
        }

        // Validate URL format
        const urlPattern = /^https?:\/\/.+/i;
        for (const url of attachments) {
          if (typeof url !== "string" || !urlPattern.test(url)) {
            return res.status(400).json({
              success: false,
              message: "Link ảnh không hợp lệ. Vui lòng cung cấp URL đầy đủ.",
            });
          }
        }
      }

      const reportData = {
        ...req.body,
        reporter_id: req.user.id,
        attachments: attachments || [],
      };

      const newReport = await moderationService.createReport(reportData);
      res
        .status(201)
        .json({
          success: true,
          message: "Báo cáo của bạn đã được gửi.",
          data: newReport,
        });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Lỗi server", error: error.message });
    }
  },

  // --- Admin-facing ---
  getReports: async (req, res) => {
    try {
      // Parse và validate query parameters
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(
        Math.max(parseInt(req.query.limit, 10) || 10, 1),
        100
      );

      // Xử lý status filter
      let status = req.query.status || "all";
      const validStatuses = [
        "all",
        "pending",
        "in_progress",
        "resolved",
        "dismissed",
      ];
      if (!validStatuses.includes(status)) {
        status = "all";
      }

      // Xử lý target_type filter
      let targetType = req.query.target_type || "all";
      const validTargetTypes = [
        "all",
        "post",
        "comment",
        "user",
        "bug",
        "other",
      ];
      if (!validTargetTypes.includes(targetType)) {
        targetType = "all";
      }

      const filters = {
        page,
        limit,
        status: status === "all" ? null : status,
        target_type: targetType === "all" ? null : targetType,
        search: req.query.search || null,
      };

      const result = await moderationService.getReports(filters);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("Error in getReports:", error);
      res
        .status(500)
        .json({ success: false, message: "Lỗi server", error: error.message });
    }
  },

  updateReportStatus: async (req, res) => {
    try {
      const { reportId } = req.params;
      const adminId = req.user.id;
      // Body request có thể chứa: status, resolution, severity
      const payload = { ...req.body, resolved_by: adminId }; // Gán ID admin thực hiện

      const updatedReport = await moderationService.updateReportStatus(
        reportId,
        payload
      );

      // Log admin action
      await require("../services/adminLogService").createLog(
        {
          action_type: "RESOLVE_REPORT",
          target_id: reportId,
          description: `Xử lý báo cáo. Trạng thái: ${payload.status || "N/A"}`,
        },
        adminId
      );

      res.status(200).json({
        success: true,
        message: "Xử lý báo cáo thành công.",
        data: updatedReport,
      });
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res
        .status(500)
        .json({
          success: false,
          message: "Lỗi khi xử lý báo cáo",
          error: error.message,
        });
    }
  },

  createViolation: async (req, res) => {
    try {
      const payload = req.body;
      const adminId = req.user.id; // Người tạo vi phạm

      // Validation
      if (
        !payload.user_id ||
        !payload.target_type ||
        !payload.target_id ||
        !payload.severity ||
        !payload.rules
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Các trường 'user_id', 'target_type', 'target_id', 'severity', và 'rules' (mảng ID luật) là bắt buộc.",
        });
      }

      const newViolation = await moderationService.createViolation(
        payload,
        adminId
      );

      // Log admin action
      await require("../services/adminLogService").createLog(
        {
          action_type: "CREATE_VIOLATION",
          target_id: payload.user_id,
          description: `Tạo vi phạm. Target: ${payload.target_type} #${payload.target_id}, Severity: ${payload.severity}`,
        },
        adminId
      );

      res
        .status(201)
        .json({
          success: true,
          message: "Tạo bản ghi vi phạm thành công.",
          data: newViolation,
        });
    } catch (error) {
      if (error.code === "23503") {
        // Foreign key constraint
        return res
          .status(404)
          .json({
            success: false,
            message: `Lỗi: Một trong các ID (user, target, rule) không tồn tại. Chi tiết: ${error.detail}`,
          });
      }
      res
        .status(500)
        .json({
          success: false,
          message: "Lỗi khi tạo vi phạm",
          error: error.message,
        });
    }
  },

  getViolations: async (req, res) => {
    try {
      const filters = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 12,
        search: req.query.search || null,
        severity: req.query.severity || null,
        targetType: req.query.targetType || null,
      };
      const result = await moderationService.getViolations(filters);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          message: "Lỗi khi lấy danh sách vi phạm",
          error: error.message,
        });
    }
  },

  deleteViolation: async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = req.user.id;

      await moderationService.deleteViolation(id);

      // 204 No Content là response chuẩn cho một request DELETE thành công
      res.status(204).send();
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res
        .status(500)
        .json({
          success: false,
          message: "Lỗi khi xóa vi phạm",
          error: error.message,
        });
    }
  },

  createUserAppeal: async (req, res) => {
    try {
      const { violation_id, reason } = req.body;
      const userId = req.user.id;
      if (!violation_id || !reason)
        return res
          .status(400)
          .json({
            success: false,
            message: "'violation_id' và 'reason' là bắt buộc.",
          });

      const newAppeal = await moderationService.createAppeal(
        userId,
        violation_id,
        reason
      );
      res
        .status(201)
        .json({
          success: true,
          message: "Khiếu nại của bạn đã được gửi.",
          data: newAppeal,
        });
    } catch (error) {
      if (
        error.message.includes("không tồn tại") ||
        error.message.includes("không có quyền")
      )
        return res.status(404).json({ success: false, message: error.message });
      res
        .status(500)
        .json({ success: false, message: "Lỗi server", error: error.message });
    }
  },

  getUserAppeals: async (req, res) => {
    try {
      const userId = req.user.id; // Lấy ID từ token
      const filters = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
      };

      const result = await moderationService.getUserAppeals(userId, filters);

      res.status(200).json({
        success: true,
        message: "Lấy lịch sử khiếu nại thành công.",
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          message: "Lỗi khi lấy lịch sử khiếu nại.",
          error: error.message,
        });
    }
  },

  // Admin-facing
  getAdminAppeals: async (req, res) => {
    try {
      const filters = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 12,
        status: req.query.status || null,
        search: req.query.search || null,
      };
      const result = await moderationService.getAdminAppeals(filters);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          message: "Lỗi khi lấy danh sách khiếu nại",
          error: error.message,
        });
    }
  },

  getAppealDetails: async (req, res) => {
    try {
      const { appealId } = req.params;
      const appeal = await moderationService.getAppealDetails(appealId);
      res.status(200).json({ success: true, data: appeal });
    } catch (error) {
      if (error.message.includes("không tồn tại"))
        return res.status(404).json({ success: false, message: error.message });
      res
        .status(500)
        .json({
          success: false,
          message: "Lỗi khi lấy chi tiết khiếu nại",
          error: error.message,
        });
    }
  },

  getAppealsByViolationId: async (req, res) => {
    try {
      const { violationId } = req.params;
      const userId = req.user ? req.user.id : null; // Có thể null nếu là admin

      const appeals = await moderationService.getAppealsByViolationId(
        violationId,
        userId
      );
      res.status(200).json({
        success: true,
        message: "Lấy danh sách khiếu nại theo vi phạm thành công.",
        data: appeals,
      });
    } catch (error) {
      if (
        error.message.includes("không tồn tại") ||
        error.message.includes("không có quyền")
      ) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res
        .status(500)
        .json({
          success: false,
          message: "Lỗi khi lấy danh sách khiếu nại",
          error: error.message,
        });
    }
  },

  processAppeal: async (req, res) => {
    try {
      const { appealId } = req.params;
      const { action, notes } = req.body;
      const adminId = req.user.id;
      if (!action || !["accepted", "rejected"].includes(action))
        return res
          .status(400)
          .json({
            success: false,
            message: "'action' phải là 'accepted' hoặc 'rejected'.",
          });

      const processedAppeal = await moderationService.processAppeal(
        appealId,
        adminId,
        action,
        notes
      );

      // Log admin action
      await require("../services/adminLogService").createLog(
        {
          action_type:
            action === "accepted" ? "APPROVE_APPEAL" : "REJECT_APPEAL",
          target_id: appealId,
          description: `${
            action === "accepted" ? "Chấp nhận" : "Từ chối"
          } khiếu nại. Ghi chú: ${notes || "N/A"}`,
        },
        adminId
      );

      res
        .status(200)
        .json({
          success: true,
          message: `Khiếu nại đã được ${
            action === "accepted" ? "chấp nhận" : "từ chối"
          }.`,
          data: processedAppeal,
        });
    } catch (error) {
      if (
        error.message.includes("không tồn tại") ||
        error.message.includes("đã được xử lý")
      )
        return res.status(404).json({ success: false, message: error.message });
      res
        .status(500)
        .json({
          success: false,
          message: "Lỗi khi xử lý khiếu nại",
          error: error.message,
        });
    }
  },

  // removeCommentByAdmin: async (req, res) => {
  //   try {
  //       const { commentId } = req.params;
  //       const { reason } = req.body;
  //       const adminId = req.user.id;

  //       if (!reason) {
  //           return res.status(400).json({ success: false, message: "Lý do gỡ bình luận là bắt buộc."});
  //       }

  //       // Tái sử dụng service, chỉ thay đổi type
  //       await moderationService.removeContent('comment', commentId, adminId, reason);
  //       res.status(204).send();
  //   } catch (error) {
  //       // ... error handling
  //   }
  // },

  // API: Lấy thông tin các giá trị constraint của target_type trong bảng Violations
  getViolationTargetTypes: async (req, res) => {
    try {
      const targetTypes = await moderationService.getViolationTargetTypes();
      res.status(200).json({
        success: true,
        message: "Lấy danh sách target_type thành công",
        data: targetTypes,
      });
    } catch (error) {
      console.error("Error in getViolationTargetTypes:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy danh sách target_type",
        error: error.message,
      });
    }
  },
};

module.exports = moderationController;
