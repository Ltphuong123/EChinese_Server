# Test API - Moderation (Báo cáo & Vi phạm)

## Base URL
```

```

## Authentication
Tất cả các API dưới đây yêu cầu:
- **Bearer Token** (Admin role)
- Header: `Authorization: Bearer YOUR_ADMIN_TOKEN`

---

## 1. API Lấy danh sách Báo cáo (Reports)

### Endpoint
```
GET /api/moderation/reports
```

### Query Parameters

| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| page | number | 1 | Số trang |
| limit | number | 10 | Số lượng mỗi trang |
| status | string | all | Trạng thái: 'all', 'pending', 'resolved', 'dismissed' |
| target_type | string | all | Loại mục tiêu: 'all', 'post', 'comment', 'user' |
| search | string | - | Tìm kiếm theo nội dung |

### Link Test

**1. Lấy tất cả báo cáo (mặc định):**
```
/moderation/reports?page=1&limit=10
```

**2. Lọc báo cáo đang chờ xử lý:**
```
/moderation/reports?status=pending&page=1&limit=10
```

**3. Lọc báo cáo đã giải quyết:**
```
/moderation/reports?status=resolved&page=1&limit=10
```

**4. Lọc báo cáo về bài viết:**
```
/moderation/reports?target_type=post&page=1&limit=10
```

**5. Lọc báo cáo về bình luận:**
```
/moderation/reports?target_type=comment&page=1&limit=10
```

**6. Kết hợp nhiều filter:**
```
/moderation/reports?status=pending&target_type=post&page=1&limit=20
```

**7. Tìm kiếm:**
```
/moderation/reports?search=spam&page=1&limit=10
```

### Response Example
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "reporter_id": "uuid",
        "target_type": "post",
        "target_id": "uuid",
        "target_user_id": "uuid",
        "reason": "spam",
        "description": "Bài viết spam quảng cáo",
        "status": "pending",
        "resolved_by": null,
        "resolution": null,
        "created_at": "2025-11-22T10:00:00Z",
        "resolved_at": null
      }
    ],
    "meta": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

### cURL Example
```bash
curl -X GET "/moderation/reports?page=1&limit=10&status=pending" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 2. API Lấy danh sách Vi phạm (Violations)

### Endpoint
```
GET /api/moderation/violations
```

### Query Parameters

| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| page | number | 1 | Số trang |
| limit | number | 10 | Số lượng mỗi trang |
| search | string | - | Tìm kiếm theo username hoặc email |
| severity | string | all | Mức độ: 'all', 'low', 'medium', 'high' |
| targetType | string | all | Loại mục tiêu: 'all', 'post', 'comment' |

### Link Test

**1. Lấy tất cả vi phạm (mặc định):**
```
/moderation/violations?page=1&limit=10
```

**2. Lọc vi phạm mức độ cao:**
```
/moderation/violations?severity=high&page=1&limit=10
```

**3. Lọc vi phạm mức độ trung bình:**
```
/moderation/violations?severity=medium&page=1&limit=10
```

**4. Lọc vi phạm mức độ thấp:**
```
/moderation/violations?severity=low&page=1&limit=10
```

**5. Lọc vi phạm về bài viết:**
```
/moderation/violations?targetType=post&page=1&limit=10
```

**6. Lọc vi phạm về bình luận:**
```
/moderation/violations?targetType=comment&page=1&limit=10
```

**7. Tìm kiếm theo username:**
```
/moderation/violations?search=john_doe&page=1&limit=10
```

**8. Kết hợp nhiều filter:**
```
/moderation/violations?severity=high&targetType=post&page=1&limit=20
```

**9. Lấy nhiều kết quả hơn:**
```
/moderation/violations?page=1&limit=50
```

### Response Example
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "username": "john_doe",
        "email": "john@example.com",
        "target_type": "post",
        "target_id": "uuid",
        "severity": "high",
        "detected_by": "admin",
        "handled": true,
        "resolution": "Bài viết đã bị gỡ do vi phạm",
        "resolved_at": "2025-11-22T10:30:00Z",
        "created_at": "2025-11-22T10:00:00Z"
      }
    ],
    "meta": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10
    }
  }
}
```

### cURL Example
```bash
curl -X GET "/moderation/violations?page=1&limit=10&severity=high" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 3. API Lấy danh sách Khiếu nại (Appeals)

### Endpoint
```
GET /api/moderation/appeals
```

### Query Parameters

| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| page | number | 1 | Số trang |
| limit | number | 10 | Số lượng mỗi trang |
| status | string | all | Trạng thái: 'all', 'pending', 'accepted', 'rejected' |
| search | string | - | Tìm kiếm theo username |

### Link Test

**1. Lấy tất cả khiếu nại (mặc định):**
```
/moderation/appeals?page=1&limit=10
```

**2. Lọc khiếu nại đang chờ xử lý:**
```
/moderation/appeals?status=pending&page=1&limit=10
```

**3. Lọc khiếu nại đã chấp nhận:**
```
/moderation/appeals?status=accepted&page=1&limit=10
```

**4. Lọc khiếu nại đã từ chối:**
```
/moderation/appeals?status=rejected&page=1&limit=10
```

**5. Tìm kiếm theo username:**
```
/moderation/appeals?search=john_doe&page=1&limit=10
```

**6. Kết hợp filter:**
```
/moderation/appeals?status=pending&page=1&limit=20
```

**7. Lấy nhiều kết quả:**
```
/moderation/appeals?page=1&limit=50
```

### Response Example
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "violation_id": "uuid",
        "user_id": "uuid",
        "username": "john_doe",
        "email": "john@example.com",
        "reason": "Tôi không vi phạm, đây là hiểu lầm",
        "status": "pending",
        "reviewed_by": null,
        "admin_notes": null,
        "created_at": "2025-11-22T11:00:00Z",
        "reviewed_at": null
      }
    ],
    "meta": {
      "total": 30,
      "page": 1,
      "limit": 10,
      "totalPages": 3
    }
  }
}
```
