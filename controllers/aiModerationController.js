// file: controllers/aiModerationController.js

const aiModerationService = require('../services/aiModerationService');

const aiModerationController = {
  /**
   * Test API kiểm duyệt văn bản
   * POST /api/ai-moderation/test-text
   */
  testTextModeration: async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          message: 'Text is required'
        });
      }

      const result = await aiModerationService.detectTextViolation(text);

      res.status(200).json({
        success: true,
        message: 'Text moderation completed',
        data: result
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error in text moderation',
        error: error.message
      });
    }
  },

  /**
   * Test API kiểm duyệt ảnh
   * POST /api/ai-moderation/test-image
   */
  testImageModeration: async (req, res) => {
    try {
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: 'Image URL is required'
        });
      }

      const result = await aiModerationService.detectImageNSFW(imageUrl);

      res.status(200).json({
        success: true,
        message: 'Image moderation completed',
        data: result
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error in image moderation',
        error: error.message
      });
    }
  },

  /**
   * Test API kiểm duyệt nội dung tổng hợp (text + images)
   * POST /api/ai-moderation/test-content
   */
  testContentModeration: async (req, res) => {
    try {
      const { text, images } = req.body;

      if (!text && (!images || images.length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Text or images are required'
        });
      }

      const result = await aiModerationService.moderateContent({
        text,
        images: images || []
      });

      res.status(200).json({
        success: true,
        message: 'Content moderation completed',
        data: result
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error in content moderation',
        error: error.message
      });
    }
  }
};

module.exports = aiModerationController;
