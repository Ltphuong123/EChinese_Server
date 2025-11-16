# API Quản Lý Thứ Tự Exam Levels

## Tổng quan

API này cho phép admin thiết lập thứ tự hiển thị cho các cấp độ bài thi (Exam Levels). Khi gọi API lấy danh sách, các cấp độ sẽ được sắp xếp theo thứ tự đã thiết lập.

## Endpoints

### 1. Set Order cho Exam Levels

```
PUT /api/admin/exams/levels/order
```

#### Quyền truy cập
- **Admin** (role: `admin` hoặc `super admin`)
- Yêu cầu JWT token trong header

#### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body

```json
{
  "levels": [
    { "id": "uuid-1", "order": 1 },
    { "id": "uuid-2", "order": 2 },
    { "id": "uuid-3", "order": 3 }
  ]
}
```

**Parameters:**
- `levels` (array, required): Mảng các object chứa id và order
  - `id` (UUID, required): ID của exam level
  - `order` (number, required): Thứ tự hiển thị (số nguyên)

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Cập nhật thứ tự cấp độ bài thi thành công.",
  "data": [
    {
      "id": "uuid-1",
      "exam_type_id": "type-uuid",
      "name": "HSK 1",
      "order": 1,
      "is_deleted": false,
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-15T11:00:00.000Z"
    },
    {
      "id": "uuid-2",
      "exam_type_id": "type-uuid",
      "name": "HSK 2",
      "order": 2,
      "is_deleted": false,
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

#### Error Responses

**400 Bad Request - Thiếu levels**
```json
{
  "success": false,
  "message": "Trường 'levels' phải là một mảng không rỗng với định dạng [{ id, order }, ...]"
}
```

**400 Bad Request - Dữ liệu không hợp lệ**
```json
{
  "success": false,
  "message": "Mỗi phần tử trong 'levels' phải có 'id' và 'order' (số)"
}
```

**401 Unauthorized**
```json
{
  "success": false,
  "message": "Không có token, truy cập bị từ chối"
}
```

**403 Forbidden**
```json
{
  "success": false,
  "message": "Truy cập bị từ chối, chỉ dành cho admin"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Lỗi khi cập nhật thứ tự cấp độ bài thi",
  "error": "Chi tiết lỗi..."
}
```

### 2. Get All Exam Levels (Đã cập nhật)

```
GET /api/exams/levels?examTypeId=<uuid>
```

#### Quyền truy cập
- **User** (đã đăng nhập)
- Yêu cầu JWT token trong header

#### Query Parameters
- `examTypeId` (UUID, optional): Lọc theo loại bài thi

#### Response

Các exam levels sẽ được sắp xếp theo:
1. Tên loại bài thi (exam_type_name)
2. **Thứ tự order** (ASC)

```json
{
  "success": true,
  "message": "Lấy danh sách cấp độ bài thi thành công.",
  "data": [
    {
      "id": "uuid-1",
      "exam_type_id": "type-uuid",
      "name": "HSK 1",
      "order": 1,
      "exam_type_name": "HSK",
      "is_deleted": false,
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-15T11:00:00.000Z"
    },
    {
      "id": "uuid-2",
      "exam_type_id": "type-uuid",
      "name": "HSK 2",
      "order": 2,
      "exam_type_name": "HSK",
      "is_deleted": false,
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

## Ví dụ sử dụng

### cURL - Set Order

```bash
curl -X PUT \
  'http://localhost:5000/api/admin/exams/levels/order' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "levels": [
      { "id": "123e4567-e89b-12d3-a456-426614174001", "order": 1 },
      { "id": "123e4567-e89b-12d3-a456-426614174002", "order": 2 },
      { "id": "123e4567-e89b-12d3-a456-426614174003", "order": 3 }
    ]
  }'
```

### JavaScript (Fetch API)

```javascript
const setExamLevelsOrder = async (levels) => {
  try {
    const response = await fetch(
      'http://localhost:5000/api/admin/exams/levels/order',
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ levels })
      }
    );

    const data = await response.json();
    
    if (data.success) {
      console.log('Cập nhật thành công:', data.message);
      return data.data;
    } else {
      console.error('Lỗi:', data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Lỗi khi cập nhật thứ tự:', error);
    throw error;
  }
};

// Sử dụng
const newOrder = [
  { id: '123e4567-e89b-12d3-a456-426614174001', order: 1 },
  { id: '123e4567-e89b-12d3-a456-426614174002', order: 2 },
  { id: '123e4567-e89b-12d3-a456-426614174003', order: 3 }
];

setExamLevelsOrder(newOrder)
  .then(result => console.log('Đã cập nhật:', result))
  .catch(error => console.error('Lỗi:', error));
```

### Axios

```javascript
import axios from 'axios';

