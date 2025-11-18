-- Migration: Update Notifications Schema
-- Date: 2025-01-18
-- Description: Thêm redirect_type, gộp redirect_data vào data, bỏ related_type và related_id

-- Bước 1: Thêm column redirect_type
ALTER TABLE "Notifications" 
ADD COLUMN IF NOT EXISTS redirect_type VARCHAR(50);

-- Bước 2: Comment cho các column cũ (sẽ bỏ sau khi migrate xong)
COMMENT ON COLUMN "Notifications".related_type IS 'DEPRECATED - Sẽ bỏ sau khi migrate';
COMMENT ON COLUMN "Notifications".related_id IS 'DEPRECATED - Sẽ bỏ sau khi migrate';
COMMENT ON COLUMN "Notifications".redirect_url IS 'DEPRECATED - Sẽ bỏ sau khi migrate';

-- Bước 3: Migrate dữ liệu cũ sang format mới
-- Chuyển redirect_url thành redirect_type và gộp vào data

-- 3.1. Migrate post redirect (app://post/{id})
UPDATE "Notifications"
SET 
  redirect_type = 'post',
  data = jsonb_set(
    COALESCE(data, '{}'::jsonb),
    '{post_id}',
    to_jsonb(substring(redirect_url from 'app://post/([^#]+)'))
  )
WHERE redirect_url LIKE 'app://post/%' 
  AND redirect_url NOT LIKE '%#comment-%'
  AND redirect_type IS NULL;

-- 3.2. Migrate post_comment redirect (app://post/{id}#comment-{comment_id})
UPDATE "Notifications"
SET 
  redirect_type = 'post_comment',
  data = jsonb_set(
    jsonb_set(
      COALESCE(data, '{}'::jsonb),
      '{post_id}',
      to_jsonb(substring(redirect_url from 'app://post/([^#]+)'))
    ),
    '{comment_id}',
    to_jsonb(substring(redirect_url from '#comment-(.+)$'))
  )
WHERE redirect_url LIKE 'app://post/%#comment-%'
  AND redirect_type IS NULL;

-- 3.3. Migrate home redirect
UPDATE "Notifications"
SET redirect_type = 'home'
WHERE redirect_url = 'app://home'
  AND redirect_type IS NULL;

-- 3.4. Migrate maintenance redirect
UPDATE "Notifications"
SET redirect_type = 'maintenance'
WHERE redirect_url = 'app://maintenance'
  AND redirect_type IS NULL;

-- 3.5. Migrate community_rules redirect
UPDATE "Notifications"
SET redirect_type = 'community_rules'
WHERE redirect_url = 'app://community-rules'
  AND redirect_type IS NULL;

-- 3.6. Migrate achievements redirect
UPDATE "Notifications"
SET redirect_type = 'achievement'
WHERE redirect_url LIKE 'app://achievements%'
  AND redirect_type IS NULL;

-- 3.7. Migrate vocabulary redirect
UPDATE "Notifications"
SET redirect_type = 'vocabulary'
WHERE redirect_url LIKE 'app://vocab/%'
  AND redirect_type IS NULL;

-- 3.8. Migrate lessons redirect
UPDATE "Notifications"
SET redirect_type = 'lesson'
WHERE redirect_url LIKE 'app://lessons%'
  AND redirect_type IS NULL;

-- 3.9. Migrate notifications list redirect
UPDATE "Notifications"
SET redirect_type = 'notification_list'
WHERE redirect_url = 'app://notifications'
  AND redirect_type IS NULL;

-- 3.10. Migrate null hoặc empty redirect_url thành 'none'
UPDATE "Notifications"
SET redirect_type = 'none'
WHERE (redirect_url IS NULL OR redirect_url = '')
  AND redirect_type IS NULL;

-- 3.11. Migrate các redirect_url còn lại (external hoặc không xác định)
UPDATE "Notifications"
SET 
  redirect_type = 'none',
  data = jsonb_set(
    COALESCE(data, '{}'::jsonb),
    '{legacy_redirect_url}',
    to_jsonb(redirect_url)
  )
WHERE redirect_type IS NULL;

-- Bước 4: Tạo index cho redirect_type để tăng performance
CREATE INDEX IF NOT EXISTS idx_notifications_redirect_type 
ON "Notifications"(redirect_type);

-- Bước 5: Thêm constraint check cho redirect_type (optional)
-- Uncomment nếu muốn giới hạn các giá trị hợp lệ
/*
ALTER TABLE "Notifications"
ADD CONSTRAINT chk_redirect_type CHECK (
  redirect_type IN (
    'post', 'post_comment', 'post_edit', 'profile', 'achievement',
    'community_rules', 'subscription', 'subscription_renew', 'refund_detail',
    'exam_result', 'course_certificate', 'lesson_today', 'streak_stats',
    'onboarding', 'maintenance', 'feature_intro', 'announcement', 'none'
  )
);
*/

-- Bước 6: Verify migration
-- Kiểm tra số lượng notifications đã migrate
SELECT 
  redirect_type,
  COUNT(*) as count
FROM "Notifications"
GROUP BY redirect_type
ORDER BY count DESC;

-- Kiểm tra các notifications chưa có redirect_type (nếu có)
SELECT 
  id, 
  type, 
  title, 
  redirect_url,
  redirect_type
FROM "Notifications"
WHERE redirect_type IS NULL
LIMIT 10;

-- ROLLBACK SCRIPT (nếu cần)
-- Uncomment để rollback
/*
-- Xóa column redirect_type
ALTER TABLE "Notifications" DROP COLUMN IF EXISTS redirect_type;

-- Xóa index
DROP INDEX IF EXISTS idx_notifications_redirect_type;

-- Xóa comment
COMMENT ON COLUMN "Notifications".related_type IS NULL;
COMMENT ON COLUMN "Notifications".related_id IS NULL;
COMMENT ON COLUMN "Notifications".redirect_url IS NULL;
*/
