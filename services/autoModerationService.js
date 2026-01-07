// file: services/autoModerationService.js

const aiModerationService = require('./aiModerationService');
const moderationModel = require('../models/moderationModel');
const postService = require('./postService');
const commentService = require('./commentService');
const notificationModel = require('../models/notificationModel');
const db = require('../config/db');

const autoModerationService = {
  /**
   * Tìm hoặc tạo CommunityRule theo title
   */
  findOrCreateRule: async (title, description, severity = 'medium') => {
    try {
      // Tìm rule theo title
      const existingRule = await db.query(
        `SELECT * FROM "CommunityRules" WHERE title = $1 AND is_active = true LIMIT 1`,
        [title]
      );

      if (existingRule.rows.length > 0) {
        return existingRule.rows[0];
      }

      // Tạo rule mới nếu chưa tồn tại
      const newRule = await db.query(
        `INSERT INTO "CommunityRules" (title, description, severity_default, is_active)
         VALUES ($1, $2, $3, true)
         RETURNING *`,
        [title, description, severity]
      );

      return newRule.rows[0];
    } catch (error) {
      console.error('Error in findOrCreateRule:', error);
      throw error;
    }
  },

  /**
   * Tự động kiểm duyệt và xử lý post
   */
  moderatePost: async (postId, postData) => {
    try {
      const violations = [];
      let shouldRemove = false;
      let removalReason = '';

      // 1. Kiểm duyệt TITLE
      if (postData.title) {
        try {
          const titleResult = await aiModerationService.detectTextViolation(postData.title);
          
          // Nếu vi phạm title
          if (titleResult.isViolation && titleResult.confidence > 0.65) {
            shouldRemove = true;
            removalReason = `Vi phạm tiêu đề: ${titleResult.label}`;
            
            // Tìm hoặc tạo rule
            const rule = await autoModerationService.findOrCreateRule(
              titleResult.label,
              `Nội dung vi phạm được phát hiện tự động bởi AI`,
               'high' 
            );

            violations.push({
              type: 'title',
              label: titleResult.label,
              confidence: titleResult.confidence,
              ruleId: rule.id
            });
          }
        } catch (error) {
          console.error('Title moderation error:', error);
        }
      }

      // 2. Kiểm duyệt CONTENT
      if (postData.content) {
        const textContent = typeof postData.content === 'string' 
          ? postData.content 
          : postData.content.text || postData.content.html || '';

        if (textContent) {
          try {
            const textResult = await aiModerationService.detectTextViolation(textContent);
            
            // Nếu vi phạm văn bản
            if (textResult.isViolation && textResult.confidence > 0.65) {
              shouldRemove = true;
              // Nếu đã có lỗi title, thêm vào; nếu chưa thì set mới
              if (removalReason) {
                removalReason += ` và nội dung: ${textResult.label}`;
              } else {
                removalReason = `Vi phạm nội dung: ${textResult.label}`;
              }
              
              // Tìm hoặc tạo rule
              const rule = await autoModerationService.findOrCreateRule(
                textResult.label,
                `Nội dung vi phạm được phát hiện tự động bởi AI`,
                 'high'
              );

              violations.push({
                type: 'content',
                label: textResult.label,
                confidence: textResult.confidence,
                ruleId: rule.id
              });
            }
          } catch (error) {
            console.error('Content moderation error:', error);
          }
        }
      }

      // 3. Kiểm duyệt ảnh
      // Lấy images từ postData.images hoặc postData.content.images
      let images = postData.images;
      if (!images && postData.content) {
        if (Array.isArray(postData.content.images)) {
          images = postData.content.images;
        } else if (typeof postData.content === 'object' && postData.content.images) {
          images = postData.content.images;
        }
      }
      
      if (images && Array.isArray(images) && images.length > 0) {
        for (const imageUrl of images) {
          try {
            const imageResult = await aiModerationService.detectImageNSFW(imageUrl);
            
            // Nếu ảnh NSFW
            if (imageResult.isNSFW) {
              shouldRemove = true;
              removalReason = `Ảnh không phù hợp: ${imageResult.label}`;
              
              // Tìm hoặc tạo rule cho NSFW
              const rule = await autoModerationService.findOrCreateRule(
                'Ảnh khỏa thân và Hoạt động Tình dục của Người lớn',
                `Ảnh chứa nội dung không phù hợp được phát hiện tự động bởi AI`,  'high' 
              );

              violations.push({
                type: 'image',
                url: imageUrl,
                label: imageResult.label,
                confidence: imageResult.confidence,
                ruleId: rule.id
              });
            }
          } catch (error) {
            console.error(`Image moderation error for ${imageUrl}:`, error);
          }
        }
      }

      // 3. Xử lý nếu có vi phạm
      if (shouldRemove && violations.length > 0) {
        // Gỡ bài viết
        await postService.updatePostStatus(postId, {
          status: 'removed',
          deleted_at: new Date(),
          deleted_by: null, // Auto moderation
          deleted_reason: removalReason
        });

        // Tạo violation cho mỗi vi phạm
        const ruleIds = violations.map(v => v.ruleId);
        const highestConfidence = Math.max(...violations.map(v => v.confidence));
        const severity = highestConfidence > 0.9 ? 'high' : (highestConfidence > 0.8 ? 'medium' : 'low');

        await moderationModel.createViolationAuto({
          userId: postData.user_id,
          targetType: 'post',
          targetId: postId,
          severity: severity,
          ruleIds: ruleIds,
          detectedBy: 'auto_ai',
          resolution: removalReason
        });

        // Tạo preview của nội dung bài viết
        const contentPreview = typeof postData.content === 'string' 
          ? postData.content.substring(0, 100) 
          : (postData.content?.text || postData.content?.html || '').substring(0, 100);

        // Lấy thông tin chi tiết các rule bị vi phạm
        const violatedRules = await db.query(
          `SELECT id, title, description, severity_default FROM "CommunityRules" WHERE id = ANY($1::uuid[])`,
          [ruleIds]
        );

        const rulesText = violatedRules.rows.map((r, i) => 
          `${i+1}. ${r.title} (${r.severity_default}): ${r.description}`
        ).join('\n');

        const violationsText = violations.map((v, i) => 
          `${i+1}. Loại: ${v.type}, Nhãn: ${v.label}, Độ tin cậy: ${(v.confidence * 100).toFixed(1)}%`
        ).join('\n');

        // Chuyển severity sang tiếng Việt
        const severityText = {
          low: 'Thấp',
          medium: 'Trung bình',
          high: 'Cao',
          critical: 'Nghiêm trọng'
        }[severity] || severity;

        // Gửi thông báo chi tiết cho người dùng với auto push
        const notificationService = require('./notificationService');
        await notificationService.createNotification({
          recipient_id: postData.user_id,
          audience: 'user',
          type: 'violation',
          title: 'Bài viết của bạn đã bị gỡ tự động',
          content: {
            html: `<p>Bài viết <strong>"${postData.title}"</strong> của bạn đã bị hệ thống AI tự động phát hiện và gỡ bỏ do vi phạm quy tắc cộng đồng.</p><p><strong>Lý do:</strong> ${removalReason}</p><p><strong>Độ nghiêm trọng:</strong> ${severityText}</p><p><strong>Phát hiện bởi:</strong> AI tự động</p>${violatedRules.rows.length > 0 ? `<p><strong>Các quy tắc bị vi phạm:</strong></p><ul>${violatedRules.rows.map(r => `<li><strong>${r.title}</strong>: ${r.description}</li>`).join('')}</ul>` : ''}<p><em>Nội dung bài viết:</em> "${contentPreview}..."</p><hr><p><small><strong>Thông tin chi tiết:</strong></small></p><ul style="font-size: 0.9em;"><li><strong>Bài viết:</strong> ${postData.title}</li><li><strong>Phát hiện bởi:</strong> AI tự động</li><li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li></ul><p><small>Bạn có thể khiếu nại quyết định này nếu cho rằng đây là nhầm lẫn.</small></p>`
          },
          redirect_type: 'post',
          data: {
            id: postId,
            type: 'post_remove'
          }
        }, true); // auto push = true

        return {
          moderated: true,
          removed: true,
          reason: removalReason,
          violations: violations
        };
      }

      return {
        moderated: true,
        removed: false,
        violations: []
      };

    } catch (error) {
      console.error('Error in moderatePost:', error);
      // Không throw error để không ảnh hưởng đến việc tạo post
      return {
        moderated: false,
        error: error.message
      };
    }
  },

  /**
   * Tự động kiểm duyệt và xử lý comment
   */
  moderateComment: async (commentId, commentData) => {
    try {
      const violations = [];
      let shouldRemove = false;
      let removalReason = '';

      // 1. Kiểm duyệt văn bản
      if (commentData.content) {
        const textContent = typeof commentData.content === 'string' 
          ? commentData.content 
          : commentData.content.text || commentData.content.html || '';

        if (textContent) {
          try {
            const textResult = await aiModerationService.detectTextViolation(textContent);
            
            // Nếu vi phạm văn bản
            if (textResult.isViolation && textResult.confidence > 0.65) {
              shouldRemove = true;
              removalReason = `Vi phạm nội dung: ${textResult.label}`;
              
              // Tìm hoặc tạo rule
              const rule = await autoModerationService.findOrCreateRule(
                textResult.label,
                `Nội dung vi phạm được phát hiện tự động bởi AI`,
                 'high'
              );

              violations.push({
                type: 'text',
                label: textResult.label,
                confidence: textResult.confidence,
                ruleId: rule.id
              });
            }
          } catch (error) {
            console.error('Text moderation error:', error);
          }
        }
      }

      // 3. Xử lý nếu có vi phạm
      if (shouldRemove && violations.length > 0) {
        // Gỡ bình luận
        const commentModel = require('../models/commentModel');
        await commentModel.softDelete(commentId, {
          deleted_at: new Date(),
          deleted_by: null, // Auto moderation
          deleted_reason: removalReason
        });

        // Tạo violation
        const ruleIds = violations.map(v => v.ruleId);
        const highestConfidence = Math.max(...violations.map(v => v.confidence));
        const severity = highestConfidence > 0.9 ? 'high' : (highestConfidence > 0.8 ? 'medium' : 'low');

        await moderationModel.createViolationAuto({
          userId: commentData.user_id,
          targetType: 'comment',
          targetId: commentId,
          severity: severity,
          ruleIds: ruleIds,
          detectedBy: 'auto_ai',
          resolution: removalReason
        });

        // Tạo preview của comment
        const commentPreview = typeof commentData.content === 'string' 
          ? commentData.content.substring(0, 100) 
          : (commentData.content?.text || commentData.content?.html || '').substring(0, 100);

        // Lấy thông tin chi tiết các rule bị vi phạm
        const violatedRules = await db.query(
          `SELECT id, title, description, severity_default FROM "CommunityRules" WHERE id = ANY($1::uuid[])`,
          [ruleIds]
        );

        const rulesText = violatedRules.rows.map((r, i) => 
          `${i+1}. ${r.title} (${r.severity_default}): ${r.description}`
        ).join('\n');

        const violationsText = violations.map((v, i) => 
          `${i+1}. Loại: ${v.type}, Nhãn: ${v.label}, Độ tin cậy: ${(v.confidence * 100).toFixed(1)}%`
        ).join('\n');

        // Chuyển severity sang tiếng Việt
        const severityText = {
          low: 'Thấp',
          medium: 'Trung bình',
          high: 'Cao',
          critical: 'Nghiêm trọng'
        }[severity] || severity;

        // Gửi thông báo chi tiết cho người dùng với auto push
        const notificationService = require('./notificationService');
        await notificationService.createNotification({
          recipient_id: commentData.user_id,
          audience: 'user',
          type: 'violation',
          title: 'Bình luận của bạn đã bị gỡ tự động',
          content: {
            html: `<p>Bình luận của bạn đã bị hệ thống AI tự động phát hiện và gỡ bỏ do vi phạm quy tắc cộng đồng.</p><p><strong>Lý do:</strong> ${removalReason}</p><p><strong>Độ nghiêm trọng:</strong> ${severityText}</p><p><strong>Phát hiện bởi:</strong> AI tự động</p>${violatedRules.rows.length > 0 ? `<p><strong>Các quy tắc bị vi phạm:</strong></p><ul>${violatedRules.rows.map(r => `<li><strong>${r.title}</strong>: ${r.description}</li>`).join('')}</ul>` : ''}<p><em>Nội dung bình luận:</em> "${commentPreview}..."</p><hr><p><small><strong>Thông tin chi tiết:</strong></small></p><ul style="font-size: 0.9em;"><li><strong>Bài viết ID:</strong> ${commentData.post_id}</li><li><strong>Phát hiện bởi:</strong> AI tự động</li><li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li></ul><p><small>Bạn có thể khiếu nại quyết định này nếu cho rằng đây là nhầm lẫn.</small></p>`
          },
          redirect_type: 'post_comment',
          data: {
            comment_id: commentId,
            post_id: commentData.post_id,
            type: 'comment_remove'
          }
        }, true); // auto push = true

        return {
          moderated: true,
          removed: true,
          reason: removalReason,
          violations: violations
        };
      }

      return {
        moderated: true,
        removed: false,
        violations: []
      };

    } catch (error) {
      console.error('Error in moderateComment:', error);
      // Không throw error để không ảnh hưởng đến việc tạo comment
      return {
        moderated: false,
        error: error.message
      };
    }
  }
};

module.exports = autoModerationService;
