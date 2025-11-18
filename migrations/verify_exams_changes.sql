-- ============================================
-- Script kiểm tra migration đã chạy đúng chưa
-- ============================================

\echo '=========================================='
\echo 'KIỂM TRA MIGRATION EXAMS'
\echo '=========================================='
\echo ''

-- 1. Kiểm tra cột version_at đã được thêm chưa
\echo '1. Kiểm tra cột version_at:'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'Exams' 
  AND column_name = 'version_at';

\echo ''
\echo 'Kết quả mong đợi: Có 1 dòng với data_type = timestamp with time zone, is_nullable = YES'
\echo ''

-- 2. Kiểm tra UNIQUE constraint đã bị xóa chưa
\echo '2. Kiểm tra UNIQUE constraint (exam_type_id, exam_level_id, name):'
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'Exams'
  AND (indexname LIKE '%exam_type_id%' 
   OR indexname LIKE '%name%')
ORDER BY indexname;

\echo ''
\echo 'Kết quả mong đợi: KHÔNG có index với UNIQUE, chỉ có idx_exams_type_level_name (không UNIQUE)'
\echo ''

-- 3. Kiểm tra tất cả các index trên bảng Exams
\echo '3. Tất cả các index trên bảng Exams:'
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'Exams'
ORDER BY indexname;

\echo ''
\echo 'Kết quả mong đợi: Phải có idx_exams_type_level_name và idx_exams_version_at'
\echo ''

-- 4. Kiểm tra comment của cột version_at
\echo '4. Kiểm tra comment của cột version_at:'
SELECT 
    col_description('Exams'::regclass, ordinal_position) as column_comment
FROM information_schema.columns
WHERE table_name = 'Exams' 
  AND column_name = 'version_at';

\echo ''
\echo 'Kết quả mong đợi: Thời điểm tạo version này của bài thi. NULL cho bài thi gốc/version đầu tiên.'
\echo ''

-- 5. Kiểm tra cấu trúc đầy đủ của bảng Exams
\echo '5. Cấu trúc đầy đủ bảng Exams:'
\d "Exams"

\echo ''
\echo '=========================================='
\echo 'KẾT THÚC KIỂM TRA'
\echo '=========================================='
