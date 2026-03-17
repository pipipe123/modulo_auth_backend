const { Router } = require('express');
const requireAuth = require('../middlewares/requireAuth');
const requireAdmin = require('../middlewares/requireAdmin');
const avatarController = require('../controllers/avatarController');

const router = Router();

/**
 * @openapi
 * /avatars:
 *   get:
 *     summary: Listar avatares predefinidos
 *     description: Devuelve todos los avatares con is_default = true ordenados por fecha de creación
 *     tags: [Avatares]
 *     responses:
 *       200:
 *         description: Lista de avatares predefinidos
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
 *                   url:
 *                     type: string
 *                   name:
 *                     type: string
 *       500:
 *         description: Error interno
 */
router.get('/', avatarController.list);

/**
 * @openapi
 * /avatars/presign:
 *   post:
 *     summary: URL firmada para subir avatar predefinido (admin)
 *     description: Genera presigned URL de S3 PutObjectCommand para subida directa. No escribe en BD.
 *     tags: [Avatares]
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
 *                 enum: [png, jpg]
 *                 default: png
 *               name:
 *                 type: string
 *                 default: Avatar
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
 *                 suggestedName:
 *                   type: string
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No eres admin
 *       500:
 *         description: Error interno
 */
router.post('/presign', requireAuth, requireAdmin, avatarController.presign);

/**
 * @openapi
 * /avatars:
 *   post:
 *     summary: Registrar avatar predefinido tras subida a S3 (admin)
 *     description: Guarda en BD la URL del avatar ya subido a S3. Solo admin.
 *     tags: [Avatares]
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
 *               name:
 *                 type: string
 *                 default: Avatar
 *     responses:
 *       201:
 *         description: Avatar registrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 url:
 *                   type: string
 *                 name:
 *                   type: string
 *       400:
 *         description: url faltante
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No eres admin
 *       500:
 *         description: Error interno
 */
router.post('/', requireAuth, requireAdmin, avatarController.create);

/**
 * @openapi
 * /avatars/{id}:
 *   delete:
 *     summary: Eliminar avatar predefinido (admin)
 *     description: Desasigna usuarios y elimina el avatar. Solo is_default = true.
 *     tags: [Avatares]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del avatar a eliminar
 *     responses:
 *       200:
 *         description: Avatar eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No eres admin
 *       404:
 *         description: Avatar no encontrado o no es predefinido
 *       500:
 *         description: Error interno
 */
router.delete('/:id', requireAuth, requireAdmin, avatarController.remove);

module.exports = router;
