# 📝 API: Bulk Update Vocabulary Status

## 🎯 Tổng Quan

API cho phép cập nhật trạng thái của nhiều từ vựng trong sổ tay cùng lúc (bulk update).

**Use cases:**
- ✅ Đánh dấu nhiều từ đã học cùng lúc
- ✅ Thêm nhiều từ vào danh sách yêu thích
- ✅ Reset trạng thái của một nhóm từ
- ✅ Tối ưu performance (1 request thay vì nhiều requests)

---

## 📋 API Endpoint

### Bulk Update Vocabulary Status

**Endpoint:** `PUT /api/notebooks/:notebookId/vocabularies/bulk-status`

**Method:** PUT

**Authentication:** Required (JWT Token)

**Parameters:**
- `notebookId` (path, uuid): ID của sổ tay

**Body:**
```json
{
  "updates": [
    {
      "vocabId": "uuid-1",
      "status": "đã thuộc"
    },
    {
      "vocabId": "uuid-2",
      "status": "yêu thích"
    },
    {
      "vocabId": "uuid-3",
      "status": "chưa thuộc"
    }
  ]
}
```

**Valid Status Values:**
- `"đã thuộc"` - Đã học thuộc
- `"chưa thuộc"` - Chưa học
- `"yêu thích"` - Yêu thích
- `"không chắc"` - Không chắc chắn

---

## 📤 Request Examples

### Example 1: Đánh dấu nhiều từ đã học

```bash
PUT /api/notebooks/987fcdeb-51a2-43d7-9876-543210fedcba/vocabularies/bulk-status
Authorization: Bearer <token>
Content-Type: application/json

{
  "updates": [
    {
      "vocabId": "vocab-uuid-1",
      "status": "đã thuộc"
    },
    {
      "vocabId": "vocab-uuid-2",
      "status": "đã thuộc"
    },
    {
      "vocabId": "vocab-uuid-3",
      "status": "đã thuộc"
    }
  ]
}
```

### Example 2: Thêm vào yêu thích

```bash
PUT /api/notebooks/987fcdeb-51a2-43d7-9876-543210fedcba/vocabularies/bulk-status
Authorization: Bearer <token>
Content-Type: application/json

{
  "updates": [
    {
      "vocabId": "vocab-uuid-5",
      "status": "yêu thích"
    },
    {
      "vocabId": "vocab-uuid-6",
      "status": "yêu thích"
    }
  ]
}
```

### Example 3: Reset trạng thái

```bash
PUT /api/notebooks/987fcdeb-51a2-43d7-9876-543210fedcba/vocabularies/bulk-status
Authorization: Bearer <token>
Content-Type: application/json

{
  "updates": [
    {
      "vocabId": "vocab-uuid-10",
      "status": "chưa thuộc"
    },
    {
      "vocabId": "vocab-uuid-11",
      "status": "chưa thuộc"
    },
    {
      "vocabId": "vocab-uuid-12",
      "status": "chưa thuộc"
    }
  ]
}
```

---

## 📥 Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Đã cập nhật thành công 3/3 từ vựng.",
  "data": {
    "updatedCount": 3,
    "total": 3,
    "failed": 0
  }
}
```

**Response Fields:**
- `updatedCount`: Số từ vựng đã cập nhật thành công
- `total`: Tổng số từ vựng trong request
- `failed`: Số từ vựng cập nhật thất bại

### Partial Success Response (200 OK)

```json
{
  "success": true,
  "message": "Đã cập nhật thành công 2/3 từ vựng.",
  "data": {
    "updatedCount": 2,
    "total": 3,
    "failed": 1
  }
}
```

---

## ❌ Error Responses

### 400 Bad Request - Updates rỗng

```json
{
  "success": false,
  "message": "Trường 'updates' phải là một mảng và không được rỗng."
}
```

### 400 Bad Request - Status không hợp lệ

```json
{
  "success": false,
  "message": "Status không hợp lệ: đã học"
}
```

### 400 Bad Request - Thiếu field

```json
{
  "success": false,
  "message": "Mỗi item phải có vocabId và status."
}
```

### 404 Not Found - Notebook không tồn tại

```json
{
  "success": false,
  "message": "Notebook không tồn tại hoặc bạn không có quyền truy cập."
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Lỗi khi cập nhật trạng thái từ vựng",
  "error": "Chi tiết lỗi..."
}
```

---

## 💻 Frontend Integration

### React Example

```javascript
import axios from 'axios';

