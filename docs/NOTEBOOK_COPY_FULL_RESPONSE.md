# 📋 Response Examples - Notebook Copy API (Full Details)

## 🎯 Endpoint

```
GET /api/notebooks/template/:templateId/copy
```

---

## 📥 Response 1: Lấy TẤT CẢ từ vựng (Không phân trang)

**Request:**
```bash
GET /api/notebooks/template/123e4567-e89b-12d3-a456-426614174000/copy
# Không truyền page/limit
```

**Response (201 Created - Lần đầu):**
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
            "notes": "Lời chào phổ biến nhất",
            "level": ["HSK1"],
            "image_url": "https://example.com/images/nihao.jpg",
            "status": "chưa thuộc",
            "added_at": "2024-01-15T10:30:00Z",
            "word_types": ["Động từ", "Thán từ"]
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
            "added_at": "2024-01-15T10:30:00Z",
            "word_types": ["Động từ"]
          },
          {
            "id": "vocab-uuid-3",
            "hanzi": "再见",
            "pinyin": "zài jiàn",
            "meaning": "Tạm biệt",
            "notes": "Dùng khi chia tay",
            "level": ["HSK1"],
            "image_url": null,
            "status": "chưa thuộc",
            "added_at": "2024-01-15T10:30:00Z",
            "word_types": ["Động từ", "Cụm từ"]
          },
          {
            "id": "vocab-uuid-4",
            "hanzi": "学生",
            "pinyin": "xué shēng",
            "meaning": "Học sinh, sinh viên",
            "notes": null,
            "level": ["HSK1"],
            "image_url": null,
            "status": "chưa thuộc",
            "added_at": "2024-01-15T10:30:00Z",
            "word_types": ["Danh từ"]
          },
          {
            "id": "vocab-uuid-5",
            "hanzi": "老师",
            "pinyin": "lǎo shī",
            "meaning": "Giáo viên",
            "notes": null,
            "level": ["HSK1"],
            "image_url": null,
            "status": "chưa thuộc",
            "added_at": "2024-01-15T10:30:00Z",
            "word_types": ["Danh từ"]
          }
          // ... 145 từ nữa (tổng 150 từ)
        ],
        "total": 150
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

## 📥 Response 2: Với Phân Trang

**Request:**
```bash
GET /api/notebooks/template/123e4567-e89b-12d3-a456-426614174000/copy?page=1&limit=20
```

**Response (200 OK - Đã có):**
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
            "notes": "Lời chào phổ biến nhất",
            "level": ["HSK1"],
            "image_url": "https://example.com/images/nihao.jpg",
            "status": "đã thuộc",
            "added_at": "2024-01-15T10:30:00Z",
            "word_types": ["Động từ", "Thán từ"]
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
            "added_at": "2024-01-15T10:30:00Z",
            "word_types": ["Động từ"]
          }
          // ... 18 từ nữa (tổng 20 từ/trang)
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

---

## 📊 Chi Tiết Từ Vựng

### Vocabulary Object Structure

```typescript
interface Vocabulary {
  id: string;                    // UUID của từ vựng
  hanzi: string;                 // Chữ Hán: "你好"
  pinyin: string;                // Phiên âm: "nǐ hǎo"
  meaning: string;               // Nghĩa tiếng Việt: "Xin chào"
  notes: string | null;          // Ghi chú thêm
  level: string[];               // Cấp độ HSK: ["HSK1", "HSK2"]
  image_url: string | null;      // URL hình ảnh minh họa
  status: string;                // Trạng thái học: "đã thuộc" | "chưa thuộc" | "yêu thích" | "không chắc"
  added_at: string;              // Thời gian thêm vào sổ tay
  word_types: string[];          // Loại từ: ["Danh từ", "Động từ", "Tính từ", ...]
}
```

### Word Types (Loại từ)

Các giá trị có thể có trong `word_types`:
- **Danh từ** (Noun)
- **Đại từ** (Pronoun)
- **Động từ** (Verb)
- **Tính từ** (Adjective)
- **Trạng từ** (Adverb)
- **Giới từ** (Preposition)
- **Liên từ** (Conjunction)
- **Trợ từ** (Particle)
- **Thán từ** (Interjection)
- **Số từ** (Numeral)
- **Lượng từ** (Measure word)
- **Thành phần câu** (Sentence component)
- **Cụm từ** (Phrase)

---

## 💻 Frontend Usage Examples

