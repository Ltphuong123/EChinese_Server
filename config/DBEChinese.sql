-- Kích hoạt extension để sử dụng hàm uuid_generate_v4()
-- dbechinese
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bảng lưu trữ các cấp độ huy hiệu
CREATE TABLE "BadgeLevels" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "level" int UNIQUE NOT NULL,
  "name" varchar(50) NOT NULL,
  "icon" text,
  "min_points" int DEFAULT 0,
  "rule_description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz DEFAULT (CURRENT_TIMESTAMP)
);

COMMENT ON COLUMN "BadgeLevels"."min_points" IS 'Điểm cộng đồng tối thiểu để đạt cấp độ này';
COMMENT ON COLUMN "BadgeLevels"."rule_description" IS 'Mô tả quy tắc hoặc điều kiện đạt được cấp độ huy hiệu';
COMMENT ON TABLE "BadgeLevels" IS 'Quản lý danh sách các cấp độ huy hiệu (Badge Levels). Cho phép admin cấu hình điều kiện và điểm yêu cầu cho từng cấp. is_active giúp ẩn/hiện huy hiệu khi cần. Không nên hard-code cấp độ trong code, mà đọc từ bảng này để linh hoạt chỉnh sửa.';


-- Bảng người dùng
CREATE TABLE "Users" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "username" varchar(50) UNIQUE,
  "password_hash" varchar(255),
  "name" varchar(50) NOT NULL,
  "avatar_url" text,
  "email" varchar(255) UNIQUE,
  "provider" varchar(20) CHECK ("provider" IN ('google', 'apple', 'local')),
  "provider_id" varchar(255),
  "role" varchar(10) DEFAULT 'user' CHECK ("role" IN ('user', 'admin', 'super admin')),
  "is_active" boolean DEFAULT true,
  "isVerify" boolean DEFAULT false,
  "community_points" int DEFAULT 0,
  "level" varchar(3) NOT NULL CHECK ("level" IN ('1', '2', '3', '4', '5', '6', '7-9')),
  "badge_level" int NOT NULL DEFAULT 0,
  "language" varchar(10) NOT NULL CHECK ("language" IN ('Tiếng Việt', 'Tiếng Anh')),
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "last_login" timestamptz
);

COMMENT ON TABLE "Users" IS 'Trung tâm hồ sơ người dùng, hỗ trợ đăng nhập local và OAuth (Google/Apple). password_hash chỉ dùng cho đăng nhập local, provider/provider_id cho OAuth. community_points tích lũy từ hoạt động cộng đồng, cập nhật trực tiếp để tối ưu query. isVerify xác thực email, tăng bảo mật. Không lưu gói đăng ký trực tiếp tại đây để tránh phình bảng — dùng bảng UserSubscriptions riêng.';

CREATE UNIQUE INDEX ON "Users" ("username");
CREATE UNIQUE INDEX ON "Users" ("email");
CREATE INDEX ON "Users" ("provider", "provider_id");
CREATE INDEX ON "Users" ("created_at");
CREATE INDEX ON "Users" ("role");
CREATE INDEX ON "Users" ("community_points");

-- Bảng phiên đăng nhập của người dùng
CREATE TABLE "UserSessions" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "user_id" uuid NOT NULL,
  "login_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "logout_at" timestamptz,
  "device" varchar(50),
  "ip_address" varchar(50)
);

COMMENT ON TABLE "UserSessions" IS 'Lưu lại chi tiết từng phiên login/logout. Dùng để tính toán thời gian online chi tiết hoặc phát hiện đăng nhập bất thường.';
CREATE INDEX ON "UserSessions" ("user_id");
CREATE INDEX ON "UserSessions" ("login_at");

-- Bảng hoạt động hàng ngày của người dùng
CREATE TABLE "UserDailyActivity" (
  "user_id" uuid NOT NULL,
  "date" date NOT NULL,
  "minutes_online" int DEFAULT 0,
  "login_count" int DEFAULT 0,
  PRIMARY KEY ("user_id", "date")
);

COMMENT ON TABLE "UserDailyActivity" IS 'Tóm tắt hoạt động theo ngày (minutes online, số lần login). Hỗ trợ thống kê theo tuần/tháng dễ dàng.';
CREATE INDEX ON "UserDailyActivity" ("user_id");
CREATE INDEX ON "UserDailyActivity" ("date");


-- Bảng chuỗi đăng nhập
CREATE TABLE "UserStreaks" (
  "user_id" uuid PRIMARY KEY,
  "current_streak" int DEFAULT 0,
  "longest_streak" int DEFAULT 0,
  "last_login_date" date
);

COMMENT ON TABLE "UserStreaks" IS 'Quản lý chuỗi ngày đăng nhập liên tục (gamification). current_streak reset nếu người dùng bỏ lỡ 1 ngày. longest_streak lưu kỷ lục cao nhất để hiển thị thành tựu.';

-- Bảng thành tích
CREATE TABLE "Achievements" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "name" varchar(100) NOT NULL UNIQUE,
  "description" text NOT NULL,
  "criteria" jsonb NOT NULL,
  "icon" text,
  "points" int DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz DEFAULT (CURRENT_TIMESTAMP)
);

COMMENT ON COLUMN "Achievements"."name" IS 'Tên thành tích, ví dụ: ''Gấu chăm chỉ'', ''Thánh tra cứu''';
COMMENT ON COLUMN "Achievements"."description" IS 'Mô tả thành tích, ví dụ: ''Đăng nhập liên tục 7 ngày''';
COMMENT ON COLUMN "Achievements"."criteria" IS 'Tiêu chí đạt được dưới dạng JSON để linh hoạt, ví dụ: {''type'': ''login_streak'', ''min_streak'': 7} hoặc {''type'': ''translation_usage'', ''min_count'': 30, ''feature'': ''ai_translate''}';
COMMENT ON COLUMN "Achievements"."points" IS 'Điểm thưởng cộng vào community_points khi đạt được';
COMMENT ON TABLE "Achievements" IS 'Quản lý các thành tích (achievements) do admin tạo/sửa. criteria JSONB cho phép định nghĩa linh hoạt các điều kiện. Cron job hoặc trigger kiểm tra criteria và cấp thành tích qua UserAchievements.';
CREATE UNIQUE INDEX ON "Achievements" ("name");
CREATE INDEX ON "Achievements" ("is_active");

-- Bảng thành tích người dùng đạt được
CREATE TABLE "UserAchievements" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "user_id" uuid NOT NULL,
  "achievement_id" uuid NOT NULL,
  "achieved_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "progress" jsonb
);

