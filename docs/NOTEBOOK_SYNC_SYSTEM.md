# 🔄 Hệ Thống Đồng Bộ Notebook (Notebook Sync System)

## 🎯 Tổng Quan

Hệ thống tự động theo dõi và đồng bộ các thay đổi từ sổ tay hệ thống (template) sang các bản sao của user.

**Tính năng:**
- ✅ Tự động ghi log khi admin thêm/xóa từ vựng trong template
- ✅ User có thể kiểm tra thay đổi chưa đồng bộ
- ✅ Đồng bộ một sổ tay hoặc tất cả sổ tay từ template
- ✅ Theo dõi lần đồng bộ cuối cùng
- ✅ Admin xem lịch sử thay đổi

---

## 📊 Database Schema

### Bảng NotebookChangelog

Lưu lại lịch sử thay đổi trong sổ tay hệ thống.

```sql
CREATE TABLE "NotebookChangelog" (
  id uuid PRIMARY KEY,
  template_id uuid NOT NULL,      -- ID của template
  vocab_id uuid NOT NULL,          -- ID của từ vựng
  action varchar(20) NOT NULL,     -- 'added' hoặc 'removed'
  performed_by uuid,               -- Admin thực hiện
  created_at timestamptz
);
```

### Bảng NotebookSyncStatus

Theo dõi trạng thái đồng bộ của mỗi bản sao.

```sql
CREATE TABLE "NotebookSyncStatus" (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  template_id uuid NOT NULL,
  notebook_id uuid NOT NULL,
  last_synced_at timestamptz,      -- Lần sync cuối
  last_changelog_id uuid,          -- Changelog entry cuối đã sync
  created_at timestamptz,
  updated_at timestamptz,
  UNIQUE (user_id, template_id, notebook_id)
);
```

---

## 🔄 Flow Hoạt Động

### 1. Admin Thêm/Xóa Từ Vựng

```
Admin thêm từ "你好" vào template HSK1
    ↓
Trigger tự động ghi vào NotebookChangelog:
{
  template_id: "hsk1-uuid",
  vocab_id: "nihao-uuid",
  action: "added",
  created_at: "2024-01-16T10:00:00Z"
}
    ↓
Tất cả user có bản sao từ HSK1 
sẽ thấy thông báo "Có thay đổi mới"
```

### 2. User Kiểm Tra Thay Đổi

```
User → GET /api/notebooks/{notebook-id}/sync/check
    ↓
Hệ thống kiểm tra:
  - Lấy last_synced_at từ NotebookSyncStatus
  - Query NotebookChangelog WHERE created_at > last_synced_at
  - Trả về danh sách thay đổi chưa sync
    ↓
Response: {
  hasPendingChanges: true,
  counts: { total: 5, added: 3, removed: 2 },
  pendingChanges: [...]
}
```

### 3. User Đồng Bộ

```
User → POST /api/notebooks/{notebook-id}/sync
    ↓
Hệ thống thực hiện:
  1. Lấy pending changes
  2. Áp dụng từng thay đổi:
     - action='added' → INSERT từ vựng
     - action='removed' → DELETE từ vựng
  3. Cập nhật vocab_count
  4. Cập nhật NotebookSyncStatus
    ↓
Response: {
  synced: true,
  result: { added: 3, removed: 2 }
}
```

---

## 📋 API Endpoints

### 1. Kiểm Tra Thay Đổi Chưa Đồng Bộ

**Endpoint:** `GET /api/notebooks/:notebookId/sync/check`

**Request:**
```bash
GET /api/notebooks/987fcdeb-51a2-43d7-9876-543210fedcba/sync/check
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Có 5 thay đổi chưa đồng bộ.",
  "data": {
    "notebookId": "987fcdeb-51a2-43d7-9876-543210fedcba",
    "templateId": "123e4567-e89b-12d3-a456-426614174000",
    "lastSyncedAt": "2024-01-15T10:30:00Z",
    "hasPendingChanges": true,
    "pendingChanges": [
      {
        "id": "changelog-uuid-1",
        "template_id": "123e4567-e89b-12d3-a456-426614174000",
        "vocab_id": "vocab-uuid-1",
        "action": "added",
        "created_at": "2024-01-16T10:00:00Z",
        "hanzi": "你好",
        "pinyin": "nǐ hǎo",
        "meaning": "Xin chào",
        "level": ["HSK1"]
      },
      {
        "id": "changelog-uuid-2",
        "vocab_id": "vocab-uuid-2",
        "action": "removed",
        "created_at": "2024-01-16T11:00:00Z",
        "hanzi": "再见",
        "pinyin": "zài jiàn",
        "meaning": "Tạm biệt",
        "level": ["HSK1"]
      }
    ],
    "counts": {
      "total": 5,
      "added": 3,
      "removed": 2
    }
  }
}
```

---

