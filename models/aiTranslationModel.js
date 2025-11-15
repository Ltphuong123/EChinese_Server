// file: models/aiTranslationModel.js
const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  const sql = `
    CREATE TABLE IF NOT EXISTS "AITranslations" (
      id UUID PRIMARY KEY,
      user_id UUID NULL,
      source_text TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      source_lang VARCHAR(10) NOT NULL,
      target_lang VARCHAR(10) NOT NULL,
      model TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ai_translations_user ON "AITranslations" (user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_translations_created ON "AITranslations" (created_at);
  `;
  await db.query(sql);
  // migrations for legacy
  await db.query(
    'ALTER TABLE "AITranslations" ADD COLUMN IF NOT EXISTS model TEXT NULL;'
  );
  ensured = true;
}

const aiTranslationModel = {
  create: async ({
    user_id,
    source_text,
    translated_text,
    source_lang,
    target_lang,
    model,
  }) => {
    await ensureTable();
    const id = uuidv4();
    const query = `
      INSERT INTO "AITranslations" (id, user_id, source_text, translated_text, source_lang, target_lang, model)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *;
    `;
    const values = [
      id,
      user_id || null,
      source_text,
      translated_text,
      source_lang,
      target_lang,
      model || null,
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  },
  findByUser: async (userId, { limit, offset }) => {
    await ensureTable();
    const countQ = `SELECT COUNT(*) FROM "AITranslations" WHERE user_id = $1;`;
    const totalResult = await db.query(countQ, [userId]);
    const totalItems = parseInt(totalResult.rows[0].count, 10);
    const selectQ = `
      SELECT id, source_text, translated_text, source_lang, target_lang, model, created_at
      FROM "AITranslations"
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const rows = await db.query(selectQ, [userId, limit, offset]);
    return { translations: rows.rows, totalItems };
  },
  deleteByIdForUser: async (id, userId) => {
    await ensureTable();
    const q = `DELETE FROM "AITranslations" WHERE id = $1 AND user_id = $2 RETURNING id;`;
    const result = await db.query(q, [id, userId]);
    return result.rowCount; // 1 if deleted, 0 if not found/unauthorized
  },
  deleteAllForUser: async (userId) => {
    await ensureTable();
    const q = `DELETE FROM "AITranslations" WHERE user_id = $1;`;
    const result = await db.query(q, [userId]);
    return result.rowCount; // number of rows deleted
  },

  // Đếm số lượng dịch của user trong ngày hôm nay
  countTodayTranslations: async (userId) => {
    await ensureTable();
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    const q = `
      SELECT COUNT(*) as count
      FROM "AITranslations" 
      WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3;
    `;
    const result = await db.query(q, [userId, startOfDay, endOfDay]);
    return parseInt(result.rows[0].count, 10);
  },

  // Lấy thống kê lượt dịch theo thời gian
  getTranslationStats: async (userId, period) => {
    await ensureTable();
    const now = new Date();
    let startDate, endDate, groupBy, selectFields;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
        groupBy = `DATE_TRUNC('hour', created_at)`;
        selectFields = `${groupBy} as period, COUNT(*) as count`;
        break;

      case "week":
        // Tính từ thứ 2 tuần này
        const currentDay = now.getDay();
        const mondayOffset = currentDay === 0 ? 6 : currentDay - 1;
        startDate = new Date(now);
        startDate.setDate(now.getDate() - mondayOffset);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        groupBy = `DATE_TRUNC('day', created_at)`;
        selectFields = `${groupBy} as period, COUNT(*) as count`;
        break;

      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
        groupBy = `DATE_TRUNC('day', created_at)`;
        selectFields = `${groupBy} as period, COUNT(*) as count`;
        break;

      default:
        throw new Error('Invalid period. Must be "today", "week", or "month"');
    }

    const whereClause = userId ? "WHERE user_id = $1 AND" : "WHERE";
    const params = userId ? [userId, startDate, endDate] : [startDate, endDate];

    const q = `
      SELECT ${selectFields}
      FROM "AITranslations" 
      ${whereClause} created_at >= $${userId ? 2 : 1} AND created_at <= $${
      userId ? 3 : 2
    }
      GROUP BY ${groupBy}
      ORDER BY period ASC;
    `;

    const result = await db.query(q, params);

    // Tính tổng số lượt dịch trong khoảng thời gian
    const totalQ = `
      SELECT COUNT(*) as total
      FROM "AITranslations" 
      ${whereClause} created_at >= $${userId ? 2 : 1} AND created_at <= $${
      userId ? 3 : 2
    };
    `;
    const totalResult = await db.query(totalQ, params);

    return {
      period,
      startDate,
      endDate,
      total: parseInt(totalResult.rows[0].total, 10),
      data: result.rows,
    };
  },
};

module.exports = aiTranslationModel;
