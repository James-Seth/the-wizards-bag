module.exports = {
  // Application settings
  app: {
    name: 'The Wizards Bag',
    version: '1.0.0',
    description: 'E-commerce website for deck boxes and TTRPG accessories',
    author: 'Seth James',
  },

  // View engine settings
  views: {
    engine: 'ejs',
    cache: process.env.NODE_ENV === 'production'
  },

  // Security settings
  security: {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
      credentials: true
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