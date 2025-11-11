// // apiService.js

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

async function runTests() {
    console.log("--- Bắt đầu kiểm tra API AI ---");

    // --- Test 1: Kiểm tra Text Violation ---
    console.log("\n--- Test 1: Kiểm tra văn bản vi phạm ---");
    try {
        const textToTest = "đây là một câu chửi thề tục tĩu"; // Thay bằng một câu bạn muốn test
        const textResult = await analyzeTextViolation(textToTest);
        console.log(">>> Kết quả Text AI:", textResult);
    } catch (error) {
        console.error(">>> Lỗi Text AI:", error.message);
    }

    // --- Test 2: Kiểm tra Image NSFW ---
    console.log("\n--- Test 2: Kiểm tra hình ảnh nhạy cảm ---");
    try {
        // Lấy một URL ảnh ngẫu nhiên từ picsum.photos (đây là ảnh SFW - an toàn)
        const imageUrlToTest = "https://picsum.photos/200"; 
        const imageResult = await analyzeImageNSFW(imageUrlToTest);
        console.log(">>> Kết quả Image AI:", imageResult);
    } catch (error) {
        console.error(">>> Lỗi Image AI:", error.message);
    }
    
    console.log("\n--- Kiểm tra hoàn tất ---");
}

// Chạy hàm kiểm thử
runTests();




// import { Client } from "@gradio/client";

// // ... (code của các hằng số và hàm getGradioClient)
// const HF_TOKEN = "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";
// let gradioClient = null;

// async function getGradioClient() {
//   if (!gradioClient) {
//     gradioClient = await Client.connect("LeoHop/NSFW_Detect", { hf_token: HF_TOKEN });
//   }
//   return gradioClient;
// }

// // ==> Quan trọng: Sử dụng từ khóa 'export' ở đây
// /**
//  * Dự đoán nội dung NSFW từ nhiều loại đầu vào hình ảnh.
//  * @param {string | Blob | File} imageInput - URL của hình ảnh, hoặc một đối tượng Blob/File.
//  * @returns {Promise<any>} - Dữ liệu kết quả từ API.
//  */
// export async function detectNsfw(imageInput) {
//   try {
//     let imageBlob;

//     if (typeof imageInput === 'string') {
//       const response = await fetch(imageInput);
//       if (!response.ok) {
//         throw new Error(`Không thể tải ảnh, server trả về mã lỗi ${response.status}`);
//       }
//       imageBlob = await response.blob();
//     } else if (imageInput instanceof Blob) {
//       imageBlob = imageInput;
//     } else {
//       throw new Error("Định dạng đầu vào không hợp lệ.");
//     }
    
//     const client = await getGradioClient();
    
//     const result = await client.predict("/predict", {
//       inp: imageBlob,
//     });

//     return result.data;

//   } catch (error) {
//     console.error("Lỗi khi dự đoán NSFW:", error);
//     throw new Error(`Không thể phân tích hình ảnh: ${error.message}`);
//   }
// }

// // Bạn cũng có thể export nhiều hàm khác nếu cần
// // export const anotherUtilityFunction = () => { ... };