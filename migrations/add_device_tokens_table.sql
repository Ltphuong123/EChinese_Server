-- Migration: Tạo bảng DeviceTokens để lưu FCM tokens
-- Chạy file này bằng: psql -U postgres -d DBEChinese -f migrations/add_device_tokens_table.sql

-- Tạo bảng DeviceTokens
CREATE TABLE IF NOT EXISTS "DeviceTokens" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform varchar(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_info jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Tạo index để tăng tốc query
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON "DeviceTokens"(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON "DeviceTokens"(token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON "DeviceTokens"(is_active) WHERE is_active = true;

-- Trigger tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_device_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_device_tokens_timestamp
BEFORE UPDATE ON "DeviceTokens"
FOR EACH ROW
EXECUTE FUNCTION update_device_tokens_updated_at();

-- Comment để giải thích
COMMENT ON TABLE "DeviceTokens" IS 'Lưu trữ FCM tokens của các thiết bị để gửi push notification';
COMMENT ON COLUMN "DeviceTokens".user_id IS 'ID của user sở hữu thiết bị';
COMMENT ON COLUMN "DeviceTokens".token IS 'FCM token từ Firebase';
COMMENT ON COLUMN "DeviceTokens".platform IS 'Nền tảng: ios, android, hoặc web';
COMMENT ON COLUMN "DeviceTokens".device_info IS 'Thông tin thiết bị (model, OS version, etc.)';
COMMENT ON COLUMN "DeviceTokens".is_active IS 'Token còn hoạt động hay không';
