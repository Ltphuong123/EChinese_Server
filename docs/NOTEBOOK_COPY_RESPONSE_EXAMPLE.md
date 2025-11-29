# 📋 Response Examples - Notebook Copy API

## 🎯 Endpoint

```
GET /api/notebooks/template/:templateId/copy?page=1&limit=20
```

---

## 📥 Response Lần Đầu Tiên (Tạo Mới) - 201 Created

```json
{
  "success": true,
  "message": "Đã tạo bản sao mới của sổ tay.",
  "data": {
    "notebook": {
      "id": "987fcdeb-51a2-43d7-9876-543210fedcba",
      "user_id": "user-uuid-123",
      "name": "HSK 1 - Từ vựng cơ bản",
      "options": {},
      "is_premium": false,
      "status": "published",
      "template_id": "123e4567-e89b-12d3-a456-426614174000",
      "vocab_count": 150,
      "created_at": "2024-01-15T10:30:00Z",
      "vocabularies": {
        "data": [
          {
            "id": "vocab-uuid-1",
            "hanzi": "你好",
            "pinyin": "nǐ hǎo",
            "meaning": "Xin chào",
            "notes": null,
            "level": ["HSK1"],
            "image_url": null,
            "status": "chưa thuộc",
            "added_at": "2024-01-15T10:30:00Z"
          },
          {
            "id": "vocab-uuid-2",
            "hanzi": "谢谢",
            "pinyin": "xiè xiè",
            "meaning": "Cảm ơn",
            "notes": null,
            "level": ["HSK1"],
            "image_url": null,
            "status": "chưa thuộc",
            "added_at": "2024-01-15T10:30:00Z"
          },
          {
            "id": "vocab-uuid-3",
            "hanzi": "再见",
            "pinyin": "zài jiàn",
            "meaning": "Tạm biệt",
            "notes": null,
            "level": ["HSK1"],
            "image_url": null,
            "status": "chưa thuộc",
            "added_at": "2024-01-15T10:30:00Z"
          }
          // ... 17 từ nữa (total 20 từ/trang)
        ],
        "pagination": {
          "page": 1,
          "limit": 20,
          "total": 150,
          "totalPages": 8
        }
      }
    },
    "isNew": true,
    "template": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "HSK 1 - Từ vựng cơ bản"
    }
  }
}
```

---

## 📥 Response Lần Sau (Trả Về Hiện Có) - 200 OK

```json
{
  "success": true,
  "message": "Bạn đã có bản sao của sổ tay này.",
  "data": {
    "notebook": {
      "id": "987fcdeb-51a2-43d7-9876-543210fedcba",
      "user_id": "user-uuid-123",
      "name": "HSK 1 - Từ vựng cơ bản",
      "options": {},
      "is_premium": false,
      "status": "published",
      "template_id": "123e4567-e89b-12d3-a456-426614174000",
      "vocab_count": 150,
      "created_at": "2024-01-15T10:30:00Z",
      "vocabularies": {
        "data": [
          {
            "id": "vocab-uuid-1",
            "hanzi": "你好",
            "pinyin": "nǐ hǎo",
            "meaning": "Xin chào",
            "notes": null,
            "level": ["HSK1"],
            "image_url": null,
            "status": "đã thuộc",
            "added_at": "2024-01-15T10:30:00Z"
          },
          {
            "id": "vocab-uuid-2",
            "hanzi": "谢谢",
            "pinyin": "xiè xiè",
            "meaning": "Cảm ơn",
            "notes": null,
            "level": ["HSK1"],
            "image_url": null,
            "status": "đã thuộc",
            "added_at": "2024-01-15T10:30:00Z"
          },
          {
            "id": "vocab-uuid-3",
            "hanzi": "再见",
            "pinyin": "zài jiàn",
            "meaning": "Tạm biệt",
            "notes": null,
            "level": ["HSK1"],
            "image_url": null,
            "status": "chưa thuộc",
            "added_at": "2024-01-15T10:30:00Z"
          }
          // ... 17 từ nữa
        ],
        "pagination": {
          "page": 1,
          "limit": 20,
          "total": 150,
          "totalPages": 8
        }
      }
    },
    "isNew": false,
    "template": {
      "id": "123e4567-e89b-12d3-a456-426614174000"
    }
  }
}
```

**Lưu ý:** Khi trả về lần sau, status của từ vựng có thể đã thay đổi (ví dụ: "đã thuộc") vì user đã học.

---

## 📥 Response Với Pagination - Trang 2

```
GET /api/notebooks/template/:templateId/copy?page=2&limit=20
```

```json
{
  "success": true,
  "message": "Bạn đã có bản sao của sổ tay này.",
  "data": {
    "notebook": {
      "id": "987fcdeb-51a2-43d7-9876-543210fedcba",
      "user_id": "user-uuid-123",
      "name": "HSK 1 - Từ vựng cơ bản",
      "vocab_count": 150,
      "vocabularies": {
        "data": [
          {
            "id": "vocab-uuid-21",
            "hanzi": "学习",
            "pinyin": "xué xí",
            "meaning": "Học tập",
            "status": "chưa thuộc",
            "added_at": "2024-01-15T10:30:00Z"
          }
          // ... 19 từ nữa (từ 21-40)
        ],
        "pagination": {
          "page": 2,
          "limit": 20,
          "total": 150,
          "totalPages": 8
        }
      }
    },
    "isNew": false
  }
}
```

