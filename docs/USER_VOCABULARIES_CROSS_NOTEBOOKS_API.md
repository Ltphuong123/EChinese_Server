# 📚 API: User Vocabularies Across Notebooks

## 🎯 Tổng Quan

API cho phép lấy tất cả từ vựng của user từ các sổ tay, nhóm theo từ và trạng thái. Mỗi từ vựng sẽ kèm theo danh sách các notebook chứa từ đó.

**Đặc điểm:**
- ✅ Lấy từ vựng từ TẤT CẢ sổ tay của user
- ✅ Nhóm theo từ vựng và trạng thái
- ✅ Loại bỏ trùng lặp (nếu nhiều sổ tay có cùng từ với cùng trạng thái)
- ✅ Trả về danh sách notebook_ids chứa từ đó
- ✅ Hỗ trợ cập nhật đồng bộ trạng thái trên nhiều sổ tay

**Use cases:**
- 📖 Xem tất cả từ vựng đã học
- ⭐ Xem danh sách từ yêu thích
- 🔄 Đồng bộ trạng thái từ vựng trên nhiều sổ tay
- 📊 Thống kê tiến độ học tập

---

## 📋 API Endpoints

### 1. Lấy Tất Cả Từ Vựng Của User

**Endpoint:** `GET /api/user/vocabularies`

**Method:** GET

**Authentication:** Required (JWT Token)

**Query Parameters:**
- `status` (optional): Lọc theo trạng thái
  - Values: `"đã thuộc"` | `"chưa thuộc"` | `"yêu thích"` | `"không chắc"`

---

## 📤 Request Examples

### Example 1: Lấy tất cả từ vựng

```bash
GET /api/user/vocabularies
Authorization: Bearer <token>
```

### Example 2: Lấy từ đã học

```bash
GET /api/user/vocabularies?status=đã thuộc
Authorization: Bearer <token>
```

### Example 3: Lấy từ yêu thích

```bash
GET /api/user/vocabularies?status=yêu thích
Authorization: Bearer <token>
```

---

## 📥 Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Lấy danh sách từ vựng thành công.",
  "data": {
    "vocabularies": [
      {
        "vocab_id": "vocab-uuid-1",
        "hanzi": "你好",
        "pinyin": "nǐ hǎo",
        "meaning": "Xin chào",
        "notes": "Lời chào phổ biến nhất",
        "level": ["HSK1"],
        "image_url": "https://example.com/images/nihao.jpg",
        "status": "đã thuộc",
        "word_types": ["Động từ", "Thán từ"],
        "notebook_ids": [
          "notebook-uuid-1",
          "notebook-uuid-2",
          "notebook-uuid-3"
        ],
        "notebook_count": 3
      },
      {
        "vocab_id": "vocab-uuid-2",
        "hanzi": "谢谢",
        "pinyin": "xiè xiè",
        "meaning": "Cảm ơn",
        "notes": null,
        "level": ["HSK1"],
        "image_url": null,
        "status": "đã thuộc",
        "word_types": ["Động từ"],
        "notebook_ids": [
          "notebook-uuid-1",
          "notebook-uuid-4"
        ],
        "notebook_count": 2
      },
      {
        "vocab_id": "vocab-uuid-3",
        "hanzi": "学习",
        "pinyin": "xué xí",
        "meaning": "Học tập",
        "notes": null,
        "level": ["HSK1", "HSK2"],
        "image_url": null,
        "status": "yêu thích",
        "word_types": ["Động từ"],
        "notebook_ids": [
          "notebook-uuid-2"
        ],
        "notebook_count": 1
      }
    ],
    "total": 3
  }
}
```

**Response Fields:**
- `vocab_id`: ID của từ vựng
- `hanzi`: Chữ Hán
- `pinyin`: Phiên âm
- `meaning`: Nghĩa tiếng Việt
- `notes`: Ghi chú
- `level`: Cấp độ HSK (array)
- `image_url`: URL hình ảnh
- `status`: Trạng thái học
- `word_types`: Loại từ (array)
- `notebook_ids`: Danh sách ID các sổ tay chứa từ này (array)
- `notebook_count`: Số lượng sổ tay chứa từ này

---

### 2. Cập Nhật Trạng Thái Trên Nhiều Sổ Tay

**Endpoint:** `PUT /api/user/vocabularies/:vocabId/status`

**Method:** PUT

**Authentication:** Required (JWT Token)

**Parameters:**
- `vocabId` (path, uuid): ID của từ vựng

**Body:**
```json
{
  "notebookIds": [
    "notebook-uuid-1",
    "notebook-uuid-2",
    "notebook-uuid-3"
  ],
  "status": "đã thuộc"
}
```

---

## 📤 Request Example

```bash
PUT /api/user/vocabularies/vocab-uuid-1/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "notebookIds": [
    "notebook-uuid-1",
    "notebook-uuid-2",
    "notebook-uuid-3"
  ],
  "status": "đã thuộc"
}
```

---

## 📥 Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Đã cập nhật trạng thái trên 3 sổ tay.",
  "data": {
    "updatedCount": 3,
    "notebookIds": [
      "notebook-uuid-1",
      "notebook-uuid-2",
      "notebook-uuid-3"
    ]
  }
}
```

