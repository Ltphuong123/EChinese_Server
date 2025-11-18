// file: examples/testPushNotification.js
// Script để test push notification

require('dotenv').config();
const fcmService = require('../services/fcmService');
const notificationService = require('../services/notificationService');

/**
 * Test 1: Gửi push notification đến một user
 */
async function testSendToUser() {
  console.log('\n📱 Test 1: Gửi notification đến một user');
  
  const userId = 'your-user-uuid-here'; // Thay bằng user ID thật
  
  const result = await fcmService.sendToUser(userId, {
    title: 'Test Notification',
    body: 'Đây là test notification từ backend',
    data: {
      type: 'test',
      timestamp: Date.now().toString()
    }
  });
  
  console.log('Result:', result);
}

/**
 * Test 2: Tạo notification (tự động gửi push)
 */
async function testCreateNotification() {
  console.log('\n📝 Test 2: Tạo notification (auto push)');
  
  const notification = await notificationService.createNotification({
    recipient_id: 'your-user-uuid-here', // Thay bằng user ID thật
    audience: 'user',
    type: 'system',
    title: 'Thông báo hệ thống',
    content: { message: 'Đây là thông báo test từ hệ thống' },
    redirect_url: 'app://home',
    priority: 1
  });
  
  console.log('Notification created:', notification);
}

/**
 * Test 3: Broadcast đến tất cả users
 */
async function testBroadcast() {
  console.log('\n📢 Test 3: Broadcast đến tất cả users');
  
  const result = await fcmService.sendToAll({
    title: 'Thông báo quan trọng',
    body: 'Hệ thống sẽ bảo trì vào 2h sáng mai',
    data: {
      type: 'maintenance',
      scheduled_time: '2024-01-01T02:00:00Z'
    }
  });
  
  console.log('Broadcast result:', result);
}

/**
 * Test 4: Gửi đến nhiều users
 */
async function testSendToMultipleUsers() {
  console.log('\n👥 Test 4: Gửi đến nhiều users');
  
  const userIds = [
    'user-uuid-1',
    'user-uuid-2',
    'user-uuid-3'
  ];
  
  const result = await fcmService.sendToUsers(userIds, {
    title: 'Thông báo nhóm',
    body: 'Bạn có một thông báo mới từ nhóm',
    data: {
      type: 'group',
      group_id: 'group-123'
    }
  });
  
  console.log('Result:', result);
}

// Chạy tests
async function runTests() {
  console.log('🚀 Bắt đầu test push notification...\n');
  
  try {
    // Uncomment test nào muốn chạy
    
    // await testSendToUser();
    // await testCreateNotification();
    // await testBroadcast();
    // await testSendToMultipleUsers();
    
    console.log('\n✅ Tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
  
  process.exit(0);
}

// Chạy nếu file được execute trực tiếp
if (require.main === module) {
  runTests();
}

module.exports = {
  testSendToUser,
  testCreateNotification,
  testBroadcast,
  testSendToMultipleUsers
};
