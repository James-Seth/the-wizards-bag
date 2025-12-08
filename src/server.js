const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kevins-deck-boxes')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const productRoutes = require('./routes/products');
app.use('/products', productRoutes);

// Home route
app.get('/', (req, res) => {
  res.render('index', { title: 'Kevin\'s Deck Boxes' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Error handling
app.use((req, res) => {
  res.status(404).render('error', { 
    error: 'Page not found', 
    title: '404 - Page Not Found' 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});