---

## ❌ Error Responses

### 400 Bad Request - Status không hợp lệ

```json
{
  "success": false,
  "message": "Status không hợp lệ: đã học"
}
```

### 400 Bad Request - NotebookIds rỗng

```json
{
  "success": false,
  "message": "Trường 'notebookIds' phải là một mảng và không được rỗng."
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Một số notebook không tồn tại hoặc bạn không có quyền truy cập."
}
```

---

## 💻 Frontend Integration

### React - Hiển thị tất cả từ vựng

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const AllUserVocabularies = ({ token }) => {
  const [vocabularies, setVocabularies] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVocabularies();
  }, [filter]);

  const fetchVocabularies = async () => {
    setLoading(true);
    try {
      const url = filter 
        ? `/api/user/vocabularies?status=${filter}`
        : '/api/user/vocabularies';
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setVocabularies(response.data.data.vocabularies);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật trạng thái trên tất cả sổ tay chứa từ này
  const updateVocabStatus = async (vocabId, notebookIds, newStatus) => {
    try {
      await axios.put(
        `/api/user/vocabularies/${vocabId}/status`,
        { notebookIds, status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Đã cập nhật trạng thái trên tất cả sổ tay');
      fetchVocabularies(); // Refresh
    } catch (error) {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <div>
      <h2>Tất Cả Từ Vựng Của Tôi</h2>
      
      {/* Filter */}
      <div className="filters">
        <button onClick={() => setFilter('')}>
          Tất cả
        </button>
        <button onClick={() => setFilter('đã thuộc')}>
          Đã học
        </button>
        <button onClick={() => setFilter('chưa thuộc')}>
          Chưa học
        </button>
        <button onClick={() => setFilter('yêu thích')}>
          Yêu thích
        </button>
      </div>

      {/* Vocabulary List */}
      <div className="vocab-list">
        {vocabularies.map(vocab => (
          <VocabCard 
            key={vocab.vocab_id}
            vocab={vocab}
            onUpdateStatus={updateVocabStatus}
          />
        ))}
      </div>

      <p>Tổng số: {vocabularies.length} từ</p>
    </div>
  );
};

// Vocab Card Component
const VocabCard = ({ vocab, onUpdateStatus }) => {
  const [showNotebooks, setShowNotebooks] = useState(false);

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
      
      {/* Word Types */}
      <div className="word-types">
        {vocab.word_types.map((type, i) => (
          <span key={i} className="badge">{type}</span>
        ))}
      </div>
      
      {/* Notebook Count */}
      <div className="notebook-info">
        <button onClick={() => setShowNotebooks(!showNotebooks)}>
          📚 Có trong {vocab.notebook_count} sổ tay
        </button>
        
        {showNotebooks && (
          <div className="notebook-list">
            <p>Notebook IDs:</p>
            <ul>
              {vocab.notebook_ids.map(id => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Quick Actions */}
      <div className="actions">
        <button 
          onClick={() => onUpdateStatus(
            vocab.vocab_id, 
            vocab.notebook_ids, 
            'đã thuộc'
          )}
        >
          ✓ Đánh dấu đã học (tất cả sổ tay)
        </button>
        
        <button 
          onClick={() => onUpdateStatus(
            vocab.vocab_id, 
            vocab.notebook_ids, 
            'yêu thích'
          )}
        >
          ★ Yêu thích
        </button>
      </div>
    </div>
  );
};
```

### Vue - Với Statistics

```vue
<template>
  <div class="user-vocabularies">
    <h2>Từ Vựng Của Tôi</h2>
    
    <!-- Statistics -->
    <div class="stats">
      <div class="stat-card">
        <h3>{{ stats.total }}</h3>
        <p>Tổng số từ</p>
      </div>
      <div class="stat-card">
        <h3>{{ stats.learned }}</h3>
        <p>Đã học</p>
      </div>
      <div class="stat-card">
        <h3>{{ stats.favorite }}</h3>
        <p>Yêu thích</p>
      </div>
      <div class="stat-card">
        <h3>{{ stats.learning }}</h3>
        <p>Đang học</p>
      </div>
    </div>
    
    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.value"
        :class="{ active: currentFilter === tab.value }"
        @click="currentFilter = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>
    
    <!-- Vocabulary List -->
    <div class="vocab-list">
      <VocabCard 
        v-for="vocab in filteredVocabs" 
        :key="vocab.vocab_id"
        :vocab="vocab"
        @update-status="handleUpdateStatus"
      />
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      vocabularies: [],
      currentFilter: '',
      tabs: [
        { label: 'Tất cả', value: '' },
        { label: 'Đã học', value: 'đã thuộc' },
        { label: 'Chưa học', value: 'chưa thuộc' },
        { label: 'Yêu thích', value: 'yêu thích' },
        { label: 'Không chắc', value: 'không chắc' }
      ]
    };
  },
  computed: {
    filteredVocabs() {
      if (!this.currentFilter) return this.vocabularies;
      return this.vocabularies.filter(v => v.status === this.currentFilter);
    },
    stats() {
      return {
        total: this.vocabularies.length,
        learned: this.vocabularies.filter(v => v.status === 'đã thuộc').length,
        favorite: this.vocabularies.filter(v => v.status === 'yêu thích').length,
        learning: this.vocabularies.filter(v => v.status === 'chưa thuộc').length
      };
    }
  },
  async mounted() {
    await this.fetchVocabularies();
  },
  methods: {
    async fetchVocabularies() {
      try {
        const response = await this.$axios.get('/api/user/vocabularies');
        this.vocabularies = response.data.data.vocabularies;
      } catch (error) {
        this.$toast.error('Lỗi khi tải từ vựng');
      }
    },
    async handleUpdateStatus(vocabId, notebookIds, newStatus) {
      try {
        await this.$axios.put(
          `/api/user/vocabularies/${vocabId}/status`,
          { notebookIds, status: newStatus }
        );
        
        this.$toast.success('Đã cập nhật trạng thái');
        await this.fetchVocabularies();
      } catch (error) {
        this.$toast.error('Lỗi khi cập nhật');
      }
    }
  }
};
</script>
```

---

## 🔍 Use Cases

### Use Case 1: Xem tiến độ học tập

```javascript
// Lấy tất cả từ vựng
const response = await axios.get('/api/user/vocabularies');
const vocabs = response.data.data.vocabularies;

// Tính thống kê
const stats = {
  total: vocabs.length,
  learned: vocabs.filter(v => v.status === 'đã thuộc').length,
  learning: vocabs.filter(v => v.status === 'chưa thuộc').length,
  favorite: vocabs.filter(v => v.status === 'yêu thích').length
};

const progress = (stats.learned / stats.total) * 100;
console.log(`Tiến độ: ${progress.toFixed(1)}%`);
```

### Use Case 2: Đồng bộ trạng thái

```javascript
// User học xong từ "你好" trong app flashcard
// Cập nhật trạng thái trên TẤT CẢ sổ tay chứa từ này

const vocab = vocabularies.find(v => v.hanzi === '你好');

await axios.put(
  `/api/user/vocabularies/${vocab.vocab_id}/status`,
  {
    notebookIds: vocab.notebook_ids, // Tất cả sổ tay
    status: 'đã thuộc'
  }
);

// → Từ "你好" được đánh dấu đã học trong tất cả sổ tay
```

### Use Case 3: Tạo danh sách ôn tập

```javascript
// Lấy từ yêu thích để ôn tập
const response = await axios.get('/api/user/vocabularies?status=yêu thích');
const favoriteVocabs = response.data.data.vocabularies;

// Tạo flashcard từ danh sách yêu thích
const flashcards = favoriteVocabs.map(v => ({
  front: v.hanzi,
  back: v.meaning,
  pinyin: v.pinyin
}));
```

---

## 📊 Data Flow

```
User Request
    ↓
GET /api/user/vocabularies?status=đã thuộc
    ↓
Controller: getAllUserVocabularies
    ↓
Service: getAllUserVocabularies
    ↓
Model: getAllUserVocabulariesGrouped
    ↓
SQL Query:
  - JOIN Notebooks (WHERE user_id = userId)
  - JOIN NotebookVocabItems
  - JOIN Vocabulary
  - LEFT JOIN VocabularyWordType
  - GROUP BY vocab + status
  - Aggregate notebook_ids
    ↓
Return: Vocabularies with notebook_ids array
```

---

## 🎨 UI/UX Recommendations

### Progress Bar

```jsx
const ProgressBar = ({ learned, total }) => {
  const percentage = (learned / total) * 100;
  
  return (
    <div className="progress-container">
      <div className="progress-bar" style={{ width: `${percentage}%` }}>
        {percentage.toFixed(1)}%
      </div>
      <p>{learned} / {total} từ đã học</p>
    </div>
  );
};
```

### Filter Chips

```jsx
const FilterChips = ({ currentFilter, onChange }) => {
  const filters = [
    { label: 'Tất cả', value: '', icon: '📚' },
    { label: 'Đã học', value: 'đã thuộc', icon: '✓' },
    { label: 'Yêu thích', value: 'yêu thích', icon: '★' },
    { label: 'Chưa học', value: 'chưa thuộc', icon: '○' }
  ];
  
  return (
    <div className="filter-chips">
      {filters.map(filter => (
        <button
          key={filter.value}
          className={currentFilter === filter.value ? 'active' : ''}
          onClick={() => onChange(filter.value)}
        >
          {filter.icon} {filter.label}
        </button>
      ))}
    </div>
  );
};
```

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Author:** Development Team
