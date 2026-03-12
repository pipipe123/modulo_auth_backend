const { Router } = require('express');

const router = Router();

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
