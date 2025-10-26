// controllers/mediaController.js
const mediaService = require('../services/mediaService');

const mediaController = {
  registerManualMedia: async (req, res) => {
    try {
      const mediaData = req.body;
      const userId = req.user.id; // Lấy ID admin từ token

      // --- Validation cơ bản ---
      if (!mediaData.s3_path || !mediaData.original_name) {
          return res.status(400).json({
              success: false,
              message: 'Các trường "s3_path" và "original_name" là bắt buộc.'
          });
      }

      // Gán ID admin vào dữ liệu
      mediaData.uploaded_by = userId;

      const newMediaRecord = await mediaService.registerManualMedia(mediaData);

      res.status(201).json({
        success: true,
        message: 'Đăng ký media thủ công thành công.',
        data: newMediaRecord
      });
      
    } catch (error) {
       // Xử lý lỗi unique s3_path
      if (error.code === '23505') { 
          return res.status(409).json({ 
              success: false,
              message: `Đăng ký thất bại. s3_path '${req.body.s3_path}' đã tồn tại.`
          });
      }
      res.status(500).json({
        success: false,
        message: 'Lỗi khi đăng ký media',
        error: error.message
      });
    }
  },
  getAllMedia: async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const result = await mediaService.getAllMedia({ page, limit, search });
      
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách media thành công.',
        data: result
      });
    } catch (error) {
       res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách media',
        error: error.message
      });
    }
  },
  deleteMedia: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await mediaService.deleteMedia(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Media không tồn tại.'
        });
      }
      
      // Ở đây, bạn cũng nên thêm logic để xóa file vật lý khỏi S3 hoặc local storage
      // Ví dụ: await deleteFileFromS3(result.s3_path);

      res.status(200).json({
        success: true,
        message: 'Xóa media thành công.',
        data: { id: result.id }
      });
      
    } catch (error) {
      // Xử lý lỗi foreign key (khi media đang được sử dụng)
      if (error.code === '23503') {
        return res.status(409).json({
          success: false,
          message: 'Không thể xóa media vì đang được sử dụng (ví dụ: trong một câu hỏi Mock Test).',
          error: error.detail
        });
      }
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa media',
        error: error.message
      });
    }
  },


};

module.exports = mediaController;