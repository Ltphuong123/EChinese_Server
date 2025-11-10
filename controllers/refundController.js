// file: controllers/refundController.js

const refundService = require('../services/refundService');

const refundController = {
  // --- Controllers cho Admin ---
  getAllRefunds: async (req, res) => {
    try {
      const options = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
        search: req.query.search || '',
        status: req.query.status || 'all',
        startDate: req.query.startDate || null,
        endDate: req.query.endDate || null,
      };
      const result = await refundService.getAll(options);
      res.status(200).json({ success: true, data:result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách hoàn tiền.', error: error.message });
    }
  },

processRefund: async (req, res) => {
        try {
          const adminId = req.user.id;
            const { id } = req.params;
            const payload = req.body;
            
            const processedRefund = await refundService.processRefundRequest(id, adminId,payload);

            res.status(200).json({
                success: true,
                message: `Yêu cầu hoàn tiền đã được xử lý thành công.`,
                data: processedRefund,
            });
        } catch (error) {
            const statusCode = error.statusCode || 500;
            res.status(statusCode).json({ success: false, message: error.message });
        }
    },




  // --- Controllers cho User ---
  createUserRefundRequest: async (req, res) => {
      try {
        const { paymentId, reason } = req.body;
        const userId = req.user.id; // Lấy từ token
        if (!paymentId || !reason) {
            return res.status(400).json({ success: false, message: 'paymentId and reason are required.'});
        }
        const newRefund = await refundService.requestRefund(userId, paymentId, reason);
        res.status(201).json({ success: true, message: 'Yêu cầu hoàn tiền đã được gửi.', data: newRefund });
      } catch (error) {
          if(error.message.includes('not found') || error.message.includes('does not belong')) {
              return res.status(404).json({ success: false, message: error.message });
          }
          res.status(500).json({ success: false, message: 'Lỗi khi tạo yêu cầu.', error: error.message });
      }
  },

  getUserRefundHistory: async (req, res) => {
      try {
        const userId = req.user.id;
        const history = await refundService.getRefundHistory(userId);
        res.status(200).json({ success: true, data: history });
      } catch (error) {
          res.status(500).json({ success: false, message: 'Lỗi khi lấy lịch sử.', error: error.message });
      }
  }
};

module.exports = refundController;