COMMENT ON COLUMN "UserAchievements"."progress" IS 'Tiến độ hiện tại nếu cần (ví dụ: {''current_count'': 25, ''required'': 30}), NULL nếu không theo dõi progress';
COMMENT ON TABLE "UserAchievements" IS 'Liên kết N:N giữa Users và Achievements, lưu thời gian đạt được. Unique constraint (user_id, achievement_id) để tránh cấp trùng lặp.';
CREATE UNIQUE INDEX ON "UserAchievements" ("user_id", "achievement_id");
CREATE INDEX ON "UserAchievements" ("user_id");
CREATE INDEX ON "UserAchievements" ("achievement_id");
CREATE INDEX ON "UserAchievements" ("achieved_at");

-- Bảng các gói đăng ký
CREATE TABLE "Subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "name" varchar(100) UNIQUE NOT NULL,
  "description" json,
  "daily_quota_ai_lesson" int DEFAULT 0,
  "daily_quota_translate" int DEFAULT 0,
  "price" decimal(10,2) DEFAULT 0,
  "duration_months" int,
  "is_active" boolean DEFAULT true,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz DEFAULT (CURRENT_TIMESTAMP)
);

COMMENT ON COLUMN "Subscriptions"."duration_months" IS 'NULL cho gói vĩnh viễn, >0 cho gói giới hạn thời gian';
COMMENT ON TABLE "Subscriptions" IS 'Admin có thể tạo/sửa/xóa gói. Quota cho AI được reset hàng ngày. price là giá niêm yết. is_active dùng để ẩn/hiện gói.';
CREATE UNIQUE INDEX ON "Subscriptions" ("name");
CREATE INDEX ON "Subscriptions" ("is_active");


-- Bảng các giao dịch thanh toán
CREATE TABLE "Payments" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "user_id" uuid NOT NULL,
  "subscription_id" uuid NOT NULL,
  "amount" decimal(10,2) NOT NULL,
  "currency" varchar(3) DEFAULT 'VND',
  "status" varchar(20) DEFAULT 'pending' CHECK ("status" IN ('pending', 'successful', 'failed', 'refunded', 'manual_confirmed')),
  "payment_method" varchar(50) NOT NULL CHECK ("payment_method" IN ('visa/mastercard', 'bank_transfer', 'momo', 'zalopay', 'vnpay')),
  "payment_channel" varchar(20) DEFAULT 'auto' CHECK ("payment_channel" IN ('auto', 'manual')),
  "gateway_transaction_id" varchar(255) UNIQUE NOT NULL,
  "manual_proof_url" text,
  "transaction_date" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "gateway_response" json,
  "processed_by_admin" uuid,
  "notes" text
);

COMMENT ON TABLE "Payments" IS 'Lưu toàn bộ giao dịch thanh toán gói đăng ký. payment_channel: ''auto'' (qua cổng) hoặc ''manual'' (chuyển khoản thủ công). gateway_transaction_id là mã từ cổng thanh toán. processed_by_admin dùng cho xác nhận thủ công hoặc hoàn tiền.';
CREATE INDEX ON "Payments" ("user_id");
CREATE INDEX ON "Payments" ("status");
CREATE INDEX ON "Payments" ("transaction_date");
CREATE INDEX ON "Payments" ("payment_method");
CREATE INDEX ON "Payments" ("payment_channel");


-- Bảng gói đăng ký của người dùng
CREATE TABLE "UserSubscriptions" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "user_id" uuid NOT NULL,
  "subscription_id" uuid NOT NULL,
  "start_date" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "expiry_date" timestamptz,
  "is_active" boolean DEFAULT true,
  "auto_renew" boolean DEFAULT false,
  "last_payment_id" uuid,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz DEFAULT (CURRENT_TIMESTAMP)
);

COMMENT ON COLUMN "UserSubscriptions"."expiry_date" IS 'NULL cho gói vĩnh viễn hoặc gói free';
COMMENT ON TABLE "UserSubscriptions" IS 'Ghi nhận gói hiện tại của người dùng. Khi người dùng nâng cấp, tạo bản ghi mới, bản cũ is_active = false.';
CREATE INDEX ON "UserSubscriptions" ("user_id", "is_active");
CREATE INDEX ON "UserSubscriptions" ("expiry_date");

-- Bảng hoàn tiền
CREATE TABLE "Refunds" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "payment_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "processed_by_admin" uuid,
  "refund_amount" decimal(10,2) NOT NULL,
  "refund_method" varchar(50) CHECK ("refund_method" IN ('gateway', 'manual_transfer')),
  "reason" text,
  "status" varchar(20) DEFAULT 'pending' CHECK ("status" IN ('pending', 'completed', 'rejected')),
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "processed_at" timestamptz
);

COMMENT ON TABLE "Refunds" IS 'Quản lý lịch sử hoàn tiền riêng biệt để dễ kiểm toán. Admin xác nhận thì cập nhật status và processed_at.';
CREATE INDEX ON "Refunds" ("user_id");
CREATE INDEX ON "Refunds" ("payment_id");
CREATE INDEX ON "Refunds" ("status");
CREATE INDEX ON "Refunds" ("created_at");

-- Bảng bài viết cộng đồng
CREATE TABLE "Posts" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "user_id" uuid NOT NULL,
  "title" varchar(100) NOT NULL,
  "content" json NOT NULL,
  "topic" varchar(50) NOT NULL CHECK ("topic" IN ('Cơ khí', 'CNTT', 'Dịch', 'Du học', 'Du lịch', 'Góc chia sẻ', 'Tìm bạn học chung', 'Học tiếng Trung', 'Tìm gia sư', 'Việc làm', 'Văn hóa', 'Thể thao', 'Xây dựng', 'Y tế', 'Tâm sự', 'Khác')),
  "likes" int DEFAULT 0,
  "views" int DEFAULT 0,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "status" varchar(20) DEFAULT 'published' CHECK ("status" IN ('draft', 'published', 'hidden', 'removed', 'archived')),
  "is_approved" boolean DEFAULT true,
  "auto_flagged" boolean DEFAULT false,
  "is_pinned" boolean DEFAULT false,
  "deleted_at" timestamptz,
  "deleted_reason" text,
  "deleted_by" uuid
);

