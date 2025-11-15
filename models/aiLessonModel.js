// file: models/aiLessonModel.js
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

let tableEnsured = false;
async function ensureTable() {
  if (tableEnsured) return;
  const sql = `
    CREATE TABLE IF NOT EXISTS "AILessons" (
      id UUID PRIMARY KEY,
      user_id UUID NULL,
      theme TEXT NOT NULL,
      level TEXT NOT NULL,
      content JSONB NOT NULL,
      model TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ailessons_user ON "AILessons" (user_id);
    CREATE INDEX IF NOT EXISTS idx_ailessons_created ON "AILessons" (created_at);
  `;
  await db.query(sql);
  // Ensure legacy deployments have required timestamp columns
  await db.query('ALTER TABLE "AILessons" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();');
  await db.query('ALTER TABLE "AILessons" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();');
  // Lightweight migration for deployments where the table existed without 'model'
  await db.query('ALTER TABLE "AILessons" ADD COLUMN IF NOT EXISTS model TEXT NULL;');
  tableEnsured = true;
}

const aiLessonModel = {
  create: async ({ user_id, theme, level, content, model }) => {
    await ensureTable();
    const id = uuidv4();
    const query = `
      INSERT INTO "AILessons" (id, user_id, theme, level, content, model)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [id, user_id || null, theme, level, content, model || null];
    const result = await db.query(query, values);
    return result.rows[0];
  },
  findByUser: async (userId, { limit, offset }) => {
    await ensureTable();
    const where = `WHERE user_id = $1`;
    const countQuery = `SELECT COUNT(*) FROM "AILessons" ${where};`;
    const totalResult = await db.query(countQuery, [userId]);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    const selectQuery = `
      SELECT id, user_id, theme, level, model, created_at, updated_at
      FROM "AILessons"
      ${where}
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const lessonsResult = await db.query(selectQuery, [userId, limit, offset]);
    return { lessons: lessonsResult.rows, totalItems };
  },
  findById: async (id) => {
    await ensureTable();
    const query = `SELECT * FROM "AILessons" WHERE id = $1;`;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  },
  deleteById: async (id) => {
    await ensureTable();
    const query = `DELETE FROM "AILessons" WHERE id = $1;`;
    const result = await db.query(query, [id]);
    return result.rowCount;
  },
};

module.exports = aiLessonModel;
