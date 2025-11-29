/**
 * Test Script cho Notebook Copy API
 * 
 * Cách sử dụng:
 * 1. Cập nhật USER_TOKEN và ADMIN_TOKEN
 * 2. Cập nhật SYSTEM_NOTEBOOK_ID
 * 3. Chạy: node scripts/test-notebook-copy.js
 */

const axios = require('axios');

// ============================================
// CẤU HÌNH
// ============================================

const BASE_URL = 'http://localhost:3000/api';

// TODO: Thay bằng token thật từ login
const USER_TOKEN = 'your-user-jwt-token-here';
const ADMIN_TOKEN = 'your-admin-jwt-token-here';

// TODO: Thay bằng ID của sổ tay hệ thống thật
const SYSTEM_NOTEBOOK_ID = '123e4567-e89b-12d3-a456-426614174000';

// ============================================
// HELPER FUNCTIONS
// ============================================

const makeRequest = async (method, url, token, data = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status,
      data: error.response?.data
    };
  }
};

const log = (title, data) => {
  console.log('\n' + '='.repeat(60));
  console.log(`📋 ${title}`);
  console.log('='.repeat(60));
  console.log(JSON.stringify(data, null, 2));
};

// ============================================
// TEST CASES
// ============================================

const runTests = async () => {
  console.log('🚀 Bắt đầu test Notebook Copy API...\n');

  // Test 1: Lần đầu tiên - Tạo bản sao mới (expect: 201)
  log('TEST 1: Lần đầu tiên - Get or Create (expect: 201 Created)', {
    endpoint: `GET /notebooks/template/${SYSTEM_NOTEBOOK_ID}/copy`
  });
  
  const firstCallResult = await makeRequest(
    'GET',
    `/notebooks/template/${SYSTEM_NOTEBOOK_ID}/copy`,
    USER_TOKEN
  );
  
  log('Kết quả', firstCallResult);

  if (!firstCallResult.success) {
    console.log('❌ Test 1 thất bại. Dừng test.');
    console.log('   Lỗi:', firstCallResult.data?.message);
    return;
  }

  if (firstCallResult.status === 201 && firstCallResult.data.data.isNew === true) {
    console.log('✅ Test 1 thành công - Tạo bản sao mới (201 Created)');
  } else if (firstCallResult.status === 200 && firstCallResult.data.data.isNew === false) {
    console.log('⚠️  Test 1 - Bản sao đã tồn tại từ trước (200 OK)');
  } else {
    console.log('❌ Test 1 thất bại - Response không đúng format');
  }

  const copiedNotebookId = firstCallResult.data.data.notebook.id;

  // Test 2: Lần thứ 2 - Trả về bản sao hiện có (expect: 200)
  log('TEST 2: Lần thứ 2 - Get or Create (expect: 200 OK)', {
    endpoint: `GET /notebooks/template/${SYSTEM_NOTEBOOK_ID}/copy`
  });

  const secondCallResult = await makeRequest(
    'GET',
    `/notebooks/template/${SYSTEM_NOTEBOOK_ID}/copy`,
    USER_TOKEN
  );

  log('Kết quả', secondCallResult);

  if (secondCallResult.success && 
      secondCallResult.status === 200 && 
      secondCallResult.data.data.isNew === false) {
    console.log('✅ Test 2 thành công - Trả về bản sao hiện có (200 OK)');
    console.log(`   Notebook ID giống nhau: ${secondCallResult.data.data.notebook.id === copiedNotebookId}`);
  } else {
    console.log('❌ Test 2 thất bại - Không trả về bản sao hiện có');
  }

  // Test 3: Kiểm tra có thể copy (optional check)
  log('TEST 3: Kiểm tra có thể copy', {
    endpoint: `GET /notebooks/${SYSTEM_NOTEBOOK_ID}/can-copy`
  });

  const canCopyResult = await makeRequest(
    'GET',
    `/notebooks/${SYSTEM_NOTEBOOK_ID}/can-copy`,
    USER_TOKEN
  );

  log('Kết quả', canCopyResult);

  if (canCopyResult.success) {
    if (canCopyResult.data.data.canCopy === false && 
        canCopyResult.data.data.reason?.includes('đã sao chép')) {
      console.log('✅ Test 3 thành công - Phát hiện đã có bản sao');
    } else {
      console.log('⚠️  Test 3 - Kết quả:', canCopyResult.data.data);
    }
  } else {
    console.log('❌ Test 3 thất bại');
  }

  // Test 5: Admin xem thống kê (nếu có admin token)
  if (ADMIN_TOKEN !== 'your-admin-jwt-token-here') {
    log('TEST 5: Admin xem thống kê template', {
      endpoint: `GET /admin/notebooks/template/${SYSTEM_NOTEBOOK_ID}/stats`
    });

    const statsResult = await makeRequest(
      'GET',
      `/admin/notebooks/template/${SYSTEM_NOTEBOOK_ID}/stats`,
      ADMIN_TOKEN
    );

    log('Kết quả', statsResult);

    if (statsResult.success) {
      console.log('✅ Test 5 thành công - Lấy thống kê thành công');
    } else {
      console.log('❌ Test 5 thất bại');
    }
  } else {
    console.log('⏭️  Bỏ qua Test 5 - Không có admin token');
  }

  // Test 4: Verify sổ tay đã copy có đầy đủ từ vựng
  log('TEST 4: Verify từ vựng trong sổ tay đã copy', {
    endpoint: `GET /notebooks/${copiedNotebookId}/vocab`
  });

  const vocabResult = await makeRequest(
    'GET',
    `/notebooks/${copiedNotebookId}/vocab?page=1&limit=10`,
    USER_TOKEN
  );

  log('Kết quả', vocabResult);

  if (vocabResult.success && vocabResult.data.data.data.length > 0) {
    console.log('✅ Test 4 thành công - Sổ tay có từ vựng');
    console.log(`   Tổng số từ: ${vocabResult.data.data.meta.total}`);
  } else {
    console.log('❌ Test 4 thất bại - Sổ tay không có từ vựng');
  }

  // Tổng kết
  console.log('\n' + '='.repeat(60));
  console.log('🎉 HOÀN THÀNH TẤT CẢ TEST');
  console.log('='.repeat(60));
  console.log(`
📊 Tóm tắt:
- Sổ tay gốc: ${SYSTEM_NOTEBOOK_ID}
- Sổ tay đã copy: ${copiedNotebookId}
- Số từ vựng: ${vocabResult.data?.data?.meta?.total || 'N/A'}
  `);
};

// ============================================
// CHẠY TEST
// ============================================

if (USER_TOKEN === 'your-user-jwt-token-here') {
  console.log('❌ Lỗi: Vui lòng cập nhật USER_TOKEN trong file này');
  console.log('   Lấy token bằng cách đăng nhập và copy từ response');
  process.exit(1);
}

if (SYSTEM_NOTEBOOK_ID === '123e4567-e89b-12d3-a456-426614174000') {
  console.log('⚠️  Cảnh báo: Bạn đang dùng SYSTEM_NOTEBOOK_ID mẫu');
  console.log('   Vui lòng thay bằng ID thật từ database');
}

runTests().catch(error => {
  console.error('❌ Lỗi khi chạy test:', error.message);
  process.exit(1);
});
