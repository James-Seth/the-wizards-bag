/**
 * Cart Routes - Session-Based CRUD Operations
 * Uses session storage for fast, simple cart management
 */

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { body, param, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');
const { rateLimiters, validateInput } = require('../middleware/security');
const {
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartSummary,
    getOrCreateCart
} = require('../middleware/cart');

// Reply used when someone edits a cart they don't have (no session yet).
const noCart = res => res.status(404).json({ success: false, message: 'Item not found in cart' });

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

        // Read the cart if there is one; don't create it until we know the add will succeed.
        // The ?. means "if req.session.cart is undefined, stop and give undefined".
        const existingItem = req.session.cart?.items.find(
            item => item.productId === product._id.toString()
        );
        const requestedTotal = (existingItem?.quantity || 0) + quantity;
        if (requestedTotal > product.inventory) {
            return res.status(409).json({
                success: false,
                message: `Only ${product.inventory} of this item are currently in stock.`
            });
        }

        if (requestedTotal > 99) {
            return res.status(400).json({
                success: false,
                message: 'A maximum of 99 items can be added to your cart.'
            });
        }

        // Add to cart. getOrCreateCart() creates the cart (and so the session)
        // on the visitor's first add. This is the only route that does that.
        addToCart(getOrCreateCart(req), product, quantity);

        logger.info('Item added to cart', {
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
            itemCount: cartSummary.totalItems
        });

        res.render('cart/index', {
            title: 'Shopping Cart',
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

        if (newQuantity > 0) {
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found' });
            }
            if (newQuantity > product.inventory) {
                return res.status(409).json({
                    success: false,
                    message: `Only ${product.inventory} of this item are currently in stock.`
                });
            }
        }

        if (!req.session.cart) return noCart(res);

        // Update cart item using session middleware
        updateCartItem(req.session.cart, productId, newQuantity);

        logger.info('Cart item updated', {
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

        if (!req.session.cart) return noCart(res);

        // Remove from cart using session middleware
        removeFromCart(req.session.cart, productId);

        logger.info('Item removed from cart', {
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
        // Nothing to clear if they never had a cart, and no reason to create one.
        if (req.session.cart) clearCart(req.session.cart);

        logger.info('Cart cleared');

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