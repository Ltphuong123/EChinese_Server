// apiService.js

const axios = require('axios');

// Định nghĩa URL của các API Python/Flask
// Đảm bảo server Flask của bạn đang chạy và có thể truy cập được từ server Express này.
const FLASK_API_BASE_URL = 'http://localhost:5001'; // Hoặc địa chỉ IP của máy chủ Flask
const VIOLATION_API_URL = `${FLASK_API_BASE_URL}/predict_violation`;
const NSFW_API_URL = `${FLASK_API_BASE_URL}/predict_nsfw`;

async function analyzeTextViolation(text) {
    if (!text) {
        throw new Error("Văn bản không được để trống.");
    }

    try {
        const payload = { text: text };
        const response = await axios.post(VIOLATION_API_URL, payload);
        return response.data;
    } catch (error) {
        console.error("Lỗi khi gọi API Text Violation:", error.message);
        // Tùy chỉnh xử lý lỗi: có thể re-throw hoặc trả về một cấu trúc lỗi cụ thể
        if (error.response) {
            throw new Error(`API Text Violation trả về lỗi ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            throw new Error("Không thể kết nối đến API Text Violation.");
        } else {
            throw new Error("Lỗi không xác định khi gọi API Text Violation.");
        }
    }
}

async function analyzeImageNSFW(imageUrl) {
    if (!imageUrl) {
        throw new Error("URL hình ảnh không được để trống.");
    }

    try {
        const payload = { image_url: imageUrl };
        const response = await axios.post(NSFW_API_URL, payload);
        return response.data;
    } catch (error) {
        console.error("Lỗi khi gọi API NSFW Detect:", error.message);
        // Tùy chỉnh xử lý lỗi
        if (error.response) {
            throw new Error(`API NSFW Detect trả về lỗi ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            throw new Error("Không thể kết nối đến API NSFW Detect.");
        } else {
            throw new Error("Lỗi không xác định khi gọi API NSFW Detect.");
        }
    }
}

// Export các hàm để có thể sử dụng ở các file khác
module.exports = {
    analyzeTextViolation,
    analyzeImageNSFW
};