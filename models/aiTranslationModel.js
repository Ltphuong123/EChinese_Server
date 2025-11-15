// file: models/aiTranslationModel.js
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

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
  await db.query('ALTER TABLE "AITranslations" ADD COLUMN IF NOT EXISTS model TEXT NULL;');
  ensured = true;
}

const aiTranslationModel = {
  create: async ({ user_id, source_text, translated_text, source_lang, target_lang, model }) => {
    await ensureTable();
    const id = uuidv4();
    const query = `
      INSERT INTO "AITranslations" (id, user_id, source_text, translated_text, source_lang, target_lang, model)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *;
    `;
    const values = [id, user_id || null, source_text, translated_text, source_lang, target_lang, model || null];
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
  }
};

module.exports = aiTranslationModel;