COMMENT ON TABLE "Posts" IS 'Khi user tự gỡ bài: status=''removed'', deleted_by=user_id, is_approved=false. Khi admin gỡ: status=''removed'', deleted_by=admin_id, is_approved=false, tạo Violation. Khi AI nghi ngờ: auto_flagged=true, status=''removed''. Bài bị removed sẽ bị xóa cứng sau 7 ngày nếu không được khôi phục.';
CREATE INDEX ON "Posts" ("user_id");
CREATE INDEX ON "Posts" ("topic");
CREATE INDEX ON "Posts" ("created_at");
CREATE INDEX ON "Posts" ("status");
CREATE INDEX ON "Posts" ("auto_flagged");
CREATE INDEX ON "Posts" ("is_pinned");

-- Bảng lượt thích bài viết
CREATE TABLE "PostLikes" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "post_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP)
);

COMMENT ON TABLE "PostLikes" IS 'Quản lý ai đã like bài viết. Dùng để query các bài viết user đã like.';
CREATE UNIQUE INDEX ON "PostLikes" ("post_id", "user_id");
CREATE INDEX ON "PostLikes" ("post_id");
CREATE INDEX ON "PostLikes" ("user_id");


-- Bảng lượt xem bài viết
CREATE TABLE "PostViews" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "post_id" uuid NOT NULL,
  "user_id" uuid,
  "viewed_at" timestamptz DEFAULT (CURRENT_TIMESTAMP)
);

COMMENT ON COLUMN "PostViews"."user_id" IS 'NULL nếu khách (chưa đăng nhập)';
COMMENT ON TABLE "PostViews" IS 'Quản lý chi tiết ai đã xem bài viết. Hỗ trợ tính năng "bài viết đã xem".';
CREATE INDEX ON "PostViews" ("post_id");
CREATE INDEX ON "PostViews" ("user_id");


-- Bảng bình luận
CREATE TABLE "Comments" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "post_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "content" json NOT NULL,
  "parent_comment_id" uuid,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "deleted_at" timestamptz,
  "deleted_reason" text,
  "deleted_by" uuid
);

COMMENT ON TABLE "Comments" IS 'Admin/Super Admin có quyền gỡ của user thường và chính mình, user thường chỉ có thể gỡ bình luận của chính mình. parent_comment_id hỗ trợ comment lồng nhau.';
CREATE INDEX ON "Comments" ("post_id");
CREATE INDEX ON "Comments" ("user_id");
CREATE INDEX ON "Comments" ("parent_comment_id");
CREATE INDEX ON "Comments" ("created_at");


-- Bảng log quản trị
CREATE TABLE "ModerationLogs" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "target_type" varchar(20) NOT NULL CHECK ("target_type" IN ('post', 'comment')),
  "target_id" uuid NOT NULL,
  "action" varchar(30) NOT NULL CHECK ("action" IN ('gỡ', 'khôi phục')),
  "reason" text,
  "performed_by" uuid NOT NULL,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP)
);

COMMENT ON TABLE "ModerationLogs" IS 'Lưu lại toàn bộ lịch sử thao tác quản trị. Phục vụ kiểm toán/audit trail.';
CREATE INDEX ON "ModerationLogs" ("target_type");
CREATE INDEX ON "ModerationLogs" ("target_id");
CREATE INDEX ON "ModerationLogs" ("performed_by");


-- Bảng các loại kỳ thi
CREATE TABLE "Exam_Types" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "name" varchar(50) NOT NULL UNIQUE,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "is_deleted" boolean DEFAULT false
);

COMMENT ON TABLE "Exam_Types" IS 'Lưu các loại bài thi (HSK, HSKK, TOCFL, v.v.). is_active để bật/tắt loại thi khi admin quản lý. is_deleted cho phép soft delete.';
CREATE UNIQUE INDEX ON "Exam_Types" ("name");
CREATE INDEX ON "Exam_Types" ("is_active");
CREATE INDEX ON "Exam_Types" ("created_at");


-- Bảng cấp độ của các kỳ thi
CREATE TABLE "Exam_Levels" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "exam_type_id" uuid NOT NULL,
  "name" varchar(50) NOT NULL,
  "order" int DEFAULT 0,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "is_deleted" boolean DEFAULT false
);

COMMENT ON TABLE "Exam_Levels" IS 'Lưu cấp độ của loại thi (ví dụ: HSK1-6). Khi admin chọn type, load levels dựa trên exam_type_id.';
CREATE UNIQUE INDEX ON "Exam_Levels" ("exam_type_id", "name");
CREATE INDEX ON "Exam_Levels" ("exam_type_id");
CREATE INDEX ON "Exam_Levels" ("order");
CREATE INDEX ON "Exam_Levels" ("created_at");

-- Bảng các bài thi cụ thể
CREATE TABLE "Exams" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "exam_type_id" uuid NOT NULL,
  "exam_level_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" json,
  "instructions" text,
  "total_time_minutes" int DEFAULT 0,
  "total_questions" int DEFAULT 0,
  "passing_score_total" int,
  "is_published" boolean DEFAULT false,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "is_deleted" boolean DEFAULT false,
  "version_at" timestamptz
);

COMMENT ON TABLE "Exams" IS 'Lưu bài thi cụ thể. is_published để kiểm soát hiển thị trên mobile.';
COMMENT ON COLUMN "Exams"."version_at" IS 'Thời điểm tạo version này của bài thi. NULL cho bài thi gốc/version đầu tiên.';
CREATE INDEX ON "Exams" ("exam_type_id", "exam_level_id", "name");
CREATE INDEX ON "Exams" ("is_published");
CREATE INDEX ON "Exams" ("created_by");
CREATE INDEX ON "Exams" ("created_at");
CREATE INDEX ON "Exams" ("version_at");


-- Bảng các phần trong bài thi
CREATE TABLE "Sections" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "exam_id" uuid NOT NULL,
  "name" varchar(50) NOT NULL,
  "order" int DEFAULT 0,
  "time_minutes" int DEFAULT 0,
  "passing_score" int,
  "description" json,
  "audio_url" varchar(255),
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "is_deleted" boolean DEFAULT false
);

COMMENT ON TABLE "Sections" IS 'Phần lớn trong bài thi (Nghe, Đọc, Viết). audio_url để lưu file audio hoàn chỉnh cho phần nghe.';
CREATE UNIQUE INDEX ON "Sections" ("exam_id", "name");
CREATE INDEX ON "Sections" ("exam_id");
CREATE INDEX ON "Sections" ("order");
CREATE INDEX ON "Sections" ("created_at");

-- Bảng các phần con
CREATE TABLE "Subsections" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "section_id" uuid NOT NULL,
  "name" varchar(50) NOT NULL,
  "order" int DEFAULT 0,
  "audio_url" varchar(255),
  "description" text,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "is_deleted" boolean DEFAULT false
);

