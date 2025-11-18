// file: controllers/deviceTokenController.js

const deviceTokenModel = require('../models/deviceTokenModel');

const deviceTokenController = {

  /**
   * POST /api/users/device-token
   * Lưu hoặc cập nhật device token
   */
  saveToken: async (req, res) => {
    try {
      const userId = req.user.id; // Lấy từ auth middleware
      const { token, platform, deviceInfo } = req.body;

      // Validation
      if (!token || !platform) {
        return res.status(400).json({
          success: false,
          message: 'Token và platform là bắt buộc',
        });
      }

      if (!['ios', 'android', 'web'].includes(platform)) {
        return res.status(400).json({
          success: false,
          message: 'Platform phải là ios, android, hoặc web',
        });
      }

      // Lưu token
      const deviceToken = await deviceTokenModel.upsert(
        userId,
        token,
        platform,
        deviceInfo || {}
      );

      res.status(200).json({
        success: true,
        message: 'Đã lưu device token thành công',
        data: deviceToken,
      });
    } catch (error) {
      console.error('Error saving device token:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lưu device token',
        error: error.message,
      });
    }
  },

  /**
   * DELETE /api/users/device-token
   * Xóa device token (khi logout)
   */
  deleteToken: async (req, res) => {
    try {
      const userId = req.user.id;
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token là bắt buộc',
        });
      }

      const deleted = await deviceTokenModel.deleteByToken(token);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Token không tồn tại',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Đã xóa device token thành công',
      });
    } catch (error) {
      console.error('Error deleting device token:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa device token',
        error: error.message,
      });
    }
  },

  /**
   * DELETE /api/users/device-tokens/all
   * Xóa tất cả device tokens của user (logout khỏi tất cả thiết bị)
   */
  deleteAllTokens: async (req, res) => {
    try {
      const userId = req.user.id;

      const count = await deviceTokenModel.deleteByUserId(userId);

      res.status(200).json({
        success: true,
        message: `Đã xóa ${count} device token(s)`,
        count,
      });
    } catch (error) {
      console.error('Error deleting all device tokens:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa device tokens',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/users/device-tokens
   * Lấy danh sách device tokens của user
   */
  getTokens: async (req, res) => {
    try {
      const userId = req.user.id;

      const tokens = await deviceTokenModel.findByUserId(userId);

      res.status(200).json({
        success: true,
        data: tokens,
        count: tokens.length,
      });
    } catch (error) {
      console.error('Error getting device tokens:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy device tokens',
        error: error.message,
      });
    }
  },

};

module.exports = deviceTokenController;
