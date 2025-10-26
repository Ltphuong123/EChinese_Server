// services/mediaService.js
const mediaModel = require('../models/mediaModel');

const mediaService = {
  registerManualMedia: async (mediaData) => {
    return await mediaModel.create(mediaData);
  },
  getAllMedia: async ({ page, limit, search }) => {
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;

    return await mediaModel.findAll({ limit: limitInt, offset, search });
  },
  deleteMedia: async (mediaId) => {
    const deletedMedia = await mediaModel.deleteById(mediaId);
    
    // Nếu xóa DB thành công, tiến hành xóa file vật lý
    if (deletedMedia) {
        // TODO: Viết hàm để xóa file khỏi S3 hoặc local storage
        // Ví dụ:
        // if (process.env.STORAGE_TYPE === 's3') {
        //   await deleteFileFromS3(deletedMedia.s3_path);
        // } else {
        //   await deleteFileFromLocal(deletedMedia.s3_path);
        // }
        console.log(`Cần xóa file vật lý tại path: ${deletedMedia.s3_path}`);
    }
    
    return deletedMedia;
  },

};

module.exports = mediaService;