COMMENT ON TABLE "Subsections" IS 'Phần con trong section (ví dụ: Phần 1-4 trong Nghe HSK1).';
CREATE UNIQUE INDEX ON "Subsections" ("section_id", "name");
CREATE INDEX ON "Subsections" ("section_id");
CREATE INDEX ON "Subsections" ("order");
CREATE INDEX ON "Subsections" ("created_at");


-- Bảng đề bài chung
CREATE TABLE "Prompts" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "subsection_id" uuid NOT NULL,
  "content" json,
  "image" json,
  "audio_url" varchar(255),
  "order" int DEFAULT 0,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "is_deleted" boolean DEFAULT false
);

COMMENT ON TABLE "Prompts" IS 'Đề chung cho nhóm câu hỏi (ví dụ: 5 hình ảnh A-E cho nối đáp án). Quan hệ N-N với questions qua bảng prompt_questions.';
CREATE INDEX ON "Prompts" ("subsection_id");
CREATE INDEX ON "Prompts" ("order");
CREATE INDEX ON "Prompts" ("created_at");

-- Bảng các loại câu hỏi
CREATE TABLE "Question_Types" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "name" varchar(50) NOT NULL UNIQUE,
  "description" text,
  "num_options" int DEFAULT 0,
  "has_prompt" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "is_deleted" boolean DEFAULT false
);

COMMENT ON TABLE "Question_Types" IS 'Định nghĩa các loại câu hỏi để hỗ trợ đa dạng (đúng/sai, chọn đáp án, sắp xếp từ, viết văn, thu âm, v.v.).';
CREATE UNIQUE INDEX ON "Question_Types" ("name");
CREATE INDEX ON "Question_Types" ("created_at");


-- Bảng câu hỏi
CREATE TABLE "Questions" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "subsection_id" uuid NOT NULL,
  "question_type_id" uuid NOT NULL,
  "order" int DEFAULT 0,
  "content" text,
  "image_url" varchar(255),
  "audio_url" varchar(255),
  "correct_answer" text,
  "points" int DEFAULT 1,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "is_deleted" boolean DEFAULT false
);
COMMENT ON COLUMN "Questions"."correct_answer" IS 'Đáp án đúng cho câu hỏi đơn giản (điền từ, trả lời ngắn). Sẽ là NULL nếu câu hỏi có nhiều đáp án đúng (lưu ở bảng Correct_Answers) hoặc là dạng trắc nghiệm (lưu ở bảng Options).';
COMMENT ON TABLE "Questions" IS 'Lưu câu hỏi cá nhân. Quy tắc chấm điểm: 1. Ưu tiên kiểm tra `correct_answer`. Nếu có giá trị, dùng nó để so sánh. 2. Nếu `correct_answer` là NULL, kiểm tra bảng `Correct_Answers` cho các đáp án dạng text. 3. Nếu là câu trắc nghiệm/sắp xếp, kiểm tra logic trong bảng `Options`.';
CREATE INDEX ON "Questions" ("subsection_id");
CREATE INDEX ON "Questions" ("question_type_id");
CREATE INDEX ON "Questions" ("order");
CREATE INDEX ON "Questions" ("created_at");


-- Bảng nối Prompt và Question
CREATE TABLE "Prompt_Questions" (
  "prompt_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  PRIMARY KEY ("prompt_id", "question_id")
);

COMMENT ON TABLE "Prompt_Questions" IS 'Bảng trung gian cho quan hệ N-N giữa prompts và questions.';
CREATE INDEX ON "Prompt_Questions" ("prompt_id");
CREATE INDEX ON "Prompt_Questions" ("question_id");


-- Bảng các lựa chọn đáp án
CREATE TABLE "Options" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "question_id" uuid NOT NULL,
  "label" varchar(10),
  "content" text,
  "image_url" varchar(255),
  "audio_url" varchar(255),
  "is_correct" boolean DEFAULT false,
  "order" int DEFAULT 0,
  "correct_order" int,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "is_deleted" boolean DEFAULT false
);
COMMENT ON COLUMN "Options"."is_correct" IS 'TRUE nếu là đáp án đúng (cho câu trắc nghiệm chỉ có 1 lựa chọn đúng).';
COMMENT ON COLUMN "Options"."correct_order" IS 'Thứ tự đúng trong các bài sắp xếp chỉ có MỘT đáp án đúng (1,2,3,4...).';
COMMENT ON TABLE "Options" IS 'Lưu các lựa chọn/thành phần được hiển thị. Dùng ''is_correct'' cho trắc nghiệm 1 đáp án. Dùng ''correct_order'' cho sắp xếp 1 đáp án. Các trường hợp phức tạp hơn, định nghĩa trong bảng `Correct_Answers`.';
CREATE INDEX ON "Options" ("question_id");
CREATE INDEX ON "Options" ("order");
CREATE INDEX ON "Options" ("created_at");


-- Bảng các đáp án đúng (cho câu có nhiều đáp án)
CREATE TABLE "Correct_Answers" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "question_id" uuid NOT NULL,
  "answer" text NOT NULL,
  "explanation" text,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP)
);

COMMENT ON TABLE "Correct_Answers" IS 'Lưu các đáp án đúng cho một câu hỏi. Cho phép một câu hỏi có nhiều hơn một đáp án chính xác (sắp xếp từ, điền từ đồng nghĩa).';
CREATE UNIQUE INDEX ON "Correct_Answers" ("question_id", "answer");
CREATE INDEX ON "Correct_Answers" ("question_id");

-- Bảng giải thích câu hỏi
CREATE TABLE "Explanations" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "question_id" uuid NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "is_deleted" boolean DEFAULT false
);

COMMENT ON TABLE "Explanations" IS 'Lưu giải thích cho câu hỏi, dùng để hiển thị khi user review.';
CREATE INDEX ON "Explanations" ("question_id");
CREATE INDEX ON "Explanations" ("created_at");


-- Bảng lịch sử làm bài thi
CREATE TABLE "User_Exam_Attempts" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "user_id" uuid NOT NULL,
  "exam_id" uuid NOT NULL,
  "start_time" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "end_time" timestamptz,
  "score_total" decimal(5,2) DEFAULT 0,
  "is_passed" boolean DEFAULT false,
  "attempt_number" int DEFAULT 1,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "overall_level" varchar(10)
);

COMMENT ON TABLE "User_Exam_Attempts" IS 'Lưu lịch sử lần thi của user cho mỗi exam. end_time NULL nếu user chưa hoàn thành.';
CREATE INDEX ON "User_Exam_Attempts" ("user_id", "exam_id");
CREATE INDEX ON "User_Exam_Attempts" ("user_id");
CREATE INDEX ON "User_Exam_Attempts" ("exam_id");
CREATE INDEX ON "User_Exam_Attempts" ("start_time");
CREATE INDEX ON "User_Exam_Attempts" ("score_total");

