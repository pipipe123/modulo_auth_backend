const crypto = require('crypto');
const { query } = require('../config/database');
const { createPresignedUrl } = require('../utils/s3');

// GET /avatars
const list = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, url, name FROM avatars WHERE is_default = true ORDER BY created_at ASC'
    );

    return res.status(200).json(rows);
  } catch (err) {
    console.error('Avatar list error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /avatars/presign
const presign = async (req, res) => {
  try {
    const ext = req.body.ext || 'png';
    const suggestedName = req.body.name || 'Avatar';
    const id = crypto.randomUUID();
    const key = `avatars/defaults/${id}.${ext}`;

    const result = await createPresignedUrl(key, ext);

    return res.status(200).json({ ...result, suggestedName });
  } catch (err) {
    console.error('Avatar presign error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /avatars
const create = async (req, res) => {
  try {
    const { url, name } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url es requerido' });
    }

    const avatarName = name || 'Avatar';

    const { rows } = await query(
      'INSERT INTO avatars (url, name, is_default) VALUES ($1, $2, true) RETURNING id, url, name',
      [url, avatarName]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Avatar create error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// DELETE /avatars/:id
const remove = async (req, res) => {
  try {
    // Unassign users first to avoid FK violations
    await query('UPDATE users SET avatar_id = NULL WHERE avatar_id = $1', [req.params.id]);

    const { rows } = await query(
      'DELETE FROM avatars WHERE id = $1 AND is_default = true RETURNING id',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Avatar no encontrado o no es predefinido' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Avatar delete error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { list, presign, create, remove };
