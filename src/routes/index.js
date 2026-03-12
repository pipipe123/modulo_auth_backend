const { Router } = require('express');

const router = Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Modulo Auth Backend is running' });
});

module.exports = router;
