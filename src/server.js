const express = require('express');
const session = require('express-session');
const path = require('path');

// Load configuration
const connectDB = require('../config/database');
const appConfig = require('../config/app');
const { requestLogger, errorLogger } = require('../utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Set view engine
app.set('view engine', appConfig.views.engine);
app.set('views', path.join(__dirname, '../views'));

// Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'wizards-bag-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));
app.use(requestLogger); // Log requests
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);

// Home route
app.get('/', (req, res) => {
  res.render('index', { title: 'The Wizard\'s Bag' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Error handling
app.use(errorLogger); // Log errors

app.use((req, res) => {
  res.status(404).render('error', { 
    error: 'Page not found', 
    title: '404 - Page Not Found' 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
});