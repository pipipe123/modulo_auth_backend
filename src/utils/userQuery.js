const { query } = require('../config/database');

const getFullUser = async (userId) => {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.role, u.avatar_id, a.url AS avatar_url,
            (u.google_id IS NOT NULL) AS has_google, (u.password IS NOT NULL) AS has_password
     FROM users u
     LEFT JOIN avatars a ON a.id = u.avatar_id
     WHERE u.id = $1`,
    [userId]
  );

  return rows[0] || null;
};

module.exports = { getFullUser };