-- Bảng điểm các phần thi
CREATE TABLE "User_Section_Scores" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "attempt_id" uuid NOT NULL,
  "section_id" uuid NOT NULL,
  "score" decimal(5,2) DEFAULT 0,
  "is_passed" boolean DEFAULT false
);

COMMENT ON COLUMN "User_Section_Scores"."score" IS 'Đây là điểm quy đổi (scaled score) theo thang HSK thực (0–100)';
COMMENT ON TABLE "User_Section_Scores" IS 'Lưu điểm số và trạng thái đậu/trượt cho mỗi section trong một lần thi.';
CREATE UNIQUE INDEX ON "User_Section_Scores" ("attempt_id", "section_id");
CREATE INDEX ON "User_Section_Scores" ("attempt_id");
CREATE INDEX ON "User_Section_Scores" ("section_id");
CREATE INDEX ON "User_Section_Scores" ("score");

-- Bảng câu trả lời của người dùng
CREATE TABLE "User_Answers" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "attempt_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "user_response" text,
  "audio_url" varchar(255),
  "is_correct" boolean,
  "score" decimal(5,2) DEFAULT 0,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP)
);

COMMENT ON TABLE "User_Answers" IS 'Lưu đáp án của user cho mỗi câu hỏi. is_correct và score NULL cho câu subjective (viết/thu âm, cần chấm thủ công).';
CREATE UNIQUE INDEX ON "User_Answers" ("attempt_id", "question_id");
CREATE INDEX ON "User_Answers" ("attempt_id");
CREATE INDEX ON "User_Answers" ("question_id");
CREATE INDEX ON "User_Answers" ("created_at");


-- Bảng xếp hạng người dùng
CREATE TABLE "User_Rankings" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "user_id" uuid NOT NULL,
  "exam_type_id" uuid NOT NULL,
  "exam_level_id" uuid,
  "period" varchar(10) NOT NULL CHECK ("period" IN ('week', 'month', 'all_time')),
  "max_score" int DEFAULT 0,
  "rank" int DEFAULT 0,
  "updated_at" timestamptz DEFAULT (CURRENT_TIMESTAMP)
);

COMMENT ON COLUMN "User_Rankings"."exam_level_id" IS 'NULL cho xếp hạng chung type (ví dụ: tổng HSK), chỉ định id cho xếp hạng per level (ví dụ: HSK1, HSK2)';
COMMENT ON TABLE "User_Rankings" IS 'Lưu thông tin xếp hạng cho user theo type/level và khoảng thời gian. Cập nhật qua trigger sau mỗi attempt.';
CREATE UNIQUE INDEX ON "User_Rankings" ("user_id", "exam_type_id", "exam_level_id", "period");
CREATE INDEX ON "User_Rankings" ("user_id");
CREATE INDEX ON "User_Rankings" ("exam_type_id");
CREATE INDEX ON "User_Rankings" ("exam_level_id");
CREATE INDEX ON "User_Rankings" ("max_score");
CREATE INDEX ON "User_Rankings" ("updated_at");


-- Bảng sổ tay
CREATE TABLE "Notebooks" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "user_id" uuid,
  "name" varchar(100) NOT NULL,
  "vocab_count" int DEFAULT 0,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "options" json NOT NULL,
  "is_premium" boolean DEFAULT false,
  "status" varchar(50) NOT NULL CHECK ("status" IN ('published', 'draft'))
);

COMMENT ON TABLE "Notebooks" IS 'Sổ tay cá nhân hoặc sẵn có (user_id NULL cho sẵn có). Trigger cập nhật vocab_count từ NotebookVocabItems.';
CREATE INDEX ON "Notebooks" ("user_id");


-- Bảng từ vựng
CREATE TABLE "Vocabulary" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "hanzi" varchar(50) NOT NULL,
  "pinyin" varchar(50) NOT NULL,
  "meaning" text NOT NULL,
  "notes" text,
  "level" text[] NOT NULL,
  "image_url" text
);

COMMENT ON TABLE "Vocabulary" IS 'Unique constraint (hanzi+pinyin) để tránh trùng lặp. Một từ có thể thuộc nhiều HSK levels.';
CREATE UNIQUE INDEX ON "Vocabulary" ("hanzi", "pinyin");
CREATE INDEX ON "Vocabulary" USING GIN ("level");


-- Bảng loại từ
CREATE TABLE "WordType" (
  "code" varchar(50) PRIMARY KEY
);
COMMENT ON COLUMN "WordType"."code" IS 'Enum: Danh từ, Đại từ, Động từ, Tính từ, Trạng từ, Giới từ, Liên từ, Trợ từ, Thán từ, Số từ, Lượng từ, Thành phần câu, Cụm từ';
COMMENT ON TABLE "WordType" IS 'Một từ có thể có nhiều từ loại';

-- Bảng nối từ vựng và loại từ
CREATE TABLE "VocabularyWordType" (
  "vocab_id" uuid NOT NULL,
  "word_type" varchar(50) NOT NULL,
  PRIMARY KEY ("vocab_id", "word_type")
);
COMMENT ON TABLE "VocabularyWordType" IS 'Bảng trung gian N:N giữa Vocabulary và WordType. Cho phép một từ vựng có nhiều từ loại';
CREATE INDEX ON "VocabularyWordType" ("vocab_id");
CREATE INDEX ON "VocabularyWordType" ("word_type");


-- Bảng từ vựng trong sổ tay
CREATE TABLE "NotebookVocabItems" (
  "notebook_id" uuid NOT NULL,
  "vocab_id" uuid NOT NULL,
  "status" varchar(20) NOT NULL CHECK ("status" IN ('đã thuộc', 'chưa thuộc', 'yêu thích', 'không chắc')),
  "added_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY ("notebook_id", "vocab_id")
);

COMMENT ON TABLE "NotebookVocabItems" IS 'Bảng liên kết N:N cho Notebook-Vocabulary. Thống kê qua COUNT GROUP BY status.';


