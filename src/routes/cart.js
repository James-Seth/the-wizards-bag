/**
 * Cart Routes - Session-Based CRUD Operations
 * Uses session storage for fast, simple cart management
 */

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { body, param, validationResult } = require('express-validator');
const { logger } = require('../../utils/logger');
const { rateLimiters, validateInput } = require('../middleware/security');
const {
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartSummary
} = require('../../middleware/cart');

// Validation rules for cart operations
const addToCartValidation = [
    body('id').isMongoId().withMessage('Invalid product ID'),
    body('quantity')
        .optional()
        .isInt({ min: 1, max: 99 })
        .withMessage('Quantity must be between 1 and 99')
];

const updateCartValidation = [
    param('productId').isMongoId().withMessage('Invalid product ID'),
    body('quantity')
        .isInt({ min: 0, max: 99 })
        .withMessage('Quantity must be between 0 and 99')
];

/**
 * POST /cart/add
 * Add item to cart using session storage
 */
router.post('/add', rateLimiters.cart, addToCartValidation, async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: `Validation Error: ${errors.array()[0].msg}`
            });
        }

        const productId = req.body.id;
        const quantity = parseInt(req.body.quantity) || 1;

        // Find product in database
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Add to cart using session middleware
        addToCart(req.session.cart, product, quantity);

        logger.info('Item added to cart', {
            sessionId: req.sessionID,
            productId: product._id,
            productName: product.name,
            quantity: quantity
        });

        // Return success response
        const cartSummary = getCartSummary(req.session.cart);
        res.json({
            success: true,
            message: `${product.name} added to cart!`,
            cart: cartSummary
        });

    } catch (error) {
        logger.error('Error adding item to cart:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding item to cart'
        });
    }
});

/**
 * GET /cart
 * Display cart page with all items
 */
router.get('/', async (req, res) => {
    try {
        const cartSummary = getCartSummary(req.session.cart);
        
        logger.info('Cart page accessed', {
            sessionId: req.sessionID,
            itemCount: cartSummary.totalItems
        });

        res.render('cart/index', {
            title: 'Shopping Cart - The Wizard\'s Bag',
            cart: cartSummary,
            items: cartSummary.items
        });
    } catch (error) {
        logger.error('Error displaying cart page:', error);
        res.render('error', {
            error: 'Error loading cart',
            title: 'Cart Error'
        });
    }
});

/**
 * POST /cart/update/:productId
 * Update item quantity in cart
 */
router.post('/update/:productId', updateCartValidation, async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid quantity' 
            });
        }

        const productId = req.params.productId;
        const newQuantity = parseInt(req.body.quantity);

        // Update cart item using session middleware
        updateCartItem(req.session.cart, productId, newQuantity);

        logger.info('Cart item updated', {
            sessionId: req.sessionID,
            productId: productId,
            newQuantity: newQuantity
        });

        const cartSummary = getCartSummary(req.session.cart);
        return res.json({
            success: true,
            message: 'Cart updated',
            cart: cartSummary
        });

    } catch (error) {
        logger.error('Error updating cart item:', error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || 'Error updating cart' 
        });
    }
});

/**
 * POST /cart/remove/:productId
 * Remove specific item from cart
 */
router.post('/remove/:productId', [
    param('productId').isMongoId().withMessage('Invalid product ID')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid product ID' 
            });
        }

        const productId = req.params.productId;

        // Remove from cart using session middleware
        removeFromCart(req.session.cart, productId);

        logger.info('Item removed from cart', {
            sessionId: req.sessionID,
            productId: productId
        });

        const cartSummary = getCartSummary(req.session.cart);
        return res.json({
            success: true,
            message: 'Item removed from cart',
            cart: cartSummary
        });

    } catch (error) {
        logger.error('Error removing cart item:', error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || 'Error removing item from cart' 
        });
    }
});

/**
 * POST /cart/clear
 * Clear all items from cart
 */
router.post('/clear', async (req, res) => {
    try {
        clearCart(req.session.cart);

        logger.info('Cart cleared', {
            sessionId: req.sessionID
        });

        return res.json({
            success: true,
            message: 'Cart cleared',
            cart: getCartSummary(req.session.cart)
        });

    } catch (error) {
        logger.error('Error clearing cart:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error clearing cart' 
        });
    }
});

/**
 * GET /cart/count
 * Get cart item count (for navbar badge)
 */
router.get('/count', (req, res) => {
    try {
        const cartSummary = getCartSummary(req.session.cart);
        res.json({
            success: true,
            totalItems: cartSummary.totalItems,
            totalPrice: cartSummary.totalPrice
        });
    } catch (error) {
        logger.error('Error getting cart count:', error);
        res.status(500).json({ 
            success: false, 
            totalItems: 0,
            totalPrice: 0
        });
    }
});

module.exports = router;