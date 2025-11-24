// file: controllers/paymentController.js

const paymentService = require('../services/paymentService');

const paymentController = {

  requestPayment: async (req, res) => {
    try {
      const { subscriptionId, paymentMethod } = req.body;
      const userId = req.user.id; // Lấy từ token sau khi đăng nhập

      if (!subscriptionId || !paymentMethod) {
        return res.status(400).json({ success: false, message: 'subscriptionId và paymentMethod là bắt buộc.' });
      }
      
      // Giới hạn các phương thức thủ công được phép
      if (paymentMethod !== 'bank_transfer') {
         return res.status(400).json({ success: false, message: 'Phương thức thanh toán không được hỗ trợ.' });
      }

      const result = await paymentService.requestManualPayment(userId, subscriptionId, paymentMethod);

      res.status(201).json({
        success: true,
        message: 'Yêu cầu thanh toán đã được tạo. Vui lòng hoàn tất chuyển khoản.',
        data: result
      });

    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes('free')) {
          return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi tạo yêu cầu thanh toán.', error: error.message });
    }
  },

  createPayment: async (req, res) => {
    try {
      const paymentData = req.body;
      const user_id = req.user.id; // Lấy từ token

      // --- Validation cơ bản ---
      const { subscription_id, amount, payment_method, manual_proof_url } = paymentData;

      if (!subscription_id || amount === undefined || !payment_method) {
        return res.status(400).json({
          success: false,
          message: 'Các trường subscription_id, amount, và payment_method là bắt buộc.'
        });
      }

      // Nếu có link ảnh chứng từ, thêm vào paymentData
      if (manual_proof_url) {
        paymentData.manual_proof_url = manual_proof_url;
      }

      const newPayment = await paymentService.createPayment(paymentData, user_id);

      res.status(201).json({
        success: true,
        message: 'Tạo giao dịch thanh toán thành công.',
        data: newPayment
      });

    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('exists')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi tạo giao dịch thanh toán.', error: error.message });
    }
  },

  getAllPayments: async (req, res) => {
    try {
      const options = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
        search: req.query.search || '',
        status: req.query.status || 'all',
        method: req.query.method || 'all',
        channel: req.query.channel || 'all',
        startDate: req.query.startDate || null,
        endDate: req.query.endDate || null,
      };
      const result = await paymentService.getAll(options);
      res.status(200).json({ success: true,data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách thanh toán.', error: error.message });
    }
  },

  updatePaymentStatus: async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { status } = req.body;
      const adminId = req.user.id; // Lấy từ token đã xác thực

      if (!['manual_confirmed', 'failed'].includes(status)) {
        return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ." });
      }

      const updatedPayment = await paymentService.updateStatus(paymentId, status, adminId);
      res.status(200).json({ success: true, message: 'Cập nhật trạng thái thành công.', data: updatedPayment });

    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes('Only pending')) {
          return res.status(409).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái.', error: error.message });
    }
  },

  bulkUpdatePaymentStatus: async (req, res) => {
    try {
      const { paymentIds, status } = req.body;
      const adminId = req.user.id;

       if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
        return res.status(400).json({ success: false, message: "paymentIds phải là một mảng không rỗng." });
      }
       if (status !== 'manual_confirmed') {
        return res.status(400).json({ success: false, message: "Chỉ hỗ trợ cập nhật hàng loạt cho trạng thái 'manual_confirmed'." });
      }

      const result = await paymentService.bulkUpdateStatus(paymentIds, status, adminId);
      res.status(200).json({ 
        success: true, 
        message: `Đã xử lý xong. Thành công: ${result.successCount}/${paymentIds.length}.`, 
        data: result 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật hàng loạt.', error: error.message });
    }
  },

  searchPayments: async (req, res) => {
        try {
            const { query } = req.query;
            const results = await paymentService.search(query);
            res.status(200).json({ success: true, data: results });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Lỗi khi tìm kiếm thanh toán.', error: error.message });
        }
  },

  getUserPaymentHistory: async (req, res) => {
    try {
      const userId = req.user.id; // Lấy từ token
      const history = await paymentService.getHistoryForUser(userId);
      res.status(200).json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy lịch sử giao dịch.', error: error.message });
    }
  },

  deleteAllPayments: async (req, res) => {
    try {
      const { confirmationCode } = req.body;
      const adminId = req.user.id;

      if (!confirmationCode) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu mã xác nhận. Vui lòng cung cấp confirmationCode trong body.'
        });
      }

      const result = await paymentService.deleteAllPayments(adminId, confirmationCode);

      res.status(200).json({
        success: true,
        message: 'Đã xóa tất cả payments thành công.',
        data: {
          deletedCount: result.deletedCount,
          performed_by: adminId,
          performed_at: new Date()
        }
      });

    } catch (error) {
      if (error.message.includes('Mã xác nhận')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json({ 
        success: false, 
        message: 'Lỗi khi xóa payments', 
        error: error.message 
      });
    }
  },
    
};

module.exports = paymentController;