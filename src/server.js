const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const path = require('path');
const flash = require('connect-flash');

// Security middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');

// Load configuration
const connectDB = require('../config/database');
const appConfig = require('../config/app');
const { logger, requestLogger, errorLogger } = require('./utils/logger');
const { initializeCart } = require('./middleware/cart');
const { setLocals } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
const databaseReady = connectDB();

// Security: Trust proxy if behind reverse proxy (for rate limiting)
app.set('trust proxy', 1);

// Security: Helmet for various security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'", "cdnjs.cloudflare.com"],
    },
  },
}));

// Security: Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs (increased for better UX)
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  skipSuccessfulRequests: true,
});

// Apply rate limiting
app.use(generalLimiter);
app.use('/auth/login', authLimiter);
app.use('/auth/signup', authLimiter);

// Security: Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Performance: Compression middleware
app.use(compression());

// Logging: HTTP request logger
app.use(requestLogger);

// Set view engine
app.set('view engine', appConfig.views.engine);
app.set('views', path.join(__dirname, '../views'));

// Persist sessions in the same MongoDB database as application data.
const sessionStore = MongoStore.create({
  clientPromise: databaseReady.then(connection => connection.getClient()),
  ttl: 7 * 24 * 60 * 60
});
sessionStore.on('error', error => logger.error('Session store error', { error }));

// Middleware
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'wizards-bag-secret-change-in-production',
  resave: false,
  saveUninitialized: false, // Don't create session until something stored
  name: 'sessionId', // Don't use default session name
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks on session cookie
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'strict' // CSRF protection
  }
}));
app.use(flash()); // Use connect-flash after session middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize cart in session for all requests
app.use(initializeCart);

// Make user available in all templates
app.use(setLocals);

// Routes
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const checkoutRoutes = require('./routes/checkout');
const authRoutes = require('./routes/auth');
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/auth', authRoutes);

// Home route
app.get('/', (req, res) => {
  res.render('index', { title: 'The Wizard\'s Bag' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Error handling
app.use(errorLogger); // Log errors

// Global error handler
app.use((err, req, res, next) => {
  // Log error details but don't expose them to client in production
  logger.error('Unhandled application error', { error: err });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const errorMessage = isDevelopment ? err.message : 'Something went wrong';
  
  res.status(err.status || 500).render('error', {
    error: errorMessage,
    title: 'Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { 
    error: 'Page not found', 
    title: '404 - Page Not Found' 
  });
});

app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    url: `http://localhost:${PORT}`,
    environment: process.env.NODE_ENV || 'development',
    rateLimitingEnabled: true,
    helmetEnabled: true
  });
});