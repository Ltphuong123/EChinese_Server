// file: controllers/aiController.js

const { generateChineseLesson } = require("../services/aiService");
const aiLessonService = require("../services/aiLessonService");
const aiTranslationService = require("../services/aiTranslationService");
const axios = require("axios");
const userSubscriptionModel = require("../models/userSubscriptionModel");
const usageModel = require("../models/usageModel");

const aiController = {
  generateLesson: async (req, res) => {
    try {
      const { theme, level } = req.body || {};
      if (!theme || !level) {
        return res
          .status(400)
          .json({ success: false, message: "Thiếu 'theme' hoặc 'level'" });
      }
      const validLevels = ["Cơ bản", "Trung cấp", "Cao cấp"];
      if (!validLevels.includes(level)) {
        return res.status(400).json({
          success: false,
          message: `level phải là một trong: ${validLevels.join(", ")}`,
        });
      }
      const userId = req.user?.id || null;

      // Kiểm tra subscription quota trước khi tạo bài học
      if (userId) {
        const subscriptionLimits =
          await aiController._getSubscriptionLimitsFromDB(userId, "ai_lesson");
        if (subscriptionLimits.remaining <= 0) {
          return res.status(429).json({
            success: false,
            message:
              "Bạn đã đạt giới hạn tạo bài học AI trong ngày. Vui lòng nâng cấp gói để tiếp tục.",
            data: {
              quota: subscriptionLimits.quota,
              used: subscriptionLimits.used,
              remaining: subscriptionLimits.remaining,
            },
          });
        }
      }

      const result = await generateChineseLesson(theme, level);
      const lesson = result && result.data ? result.data : result;
      const model = result && result.model ? result.model : null;
      const saved = await aiLessonService.saveLesson({
        userId,
        theme,
        level,
        content: lesson,
        model,
      });

      // Cập nhật usage sau khi tạo bài học thành công
      if (userId) {
        const currentUsage = await usageModel.findByUserAndFeature(
          userId,
          "ai_lesson"
        );
        if (currentUsage) {
          await usageModel.incrementCount(currentUsage.id);
        } else {
          await usageModel.create({
            user_id: userId,
            feature: "ai_lesson",
            daily_count: 1,
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: lesson,
        saved: { id: saved.id, model: saved.model },
      });
    } catch (error) {
      if (error.message && error.message.includes("JSON không hợp lệ")) {
        return res.status(502).json({
          success: false,
          message: "AI trả về dữ liệu không hợp lệ",
          error: error.message,
        });
      }
      if (error.message && error.message.includes("GEMINI_API_KEY")) {
        return res.status(500).json({
          success: false,
          message: "Thiếu cấu hình GEMINI_API_KEY",
          error: error.message,
        });
      }
      return res.status(500).json({
        success: false,
        message: "Lỗi tạo bài học bằng AI",
        error: error.message,
      });
    }
  },
  translate: async (req, res) => {
    try {
      const { text, direction } = req.body || {};
      if (!text)
        return res
          .status(400)
          .json({ success: false, message: "Thiếu text cần dịch" });
      if (text.length > 5000)
        return res
          .status(400)
          .json({ success: false, message: "Text quá dài (>5000 ký tự)" });
      const userId = req.user?.id || null;
      const result = await aiTranslationService.translateText({
        text,
        direction,
        userId,
      });
      return res.status(200).json({ success: true, data: result.translation });
    } catch (error) {
      if (error.message.includes("direction"))
        return res.status(400).json({ success: false, message: error.message });
      if (error.message.includes("Thiếu"))
        return res.status(400).json({ success: false, message: error.message });
      return res.status(500).json({
        success: false,
        message: "Lỗi dịch văn bản",
        error: error.message,
      });
    }
  },
  getMyTranslations: async (req, res) => {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const result = await aiTranslationService.getUserTranslations(userId, {
        page,
        limit,
      });
      // Parse metadata cho mỗi translation
      const translationsWithParsedMetadata = result.data.map((translation) => ({
        ...translation,
        // metadata đã là object từ JSONB, không cần parse
        is_ai_translation: translation.metadata
          ? translation.metadata.ai
          : false,
      }));

      return res.status(200).json({
        success: true,
        data: translationsWithParsedMetadata,
        meta: result.meta,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Lỗi khi lấy lịch sử dịch",
        error: error.message,
      });
    }
  },
  deleteMyTranslation: async (req, res) => {
    try {
      const userId = req.user.id;
      const { translationId } = req.params;
      const deleted = await aiTranslationService.deleteUserTranslation(
        userId,
        translationId
      );
      if (deleted === 0)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy bản dịch" });
      return res
        .status(200)
        .send({ success: true, message: "Đã xóa bản dịch" });
    } catch (error) {
      if (error.message.includes("Thiếu translationId"))
        return res.status(400).json({ success: false, message: error.message });

      return res.status(500).json({
        success: false,
        message: "Lỗi khi xóa bản dịch",
        error: error.message,
      });
    }
  },
  clearMyTranslations: async (req, res) => {
    try {
      const userId = req.user.id;
      const count = await aiTranslationService.clearUserTranslations(userId);
      return res.status(200).json({
        success: true,
        message: "Đã xóa lịch sử dịch",
        deleted: count,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Lỗi khi xóa toàn bộ lịch sử dịch",
        error: error.message,
      });
    }
  },

  getMyLessons: async (req, res) => {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const result = await aiLessonService.getUserLessons(userId, {
        page,
        limit,
      });
      return res
        .status(200)
        .json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Lỗi khi lấy danh sách bài học",
        error: error.message,
      });
    }
  },

  getLessonDetail: async (req, res) => {
    try {
      const { lessonId } = req.params;
      const requester = { id: req.user.id, role: req.user.role };
      const lesson = await aiLessonService.getLessonById(lessonId, requester);
      if (!lesson)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy bài học" });
      return res.status(200).json({ success: true, data: lesson });
    } catch (error) {
      if (error.statusCode === 403)
        return res.status(403).json({ success: false, message: error.message });
      return res.status(500).json({
        success: false,
        message: "Lỗi khi lấy chi tiết bài học",
        error: error.message,
      });
    }
  },

  deleteLesson: async (req, res) => {
    try {
      const { lessonId } = req.params;
      const requester = { id: req.user.id, role: req.user.role };
      const deleted = await aiLessonService.deleteLesson(lessonId, requester);
      if (deleted === 0)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy bài học" });
      return res.status(204).send();
    } catch (error) {
      if (error.statusCode === 403)
        return res.status(403).json({ success: false, message: error.message });

      return res.status(500).json({
        success: false,
        message: "Lỗi khi xóa bài học",
        error: error.message,
      });
    }
  },

  // API lấy số lượng dịch của user trong ngày hiện tại
  getTodayTranslationCount: async (req, res) => {
    try {
      const userId = req.user.id;
      const count = await aiTranslationService.getTodayTranslationCount(userId);
      return res.status(200).json({
        success: true,
        data: count,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Lỗi khi lấy số lượng dịch hôm nay",
        error: error.message,
      });
    }
  },

  // API lấy thống kê đầy đủ lượt dịch của ngày, tuần, tháng hiện tại
  getTranslationStats: async (req, res) => {
    try {
      const userId = req.user.id;

      // Lấy thống kê cho tất cả các khoảng thời gian
      const todayCount = await aiTranslationService.getTodayTranslationCount(
        userId
      );
      const weekCount = await aiTranslationService.getWeekTranslationCount(
        userId
      );
      const monthCount = await aiTranslationService.getMonthTranslationCount(
        userId
      );

      return res.status(200).json({
        success: true,
        data: {
          today: todayCount,
          week: weekCount,
          month: monthCount,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Lỗi khi lấy thống kê dịch",
        error: error.message,
      });
    }
  },

  // Helper function để lấy giới hạn từ subscription
  _getTranslationLimits: async (userId, authToken) => {
    try {
      // Gọi endpoint subscription để lấy quota của user
      const response = await axios.get(
        `${
          process.env.BASE_URL || "http://localhost:3000"
        }/api/user/subscription`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data && response.data.success && response.data.data.usages) {
        // Tìm feature ai_translate trong usages
        const aiTranslateUsage = response.data.data.usages.find(
          (usage) => usage.feature === "ai_translate"
        );

        if (aiTranslateUsage) {
          return {
            quota: aiTranslateUsage.quota,
            used: aiTranslateUsage.used,
            remaining: aiTranslateUsage.remaining,
          };
        }
      }

      // Fallback nếu không tìm thấy hoặc lỗi
      return {
        quota: 0,
        used: 0,
        remaining: 0,
      };
    } catch (error) {
      console.error("Lỗi khi lấy subscription limits:", error.message);
      // Fallback nếu có lỗi
      return {
        quota: 0,
        used: 0,
        remaining: 0,
      };
    }
  },

  // API dịch với sinh câu ví dụ cho từng từ
  translateWithExamples: async (req, res) => {
    try {
      const { text, direction } = req.body || {};

      if (!text) {
        return res
          .status(400)
          .json({ success: false, message: "Thiếu text cần dịch" });
      }

      if (text.length > 1000)
        return res.status(400).json({
          success: false,
          message: "Text quá dài cho dịch với ví dụ (>1000 ký tự)",
        });

      const userId = req.user?.id || null;

      // Lấy giới hạn từ subscription thay vì hardcode
      const subscriptionLimits =
        await aiController._getSubscriptionLimitsFromDB(userId, "ai_translate");

      // Kiểm tra subscription quota trước khi cho phép dịch
      if (subscriptionLimits.remaining <= 0) {
        return res.status(429).json({
          success: false,
          message:
            "Bạn đã hết lượt dịch AI theo gói subscription. Vui lòng nâng cấp gói.",
          data: {
            quota: subscriptionLimits.quota,
            used: subscriptionLimits.used,
            remaining: subscriptionLimits.remaining,
          },
        });
      }

      const result = await aiTranslationService.translateWithWordExamples({
        text,
        direction,
        userId,
      });

      // Lấy lại subscription limits sau khi dịch (đã cập nhật usage)
      const newSubscriptionLimits =
        await aiController._getSubscriptionLimitsFromDB(userId, "ai_translate");

      // Trả về thông tin với subscription limits thực tế
      return res.status(200).json({
        success: true,
        data: result.translation,
        usage: {
          quota: newSubscriptionLimits.quota,
          used: newSubscriptionLimits.used,
          remaining: newSubscriptionLimits.remaining,
        },
      });
    } catch (error) {
      if (
        error.message.includes("direction") ||
        error.message.includes("Thiếu")
      )
        return res.status(400).json({ success: false, message: error.message });

      return res.status(500).json({
        success: false,
        message: "Lỗi dịch với sinh câu ví dụ",
        error: error.message,
      });
    }
  },

  // Helper function để lấy giới hạn từ subscription (HÀM MỚI - TRUY VẤN TRỰC TIẾP DB)
  _getSubscriptionLimitsFromDB: async (userId, feature) => {
    try {
      // Lấy thông tin subscription plan của user
      const subscriptionPlan =
        await userSubscriptionModel.findActiveWithPlanDetails(userId);

      if (!subscriptionPlan) {
        // User không có subscription active, trả về giá trị mặc định
        return {
          quota: 0,
          used: 0,
          remaining: 0,
        };
      }

      // Lấy thông tin usage hiện tại của user cho feature
      const currentUsage = await usageModel.findByUserAndFeature(
        userId,
        feature
      );

      const quotaKey =
        feature === "ai_translate"
          ? "daily_quota_translate"
          : "daily_quota_ai_lesson";
      const quota = subscriptionPlan[quotaKey] || 0;
      const used = currentUsage ? currentUsage.daily_count : 0;
      const remaining = Math.max(0, quota - used);

      return {
        quota,
        used,
        remaining,
      };
    } catch (error) {
      console.error("Lỗi khi lấy subscription limits từ DB:", error.message);
      // Fallback nếu có lỗi
      return {
        quota: 0,
        used: 0,
        remaining: 0,
      };
    }
  },

  // API lấy thống kê dựa trên subscription (HÀM MỚI - TRUY VẤN TRỰC TIẾP DB)
  getSubscriptionTranslationStats: async (req, res) => {
    try {
      const userId = req.user.id;

      // Gọi DB trực tiếp để lấy giới hạn thực tế
      const limits = await aiController._getSubscriptionLimitsFromDB(
        userId,
        "ai_translate"
      );

      return res.status(200).json({
        success: true,
        data: {
          quota: limits.quota,
          used: limits.used,
          remaining: limits.remaining,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Lỗi khi lấy thống kê dịch subscription từ DB",
        error: error.message,
      });
    }
  },

  // API dịch với subscription limits (HÀM MỚI - TRUY VẤN TRỰC TIẾP DB)
  translateWithExamplesSubscription: async (req, res) => {
    try {
      const { text, direction } = req.body || {};

      if (!text) {
        return res
          .status(400)
          .json({ success: false, message: "Thiếu text cần dịch" });
      }

      if (text.length > 1000)
        return res.status(400).json({
          success: false,
          message: "Text quá dài cho dịch với ví dụ (>1000 ký tự)",
        });

      const userId = req.user?.id || null;

      // Lấy giới hạn từ DB trực tiếp
      const limits = await aiController._getSubscriptionLimitsFromDB(
        userId,
        "ai_translate"
      );

      // Kiểm tra còn lượt dịch không
      if (limits.remaining <= 0) {
        return res.status(429).json({
          success: false,
          message:
            "Bạn đã hết lượt dịch AI. Vui lòng nâng cấp gói hoặc chờ gia hạn.",
          data: {
            quota: limits.quota,
            used: limits.used,
            remaining: limits.remaining,
          },
        });
      }

      const result = await aiTranslationService.translateWithWordExamples({
        text,
        direction,
        userId,
      });

      // Lấy lại limits sau khi dịch (sẽ giảm remaining)
      const newLimits = await aiController._getSubscriptionLimitsFromDB(
        userId,
        "ai_translate"
      );

      // Trả về thông tin với subscription limits
      return res.status(200).json({
        success: true,
        data: result.translation,
        usage: {
          quota: newLimits.quota,
          used: newLimits.used,
          remaining: newLimits.remaining,
        },
      });
    } catch (error) {
      if (
        error.message.includes("direction") ||
        error.message.includes("Thiếu")
      )
        return res.status(400).json({ success: false, message: error.message });

      return res.status(500).json({
        success: false,
        message: "Lỗi dịch với sinh câu ví dụ subscription từ DB",
        error: error.message,
      });
    }
  },
};

module.exports = aiController;
