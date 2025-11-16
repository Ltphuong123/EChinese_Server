// file: services/userSubscriptionService.js

const userSubscriptionModel = require('../models/userSubscriptionModel');
const usageModel = require('../models/usageModel');
const db = require('../config/db');
require('dotenv').config();

const FREE_PLAN_ID = process

class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; }
}

class BusinessLogicError extends Error {
  constructor(message) { super(message); this.name = 'BusinessLogicError'; }
}

async function handleChangePlan(oldUserSub, payload) {
  const { new_subscription_id, change_type } = payload;
  
  const [oldPlan, newPlan] = await Promise.all([
    userSubscriptionModel.findSubscriptionById(oldUserSub.subscription_id),
    userSubscriptionModel.findSubscriptionById(new_subscription_id)
  ]);

  if (!oldPlan || !newPlan) {
    throw new Error('Old or new subscription plan not found.');
  }

  // --- LOGIC CHO 'IMMEDIATE' ---
  if (change_type === 'immediate') {
    const now = new Date();
    const expiryDate = oldUserSub.expiry_date ? new Date(oldUserSub.expiry_date) : null;
    
    if (expiryDate && now >= expiryDate) {
        throw new Error('Current plan has already expired. Cannot change immediately.');
    }
    if (!oldPlan.duration_months || oldPlan.duration_months <= 0) {
        throw new Error('Cannot calculate remaining value for a lifetime or free plan.');
    }

    const remainingMillis = expiryDate.getTime() - now.getTime();
    const remainingDays = remainingMillis / (1000 * 60 * 60 * 24);
    
    const costPerDayOldPlan = parseFloat(oldPlan.price) / (oldPlan.duration_months * 30);
    const remainingValue = remainingDays * costPerDayOldPlan;

    let newExpiryDate = null;
    if (newPlan.duration_months && newPlan.duration_months > 0 && parseFloat(newPlan.price) > 0) {
        const costPerDayNewPlan = parseFloat(newPlan.price) / (newPlan.duration_months * 30);
        const addedDays = remainingValue / costPerDayNewPlan;
        
        newExpiryDate = new Date();
        newExpiryDate.setDate(newExpiryDate.getDate() + addedDays);
    } // Nếu gói mới là vĩnh viễn hoặc miễn phí, newExpiryDate sẽ là null

    // Thực hiện thay đổi trong transaction
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        await userSubscriptionModel.update(oldUserSub.id, { is_active: false }, client);
        const newSub = await userSubscriptionModel.create({
            user_id: oldUserSub.user_id,
            subscription_id: new_subscription_id,
            start_date: new Date(),
            expiry_date: newExpiryDate,
            is_active: true,
            auto_renew: oldUserSub.auto_renew,
        }, client);
        await client.query('COMMIT');
        return newSub;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
  }
  
  // --- LOGIC CHO 'END_OF_TERM' ---
  if (change_type === 'end_of_term') {
    if (!oldUserSub.expiry_date) {
        throw new Error("Cannot schedule a change for a plan that doesn't expire.");
    }
    const newStartDate = new Date(oldUserSub.expiry_date);
    let newExpiryDate = null;
    if (newPlan.duration_months) {
        newExpiryDate = new Date(newStartDate);
        newExpiryDate.setMonth(newExpiryDate.getMonth() + newPlan.duration_months);
    }
    
    await userSubscriptionModel.create({
      user_id: oldUserSub.user_id,
      subscription_id: new_subscription_id,
      start_date: newStartDate,
      expiry_date: newExpiryDate,
      is_active: false,
      auto_renew: oldUserSub.auto_renew,
      last_payment_id: null
    });
    
    return { success: true, message: 'Plan change scheduled successfully.' };
  }

  throw new Error('Invalid change_type specified.');
}


