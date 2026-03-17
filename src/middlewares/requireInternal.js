const config = require('../config');

const requireInternal = (req, res, next) => {
  const secret = req.headers['x-internal-secret'];

  if (!secret || secret !== config.jwtSecret) {
    return res.status(401).json({ error: 'x-internal-secret incorrecto o faltante' });
  }

  next();
};

module.exports = requireInternal;
