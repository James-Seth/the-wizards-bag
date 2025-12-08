const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['deck-boxes', 'tokens', 'accessories', 'custom']
  },
  image: {
    type: String,
    default: '/images/placeholder.svg'
  },
  inStock: {
    type: Boolean,
    default: true
  },
  inventory: {
    type: Number,
    default: 0,
    min: 0
  },
  features: [{
    type: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
