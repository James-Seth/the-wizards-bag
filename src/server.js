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
const { exposeCart } = require('./middleware/cart');
const { setLocals } = require('./middleware/auth');

// Security: the session secret signs every session cookie. Anyone who knows it can
// forge a cookie and log in as any user. The old code fell back to a secret that is
// visible on GitHub, so in production we refuse to start without a real one.
const DEV_SESSION_SECRET = 'wizards-bag-dev-only-secret';
const EXAMPLE_SESSION_SECRET = 'your-super-secret-session-key-change-this-in-production'; // the placeholder in .env.example
const sessionSecret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === 'production' &&
    (!sessionSecret || sessionSecret.length < 32 || sessionSecret === EXAMPLE_SESSION_SECRET)) {
  console.error('FATAL: SESSION_SECRET must be set to a random string of at least 32 characters in production.');
  console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
const databaseReady = connectDB();

// Security: Only trust X-Forwarded-For when we are actually behind a reverse proxy.
// If we trust it without a proxy, any client can fake their IP in that header
// and get a fresh rate-limit allowance on every request.
//   TRUST_PROXY unset / false -> trust nothing (req.ip is the real socket address)
//   TRUST_PROXY=true          -> trust exactly one proxy hop (Render, Heroku, Nginx)
//   TRUST_PROXY=2             -> trust that many hops (e.g. Cloudflare + Nginx)
const parseTrustProxy = value => {
  if (!value || value === 'false') return false;
  if (value === 'true') return 1;
  const hops = Number(value);
  return Number.isInteger(hops) && hops >= 0 ? hops : value; // e.g. 'loopback'
};
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

// Security: Helmet for various security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
      // No 'unsafe-inline': every script lives in /public/js or on the Bootstrap CDN.
      // If someone injects <script> into a page, the browser refuses to run it.
      scriptSrc: ["'self'", "cdn.jsdelivr.net"],
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

// Apply the site-wide limit. The stricter login/signup/password-reset limits live
// on those routes in routes/auth.js (rateLimiters in middleware/security.js).
app.use(generalLimiter);

// Security: Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Performance: Compression middleware
app.use(compression());

// Logging: HTTP request logger
app.use(requestLogger);

// Set view engine
app.set('view engine', appConfig.views.engine);
app.set('views', path.join(__dirname, '../views'));

// SEO: robots.txt and sitemap.xml. Mounted BEFORE the session middleware so
// crawler visits don't create a session record in MongoDB on every hit.
app.use(require('./routes/seo'));

// Persist sessions in the same MongoDB database as application data.
const sessionStore = MongoStore.create({
  clientPromise: databaseReady.then(connection => connection.getClient()),
  ttl: 7 * 24 * 60 * 60
});
sessionStore.on('error', error => logger.error('Session store error', { error }));

// Middleware
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || DEV_SESSION_SECRET, // fallback only reachable outside production
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

// Make the cart (or an empty one) available to templates. Doesn't create a session.
app.use(exposeCart);

// Make user available in all templates
app.use(setLocals);

// SEO defaults for every page. A route can override `description` by passing it
// to res.render(). Private pages (cart, checkout, account) get noindex so they
// never show up in search results.
const PRIVATE_PATHS = ['/cart', '/checkout', '/auth'];
app.use((req, res, next) => {
  res.locals.siteName = 'The Wizard\'s Bag';
  res.locals.defaultDescription = 'Hand-made custom deck boxes, tokens and tabletop accessories for trading card players and TTRPG game masters.';
  res.locals.noindex = PRIVATE_PATHS.some(prefix => req.path.startsWith(prefix));
  next();
});

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
  res.render('index', {
    title: 'The Wizard\'s Bag',
    description: 'Custom deck boxes, tokens and TTRPG accessories, hand-made for card players and game masters. Shop wood, leather and acrylic deck boxes, metal counters and more.'
  });
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