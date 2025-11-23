/**
 * Migration Script: Thêm 'user' vào constraint target_type của bảng Violations
 * 
 * Cách chạy:
 * node scripts/migrate_violations_target_type.js
 */

const db = require('../config/db');

async function migrate() {
  const client = await db.pool.connect();
  
  try {
    console.log('🚀 Bắt đầu migration...');
    
    await client.query('BEGIN');
    
    // Bước 1: Xóa constraint cũ
    console.log('📝 Bước 1: Xóa constraint cũ...');
    await client.query(`
      ALTER TABLE "Violations" DROP CONSTRAINT IF EXISTS "Violations_target_type_check";
    `);
    console.log('✅ Đã xóa constraint cũ');
    
    // Bước 2: Thêm constraint mới với 'user'
    console.log('📝 Bước 2: Thêm constraint mới...');
    await client.query(`
      ALTER TABLE "Violations" ADD CONSTRAINT "Violations_target_type_check" 
        CHECK ("target_type" IN ('post', 'comment', 'user'));
    `);
    console.log('✅ Đã thêm constraint mới với giá trị: post, comment, user');
    
    // Bước 3: Cho phép target_id có thể NULL
    console.log('📝 Bước 3: Cho phép target_id NULL...');
    await client.query(`
      ALTER TABLE "Violations" ALTER COLUMN "target_id" DROP NOT NULL;
    `);
    console.log('✅ Đã cho phép target_id có thể NULL');
    
    // Bước 4: Thêm comment
    console.log('📝 Bước 4: Thêm comment mô tả...');
    await client.query(`
      COMMENT ON COLUMN "Violations"."target_type" IS 'Loại đối tượng vi phạm: post (bài viết), comment (bình luận), user (tài khoản)';
    `);
    await client.query(`
      COMMENT ON COLUMN "Violations"."target_id" IS 'ID của đối tượng vi phạm. NULL nếu vi phạm là về tài khoản nói chung';
    `);
    console.log('✅ Đã thêm comment');
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Migration hoàn tất thành công!');
    console.log('✨ Bây giờ bạn có thể ban user và tạo violation với target_type = "user"');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Lỗi khi chạy migration:', error.message);
    console.error('Chi tiết:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

// Chạy migration
migrate();
