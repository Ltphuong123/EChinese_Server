// file: middlewares/attemptOwnerMiddleware.js

const db = require('../config/db');

const verifyAttemptOwner = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    const queryText = `SELECT user_id FROM "User_Exam_Attempts" WHERE id = $1;`;
    const result = await db.query(queryText, [attemptId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Lượt làm bài không tồn tại.' });
    }

    if (result.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập vào lượt làm bài này.' });
    }

    // Gắn thông tin attempt vào request để sử dụng sau này nếu cần
    req.attempt = { id: attemptId };
    next();
    
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xác thực quyền sở hữu', error: error.message });
  }
};

module.exports = verifyAttemptOwner;