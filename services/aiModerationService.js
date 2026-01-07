// file: services/aiModerationService.js

const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
require('dotenv').config();

const HF_TOKEN = process.env.HF_TOKEN;
const TEXT_MODERATION_API_URL = process.env.TEXT_MODERATION_API_URL || 'https://leohop-text-violation-detection.hf.space';
const IMAGE_MODERATION_API_URL = process.env.IMAGE_MODERATION_API_URL || 'https://leohop-nsfw-detect.hf.space';

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
        TEXT_MODERATION_API_URL,
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

      // Step 1: Download ảnh từ URL
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      let imageBuffer = Buffer.from(imageResponse.data);
      const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
      
      // Convert ảnh sang JPG nếu không phải định dạng được hỗ trợ (avif, webp, etc.)
      const unsupportedFormats = ['avif', 'webp', 'heic', 'heif', 'tiff'];
      const detectedFormat = contentType.split('/')[1] || '';
      
      if (unsupportedFormats.includes(detectedFormat.toLowerCase())) {
        console.log(`Converting ${detectedFormat} to JPEG...`);
        imageBuffer = await sharp(imageBuffer)
          .jpeg({ quality: 90 })
          .toBuffer();
      }

      // Step 2: Upload ảnh lên Gradio (dùng /gradio_api/upload)
      const formData = new FormData();
      formData.append('files', imageBuffer, {
        filename: 'image.jpg',
        contentType: 'image/jpeg'
      });

      const headers = {
        ...formData.getHeaders()
      };
      if (HF_TOKEN) {
        headers['Authorization'] = `Bearer ${HF_TOKEN}`;
      }

      const uploadResponse = await axios.post(
        `${IMAGE_MODERATION_API_URL}/gradio_api/upload?upload_id=${Date.now()}`,
        formData,
        {
          headers,
          timeout: 60000
        }
      );

      if (!uploadResponse.data || !uploadResponse.data[0]) {
        throw new Error('Failed to upload image to Gradio');
      }

      const uploadedFilePath = uploadResponse.data[0];
      console.log('Uploaded file path:', uploadedFilePath);

      // Step 3: Gọi predict API (dùng /gradio_api/call/predict)
      const callHeaders = {
        'Content-Type': 'application/json'
      };
      if (HF_TOKEN) {
        callHeaders['Authorization'] = `Bearer ${HF_TOKEN}`;
      }

      const callResponse = await axios.post(
        `${IMAGE_MODERATION_API_URL}/gradio_api/call/predict`,
        {
          data: [{ path: uploadedFilePath }]
        },
        {
          headers: callHeaders,
          timeout: 60000
        }
      );

      if (!callResponse.data || !callResponse.data.event_id) {
        throw new Error('Failed to call predict API');
      }

      const eventId = callResponse.data.event_id;
      console.log('Event ID:', eventId);

      // Step 4: Lấy kết quả từ event stream
      const resultResponse = await axios.get(
        `${IMAGE_MODERATION_API_URL}/gradio_api/call/predict/${eventId}`,
        {
          headers: callHeaders,
          timeout: 60000,
          responseType: 'text'
        }
      );

      // Parse SSE response
      const lines = resultResponse.data.split('\n');
      let result = null;
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonData = JSON.parse(line.substring(6));
            if (jsonData && Array.isArray(jsonData) && jsonData.length > 0) {
              result = jsonData[0];
              break;
            }
          } catch (e) {
            // Continue parsing
          }
        }
      }

      if (!result) {
        throw new Error('No result from AI model');
      }

      console.log('NSFW detection result:', result);

      // Phân tích kết quả - format: { predicted_label, predicted_confidence, probabilities }
      const label = result.predicted_label || result.label || 'unknown';
      const confidence = result.predicted_confidence || 0;
      const probabilities = result.probabilities || {};
      
      // Các label bị coi là NSFW
      const nsfwLabels = ['hentai', 'porn', 'sexy'];
      const isNSFW = nsfwLabels.includes(label.toLowerCase());

      return {
        isNSFW,
        label,
        confidence,
        probabilities,
        rawResult: result
      };

    } catch (error) {
      console.error('Error in detectImageNSFW:', error.message);
      
      // Fallback: Return safe result khi có lỗi (không block user)
      console.warn('Image moderation failed, returning safe result');
      return {
        isNSFW: false,
        label: 'unknown',
        confidence: 0,
        probabilities: {},
        rawResult: { error: error.message },
        error: error.message
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
