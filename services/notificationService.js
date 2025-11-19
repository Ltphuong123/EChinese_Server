// file: services/notificationService.js

const notificationModel = require('../models/notificationModel');


const fcmService = require('./fcmService');


const notificationService = {
  
  getUnreadNotificationCount: async (userId) => {
    const count = await notificationModel.countUnread(userId);
    return count;
  },

  createNotification: async (payload, autoPush = true) => {
    // Tạo notification record
    const notification = await notificationModel.create(payload);

    // Tự động gửi push notification nếu autoPush = true
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
          ...data, // data đã chứa tất cả thông tin cần thiết
        },
      };

      // Gửi theo audience
      if (audience === 'all'|| audience === 'admin'|| audience === 'user') {
        // Broadcast đến tất cả users
        await fcmService.sendToAll(payload);
      } else if (recipient_id) {
        // Gửi đến user cụ thể
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

};

module.exports = notificationService;