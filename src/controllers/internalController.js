const { query } = require('../config/database');
const { getFullUser } = require('../utils/userQuery');

const VALID_ROLES = ['user', 'premium', 'admin'];

// GET /auth/internal/users
const listUsers = async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const pattern = `%${search}%`;

    const { rows: users } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.avatar_id, a.url AS avatar_url,
              (u.google_id IS NOT NULL) AS has_google, (u.password IS NOT NULL) AS has_password
         FROM users u LEFT JOIN avatars a ON a.id = u.avatar_id
        WHERE u.name ILIKE $1 OR u.email ILIKE $1
        ORDER BY u.created_at DESC LIMIT $2 OFFSET $3`,
      [pattern, limit, offset]
    );

    const { rows: countRows } = await query(
      'SELECT COUNT(*)::int AS total FROM users WHERE name ILIKE $1 OR email ILIKE $1',
      [pattern]
    );

    return res.status(200).json({ users, total: countRows[0].total });
  } catch (err) {
    console.error('ListUsers error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PATCH /auth/internal/users/:id/role
const changeRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const { rows } = await query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role',
      [role, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('ChangeRole error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET /auth/internal/stats
const getStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE role = 'user')::int    AS free,
         COUNT(*) FILTER (WHERE role = 'premium')::int AS premium,
         COUNT(*) FILTER (WHERE role = 'admin')::int   AS admin
       FROM users`
    );

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('GetStats error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET /auth/internal/user/:userId
const getUserById = async (req, res) => {
  try {
    const user = await getFullUser(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error('GetUserById error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PATCH /auth/internal/upgrade/:userId
const upgrade = async (req, res) => {
  try {
    const { rows } = await query(
      "UPDATE users SET role = 'premium', updated_at = NOW() WHERE id = $1 RETURNING id, email, role",
      [req.params.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Upgrade error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PATCH /auth/internal/downgrade/:userId
const downgrade = async (req, res) => {
  try {
    const { rows } = await query(
      "UPDATE users SET role = 'user', updated_at = NOW() WHERE id = $1 RETURNING id, email, role",
      [req.params.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Downgrade error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { listUsers, changeRole, getStats, getUserById, upgrade, downgrade };
