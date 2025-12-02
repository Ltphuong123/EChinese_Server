const express = require('express');
const router = express.Router();
const notebookDeleteController = require('../controllers/notebookDeleteController');
const authMiddleware = require('../middlewares/authMiddleware');

// ============================================
// ADMIN ROUTES - Delete All Notebook Data
// ============================================

/**
 * Lấy thống kê trước khi xóa
 * GET /api/admin/notebooks/delete-stats
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     notebooks: 150,
 *     systemNotebooks: 10,
 *     userNotebooks: 140,
 *     vocabItems: 5000,
 *     changelog: 200,
 *     syncStatus: 140
 *   }
 * }
 */
router.get(
  '/admin/notebooks/delete-stats',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  notebookDeleteController.getDeleteStatistics
);

/**
 * Xóa toàn bộ dữ liệu notebook
 * DELETE /api/admin/notebooks/delete-all
 * 
 * ⚠️ CẢNH BÁO: API này sẽ xóa TẤT CẢ:
 * - Notebooks (system + user)
 * - NotebookVocabItems
 * - NotebookChangelog
 * - NotebookSyncStatus
 * 
 * Body: {
 *   confirmPassword: "DELETE_ALL_NOTEBOOKS"
 * }
 * 
 * Response: {
 *   success: true,
 *   message: "Đã xóa toàn bộ dữ liệu notebook.",
 *   data: {
 *     success: true,
 *     message: "Đã xóa toàn bộ dữ liệu notebook.",
 *     details: {
 *       notebooksDeleted: 150,
 *       systemNotebooksDeleted: 10,
 *       userNotebooksDeleted: 140,
 *       vocabItemsDeleted: 5000,
 *       changelogDeleted: 200,
 *       syncStatusDeleted: 140
 *     },
 *     statsBefore: {
 *       notebooks: 150,
 *       systemNotebooks: 10,
 *       userNotebooks: 140,
 *       vocabItems: 5000,
 *       changelog: 200,
 *       syncStatus: 140
 *     }
 *   }
 * }
 */
router.delete(
  '/admin/notebooks/delete-all',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  notebookDeleteController.deleteAllNotebookData
);

module.exports = router;
