// file: models/attemptModel.js

const db = require('../config/db');

const attemptModel = {

  findHistoryByExamAndUser: async (examId, userId) => {
    const queryText = `
      SELECT id, start_time, end_time, score_total, is_passed
      FROM "User_Exam_Attempts"
      WHERE exam_id = $1 AND user_id = $2
      ORDER BY start_time DESC;
    `;
    const result = await db.query(queryText, [examId, userId]);
    return result.rows;
  },

  createAttempt: async (data) => {
    // Lấy các trường cần thiết, đã bỏ total_questions
    const { exam_id, user_id, start_time, end_time } = data;

    // Câu lệnh INSERT đã được sửa, bỏ cột total_questions và placeholder $5
    const queryText = `
      INSERT INTO "User_Exam_Attempts" (exam_id, user_id, start_time, end_time)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
    
    // Mảng values đã được sửa, chỉ còn 4 tham số
    const values = [exam_id, user_id, start_time, end_time];
    
    const result = await db.query(queryText, values);
    return result.rows[0];
  },


  findAttemptByIdAndUser: async (attemptId, userId) => {
    const queryText = `
      SELECT a.*, e.exam_type_id, et.name as exam_type_name
      FROM "User_Exam_Attempts" a
      JOIN "Exams" e ON a.exam_id = e.id
      JOIN "Exam_Types" et ON e.exam_type_id = et.id
      WHERE a.id = $1 AND a.user_id = $2;
    `;
    const result = await db.query(queryText, [attemptId, userId]);
    return result.rows[0];
  },

  upsertAnswers: async (attemptId, answers) => {
    // Sử dụng transaction để đảm bảo tất cả các câu trả lời được lưu hoặc không có gì được lưu.
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Lặp qua từng câu trả lời và thực hiện lệnh upsert
        for (const answer of answers) {
            const queryText = `
                INSERT INTO "User_Answers" (attempt_id, question_id, user_response)
                VALUES ($1, $2, $3)
                ON CONFLICT (attempt_id, question_id) 
                DO UPDATE SET user_response = EXCLUDED.user_response;
            `;
            // EXCLUDED.user_response tham chiếu đến giá trị mới đang được chèn vào
            
            await client.query(queryText, [attemptId, answer.question_id, answer.user_response]);
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Lỗi khi upsert câu trả lời:", error);
        throw error;
    } finally {
        client.release();
    }
  },


  getAllQuestionsAndUserAnswersForGrading: async (attemptId) => {
    const queryText = `
      SELECT
        ua.id as user_answer_id,
        ua.user_response,
        q.id as question_id,
        q.points as question_points,
        qt.name as question_type_name,
        s.id as section_id,
        (SELECT jsonb_agg(ca.*) FROM "Correct_Answers" ca WHERE ca.question_id = q.id) as correct_answers,
        (SELECT jsonb_agg(o.*) FROM "Options" o WHERE o.question_id = q.id) as options
      FROM "User_Answers" ua
      JOIN "Questions" q ON ua.question_id = q.id
      JOIN "Question_Types" qt ON q.question_type_id = qt.id
      JOIN "Subsections" ss ON q.subsection_id = ss.id
      JOIN "Sections" s ON ss.section_id = s.id
      WHERE ua.attempt_id = $1;
    `;
    const result = await db.query(queryText, [attemptId]);
    return result.rows;
  },

  getSectionQuestionCounts: async (examId) => {
    const queryText = `
      SELECT 
        s.id as section_id,
        s.name as section_name,
        COUNT(q.id) as total_questions
      FROM "Sections" s
      JOIN "Subsections" ss ON ss.section_id = s.id
      JOIN "Questions" q ON q.subsection_id = ss.id
      WHERE s.exam_id = $1
      GROUP BY s.id, s.name
      ORDER BY s."order" ASC;
    `;
    const result = await db.query(queryText, [examId]);
    return result.rows;
  },

  updateAnswerResult: async (userAnswerId, isCorrect) => {
    const queryText = `UPDATE "User_Answers" SET is_correct = $1 WHERE id = $2;`;
    await db.query(queryText, [isCorrect, userAnswerId]);
  },

  finalizeAttempt: async (attemptId, scoreTotal, isPassed, sectionScores) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const updateAttemptQuery = `
            UPDATE "User_Exam_Attempts"
            SET end_time = CURRENT_TIMESTAMP, score_total = $1, is_passed = $2
            WHERE id = $3;
        `;
        await client.query(updateAttemptQuery, [scoreTotal, isPassed, attemptId]);
        
        for(const score of sectionScores) {
            const sectionScoreQuery = `
                INSERT INTO "User_Section_Scores" (attempt_id, section_id, score)
                VALUES ($1, $2, $3);
            `;
            await client.query(sectionScoreQuery, [attemptId, score.section_id, score.score]);
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
  },
  
  getFinalResult: async (attemptId, userId) => {
    const queryText = `
        SELECT
            a.id, a.start_time, a.end_time, a.score_total, a.is_passed,
            ex.name as exam_name,
            (
                SELECT jsonb_agg(jsonb_build_object(
                    'section_id', s.id,
                    'section_name', s.name,
                    'score', uss.score,
                    'correct_count', (
                        SELECT COUNT(*)
                        FROM "User_Answers" ua
                        JOIN "Questions" q ON ua.question_id = q.id
                        JOIN "Subsections" ss ON q.subsection_id = ss.id
                        WHERE ss.section_id = s.id 
                        AND ua.attempt_id = a.id 
                        AND ua.is_correct = true
                    ),
                    'total_questions', (
                        SELECT COUNT(*)
                        FROM "Questions" q
                        JOIN "Subsections" ss ON q.subsection_id = ss.id
                        WHERE ss.section_id = s.id
                    )
                ))
                FROM "User_Section_Scores" uss
                JOIN "Sections" s ON uss.section_id = s.id
                WHERE uss.attempt_id = a.id
            ) as section_scores,
            (
                SELECT jsonb_agg(question_details ORDER BY question_details.question_order ASC)
                FROM (
                    SELECT
                        q.id as question_id,
                        q.content as question_content,
                        q."order" as question_order,
                        ua.user_response,
                        ua.is_correct,
                        q.correct_answer as correct_answer_text, -- Dành cho câu điền từ/sắp xếp
                        (
                            SELECT jsonb_agg(ca.answer)
                            FROM "Correct_Answers" ca
                            WHERE ca.question_id = q.id
                        ) as correct_answers_list, -- Dành cho câu điền từ/sắp xếp có nhiều đáp án
                        (
                            SELECT jsonb_build_object('id', ex.id, 'content', ex.content)
                            FROM "Explanations" ex
                            WHERE ex.question_id = q.id
                            LIMIT 1
                        ) AS explanation,
                        -- Gom tất cả các options của câu hỏi
                        (
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'id', o.id,
                                    'label', o.label,
                                    'content', o.content,
                                    'is_correct', o.is_correct -- TRẢ VỀ ĐÁP ÁN ĐÚNG
                                ) ORDER BY o."order" ASC
                            )
                            FROM "Options" o
                            WHERE o.question_id = q.id
                        ) AS options
                    FROM "Questions" q
                    LEFT JOIN "User_Answers" ua ON q.id = ua.question_id AND ua.attempt_id = a.id
                    JOIN "Subsections" ss ON q.subsection_id = ss.id
                    JOIN "Sections" s ON ss.section_id = s.id
                    WHERE s.exam_id = a.exam_id
                ) as question_details
            ) as questions
        FROM "User_Exam_Attempts" a
        JOIN "Exams" ex ON a.exam_id = ex.id
        WHERE a.id = $1 AND a.user_id = $2 AND a.score_total IS NOT NULL;
    `;
    const result = await db.query(queryText, [attemptId, userId]);
    return result.rows[0];
  },


  




  // createAttempt: async (userId, examId) => {
  //   const query = `
  //     INSERT INTO "User_Exam_Attempts" (user_id, exam_id)
  //     VALUES ($1, $2)
  //     RETURNING id;
  //   `;
  //   const result = await db.query(query, [userId, examId]);
  //   return result.rows[0].id;
  // },

  // saveAnswer: async (attemptId, questionId, userResponse) => {
  //   const query = `
  //     INSERT INTO "User_Answers" (attempt_id, question_id, user_response)
  //     VALUES ($1, $2, $3)
  //     ON CONFLICT (attempt_id, question_id)
  //     DO UPDATE SET user_response = EXCLUDED.user_response;
  //   `;
  //   // userResponse có thể là JSON object cho các câu trả lời phức tạp
  //   await db.query(query, [attemptId, questionId, userResponse]);
  // },

  // submitAttempt: async (attemptId, scores) => {
  //   const { totalScore, sectionScores, isPassed } = scores;
  //   const client = await db.pool.connect();
  //   try {
  //     await client.query('BEGIN');

  //     // Cập nhật attempt chính
  //     await client.query(
  //       `UPDATE "User_Exam_Attempts" SET end_time = CURRENT_TIMESTAMP, score_total = $1, is_passed = $2 WHERE id = $3`,
  //       [totalScore, isPassed, attemptId]
  //     );

  //     // Cập nhật điểm từng câu
  //     for (const answerScore of scores.answerScores) {
  //       await client.query(
  //         `UPDATE "User_Answers" SET is_correct = $1, score = $2 WHERE attempt_id = $3 AND question_id = $4`,
  //         [answerScore.isCorrect, answerScore.score, attemptId, answerScore.questionId]
  //       );
  //     }
      
  //     // Thêm điểm từng phần
  //     for (const sectionScore of sectionScores) {
  //        await client.query(
  //         `INSERT INTO "User_Section_Scores" (attempt_id, section_id, score) VALUES ($1, $2, $3)`,
  //         [attemptId, sectionScore.sectionId, sectionScore.score]
  //        );
  //     }

  //     await client.query('COMMIT');
  //   } catch (error) {
  //     await client.query('ROLLBACK');
  //     throw error;
  //   } finally {
  //     client.release();
  //   }
  // },

  // getAttemptResult: async (attemptId) => {
  //     const attemptQuery = `SELECT * FROM "User_Exam_Attempts" WHERE id = $1`;
  //     const answersQuery = `
  //       SELECT 
  //           ua.*, 
  //           q.content as question_content, 
  //           e.content as explanation,
  //           (SELECT json_agg(ca.*) FROM "Correct_Answers" ca WHERE ca.question_id = ua.question_id) as correct_answers,
  //           (SELECT json_agg(o.*) FROM "Options" o WHERE o.question_id = ua.question_id) as options
  //       FROM "User_Answers" ua
  //       JOIN "Questions" q ON ua.question_id = q.id
  //       LEFT JOIN "Explanations" e ON ua.question_id = e.question_id
  //       WHERE ua.attempt_id = $1;
  //     `;
  //     const [attemptRes, answersRes] = await Promise.all([
  //         db.query(attemptQuery, [attemptId]),
  //         db.query(answersQuery, [attemptId])
  //     ]);

  //     if (attemptRes.rowCount === 0) return null;

  //     return {
  //         attempt: attemptRes.rows[0],
  //         answers: answersRes.rows
  //     };
  // },

  // findAttemptInfoById: async (attemptId) => {
  //   const query = `
  //     SELECT id, user_id, exam_id, start_time, end_time, score_total, is_passed
  //     FROM "User_Exam_Attempts"
  //     WHERE id = $1;
  //   `;
  //   const result = await db.query(query, [attemptId]);
  //   return result.rows[0];
  // },

  // /**
  //  * Lấy tất cả các bản ghi câu trả lời của người dùng cho một lượt làm bài.
  //  */
  // findAllUserAnswersByAttemptId: async (attemptId) => {
  //   const query = `SELECT * FROM "User_Answers" WHERE attempt_id = $1;`;
  //   const result = await db.query(query, [attemptId]);
  //   return result.rows;
  // },

  // /**
  //  * Lấy điểm số của tất cả các phần thi cho một lượt làm bài.
  //  */
  // findSectionScoresByAttemptId: async (attemptId) => {
  //   const query = `SELECT * FROM "User_Section_Scores" WHERE attempt_id = $1;`;
  //   const result = await db.query(query, [attemptId]);
  //   return result.rows;
  // }
};

module.exports = attemptModel;