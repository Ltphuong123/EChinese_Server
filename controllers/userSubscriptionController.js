// file: controllers/userSubscriptionController.js

const userSubscriptionService = require('../services/userSubscriptionService');

const userSubscriptionController = {
  getAll: async (req, res) => {
    try {
      const options = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
        search: req.query.search || '',
      };
      const result = await userSubscriptionService.getAllEnriched(options);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách đăng ký của người dùng.', error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const { userSubId } = req.params;
      const payload = req.body;
      const result = await userSubscriptionService.update(userSubId, payload);
      res.status(200).json({ success: true, message: 'Cập nhật thành công.', data: result });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('Cannot')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật.', error: error.message });
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


};

module.exports = userSubscriptionController;