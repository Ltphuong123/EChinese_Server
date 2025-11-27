// file: services/fcmService.js

const { messaging, isFirebaseEnabled } = require('../config/firebase');
const deviceTokenModel = require('../models/deviceTokenModel');

const fcmService = {

  /**
   * Gửi push notification đến một user
   * @param {string} userId - ID của user
   * @param {object} payload - Nội dung notification
   * @param {string} payload.title - Tiêu đề
   * @param {string} payload.body - Nội dung
   * @param {object} payload.data - Dữ liệu custom (optional)
   * @param {string} payload.imageUrl - URL hình ảnh (optional)
   */
  sendToUser: async (userId, payload) => {
    console.log(`🚀 [FCM DEBUG] sendToUser called for userId: ${userId}, title: ${payload.title}`);
    
    if (!isFirebaseEnabled()) {
      console.log('⚠️  Firebase not enabled, skipping push notification');
      return { success: false, reason: 'firebase_not_configured' };
    }

    try {
      // Lấy tất cả device tokens của user
      const devices = await deviceTokenModel.findByUserId(userId);

      if (!devices || devices.length === 0) {
        console.log(`ℹ️  User ${userId} has no device tokens`);
        return { success: false, reason: 'no_device_tokens' };
      }

      const tokens = devices.map(d => d.token);
      console.log(`📱 Found ${tokens.length} device(s) for user ${userId}`);
      
      const result = await fcmService.sendToTokens(tokens, payload);

      return result;
    } catch (error) {
      console.error('❌ Error sending notification to user:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Gửi push notification đến nhiều users
   * @param {string[]} userIds - Mảng user IDs
   * @param {object} payload - Nội dung notification
   */
  sendToUsers: async (userIds, payload) => {
    if (!isFirebaseEnabled()) {
      console.log('⚠️  Firebase not enabled, skipping push notification');
      return { success: false, reason: 'firebase_not_configured' };
    }

    try {
      const devices = await deviceTokenModel.findByUserIds(userIds);

      if (!devices || devices.length === 0) {
        console.log(`ℹ️  No device tokens found for ${userIds.length} users`);
        return { success: false, reason: 'no_device_tokens' };
      }

      const tokens = devices.map(d => d.token);
      const result = await fcmService.sendToTokens(tokens, payload);

      return result;
    } catch (error) {
      console.error('❌ Error sending notification to users:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Gửi broadcast notification đến tất cả users
   * @param {object} payload - Nội dung notification
   */
  sendToAll: async (payload) => {
    if (!isFirebaseEnabled()) {
      console.log('⚠️  Firebase not enabled, skipping push notification');
      return { success: false, reason: 'firebase_not_configured' };
    }

    try {
      const devices = await deviceTokenModel.findAllActive();

      if (!devices || devices.length === 0) {
        console.log('ℹ️  No active device tokens found');
        return { success: false, reason: 'no_device_tokens' };
      }

      const tokens = devices.map(d => d.token);
      console.log(`📢 Broadcasting to ${tokens.length} devices`);

      const result = await fcmService.sendToTokens(tokens, payload);

      return result;
    } catch (error) {
      console.error('❌ Error broadcasting notification:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Gửi notification đến danh sách tokens
   * @param {string[]} tokens - Mảng FCM tokens
   * @param {object} payload - Nội dung notification
   */
  sendToTokens: async (tokens, payload) => {
    if (!isFirebaseEnabled()) {
      return { success: false, reason: 'firebase_not_configured' };
    }

    if (!tokens || tokens.length === 0) {
      return { success: false, reason: 'no_tokens' };
    }

    try {
      // Firebase giới hạn 500 tokens/request
      const batchSize = 500;
      const batches = [];
      
      for (let i = 0; i < tokens.length; i += batchSize) {
        batches.push(tokens.slice(i, i + batchSize));
      }

      let totalSuccess = 0;
      let totalFailure = 0;
      const invalidTokens = [];

      // Xử lý từng batch
      for (const batch of batches) {
        const message = fcmService.buildMessage(batch, payload);
        
        const response = await messaging.sendEachForMulticast(message);
        
        totalSuccess += response.successCount;
        totalFailure += response.failureCount;

        // Xử lý các token lỗi
        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const errorCode = resp.error?.code;
              const token = batch[idx];

              // Token không hợp lệ → xóa khỏi database
              if (
                errorCode === 'messaging/invalid-registration-token' ||
                errorCode === 'messaging/registration-token-not-registered'
              ) {
                invalidTokens.push(token);
              }

              console.error(`❌ Failed to send to token: ${errorCode}`);
            }
          });
        }
      }

      // Xóa các token không hợp lệ
      if (invalidTokens.length > 0) {
        console.log(`🗑️  Removing ${invalidTokens.length} invalid tokens`);
        for (const token of invalidTokens) {
          await deviceTokenModel.deleteByToken(token);
        }
      }

      console.log(`✅ Sent: ${totalSuccess}, Failed: ${totalFailure}`);

      return {
        success: true,
        successCount: totalSuccess,
        failureCount: totalFailure,
        invalidTokensRemoved: invalidTokens.length,
      };
    } catch (error) {
      console.error('❌ Error sending to tokens:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Build FCM message object
   */
  buildMessage: (tokens, payload) => {
    const { title, body, data = {}, imageUrl } = payload;

    // Convert tất cả data values sang string (FCM yêu cầu)
    const stringData = {};
    Object.keys(data).forEach(key => {
      stringData[key] = String(data[key]);
    });

    const message = {
      tokens,
      notification: {
        title,
        body,
      },
      data: stringData,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
      },
      webpush: {
        notification: {
          icon: '/icon.png',
          badge: '/badge.png',
        },
      },
    };

    // Thêm hình ảnh nếu có
    if (imageUrl) {
      message.notification.imageUrl = imageUrl;
      message.android.notification.imageUrl = imageUrl;
      message.apns.payload.aps.mutableContent = true;
      message.apns.fcmOptions = { imageUrl };
    }

    return message;
  },

};

module.exports = fcmService;

