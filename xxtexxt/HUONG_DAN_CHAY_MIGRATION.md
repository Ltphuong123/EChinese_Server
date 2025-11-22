# 🗄️ Hướng Dẫn Chạy Migration - Tạo Bảng DeviceTokens

## ❌ Lỗi Bạn Đang Gặp

```
ERROR: relation "devicetokens" does not exist
```

**Nguyên nhân:** Bảng `DeviceTokens` chưa được tạo trong database.

**Giải pháp:** Chạy migration để tạo bảng.

---

## ✅ Cách 1: Dùng psql (Command Line) - Khuyến nghị

### Bước 1: Mở Command Prompt hoặc PowerShell

```bash
# Windows: Nhấn Win + R, gõ "cmd" hoặc "powershell"
```

### Bước 2: Chạy migration

```bash
# Di chuyển đến thư mục project
cd C:\Users\Admin\Desktop\backup\EChinese_Server

# Chạy migration
psql -U postgres -d DBEChinese -f migrations/add_device_tokens_table.sql
```

**Nếu được hỏi password:** Nhập password của PostgreSQL (mặc định thường là `postgres` hoặc `123456`)

### Bước 3: Kiểm tra kết quả

**Nếu thành công, bạn sẽ thấy:**

```
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
CREATE TRIGGER
COMMENT
COMMENT
COMMENT
COMMENT
COMMENT
COMMENT
```

**Nếu lỗi:**

```
psql: error: connection to server at "localhost" (::1), port 5432 failed
```

→ PostgreSQL chưa chạy. Khởi động PostgreSQL service.

---

## ✅ Cách 2: Dùng pgAdmin (GUI)

### Bước 1: Mở pgAdmin

1. Mở pgAdmin 4
2. Kết nối đến server PostgreSQL
3. Expand **Servers** → **PostgreSQL** → **Databases**
4. Click chuột phải vào database **DBEChinese**

### Bước 2: Mở Query Tool

1. Click **Tools** → **Query Tool**
2. Hoặc click chuột phải vào **DBEChinese** → **Query Tool**

### Bước 3: Load và chạy migration

1. Click icon **Open File** (📁)
2. Chọn file `migrations/add_device_tokens_table.sql`
3. Click **Execute** (▶️) hoặc nhấn **F5**

### Bước 4: Kiểm tra kết quả

Xem tab **Messages** ở dưới:

```
CREATE TABLE
CREATE INDEX
...
Query returned successfully in XXX msec.
```

---

## ✅ Cách 3: Dùng DBeaver (GUI)

### Bước 1: Mở DBeaver

1. Mở DBeaver
2. Kết nối đến database **DBEChinese**

### Bước 2: Mở SQL Editor

1. Click chuột phải vào **DBEChinese**
2. Chọn **SQL Editor** → **Open SQL Script**
3. Chọn file `migrations/add_device_tokens_table.sql`

### Bước 3: Execute

1. Click **Execute SQL Statement** (Ctrl+Enter)
2. Hoặc click icon ▶️

### Bước 4: Kiểm tra

Xem **Execution Log** ở dưới để đảm bảo không có lỗi.

---

## ✅ Cách 4: Copy-Paste SQL (Nếu các cách trên không được)

### Bước 1: Copy nội dung SQL

```sql
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

-- Tạo index
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
```

### Bước 2: Paste vào Query Tool

1. Mở pgAdmin hoặc DBeaver
2. Mở Query Tool
3. Paste SQL vào
4. Execute (F5)

---

## 🔍 Kiểm Tra Bảng Đã Được Tạo Chưa

### Cách 1: Dùng psql

```bash
psql -U postgres -d DBEChinese

# Trong psql, chạy:
\dt "DeviceTokens"

# Xem cấu trúc bảng:
\d "DeviceTokens"

# Thoát:
\q
```

### Cách 2: Dùng SQL Query

```sql
-- Kiểm tra bảng có tồn tại không
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'DeviceTokens'
);

-- Xem cấu trúc bảng
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'DeviceTokens'
ORDER BY ordinal_position;

-- Đếm số records (ban đầu sẽ là 0)
SELECT COUNT(*) FROM "DeviceTokens";
```

**Kết quả mong đợi:**

```
 exists 
--------
 t
(1 row)
```

Và danh sách 8 columns:
- id
- user_id
- token
- platform
- device_info
- is_active
- created_at
- updated_at

---

## ❌ Troubleshooting

### Lỗi: "psql: command not found"

**Nguyên nhân:** PostgreSQL chưa được thêm vào PATH

**Giải pháp:**

1. Tìm đường dẫn PostgreSQL (thường là `C:\Program Files\PostgreSQL\15\bin`)
2. Thêm vào PATH:
   - Windows: System Properties → Environment Variables → Path → Edit → New
   - Thêm: `C:\Program Files\PostgreSQL\15\bin`
3. Mở Command Prompt mới và thử lại

**Hoặc dùng đường dẫn đầy đủ:**

```bash
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d DBEChinese -f migrations/add_device_tokens_table.sql
```

---

### Lỗi: "database DBEChinese does not exist"

**Giải pháp:** Tạo database trước

```bash
psql -U postgres

# Trong psql:
CREATE DATABASE "DBEChinese";
\q
```

Sau đó chạy lại migration.

---

### Lỗi: "relation Users does not exist"

**Nguyên nhân:** Bảng `Users` chưa tồn tại (cần cho foreign key)

**Giải pháp:** Đảm bảo database đã có bảng `Users` trước khi chạy migration này.

**Kiểm tra:**

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'Users'
);
```

---

### Lỗi: "permission denied"

**Giải pháp:** Cấp quyền cho user

```sql
GRANT ALL PRIVILEGES ON DATABASE "DBEChinese" TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
```

---

## ✅ Sau Khi Chạy Migration Thành Công

### 1. Khởi động lại server

```bash
npm start
```

### 2. Kiểm tra log

Phải thấy:

```
✅ Firebase initialized with Service Account file
Server chạy tại http://localhost:5000
```

### 3. Test API

```bash
# Test lưu device token
curl -X POST http://localhost:5000/api/users/device-token \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-token-123",
    "platform": "web"
  }'
```

### 4. Kiểm tra database

```sql
SELECT * FROM "DeviceTokens";
```

Nếu thấy record vừa tạo → Thành công! ✅

---

## 📝 Tóm Tắt

1. **Chạy migration:**
   ```bash
   psql -U postgres -d DBEChinese -f migrations/add_device_tokens_table.sql
   ```

2. **Kiểm tra:**
   ```sql
   \dt "DeviceTokens"
   ```

3. **Khởi động server:**
   ```bash
   npm start
   ```

4. **Test:**
   - Gửi device token từ frontend
   - Gửi test notification
   - Kiểm tra có nhận được không

---

**Nếu vẫn gặp vấn đề, hãy cho mình biết lỗi cụ thể!** 🚀
