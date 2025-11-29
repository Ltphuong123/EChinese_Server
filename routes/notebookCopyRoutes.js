const express = require('express');
const router = express.Router();
const notebookCopyController = require('../controllers/notebookCopyController');
const authMiddleware = require('../middlewares/authMiddleware');

// ============================================
// USER ROUTES - Copy Notebook
// ============================================

/**
 * Kiểm tra có thể copy sổ tay không
 * GET /api/notebooks/:notebookId/can-copy
 * 
 * Response: { canCopy: boolean, reason?: string }
 */
router.get(
  '/notebooks/:notebookId/can-copy',
  authMiddleware.verifyToken,
  notebookCopyController.checkCanCopy
);

/**
 * Lấy hoặc tạo bản sao sổ tay từ template (Get or Create)
 * GET /api/notebooks/template/:templateId/copy
 * 
 * Nếu user đã có bản sao -> trả về bản sao đó kèm từ vựng (200)
 * Nếu chưa có -> tạo mới và trả về kèm từ vựng (201)
 * 
 * Query params (optional):
 * - page: số trang (nếu muốn phân trang)
 * - limit: số từ vựng mỗi trang (nếu muốn phân trang)
 * 
 * Nếu KHÔNG truyền page/limit -> Lấy TẤT CẢ từ vựng (không phân trang)
 * Nếu CÓ truyền page/limit -> Phân trang
 * 
 * Response với pagination: { 
 *   notebook: { 
 *     id, name, vocab_count, ...,
 *     vocabularies: { 
 *       data: [...], 
 *       pagination: { page, limit, total, totalPages }
 *     }
 *   }, 
 *   isNew, 
 *   template 
 * }
 * 
 * Response không pagination: { 
 *   notebook: { 
 *     id, name, vocab_count, ...,
 *     vocabularies: { 
 *       data: [...],  // TẤT CẢ từ vựng
 *       total: 150
 *     }
 *   }, 
 *   isNew, 
 *   template 
 * }
 * 
 * Mỗi từ vựng bao gồm:
 * - id, hanzi, pinyin, meaning, notes, level, image_url
 * - status (đã thuộc/chưa thuộc/yêu thích/không chắc)
 * - word_types (array): Danh từ, Động từ, Tính từ, etc.
 * - added_at
 */
router.get(
  '/notebooks/template/:templateId/copy',
  authMiddleware.verifyToken,
  notebookCopyController.getOrCreateCopiedNotebook
);

// ============================================
// ADMIN ROUTES - Template Statistics
// ============================================

/**
 * Xem thống kê về template
 * GET /api/admin/notebooks/template/:templateId/stats
 * 
 * Response: Thống kê số lượng user đã copy
 */
router.get(
  '/admin/notebooks/template/:templateId/stats',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  notebookCopyController.getTemplateStats
);

// ============================================
// VOCABULARY STATUS UPDATE
// ============================================

/**
 * Cập nhật trạng thái hàng loạt cho nhiều từ vựng trong 1 sổ tay
 * PUT /api/notebooks/:notebookId/vocabularies/bulk-status
 * 
 * Body: {
 *   updates: [
 *     { vocabId: "uuid-1", status: "đã thuộc" },
 *     { vocabId: "uuid-2", status: "yêu thích" },
 *     { vocabId: "uuid-3", status: "chưa thuộc" }
 *   ]
 * }
 * 
 * Response: {
 *   success: true,
 *   message: "Đã cập nhật thành công 3/3 từ vựng.",
 *   data: {
 *     updatedCount: 3,
 *     total: 3,
 *     failed: 0
 *   }
 * }
 */
router.put(
  '/notebooks/:notebookId/vocabularies/bulk-status',
  authMiddleware.verifyToken,
  notebookCopyController.bulkUpdateVocabStatus
);

// ============================================
// USER VOCABULARIES - Cross Notebooks
// ============================================

/**
 * Lấy tất cả từ vựng của user từ các sổ tay, nhóm theo từ và trạng thái
 * GET /api/user/vocabularies
 * 
 * Query params:
 * - status: lọc theo trạng thái (optional)
 *   Values: "đã thuộc" | "chưa thuộc" | "yêu thích" | "không chắc"
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     vocabularies: [
 *       {
 *         vocab_id: "uuid",
 *         hanzi: "你好",
 *         pinyin: "nǐ hǎo",
 *         meaning: "Xin chào",
 *         notes: "...",
 *         level: ["HSK1"],
 *         image_url: "...",
 *         status: "đã thuộc",
 *         word_types: ["Động từ", "Thán từ"],
 *         notebook_ids: ["notebook-uuid-1", "notebook-uuid-2"],
 *         notebook_count: 2
 *       }
 *     ],
 *     total: 150
 *   }
 * }
 */
router.get(
  '/user/vocabularies',
  authMiddleware.verifyToken,
  notebookCopyController.getAllUserVocabularies
);

/**
 * Cập nhật trạng thái của một từ vựng trên nhiều sổ tay cùng lúc
 * PUT /api/user/vocabularies/:vocabId/status
 * 
 * Body: {
 *   notebookIds: ["notebook-uuid-1", "notebook-uuid-2", "notebook-uuid-3"],
 *   status: "đã thuộc"
 * }
 * 
 * Response: {
 *   success: true,
 *   message: "Đã cập nhật trạng thái trên 3 sổ tay.",
 *   data: {
 *     updatedCount: 3,
 *     notebookIds: ["notebook-uuid-1", "notebook-uuid-2", "notebook-uuid-3"]
 *   }
 * }
 */
router.put(
  '/user/vocabularies/:vocabId/status',
  authMiddleware.verifyToken,
  notebookCopyController.updateVocabAcrossNotebooks
);

module.exports = router;

