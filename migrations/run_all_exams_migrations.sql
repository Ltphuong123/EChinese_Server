-- ============================================
-- MIGRATION HOÀN CHỈNH CHO BẢNG EXAMS
-- ============================================

\echo '=========================================='
\echo 'BẮT ĐẦU MIGRATION'
\echo '=========================================='
\echo ''

-- BƯỚC 1: Xóa UNIQUE constraint
\echo '1. Xóa UNIQUE constraint...'
DROP INDEX IF EXISTS "Exams_exam_type_id_exam_level_id_name_key";
DROP INDEX IF EXISTS "Exams_exam_type_id_exam_level_id_name_idx";
\echo '   ✅ Đã xóa UNIQUE constraint'
\echo ''

-- BƯỚC 2: Tạo index thông thường
\echo '2. Tạo index thông thường...'
CREATE INDEX IF NOT EXISTS "idx_exams_type_level_name" 
ON "Exams" ("exam_type_id", "exam_level_id", "name");
\echo '   ✅ Đã tạo index idx_exams_type_level_name'
\echo ''

-- BƯỚC 3: Thêm cột version_at
\echo '3. Thêm cột version_at...'
ALTER TABLE "Exams" ADD COLUMN IF NOT EXISTS "version_at" timestamptz;
\echo '   ✅ Đã thêm cột version_at'
\echo ''

-- BƯỚC 4: Thêm comment
\echo '4. Thêm comment cho cột version_at...'
COMMENT ON COLUMN "Exams"."version_at" IS 'Thời điểm tạo version này của bài thi. NULL cho bài thi gốc/version đầu tiên.';
\echo '   ✅ Đã thêm comment'
\echo ''

-- BƯỚC 5: Tạo index cho version_at
\echo '5. Tạo index cho version_at...'
CREATE INDEX IF NOT EXISTS "idx_exams_version_at" ON "Exams" ("version_at");
\echo '   ✅ Đã tạo index idx_exams_version_at'
\echo ''

\echo '=========================================='
\echo 'KIỂM TRA KẾT QUẢ'
\echo '=========================================='
\echo ''

-- Kiểm tra cột version_at
\echo 'Cột version_at:'
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'Exams' AND column_name = 'version_at';
\echo ''

-- Kiểm tra các index
\echo 'Các index trên bảng Exams:'
SELECT 
    indexname,
    CASE 
        WHEN indexdef LIKE '%UNIQUE%' THEN '⚠️ UNIQUE'
        ELSE '✅ NORMAL'
    END as type
FROM pg_indexes
WHERE tablename = 'Exams'
ORDER BY indexname;
\echo ''

\echo '=========================================='
\echo 'HOÀN THÀNH MIGRATION'
\echo '=========================================='
\echo ''
\echo 'Bây giờ bạn có thể tạo nhiều bài thi cùng tên!'

