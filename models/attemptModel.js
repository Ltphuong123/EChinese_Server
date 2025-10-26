// file: models/attemptModel.js

const db = require('../config/db');

const attemptModel = {
  createAttempt: async (userId, examId) => {
    const query = `
      INSERT INTO "User_Exam_Attempts" (user_id, exam_id)
      VALUES ($1, $2)
      RETURNING id;
    `;
    const result = await db.query(query, [userId, examId]);
    return result.rows[0].id;
  },

  saveAnswer: async (attemptId, questionId, userResponse) => {
    const query = `
      INSERT INTO "User_Answers" (attempt_id, question_id, user_response)
      VALUES ($1, $2, $3)
      ON CONFLICT (attempt_id, question_id)
      DO UPDATE SET user_response = EXCLUDED.user_response;
    `;
    // userResponse có thể là JSON object cho các câu trả lời phức tạp
    await db.query(query, [attemptId, questionId, userResponse]);
  },

  submitAttempt: async (attemptId, scores) => {
    const { totalScore, sectionScores, isPassed } = scores;
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Cập nhật attempt chính
      await client.query(
        `UPDATE "User_Exam_Attempts" SET end_time = CURRENT_TIMESTAMP, score_total = $1, is_passed = $2 WHERE id = $3`,
        [totalScore, isPassed, attemptId]
      );

      // Cập nhật điểm từng câu
      for (const answerScore of scores.answerScores) {
        await client.query(
          `UPDATE "User_Answers" SET is_correct = $1, score = $2 WHERE attempt_id = $3 AND question_id = $4`,
          [answerScore.isCorrect, answerScore.score, attemptId, answerScore.questionId]
        );
      }
      
      // Thêm điểm từng phần
      for (const sectionScore of sectionScores) {
         await client.query(
          `INSERT INTO "User_Section_Scores" (attempt_id, section_id, score) VALUES ($1, $2, $3)`,
          [attemptId, sectionScore.sectionId, sectionScore.score]
         );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  getAttemptResult: async (attemptId) => {
      const attemptQuery = `SELECT * FROM "User_Exam_Attempts" WHERE id = $1`;
      const answersQuery = `
        SELECT 
            ua.*, 
            q.content as question_content, 
            e.content as explanation,
            (SELECT json_agg(ca.*) FROM "Correct_Answers" ca WHERE ca.question_id = ua.question_id) as correct_answers,
            (SELECT json_agg(o.*) FROM "Options" o WHERE o.question_id = ua.question_id) as options
        FROM "User_Answers" ua
        JOIN "Questions" q ON ua.question_id = q.id
        LEFT JOIN "Explanations" e ON ua.question_id = e.question_id
        WHERE ua.attempt_id = $1;
      `;
      const [attemptRes, answersRes] = await Promise.all([
          db.query(attemptQuery, [attemptId]),
          db.query(answersQuery, [attemptId])
      ]);

      if (attemptRes.rowCount === 0) return null;

      return {
          attempt: attemptRes.rows[0],
          answers: answersRes.rows
      };
  },

  findAttemptInfoById: async (attemptId) => {
    const query = `
      SELECT id, user_id, exam_id, start_time, end_time, score_total, is_passed
      FROM "User_Exam_Attempts"
      WHERE id = $1;
    `;
    const result = await db.query(query, [attemptId]);
    return result.rows[0];
  },

  /**
   * Lấy tất cả các bản ghi câu trả lời của người dùng cho một lượt làm bài.
   */
  findAllUserAnswersByAttemptId: async (attemptId) => {
    const query = `SELECT * FROM "User_Answers" WHERE attempt_id = $1;`;
    const result = await db.query(query, [attemptId]);
    return result.rows;
  },

  /**
   * Lấy điểm số của tất cả các phần thi cho một lượt làm bài.
   */
  findSectionScoresByAttemptId: async (attemptId) => {
    const query = `SELECT * FROM "User_Section_Scores" WHERE attempt_id = $1;`;
    const result = await db.query(query, [attemptId]);
    return result.rows;
  }
};

module.exports = attemptModel;