// file: controllers/simpleNotificationController.js
// API đơn giản để gửi thông báo cho user

const notificationService = require('../services/notificationService');

const simpleNotificationController = {

  /**
   * POST /api/send-notification
   * API đơn giản để gửi thông báo cho user
   * 
   * Body:
   * - user_id: uuid (required) - ID người nhận
   * - title: string (required) - Tiêu đề
   * - message: string (required) - Nội dung
   * - url: string (optional) - URL để navigate
   * - priority: number (optional) - 1-3, mặc định 1
   */
  sendToUser: async (req, res) => {
    try {
      const { user_id, title, message, redirect_type = 'none', data = {}, priority = 1 } = req.body;

      // Validation
      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: "Trường 'user_id' là bắt buộc"
        });
      }

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Trường 'title' là bắt buộc"
        });
      }

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: "Trường 'message' là bắt buộc"
        });
      }

      // Tạo notification với format mới
      const notification = await notificationService.createNotification({
        recipient_id: user_id,
        audience: 'user',
        type: 'system',
        title: title.trim(),
        content: {
          message: message.trim()
        },
        redirect_type: redirect_type,
        data: data,
        priority: Math.min(Math.max(priority, 1), 3),
        from_system: true
      });

      // Response
      res.status(200).json({
        success: true,
        message: 'Đã gửi thông báo thành công',
        data: {
          notification_id: notification.id,
          user_id: notification.recipient_id,
          title: notification.title,
          message: notification.content.message,
          redirect_type: notification.redirect_type,
          sent_at: notification.created_at
        }
      });

    } catch (error) {
      console.error('Error sending notification:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi gửi thông báo',
        error: error.message
      });
    }
  },

  /**
   * POST /api/send-notification-all
   * API đơn giản để gửi thông báo cho tất cả users
   * 
   * Body:
   * - title: string (required) - Tiêu đề
   * - message: string (required) - Nội dung
   * - url: string (optional) - URL để navigate
   * - priority: number (optional) - 1-3, mặc định 2
   */
  sendToAll: async (req, res) => {
    try {
      const { title, message, redirect_type = 'none', data = {}, priority = 2 } = req.body;

      // Validation
      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Trường 'title' là bắt buộc"
        });
      }

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: "Trường 'message' là bắt buộc"
        });
      }

      // Tạo notification broadcast với format mới
      const notification = await notificationService.createNotification({
        recipient_id: null,
        audience: 'all',
        type: 'system',
        title: title.trim(),
        content: {
          message: message.trim()
        },
        redirect_type: redirect_type,
        data: data,
        priority: Math.min(Math.max(priority, 1), 3),
        from_system: true
      });

      // Response
      res.status(200).json({
        success: true,
        message: 'Đã gửi thông báo broadcast thành công',
        data: {
          notification_id: notification.id,
          title: notification.title,
          message: notification.content.message,
          redirect_type: notification.redirect_type,
          sent_at: notification.created_at
        }
      });

    } catch (error) {
      console.error('Error sending broadcast notification:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi gửi thông báo broadcast',
        error: error.message
      });
    }
  }

};

module.exports = simpleNotificationController;
