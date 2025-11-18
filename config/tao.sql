INSERT INTO "Subscriptions" (name, description, daily_quota_ai_lesson, daily_quota_translate, price, duration_months, is_active)
VALUES
(
  'Gói Cao Cấp 1 Năm',                                       -- name (tên gói, UNIQUE)
  '{
     "features": [
       "Bài học AI không giới hạn",
       "Dịch thuật AI nâng cao (200 lượt/ngày)",
       "Truy cập tất cả đề thi có sẵn",
       "Huy hiệu PRO đặc biệt trên hồ sơ"
     ]
   }',                                                      -- description (dữ liệu JSON mô tả các quyền lợi)
  9999,                                                      -- daily_quota_ai_lesson (số lượt dùng AI lesson mỗi ngày)
  200,                                                       -- daily_quota_translate (số lượt dịch AI mỗi ngày)
  1200000.00,                                                -- price (giá của gói)
  12,                                                        -- duration_months (thời hạn của gói tính bằng tháng)
  true                                                       -- is_active (gói này có đang được bán không)
)
-- Không chèn nếu đã tồn tại gói có cùng `name`
ON CONFLICT (name) DO NOTHING;