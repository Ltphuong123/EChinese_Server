// file: services/aiTranslationService.js
require("dotenv").config();
const aiTranslationModel = require("../models/aiTranslationModel");
const { translateWithExamples } = require("./aiService");


async function getGeminiModel(modelName) {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const apiKey =
    process.env.GEMINI_API_KEY || "AIzaSyBHzF0fdJvc8cKRDZDn3pfuGjBiO_Yb60Y";
  if (!apiKey) throw new Error("Thiếu GEMINI_API_KEY");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
}

function detectLang(text) {
  if (!text) return "unknown";
  // Chinese ideographs
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  // Vietnamese specific letters
  if (/[ăâêôơưđ]/i.test(text)) return "vi";
  // Heuristic: many Vietnamese digraphs
  const words = text.split(/\s+/).filter(Boolean);
  const vnScore = words.filter((w) =>
    /ng|nh|ph|th|ch|tr|gi|qu|kh|đ|[ăâêôơư]/i.test(w)
  ).length;
  if (vnScore / (words.length || 1) > 0.25) return "vi";
  // Pinyin tone marks implies Chinese
  if (/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i.test(text)) return "zh";
  return "vi";
}

function buildPrompt(sourceText, sourceLang, targetLang) {
  return `Bạn là hệ thống dịch song ngữ Trung-Việt.
YÊU CẦU DUY NHẤT: Trả về 1 OBJECT JSON duy nhất (KHÔNG MẢNG, KHÔNG []), KHÔNG markdown, KHÔNG giải thích.
CHỈ các khóa sau và đúng thứ tự (thứ tự không bắt buộc nhưng KHÔNG thêm khóa khác):
{
  "source_lang": "${sourceLang}",
  "target_lang": "${targetLang}",
  "source_text": "${sourceText.replace(/"/g, '\\"')}",
  "translated_text": "<chuỗi dịch>",
  "notes": null
}
Không sử dụng: translation, output, result, data.
Không trả về mảng.
Không thêm bình luận.
Nếu target_lang = zh: dịch sang tiếng Trung tự nhiên.
Nếu target_lang = vi: dịch sang tiếng Việt tự nhiên, rõ ràng.
`;
}

function parseJson(raw) {
  if (!raw) throw new Error("Phản hồi rỗng từ AI");
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(text);
  } catch (_) {}
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    const slice = text.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch (_) {}
  }
  const cleaned = text.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
  return JSON.parse(cleaned); // Will throw if still invalid
}

