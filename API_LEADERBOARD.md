# API Bảng Xếp Hạng (Leaderboard)

## Tổng quan

Hệ thống bảng xếp hạng cho phép xem top 5 người dùng có điểm cao nhất theo:
- **Exam Level** (HSK 1, HSK 2, HSK 3, v.v.)
- **Exam Type** (HSK, HSKK, TOCFL)

## Cách tính điểm xếp hạng

### Nguyên tắc:
1. **Lấy điểm cao nhất** của mỗi người dùng cho **mỗi đề thi khác nhau**
2. **Tổng hợp** các điểm cao nhất đó thành tổng điểm
3. **Tính tất cả** các bài thi đã nộp (có `score_total`)
4. **Xếp hạng** theo:
   - Tổng điểm (cao → thấp)
   - Số đề thi hoàn thành (nhiều → ít) - nếu tổng điểm bằng nhau

### Ví dụ:

**User A** làm trong exam_level "HSK 3":
- Đề thi 1: Làm 3 lần (80, 90, 85) → Lấy 90
- Đề thi 2: Làm 2 lần (75, 88) → Lấy 88
- Đề thi 3: Làm 1 lần (92) → Lấy 92
- **Tổng điểm = 90 + 88 + 92 = 270**

**User B** làm trong exam_level "HSK 3":
- Đề thi 1: Làm 1 lần (95) → Lấy 95
- Đề thi 2: Làm 2 lần (85, 90) → Lấy 90
- **Tổng điểm = 95 + 90 = 185**

→ User A xếp hạng cao hơn User B

---

## 1. API Bảng xếp hạng theo Exam Level

### Endpoint
```
GET /api/leaderboard/exam-level/:examLevelId
```

### Mô tả
Lấy top 5 người dùng có tổng điểm cao nhất trong một exam_level cụ thể (ví dụ: HSK 3).

### Parameters
- `examLevelId` (path, required): UUID của exam level

### Headers
```
Authorization: Bearer <token>
```

### Response Success (200)

```json
{
  "success": true,
  "message": "Lấy bảng xếp hạng thành công",
  "data": [
    {
      "user_id": "uuid",
      "user_name": "Nguyễn Văn A",
      "username": "nguyenvana",
      "avatar_url": "https://example.com/avatar.jpg",
      "total_score": 270,
      "exams_completed": 3,
      "exam_level_name": "HSK 3",
      "rank": 1
    },
    {
      "user_id": "uuid",
      "user_name": "Trần Thị B",
      "username": "tranthib",
      "avatar_url": "https://example.com/avatar2.jpg",
      "total_score": 265,
      "exams_completed": 4,
      "exam_level_name": "HSK 3",
      "rank": 2
    },
    {
      "user_id": "uuid",
      "user_name": "Lê Văn C",
      "username": "levanc",
      "avatar_url": null,
      "total_score": 260,
      "exams_completed": 3,
      "exam_level_name": "HSK 3",
      "rank": 3
    },
    {
      "user_id": "uuid",
      "user_name": "Phạm Thị D",
      "username": "phamthid",
      "avatar_url": "https://example.com/avatar4.jpg",
      "total_score": 255,
      "exams_completed": 2,
      "exam_level_name": "HSK 3",
      "rank": 4
    },
    {
      "user_id": "uuid",
      "user_name": "Hoàng Văn E",
      "username": "hoangvane",
      "avatar_url": "https://example.com/avatar5.jpg",
      "total_score": 250,
      "exams_completed": 3,
      "exam_level_name": "HSK 3",
      "rank": 5
    }
  ]
}
```

### Response Error (500)

```json
{
  "success": false,
  "message": "Lỗi khi lấy bảng xếp hạng",
  "error": "Error message"
}
```

### Giải thích các field

| Field | Type | Mô tả |
|-------|------|-------|
| `user_id` | UUID | ID của người dùng |
| `user_name` | String | Tên hiển thị của người dùng |
| `username` | String | Username của người dùng |
| `avatar_url` | String/null | URL avatar của người dùng |
| `total_score` | Number | Tổng điểm cao nhất từ các đề thi khác nhau |
| `exams_completed` | Number | Số đề thi đã hoàn thành (đạt) |
| `exam_level_name` | String | Tên cấp độ (HSK 1, HSK 2, v.v.) |
| `rank` | Number | Thứ hạng (1-5) |

---

## 2. API Bảng xếp hạng theo Exam Type

### Endpoint
```
GET /api/leaderboard/exam-type/:examTypeId
```

### Mô tả
Lấy top 5 người dùng có tổng điểm cao nhất trong một exam_type cụ thể (ví dụ: HSK - bao gồm tất cả các level HSK 1-6).

### Parameters
- `examTypeId` (path, required): UUID của exam type

### Headers
```
Authorization: Bearer <token>
```

### Response Success (200)

