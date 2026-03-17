const config = require('../config');

const requireAdmin = (req, res, next) => {
  const internalSecret = req.headers['x-internal-secret'];

  if (internalSecret && internalSecret === config.internalSecret) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'No eres admin' });
  }

  next();
};

module.exports = requireAdmin;
