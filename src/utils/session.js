const { query } = require('../config/database');
const { hashToken } = require('./jwt');

const createSession = async (userId, token, req) => {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const userAgent = req.headers['user-agent'] || null;
  const ipAddress = req.ip || req.connection?.remoteAddress || null;

  await query(
    'INSERT INTO sessions (user_id, token_hash, expires_at, user_agent, ip_address) VALUES ($1, $2, $3, $4, $5)',
    [userId, tokenHash, expiresAt, userAgent, ipAddress]
  );

  return tokenHash;
};

const revokeSession = async (tokenHash) => {
  await query(
    'UPDATE sessions SET revoked_at = NOW() WHERE token_hash = $1',
    [tokenHash]
  );
};

module.exports = { createSession, revokeSession };
