// file: services/aiService.js

require("dotenv").config();

async function getGeminiModel(modelName) {
  // Dynamic import to work in CommonJS
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Thiếu biến môi trường GEMINI_API_KEY trong file .env");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
}

async function generateChineseLesson(theme, level) {
  const candidates = [
    process.env.GEMINI_MODEL || "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest",
  ];

  const prompt = `
    Bạn là một AI giáo viên tiếng Trung.

    Hãy tạo một bài học tiếng Trung theo chủ đề và cấp độ do người dùng chọn.
    Kết quả trả về MUST BE JSON hợp lệ 100%, không thêm bất kỳ văn bản nào ngoài JSON.

    Cấu trúc JSON:

    {
      "vocabularies": [
        {
          "hanzi": string,
          "pinyin": string,
          "meaning": string,
          "notes": string|null,
          "audio_url": null
        }
      ],
      "phrases": [
        {
          "text": string,
          "pinyin": string,
          "meaning": string,
          "notes": string|null,
          "audio_url": null
        }
      ],
      "tips": [
        {
          "vietnamese": string,
          "chinese": string
        }
      ],
      "dialogues": [
        {
          "messages": [
            {
              "speaker": "A" | "B",
              "text": string,
              "pinyin": string,
              "vietnamese": string,
              "audio_url": null
            }
          ]
        }
      ]
    }

    --- YÊU CẦU ---

    - Chủ đề: "${theme}"
    - Cấp độ: "${level}"

    Số lượng phần tử:
    - Cơ bản → 10 từ vựng
    - Trung cấp → 15 từ vựng
    - Cao cấp → 20 từ vựng

    - phrases: luôn 10
    - tips: khoảng 5
    - dialogues: 3 đoạn, mỗi đoạn 6 câu, A/B luân phiên.

    YÊU CẦU QUAN TRỌNG:
    - Trả về đúng JSON, không markdown.
    - Không thêm text thừa.
    - audio_url luôn = null.
  `;

  const parseJsonOutput = (raw) => {
    if (!raw || typeof raw !== "string") throw new Error("Phản hồi rỗng từ AI");
    let text = raw.trim();
    // Remove Markdown code fences if present
    if (text.startsWith("```")) {
      // Strip opening fence with optional language and closing fence
      text = text.replace(/^```[a-zA-Z]*\s*/i, "").replace(/\s*```\s*$/, "");
    }
    // First attempt direct parse
    try {
      return JSON.parse(text);
    } catch (_) {}
    // Try extracting the largest JSON object by braces
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const slice = text.slice(start, end + 1);
      try {
        return JSON.parse(slice);
      } catch (_) {}
    }
    // As a final attempt, remove trailing commas (common in LLM output)
    try {
      const noTrailingCommas = text
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]");
      return JSON.parse(noTrailingCommas);
    } catch (e) {
      throw new Error(`Gemini trả về JSON không hợp lệ`);
    }
  };

  let lastErr;
  for (const name of candidates) {
    try {
      const model = await getGeminiModel(name);
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      });
      const text = result.response.text();
      const parsed = parseJsonOutput(text);
      return { data: parsed, model: name };
    } catch (err) {
      const msg = err && err.message ? err.message : "";
      if (/not found|unsupported|404/i.test(msg)) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  if (lastErr) throw lastErr;
  throw new Error("Không thể khởi tạo model Gemini phù hợp.");
}

