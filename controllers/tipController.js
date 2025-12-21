// file: controllers/tipController.js

const tipService = require("../services/tipService");

const tipController = {
  getTipsUser: async (req, res) => {
    try {
      const filters = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 99999999,
        search: req.query.search || "",
        topic: req.query.topic || "",
        level: req.query.level || "",
        is_pinned: req.query.is_pinned,
        excludeTopic: "Mỗi ngày một đoạn văn", // Loại trừ topic này
      };

      const result = await tipService.getPaginatedTips(filters);

      res.status(200).json({
        success: true,
        message: "Lấy danh sách Tips thành công.",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy danh sách Tips",
        error: error.message,
      });
    }
  },

  getDailyPassagesUser: async (req, res) => {
    try {
      const filters = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 99999999,
        search: req.query.search || "",
        topic: "Mỗi ngày một đoạn văn", // Chỉ lấy topic này
        level: req.query.level || "",
        is_pinned: req.query.is_pinned,
      };

      const result = await tipService.getPaginatedTips(filters);

      res.status(200).json({
        success: true,
        message: "Lấy danh sách Mỗi ngày một đoạn văn thành công.",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy danh sách Mỗi ngày một đoạn văn",
        error: error.message,
      });
    }
  },

  createTipAdmin: async (req, res) => {
    try {
      const payload = req.body;
      const userId = req.user.id; // Lấy từ authMiddleware

      // --- Validation cơ bản ---
      if (!payload.topic || !payload.level || !payload.content) {
        return res.status(400).json({
          success: false,
          message: "Các trường 'topic', 'level', và 'content' là bắt buộc.",
        });
      }

      const newTip = await tipService.createTip(payload, userId);

      res.status(201).json({
        success: true,
        message: "Tạo Tip thành công.",
        data: newTip,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi tạo Tip",
        error: error.message,
      });
    }
  },

  getTipsAdmin: async (req, res) => {
    try {
      const filters = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
        search: req.query.search || "",
        topic: req.query.topic || "",
        level: req.query.level || "",
        // Xử lý giá trị boolean từ query string
        is_pinned: req.query.is_pinned,
      };

      const result = await tipService.getPaginatedTips(filters);

      res.status(200).json({
        success: true,
        message: "Lấy danh sách Tips thành công.",
        // Cấu trúc data và meta đã được định dạng sẵn từ service
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy danh sách Tips",
        error: error.message,
      });
    }
  },

  getTipByIdAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      const tip = await tipService.getTipById(id);

      res.status(200).json({
        success: true,
        message: "Lấy thông tin Tip thành công.",
        data: tip,
      });
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy thông tin Tip",
        error: error.message,
      });
    }
  },

  updateTipAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body;
      const userId = req.user.id; // Lấy ID của người thực hiện hành động

      // Validation
      if (Object.keys(payload).length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Không có dữ liệu để cập nhật." });
      }

      const updatedTip = await tipService.updateTip(id, payload, userId);

      res.status(200).json({
        success: true,
        message: "Cập nhật Tip thành công.",
        data: updatedTip,
      });
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi cập nhật Tip",
        error: error.message,
      });
    }
  },

  deleteTipAdmin: async (req, res) => {
    try {
      const { id } = req.params;

      await tipService.deleteTip(id);

      res.status(200).send({
        success: true,
        message: "Xóa Tip thành công.",
      });
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi xóa Tip",
        error: error.message,
      });
    }
  },

  bulkUploadTipsAdmin: async (req, res) => {
    try {
      const { tips } = req.body;
      const userId = req.user.id; // Lấy từ authMiddleware

      // Validation
      if (!tips || !Array.isArray(tips) || tips.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Dữ liệu đầu vào phải là một mảng `tips` và không được rỗng.",
        });
      }

      const result = await tipService.bulkCreateTips(tips, userId);

      res.status(201).json({
        success: true,
        message: `Đã xử lý ${tips.length} mục. Thành công: ${result.success_count}, Thất bại: ${result.error_count}.`,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi máy chủ khi tạo hàng loạt Tips",
        error: error.message,
      });
    }
  },
};

module.exports = tipController;
