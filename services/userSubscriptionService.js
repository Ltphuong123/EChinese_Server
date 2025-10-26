// file: services/userSubscriptionService.js

const userSubscriptionModel = require('../models/userSubscriptionModel');
const db = require('../config/db');

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
    const { users, totalItems } = await userSubscriptionModel.findAllUsersPaginated(options);
    if (users.length === 0) {
      return { data: [], meta: { total: 0, page: options.page, limit: options.limit, totalPages: 0 } };
    }

    const userIds = users.map(u => u.id);

    // Lấy dữ liệu liên quan song song
    const [activeSubs, usages] = await Promise.all([
      userSubscriptionModel.findActiveSubscriptionsForUsers(userIds),
      userSubscriptionModel.findUsagesForUsers(userIds)
    ]);
    
    // Tạo map để tra cứu nhanh
    const subsMap = new Map(activeSubs.map(s => [s.user_id, s]));
    const usageMap = new Map();
    usages.forEach(u => {
      if (!usageMap.has(u.user_id)) usageMap.set(u.user_id, {});
      usageMap.get(u.user_id)[u.feature] = u;
    });

    // Lắp ráp dữ liệu trả về
    const enrichedData = users.map(user => {
      const userSubscription = subsMap.get(user.id) || null;
      const userUsage = usageMap.get(user.id) || {};

      return {
        user,
        userSubscription,
        subscription: userSubscription ? { id: userSubscription.subscription_id, name: userSubscription.subscription_name } : null,
        quotas: {
          ai_lesson: userUsage.ai_lesson || null,
          ai_translate: userUsage.ai_translate || null,
        }
      };
    });

    const totalPages = Math.ceil(totalItems / options.limit);
    return {
      data: enrichedData,
      meta: { total: totalItems, page: options.page, limit: options.limit, totalPages }
    };
  },

  /**
   * Xử lý các hành động cập nhật
   */
  update: async (userSubId, payload) => {
    const existingSub = await userSubscriptionModel.findById(userSubId);
    if (!existingSub) {
      throw new Error('UserSubscription record not found');
    }

    switch (payload.action) {
      case 'change_expiry':
        if (!payload.new_expiry_date) throw new Error('new_expiry_date is required.');
        return await userSubscriptionModel.update(userSubId, { expiry_date: payload.new_expiry_date });
      
      case 'toggle_renew':
        if (typeof payload.auto_renew !== 'boolean') throw new Error('auto_renew boolean is required.');
        return await userSubscriptionModel.update(userSubId, { auto_renew: payload.auto_renew });
      
      case 'cancel_now':
        return await userSubscriptionModel.update(userSubId, { is_active: false, expiry_date: new Date() });
      
      case 'change_plan':
        if (!payload.new_subscription_id || !payload.change_type) {
            throw new Error('new_subscription_id and change_type are required.');
        }
        return await handleChangePlan(existingSub, payload);

      default:
        throw new Error('Invalid action specified.');
    }
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

      // 1. Lấy thông tin gói mới và kiểm tra xem nó có tồn tại không
      const newPlan = await userSubscriptionModel.findSubscriptionById(subscriptionId);
      if (!newPlan) {
        throw new Error('Subscription plan not found.');
      }
      
      // (Optional but good) Kiểm tra user có tồn tại không
      // const user = await userModel.findUserById(userId);
      // if (!user) throw new Error('User not found.');

      // 2. Tìm và hủy kích hoạt gói đang active của người dùng (nếu có)
      const currentActiveSub = await userSubscriptionModel.findActiveSubscriptionByUserId(userId, client);
      if (currentActiveSub) {
        await userSubscriptionModel.update(currentActiveSub.id, { is_active: false }, client);
      }

      // 3. Chuẩn bị dữ liệu cho bản ghi mới
      const startDate = overrides.startDate ? new Date(overrides.startDate) : new Date();
      
      let expiryDate = overrides.expiryDate ? new Date(overrides.expiryDate) : null;

      // Nếu admin không ghi đè ngày hết hạn, hãy tính toán nó
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
        auto_renew: overrides.autoRenew || false, // Mặc định là false
        last_payment_id: overrides.paymentId || null,
      };

      // 4. Tạo bản ghi UserSubscription mới
      const createdSubscription = await userSubscriptionModel.create(newSubData, client);

      await client.query('COMMIT');
      return createdSubscription;

    } catch (e) {
      await client.query('ROLLBACK');
      // Thêm thông tin chi tiết vào lỗi nếu là lỗi foreign key
      if (e.code === '23503') { // foreign_key_violation
          throw new Error('User or Subscription plan not found.');
      }
      throw e;
    } finally {
      client.release();
    }
  },


};

module.exports = userSubscriptionService;
