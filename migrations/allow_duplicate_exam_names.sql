-- Xóa UNIQUE constraint để cho phép các bài thi cùng tên
-- Thử xóa cả 2 tên có thể có
DROP INDEX IF EXISTS "Exams_exam_type_id_exam_level_id_name_key";
DROP INDEX IF EXISTS "Exams_exam_type_id_exam_level_id_name_idx";

-- Tạo index thông thường để tối ưu query
CREATE INDEX IF NOT EXISTS "idx_exams_type_level_name" 
ON "Exams" ("exam_type_id", "exam_level_id", "name");


ALTER TABLE "Exams" ADD COLUMN "version_at" timestamptz;
COMMENT ON COLUMN "Exams"."version_at" IS 'Thời điểm tạo version này của bài thi. NULL cho bài thi gốc/version đầu tiên.';
CREATE INDEX IF NOT EXISTS "idx_exams_version_at" ON "Exams" ("version_at");