---

## ❌ Error Response - 404 Not Found

```json
{
  "success": false,
  "message": "Sổ tay hệ thống không tồn tại hoặc chưa được xuất bản."
}
```

---

## ❌ Error Response - 403 Forbidden (Premium Required)

```json
{
  "success": false,
  "message": "Bạn cần có gói premium để sao chép sổ tay này.",
  "requiresPremium": true
}
```

---

## 💻 Frontend Usage Examples

### React - Hiển thị danh sách từ vựng

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const NotebookViewer = ({ templateId, token }) => {
  const [notebook, setNotebook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchNotebook = async () => {
      try {
        const response = await axios.get(
          `/api/notebooks/template/${templateId}/copy?page=${page}&limit=20`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setNotebook(response.data.data.notebook);

        if (response.data.data.isNew) {
          toast.success('Đã tạo bản sao sổ tay mới!');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotebook();
  }, [templateId, page]);

  if (loading) return <div>Đang tải...</div>;

  return (
    <div>
      <h2>{notebook.name}</h2>
      <p>Tổng số từ: {notebook.vocab_count}</p>

      {/* Danh sách từ vựng */}
      <div className="vocabulary-list">
        {notebook.vocabularies.data.map(vocab => (
          <div key={vocab.id} className="vocab-card">
            <h3>{vocab.hanzi}</h3>
            <p className="pinyin">{vocab.pinyin}</p>
            <p className="meaning">{vocab.meaning}</p>
            <span className={`status ${vocab.status}`}>
              {vocab.status}
            </span>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Trang trước
        </button>
        
        <span>
          Trang {notebook.vocabularies.pagination.page} / {notebook.vocabularies.pagination.totalPages}
        </span>
        
        <button 
          onClick={() => setPage(p => p + 1)}
          disabled={page >= notebook.vocabularies.pagination.totalPages}
        >
          Trang sau
        </button>
      </div>
    </div>
  );
};
```

### Vue - Với Infinite Scroll

```vue
<template>
  <div class="notebook-viewer">
    <h2>{{ notebook?.name }}</h2>
    <p>Tổng số từ: {{ notebook?.vocab_count }}</p>

    <div 
      class="vocabulary-list" 
      @scroll="handleScroll"
      ref="scrollContainer"
    >
      <div 
        v-for="vocab in allVocabs" 
        :key="vocab.id" 
        class="vocab-card"
      >
        <h3>{{ vocab.hanzi }}</h3>
        <p class="pinyin">{{ vocab.pinyin }}</p>
        <p class="meaning">{{ vocab.meaning }}</p>
        <span :class="['status', vocab.status]">
          {{ vocab.status }}
        </span>
      </div>

      <div v-if="loading" class="loading">
        Đang tải thêm...
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      notebook: null,
      allVocabs: [],
      page: 1,
      loading: false,
      hasMore: true
    };
  },
  async mounted() {
    await this.loadNotebook();
  },
  methods: {
    async loadNotebook() {
      if (this.loading || !this.hasMore) return;

      this.loading = true;
      try {
        const response = await this.$axios.get(
          `/api/notebooks/template/${this.templateId}/copy?page=${this.page}&limit=20`
        );

        this.notebook = response.data.data.notebook;
        this.allVocabs.push(...response.data.data.notebook.vocabularies.data);

        const pagination = response.data.data.notebook.vocabularies.pagination;
        this.hasMore = this.page < pagination.totalPages;
        this.page++;

        if (response.data.data.isNew) {
          this.$toast.success('Đã tạo bản sao sổ tay mới!');
        }
      } catch (error) {
        console.error(error);
      } finally {
        this.loading = false;
      }
    },
    handleScroll(e) {
      const { scrollTop, scrollHeight, clientHeight } = e.target;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        this.loadNotebook();
      }
    }
  }
};
</script>
```

---

## 🎨 UI/UX Recommendations

### Loading State
```javascript
// Skeleton cho từ vựng
<div className="vocab-skeleton">
  <Skeleton height={30} width="60%" />
  <Skeleton height={20} width="80%" />
  <Skeleton height={20} width="100%" />
</div>
```

### Empty State
```javascript
// Khi sổ tay không có từ vựng
{notebook.vocab_count === 0 && (
  <div className="empty-state">
    <p>Sổ tay này chưa có từ vựng nào</p>
  </div>
)}
```

### Status Badge
```css
.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status.đã-thuộc {
  background: #4caf50;
  color: white;
}

.status.chưa-thuộc {
  background: #9e9e9e;
  color: white;
}

.status.yêu-thích {
  background: #ff9800;
  color: white;
}

.status.không-chắc {
  background: #2196f3;
  color: white;
}
```

---

## 📊 Data Structure

### Notebook Object
```typescript
interface Notebook {
  id: string;
  user_id: string;
  name: string;
  options: object;
  is_premium: boolean;
  status: 'published' | 'draft';
  template_id: string;
  vocab_count: number;
  created_at: string;
  vocabularies: {
    data: Vocabulary[];
    pagination: Pagination;
  };
}
```

### Vocabulary Object
```typescript
interface Vocabulary {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  notes: string | null;
  level: string[];
  image_url: string | null;
  status: 'đã thuộc' | 'chưa thuộc' | 'yêu thích' | 'không chắc';
  added_at: string;
}
```

### Pagination Object
```typescript
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Author:** Development Team
