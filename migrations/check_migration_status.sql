-- Kiểm tra nhanh migration status

-- ✅ CHECK 1: Cột version_at đã tồn tại chưa?
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'Exams' AND column_name = 'version_at'
        ) THEN '✅ CÓ cột version_at'
        ELSE '❌ CHƯA có cột version_at'
    END as check_version_at;

-- ✅ CHECK 2: UNIQUE constraint đã bị xóa chưa?
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'Exams' 
              AND indexdef LIKE '%UNIQUE%'
              AND indexdef LIKE '%exam_type_id%'
              AND indexdef LIKE '%exam_level_id%'
              AND indexdef LIKE '%name%'
        ) THEN '❌ VẪN CÒN UNIQUE constraint (chưa xóa)'
        ELSE '✅ ĐÃ XÓA UNIQUE constraint'
    END as check_unique_removed;

-- ✅ CHECK 3: Index thông thường đã được tạo chưa?
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'Exams' 
              AND indexname = 'idx_exams_type_level_name'
        ) THEN '✅ CÓ index idx_exams_type_level_name'
        ELSE '❌ CHƯA có index idx_exams_type_level_name'
    END as check_normal_index;

-- ✅ CHECK 4: Index cho version_at đã được tạo chưa?
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'Exams' 
              AND indexname = 'idx_exams_version_at'
        ) THEN '✅ CÓ index idx_exams_version_at'
        ELSE '❌ CHƯA có index idx_exams_version_at'
    END as check_version_at_index;

-- Tổng hợp: Liệt kê tất cả index hiện tại
SELECT 
    '📋 Danh sách index hiện tại:' as info;
    
SELECT 
    indexname,
    CASE 
        WHEN indexdef LIKE '%UNIQUE%' THEN 'UNIQUE'
        ELSE 'NORMAL'
    END as index_type
FROM pg_indexes
WHERE tablename = 'Exams'
ORDER BY indexname;
