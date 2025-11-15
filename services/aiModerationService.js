// file: services/aiModerationService.js

const axios = require('axios');

const HF_TOKEN = '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';

const aiModerationService = {
  /**
   * Helper function để gọi Gradio API và đợi kết quả
   * Sử dụng API endpoint mới của Gradio
   */
  callGradioAPI: async (spaceUrl, data, timeout = 60000) => {
    try {
      // Gọi trực tiếp API endpoint với data
      const response = await axios.post(
        `${spaceUrl}/api/predict`,
        {
          data: data
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: timeout
        }
      );

      if (!response.data || !response.data.data) {
        throw new Error('Invalid response from Gradio API');
      }

      console.log('Result received:', response.data.data[0]);
      return response.data.data[0];

    } catch (error) {
      console.error('Error in callGradioAPI:', error.message);
      
      // Nếu API endpoint không hoạt động, thử endpoint backup
      if (error.response && error.response.status === 404) {
        console.log('Trying backup endpoint...');
        try {
          const backupResponse = await axios.post(
            `${spaceUrl}/run/predict`,
            {
              data: data
            },
            {
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: timeout
            }
          );

          if (backupResponse.data && backupResponse.data.data) {
            console.log('Backup endpoint success:', backupResponse.data.data[0]);
            return backupResponse.data.data[0];
          }
        } catch (backupError) {
          console.error('Backup endpoint also failed:', backupError.message);
        }
      }
      
      throw error;
    }
  },

  /**
   * Kiểm duyệt văn bản bằng AI
   * @param {string} text - Văn bản cần kiểm duyệt
   * @returns {Promise<Object>} Kết quả kiểm duyệt
   */
  detectTextViolation: async (text) => {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Text is required and must be a string');
      }

      // Mock result for testing - REMOVE THIS IN PRODUCTION
      // Uncomment below to use real API
      console.log('Detecting text violation for:', text);
      
      const result = await aiModerationService.callGradioAPI(
        'https://leohop-text-violation-detection.hf.space',
        [text]
      );

      if (!result) {
        throw new Error('No result from AI model');
      }

      // Phân tích kết quả
      const isViolation = result.label && result.label !== 'An toàn';
      const confidence = result.confidences && result.confidences.length > 0 
        ? result.confidences[0].confidence 
        : 0;

      return {
        isViolation,
        label: result.label || 'Unknown',
        confidence,
        confidences: result.confidences || [],
        rawResult: result
      };

    } catch (error) {
      console.error('Error in detectTextViolation:', error.message);
      
      // Fallback: Return mock data for testing
      console.warn('Using mock data for text moderation');
      const mockViolation = text.toLowerCase().includes('chó') || 
                           text.toLowerCase().includes('giết') ||
                           text.toLowerCase().includes('ma túy');
      
      return {
        isViolation: mockViolation,
        label: mockViolation ? 'Kích động Bạo lực' : 'An toàn',
        confidence: mockViolation ? 0.85 : 0.95,
        confidences: [
          { label: mockViolation ? 'Kích động Bạo lực' : 'An toàn', confidence: mockViolation ? 0.85 : 0.95 }
        ],
        rawResult: { mock: true, error: error.message }
      };
    }
  },

  /**
   * Kiểm duyệt ảnh bằng AI (NSFW detection)
   * @param {string} imageUrl - URL của ảnh cần kiểm duyệt
   * @returns {Promise<Object>} Kết quả kiểm duyệt
   */
  detectImageNSFW: async (imageUrl) => {
    try {
      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('Image URL is required and must be a string');
      }

      console.log('Detecting NSFW for image:', imageUrl);

      const result = await aiModerationService.callGradioAPI(
        'https://leohop-nsfw-detect.hf.space',
        [imageUrl]
      );

      if (!result) {
        throw new Error('No result from AI model');
      }

      // Phân tích kết quả
      const label = result.predicted_label || 'unknown';
      const confidence = result.predicted_confidence || 0;
      
      // Các label bị coi là NSFW
      const nsfwLabels = ['hentai', 'porn'];
      const isNSFW = nsfwLabels.includes(label.toLowerCase());

      return {
        isNSFW,
        label,
        confidence,
        probabilities: result.probabilities || {},
        rawResult: result
      };

    } catch (error) {
      console.error('Error in detectImageNSFW:', error.message);
      
      // Fallback: Return mock data for testing
      console.warn('Using mock data for image moderation');
      const mockNSFW = imageUrl.toLowerCase().includes('anime') || 
                      imageUrl.toLowerCase().includes('hentai');
      
      return {
        isNSFW: mockNSFW,
        label: mockNSFW ? 'hentai' : 'neutral',
        confidence: mockNSFW ? 0.92 : 0.98,
        probabilities: {
          neutral: mockNSFW ? 0.02 : 0.98,
          drawings: mockNSFW ? 0.05 : 0.01,
          sexy: mockNSFW ? 0.01 : 0.005,
          porn: 0.0,
          hentai: mockNSFW ? 0.92 : 0.005
        },
        rawResult: { mock: true, error: error.message }
      };
    }
  },

  /**
   * Kiểm duyệt nội dung post (text + images)
   * @param {Object} content - Nội dung cần kiểm duyệt
   * @param {string} content.text - Văn bản
   * @param {Array<string>} content.images - Mảng URL ảnh
   * @returns {Promise<Object>} Kết quả kiểm duyệt tổng hợp
   */
  moderateContent: async (content) => {
    try {
      const results = {
        text: null,
        images: [],
        isViolation: false,
        violationReasons: []
      };

      // Kiểm duyệt văn bản nếu có
      if (content.text) {
        try {
          results.text = await aiModerationService.detectTextViolation(content.text);
          if (results.text.isViolation) {
            results.isViolation = true;
            results.violationReasons.push({
              type: 'text',
              label: results.text.label,
              confidence: results.text.confidence
            });
          }
        } catch (error) {
          console.error('Text moderation error:', error.message);
          results.text = { error: error.message };
        }
      }

      // Kiểm duyệt ảnh nếu có
      if (content.images && Array.isArray(content.images) && content.images.length > 0) {
        for (const imageUrl of content.images) {
          try {
            const imageResult = await aiModerationService.detectImageNSFW(imageUrl);
            results.images.push({
              url: imageUrl,
              ...imageResult
            });
            
            if (imageResult.isNSFW) {
              results.isViolation = true;
              results.violationReasons.push({
                type: 'image',
                url: imageUrl,
                label: imageResult.label,
                confidence: imageResult.confidence
              });
            }
          } catch (error) {
            console.error(`Image moderation error for ${imageUrl}:`, error.message);
            results.images.push({
              url: imageUrl,
              error: error.message
            });
          }
        }
      }

      return results;

    } catch (error) {
      console.error('Error in moderateContent:', error.message);
      throw error;
    }
  }
};

module.exports = aiModerationService;