const setExamLevelsOrder = async (levels) => {
  try {
    const response = await axios.put(
      'http://localhost:5000/api/admin/exams/levels/order',
      { levels },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};
```

### React Component Example

```javascript
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const ExamLevelsOrderManager = () => {
  const [levels, setLevels] = useState([]);

  useEffect(() => {
    fetchExamLevels();
  }, []);

  const fetchExamLevels = async () => {
    const response = await fetch('/api/exams/levels', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setLevels(data.data);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(levels);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state
    setLevels(items);

    // Prepare data for API
    const newOrder = items.map((item, index) => ({
      id: item.id,
      order: index + 1
    }));

    // Save to backend
    try {
      await setExamLevelsOrder(newOrder);
      alert('Cập nhật thứ tự thành công!');
    } catch (error) {
      alert('Lỗi: ' + error.message);
      // Revert on error
      fetchExamLevels();
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="levels">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {levels.map((level, index) => (
              <Draggable key={level.id} draggableId={level.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      padding: '16px',
                      margin: '8px 0',
                      background: 'white',
                      border: '1px solid #ddd',
                      ...provided.draggableProps.style
                    }}
                  >
                    {level.order}. {level.name}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default ExamLevelsOrderManager;
```

## Flow xử lý

```
1. Admin kéo thả để sắp xếp lại thứ tự trong UI
   ↓
2. Frontend tạo mảng levels với order mới
   ↓
3. Gửi request PUT với mảng levels
   ↓
4. Backend validate dữ liệu
   ↓
5. Backend bắt đầu transaction
   ↓
6. Backend cập nhật order cho từng level
   ↓
7. Backend commit transaction
   ↓
8. Trả về danh sách levels đã cập nhật
   ↓
9. Frontend hiển thị thông báo thành công
```

## Lưu ý quan trọng

### 1. Transaction
API sử dụng transaction để đảm bảo:
- Tất cả order được cập nhật cùng lúc
- Nếu có lỗi, tất cả thay đổi sẽ được rollback
- Đảm bảo tính toàn vẹn dữ liệu

### 2. Order Number
- Order là số nguyên (integer)
- Không bắt buộc phải liên tục (1, 2, 3...) - có thể là (10, 20, 30...)
- Cho phép chèn giữa dễ dàng hơn

### 3. Sorting
Khi gọi `GET /api/exams/levels`, kết quả được sắp xếp theo:
```sql
ORDER BY exam_type_name, "order" ASC
```

### 4. Best Practices

#### Sử dụng order với khoảng cách
```javascript
// ✅ Tốt - Dễ chèn giữa
const levels = [
  { id: 'uuid-1', order: 10 },
  { id: 'uuid-2', order: 20 },
  { id: 'uuid-3', order: 30 }
];

// Chèn giữa level 1 và 2
const newLevel = { id: 'uuid-4', order: 15 };

// ❌ Không tốt - Khó chèn giữa
const levels = [
  { id: 'uuid-1', order: 1 },
  { id: 'uuid-2', order: 2 },
  { id: 'uuid-3', order: 3 }
];
```

#### Batch update
```javascript
// ✅ Tốt - Cập nhật tất cả cùng lúc
await setExamLevelsOrder([
  { id: 'uuid-1', order: 1 },
  { id: 'uuid-2', order: 2 },
  { id: 'uuid-3', order: 3 }
]);

// ❌ Không tốt - Cập nhật từng cái một
for (const level of levels) {
  await updateSingleLevel(level.id, level.order);
}
```

## Testing

### Test Case 1: Cập nhật thứ tự thành công

```bash
# 1. Lấy danh sách hiện tại
GET /api/exams/levels

# 2. Đảo ngược thứ tự
PUT /api/admin/exams/levels/order
{
  "levels": [
    { "id": "uuid-3", "order": 1 },
    { "id": "uuid-2", "order": 2 },
    { "id": "uuid-1", "order": 3 }
  ]
}

# 3. Verify
GET /api/exams/levels
# Kết quả mong đợi: Thứ tự đã thay đổi
```

### Test Case 2: Validation error

```bash
PUT /api/admin/exams/levels/order
{
  "levels": [
    { "id": "uuid-1" }  # Thiếu order
  ]
}

# Kết quả mong đợi: 400 Bad Request
```

### Test Case 3: Transaction rollback

```bash
PUT /api/admin/exams/levels/order
{
  "levels": [
    { "id": "uuid-1", "order": 1 },
    { "id": "invalid-uuid", "order": 2 }  # ID không tồn tại
  ]
}

# Kết quả mong đợi: 500 Error, không có level nào được cập nhật
```

## Troubleshooting

### Lỗi: "Trường 'levels' phải là một mảng không rỗng"
- Kiểm tra body request có đúng format không
- Đảm bảo gửi mảng levels

### Lỗi: "Mỗi phần tử trong 'levels' phải có 'id' và 'order'"
- Kiểm tra mỗi object trong mảng có đủ id và order
- Đảm bảo order là số, không phải string

### Order không thay đổi sau khi cập nhật
- Kiểm tra cache
- Refresh lại trang
- Kiểm tra database trực tiếp

## Related APIs

- `POST /api/admin/exams/levels` - Tạo exam level mới
- `GET /api/exams/levels` - Lấy danh sách exam levels (đã sắp xếp theo order)
- `DELETE /api/admin/exams/levels/:id` - Xóa exam level