```json
{
  "success": true,
  "message": "Lấy bảng xếp hạng thành công",
  "data": [
    {
      "user_id": "uuid",
      "user_name": "Nguyễn Văn A",
      "username": "nguyenvana",
      "avatar_url": "https://example.com/avatar.jpg",
      "total_score": 1850,
      "exams_completed": 15,
      "exam_type_name": "HSK",
      "rank": 1
    },
    {
      "user_id": "uuid",
      "user_name": "Trần Thị B",
      "username": "tranthib",
      "avatar_url": "https://example.com/avatar2.jpg",
      "total_score": 1820,
      "exams_completed": 18,
      "exam_type_name": "HSK",
      "rank": 2
    },
    {
      "user_id": "uuid",
      "user_name": "Lê Văn C",
      "username": "levanc",
      "avatar_url": null,
      "total_score": 1800,
      "exams_completed": 14,
      "exam_type_name": "HSK",
      "rank": 3
    },
    {
      "user_id": "uuid",
      "user_name": "Phạm Thị D",
      "username": "phamthid",
      "avatar_url": "https://example.com/avatar4.jpg",
      "total_score": 1780,
      "exams_completed": 12,
      "exam_type_name": "HSK",
      "rank": 4
    },
    {
      "user_id": "uuid",
      "user_name": "Hoàng Văn E",
      "username": "hoangvane",
      "avatar_url": "https://example.com/avatar5.jpg",
      "total_score": 1750,
      "exams_completed": 16,
      "exam_type_name": "HSK",
      "rank": 5
    }
  ]
}
```

### Response Error (500)

```json
{
  "success": false,
  "message": "Lỗi khi lấy bảng xếp hạng",
  "error": "Error message"
}
```

### Giải thích các field

| Field | Type | Mô tả |
|-------|------|-------|
| `user_id` | UUID | ID của người dùng |
| `user_name` | String | Tên hiển thị của người dùng |
| `username` | String | Username của người dùng |
| `avatar_url` | String/null | URL avatar của người dùng |
| `total_score` | Number | Tổng điểm cao nhất từ các đề thi khác nhau (tất cả level) |
| `exams_completed` | Number | Số đề thi đã hoàn thành (đạt) |
| `exam_type_name` | String | Tên loại đề thi (HSK, HSKK, TOCFL) |
| `rank` | Number | Thứ hạng (1-5) |

---

## Logic Query SQL

### Bước 1: Lấy điểm cao nhất của mỗi user cho mỗi đề thi
```sql
WITH user_best_scores AS (
  SELECT 
    uea.user_id,
    uea.exam_id,
    MAX(uea.score_total) as best_score
  FROM "User_Exam_Attempts" uea
  JOIN "Exams" e ON uea.exam_id = e.id
  WHERE e.exam_level_id = $1  -- hoặc e.exam_type_id = $1
    AND uea.score_total IS NOT NULL
  GROUP BY uea.user_id, uea.exam_id
)
```

### Bước 2: Tính tổng điểm của các đề thi khác nhau
```sql
user_total_scores AS (
  SELECT 
    user_id,
    SUM(best_score) as total_score,
    COUNT(DISTINCT exam_id) as exams_completed
  FROM user_best_scores
  GROUP BY user_id
)
```

### Bước 3: Join với Users và sắp xếp
```sql
SELECT 
  uts.user_id,
  u.name as user_name,
  u.username,
  u.avatar_url,
  uts.total_score,
  uts.exams_completed,
  el.name as exam_level_name,  -- hoặc et.name as exam_type_name
  ROW_NUMBER() OVER (ORDER BY uts.total_score DESC, uts.exams_completed DESC) as rank
FROM user_total_scores uts
JOIN "Users" u ON uts.user_id = u.id
JOIN "Exam_Levels" el ON el.id = $1  -- hoặc "Exam_Types" et
ORDER BY uts.total_score DESC, uts.exams_completed DESC
LIMIT 5;
```

---

## Use Cases

### 1. Hiển thị bảng xếp hạng HSK 3
```javascript
// Frontend call
const response = await fetch('/api/leaderboard/exam-level/hsk3-uuid', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
const data = await response.json();
// Hiển thị top 5 trong HSK 3
```

### 2. Hiển thị bảng xếp hạng toàn bộ HSK
```javascript
// Frontend call
const response = await fetch('/api/leaderboard/exam-type/hsk-uuid', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
const data = await response.json();
// Hiển thị top 5 trong tất cả các level HSK
```

### 3. So sánh thứ hạng của user hiện tại
```javascript
// Lấy leaderboard
const leaderboard = await getLeaderboard();
const currentUserId = getCurrentUser().id;

// Tìm vị trí của user
const userRank = leaderboard.data.find(u => u.user_id === currentUserId);
if (userRank) {
  console.log(`Bạn đang xếp hạng ${userRank.rank} với ${userRank.total_score} điểm`);
} else {
  console.log('Bạn chưa có trong top 5');
}
```

---

## Lưu ý

1. **Tính tất cả bài đã nộp**: Tất cả bài thi có `score_total IS NOT NULL` đều được tính vào bảng xếp hạng
2. **Điểm cao nhất**: Nếu user làm cùng 1 đề nhiều lần, chỉ lấy điểm cao nhất
3. **Đề thi khác nhau**: Tổng điểm là tổng của các đề thi **khác nhau**, không phải tổng tất cả các lần làm
4. **Top 5**: Chỉ hiển thị 5 người đứng đầu
5. **Tie-breaking**: Nếu tổng điểm bằng nhau, người có nhiều đề thi hoàn thành hơn sẽ xếp trước

---

## Files đã thay đổi

1. **routes/attemptRoutes.js**: Thêm 2 routes mới
   - `GET /leaderboard/exam-level/:examLevelId`
   - `GET /leaderboard/exam-type/:examTypeId`

2. **controllers/attemptController.js**: Thêm 2 controller methods
   - `getLeaderboardByExamLevel`
   - `getLeaderboardByExamType`

3. **services/attemptService.js**: Thêm 2 service methods với SQL queries
   - `getLeaderboardByExamLevel`
   - `getLeaderboardByExamType`
