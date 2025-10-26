// models/testAttemptModel.js

const db = require('../config/db');

const testAttemptModel = {
  createAttempt: async (userId, testId) => {
    const query = `INSERT INTO "UserTestAttempts" (user_id, test_id) VALUES ($1, $2) RETURNING *;`;
    const result = await db.query(query, [userId, testId]);
    return result.rows[0];
  },

  findAttemptByIdAndUser: async (attemptId, userId) => {
      const query = `SELECT * FROM "UserTestAttempts" WHERE id = $1 AND user_id = $2;`;
      const result = await db.query(query, [attemptId, userId]);
      return result.rows[0];
  },

  saveAnswer: async (attemptId, questionId, selectedAnswer, timeSpent) => {
    // Dùng ON CONFLICT để UPSERT (update nếu đã tồn tại, insert nếu chưa)
    const query = `
      INSERT INTO "UserTestAnswers" (attempt_id, question_id, selected_answer, time_spent)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (attempt_id, question_id) DO UPDATE SET
        selected_answer = EXCLUDED.selected_answer,
        time_spent = EXCLUDED.time_spent
      RETURNING *;
    `;
    const result = await db.query(query, [attemptId, questionId, selectedAnswer, timeSpent]);
    return result.rows[0];
  },
  
  submitAttempt: async (attemptId, totalScore, sectionScores) => {
      const query = `
        UPDATE "UserTestAttempts" 
        SET submitted_at = NOW(), total_score = $2, section_scores = $3 
        WHERE id = $1 RETURNING *;
      `;
      const result = await db.query(query, [attemptId, totalScore, sectionScores]);
      return result.rows[0];
  },
  
  updateHighestScore: async (userId, testId, newScore) => {
    const query = `
      INSERT INTO "UserTestScores" (user_id, test_id, highest_total_score)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, test_id) DO UPDATE SET
        highest_total_score = GREATEST("UserTestScores".highest_total_score, EXCLUDED.highest_total_score)
      RETURNING *;
    `;
    await db.query(query, [userId, testId, newScore]);
  },
  
  getAnswersForScoring: async (attemptId) => {
    const query = `
      SELECT u.*, q.correct_answer, q.section_id
      FROM "UserTestAnswers" u
      JOIN "MockTestQuestions" q ON u.question_id = q.id
      WHERE u.attempt_id = $1;
    `;
    const result = await db.query(query, [attemptId]);
    return result.rows;
  },
  
  getDetailedResult: async (attemptId) => {
      const query = `
        SELECT
            uta.*,
            (SELECT jsonb_agg(sections_agg ORDER BY order_no) FROM (
                SELECT s.*,
                    (SELECT jsonb_agg(questions_agg ORDER BY order_no) FROM (
                        SELECT
                            q.*,
                            ans.selected_answer,
                            ans.is_correct
                        FROM "MockTestQuestions" q
                        LEFT JOIN "UserTestAnswers" ans ON ans.question_id = q.id AND ans.attempt_id = uta.id
                        WHERE q.section_id = s.id
                    ) AS questions_agg) AS questions
                FROM "MockTestSections" s
                WHERE s.test_id = uta.test_id
            ) AS sections_agg) AS sections
        FROM "UserTestAttempts" uta
        WHERE uta.id = $1;
    `;
    const result = await db.query(query, [attemptId]);
    return result.rows[0];
  },
  
  findHistoryByUser: async (userId, limit, offset) => {
      const dataQuery = `
        SELECT a.id, a.submitted_at, a.total_score, t.title, t.level, t.type
        FROM "UserTestAttempts" a
        JOIN "MockTests" t ON a.test_id = t.id
        WHERE a.user_id = $1 AND a.submitted_at IS NOT NULL
        ORDER BY a.submitted_at DESC
        LIMIT $2 OFFSET $3;
      `;
       const countQuery = `SELECT COUNT(*) FROM "UserTestAttempts" WHERE user_id = $1 AND submitted_at IS NOT NULL`;

       const [dataResult, countResult] = await Promise.all([
           db.query(dataQuery, [userId, limit, offset]),
           db.query(countQuery, [userId]),
       ]);
       
       return {
           history: dataResult.rows,
           total: parseInt(countResult.rows[0].count, 10),
       };
  },
  
  findScoresByUser: async (userId) => {
    const query = `
        SELECT s.highest_total_score, t.title, t.level, t.type
        FROM "UserTestScores" s
        JOIN "MockTests" t ON s.test_id = t.id
        WHERE s.user_id = $1
        ORDER BY s.created_at DESC;
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }
};

module.exports = testAttemptModel;