const BulkUpdateVocabStatus = ({ notebookId, token }) => {
  const [selectedVocabs, setSelectedVocabs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Đánh dấu nhiều từ đã học
  const markAsLearned = async () => {
    setLoading(true);
    try {
      const updates = selectedVocabs.map(vocabId => ({
        vocabId,
        status: 'đã thuộc'
      }));

      const response = await axios.put(
        `/api/notebooks/${notebookId}/vocabularies/bulk-status`,
        { updates },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(response.data.message);
      
      // Refresh danh sách từ vựng
      refreshVocabularies();
      
      // Clear selection
      setSelectedVocabs([]);
    } catch (error) {
      toast.error('Lỗi khi cập nhật trạng thái');
    } finally {
      setLoading(false);
    }
  };

  // Thêm vào yêu thích
  const addToFavorites = async () => {
    const updates = selectedVocabs.map(vocabId => ({
      vocabId,
      status: 'yêu thích'
    }));

    try {
      await axios.put(
        `/api/notebooks/${notebookId}/vocabularies/bulk-status`,
        { updates },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Đã thêm vào yêu thích');
    } catch (error) {
      toast.error('Lỗi khi thêm vào yêu thích');
    }
  };

  return (
    <div>
      <div className="bulk-actions">
        <button 
          onClick={markAsLearned}
          disabled={selectedVocabs.length === 0 || loading}
        >
          Đánh dấu đã học ({selectedVocabs.length})
        </button>
        
        <button 
          onClick={addToFavorites}
          disabled={selectedVocabs.length === 0}
        >
          Thêm vào yêu thích
        </button>
      </div>

      {/* Vocabulary list with checkboxes */}
      <VocabularyList 
        selectedVocabs={selectedVocabs}
        onSelect={setSelectedVocabs}
      />
    </div>
  );
};
```

### Vue Example

```vue
<template>
  <div class="bulk-update-container">
    <!-- Bulk actions toolbar -->
    <div v-if="selectedVocabs.length > 0" class="bulk-actions">
      <span>Đã chọn: {{ selectedVocabs.length }} từ</span>
      
      <button @click="updateStatus('đã thuộc')" :disabled="loading">
        ✓ Đánh dấu đã học
      </button>
      
      <button @click="updateStatus('yêu thích')" :disabled="loading">
        ★ Yêu thích
      </button>
      
      <button @click="updateStatus('chưa thuộc')" :disabled="loading">
        ↺ Reset
      </button>
      
      <button @click="clearSelection">
        ✕ Bỏ chọn
      </button>
    </div>

    <!-- Vocabulary list -->
    <div class="vocab-list">
      <div 
        v-for="vocab in vocabularies" 
        :key="vocab.id"
        class="vocab-item"
      >
        <input 
          type="checkbox"
          :value="vocab.id"
          v-model="selectedVocabs"
        />
        
        <div class="vocab-content">
          <h3>{{ vocab.hanzi }}</h3>
          <p>{{ vocab.pinyin }}</p>
          <p>{{ vocab.meaning }}</p>
          <span :class="['status', vocab.status]">
            {{ vocab.status }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      selectedVocabs: [],
      loading: false
    };
  },
  methods: {
    async updateStatus(status) {
      this.loading = true;
      
      try {
        const updates = this.selectedVocabs.map(vocabId => ({
          vocabId,
          status
        }));

        const response = await this.$axios.put(
          `/api/notebooks/${this.notebookId}/vocabularies/bulk-status`,
          { updates }
        );

        this.$toast.success(response.data.message);
        
        // Refresh danh sách
        await this.fetchVocabularies();
        
        // Clear selection
        this.selectedVocabs = [];
      } catch (error) {
        this.$toast.error('Lỗi khi cập nhật trạng thái');
      } finally {
        this.loading = false;
      }
    },
    
    clearSelection() {
      this.selectedVocabs = [];
    }
  }
};
</script>
```

### JavaScript (Vanilla)

```javascript
// Bulk update function
async function bulkUpdateVocabStatus(notebookId, updates, token) {
  try {
    const response = await fetch(
      `/api/notebooks/${notebookId}/vocabularies/bulk-status`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ updates })
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log(`Updated ${data.data.updatedCount} vocabularies`);
      return data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error updating vocabularies:', error);
    throw error;
  }
}

// Usage
const selectedVocabIds = ['uuid-1', 'uuid-2', 'uuid-3'];
const updates = selectedVocabIds.map(vocabId => ({
  vocabId,
  status: 'đã thuộc'
}));

bulkUpdateVocabStatus(notebookId, updates, token)
  .then(result => {
    alert(`Đã cập nhật ${result.data.updatedCount} từ vựng`);
  })
  .catch(error => {
    alert('Lỗi: ' + error.message);
  });
