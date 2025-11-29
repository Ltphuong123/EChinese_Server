/**
 * Script test API Default Notebooks
 * Chạy: node scripts/test-default-notebooks.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const ADMIN_TOKEN = 'YOUR_ADMIN_TOKEN_HERE'; // Thay bằng token admin thực
const USER_TOKEN = 'YOUR_USER_TOKEN_HERE';   // Thay bằng token user thực

// Màu sắc cho console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(50)}\n${msg}\n${'='.repeat(50)}${colors.reset}\n`),
};

// Helper function
async function makeRequest(method, endpoint, token, data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) config.data = data;
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message 
    };
  }
}

// Test functions
async function testUserCreateMine() {
  log.section('TEST 1: User tạo sổ tay cho chính mình');
  
  const result = await makeRequest('POST', '/default-notebooks/create-mine', USER_TOKEN);
  
  if (result.success) {
    log.success('Tạo sổ tay thành công!');
    console.log('Số lượng:', result.data.data.count);
    console.log('Danh sách:', result.data.data.notebooks.map(nb => nb.name).join(', '));
  } else {
    log.error('Lỗi: ' + (result.error.message || JSON.stringify(result.error)));
  }
}

async function testUserCheckMine() {
  log.section('TEST 2: User kiểm tra sổ tay của mình');
  
  const result = await makeRequest('GET', '/default-notebooks/check-mine', USER_TOKEN);
  
  if (result.success) {
    log.success('Kiểm tra thành công!');
    const data = result.data.data;
    console.log('Đã có sổ tay:', data.hasDefaultNotebooks ? 'Có' : 'Không');
    console.log('Số lượng:', data.count);
    console.log('Hoàn chỉnh:', data.isComplete ? 'Có' : 'Không');
    
    if (data.notebooks.length > 0) {
      console.log('\nChi tiết:');
      data.notebooks.forEach(nb => {
        console.log(`  - ${nb.name}: ${nb.vocab_count} từ`);
      });
    }
  } else {
    log.error('Lỗi: ' + (result.error.message || JSON.stringify(result.error)));
  }
}

async function testAdminCreateForUser(userId) {
  log.section('TEST 3: Admin tạo sổ tay cho user cụ thể');
  
  if (!userId) {
    log.warning('Bỏ qua test này (cần userId)');
    return;
  }
  
  const result = await makeRequest('POST', `/admin/default-notebooks/user/${userId}`, ADMIN_TOKEN);
  
  if (result.success) {
    log.success('Tạo sổ tay thành công!');
    console.log('User:', result.data.data.username);
    console.log('Số lượng:', result.data.data.count);
  } else {
    log.error('Lỗi: ' + (result.error.message || JSON.stringify(result.error)));
  }
}

async function testAdminCheckUser(userId) {
  log.section('TEST 4: Admin kiểm tra sổ tay của user');
  
  if (!userId) {
    log.warning('Bỏ qua test này (cần userId)');
    return;
  }
  
  const result = await makeRequest('GET', `/admin/default-notebooks/user/${userId}/check`, ADMIN_TOKEN);
  
  if (result.success) {
    log.success('Kiểm tra thành công!');
    const data = result.data.data;
    console.log('User:', data.username);
    console.log('Đã có sổ tay:', data.hasDefaultNotebooks ? 'Có' : 'Không');
    console.log('Số lượng:', data.count);
    console.log('Hoàn chỉnh:', data.isComplete ? 'Có' : 'Không');
  } else {
    log.error('Lỗi: ' + (result.error.message || JSON.stringify(result.error)));
  }
}

async function testAdminStatistics() {
  log.section('TEST 5: Admin xem thống kê');
  
  const result = await makeRequest('GET', '/admin/default-notebooks/statistics', ADMIN_TOKEN);
  
  if (result.success) {
    log.success('Lấy thống kê thành công!');
    const stats = result.data.data;
    console.log('\n📊 Thống kê tổng quan:');
    console.log(`  Tổng số user: ${stats.totalUsers}`);
    console.log(`  Có đủ sổ tay: ${stats.usersWithNotebooks}`);
    console.log(`  Chưa có sổ tay: ${stats.usersWithoutNotebooks}`);
    console.log(`  Thiếu sổ tay: ${stats.usersWithIncompleteNotebooks}`);
    
    if (stats.details.length > 0) {
      console.log('\n📋 Chi tiết (5 user đầu):');
      stats.details.slice(0, 5).forEach(user => {
        const statusIcon = user.status === 'complete' ? '✅' : user.status === 'none' ? '❌' : '⚠️';
        console.log(`  ${statusIcon} ${user.username}: ${user.notebookCount}/4 sổ tay`);
      });
    }
  } else {
    log.error('Lỗi: ' + (result.error.message || JSON.stringify(result.error)));
  }
}

async function testAdminCreateAll() {
  log.section('TEST 6: Admin tạo sổ tay cho tất cả user');
  log.warning('Test này sẽ tạo sổ tay cho TẤT CẢ user trong hệ thống!');
  log.info('Bỏ comment dòng return bên dưới để chạy test này');
  return; // Comment dòng này để chạy test
  
  const result = await makeRequest('POST', '/admin/default-notebooks/create-all', ADMIN_TOKEN);
  
  if (result.success) {
    log.success('Hoàn thành!');
    const data = result.data.data;
    console.log(`\n📊 Kết quả:`);
    console.log(`  Tổng số user: ${data.total}`);
    console.log(`  Thành công: ${data.success.length}`);
    console.log(`  Bỏ qua: ${data.skipped.length}`);
    console.log(`  Thất bại: ${data.failed.length}`);
    
    if (data.success.length > 0) {
      console.log('\n✅ Thành công (5 user đầu):');
      data.success.slice(0, 5).forEach(item => {
        console.log(`  - ${item.username}: ${item.count} sổ tay`);
      });
    }
    
    if (data.skipped.length > 0) {
      console.log('\n⏭️  Bỏ qua (5 user đầu):');
      data.skipped.slice(0, 5).forEach(item => {
        console.log(`  - ${item.username}: ${item.reason}`);
      });
    }
    
    if (data.failed.length > 0) {
      console.log('\n❌ Thất bại:');
      data.failed.forEach(item => {
        console.log(`  - ${item.username}: ${item.error}`);
      });
    }
  } else {
    log.error('Lỗi: ' + (result.error.message || JSON.stringify(result.error)));
  }
}

async function testAdminRecreate(userId) {
  log.section('TEST 7: Admin tạo lại sổ tay cho user');
  
  if (!userId) {
    log.warning('Bỏ qua test này (cần userId)');
    return;
  }
  
  const result = await makeRequest('POST', `/admin/default-notebooks/user/${userId}/recreate`, ADMIN_TOKEN);
  
  if (result.success) {
    log.success('Tạo lại sổ tay thành công!');
    const data = result.data.data;
    console.log('User:', data.username);
    console.log('Đã xóa:', data.deletedCount, 'sổ tay cũ');
    console.log('Đã tạo:', data.count, 'sổ tay mới');
  } else {
    log.error('Lỗi: ' + (result.error.message || JSON.stringify(result.error)));
  }
}

// Main test runner
async function runAllTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         TEST API DEFAULT NOTEBOOKS                        ║
╚═══════════════════════════════════════════════════════════╝
  `);
  
  // Kiểm tra token
  if (USER_TOKEN === 'YOUR_USER_TOKEN_HERE') {
    log.error('Vui lòng cập nhật USER_TOKEN trong file này!');
    return;
  }
  
  if (ADMIN_TOKEN === 'YOUR_ADMIN_TOKEN_HERE') {
    log.error('Vui lòng cập nhật ADMIN_TOKEN trong file này!');
    return;
  }
  
  // Chạy các test
  await testUserCheckMine();
  await testUserCreateMine();
  await testUserCheckMine(); // Kiểm tra lại sau khi tạo
  
  await testAdminStatistics();
  
  // Test với user cụ thể (thay userId nếu cần)
  const testUserId = null; // Thay bằng UUID thực nếu muốn test
  await testAdminCheckUser(testUserId);
  await testAdminCreateForUser(testUserId);
  await testAdminRecreate(testUserId);
  
  // Test tạo hàng loạt (cẩn thận!)
  await testAdminCreateAll();
  
  log.section('HOÀN THÀNH TẤT CẢ TEST');
}

// Chạy tests
runAllTests().catch(error => {
  log.error('Lỗi không mong đợi: ' + error.message);
  console.error(error);
});
