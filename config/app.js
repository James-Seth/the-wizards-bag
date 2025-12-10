module.exports = {
  // Application settings
  app: {
    name: 'The Wizards Bag',
    version: '1.0.0',
    description: 'E-commerce website fordeck boxes and TTRPG accessories',
    author: 'Kevin',
  },

  // View engine settings
  views: {
    engine: 'ejs',
    cache: process.env.NODE_ENV === 'production'
  },

  // Session settings (for future authentication)
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  // Security settings
  security: {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
      credentials: true
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },

  // Pagination settings
  pagination: {
    defaultLimit: 12,
    maxLimit: 50
  },

  // File upload settings (for future image uploads)
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    destination: './public/uploads/'
  }
};