const aiTranslationService = {
  translateText: async ({ text, direction, userId }) => {
    if (!text || !text.trim()) throw new Error("Thiếu nội dung cần dịch");
    // Determine languages
    let sourceLang, targetLang;
    if (direction === "zh-vi") {
      sourceLang = "zh";
      targetLang = "vi";
    } else if (direction === "vi-zh") {
      sourceLang = "vi";
      targetLang = "zh";
    } else if (!direction) {
      const detected = detectLang(text);
      if (detected === "zh") {
        sourceLang = "zh";
        targetLang = "vi";
      } else {
        sourceLang = "vi";
        targetLang = "zh";
      }
    } else {
      throw new Error("direction không hợp lệ (zh-vi | vi-zh)");
    }

    const candidates = [
      process.env.GEMINI_MODEL || "gemini-2.0-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro-latest",
    ];
    const prompt = buildPrompt(text, sourceLang, targetLang);
    let lastErr;
    for (const name of candidates) {
      try {
        const model = await getGeminiModel(name);
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        });
        const raw = result.response.text();
        let parsed = parseJson(raw);
        // If array returned, pick first object with translated_text or aggregate
        if (Array.isArray(parsed)) {
          const firstValid = parsed.find(
            (o) =>
              o &&
              typeof o === "object" &&
              (o.translated_text ||
                o.translation ||
                o.translated ||
                o.output ||
                o.result)
          );
          if (firstValid) {
            parsed = firstValid;
          } else {
            const combined = parsed
              .map(
                (o) =>
                  (o &&
                    (o.translated_text ||
                      o.translation ||
                      o.translated ||
                      o.output ||
                      o.result)) ||
                  ""
              )
              .filter(Boolean)
              .join("\n");
            parsed = {
              source_lang: sourceLang,
              target_lang: targetLang,
              source_text: text,
              translated_text: combined,
              notes: null,
            };
          }
        }
        if (!parsed.translated_text) {
          const alt =
            parsed.translation ||
            parsed.translated ||
            parsed.output ||
            parsed.result;
          if (alt && typeof alt === "string") parsed.translated_text = alt;
        }
        if (!parsed.translated_text || !parsed.translated_text.trim()) {
          const rawPreview = raw.slice(0, 300).replace(/\s+/g, " ").trim();
          throw new Error(
            "Thiếu trường translated_text. Preview: " + rawPreview
          );
        }
        const saved = await aiTranslationModel.create({
          user_id: userId || null,
          source_text: parsed.source_text || text,
          translated_text: parsed.translated_text,
          source_lang: parsed.source_lang || sourceLang,
          target_lang: parsed.target_lang || targetLang,
          model: name,
        });
        return { translation: saved };
      } catch (err) {
        const msg = err.message || "";
        if (/not found|unsupported|404/i.test(msg)) {
          lastErr = err;
          continue;
        }
        throw err;
      }
    }
    if (lastErr) throw lastErr;
    throw new Error("Không thể khởi tạo model dịch phù hợp");
  },
  getUserTranslations: async (userId, { page = 1, limit = 10 } = {}) => {
    const offset = (page - 1) * limit;
    const { translations, totalItems } = await aiTranslationModel.findByUser(
      userId,
      { limit, offset }
    );
    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: translations,
      meta: { total: totalItems, page, limit, totalPages },
    };
  },
  deleteUserTranslation: async (userId, translationId) => {
    if (!translationId) throw new Error("Thiếu translationId");
    const deleted = await aiTranslationModel.deleteByIdForUser(
      translationId,
      userId
    );
    return deleted; // 0 or 1
  },
  clearUserTranslations: async (userId) => {
    const count = await aiTranslationModel.deleteAllForUser(userId);
    return count; // number of deleted rows
  },

  // Lấy số lượng dịch của user trong ngày hôm nay
  getTodayTranslationCount: async (userId) => {
    const count = await aiTranslationModel.countTodayTranslations(userId);
    return count;
  },

  // Lấy số lượng dịch AI của user trong ngày hôm nay
  getTodayAITranslationCount: async (userId) => {
    const count = await aiTranslationModel.countTodayAITranslations(userId);
    return count;
  },

  // Lấy số lượng dịch của user trong tuần này
  getWeekTranslationCount: async (userId) => {
    const stats = await aiTranslationModel.getTranslationStats(userId, "week");
    return stats.total || 0;
  },

  // Lấy số lượng dịch AI của user trong tuần này
  getWeekAITranslationCount: async (userId) => {
    const count = await aiTranslationModel.countWeekAITranslations(userId);
    return count;
  },


  // Lấy số lượng dịch của user trong tháng này
  getMonthTranslationCount: async (userId) => {
    const stats = await aiTranslationModel.getTranslationStats(userId, "month");
    return stats.total || 0;
  },

  // Lấy số lượng dịch AI của user trong tháng này
  getMonthAITranslationCount: async (userId) => {
    const count = await aiTranslationModel.countMonthAITranslations(userId);
    return count;
  },


  // Lấy thống kê lượt dịch theo thời gian
  getTranslationStats: async (userId, period) => {
    const stats = await aiTranslationModel.getTranslationStats(userId, period);
    return stats;
  },

  // Dịch với câu ví dụ cho từng từ
  translateWithWordExamples: async ({ text, direction, userId }) => {
    if (!text || !text.trim()) throw new Error("Thiếu nội dung cần dịch");
    if (text.length > 1000)
      throw new Error("Text quá dài cho dịch với ví dụ (>1000 ký tự)");

    try {
      const result = await translateWithExamples(text, direction);
      const translationData = result.data;

      // Lưu vào database với thông tin bổ sung
      const saved = await aiTranslationModel.create({
        user_id: userId || null,
        source_text: translationData.source_text,
        translated_text: translationData.translated_text,
        source_lang: translationData.source_lang,
        target_lang: translationData.target_lang,
        model: result.model,
        // Lưu word_breakdown như JSON object trực tiếp (không stringify)
        metadata: {
          word_breakdown: translationData.word_breakdown,
          translation_type: "with_examples",
          ai: true, // Đánh dấu đây là dịch AI với phân tích từ
        },
      });

      // Cập nhật tiến độ thành tích ai_translate
      if (userId) {
        try {
          const achievementService = require('./achievementService');
          await achievementService.updateProgress(userId, "ai_translate", 1);
        } catch (error) {
          console.error("Lỗi khi cập nhật tiến độ thành tích ai_translate:", error);
          // Không throw để không ảnh hưởng đến flow chính
        }
      }

      return {
        translation: {
          id: saved.id,
          source_text: saved.source_text,
          translated_text: saved.translated_text,
          source_lang: saved.source_lang,
          target_lang: saved.target_lang,
          word_breakdown: translationData.word_breakdown,
          model: saved.model,
          created_at: saved.created_at,
          metadata: saved.metadata, // Trả về metadata đầy đủ
        },
      };
    } catch (error) {
      throw new Error(`Lỗi dịch với ví dụ: ${error.message}`);
    }
  },
};

module.exports = aiTranslationService;
