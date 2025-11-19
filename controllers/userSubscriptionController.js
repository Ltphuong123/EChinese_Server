// file: controllers/userSubscriptionController.js

const userSubscriptionService = require('../services/userSubscriptionService');

const userSubscriptionController = {
  getAll: async (req, res) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      
      const options = {
        page,
        limit,
        offset: (page - 1) * limit,
        search: req.query.search || '',
      };

      const result = await userSubscriptionService.getAllEnriched(options);
      
      // API sẽ trả về cấu trúc { data, meta } trực tiếp từ service
      res.status(200).json({ success: true, data: result });

    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Lỗi khi lấy danh sách đăng ký của người dùng.', 
        error: error.message 
      });
    }
  },


updateDetails: async (req, res) => {
        try {
            const { id } = req.params;
            const payload = req.body;
            const result = await userSubscriptionService.updateSubscriptionDetails(id, payload);

            res.status(200).json({
                success: true,
                message: 'Cập nhật gói đăng ký thành công.',
                data: result,
            });
        } catch (error) {
            // ... xử lý lỗi không đổi ...
            if (error.message.includes('không tồn tại')) return res.status(404).json({ success: false, message: error.message });
            if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: error.message });
            if (error.name === 'BusinessLogicError') return res.status(409).json({ success: false, message: error.message });
            console.error('API Error in updateDetails:', error);
            res.status(500).json({ success: false, message: 'Đã xảy ra lỗi ở phía máy chủ.' });
        }
    },



  getHistory: async (req, res) => {
    try {
      const { userId } = req.params;
      const history = await userSubscriptionService.getHistory(userId);
      res.status(200).json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy lịch sử đăng ký.', error: error.message });
    }
  },

  addSubscription: async (req, res) => {
    try {
      const { userId, subscriptionId, ...overrides } = req.body;

      if (!userId || !subscriptionId) {
        return res.status(400).json({ 
          success: false, 
          message: 'userId và subscriptionId là bắt buộc.' 
        });
      }

      const newSubscription = await userSubscriptionService.addSubscription(userId, subscriptionId, overrides);

      res.status(201).json({
        success: true,
        message: 'Thêm gói cho người dùng thành công.',
        data: newSubscription
      });

    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi thêm gói.', error: error.message });
    }
  },

  /**
   * Kiểm tra và xử lý các gói đăng ký hết hạn (Admin only)
   * POST /api/admin/subscriptions/check-expiring
   */
  checkExpiringSubscriptions: async (req, res) => {
    try {
      const result = await userSubscriptionService.checkAndNotifyExpiringSubscriptions();
      
      res.status(200).json({
        success: true,
        message: 'Kiểm tra gói hết hạn thành công.',
        data: {
          expired_count: result.expiredCount,
          expiring_soon_count: result.expiringCount,
          checked_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error checking expiring subscriptions:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Lỗi khi kiểm tra gói hết hạn.', 
        error: error.message 
      });
    }
  },

};

module.exports = userSubscriptionController;