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
  
  /**
   * GET /api/notifications
   * Lấy danh sách thông báo của user
   * 
   * Query params:
   * - page: number (default: 1)
   * - limit: number (default: 20, max: 100)
   * - type: string (optional - filter by type: 'system', 'community', etc.)
   * - unread_only: boolean (optional - chỉ lấy thông báo chưa đọc)
   * 
   * Response:
   * - success: boolean
   * - data: array of notifications
   * - meta: { total, page, limit, totalPages, unreadCount }
   */
  getNotifications: async (req, res) => {
    try {
      const { id: userId, role } = req.user; // Lấy từ token
      const {
        page = 1,
        limit = 20,
        type,
        unread_only
      } = req.query;

      // Validation
      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100); // Max 100
      const unreadOnly = unread_only === 'true' || unread_only === '1';

      // Lấy thông báo
      const result = await notificationService.getNotificationsForUser({
        userId,
        role,
        page: pageNum,
        limit: limitNum,
        type: type || null,
        unreadOnly
      });

      // Response
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách thông báo thành công',
        data: result.data.map(notification => ({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          content: notification.content,
          redirect_type: notification.redirect_type || 'none',
          data: notification.data || {},
          priority: notification.priority,
          is_read: !!notification.read_at,
          read_at: notification.read_at,
          created_at: notification.created_at,
          expires_at: notification.expires_at,
          from_system: notification.from_system
        })),
        meta: {
          ...result.meta,
          unreadCount: result.unreadCount || 0
        }
      });

    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách thông báo',
        error: error.message
      });
    }
  },

  /**
   * POST /api/notifications
   * Tạo và gửi thông báo (Admin only)
   * 
   * Body:
   * - recipient_id: uuid (optional - null nếu gửi broadcast)
   * - audience: 'user' | 'all' | 'admin' (required)
   * - type: 'system' | 'community' | 'comment_ban' (required)
   * - title: string (required)
   * - content: { message: string } (required)
   * - redirect_type: string (optional - e.g., 'post', 'post_comment', 'none')
   * - data: object (optional - custom data, chứa cả thông tin redirect)
   * - expires_at: timestamp (optional)
   * - priority: number 1-3 (optional, default: 1)
   * - from_system: boolean (optional, default: false)
   * - auto_push: boolean (optional, default: true - tự động gửi push)
   */
  createNotification: async (req, res) => {
    try {
      const {
        recipient_id,
        audience,
        type,
        title,
        content,
        data = {},
        expires_at,
        priority = 1,
        from_system = false,
        auto_push = true
      } = req.body;

      // Admin tạo thông báo thì redirect_type luôn là "admin"
      const redirect_type = 'admin';

      // Validation
      if (!audience) {
        return res.status(400).json({
          success: false,
          message: "Trường 'audience' là bắt buộc. Giá trị: 'user', 'all', hoặc 'admin'"
        });
      }

      if (!['user', 'all', 'admin'].includes(audience)) {
        return res.status(400).json({
          success: false,
          message: "Trường 'audience' phải là 'user', 'all', hoặc 'admin'"
        });
      }

      if (!type) {
        return res.status(400).json({
          success: false,
          message: "Trường 'type' là bắt buộc. Ví dụ: 'system', 'community', 'comment_ban'"
        });
      }

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Trường 'title' là bắt buộc và không được để trống"
        });
      }

      if (!content || !content.message) {
        return res.status(400).json({
          success: false,
          message: "Trường 'content' là bắt buộc và phải có 'message'. Ví dụ: { message: 'Nội dung thông báo' }"
        });
      }

      // Nếu audience là 'user', phải có recipient_id
      if (audience === 'user' && !recipient_id) {
        return res.status(400).json({
          success: false,
          message: "Khi audience là 'user', trường 'recipient_id' là bắt buộc"
        });
      }

      // Nếu audience là 'all', recipient_id phải là null
      if (audience === 'all' && recipient_id) {
        return res.status(400).json({
          success: false,
          message: "Khi audience là 'all', không được truyền 'recipient_id'"
        });
      }

      // Tạo payload với format mới
      const payload = {
        recipient_id: audience === 'all' ? null : recipient_id,
        audience,
        type,
        title: title.trim(),
        content,
        redirect_type: redirect_type,
        data: data,
        expires_at: expires_at || null,
        priority: Math.min(Math.max(priority, 1), 3), // Giới hạn 1-3
        from_system,
        created_by: req.user.id // Lưu ID của admin tạo thông báo
      };

      // Tạo notification
      const newNotification = await notificationService.createNotification(payload, auto_push);

      // Tự động đánh dấu đã đọc sau 1 ngày
      setTimeout(async () => {
        try {
          await notificationService.autoMarkNotificationAsRead(newNotification.id);
          console.log(`Auto-marked notification ${newNotification.id} as read after 1 day`);
        } catch (error) {
          console.error(`Failed to auto-mark notification ${newNotification.id} as read:`, error.message);
        }
      }, 600000); // 1 ngày = 24 * 60 * 60 * 1000 = 86400000ms

      // Response
      res.status(201).json({
        success: true,
        message: auto_push 
          ? 'Tạo và gửi thông báo thành công (sẽ tự động đánh dấu đã đọc sau 1 ngày)' 
          : 'Tạo thông báo thành công (chưa gửi push, sẽ tự động đánh dấu đã đọc sau 1 ngày)',
        data: {
          id: newNotification.id,
          recipient_id: newNotification.recipient_id,
          audience: newNotification.audience,
          type: newNotification.type,
          title: newNotification.title,
          content: newNotification.content,
          redirect_type: newNotification.redirect_type,
          data: newNotification.data,
          priority: newNotification.priority,
          is_push_sent: newNotification.is_push_sent,
          created_at: newNotification.created_at,
          auto_mark_read_after: '1 day'
        }
      });

    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo thông báo',
        error: error.message
      });
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

  // POST /notifications/revoke (Admin only)
  revokeNotifications: async (req, res) => {
    try {
      const { ids } = req.body;
      
      // Validation
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Mảng ids là bắt buộc.' 
        });
      }

      const result = await notificationService.revokeNotifications(ids);
      
      res.status(200).json({ 
        success: true,
        message: `Đã thu hồi ${result.count} thông báo thành công`,
        data: {
          revokedCount: result.count
        }
      });
    } catch (error) {
      console.error('Error revoking notifications:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Lỗi khi thu hồi thông báo', 
        error: error.message 
      });
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
      const { ids, asRead } = req.body;
      const userId = req.user.id; // Lấy ID từ token

      // --- Validation cơ bản ---
      if (!Array.isArray(ids)) {
        return res.status(400).json({
          success: false,
          message: "Trường 'ids' phải là một mảng."
        });
      }
      if (typeof asRead !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: "Trường 'asRead' phải là true hoặc false."
        });
      }
      if (ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Mảng 'ids' không được để trống."
        });
      }

      await notificationService.markNotificationsAsRead(ids, userId, asRead);

      res.status(200).json({
        success: true,
        message: `Đã đánh dấu ${ids.length} thông báo thành công.`
      });

    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật thông báo', error: error.message });
    }
  },

  /**
   * GET /api/notifications/:id
   * Lấy chi tiết một thông báo
   * 
   * Path params:
   * - id: uuid (notification ID)
   * 
   * Response:
   * - success: boolean
   * - data: notification object with full details
   */
  getNotificationById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const notification = await notificationService.getNotificationById(id, userId);

      // Tự động đánh dấu đã đọc khi xem chi tiết
      if (!notification.read_at) {
        await notificationService.markNotificationsAsRead([id], userId, true);
        notification.read_at = new Date();
      }

      // Mapping loại thông báo sang tiếng Việt
      const typeMapping = {
        'system': 'Hệ thống',
        'community': 'Cộng đồng',
        'violation': 'Vi phạm',
        'comment_ban': 'Cấm bình luận',
        'post_violation': 'Vi phạm bài viết',
        'comment_violation': 'Vi phạm bình luận',
        'account_warning': 'Cảnh báo tài khoản',
        'account_suspended': 'Tạm khóa tài khoản',
        'new_feature': 'Tính năng mới',
        'maintenance': 'Bảo trì',
        'promotion': 'Khuyến mãi',
        'update': 'Cập nhật',
        'achievement': 'Thành tựu'
      };

      res.status(200).json({
        success: true,
        message: 'Lấy chi tiết thông báo thành công',
        data: {
          id: notification.id,
          type: notification.type,
          type_display: typeMapping[notification.type] || notification.type,
          title: notification.title,
          content: notification.content,
          redirect_type: notification.redirect_type || 'none',
          data: notification.data || {},
          priority: notification.priority,
          is_read: !!notification.read_at,
          read_at: notification.read_at,
          created_at: notification.created_at,
          expires_at: notification.expires_at,
          from_system: notification.from_system,
          audience: notification.audience,
          is_push_sent: notification.is_push_sent,
          // Thông tin người gửi (nếu có)
          sender: notification.sender_id ? {
            id: notification.sender_id,
            username: notification.sender_username,
            name: notification.sender_name,
            email: notification.sender_email,
            avatar_url: notification.sender_avatar
          } : null,
          // Thông tin người nhận (nếu có)
          recipient: notification.recipient_id ? {
            id: notification.recipient_id,
            username: notification.recipient_username,
            name: notification.recipient_name,
            email: notification.recipient_email,
            avatar_url: notification.recipient_avatar
          } : null
        }
      });

    } catch (error) {
      if (error.message.includes('không tồn tại') || error.message.includes('không có quyền')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      console.error('Error getting notification detail:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy chi tiết thông báo',
        error: error.message
      });
    }
  },


  getAdminAllNotifications: async (req, res) => {
    try {
      const adminId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      // Validation
      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);

      const result = await notificationService.getAdminNotifications(adminId, {
        page: pageNum,
        limit: limitNum
      });

      res.status(200).json({
        success: true,
        message: 'Lấy danh sách thông báo thành công',
        data: {
          sent: result.sent.map(n => ({
            id: n.id,
            recipient_id: n.recipient_id,
            recipient_username: n.recipient_username,
            recipient_email: n.recipient_email,
            audience: n.audience,
            type: n.type,
            title: n.title,
            content: n.content,
            redirect_type: n.redirect_type,
            data: n.data,
            priority: n.priority,
            is_push_sent: n.is_push_sent,
            created_at: n.created_at,
            expires_at: n.expires_at
          })),
          received: result.received.map(n => ({
            id: n.id,
            sender_id: n.created_by,
            sender_username: n.sender_username,
            sender_email: n.sender_email,
            type: n.type,
            title: n.title,
            content: n.content,
            redirect_type: n.redirect_type,
            data: n.data,
            priority: n.priority,
            is_read: !!n.read_at,
            read_at: n.read_at,
            created_at: n.created_at,
            expires_at: n.expires_at,
            from_system: n.from_system
          }))
        },
        meta: result.meta
      });

    } catch (error) {
      console.error('Error getting admin notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách thông báo',
        error: error.message
      });
    }
  },

  /**
   * GET /api/admin/notifications/sent
   * Lấy danh sách thông báo đã tạo của admin
   * 
   * Query params:
   * - page: number (default: 1, min: 1)
   * - limit: number (default: 15, min: 1, max: 100)
   * - status: string (optional) - 'draft' | 'published'
   * - audience: string (optional) - 'all' | 'user' | 'admin'
   * - type: string (optional) - 'system' | 'community' | 'reminder' | 'feedback'
   * 
   * Response format theo API_REQUIREMENTS.md
   */
  getAdminSentNotifications: async (req, res) => {
    try {
      const adminId = req.user.id;
      const { page = 1, limit = 15, status, audience, type } = req.query;

      // Validation
      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 15, 1), 100);

      // Validate status
      let validStatus = null;
      if (status === 'draft' || status === 'published') {
        validStatus = status;
      }

      // Validate audience
      let validAudience = null;
      if (audience === 'all' || audience === 'user' || audience === 'admin') {
        validAudience = audience;
      }

      const result = await notificationService.getAdminSentNotifications(adminId, {
        page: pageNum,
        limit: limitNum,
        status: validStatus,
        audience: validAudience,
        type: type || null
      });

      res.status(200).json({
        success: true,
        data: result.data.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          type: n.type,
          audience: n.audience,
          from_system: n.from_system || false,
          is_push_sent: n.is_push_sent,
          priority: n.priority,
          created_at: n.created_at,
          published_at: n.is_push_sent ? n.created_at : null
        })),
        meta: result.meta
      });

    } catch (error) {
      console.error('Error getting admin sent notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách thông báo đã tạo',
        error: error.message
      });
    }
  },

  /**
   * GET /api/admin/notifications/received
   * Lấy danh sách thông báo đã nhận của admin
   * 
   * Query params:
   * - page: number (default: 1, min: 1)
   * - limit: number (default: 15, min: 1, max: 100)
   * - read_status: string (optional) - 'read' | 'unread'
   * - type: string (optional) - 'system' | 'report' | 'violation' | 'appeal' | 'subscription' | 'community' | 'achievement' | 'reminder' | 'feedback'
   * 
   * Response format theo API_REQUIREMENTS.md
   */
  getAdminReceivedNotifications: async (req, res) => {
    try {
      const adminId = req.user.id;
      const { page = 1, limit = 15, read_status, type } = req.query;

      // Validation
      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 15, 1), 100);

      // Validate read_status (chỉ chấp nhận 'read' hoặc 'unread')
      let validReadStatus = null;
      if (read_status === 'read' || read_status === 'unread') {
        validReadStatus = read_status;
      }

      // Validate type
      const validTypes = ['system', 'report', 'violation', 'appeal', 'subscription', 'community', 'achievement', 'reminder', 'feedback'];
      let validType = null;
      if (type && validTypes.includes(type)) {
        validType = type;
      }

      const result = await notificationService.getAdminReceivedNotifications(adminId, {
        page: pageNum,
        limit: limitNum,
        readStatus: validReadStatus,
        type: validType
      });

      res.status(200).json({
        success: true,
        data: result.data.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          type: n.type,
          audience: n.audience || 'admin',
          from_system: n.from_system || false,
          priority: n.priority,
          read_at: n.read_at,
          created_at: n.created_at,
          related_type: n.redirect_type || null,
          related_id: n.data?.related_id || null,
          data: n.data || {}
        })),
        meta: result.meta
      });

    } catch (error) {
      console.error('Error getting admin received notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách thông báo đã nhận',
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/admin/notifications/delete-all
   * Xóa tất cả thông báo trong database (NGUY HIỂM!)
   * 
   * Response:
   * - success: boolean
   * - message: string
   * - data: { deletedCount: number }
   */
  deleteAllNotifications: async (req, res) => {
    try {
      const deletedCount = await notificationService.deleteAllNotifications();

      res.status(200).json({
        success: true,
        message: `Đã xóa tất cả ${deletedCount} thông báo trong database`,
        data: {
          deletedCount
        }
      });

    } catch (error) {
      console.error('Error deleting all notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa tất cả thông báo',
        error: error.message
      });
    }
  },

  /**
   * GET /api/admin/notifications/columns
   * Lấy thông tin các cột trong bảng Notifications
   * 
   * Response:
   * - success: boolean
   * - data: array of column info
   */
  getTableColumns: async (req, res) => {
    try {
      const columns = await notificationService.getNotificationTableColumns();

      res.status(200).json({
        success: true,
        message: 'Lấy thông tin các cột thành công',
        data: columns.map((col) => ({
          name: col.column_name,
          type: col.data_type,
          maxLength: col.character_maximum_length,
          nullable: col.is_nullable === 'YES',
          default: col.column_default
        }))
      });

    } catch (error) {
      console.error('Error getting table columns:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thông tin các cột',
        error: error.message
      });
    }
  },

};

module.exports = notificationController;