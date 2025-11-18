-- Script kiểm tra notifications trong database

-- 1. Kiểm tra column redirect_type đã tồn tại chưa
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'Notifications' 
  AND column_name IN ('redirect_type', 'redirect_url', 'related_type', 'related_id');

-- 2. Kiểm tra phân bố redirect_type
SELECT 
  redirect_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM "Notifications"
GROUP BY redirect_type
ORDER BY count DESC;

-- 3. Xem 5 notifications mới nhất
SELECT 
  id,
  type,
  title,
  redirect_type,
  data,
  created_at
FROM "Notifications"
ORDER BY created_at DESC
LIMIT 5;

-- 4. Kiểm tra notifications có redirect_type = NULL
SELECT 
  COUNT(*) as null_redirect_type_count
FROM "Notifications"
WHERE redirect_type IS NULL;

-- 5. Xem chi tiết notifications có redirect_type khác 'none'
SELECT 
  id,
  type,
  title,
  redirect_type,
  jsonb_pretty(data) as data_formatted,
  created_at
FROM "Notifications"
WHERE redirect_type IS NOT NULL 
  AND redirect_type != 'none'
ORDER BY created_at DESC
LIMIT 10;

-- 6. Kiểm tra data structure của từng redirect_type
SELECT 
  redirect_type,
  jsonb_object_keys(data) as data_keys,
  COUNT(*) as count
FROM "Notifications"
WHERE data IS NOT NULL 
  AND jsonb_typeof(data) = 'object'
GROUP BY redirect_type, jsonb_object_keys(data)
ORDER BY redirect_type, count DESC;

-- 7. Test query: Lấy notifications như API
SELECT 
  id,
  type,
  title,
  content,
  redirect_type,
  data,
  priority,
  read_at IS NOT NULL as is_read,
  created_at
FROM "Notifications"
WHERE recipient_id = '550e8400-e29b-41d4-a716-446655440000'
  OR audience = 'all'
ORDER BY priority DESC, created_at DESC
LIMIT 10;
