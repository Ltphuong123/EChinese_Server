// file: controllers/subscriptionController.js

const subscriptionService = require('../services/subscriptionService');

const subscriptionController = {
  getAllSubscriptions: async (req, res) => {
    try {
      const options = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
        search: req.query.search || '',
        status: req.query.status || 'all',
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'desc',
      };
      const result = await subscriptionService.getAll(options);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách gói', error: error.message });
    }
  },

  getAllSubscriptionsUser: async (req, res) => {
    try {
      const options = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
        search: req.query.search || '',
        status: req.query.status || 'active',
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'desc',
      };
      const result = await subscriptionService.getAll(options);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách gói', error: error.message });
    }
  },

  getSubscriptionUsage: async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const usage = await subscriptionService.getUsage(subscriptionId);
      res.status(200).json({ success: true, data: usage });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy gói đăng ký.' });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin sử dụng', error: error.message });
    }
  },

  createSubscription: async (req, res) => {
    try {
      const payload = req.body;
      if (!payload.name || payload.price === undefined) {
         return res.status(400).json({ success: false, message: "Trường 'name' và 'price' là bắt buộc." });
      }
      const newSubscription = await subscriptionService.create(payload);
      res.status(201).json({ success: true, message: 'Tạo gói thành công.', data: newSubscription });
    } catch (error) {
       if (error.code === '23505') { // unique_violation
        return res.status(409).json({ success: false, message: 'Tên gói đã tồn tại.' });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi tạo gói', error: error.message });
    }
  },

  updateSubscription: async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body;
      const updatedSubscription = await subscriptionService.update(id, payload);
      res.status(200).json({ success: true, message: 'Cập nhật gói thành công.', data: updatedSubscription });
    } catch (error) {
       if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy gói đăng ký.' });
      }
       if (error.code === '23505') {
        return res.status(409).json({ success: false, message: 'Tên gói đã tồn tại.' });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật gói', error: error.message });
    }
  },

  deleteSubscription: async (req, res) => {
    try {
      const { id } = req.params;
      await subscriptionService.delete(id);
      res.status(200).json({ success: true, message: 'Xóa gói thành công.' });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy gói đăng ký.' });
      }
      // Bắt lỗi foreign key violation
      if (error.code === '23503') {
        return res.status(409).json({ success: false, message: 'Không thể xóa gói này vì đang có người dùng sử dụng.' });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi xóa gói', error: error.message });
    }
  },
};

module.exports = subscriptionController;