-- Bảng mẹo học
CREATE TABLE "Tips" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "topic" varchar(50) NOT NULL CHECK ("topic" IN ('Tất cả', 'Văn hóa', 'Ngữ pháp', 'Từ vựng', 'Phát âm', 'Khẩu ngữ', 'Kỹ năng nghe', 'Kỹ năng đọc', 'Kỹ năng viết', 'Khác')),
  "level" varchar(10) NOT NULL CHECK ("level" IN ('Sơ cấp', 'Trung cấp', 'Cao cấp')),
  "content" jsonb NOT NULL,
  "answer" text,
  "is_pinned" boolean NOT NULL DEFAULT false,
  "created_by" uuid
);
COMMENT ON COLUMN "Tips"."is_pinned" IS 'Mới: Quyết định mẹo có được ghim (Pin) lên đầu danh sách hay không. Tối đa 3 mẹo được ghim/chủ đề.';
COMMENT ON TABLE "Tips" IS 'Mẹo trang chủ với đáp án tùy chọn cho quiz. Tổng số tính toán động.';
CREATE INDEX ON "Tips" ("topic");
CREATE INDEX ON "Tips" ("level");
CREATE INDEX ON "Tips" ("is_pinned");

-- Bảng bài học AI
CREATE TABLE "AILessons" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "user_id" uuid NOT NULL,
  "theme" varchar(100) NOT NULL,
  "level" varchar(10) NOT NULL CHECK ("level" IN ('Cơ bản', 'Trung cấp', 'Cao cấp')),
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "content" json NOT NULL
);

COMMENT ON COLUMN "AILessons"."content" IS 'Structure: {vocabularies: [{vocab_id, audio_url}], phrases: [{vocab_id, audio_url}], tips: [{tip_id, vietnamese, chinese}], dialogues: [{messages: [{text, pinyin, audio_url}]}]}';
COMMENT ON TABLE "AILessons" IS 'Lưu bài học tạo bởi AI. content.vocabularies/phrases reference Vocabulary.id. Audio tạo động (TTS API), URL lưu tạm thời.';
CREATE INDEX ON "AILessons" ("user_id");
CREATE INDEX ON "AILessons" ("theme", "level");


-- Bảng log admin
CREATE TABLE "AdminLogs" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "user_id" uuid NOT NULL,
  "action_type" varchar(50) NOT NULL CHECK ("action_type" IN ('CREATE', 'UPDATE', 'DELETE', 'BAN_USER')),
  "target_id" uuid,
  "description" text,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP)
);

COMMENT ON TABLE "AdminLogs" IS 'Theo dõi hành động admin để kiểm toán. user_id tham chiếu tới bảng Users, nhưng chỉ cho phép role admin/super_admin.';
CREATE INDEX ON "AdminLogs" ("user_id");
CREATE INDEX ON "AdminLogs" ("created_at");


-- Bảng lịch sử dịch
CREATE TABLE "TranslationHistory" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "user_id" uuid NOT NULL,
  "original_text" text NOT NULL,
  "original_lang" varchar(10) NOT NULL CHECK ("original_lang" IN ('vi', 'zh')),
  "translated_text" text NOT NULL,
  "translated_lang" varchar(10) NOT NULL CHECK ("translated_lang" IN ('vi', 'zh')),
  "is_ai" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP)
);

COMMENT ON TABLE "TranslationHistory" IS 'Lưu lịch sử dịch (Trung-Việt/Việt-Trung), phân biệt dịch thường hoặc AI. Người dùng xóa qua API.';
CREATE INDEX ON "TranslationHistory" ("user_id");
CREATE INDEX ON "TranslationHistory" ("created_at");

-- Bảng quota sử dụng
CREATE TABLE "UserUsage" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "user_id" uuid NOT NULL,
  "feature" varchar(50) NOT NULL CHECK ("feature" IN ('ai_lesson', 'ai_translate')),
  "daily_count" int DEFAULT 0,
  "last_reset" timestamptz DEFAULT (CURRENT_TIMESTAMP)
);

COMMENT ON TABLE "UserUsage" IS 'Quản lý quota sử dụng AI theo tính năng. daily_count reset hàng ngày qua cron job.';
CREATE INDEX ON "UserUsage" ("user_id");
CREATE INDEX ON "UserUsage" ("feature");


-- Bảng thông báo
CREATE TABLE "Notifications" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "recipient_id" uuid,
  "audience" varchar(20) NOT NULL CHECK ("audience" IN ('user', 'admin', 'all')),
  "type" varchar(50) NOT NULL CHECK ("type" IN ('system', 'report', 'violation', 'appeal', 'subscription', 'community', 'achievement', 'reminder', 'feedback')),
  "title" varchar(200) NOT NULL,
  "content" json NOT NULL,
  "related_type" varchar(50),
  "related_id" uuid,
  "data" jsonb,
  "redirect_url" text,
  "read_at" timestamptz,
  "is_push_sent" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "expires_at" timestamptz,
  "priority" int DEFAULT 0,
  "from_system" boolean DEFAULT false
);

COMMENT ON TABLE "Notifications" IS 'Dùng cho mọi loại thông báo: hệ thống, vi phạm, broadcast,... from_system = true giúp phân biệt thông báo tự động và do admin gửi.';
CREATE INDEX ON "Notifications" ("recipient_id");
CREATE INDEX ON "Notifications" ("audience");
CREATE INDEX ON "Notifications" ("created_at");
CREATE INDEX ON "Notifications" ("read_at");
CREATE INDEX ON "Notifications" ("related_type", "related_id");
CREATE INDEX ON "Notifications" ("type");
CREATE INDEX ON "Notifications" ("priority");


-- Bảng báo cáo
CREATE TABLE "Reports" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "reporter_id" uuid,
  "target_type" varchar(20) NOT NULL CHECK ("target_type" IN ('post', 'comment', 'user', 'bug', 'other')),
  "target_id" uuid,
  "reason" varchar(255) NOT NULL,
  "details" text,
  "attachments" jsonb,
  "status" varchar(20) DEFAULT 'pending' CHECK ("status" IN ('pending', 'in_progress', 'resolved', 'dismissed')),
  "resolution" text,
  "resolved_by" uuid,
  "resolved_at" timestamptz,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "related_violation_id" uuid,
  "auto_flagged" boolean DEFAULT false
);

           
 

COMMENT ON TABLE "Reports" IS 'Lưu báo cáo do user hoặc hệ thống (AI) tạo. Khi target_type=''bug'' → dùng details + attachments để miêu tả lỗi. related_violation_id giúp truy vết sang Violation.';
CREATE INDEX ON "Reports" ("target_type", "target_id");
CREATE INDEX ON "Reports" ("reporter_id");
CREATE INDEX ON "Reports" ("status");
CREATE INDEX ON "Reports" ("created_at");
CREATE INDEX ON "Reports" ("auto_flagged");