const userSubscriptionService = {
  /**
   * Lấy và làm giàu dữ liệu đăng ký của người dùng
   */
  getAllEnriched: async (options) => {
    // 1. Lấy danh sách người dùng đã được phân trang
    const { users, totalItems } = await userSubscriptionModel.findAllUsersPaginated(options);

    // Nếu không có người dùng nào ở trang này, trả về kết quả rỗng
    if (users.length === 0) {
      return { 
        data: [], 
        meta: { total: 0, page: options.page, limit: options.limit, totalPages: 0 } 
      };
    }

    const userIds = users.map(u => u.id);

    // 2. Lấy tất cả dữ liệu liên quan cho nhóm người dùng này MỘT CÁCH SONG SONG
    const [subscriptionsInfo, usages] = await Promise.all([
      userSubscriptionModel.findSubscriptionsForUsers(userIds),
      userSubscriptionModel.findUsagesForUsers(userIds)
    ]);
    
    // 3. Chuẩn bị các Map để tra cứu dữ liệu hiệu quả (O(1) lookup)
    const subsMap = new Map(subscriptionsInfo.map(s => [s.user_id, s]));
    const usageMap = new Map();
    usages.forEach(u => {
      if (!usageMap.has(u.user_id)) {
        usageMap.set(u.user_id, {});
      }
      usageMap.get(u.user_id)[u.feature] = u;
    });

    // 4. Lắp ráp (enrich) dữ liệu cho từng người dùng
    const enrichedData = users.map(user => {
      const subInfo = subsMap.get(user.id);
      const userUsage = usageMap.get(user.id) || {};

      return {
        user, // user đã có đúng dạng Pick<> từ model
        userSubscription: subInfo ? subInfo.userSubscription : undefined,
        subscription: subInfo ? subInfo.subscription : undefined,
        quotas: {
          ai_lesson: userUsage.ai_lesson || null,
          ai_translate: userUsage.ai_translate || null,
        }
      };
    });

    // 5. Tính toán thông tin meta và trả về kết quả cuối cùng
    const totalPages = Math.ceil(totalItems / options.limit);
    return {
      data: enrichedData,
      meta: { total: totalItems, page: options.page, limit: options.limit, totalPages }
    };
  },



  /**
   * Lấy lịch sử
   */
  getHistory: async (userId) => {
    return await userSubscriptionModel.findHistoryByUserId(userId);
  },


  addSubscription: async (userId, subscriptionId, overrides = {}) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // --- BƯỚC 1: Lấy thông tin gói mới ---
      const newPlan = await userSubscriptionModel.findSubscriptionById(subscriptionId, client);
      if (!newPlan) {
        throw new Error('Gói đăng ký không tồn tại.');
      }
      
      // --- BƯỚC 2: Hủy kích hoạt gói cũ (nếu có) ---
      const currentActiveSub = await userSubscriptionModel.findActiveSubscriptionByUserId(userId, client);
      if (currentActiveSub) {
        await userSubscriptionModel.update(currentActiveSub.id, { is_active: false }, client);
      }

      // --- BƯỚC 3: Chuẩn bị dữ liệu cho gói mới ---
      const startDate = overrides.startDate ? new Date(overrides.startDate) : new Date();
      let expiryDate = overrides.expiryDate ? new Date(overrides.expiryDate) : null;

      if (expiryDate === null && newPlan.duration_months) {
        expiryDate = new Date(startDate);
        expiryDate.setMonth(expiryDate.getMonth() + newPlan.duration_months);
      }

      const newSubData = {
        user_id: userId,
        subscription_id: subscriptionId,
        start_date: startDate,
        expiry_date: expiryDate,
        is_active: true,
        auto_renew: overrides.autoRenew !== undefined ? overrides.autoRenew : false,
        last_payment_id: overrides.paymentId || null,
      };

      // --- BƯỚC 4: Tạo bản ghi UserSubscription mới ---
      const createdSubscription = await userSubscriptionModel.create(newSubData, client);

      // --- BƯỚC 5 (MỚI): Cập nhật hoặc Tạo Quotas cho người dùng ---
      // Lấy quota từ gói đăng ký mới
      const quotasToUpdate = [
        { feature: 'ai_lesson', daily_count: newPlan.daily_quota_ai_lesson },
        { feature: 'ai_translate', daily_count: newPlan.daily_quota_translate }
      ];

      // Dùng Promise.all để chạy các lệnh upsert song song
      await Promise.all(
        quotasToUpdate.map(quota => {
          // Chỉ cập nhật nếu gói có định nghĩa quota > 0 (hoặc theo logic của bạn)
          if (quota.daily_count !== null && quota.daily_count >= 0) {
            return usageModel.upsert({
              user_id: userId,
              feature: quota.feature,
              // Quan trọng: reset daily_count về 0 để người dùng có thể sử dụng ngay
              daily_count: 0, 
              // Cập nhật last_reset để logic kiểm tra hàng ngày có thể reset lại quota
              last_reset: new Date()
            }, client);
          }
          return Promise.resolve(); // Bỏ qua nếu không có quota
        })
      );
      
      // --- BƯỚC 6: Commit transaction ---
      await client.query('COMMIT');
      return createdSubscription;

    } catch (e) {
      await client.query('ROLLBACK');
      if (e.code === '23503') { 
          throw new Error('Không tìm thấy Người dùng hoặc Gói đăng ký.');
      }
      throw e;
    } finally {
      client.release();
    }
  },




    /**
   * Xử lý các hành động cập nhật
   */
  async updateSubscriptionDetails(userSubId, payload) {
        this._validateMainPayload(payload);

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const userSub = await userSubscriptionModel.findById1(userSubId, client);
            if (!userSub) {
                throw new Error(`Gói đăng ký của người dùng với ID ${userSubId} không tồn tại.`);
            }

            let updatedUserSub;

            switch (payload.action) {
                case 'change_expiry':
                    updatedUserSub = await this._applyExpiryDateChange(userSub, payload, client);
                    break;

                case 'toggle_renew':
                    updatedUserSub = await this._applyAutoRenewToggle(userSub, payload, client);
                    break;

                case 'cancel_now':
                    updatedUserSub = await this._performImmediateCancellation(userSub, client);
                    break;

                case 'change_plan':
                    updatedUserSub = await this._performPlanChange(userSub, payload, client);
                    break;

                default:
                    throw new ValidationError(`Hành động "${payload.action}" không được hỗ trợ.`);
            }

            await client.query('COMMIT');
            return updatedUserSub;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async _applyExpiryDateChange(userSub, payload, client) {
        this._validateChangeExpiryPayload(payload);
        if (!userSub.is_active) {
            throw new BusinessLogicError('Không thể thay đổi ngày hết hạn của một gói đã không còn hoạt động.');
        }
        return await userSubscriptionModel.update1(userSub.id, { expiry_date: new Date(payload.new_expiry_date) }, client);
    },

    async _applyAutoRenewToggle(userSub, payload, client) {
        this._validateToggleRenewPayload(payload);
        return await userSubscriptionModel.update1(userSub.id, { auto_renew: payload.auto_renew }, client);
    },

    async _performImmediateCancellation(userSub, client) {
        if (!userSub.is_active) throw new BusinessLogicError('Gói đăng ký này đã bị hủy trước đó.');
        if (userSub.subscription_id === FREE_PLAN_ID) throw new BusinessLogicError('Không thể hủy gói Miễn phí.');

        // 1. Hủy gói hiện tại
        await userSubscriptionModel.update1(userSub.id, {
            is_active: false,
            auto_renew: false,
            expiry_date: new Date(),
        }, client);

        // 2. Chuyển người dùng sang gói Miễn phí và trả về thông tin gói mới
        return await this._assignAndResetQuotasForPlan(userSub.user_id, FREE_PLAN_ID, client);
    },
    
    async _performPlanChange(userSub, payload, client) {
        this._validateChangePlanPayload(payload);

        if (payload.change_type === 'immediate') {
            const newPlan = await userSubscriptionModel.findSubscriptionById1(payload.new_subscription_id, client);
            if (!newPlan) throw new Error(`Gói đăng ký mới với ID ${payload.new_subscription_id} không tồn tại.`);

            // 1. Cập nhật bản ghi hiện tại để trỏ đến gói mới
            await userSubscriptionModel.update1(userSub.id, { subscription_id: payload.new_subscription_id }, client);
            
            // 2. Cập nhật lại quota theo gói mới
            await this._updateUserQuotasForPlan(userSub.user_id, newPlan, client);
            
            // 3. Trả về thông tin đầy đủ của gói đã cập nhật
            return await userSubscriptionModel.findById1(userSub.id, client);
        } else {
            throw new BusinessLogicError('Chức năng thay đổi gói vào cuối kỳ chưa được hỗ trợ.');
        }
    },
    
    // --- Các phương thức hỗ trợ chung ---

    /**
     * Gán một gói mới cho người dùng và cập nhật quota.
     * Tạo một bản ghi UserSubscription mới.
     * @returns {Promise<object>} Bản ghi UserSubscription mới đang hoạt động.
     */
    async _assignAndResetQuotasForPlan(userId, planId, client) {
        const plan = await userSubscriptionModel.findSubscriptionById1(planId, client);
        if (!plan) throw new Error(`Gói đăng ký với ID ${planId} không tồn tại.`);
        
        await userSubscriptionModel.create1({
            user_id: userId,
            subscription_id: planId,
            start_date: new Date(),
            expiry_date: null, // Gói free hoặc gói mới có thể không có ngày hết hạn ban đầu
            is_active: true,
            auto_renew: false,
        }, client);

        await this._updateUserQuotasForPlan(userId, plan, client);
        
        return await userSubscriptionModel.findActiveSubscriptionByUserId1(userId, client);
    },

    /**
     * Cập nhật (Upsert) hạn mức sử dụng (quotas) của người dùng dựa trên một gói.
     */
    async _updateUserQuotasForPlan(userId, plan, client) {
        const quotas = [
            { feature: 'ai_lesson', daily_count: plan.daily_quota_ai_lesson },
            { feature: 'ai_translate', daily_count: plan.daily_quota_translate }
        ];

        await Promise.all(
            quotas.map(q => usageModel.upsert({
                user_id: userId,
                feature: q.feature,
                daily_count: 0, // Reset counter để người dùng có thể sử dụng ngay
                last_reset: new Date()
            }, client))
        );
    },

    // --- Các phương thức Validation ---
    
    _validateMainPayload(payload) {
        if (!payload || !payload.action) {
            throw new ValidationError('Payload không hợp lệ, thiếu thông tin "action".');
        }
    },

    _validateChangeExpiryPayload(payload) {
        if (!payload.new_expiry_date || isNaN(new Date(payload.new_expiry_date))) {
            throw new ValidationError('Hành động "change_expiry" yêu cầu "new_expiry_date" hợp lệ.');
        }
    },

    _validateToggleRenewPayload(payload) {
         if (typeof payload.auto_renew !== 'boolean') {
            throw new ValidationError('Hành động "toggle_renew" yêu cầu "auto_renew" là true hoặc false.');
        }
    },

    _validateChangePlanPayload(payload) {
        if (!payload.new_subscription_id) throw new ValidationError('Hành động "change_plan" yêu cầu "new_subscription_id".');
        if (!['immediate', 'end_of_term'].includes(payload.change_type)) throw new ValidationError('change_type phải là "immediate" hoặc "end_of_term".');
    },






};

module.exports = userSubscriptionService;
