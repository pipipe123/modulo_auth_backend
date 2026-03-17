const { Router } = require('express');
const requireAuth = require('../middlewares/requireAuth');
const authController = require('../controllers/authController');

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Registrar nueva cuenta
 *     description: Crea una cuenta con rol user, hashea la contraseña y publica user.registered a RabbitMQ
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cuenta creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Campos requeridos faltantes
 *       409:
 *         description: Email ya registrado
 *       500:
 *         description: Error interno
 */
router.post('/register', authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Autentica con email y contraseña, crea sesión y devuelve JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sesión iniciada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Campos requeridos faltantes
 *       401:
 *         description: Credenciales inválidas
 *       500:
 *         description: Error interno
 */
router.post('/login', authController.login);

/**
 * @openapi
 * /auth/google:
 *   post:
 *     summary: OAuth con Google
 *     description: Verifica ID token de Google, crea o vincula usuario, y devuelve JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credential]
 *             properties:
 *               credential:
 *                 type: string
 *                 description: ID token firmado por Google
 *     responses:
 *       200:
 *         description: Autenticación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: credential faltante
 *       401:
 *         description: Token de Google inválido
 *       500:
 *         description: Error interno
 */
router.post('/google', authController.google);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: Revoca la sesión actual marcando revoked_at en sessions
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Token faltante, inválido o sesión expirada
 *       500:
 *         description: Error interno
 */
router.post('/logout', requireAuth, authController.logout);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Renovar token
 *     description: Genera nuevo JWT con datos frescos de BD, revoca sesión actual y crea nueva
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token renovado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Sesión inválida o expirada
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno
 */
router.post('/refresh', requireAuth, authController.refresh);

/**
 * @openapi
 * /auth/token/renew:
 *   post:
 *     summary: Renovar token post-pago
 *     description: Regenera JWT verificando solo firma criptográfica, sin validar sesión en BD. Diseñado para flujo post-pago.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token renovado con rol actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Token faltante o inválido
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno
 */
router.post('/token/renew', authController.tokenRenew);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Solicitar enlace de recuperación
 *     description: Genera token de recuperación, envía email vía Resend. Siempre responde 200 para no revelar si el email existe.
 *     tags: [Recuperación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Solicitud procesada (siempre 200)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: email faltante
 *       500:
 *         description: Error al enviar email
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Restablecer contraseña con token
 *     description: Verifica token, actualiza contraseña, revoca todas las sesiones y publica password.reset a RabbitMQ
 *     tags: [Recuperación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token en crudo recibido por email
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Contraseña restablecida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Token inválido/expirado o contraseña menor de 8 caracteres
 *       500:
 *         description: Error interno
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Ver datos del usuario autenticado
 *     description: Devuelve datos del usuario desde BD, no del payload JWT
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Token inválido o sesión expirada
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno
 */
router.get('/me', requireAuth, authController.getMe);

/**
 * @openapi
 * /auth/me:
 *   patch:
 *     summary: Actualizar nombre y/o email
 *     description: Actualiza campos dinámicos y genera nuevo JWT con datos actualizados
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Ningún campo enviado
 *       401:
 *         description: Token inválido o sesión expirada
 *       500:
 *         description: Error interno
 */
router.patch('/me', requireAuth, authController.updateMe);

/**
 * @openapi
 * /auth/me/password:
 *   patch:
 *     summary: Cambiar contraseña
 *     description: Verifica contraseña actual y revoca todas las demás sesiones activas
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña cambiada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Campos faltantes
 *       401:
 *         description: Contraseña actual incorrecta o sesión inválida
 *       500:
 *         description: Error interno
 */
router.patch('/me/password', requireAuth, authController.changePassword);

/**
 * @openapi
 * /auth/me/password/create:
 *   post:
 *     summary: Crear contraseña (usuarios Google)
 *     description: Permite a usuarios registrados con Google añadir contraseña. Solo funciona si password IS NULL y google_id IS NOT NULL.
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Contraseña creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Contraseña muy corta, ya existe, o no es cuenta Google
 *       401:
 *         description: Sesión inválida
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno
 */
router.post('/me/password/create', requireAuth, authController.createPassword);

/**
 * @openapi
 * /auth/me:
 *   delete:
 *     summary: Eliminar cuenta permanentemente
 *     description: Elimina sesiones y usuario, publica user.deleted a RabbitMQ
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cuenta eliminada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Token inválido o sesión expirada
 *       500:
 *         description: Error interno
 */
router.delete('/me', requireAuth, authController.deleteMe);

/**
 * @openapi
 * /auth/sessions:
 *   get:
 *     summary: Ver sesiones activas
 *     description: Lista todas las sesiones activas del usuario. La sesión actual tiene is_current true.
 *     tags: [Sesiones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de sesiones activas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   expires_at:
 *                     type: string
 *                     format: date-time
 *                   user_agent:
 *                     type: string
 *                   ip_address:
 *                     type: string
 *                   is_current:
 *                     type: boolean
 *       401:
 *         description: Sesión inválida
 *       500:
 *         description: Error interno
 */
router.get('/sessions', requireAuth, authController.getSessions);

/**
 * @openapi
 * /auth/sessions:
 *   delete:
 *     summary: Cerrar todas las otras sesiones
 *     description: Revoca todas las sesiones activas excepto la actual
 *     tags: [Sesiones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Otras sesiones revocadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Sesión inválida
 *       500:
 *         description: Error interno
 */
router.delete('/sessions', requireAuth, authController.revokeOtherSessions);

/**
 * @openapi
 * /auth/sessions/{id}:
 *   delete:
 *     summary: Cerrar una sesión específica
 *     description: Revoca una sesión concreta del usuario por su UUID
 *     tags: [Sesiones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la sesión a revocar
 *     responses:
 *       200:
 *         description: Sesión revocada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Sesión inválida
 *       404:
 *         description: Sesión no encontrada o ya revocada
 *       500:
 *         description: Error interno
 */
router.delete('/sessions/:id', requireAuth, authController.revokeSessionById);

/**
 * @openapi
 * /auth/me/avatar/presign:
 *   post:
 *     summary: URL firmada para subir foto personal
 *     description: Genera presigned URL de S3 para que el usuario suba su foto de perfil directamente
 *     tags: [Avatar Usuario]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ext:
 *                 type: string
 *                 enum: [jpg, png]
 *                 default: jpg
 *     responses:
 *       200:
 *         description: URL firmada generada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 presignUrl:
 *                   type: string
 *                 url:
 *                   type: string
 *                 key:
 *                   type: string
 *       401:
 *         description: Sesión inválida
 *       500:
 *         description: Error interno
 */
router.post('/me/avatar/presign', requireAuth, authController.avatarPresign);

/**
 * @openapi
 * /auth/me/avatar/custom:
 *   post:
 *     summary: Guardar foto personal tras subida a S3
 *     description: Registra foto personalizada en BD, la asigna al usuario y devuelve JWT nuevo con avatar_url actualizado
 *     tags: [Avatar Usuario]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Foto guardada y JWT actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: url faltante
 *       401:
 *         description: Sesión inválida
 *       500:
 *         description: Error interno
 */
router.post('/me/avatar/custom', requireAuth, authController.avatarCustom);

/**
 * @openapi
 * /auth/me/avatar:
 *   patch:
 *     summary: Seleccionar avatar predefinido
 *     description: Asigna un avatar predefinido existente al usuario y emite nuevo JWT con avatar_url actualizado
 *     tags: [Avatar Usuario]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [avatar_id]
 *             properties:
 *               avatar_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Avatar seleccionado y JWT actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: avatar_id faltante
 *       401:
 *         description: Sesión inválida
 *       404:
 *         description: Avatar no encontrado
 *       500:
 *         description: Error interno
 */
router.patch('/me/avatar', requireAuth, authController.avatarSelect);

module.exports = router;
