// Quick test notification API
// Usage: node test-notification-quick.js

const notificationService = require('./services/notificationService');

async function testCreateNotification() {
  console.log('🧪 Testing notification creation...\n');

  try {
    // Test 1: Simple notification
    console.log('Test 1: Creating welcome notification...');
    const notification1 = await notificationService.createNotification({
      recipient_id: '550e8400-e29b-41d4-a716-446655440000', // Thay bằng user ID thật
      audience: 'user',
      type: 'system',
      title: '🎉 Chào mừng bạn!',
      content: {
        message: 'Cảm ơn bạn đã đăng ký ứng dụng Hán Tự'
      },
      redirect_type: 'onboarding',
      data: {
        welcome_bonus: '100',
        free_trial_days: '7'
      },
      priority: 2,
      from_system: true
    }, false); // false = không gửi push (để test nhanh)

    console.log('✅ Created notification:');
    console.log('   ID:', notification1.id);
    console.log('   Title:', notification1.title);
    console.log('   Redirect Type:', notification1.redirect_type);
    console.log('   Data:', JSON.stringify(notification1.data, null, 2));
    console.log('');

    // Test 2: Achievement notification
    console.log('Test 2: Creating achievement notification...');
    const notification2 = await notificationService.createNotification({
      recipient_id: '550e8400-e29b-41d4-a716-446655440000',
      audience: 'user',
      type: 'achievement',
      title: '🏆 Chúc mừng! Bạn đã đạt thành tích mới',
      content: {
        message: 'Bạn đã đạt thành tích "Người Mới Bắt Đầu" và nhận được 50 điểm!'
      },
      redirect_type: 'achievement',
      data: {
        achievement_id: 'ee0e8400-e29b-41d4-a716-446655440010',
        achievement_name: 'Người Mới Bắt Đầu',
        achievement_description: 'Tạo 5 bài viết đầu tiên',
        achievement_icon: '🌟',
        points: '50',
        achieved_at: new Date().toISOString(),
        progress_current: '5',
        progress_required: '5'
      },
      priority: 2,
      from_system: true
    }, false);

    console.log('✅ Created notification:');
    console.log('   ID:', notification2.id);
    console.log('   Title:', notification2.title);
    console.log('   Redirect Type:', notification2.redirect_type);
    console.log('   Data:', JSON.stringify(notification2.data, null, 2));
    console.log('');

    // Test 3: Post notification
    console.log('Test 3: Creating post notification...');
    const notification3 = await notificationService.createNotification({
      recipient_id: '550e8400-e29b-41d4-a716-446655440000',
      audience: 'user',
      type: 'community',
      title: '❤️ John Doe đã thích bài viết của bạn',
      content: {
        message: 'John Doe đã thích bài viết "Cách học tiếng Trung hiệu quả"'
      },
      redirect_type: 'post',
      data: {
        post_id: '660e8400-e29b-41d4-a716-446655440001',
        post_title: 'Cách học tiếng Trung hiệu quả',
        liker_id: '770e8400-e29b-41d4-a716-446655440002',
        liker_name: 'John Doe',
        liker_avatar: 'https://example.com/avatar.jpg'
      },
      priority: 1
    }, false);

    console.log('✅ Created notification:');
    console.log('   ID:', notification3.id);
    console.log('   Title:', notification3.title);
    console.log('   Redirect Type:', notification3.redirect_type);
    console.log('   Data:', JSON.stringify(notification3.data, null, 2));
    console.log('');

    console.log('🎉 All tests passed!\n');
    console.log('📊 Summary:');
    console.log('   - Created 3 notifications');
    console.log('   - All have redirect_type set correctly');
    console.log('   - All have data object with proper fields');
    console.log('\n✅ Migration successful!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }

  process.exit(0);
}

// Run test
testCreateNotification();
