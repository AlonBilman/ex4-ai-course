const rateLimit = require('express-rate-limit');

// Generic API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth routes – mitigate brute-force login attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict limiter for survey creation
const surveyCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many survey creation requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  surveyCreationLimiter,
}; 