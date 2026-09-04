const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 1500 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests. Please slow down and try again shortly.',
    });
  },
});

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 30 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many attempts from this IP. Please try again in 15 minutes.',
    });
  },
});

module.exports = { generalLimiter, strictAuthLimiter };
