// services/usageService.js

const usageModel = require('../models/usageModel');
const userModel = require('../models/userModel'); // Import để kiểm tra user tồn tại
const userSubscriptionModel = require('../models/userSubscriptionModel');
const db = require('../config/db');
const usageService = {
  
  createUsage: async (usageData) => {
    const user = await userModel.findUserById(usageData.user_id);
    if (!user) {
      throw new Error(`Người dùng với ID ${usageData.user_id} không tồn tại.`);
    }
    return await usageModel.create(usageData);
  },
  getAllUsageRecords: async ({ page, limit, search }) => {
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;

    return await usageModel.findAll({ limit: limitInt, offset, search });
  },

  async resetUsageCounters(userId, features, client = db) {
        // --- Validation ---
        if (!userId) {
            throw new Error('userId là bắt buộc.');
        }
        if (!Array.isArray(features) || features.length === 0) {
            throw new Error('features phải là một mảng và không được rỗng.');
        }

        // --- Logic ---
        // Tạo một mảng các promise, mỗi promise là một lệnh upsert
        const upsertPromises = features.map(featureName => {
            const usageData = {
                user_id: userId,
                feature: featureName,
                daily_count: 0,
                last_reset: new Date(),
            };
            return usageModel.upsert(usageData, client);
        });

        // Thực thi tất cả các lệnh upsert song song
        const results = await Promise.all(upsertPromises);
        
        return results;
    },


    async incrementFeatureUsage(userId, feature) {
        if (!feature || !['ai_lesson', 'ai_translate'].includes(feature)) {
            throw new ValidationError('Tên tính năng không hợp lệ.');
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Lấy gói đăng ký đang hoạt động của người dùng để biết hạn mức
            // Chúng ta cần JOIN để lấy thông tin quota từ bảng Subscriptions
            const activeSub = await userSubscriptionModel.findActiveWithPlanDetails(userId, client);
            if (!activeSub) {
                // Xử lý trường hợp người dùng không có gói nào (có thể là lỗi hệ thống)
                // Hoặc cấp cho họ một gói "mặc định" không có quyền lợi
                throw new Error('Không tìm thấy gói đăng ký đang hoạt động của người dùng.');
            }

            // 2. Lấy hạn mức từ gói đăng ký
            const quotaLimit = activeSub[`daily_quota_${feature}`];

            // 3. Lấy số lượt đã dùng hiện tại.
            // Sử dụng FOR UPDATE để khóa hàng này, ngăn chặn race condition.
            let userUsage = await usageModel.findByUserAndFeature(userId, feature, client, true);

            // Nếu người dùng chưa từng dùng tính năng này, tạo bản ghi usage cho họ
            if (!userUsage) {
                userUsage = await usageModel.upsert({
                    user_id: userId,
                    feature: feature,
                    daily_count: 0,
                    last_reset: new Date()
                }, client);
            }
            
            // 4. KIỂM TRA HẠN MỨC
            if (userUsage.daily_count >= quotaLimit) {
                throw new QuotaExceededError(`Bạn đã hết hạn mức sử dụng ${feature} cho hôm nay.`);
            }

            // 5. Tăng số lượt đã dùng
            const updatedUsage = await usageModel.incrementCount(userUsage.id, client);

            await client.query('COMMIT');
            return updatedUsage;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }


};

module.exports = usageService;