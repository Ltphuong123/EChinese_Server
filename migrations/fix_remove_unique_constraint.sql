-- Fix: Xóa UNIQUE constraint với tên chính xác
-- Tên index thực tế: Exams_exam_type_id_exam_level_id_name_idx

-- Xóa index UNIQUE
DROP INDEX IF EXISTS "Exams_exam_type_id_exam_level_id_name_idx";
DROP INDEX IF EXISTS "Exams_exam_type_id_exam_level_id_name_key";

-- Tạo index thông thường (không unique)
CREATE INDEX IF NOT EXISTS "idx_exams_type_level_name" 
ON "Exams" ("exam_type_id", "exam_level_id", "name");

-- Hiển thị kết quả
\echo '✅ Đã xóa UNIQUE constraint'
\echo '✅ Đã tạo index thông thường'
\echo ''
\echo 'Kiểm tra lại các index:'

SELECT 
    indexname,
    CASE 
        WHEN indexdef LIKE '%UNIQUE%' THEN '⚠️ UNIQUE'
        ELSE '✅ NORMAL'
    END as type,
    indexdef
FROM pg_indexes
WHERE tablename = 'Exams'
  AND (indexname LIKE '%exam_type%' OR indexname LIKE '%name%')
ORDER BY indexname;
