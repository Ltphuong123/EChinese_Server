// file: controllers/communityRuleController.js
const communityRuleModel = require('../models/communityRuleModel');

const communityRuleController = {
  createRule: async (req, res) => {
    try {
      const newRule = await communityRuleModel.create(req.body);
      res.status(201).json({ success: true, data: newRule });
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ success: false, message: 'Tiêu đề luật đã tồn tại.' });
      res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
  },
  getAllRules: async (req, res) => {
    try {
      const rules = await communityRuleModel.findAll();
      res.status(200).json({ success: true, 
        data: {
          data:rules,
          meta: { }
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
  },
  updateRule: async (req, res) => {
    try {
      const updatedRule = await communityRuleModel.update(req.params.id, req.body);
      if (!updatedRule) return res.status(404).json({ success: false, message: 'Không tìm thấy luật.' });
      res.status(200).json({ success: true, data: updatedRule });
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ success: false, message: 'Tiêu đề luật đã tồn tại.' });
      res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
  },
  deleteRule: async (req, res) => {
    try {
      const deletedCount = await communityRuleModel.delete(req.params.id);
      if (deletedCount === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy luật.' });
      res.status(200).send({ success: true, message: 'thành công' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
  }
};

module.exports = communityRuleController;