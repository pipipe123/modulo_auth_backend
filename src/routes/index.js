const { Router } = require('express');
const authRoutes = require('./auth');
const avatarRoutes = require('./avatars');
const internalRoutes = require('./internal');

const router = Router();

router.use('/auth', authRoutes);
router.use('/auth/internal', internalRoutes);
router.use('/avatars', avatarRoutes);

/**
 * @openapi
 * /:
 *   get:
 *     summary: Health check
 *     description: Verifica que el servidor está activo
 *     responses:
 *       200:
 *         description: Servidor activo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Modulo Auth Backend is running
 */
router.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Modulo Auth Backend is running' });
});

module.exports = router;