-- Bảng quy tắc cộng đồng
CREATE TABLE "CommunityRules" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "title" varchar(100) NOT NULL UNIQUE,
  "description" text NOT NULL,
  "severity_default" varchar(10) NOT NULL CHECK ("severity_default" IN ('low', 'medium', 'high')),
  "is_active" boolean DEFAULT true,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz
);
COMMENT ON TABLE "CommunityRules" IS 'Chứa danh sách quy tắc cộng đồng do admin thiết lập. Dùng để tham chiếu khi tạo vi phạm (Violations).';
CREATE INDEX ON "CommunityRules" ("title");
CREATE INDEX ON "CommunityRules" ("severity_default");
CREATE INDEX ON "CommunityRules" ("is_active");


-- Bảng vi phạm
CREATE TABLE "Violations" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "user_id" uuid NOT NULL,
  "target_type" varchar(20) NOT NULL CHECK ("target_type" IN ('post', 'comment')),
  "target_id" uuid NOT NULL,
  "severity" varchar(10) NOT NULL CHECK ("severity" IN ('low', 'medium', 'high')),
  "detected_by" varchar(20) NOT NULL CHECK ("detected_by" IN ('admin', 'auto_ai')),
  "handled" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "resolved_at" timestamptz,
  "resolution" text
);

COMMENT ON TABLE "Violations" IS 'Lưu lịch sử vi phạm của người dùng. Một vi phạm có thể gắn với nhiều quy tắc (qua bảng ViolationRules).';
CREATE INDEX ON "Violations" ("user_id");
CREATE INDEX ON "Violations" ("target_id");
CREATE INDEX ON "Violations" ("handled");
CREATE INDEX ON "Violations" ("created_at");


-- Bảng liên kết vi phạm và quy tắc
CREATE TABLE "ViolationRules" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "violation_id" uuid NOT NULL,
  "rule_id" uuid NOT NULL
);

COMMENT ON TABLE "ViolationRules" IS 'Cho phép một vi phạm có thể vi phạm nhiều quy tắc (many-to-many).';
CREATE INDEX ON "ViolationRules" ("violation_id");
CREATE INDEX ON "ViolationRules" ("rule_id");

-- Bảng khiếu nại
CREATE TABLE "Appeals" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "violation_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "reason" text NOT NULL,
  "status" varchar(20) DEFAULT 'pending' CHECK ("status" IN ('pending', 'accepted', 'rejected')),
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "resolved_at" timestamptz,
  "resolved_by" uuid,
  "notes" text,
  "violation_snapshot" jsonb
);

COMMENT ON TABLE "Appeals" IS 'Người dùng có thể khiếu nại sau khi bị gỡ nội dung. Nếu accepted → khôi phục, nếu rejected → xóa sau 7 ngày.';
CREATE INDEX ON "Appeals" ("violation_id");
CREATE INDEX ON "Appeals" ("user_id");
CREATE INDEX ON "Appeals" ("status");
CREATE INDEX ON "Appeals" ("created_at");

-- Bảng refresh token
CREATE TABLE "RefreshTokens" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "user_id" uuid NOT NULL,
  "token" text UNIQUE NOT NULL,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "expires_at" timestamptz NOT NULL
);

COMMENT ON TABLE "RefreshTokens" IS 'Lưu trữ refresh token cho cơ chế xác thực, đảm bảo token là duy nhất.';
CREATE INDEX ON "RefreshTokens" ("user_id");
CREATE UNIQUE INDEX ON "RefreshTokens" ("token");


-- ĐỊNH NGHĨA CÁC KHÓA NGOẠI (FOREIGN KEYS)

ALTER TABLE "Users" ADD FOREIGN KEY ("badge_level") REFERENCES "BadgeLevels" ("level") ON DELETE SET DEFAULT;

ALTER TABLE "UserSessions" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE;
ALTER TABLE "UserDailyActivity" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE;
ALTER TABLE "UserStreaks" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE;

ALTER TABLE "UserAchievements" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE;
ALTER TABLE "UserAchievements" ADD FOREIGN KEY ("achievement_id") REFERENCES "Achievements" ("id") ON DELETE RESTRICT;

ALTER TABLE "Payments" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE RESTRICT;
ALTER TABLE "Payments" ADD FOREIGN KEY ("subscription_id") REFERENCES "Subscriptions" ("id") ON DELETE RESTRICT;
ALTER TABLE "Payments" ADD FOREIGN KEY ("processed_by_admin") REFERENCES "Users" ("id") ON DELETE SET NULL;

ALTER TABLE "UserSubscriptions" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE;
ALTER TABLE "UserSubscriptions" ADD FOREIGN KEY ("subscription_id") REFERENCES "Subscriptions" ("id") ON DELETE RESTRICT;
ALTER TABLE "UserSubscriptions" ADD FOREIGN KEY ("last_payment_id") REFERENCES "Payments" ("id") ON DELETE SET NULL;

ALTER TABLE "Refunds" ADD FOREIGN KEY ("payment_id") REFERENCES "Payments" ("id") ON DELETE CASCADE;
ALTER TABLE "Refunds" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE;
ALTER TABLE "Refunds" ADD FOREIGN KEY ("processed_by_admin") REFERENCES "Users" ("id") ON DELETE SET NULL;

ALTER TABLE "Posts" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id");
ALTER TABLE "Posts" ADD FOREIGN KEY ("deleted_by") REFERENCES "Users" ("id");

ALTER TABLE "Comments" ADD FOREIGN KEY ("post_id") REFERENCES "Posts" ("id") ON DELETE CASCADE;
ALTER TABLE "Comments" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id");
ALTER TABLE "Comments" ADD FOREIGN KEY ("parent_comment_id") REFERENCES "Comments" ("id") ON DELETE CASCADE;
ALTER TABLE "Comments" ADD FOREIGN KEY ("deleted_by") REFERENCES "Users" ("id");

ALTER TABLE "ModerationLogs" ADD FOREIGN KEY ("performed_by") REFERENCES "Users" ("id");

ALTER TABLE "PostLikes" ADD FOREIGN KEY ("post_id") REFERENCES "Posts" ("id") ON DELETE CASCADE;
ALTER TABLE "PostLikes" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE;

ALTER TABLE "PostViews" ADD FOREIGN KEY ("post_id") REFERENCES "Posts" ("id") ON DELETE CASCADE;
ALTER TABLE "PostViews" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE SET NULL;

ALTER TABLE "Notebooks" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE;
ALTER TABLE "NotebookVocabItems" ADD FOREIGN KEY ("notebook_id") REFERENCES "Notebooks" ("id") ON DELETE CASCADE;
ALTER TABLE "NotebookVocabItems" ADD FOREIGN KEY ("vocab_id") REFERENCES "Vocabulary" ("id") ON DELETE RESTRICT;