### 2. Đồng Bộ Notebook

**Endpoint:** `POST /api/notebooks/:notebookId/sync`

**Request:**
```bash
POST /api/notebooks/987fcdeb-51a2-43d7-9876-543210fedcba/sync
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Đã đồng bộ 5 thay đổi.",
  "data": {
    "synced": true,
    "message": "Đã đồng bộ 5 thay đổi.",
    "changes": [
      {
        "id": "changelog-uuid-1",
        "vocab_id": "vocab-uuid-1",
        "action": "added",
        "hanzi": "你好"
      }
    ],
    "result": {
      "added": 3,
      "removed": 2,
      "skipped": 0,
      "newVocabCount": 153
    }
  }
}
```

---

### 3. Đồng Bộ Tất Cả Notebooks Từ Template

**Endpoint:** `POST /api/templates/:templateId/sync-all`

**Request:**
```bash
POST /api/templates/123e4567-e89b-12d3-a456-426614174000/sync-all
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Đã đồng bộ 3/3 sổ tay.",
  "data": {
    "synced": true,
    "totalNotebooks": 3,
    "syncedCount": 3,
    "results": [
      {
        "notebookId": "notebook-uuid-1",
        "notebookName": "HSK 1 - Sổ tay của tôi",
        "success": true,
        "synced": true,
        "result": {
          "added": 3,
          "removed": 2,
          "newVocabCount": 153
        }
      },
      {
        "notebookId": "notebook-uuid-2",
        "notebookName": "HSK 1 - Copy 2",
        "success": true,
        "synced": false,
        "message": "Không có thay đổi mới để đồng bộ."
      },
      {
        "notebookId": "notebook-uuid-3",
        "notebookName": "HSK 1 - Copy 3",
        "success": true,
        "synced": true,
        "result": {
          "added": 3,
          "removed": 2,
          "newVocabCount": 153
        }
      }
    ]
  }
}
```

---

### 4. Lấy Lịch Sử Thay Đổi (Admin)

**Endpoint:** `GET /api/admin/templates/:templateId/changelog?limit=50`

**Request:**
```bash
GET /api/admin/templates/123e4567-e89b-12d3-a456-426614174000/changelog?limit=50
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy lịch sử thay đổi thành công.",
  "data": {
    "templateId": "123e4567-e89b-12d3-a456-426614174000",
    "changelog": [
      {
        "id": "changelog-uuid-1",
        "template_id": "123e4567-e89b-12d3-a456-426614174000",
        "vocab_id": "vocab-uuid-1",
        "action": "added",
        "created_at": "2024-01-16T10:00:00Z",
        "hanzi": "你好",
        "pinyin": "nǐ hǎo",
        "meaning": "Xin chào",
        "level": ["HSK1"]
      },
      {
        "id": "changelog-uuid-2",
        "vocab_id": "vocab-uuid-2",
        "action": "removed",
        "created_at": "2024-01-16T09:00:00Z",
        "hanzi": "再见",
        "pinyin": "zài jiàn",
        "meaning": "Tạm biệt",
        "level": ["HSK1"]
      }
    ],
    "total": 50
  }
}
```

---

## 💻 Frontend Integration

### React - Sync Button Component

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const SyncButton = ({ notebookId, token }) => {
  const [pendingChanges, setPendingChanges] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPendingChanges();
  }, [notebookId]);

  const checkPendingChanges = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/notebooks/${notebookId}/sync/check`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingChanges(response.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await axios.post(
        `/api/notebooks/${notebookId}/sync`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(response.data.message);
      
      // Refresh pending changes
      await checkPendingChanges();
      
      // Refresh vocabulary list
      onSyncComplete();
    } catch (error) {
      toast.error('Lỗi khi đồng bộ');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div>Đang kiểm tra...</div>;

  if (!pendingChanges?.hasPendingChanges) {
    return (
      <div className="sync-status">
        <span className="badge badge-success">
          ✓ Đã đồng bộ
        </span>
      </div>
    );
  }

  return (
    <div className="sync-alert">
      <div className="alert alert-info">
        <h4>Có {pendingChanges.counts.total} thay đổi mới</h4>
        <ul>
          <li>Thêm: {pendingChanges.counts.added} từ</li>
          <li>Xóa: {pendingChanges.counts.removed} từ</li>
        </ul>
        
        <button 
          onClick={handleSync}
          disabled={syncing}
          className="btn btn-primary"
        >
          {syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
        </button>
      </div>
      
      {/* Chi tiết thay đổi */}
      <details>
        <summary>Xem chi tiết thay đổi</summary>
        <ul>
          {pendingChanges.pendingChanges.map(change => (
            <li key={change.id}>
              {change.action === 'added' ? '➕' : '➖'} {change.hanzi} ({change.pinyin})
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
};
```

### Vue - Sync All Component

