const { Router } = require('express');
const requireInternal = require('../middlewares/requireInternal');
const internalController = require('../controllers/internalController');

const router = Router();

router.use(requireInternal);

/**
 * @openapi
 * /auth/internal/users:
 *   get:
 *     summary: Listar usuarios con paginación y búsqueda
 *     description: Devuelve usuarios paginados con búsqueda ILIKE por nombre o email. Requiere x-internal-secret.
 *     tags: [Interno]
 *     parameters:
 *       - in: header
 *         name: x-internal-secret
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Búsqueda por nombre o email
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista paginada de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 total:
 *                   type: integer
 *       401:
 *         description: x-internal-secret incorrecto o faltante
 *       500:
 *         description: Error interno
 */
router.get('/users', internalController.listUsers);

/**
 * @openapi
 * /auth/internal/users/{id}/role:
 *   patch:
 *     summary: Cambiar rol de un usuario
 *     description: Actualiza el rol a user, premium o admin. Requiere x-internal-secret.
 *     tags: [Interno]
 *     parameters:
 *       - in: header
 *         name: x-internal-secret
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, premium, admin]
 *     responses:
 *       200:
 *         description: Rol actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *       400:
 *         description: Rol inválido
 *       401:
 *         description: x-internal-secret incorrecto
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno
 */
router.patch('/users/:id/role', internalController.changeRole);

/**
 * @openapi
 * /auth/internal/stats:
 *   get:
 *     summary: Estadísticas de usuarios por rol
 *     description: Conteos agrupados por rol. Requiere x-internal-secret.
 *     tags: [Interno]
 *     parameters:
 *       - in: header
 *         name: x-internal-secret
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estadísticas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 free:
 *                   type: integer
 *                 premium:
 *                   type: integer
 *                 admin:
 *                   type: integer
 *       401:
 *         description: x-internal-secret incorrecto
 *       500:
 *         description: Error interno
 */
router.get('/stats', internalController.getStats);

/**
 * @openapi
 * /auth/internal/user/{userId}:
 *   get:
 *     summary: Obtener usuario por ID
 *     description: Datos completos de un usuario específico. Requiere x-internal-secret.
 *     tags: [Interno]
 *     parameters:
 *       - in: header
 *         name: x-internal-secret
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Datos del usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: x-internal-secret incorrecto
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno
 */
router.get('/user/:userId', internalController.getUserById);

/**
 * @openapi
 * /auth/internal/upgrade/{userId}:
 *   patch:
 *     summary: Subir rol a premium
 *     description: Actualiza rol a premium directamente. Requiere x-internal-secret.
 *     tags: [Interno]
 *     parameters:
 *       - in: header
 *         name: x-internal-secret
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Usuario promovido a premium
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                   example: premium
 *       401:
 *         description: x-internal-secret incorrecto
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno
 */
router.patch('/upgrade/:userId', internalController.upgrade);

/**
 * @openapi
 * /auth/internal/downgrade/{userId}:
 *   patch:
 *     summary: Bajar rol a user (free)
 *     description: Actualiza rol a user. Requiere x-internal-secret.
 *     tags: [Interno]
 *     parameters:
 *       - in: header
 *         name: x-internal-secret
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Usuario degradado a user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                   example: user
 *       401:
 *         description: x-internal-secret incorrecto
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno
 */
router.patch('/downgrade/:userId', internalController.downgrade);

module.exports = router;