ALTER TABLE "AILessons" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE;
ALTER TABLE "AdminLogs" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE SET NULL;

ALTER TABLE "Reports" ADD FOREIGN KEY ("reporter_id") REFERENCES "Users" ("id") ON DELETE SET NULL;
ALTER TABLE "Reports" ADD FOREIGN KEY ("resolved_by") REFERENCES "Users" ("id") ON DELETE SET NULL;
ALTER TABLE "Reports" ADD FOREIGN KEY ("related_violation_id") REFERENCES "Violations" ("id") ON DELETE SET NULL;

ALTER TABLE "Appeals" ADD FOREIGN KEY ("violation_id") REFERENCES "Violations" ("id") ON DELETE CASCADE;
ALTER TABLE "Appeals" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE;
ALTER TABLE "Appeals" ADD FOREIGN KEY ("resolved_by") REFERENCES "Users" ("id") ON DELETE SET NULL;

ALTER TABLE "Violations" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE;
ALTER TABLE "ViolationRules" ADD FOREIGN KEY ("violation_id") REFERENCES "Violations" ("id") ON DELETE CASCADE;
ALTER TABLE "ViolationRules" ADD FOREIGN KEY ("rule_id") REFERENCES "CommunityRules" ("id") ON DELETE CASCADE;

ALTER TABLE "Tips" ADD FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON DELETE SET NULL;
ALTER TABLE "TranslationHistory" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE;
ALTER TABLE "UserUsage" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE;
ALTER TABLE "Notifications" ADD FOREIGN KEY ("recipient_id") REFERENCES "Users" ("id") ON DELETE SET NULL;
ALTER TABLE "RefreshTokens" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE;

ALTER TABLE "VocabularyWordType" ADD FOREIGN KEY ("vocab_id") REFERENCES "Vocabulary" ("id") ON DELETE CASCADE;
ALTER TABLE "VocabularyWordType" ADD FOREIGN KEY ("word_type") REFERENCES "WordType" ("code") ON DELETE CASCADE;

ALTER TABLE "Exam_Levels" ADD FOREIGN KEY ("exam_type_id") REFERENCES "Exam_Types" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Exams" ADD FOREIGN KEY ("exam_type_id") REFERENCES "Exam_Types" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Exams" ADD FOREIGN KEY ("exam_level_id") REFERENCES "Exam_Levels" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Exams" ADD FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE CASCADE ON DELETE NO ACTION;

ALTER TABLE "Sections" ADD FOREIGN KEY ("exam_id") REFERENCES "Exams" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Subsections" ADD FOREIGN KEY ("section_id") REFERENCES "Sections" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Prompts" ADD FOREIGN KEY ("subsection_id") REFERENCES "Subsections" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "Questions" ADD FOREIGN KEY ("subsection_id") REFERENCES "Subsections" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Questions" ADD FOREIGN KEY ("question_type_id") REFERENCES "Question_Types" ("id") ON UPDATE CASCADE ON DELETE NO ACTION;

ALTER TABLE "Prompt_Questions" ADD FOREIGN KEY ("prompt_id") REFERENCES "Prompts" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Prompt_Questions" ADD FOREIGN KEY ("question_id") REFERENCES "Questions" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "Options" ADD FOREIGN KEY ("question_id") REFERENCES "Questions" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Correct_Answers" ADD FOREIGN KEY ("question_id") REFERENCES "Questions" ("id");
ALTER TABLE "Explanations" ADD FOREIGN KEY ("question_id") REFERENCES "Questions" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "User_Exam_Attempts" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "User_Exam_Attempts" ADD FOREIGN KEY ("exam_id") REFERENCES "Exams" ("id") ON UPDATE CASCADE ON DELETE NO ACTION;

ALTER TABLE "User_Section_Scores" ADD FOREIGN KEY ("attempt_id") REFERENCES "User_Exam_Attempts" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "User_Section_Scores" ADD FOREIGN KEY ("section_id") REFERENCES "Sections" ("id") ON UPDATE CASCADE ON DELETE NO ACTION;

ALTER TABLE "User_Answers" ADD FOREIGN KEY ("attempt_id") REFERENCES "User_Exam_Attempts" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "User_Answers" ADD FOREIGN KEY ("question_id") REFERENCES "Questions" ("id") ON UPDATE CASCADE ON DELETE NO ACTION;

ALTER TABLE "User_Rankings" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "User_Rankings" ADD FOREIGN KEY ("exam_type_id") REFERENCES "Exam_Types" ("id") ON UPDATE CASCADE ON DELETE NO ACTION;
ALTER TABLE "User_Rankings" ADD FOREIGN KEY ("exam_level_id") REFERENCES "Exam_Levels" ("id") ON UPDATE CASCADE ON DELETE NO ACTION;
ALTER TABLE "Users" ALTER COLUMN level SET DEFAULT '1';

















-- Đặt giá trị mặc định cho cột 'language' là 'Tiếng Việt'
ALTER TABLE "Users" ALTER COLUMN language SET DEFAULT 'Tiếng Việt';

INSERT INTO BadgeLevels ( level, 
    name, 
    min_points, 
    rule_description, 
    icon
) 
VALUES (
    0,                                   
    'Người mới',                          
    0,                                  
    'Huy hiệu khởi đầu cho mọi thành viên mới của cộng đồng.', 
    'https://cdn-icons-png.flaticon.com/512/1533/1533913.png' 
)
RETURNING *;

ALTER TABLE "Users" ALTER COLUMN role TYPE varchar(20);

ALTER TABLE "Tips" ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

BEGIN;

-- Xóa constraint cũ
ALTER TABLE "Tips" DROP CONSTRAINT "Tips_topic_check";

-- Thêm constraint mới
ALTER TABLE "Tips" ADD CONSTRAINT "Tips_topic_check" CHECK ("topic" IN (
    'Văn hóa', 'Ngữ pháp', 'Từ vựng', 'Phát âm', 'Khẩu ngữ', 
    'Kỹ năng nghe', 'Kỹ năng đọc', 'Kỹ năng viết', 'Câu đố', 
    'HSK', 'Câu nói hay', 'Giao tiếp', 'HSKK', 'Ngôn ngữ mạng', 
    'Du học', 'Hướng dẫn sử dụng', 'Truyện cười'
));

COMMIT;

ALTER TABLE "User_Exam_Attempts" ALTER COLUMN score_total DROP DEFAULT;
