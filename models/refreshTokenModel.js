// file: models/refreshTokenModel.js
const db = require('../config/db');

const refreshTokenModel = {
    createToken: async ({ user_id, token, expires_at }) => {
        const queryText = `
            INSERT INTO "RefreshTokens" (user_id, token, expires_at)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const result = await db.query(queryText, [user_id, token, expires_at]);
        return result.rows[0];
    },

    findToken: async (token) => {
        const queryText = `SELECT * FROM "RefreshTokens" WHERE token = $1;`;
        const result = await db.query(queryText, [token]);
        return result.rows[0];
    },

    deleteToken: async (token) => {
        const queryText = `DELETE FROM "RefreshTokens" WHERE token = $1;`;
        await db.query(queryText, [token]);
    },
};

module.exports = refreshTokenModel;