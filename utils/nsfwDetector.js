// // file: services/imageAnalysisService.js

// const axios = require('axios');

// const API_BASE_URL = "https://leohop-nsfw-detect.hf.space/gradio_api/call/predict";
// const HUGGINGFACE_TOKEN = "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";

// async function detectNsfwFromUrl(imageUrl) {
//   if (!imageUrl) {
//     throw new Error("URL hình ảnh là bắt buộc.");
//   }

//   const headers = {
//     "Authorization": `Bearer ${HUGGINGFACE_TOKEN}`,
//     "Content-Type": "application/json"
//   };

//   // --- BƯỚC 1: Gửi yêu cầu dự đoán và lấy event_id ---
//   console.log(`Bắt đầu phân tích NSFW cho URL: ${imageUrl}`);
//   let eventId;
//   try {
//     // const postData = {
//     //   "data": [
//     //     {
//     //       "path": imageUrl,
//     //       "meta": { "_type": "gradio.FileData" }
//     //     }
//     //   ]
//     // };

//     // const postResponse = await axios.post(API_BASE_URL, postData, { headers });
    
//     // if (!postResponse.data || !postResponse.data.event_id) {
//     //   throw new Error("Phản hồi từ API POST không chứa event_id.");
//     // }
    
//     eventId = "60b76d7fee4345cfb448354e0eeb3742";
//     console.log(`Nhận được event_id: ${eventId}`);

//   } catch (error) {
//     console.error("Lỗi khi gửi yêu cầu POST để lấy event_id:", error.response ? error.response.data : error.message);
//     throw new Error("Không thể bắt đầu quá trình phân tích hình ảnh.");
//   }


//   // --- BƯỚC 2: Sử dụng event_id để lấy kết quả cuối cùng ---
//   console.log("Đang chờ kết quả phân tích...");
//   const maxRetries = 10;
//   const retryDelay = 2000;

//   for (let i = 0; i < maxRetries; i++) {
//     try {
//       const getResponse = await axios.get(`${API_BASE_URL}/${eventId}`, { headers });
      
//       if (getResponse.data && getResponse.data.status === "COMPLETE") {
//         console.log("Phân tích hoàn tất!");
        
//         // ================================================================
//         // === THAY ĐỔI QUAN TRỌNG NẰM Ở ĐÂY ===
//         // Kết quả thực sự nằm trong response.data.data
//         // Và nó là một mảng, chúng ta lấy phần tử đầu tiên
//         const analysisResult = getResponse.data.data[0];
//         if (!analysisResult) {
//             throw new Error("Dữ liệu trả về không có kết quả phân tích.");
//         }
//         // Trả về object kết quả đã được xử lý
//         return analysisResult;
//         // ================================================================

//       } else if (getResponse.data && (getResponse.data.status === "QUEUED" || getResponse.data.status === "PENDING")) {
//          console.log(`Thử lại lần ${i + 1}/${maxRetries}: Yêu cầu đang ở trạng thái ${getResponse.data.status}...`);
//       } else {
//         throw new Error(`Trạng thái không mong đợi từ API: ${getResponse.data ? getResponse.data.status : 'không xác định'}`);
//       }
      
//       await new Promise(resolve => setTimeout(resolve, retryDelay));

//     } catch (error) {
//       console.error(`Lỗi khi lấy kết quả với event_id ở lần thử ${i + 1}:`, error.response ? error.response.data : error.message);
//       if (error.response && error.response.status !== 503) { 
//           throw new Error("Không thể lấy kết quả phân tích hình ảnh.");
//       }
//       await new Promise(resolve => setTimeout(resolve, retryDelay));
//     }
//   }
  
//   throw new Error(`Không thể lấy kết quả phân tích sau ${maxRetries} lần thử.`);
// }


// // // --- Cách sử dụng ví dụ (ĐÃ CẬP NHẬT) ---
// // async function main() {
// //   const testImageUrl = "https://i.natgeofe.com/n/548467d8-c5f1-4551-9f58-6817a8d2c45e/NationalGeographic_2572187_square.jpg";

// //   try {
// //     const result = await detectNsfwFromUrl(testImageUrl);
// //     console.log("--- KẾT QUẢ CUỐI CÙNG ---");
// //     console.log(JSON.stringify(result, null, 2));

// //     // ================================================================
// //     // === CẬP NHẬT CÁCH TRUY CẬP DỮ LIỆU ===
// //     if (result) {
// //         console.log(`\nNhãn dự đoán chính: ${result.predicted_label}`);
// //         console.log(`Độ tin cậy: ${Math.round(result.predicted_confidence * 100)}%`);
        
// //         console.log("\nXác suất của từng nhãn:");
// //         // Lặp qua object probabilities
// //         for (const [label, probability] of Object.entries(result.probabilities)) {
// //             console.log(`- ${label}: ${Math.round(probability * 100)}%`);
// //         }
// //     }
// //     // ================================================================

// //   } catch (error) {
// //     console.error("--- LỖI TỔNG THỂ ---");
// //     console.error(error.message);
// //   }
// // }

// // // Chạy hàm ví dụ để kiểm tra
// // main();


// module.exports = {
//   detectNsfwFromUrl
// };