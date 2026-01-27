/**
 * Security Middleware
 * Additional security measures beyond the basic packages
 */

const rateLimit = require('express-rate-limit');

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
    20, // 20 requests
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
 * Security headers middleware for specific routes
 */
const securityHeaders = (req, res, next) => {
  // Additional security headers for sensitive operations
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

/**
 * Sanitize request body for dangerous patterns
 */
const sanitizeBody = (req, res, next) => {
  if (req.body) {
    // Remove any keys that start with $ or contain .
    const sanitize = (obj) => {
      for (const key in obj) {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
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
  
  console.warn('SECURITY EVENT:', JSON.stringify(securityLog, null, 2));
};

module.exports = {
  rateLimiters,
  validateInput,
  securityHeaders,
  sanitizeBody,
  logSecurityEvent
};