const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const config = require('../config');
const { query } = require('../config/database');
const { generateToken, verifyToken, hashToken } = require('../utils/jwt');
const { createSession, revokeSession } = require('../utils/session');
const { getFullUser } = require('../utils/userQuery');
const { publishEvent } = require('../services/rabbitmq');
const { createPresignedUrl } = require('../utils/s3');
const { sendPasswordResetEmail } = require('../services/email');

const googleClient = new OAuth2Client(config.googleClientId);

const buildTokenPayload = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  name: user.name,
  has_google: user.has_google,
  has_password: user.has_password,
});

// POST /auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email y password son requeridos' });
    }

    const { rows: existing } = await query(
      'SELECT id, google_id FROM users WHERE email = $1',
      [email]
    );

    if (existing.length > 0) {
      if (existing[0].google_id) {
        return res.status(409).json({ error: 'Esta cuenta ya existe, inicia sesión con Google' });
      }
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows: inserted } = await query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hashedPassword]
    );

    const userId = inserted[0].id;
    const user = await getFullUser(userId);
    const token = generateToken(buildTokenPayload(user));
    await createSession(userId, token, req);

    publishEvent('user.registered', { id: userId, email, name });

    return res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son requeridos' });
    }

    const { rows } = await query(
      'SELECT id, password, google_id FROM users WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email y/o contraseña inválidos' });
    }

    const dbUser = rows[0];

    if (!dbUser.password) {
      return res.status(401).json({ error: 'google_account' });
    }

    const valid = await bcrypt.compare(password, dbUser.password);
    if (!valid) {
      return res.status(401).json({ error: 'Email y/o contraseña inválidos' });
    }

    const user = await getFullUser(dbUser.id);
    const token = generateToken(buildTokenPayload(user));
    await createSession(dbUser.id, token, req);

    return res.status(200).json({ token, user });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /auth/google
