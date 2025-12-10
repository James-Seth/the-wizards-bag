const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { body, validationResult } = require('express-validator');

// Custom validation for add to cart
const validateAddToCart = [
  body('id')
    .isMongoId()
    .withMessage('Invalid product ID format'),
  
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('Quantity must be between 1 and 99'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: `Validation Error: ${errors.array()[0].msg}`
      });
    }
    next();
  }
];

// Add item to cart
router.post('/add', validateAddToCart, async (req, res) => {
  try {
    const { id: productId, quantity = 1 } = req.body;
    
    // Get or create session ID
    const sessionId = req.session.id || req.sessionID;
    
    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    // Check inventory
    if (product.inventory < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Insufficient inventory' 
      });
    }
    
    // Find or create cart
    let cart = await Cart.findBySessionId(sessionId);
    if (!cart) {
      cart = await Cart.createNewCart(sessionId);
    }
    
    // Add item to cart
    await cart.addItem({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: parseInt(quantity)
    });
    
    // Return updated cart summary
    const cartSummary = cart.getCartSummary();
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.json({ 
        success: true, 
        message: 'Item added to cart',
        cart: cartSummary 
      });
    } else {
      req.flash('success', `${product.name} added to cart!`);
      res.redirect(`/products/${productId}`);
    }
    
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding item to cart' 
    });
  }
});

// View cart
router.get('/', async (req, res) => {
  try {
    const sessionId = req.session.id || req.sessionID;
    
    let cart = await Cart.findBySessionId(sessionId).populate('items.productId');
    if (!cart) {
      cart = { items: [], totalItems: 0, totalPrice: 0 };
    }
    
    res.render('cart/index', { 
      title: 'Shopping Cart - The Wizard\'s Bag',
      cart: cart,
      items: cart.items || []
    });
    
  } catch (error) {
    console.error('View cart error:', error);
    res.render('error', {
      error: 'Error loading cart',
      title: 'Cart Error'
    });
  }
});

// Update item quantity
router.put('/update/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const sessionId = req.session.id || req.sessionID;
    
    const cart = await Cart.findBySessionId(sessionId);
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart not found' 
      });
    }
    
    await cart.updateItemQuantity(itemId, parseInt(quantity));
    const cartSummary = cart.getCartSummary();
    
    res.json({ 
      success: true, 
      message: 'Cart updated',
      cart: cartSummary 
    });
    
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating cart' 
    });
  }
});

// Remove item from cart
router.delete('/remove/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const sessionId = req.session.id || req.sessionID;
    
    const cart = await Cart.findBySessionId(sessionId);
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart not found' 
      });
    }
    
    await cart.removeItem(itemId);
    const cartSummary = cart.getCartSummary();
    
    res.json({ 
      success: true, 
      message: 'Item removed from cart',
      cart: cartSummary 
    });
    
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error removing item from cart' 
    });
  }
});

// Clear entire cart
router.delete('/clear', async (req, res) => {
  try {
    const sessionId = req.session.id || req.sessionID;
    
    const cart = await Cart.findBySessionId(sessionId);
    if (cart) {
      await cart.clearCart();
    }
    
    res.json({ 
      success: true, 
      message: 'Cart cleared',
      cart: { totalItems: 0, totalPrice: 0, items: [] }
    });
    
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error clearing cart' 
    });
  }
});

// Get cart count (for nav icon)
router.get('/count', async (req, res) => {
  try {
    const sessionId = req.session.id || req.sessionID;
    
    const cart = await Cart.findBySessionId(sessionId);
    const totalItems = cart ? cart.totalItems : 0;
    
    res.json({ totalItems });
    
  } catch (error) {
    console.error('Cart count error:', error);
    res.json({ totalItems: 0 });
  }
});

module.exports = router;