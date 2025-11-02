// file: controllers/notificationController.js

const notificationService = require('../services/notificationService');

const notificationController = {

  getUnreadCount: async (req, res) => {
    try {
      const userId = req.user.id; // Lấy từ token
      
      const count = await notificationService.getUnreadNotificationCount(userId);

      res.status(200).json({
        success: true,
        data: {
          count: count
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy số lượng thông báo', error: error.message });
    }
  },
  
  // GET /notifications
  getNotifications: async (req, res) => {
    try {
      const { id: userId, role } = req.user; // Lấy từ token
      const { page = 1, limit = 10 } = req.query;
      
      const result = await notificationService.getNotificationsForUser({
        userId, role, page: parseInt(page), limit: parseInt(limit)
      });
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy thông báo', error: error.message });
    }
  },

  // POST /notifications (Admin only)
  createNotification: async (req, res) => {
    try {
      const payload = req.body;
      if (!payload.audience || !payload.type || !payload.title || !payload.content) {
        return res.status(400).json({ success: false, message: 'Các trường audience, type, title, content là bắt buộc.' });
      }
      const newNotification = await notificationService.createNotification(payload);
      res.status(201).json({ success: true, message: 'Tạo thông báo thành công.', data: newNotification });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi tạo thông báo', error: error.message });
    }
  },

  // POST /notifications/publish (Admin only)
  publishNotifications: async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Mảng ids là bắt buộc.' });
      }
      const success = await notificationService.publishNotifications(ids);
      res.status(200).json({ success });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi gửi thông báo', error: error.message });
    }
  },

  // POST /notifications/delete (Admin only)
  deleteNotifications: async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Mảng ids là bắt buộc.' });
      }
      const success = await notificationService.deleteNotifications(ids);
      res.status(200).json({ success });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi xóa thông báo', error: error.message });
    }
  },

  // POST /notifications/mark-read
  markAsRead: async (req, res) => {
    try {
      const { ids, asRead = true } = req.body;
      const userId = req.user.id;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Mảng ids là bắt buộc.' });
      }
      const result = await notificationService.markNotificationsAsRead(ids, userId, asRead);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi đánh dấu đã đọc', error: error.message });
    }
  },
};

module.exports = notificationController;