async function translateWithExamples(text, direction) {
  // Determine source and target languages
  let sourceLang, targetLang, sourceLanguageName, targetLanguageName;

  if (direction === "zh-vi") {
    sourceLang = "zh";
    targetLang = "vi";
    sourceLanguageName = "tiếng Trung";
    targetLanguageName = "tiếng Việt";
  } else if (direction === "vi-zh") {
    sourceLang = "vi";
    targetLang = "zh";
    sourceLanguageName = "tiếng Việt";
    targetLanguageName = "tiếng Trung";
  } else {
    // Auto detect based on text content
    const hasChineseChars = /[\u4e00-\u9fff]/.test(text);
    const hasVietnameseChars = /[ăâêôơưđ]/i.test(text);

    if (hasChineseChars) {
      sourceLang = "zh";
      targetLang = "vi";
      sourceLanguageName = "tiếng Trung";
      targetLanguageName = "tiếng Việt";
    } else {
      sourceLang = "vi";
      targetLang = "zh";
      sourceLanguageName = "tiếng Việt";
      targetLanguageName = "tiếng Trung";
    }
  }

  const candidates = [
    process.env.GEMINI_MODEL || "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest",
  ];

  const prompt = `
    Bạn là một AI dịch thuật và phân tích ngôn ngữ chuyên nghiệp Trung-Việt.

    NHIỆM VỤ 2 BƯỚC:
    
    BƯỚC 1: Dịch văn bản từ ${sourceLanguageName} sang ${targetLanguageName}
    BƯỚC 2: Phân tích chi tiết từng từ trong BẢN DỊCH và tạo câu ví dụ

    Văn bản gốc: "${text}"

    Kết quả trả về MUST BE JSON hợp lệ 100%, không thêm bất kỳ văn bản nào ngoài JSON.

    Cấu trúc JSON:
    {
      "source_text": "${text.replace(/"/g, '\\"')}",
      "source_lang": "${sourceLang}",
      "target_lang": "${targetLang}",
      "translated_text": string,
      "word_breakdown": [
        {
          "analyzed_word": string,
          "word_meaning": string,
          "pinyin": string|null,
          "word_type": string,
          "usage_note": string,
          "example_sentences": [
            {
              "example_${targetLang}": string,
              "example_${sourceLang}": string,
              "pinyin": string|null,
              "context": string
            }
          ]
        }
      ]
    }

    YÊU CẦU CHI TIẾT:
    1. Dịch chính xác và tự nhiên từ ${sourceLanguageName} sang ${targetLanguageName}
    2. QUAN TRỌNG: Phân tích các từ trong BẢN DỊCH (translated_text), KHÔNG phải văn bản gốc
    3. Chọn 3-5 từ quan trọng nhất trong bản dịch (bỏ qua từ nối, trợ từ, giới từ)
    4. Với mỗi từ được phân tích:
       - analyzed_word: từ được phân tích từ bản dịch
       - word_meaning: ý nghĩa chi tiết của từ đó
       - pinyin: chỉ thêm nếu từ được phân tích là tiếng Trung, ngược lại = null
       - word_type: loại từ (danh từ/động từ/tính từ/trạng từ/cụm từ)
       - usage_note: ghi chú cách sử dụng từ này
       - example_sentences: 3 câu ví dụ sử dụng từ này
    5. Mỗi câu ví dụ bao gồm:
       - example_${targetLang}: câu ví dụ bằng ngôn ngữ đích
       - example_${sourceLang}: bản dịch của câu ví dụ sang ngôn ngữ gốc  
       - pinyin: chỉ cho câu tiếng Trung, ngược lại = null
       - context: ngữ cảnh sử dụng câu này
    6. Trả về đúng JSON, không markdown, không text thừa

    VÍ DỤ CỤ THỂ:
    - Input: "xin chào" (vi-zh)
    - translated_text: "你好"
    - Phân tích từ "你好" trong bản dịch, không phân tích "xin chào"
    - Tạo câu ví dụ chứa "你好" với pinyin và bản dịch tiếng Việt
  `;

  const parseJsonOutput = (raw) => {
    if (!raw || typeof raw !== "string") throw new Error("Phản hồi rỗng từ AI");
    let text = raw.trim();

    // Remove Markdown code fences if present
    if (text.startsWith("```")) {
      text = text.replace(/^```[a-zA-Z]*\s*/i, "").replace(/\s*```\s*$/, "");
    }

    // First attempt direct parse
    try {
      return JSON.parse(text);
    } catch (_) {}

    // Try extracting the largest JSON object by braces
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const slice = text.slice(start, end + 1);
      try {
        return JSON.parse(slice);
      } catch (_) {}
    }

    // As a final attempt, remove trailing commas
    try {
      const noTrailingCommas = text
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]");
      return JSON.parse(noTrailingCommas);
    } catch (e) {
      throw new Error("Gemini trả về JSON không hợp lệ cho dịch với ví dụ");
    }
  };

  let lastErr;
  for (const name of candidates) {
    try {
      const model = await getGeminiModel(name);
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      });

      const responseText = result.response.text();
      const parsed = parseJsonOutput(responseText);

      // Validate required fields
      if (!parsed.translated_text || !parsed.word_breakdown) {
        throw new Error("Thiếu trường bắt buộc trong kết quả dịch");
      }

      // Validate word_breakdown structure
      if (
        !Array.isArray(parsed.word_breakdown) ||
        parsed.word_breakdown.length === 0
      ) {
        throw new Error("word_breakdown phải là mảng không rỗng");
      }

      return { data: parsed, model: name };
    } catch (err) {
      const msg = err && err.message ? err.message : "";
      if (/not found|unsupported|404/i.test(msg)) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  if (lastErr) throw lastErr;
  throw new Error(
    "Không thể khởi tạo model Gemini phù hợp cho dịch với ví dụ."
  );
}

module.exports = { generateChineseLesson, translateWithExamples };
