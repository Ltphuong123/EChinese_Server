// file: services/notificationService.js

const notificationModel = require('../models/notificationModel');


const fcmService = require('./fcmService');


const notificationService = {
  
  getUnreadNotificationCount: async (userId) => {
    const count = await notificationModel.countUnread(userId);
    return count;
  },

  createNotification: async (payload, autoPush = true) => {

    const notification = await notificationModel.create(payload);
    if (autoPush) {
      await notificationService.sendPushNotification(notification);
    }
    return notification;
  },

  /**
   * Gửi push notification dựa trên notification record
   */
  sendPushNotification: async (notification) => {
    try {
      const { recipient_id, audience, title, content, data, redirect_type } = notification;

      // Chuẩn bị payload với format mới
      const payload = {
        title,
        body: content?.message || JSON.stringify(content),
        data: {
          notification_id: notification.id,
          type: notification.type,
          redirect_type: redirect_type || 'none',
          timestamp: Date.now().toString(), // Thêm timestamp để frontend check duplicate
          ...data, // data đã chứa tất cả thông tin cần thiết
        },
      };

      // Gửi theo audience
      if (audience === 'all') {
        // Broadcast đến tất cả users
        console.log(`📢 Broadcasting to all users`);
        await fcmService.sendToAll(payload);
      } else if (audience === 'admin') {
        // Gửi đến tất cả admins (có thể implement riêng nếu cần)
        console.log(`📢 Broadcasting to all admins`);
        await fcmService.sendToAll(payload);
      } else if (audience === 'user' && recipient_id) {
        // Gửi đến user cụ thể
        console.log(`👤 Sending to user: ${recipient_id}`);
        await fcmService.sendToUser(recipient_id, payload);
      }

      // Đánh dấu đã gửi push
      await notificationModel.publishByIds([notification.id]);

      console.log(`✅ Push notification sent for: ${notification.id}`);
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
    }
  },

  getNotificationsForUser: async (options) => {
    const { userId, role, page, limit, type, unreadOnly } = options;
    const offset = (page - 1) * limit;

    // Lấy notifications
    const { notifications, totalItems } = await notificationModel.findAll({
      userId,
      role,
      limit,
      offset,
      type,
      unreadOnly
    });

    // Lấy số lượng thông báo chưa đọc
    const unreadCount = await notificationModel.countUnread(userId);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: notifications,
      meta: {
        total: totalItems,
        page,
        limit,
        totalPages
      },
      unreadCount
    };
  },

  publishNotifications: async (ids) => {
    // TODO: Thêm logic gọi đến service gửi push notification (Firebase, OneSignal...) ở đây
    const count = await notificationModel.publishByIds(ids);
    return count > 0;
  },

  /**
   * Thu hồi thông báo đã gửi (đánh dấu is_push_sent = false)
   * @param {Array<string>} ids - Mảng ID của các thông báo cần thu hồi
   * @returns {object} { count: number }
   */
  revokeNotifications: async (ids) => {
    const count = await notificationModel.revokeByIds(ids);
    return { count };
  },
  
  deleteNotifications: async (ids) => {
    const count = await notificationModel.deleteByIds(ids);
    return count > 0;
  },

  markNotificationsAsRead: async (notificationIds, userId, asRead) => {
    // Kiểm tra xem mảng ID có rỗng không
    if (!notificationIds || notificationIds.length === 0) {
      throw new Error("Mảng ID thông báo không được để trống.");
    }
    
    const updatedCount = await notificationModel.updateReadStatus(notificationIds, userId, asRead);
    
    // Bạn có thể trả về số lượng đã cập nhật nếu cần
    return updatedCount;
  },

  /**
   * Lấy tất cả thông báo đã gửi và đã nhận của admin
   */
  getAdminNotifications: async (adminId, options) => {
    const result = await notificationModel.findAdminNotifications(adminId, options);
    return result;
  },

  /**
   * Lấy chi tiết một thông báo
   */
  getNotificationById: async (notificationId, userId) => {
    const notification = await notificationModel.findById(notificationId, userId);
    
    if (!notification) {
      throw new Error('Thông báo không tồn tại hoặc bạn không có quyền xem.');
    }

    return notification;
  },

  /**
   * Xóa tất cả thông báo trong database (Admin only - NGUY HIỂM!)
   */
  deleteAllNotifications: async () => {
    const count = await notificationModel.deleteAll();
    return count;
  },

  /**
   * Lấy thông tin các cột trong bảng Notifications
   */
  getNotificationTableColumns: async () => {
    const columns = await notificationModel.getTableColumns();
    return columns;
  },

  /**
   * Lấy danh sách thông báo đã tạo của admin
   */
  getAdminSentNotifications: async (adminId, options) => {
    const { page = 1, limit = 15, status, audience, type } = options;
    const { notifications, totalItems } = await notificationModel.findAdminSentNotifications(adminId, { 
      page, 
      limit, 
      status, 
      audience, 
      type 
    });
    
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: notifications,
      meta: {
        total: totalItems,
        page,
        limit,
        totalPages
      }
    };
  },

  /**
   * Lấy danh sách thông báo đã nhận của admin
   */
  getAdminReceivedNotifications: async (adminId, options) => {
    const { page = 1, limit = 15, readStatus, type } = options;
    const { notifications, totalItems } = await notificationModel.findAdminReceivedNotifications(adminId, { 
      page, 
      limit, 
      readStatus, 
      type 
    });
    
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: notifications,
      meta: {
        total: totalItems,
        page,
        limit,
        totalPages
      }
    };
  },

};

module.exports = notificationService;