// file: services/aiService.js

require('dotenv').config();

async function getGeminiModel(modelName) {
  // Dynamic import to work in CommonJS
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Thiếu biến môi trường GEMINI_API_KEY trong file .env');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
}

async function generateChineseLesson(theme, level) {
  const candidates = [
    process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest'
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
    if (!raw || typeof raw !== 'string') throw new Error('Phản hồi rỗng từ AI');
    let text = raw.trim();
    // Remove Markdown code fences if present
    if (text.startsWith('```')) {
      // Strip opening fence with optional language and closing fence
      text = text.replace(/^```[a-zA-Z]*\s*/i, '').replace(/\s*```\s*$/, '');
    }
    // First attempt direct parse
    try { return JSON.parse(text); } catch (_) {}
    // Try extracting the largest JSON object by braces
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const slice = text.slice(start, end + 1);
      try { return JSON.parse(slice); } catch (_) {}
    }
    // As a final attempt, remove trailing commas (common in LLM output)
    try {
      const noTrailingCommas = text
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
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
        contents: [
          { role: 'user', parts: [{ text: prompt }] }
        ],
        generationConfig: { responseMimeType: 'application/json' }
      });
      const text = result.response.text();
      const parsed = parseJsonOutput(text);
      return { data: parsed, model: name };
    } catch (err) {
      const msg = (err && err.message) ? err.message : '';
      if (/not found|unsupported|404/i.test(msg)) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  if (lastErr) throw lastErr;
  throw new Error('Không thể khởi tạo model Gemini phù hợp.');
}

module.exports = { generateChineseLesson };
