/**
 * Security Middleware
 * Additional security measures beyond the basic packages
 */

const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

/**
 * Custom rate limiters for different endpoints
 */
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different actions
const rateLimiters = {
  // Very strict for authentication attempts
  auth: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts
    'Too many authentication attempts. Please try again in 15 minutes.'
  ),
  
  // Moderate for password reset requests
  passwordReset: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    3, // 3 attempts
    'Too many password reset requests. Please try again in 1 hour.'
  ),
  
  // Loose for cart operations
  cart: createRateLimiter(
    1 * 60 * 1000, // 1 minute
    100, // 100 requests (increased for better UX)
    'Too many cart operations. Please slow down.'
  ),
  
  // Moderate for checkout
  checkout: createRateLimiter(
    10 * 60 * 1000, // 10 minutes
    3, // 3 attempts
    'Too many checkout attempts. Please try again in 10 minutes.'
  )
};

/**
 * Input validation helpers
 */
const validateInput = {
  // Sanitize string input
  sanitizeString: (str, maxLength = 255) => {
    if (typeof str !== 'string') return '';
    return str.trim().substring(0, maxLength);
  },
  
  // Validate email format
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  // Validate MongoDB ObjectId
  isValidObjectId: (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }
};

/**
 * Log security events
 */
const logSecurityEvent = (event, req, additionalInfo = {}) => {
  const securityLog = {
    timestamp: new Date().toISOString(),
    event,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
    sessionId: req.sessionID,
    userId: req.session?.user?.id,
    ...additionalInfo
  };
  
  logger.warn('Security event', securityLog);
};

module.exports = {
  rateLimiters,
  validateInput,
  logSecurityEvent
};