```

---

## 🎨 UI/UX Examples

### Bulk Actions Toolbar

```jsx
const BulkActionsToolbar = ({ selectedCount, onAction }) => {
  if (selectedCount === 0) return null;

  return (
    <div className="bulk-actions-toolbar">
      <span className="selected-count">
        Đã chọn: {selectedCount} từ
      </span>
      
      <div className="actions">
        <button 
          className="btn-success"
          onClick={() => onAction('đã thuộc')}
        >
          <CheckIcon /> Đã học
        </button>
        
        <button 
          className="btn-warning"
          onClick={() => onAction('yêu thích')}
        >
          <StarIcon /> Yêu thích
        </button>
        
        <button 
          className="btn-secondary"
          onClick={() => onAction('chưa thuộc')}
        >
          <ResetIcon /> Reset
        </button>
        
        <button 
          className="btn-info"
          onClick={() => onAction('không chắc')}
        >
          <QuestionIcon /> Không chắc
        </button>
      </div>
    </div>
  );
};
```

### Select All Checkbox

```jsx
const VocabularyListWithSelectAll = ({ vocabularies }) => {
  const [selectedVocabs, setSelectedVocabs] = useState([]);

  const allSelected = selectedVocabs.length === vocabularies.length;
  const someSelected = selectedVocabs.length > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedVocabs([]);
    } else {
      setSelectedVocabs(vocabularies.map(v => v.id));
    }
  };

  return (
    <div>
      <div className="select-all">
        <input 
          type="checkbox"
          checked={allSelected}
          indeterminate={someSelected}
          onChange={toggleSelectAll}
        />
        <label>Chọn tất cả</label>
      </div>

      {vocabularies.map(vocab => (
        <VocabItem 
          key={vocab.id}
          vocab={vocab}
          selected={selectedVocabs.includes(vocab.id)}
          onSelect={(id) => {
            if (selectedVocabs.includes(id)) {
              setSelectedVocabs(selectedVocabs.filter(v => v !== id));
            } else {
              setSelectedVocabs([...selectedVocabs, id]);
            }
          }}
        />
      ))}
    </div>
  );
};
```

---

## 🔍 Use Cases

### Use Case 1: Hoàn thành bài học

```javascript
// User hoàn thành 1 bài học với 10 từ vựng
const lessonVocabIds = [
  'vocab-1', 'vocab-2', 'vocab-3', 'vocab-4', 'vocab-5',
  'vocab-6', 'vocab-7', 'vocab-8', 'vocab-9', 'vocab-10'
];

const updates = lessonVocabIds.map(vocabId => ({
  vocabId,
  status: 'đã thuộc'
}));

await bulkUpdateVocabStatus(notebookId, updates, token);
// → Cập nhật 10 từ cùng lúc thay vì 10 requests riêng lẻ
```

### Use Case 2: Ôn tập lại

```javascript
// User muốn ôn tập lại các từ đã học
// Reset trạng thái về "chưa thuộc"
const learnedVocabs = vocabularies
  .filter(v => v.status === 'đã thuộc')
  .map(v => v.id);

const updates = learnedVocabs.map(vocabId => ({
  vocabId,
  status: 'chưa thuộc'
}));

await bulkUpdateVocabStatus(notebookId, updates, token);
```

### Use Case 3: Tạo danh sách ôn tập

```javascript
// User chọn các từ khó để ôn tập
const difficultVocabs = ['vocab-15', 'vocab-23', 'vocab-31'];

const updates = difficultVocabs.map(vocabId => ({
  vocabId,
  status: 'không chắc'
}));

await bulkUpdateVocabStatus(notebookId, updates, token);
```

---

## 📊 Performance

### Comparison

**Before (Individual Updates):**
```
10 từ vựng = 10 requests = ~1000ms
100 từ vựng = 100 requests = ~10000ms
```

**After (Bulk Update):**
```
10 từ vựng = 1 request = ~100ms
100 từ vựng = 1 request = ~500ms
```

**Improvement:** 10-20x faster! 🚀

---

## 🔐 Security

### Authorization
- ✅ Chỉ owner của notebook mới có quyền cập nhật
- ✅ Kiểm tra quyền trước khi thực hiện transaction

### Validation
- ✅ Validate status values
- ✅ Validate vocabId format
- ✅ Validate array không rỗng

### Transaction
- ✅ Sử dụng database transaction
- ✅ Rollback nếu có lỗi
- ✅ Đảm bảo data consistency

---

## 🧪 Testing

### Test với cURL

```bash
# Test bulk update
curl -X PUT http://localhost:3000/api/notebooks/{notebook-id}/vocabularies/bulk-status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {"vocabId": "uuid-1", "status": "đã thuộc"},
      {"vocabId": "uuid-2", "status": "đã thuộc"}
    ]
  }'
```

### Test với Postman

1. Method: PUT
2. URL: `http://localhost:3000/api/notebooks/{notebook-id}/vocabularies/bulk-status`
3. Headers:
   - Authorization: Bearer {token}
   - Content-Type: application/json
4. Body (raw JSON):
```json
{
  "updates": [
    {"vocabId": "uuid-1", "status": "đã thuộc"},
    {"vocabId": "uuid-2", "status": "yêu thích"}
  ]
}
```

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Author:** Development Team
