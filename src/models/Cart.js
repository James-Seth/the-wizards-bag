// This file is deprecated and not used in the current session-based cart implementation.
// All cart logic is handled in middleware/cart.js and session storage.
// You can safely delete this file if you are not planning to use a database cart model.

const mongoose = require('mongoose');

// Cart Item Schema - individual items in the cart
const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: true });

// Main Cart Schema
const cartSchema = new mongoose.Schema({
  // For guest users - session-based cart
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  // For logged-in users (future feature)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Cart items array
  items: [cartItemSchema],
  
  // Cart totals
  totalItems: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Cart status
  status: {
    type: String,
    enum: ['active', 'abandoned', 'converted'],
    default: 'active'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Cart expiration (for cleanup)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    index: { expireAfterSeconds: 0 }
  }
});

// Update the updatedAt field before saving
cartSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Calculate cart totals before saving
cartSchema.pre('save', function(next) {
  // Calculate total items and total price
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  this.totalPrice = this.items.reduce((total, item) => total + item.subtotal, 0);
  
  // Update each item's subtotal
  this.items.forEach(item => {
    item.subtotal = item.price * item.quantity;
  });
  
  next();
});

// Instance Methods
cartSchema.methods.addItem = function(productData) {
  const existingItemIndex = this.items.findIndex(
    item => item.productId.toString() === productData.productId.toString()
  );
  
  if (existingItemIndex >= 0) {
    // Update existing item
    this.items[existingItemIndex].quantity += productData.quantity || 1;
    this.items[existingItemIndex].subtotal = 
      this.items[existingItemIndex].price * this.items[existingItemIndex].quantity;
  } else {
    // Add new item
    const newItem = {
      productId: productData.productId,
      name: productData.name,
      price: productData.price,
      quantity: productData.quantity || 1,
      subtotal: productData.price * (productData.quantity || 1)
    };
    this.items.push(newItem);
  }
  
  return this.save();
};

cartSchema.methods.updateItemQuantity = function(itemId, quantity) {
  const item = this.items.id(itemId);
  if (item) {
    if (quantity <= 0) {
      this.items.pull(itemId);
    } else {
      item.quantity = quantity;
      item.subtotal = item.price * quantity;
    }
  }
  return this.save();
};

cartSchema.methods.removeItem = function(itemId) {
  this.items.pull(itemId);
  return this.save();
};

cartSchema.methods.clearCart = function() {
  this.items = [];
  this.totalItems = 0;
  this.totalPrice = 0;
  return this.save();
};

cartSchema.methods.getCartSummary = function() {
  return {
    totalItems: this.totalItems,
    totalPrice: this.totalPrice,
    itemCount: this.items.length,
    items: this.items
  };
};

// Static Methods
cartSchema.statics.findBySessionId = function(sessionId) {
  return this.findOne({ sessionId, status: 'active' });
};

cartSchema.statics.createNewCart = function(sessionId) {
  return this.create({
    sessionId,
    items: [],
    totalItems: 0,
    totalPrice: 0
  });
};

// Indexes for performance
cartSchema.index({ sessionId: 1, status: 1 });
cartSchema.index({ userId: 1, status: 1 });
cartSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Cart', cartSchema);