const google = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'credential es requerido' });
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: config.googleClientId,
      });
    } catch {
      return res.status(401).json({ error: 'Token de Google inválido' });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    let userId = null;
    let isNew = false;

    // Search by google_id first
    const { rows: byGoogleId } = await query(
      'SELECT id FROM users WHERE google_id = $1',
      [googleId]
    );

    if (byGoogleId.length > 0) {
      userId = byGoogleId[0].id;
    } else {
      // Search by email
      const { rows: byEmail } = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (byEmail.length > 0) {
        userId = byEmail[0].id;
        // Link google_id if not yet linked
        await query(
          'UPDATE users SET google_id = $1, updated_at = NOW() WHERE id = $2 AND google_id IS NULL',
          [googleId, userId]
        );
      } else {
        // Create new user
        const { rows: inserted } = await query(
          'INSERT INTO users (name, email, google_id) VALUES ($1, $2, $3) RETURNING id',
          [name, email, googleId]
        );
        userId = inserted[0].id;
        isNew = true;
      }
    }

    const user = await getFullUser(userId);
    const token = generateToken(buildTokenPayload(user));
    await createSession(userId, token, req);

    if (isNew) {
      publishEvent('user.registered', { id: userId, email, name });
    }

    return res.status(200).json({ token, user });
  } catch (err) {
    console.error('Google auth error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /auth/logout
const logout = async (req, res) => {
  try {
    await revokeSession(req.tokenHash);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Logout error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /auth/refresh
const refresh = async (req, res) => {
  try {
    const user = await getFullUser(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await revokeSession(req.tokenHash);

    const token = generateToken(buildTokenPayload(user));
    await createSession(user.id, token, req);

    return res.status(200).json({ token, user });
  } catch (err) {
    console.error('Refresh error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /auth/token/renew
const tokenRenew = async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const rawToken = header.split(' ')[1];

    let payload;
    try {
      payload = verifyToken(rawToken);
    } catch {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const user = await getFullUser(payload.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Revoke previous session if exists
    const oldHash = hashToken(rawToken);
    await revokeSession(oldHash);

    const token = generateToken(buildTokenPayload(user));
    await createSession(user.id, token, req);

    return res.status(200).json({ token, user });
  } catch (err) {
    console.error('Token renew error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET /auth/me
const getMe = async (req, res) => {
  try {
    const user = await getFullUser(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error('GetMe error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PATCH /auth/me
const updateMe = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({ error: 'Nada que actualizar' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (name) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (email) {
      fields.push(`email = $${idx++}`);
      values.push(email);
    }

    fields.push('updated_at = NOW()');
    values.push(req.user.id);

    await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );

    const user = await getFullUser(req.user.id);
    const token = generateToken(buildTokenPayload(user));
    await createSession(user.id, token, req);

    return res.status(200).json({ token, user });
  } catch (err) {
    console.error('UpdateMe error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PATCH /auth/me/password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword y newPassword son requeridos' });
    }

    const { rows } = await query(
      'SELECT password FROM users WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    // Revoke all other sessions
    await query(
      'UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND token_hash != $2 AND revoked_at IS NULL',
      [req.user.id, req.tokenHash]
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('ChangePassword error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /auth/me/password/create
const createPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'newPassword es requerido y debe tener al menos 8 caracteres' });
    }

    const { rows } = await query(
      'SELECT password, google_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!rows[0].google_id) {
      return res.status(400).json({ error: 'Solo usuarios de Google pueden usar este endpoint' });
    }

    if (rows[0].password) {
      return res.status(400).json({ error: 'Ya tienes una contraseña. Usa el endpoint de cambio de contraseña.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('CreatePassword error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// DELETE /auth/me
const deleteMe = async (req, res) => {
  try {
    await query('DELETE FROM sessions WHERE user_id = $1', [req.user.id]);
    await query('DELETE FROM users WHERE id = $1', [req.user.id]);

    publishEvent('user.deleted', { user_id: req.user.id });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('DeleteMe error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET /auth/sessions
const getSessions = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, created_at, expires_at, user_agent, ip_address,
              token_hash = $2 AS is_current
         FROM sessions
        WHERE user_id = $1
          AND revoked_at IS NULL
          AND expires_at > NOW()
        ORDER BY created_at DESC`,
      [req.user.id, req.tokenHash]
    );

    return res.status(200).json(rows);
  } catch (err) {
    console.error('GetSessions error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// DELETE /auth/sessions
const revokeOtherSessions = async (req, res) => {
  try {
    await query(
      `UPDATE sessions SET revoked_at = NOW()
        WHERE user_id = $1
          AND token_hash != $2
          AND revoked_at IS NULL`,
      [req.user.id, req.tokenHash]
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('RevokeOtherSessions error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// DELETE /auth/sessions/:id
const revokeSessionById = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE sessions SET revoked_at = NOW()
        WHERE id = $1
          AND user_id = $2
          AND revoked_at IS NULL
        RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada o ya revocada' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('RevokeSessionById error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /auth/me/avatar/presign
const avatarPresign = async (req, res) => {
  try {
    const ext = req.body.ext || 'jpg';
    const key = `avatars/users/${req.user.id}-${Date.now()}.${ext}`;

    const result = await createPresignedUrl(key, ext);

    return res.status(200).json(result);
  } catch (err) {
    console.error('AvatarPresign error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /auth/me/avatar/custom
const avatarCustom = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url es requerido' });
    }

    const { rows: inserted } = await query(
      "INSERT INTO avatars (url, name, is_default) VALUES ($1, 'Foto personal', false) RETURNING id",
      [url]
    );

    await query(
      'UPDATE users SET avatar_id = $1, updated_at = NOW() WHERE id = $2',
      [inserted[0].id, req.user.id]
    );

    const user = await getFullUser(req.user.id);
    const token = generateToken(buildTokenPayload(user));
    await createSession(user.id, token, req);

    return res.status(200).json({ token, user });
  } catch (err) {
    console.error('AvatarCustom error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PATCH /auth/me/avatar
const avatarSelect = async (req, res) => {
  try {
    const { avatar_id } = req.body;

    if (!avatar_id) {
      return res.status(400).json({ error: 'avatar_id es requerido' });
    }

    const { rows: avatarRows } = await query(
      'SELECT id FROM avatars WHERE id = $1',
      [avatar_id]
    );

    if (avatarRows.length === 0) {
      return res.status(404).json({ error: 'Avatar no encontrado' });
    }

    await query(
      'UPDATE users SET avatar_id = $1, updated_at = NOW() WHERE id = $2',
      [avatar_id, req.user.id]
    );

    const user = await getFullUser(req.user.id);
    const token = generateToken(buildTokenPayload(user));
    await createSession(user.id, token, req);

    return res.status(200).json({ token, user });
  } catch (err) {
    console.error('AvatarSelect error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email es requerido' });
    }

    const { rows } = await query(
      'SELECT id, name FROM users WHERE email = $1',
      [email]
    );

    // Always respond 200 to not reveal if email exists
    if (rows.length === 0) {
      return res.status(200).json({ ok: true });
    }

    const user = rows[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Invalidate previous tokens
    await query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);

    await query(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    const resetUrl = `${config.clientUrl}/reset-password?token=${rawToken}`;

    await sendPasswordResetEmail(email, user.name, resetUrl);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('ForgotPassword error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'token y newPassword son requeridos' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { rows } = await query(
      'SELECT id, user_id FROM password_resets WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL',
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'El enlace no es válido o ya expiró' });
    }

    const resetRecord = rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, resetRecord.user_id]
    );

    // Mark token as used
    await query(
      'UPDATE password_resets SET used_at = NOW() WHERE id = $1',
      [resetRecord.id]
    );

    // Revoke all active sessions
    await query(
      'UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [resetRecord.user_id]
    );

    // Get user info for event
    const { rows: userRows } = await query(
      'SELECT name, email FROM users WHERE id = $1',
      [resetRecord.user_id]
    );

    if (userRows.length > 0) {
      publishEvent('password.reset', {
        user_id: resetRecord.user_id,
        name: userRows[0].name,
        email: userRows[0].email,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('ResetPassword error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  register, login, google, logout, refresh, tokenRenew,
  getMe, updateMe, changePassword, createPassword, deleteMe,
  getSessions, revokeOtherSessions, revokeSessionById,
  avatarPresign, avatarCustom, avatarSelect,
  forgotPassword, resetPassword,
};