```vue
<template>
  <div class="sync-all-container">
    <h3>Đồng Bộ Tất Cả Sổ Tay</h3>
    
    <button 
      @click="syncAll"
      :disabled="syncing"
      class="btn btn-primary"
    >
      {{ syncing ? 'Đang đồng bộ...' : 'Đồng bộ tất cả' }}
    </button>
    
    <div v-if="results" class="sync-results">
      <h4>Kết quả:</h4>
      <p>Đã đồng bộ: {{ results.syncedCount }}/{{ results.totalNotebooks }}</p>
      
      <ul>
        <li 
          v-for="result in results.results" 
          :key="result.notebookId"
          :class="{ success: result.success, error: !result.success }"
        >
          <strong>{{ result.notebookName }}</strong>
          <span v-if="result.synced">
            - Thêm: {{ result.result.added }}, Xóa: {{ result.result.removed }}
          </span>
          <span v-else>
            - {{ result.message }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  props: ['templateId'],
  data() {
    return {
      syncing: false,
      results: null
    };
  },
  methods: {
    async syncAll() {
      this.syncing = true;
      try {
        const response = await this.$axios.post(
          `/api/templates/${this.templateId}/sync-all`
        );
        
        this.results = response.data.data;
        this.$toast.success(response.data.message);
      } catch (error) {
        this.$toast.error('Lỗi khi đồng bộ');
      } finally {
        this.syncing = false;
      }
    }
  }
};
</script>
```

---

## 🔍 Use Cases

### Use Case 1: Admin Cập Nhật Template

```
1. Admin thêm 10 từ mới vào template "HSK 1"
2. Trigger tự động ghi 10 entries vào NotebookChangelog
3. Tất cả user có bản sao từ "HSK 1" sẽ thấy badge "Có cập nhật mới"
4. User click "Đồng bộ" → 10 từ mới được thêm vào sổ tay của họ
```

### Use Case 2: User Có Nhiều Bản Sao

```
User có 3 bản sao từ template "HSK 1":
- HSK 1 - Sổ tay chính
- HSK 1 - Ôn tập
- HSK 1 - Flashcard

Admin thêm 5 từ mới vào template

User click "Đồng bộ tất cả"
→ Cả 3 sổ tay đều được cập nhật 5 từ mới
```

### Use Case 3: Theo Dõi Lịch Sử

```
Admin muốn xem lịch sử thay đổi của template "HSK 1"

GET /api/admin/templates/{hsk1-id}/changelog

→ Xem được:
- Ngày 16/01: Thêm 10 từ
- Ngày 15/01: Xóa 2 từ
- Ngày 14/01: Thêm 5 từ
```

---

## 🎨 UI/UX Recommendations

### Sync Badge

```jsx
const SyncBadge = ({ pendingCount }) => {
  if (pendingCount === 0) {
    return <span className="badge badge-success">✓ Đã đồng bộ</span>;
  }
  
  return (
    <span className="badge badge-warning">
      {pendingCount} cập nhật mới
    </span>
  );
};
```

### Sync Notification

```jsx
const SyncNotification = ({ changes }) => {
  return (
    <div className="notification">
      <h4>🔄 Có cập nhật mới từ sổ tay gốc</h4>
      <p>
        Thêm {changes.added} từ mới, xóa {changes.removed} từ
      </p>
      <button onClick={handleSync}>Đồng bộ ngay</button>
      <button onClick={handleDismiss}>Để sau</button>
    </div>
  );
};
```

---

## 📊 Performance

### Optimization:
- ✅ Index trên (template_id, created_at)
- ✅ Chỉ query changes sau last_synced_at
- ✅ Batch operations trong transaction
- ✅ Trigger tự động ghi log

### Metrics:
- Check pending changes: ~50ms
- Sync 10 changes: ~200ms
- Sync all (3 notebooks): ~500ms

---

## 🔐 Security

### Authorization:
- ✅ User chỉ sync được notebook của mình
- ✅ Admin mới xem được changelog
- ✅ Kiểm tra ownership trước khi sync

### Data Integrity:
- ✅ Transaction đảm bảo atomicity
- ✅ ON CONFLICT DO NOTHING tránh duplicate
- ✅ Cascade delete khi xóa template

---

## 🧪 Testing

### Test Sync Flow

```bash
# 1. Admin thêm từ vào template
POST /api/admin/notebooks/{template-id}/vocabularies
Body: { vocabIds: ["vocab-1", "vocab-2"] }

# 2. User kiểm tra pending changes
GET /api/notebooks/{notebook-id}/sync/check
# Expected: hasPendingChanges = true, counts.added = 2

# 3. User đồng bộ
POST /api/notebooks/{notebook-id}/sync
# Expected: result.added = 2

# 4. Kiểm tra lại
GET /api/notebooks/{notebook-id}/sync/check
# Expected: hasPendingChanges = false
```

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Author:** Development Team