### React - Lấy tất cả từ vựng

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const FullNotebookViewer = ({ templateId, token }) => {
  const [notebook, setNotebook] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFullNotebook = async () => {
      try {
        // Không truyền page/limit -> lấy tất cả
        const response = await axios.get(
          `/api/notebooks/template/${templateId}/copy`,
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

    fetchFullNotebook();
  }, [templateId]);

  if (loading) return <div>Đang tải...</div>;

  return (
    <div>
      <h2>{notebook.name}</h2>
      <p>Tổng số từ: {notebook.vocabularies.total}</p>

      {/* Hiển thị TẤT CẢ từ vựng */}
      <div className="vocabulary-list">
        {notebook.vocabularies.data.map(vocab => (
          <VocabCard key={vocab.id} vocab={vocab} />
        ))}
      </div>
    </div>
  );
};

// Component hiển thị từ vựng
const VocabCard = ({ vocab }) => {
  return (
    <div className="vocab-card">
      <div className="vocab-header">
        <h3>{vocab.hanzi}</h3>
        <span className={`status ${vocab.status}`}>
          {vocab.status}
        </span>
      </div>
      
      <p className="pinyin">{vocab.pinyin}</p>
      <p className="meaning">{vocab.meaning}</p>
      
      {vocab.notes && (
        <p className="notes">📝 {vocab.notes}</p>
      )}
      
      {vocab.image_url && (
        <img src={vocab.image_url} alt={vocab.hanzi} />
      )}
      
      {/* Hiển thị loại từ */}
      <div className="word-types">
        {vocab.word_types.map((type, index) => (
          <span key={index} className="word-type-badge">
            {type}
          </span>
        ))}
      </div>
      
      {/* Hiển thị cấp độ */}
      <div className="levels">
        {vocab.level.map((lvl, index) => (
          <span key={index} className="level-badge">
            {lvl}
          </span>
        ))}
      </div>
    </div>
  );
};
```

### React - Với phân trang

```javascript
const PaginatedNotebookViewer = ({ templateId, token }) => {
  const [notebook, setNotebook] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotebook = async () => {
      setLoading(true);
      try {
        // Truyền page/limit -> phân trang
        const response = await axios.get(
          `/api/notebooks/template/${templateId}/copy?page=${page}&limit=20`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setNotebook(response.data.data.notebook);
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
          <VocabCard key={vocab.id} vocab={vocab} />
        ))}
      </div>

      {/* Pagination */}
      <Pagination 
        current={page}
        total={notebook.vocabularies.pagination.totalPages}
        onChange={setPage}
      />
    </div>
  );
};
```

### Vue - Lấy tất cả với search/filter

```vue
<template>
  <div class="notebook-viewer">
    <h2>{{ notebook?.name }}</h2>
    
    <!-- Search box -->
    <input 
      v-model="searchQuery" 
      placeholder="Tìm kiếm từ vựng..."
      class="search-input"
    />
    
    <!-- Filter by status -->
    <select v-model="filterStatus">
      <option value="">Tất cả</option>
      <option value="đã thuộc">Đã thuộc</option>
      <option value="chưa thuộc">Chưa thuộc</option>
      <option value="yêu thích">Yêu thích</option>
      <option value="không chắc">Không chắc</option>
    </select>
    
    <!-- Filter by word type -->
    <select v-model="filterWordType">
      <option value="">Tất cả loại từ</option>
      <option value="Danh từ">Danh từ</option>
      <option value="Động từ">Động từ</option>
      <option value="Tính từ">Tính từ</option>
    </select>

    <p>Hiển thị: {{ filteredVocabs.length }} / {{ notebook?.vocabularies.total }}</p>

    <!-- Vocabulary list -->
    <div class="vocabulary-list">
      <VocabCard 
        v-for="vocab in filteredVocabs" 
        :key="vocab.id" 
        :vocab="vocab"
      />
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      notebook: null,
      searchQuery: '',
      filterStatus: '',
      filterWordType: ''
    };
  },
  computed: {
    filteredVocabs() {
      if (!this.notebook) return [];
      
      let vocabs = this.notebook.vocabularies.data;
      
      // Filter by search query
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        vocabs = vocabs.filter(v => 
          v.hanzi.includes(query) ||
          v.pinyin.toLowerCase().includes(query) ||
          v.meaning.toLowerCase().includes(query)
        );
      }
      
      // Filter by status
      if (this.filterStatus) {
        vocabs = vocabs.filter(v => v.status === this.filterStatus);
      }
      
      // Filter by word type
      if (this.filterWordType) {
        vocabs = vocabs.filter(v => 
          v.word_types.includes(this.filterWordType)
        );
      }
      
      return vocabs;
    }
  },
  async mounted() {
    try {
      // Lấy tất cả từ vựng (không phân trang)
      const response = await this.$axios.get(
        `/api/notebooks/template/${this.templateId}/copy`
      );
      
      this.notebook = response.data.data.notebook;
    } catch (error) {
      console.error(error);
    }
  }
};
</script>
```

---

## 🎨 CSS Styling Examples

```css
/* Vocab Card */
.vocab-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  background: white;
}

.vocab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.vocab-card h3 {
  font-size: 24px;
  margin: 0;
  color: #333;
}

.pinyin {
  color: #666;
  font-style: italic;
  margin: 4px 0;
}

.meaning {
  font-size: 16px;
  color: #333;
  margin: 8px 0;
}

.notes {
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  font-size: 14px;
  color: #666;
}

/* Status Badge */
.status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
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

/* Word Type Badges */
.word-types {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.word-type-badge {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

/* Level Badges */
.levels {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.level-badge {
  background: #fff3e0;
  color: #f57c00;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
```

---

## 🔍 Use Cases

### Use Case 1: Flashcard App
```javascript
// Lấy tất cả từ vựng để tạo flashcards
const response = await axios.get(`/api/notebooks/template/${id}/copy`);
const allVocabs = response.data.data.notebook.vocabularies.data;

// Shuffle và hiển thị flashcards
const shuffled = allVocabs.sort(() => Math.random() - 0.5);
```

### Use Case 2: Quiz Game
```javascript
// Lấy tất cả từ vựng để tạo câu hỏi quiz
const response = await axios.get(`/api/notebooks/template/${id}/copy`);
const vocabs = response.data.data.notebook.vocabularies.data;

// Tạo câu hỏi từ từ vựng
const questions = vocabs.map(v => ({
  question: v.hanzi,
  answer: v.meaning,
  options: generateOptions(v, vocabs)
}));
```

### Use Case 3: Progress Tracking
```javascript
// Lấy tất cả từ vựng để tính tiến độ
const response = await axios.get(`/api/notebooks/template/${id}/copy`);
const vocabs = response.data.data.notebook.vocabularies.data;

const stats = {
  total: vocabs.length,
  learned: vocabs.filter(v => v.status === 'đã thuộc').length,
  learning: vocabs.filter(v => v.status === 'chưa thuộc').length,
  favorite: vocabs.filter(v => v.status === 'yêu thích').length
};

const progress = (stats.learned / stats.total) * 100;
```

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Author:** Development Team
