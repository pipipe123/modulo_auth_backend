const { verifyToken, hashToken } = require('../utils/jwt');
const { query } = require('../config/database');

const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const token = header.split(' ')[1];
    const payload = verifyToken(token);
    const tokenHash = hashToken(token);

    const { rows } = await query(
      'SELECT id FROM sessions WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()',
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }

    req.user = payload;
    req.tokenHash = tokenHash;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = requireAuth;
