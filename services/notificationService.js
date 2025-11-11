// file: services/notificationService.js

const notificationModel = require('../models/notificationModel');

const notificationService = {
  
  getUnreadNotificationCount: async (userId) => {
    const count = await notificationModel.countUnread(userId);
    return count;
  },

  createNotification: async (payload) => {
    // TODO: Add validation for payload
    return await notificationModel.create(payload);
  },

  getNotificationsForUser: async (options) => {
    const { userId, role, page, limit } = options;
    const offset = (page - 1) * limit;

    const { notifications, totalItems } = await notificationModel.findAll({ userId, role, limit, offset });
    
    const totalPages = Math.ceil(totalItems / limit);
    return { data: notifications, meta: { total: totalItems, page, limit, totalPages } };
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

};

module.exports = notificationService;