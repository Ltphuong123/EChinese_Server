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
          if (titleResult.isViolation && titleResult.confidence > 0.7) {
            shouldRemove = true;
            removalReason = `Vi phạm tiêu đề: ${titleResult.label}`;
            
            // Tìm hoặc tạo rule
            const rule = await autoModerationService.findOrCreateRule(
              titleResult.label,
              `Nội dung vi phạm được phát hiện tự động bởi AI`,
              titleResult.confidence > 0.9 ? 'high' : 'medium'
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
            if (textResult.isViolation && textResult.confidence > 0.7) {
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
                textResult.confidence > 0.9 ? 'high' : 'medium'
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
      if (postData.images && Array.isArray(postData.images) && postData.images.length > 0) {
        for (const imageUrl of postData.images) {
          try {
            const imageResult = await aiModerationService.detectImageNSFW(imageUrl);
            
            // Nếu ảnh NSFW
            if (!imageResult.isNSFW ) {
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

        // Gửi thông báo chi tiết cho người dùng với auto push
        const notificationService = require('./notificationService');
        await notificationService.createNotification({
          recipient_id: postData.user_id,
          audience: 'user',
          type: 'violation',
          title: '🤖 Bài viết của bạn đã bị gỡ tự động',
          content: {
            message: `Bài viết của bạn vi phạm quy tắc cộng đồng: ${removalReason}. Nội dung đã được hệ thống AI tự động phát hiện và gỡ bỏ.`,
            violation_severity: severity,
            violation_type: 'post',
            detected_by: 'AI',
            violations_detail: violations.map(v => ({
              type: v.type,
              label: v.label,
              confidence: v.confidence
            }))
          },
          redirect_type: 'post',
          data: {
            post_id: postId,
            post_title: postData.title,
            post_preview: contentPreview,
            violation_reason: removalReason,
            severity: severity,
            violated_rules: violatedRules.rows.map(r => ({
              id: r.id,
              title: r.title,
              description: r.description,
              severity: r.severity_default
            })),
            violations: violations,
            auto_detected: true,
            removed_at: new Date().toISOString()
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
            if (textResult.isViolation && textResult.confidence > 0.7) {
              shouldRemove = true;
              removalReason = `Vi phạm nội dung: ${textResult.label}`;
              
              // Tìm hoặc tạo rule
              const rule = await autoModerationService.findOrCreateRule(
                textResult.label,
                `Nội dung vi phạm được phát hiện tự động bởi AI`,
                textResult.confidence > 0.9 ? 'high' : 'medium'
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

        // Gửi thông báo chi tiết cho người dùng với auto push
        const notificationService = require('./notificationService');
        await notificationService.createNotification({
          recipient_id: commentData.user_id,
          audience: 'user',
          type: 'violation',
          title: '🤖 Bình luận của bạn đã bị gỡ tự động',
          content: {
            message: `Bình luận của bạn vi phạm quy tắc cộng đồng: ${removalReason}. Nội dung đã được hệ thống AI tự động phát hiện và gỡ bỏ.`,
            violation_severity: severity,
            violation_type: 'comment',
            detected_by: 'AI',
            violations_detail: violations.map(v => ({
              type: v.type,
              label: v.label,
              confidence: v.confidence
            }))
          },
          redirect_type: 'post_comment',
          data: {
            post_id: commentData.post_id,
            comment_id: commentId,
            comment_preview: commentPreview,
            violation_reason: removalReason,
            severity: severity,
            violated_rules: violatedRules.rows.map(r => ({
              id: r.id,
              title: r.title,
              description: r.description,
              severity: r.severity_default
            })),
            violations: violations,
            auto_detected: true,
            removed_at: new Date().toISOString()
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
