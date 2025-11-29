# 📋 API: Get All Unsynced Changes

## 🎯 Tổng Quan

API lấy tất cả thay đổi chưa đồng bộ cho TẤT CẢ sổ tay sao chép của user.

**Đặc điểm:**
- ✅ Quét tất cả sổ tay của user
- ✅ Chỉ kiểm tra sổ tay có `template_id` (là bản sao)
- ✅ Trả về chi tiết thay đổi cho từng sổ tay
- ✅ Đếm số lượng sổ tay cần đồng bộ
- ✅ Hiển thị badge "Có X sổ tay cần cập nhật"

---

## 📋 API Endpoint

### Get All Unsynced Changes

**Endpoint:** `GET /api/notebooks/sync/all-changes`

**Method:** GET

**Authentication:** Required (JWT Token)

---

## 📤 Request

```bash
GET /api/notebooks/sync/all-changes
Authorization: Bearer <token>
```

---

## 📥 Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Có 2 sổ tay cần đồng bộ.",