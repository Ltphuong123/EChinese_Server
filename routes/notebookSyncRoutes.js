const express = require('express');
const router = express.Router();
const notebookSyncController = require('../controllers/notebookSyncController');
const authMiddleware = require('../middlewares/authMiddleware');

// ============================================
// USER ROUTES - Notebook Sync
// ============================================

/**
 * Kiểm tra các thay đổi chưa đồng bộ
 * GET /api/notebooks/:notebookId/sync/check
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     notebookId: "uuid",
 *     templateId: "uuid",
 *     lastSyncedAt: "2024-01-15T10:30:00Z",
 *     hasPendingChanges: true,
 *     pendingChanges: [
 *       {
 *         id: "changelog-uuid",
 *         vocab_id: "vocab-uuid",
 *         action: "added",
 *         hanzi: "你好",
 *         created_at: "2024-01-16T10:00:00Z"
 *       }
 *     ],
 *     counts: {
 *       total: 5,
 *       added: 3,
 *       removed: 2
 *     }
 *   }
 * }
 */
router.get(
  '/notebooks/:notebookId/sync/check',
  authMiddleware.verifyToken,
  notebookSyncController.checkPendingChanges
);

/**
 * Đồng bộ notebook với template
 * POST /api/notebooks/:notebookId/sync
 * 
 * Response: {
 *   success: true,
 *   message: "Đã đồng bộ 5 thay đổi.",
 *   data: {
 *     synced: true,
 *     changes: [...],
 *     result: {
 *       added: 3,
 *       removed: 2,
 *       skipped: 0,
 *       newVocabCount: 150
 *     }
 *   }
 * }
 */
router.post(
  '/notebooks/:notebookId/sync',
  authMiddleware.verifyToken,
  notebookSyncController.syncNotebook
);

/**
 * Đồng bộ tất cả notebooks của user từ một template
 * POST /api/templates/:templateId/sync-all
 * 
 * Response: {
 *   success: true,
 *   message: "Đã đồng bộ 3/3 sổ tay.",
 *   data: {
 *     synced: true,
 *     totalNotebooks: 3,
 *     syncedCount: 3,
 *     results: [
 *       {
 *         notebookId: "uuid",
 *         notebookName: "HSK 1",
 *         success: true,
 *         synced: true,
 *         result: { added: 2, removed: 1 }
 *       }
 *     ]
 *   }
 * }
 */
router.post(
  '/templates/:templateId/sync-all',
  authMiddleware.verifyToken,
  notebookSyncController.syncAllNotebooks
);

/**
 * Lấy tất cả thay đổi chưa đồng bộ cho tất cả sổ tay của user
 * GET /api/notebooks/sync/all-changes
 * 
 * Response: {
 *   success: true,
 *   message: "Có 2 sổ tay cần đồng bộ.",
 *   data: {
 *     totalNotebooks: 5,
 *     notebooksWithChanges: 2,
 *     notebooks: [
 *       {
 *         notebookId: "uuid-1",
 *         notebookName: "HSK 1 - Sổ tay của tôi",
 *         templateId: "template-uuid",
 *         lastSyncedAt: "2024-01-15T10:30:00Z",
 *         hasPendingChanges: true,
 *         counts: {
 *           total: 5,
 *           added: 3,
 *           removed: 2
 *         },
 *         changes: [
 *           {
 *             id: "changelog-uuid",
 *             vocab_id: "vocab-uuid",
 *             action: "added",
 *             hanzi: "你好",
 *             pinyin: "nǐ hǎo",
 *             meaning: "Xin chào",
 *             created_at: "2024-01-16T10:00:00Z"
 *           }
 *         ]
 *       },
 *       {
 *         notebookId: "uuid-2",
 *         notebookName: "HSK 2 - Sổ tay của tôi",
 *         templateId: "template-uuid-2",
 *         lastSyncedAt: null,
 *         hasPendingChanges: false,
 *         counts: {
 *           total: 0,
 *           added: 0,
 *           removed: 0
 *         },
 *         changes: []
 *       }
 *     ]
 *   }
 * }
 */
router.get(
  '/notebooks/sync/all-changes',
  authMiddleware.verifyToken,
  notebookSyncController.getAllUnsyncedChanges
);

// ============================================
// ADMIN ROUTES - Template Changelog
// ============================================

/**
 * Lấy lịch sử thay đổi của template
 * GET /api/admin/templates/:templateId/changelog
 * 
 * Query params:
 * - limit: số lượng thay đổi tối đa (default: 50)
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     templateId: "uuid",
 *     changelog: [
 *       {
 *         id: "changelog-uuid",
 *         vocab_id: "vocab-uuid",
 *         action: "added",
 *         hanzi: "你好",
 *         pinyin: "nǐ hǎo",
 *         meaning: "Xin chào",
 *         created_at: "2024-01-16T10:00:00Z"
 *       }
 *     ],
 *     total: 50
 *   }
 * }
 */
router.get(
  '/admin/templates/:templateId/changelog',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  notebookSyncController.getTemplateChangelog
);

module.exports = router;
