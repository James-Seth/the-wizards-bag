const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { getCartSummary } = require('../middleware/cart');
const { logger } = require('../utils/logger');
const { requireAuth } = require('../middleware/auth');
const { rateLimiters } = require('../middleware/security');
const roundMoney = amount => Math.round((amount + Number.EPSILON) * 100) / 100;

const createStockError = message => Object.assign(new Error(message), { code: 'OUT_OF_STOCK' });

/**
 * GET /checkout
 * Display checkout form
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        // Check if cart exists and has items
        if (!req.session.cart || !req.session.cart.items || req.session.cart.items.length === 0) {
            req.flash('error', 'Your cart is empty. Please add items before checkout.');
            return res.redirect('/cart');
        }

        // Get cart summary
        const cartSummary = getCartSummary(req.session.cart);

        // Validate inventory for all cart items
        const validationErrors = [];
        for (const item of req.session.cart.items) {
            try {
                const product = await Product.findById(item.productId);
                if (!product) {
                    validationErrors.push(`Product ${item.productId} no longer exists`);
                    continue;
                }
                
                if (product.inventory < item.quantity) {
                    validationErrors.push(`${product.name} only has ${product.inventory} items in stock, but you have ${item.quantity} in your cart`);
                }
            } catch (error) {
                validationErrors.push(`Error validating product ${item.productId}`);
            }
        }

        if (validationErrors.length > 0) {
            req.flash('error', validationErrors.join('. '));
            return res.redirect('/cart');
        }

        // Calculate totals
        const subtotal = cartSummary.totalPrice;
        const tax = 0; // Could implement tax calculation here
        const shipping = subtotal >= 50 ? 0 : 9.99; // Free shipping over $50
        const total = roundMoney(subtotal + tax + shipping);

        res.render('checkout/index', {
            title: 'Checkout',
            cartSummary,
            totals: {
                subtotal,
                tax,
                shipping,
                total
            },
            messages: req.flash() // Pass flash messages to template
        });

        logger.info('Checkout page accessed');
    } catch (error) {
        logger.error('Error displaying checkout page:', error);
        req.flash('error', 'An error occurred while loading the checkout page.');
        res.redirect('/cart');
    }
});

/**
 * POST /checkout
 * Process order
 */
router.post('/', rateLimiters.checkout, requireAuth, [
    // Validation middleware
    body('customer.name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    
    body('customer.email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please enter a valid email address'),
    
    body('customer.phone')
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please enter a valid phone number'),
    
    body('shippingAddress.street')
        .trim()
        .isLength({ min: 5, max: 255 })
        .withMessage('Street address must be between 5 and 255 characters'),
    
    body('shippingAddress.city')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('City must be between 2 and 100 characters'),
    
    body('shippingAddress.state')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('State must be between 2 and 100 characters'),
    
    body('shippingAddress.zipCode')
        .matches(/^\d{5}(-\d{4})?$/)
        .withMessage('Please enter a valid ZIP code'),
    
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes must be less than 500 characters')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => error.msg);
            req.flash('error', errorMessages.join('. '));
            return res.redirect('/checkout');
        }

        // Check if cart exists and has items
        if (!req.session.cart || !req.session.cart.items || req.session.cart.items.length === 0) {
            req.flash('error', 'Your cart is empty. Please add items before checkout.');
            return res.redirect('/cart');
        }

        const checkoutSession = await mongoose.startSession();
        let createdOrderId;

        try {
            await checkoutSession.withTransaction(async () => {
                const orderItems = [];

                for (const cartItem of req.session.cart.items) {
                    const product = await Product.findById(cartItem.productId).session(checkoutSession);

                    if (!product) {
                        throw createStockError('A product in your cart is no longer available.');
                    }

                    if (product.inventory < cartItem.quantity) {
                        throw createStockError(`${product.name} only has ${product.inventory} items in stock.`);
                    }

                    const stockUpdate = await Product.updateOne(
                        { _id: product._id, inventory: { $gte: cartItem.quantity } },
                        { $inc: { inventory: -cartItem.quantity } },
                        { session: checkoutSession }
                    );

                    if (stockUpdate.modifiedCount !== 1) {
                        throw createStockError(`${product.name} is no longer available in the requested quantity.`);
                    }

                    orderItems.push({
                        productId: product._id,
                        productName: product.name,
                        productImage: product.image,
                        price: product.price,
                        quantity: cartItem.quantity,
                        subtotal: roundMoney(product.price * cartItem.quantity)
                    });
                }

                const subtotal = roundMoney(orderItems.reduce((sum, item) => sum + item.subtotal, 0));
                const tax = 0;
                const shipping = subtotal >= 50 ? 0 : 9.99;
                const total = roundMoney(subtotal + tax + shipping);

                const order = new Order({
                    userId: req.session.user.id,
                    customer: {
                        name: req.body.customer.name,
                        email: req.body.customer.email,
                        phone: req.body.customer.phone
                    },
                    shippingAddress: {
                        street: req.body.shippingAddress.street,
                        city: req.body.shippingAddress.city,
                        state: req.body.shippingAddress.state,
                        zipCode: req.body.shippingAddress.zipCode,
                        country: req.body.shippingAddress.country || 'United States'
                    },
                    items: orderItems,
                    totals: { subtotal, tax, shipping, total },
                    status: 'confirmed',
                    paymentStatus: 'pending',
                    notes: req.body.notes || ''
                });

                await order.save({ session: checkoutSession });
                createdOrderId = order._id;
            });
        } finally {
            await checkoutSession.endSession();
        }

        // Order placed: remove the cart entirely. The next add creates a fresh one.
        delete req.session.cart;

        logger.info('Order created successfully', { orderId: createdOrderId });

        // Redirect to confirmation page
        res.redirect(`/checkout/confirmation/${createdOrderId}`);

    } catch (error) {
        if (error.code === 'OUT_OF_STOCK') {
            req.flash('error', error.message);
            return res.redirect('/cart');
        }
        logger.error('Error processing order:', error);
        req.flash('error', 'An error occurred while processing your order. Please try again.');
        res.redirect('/checkout');
    }
});

/**
 * GET /checkout/confirmation/:orderId
 * Display order confirmation
 */
router.get('/confirmation/:orderId', requireAuth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId).populate('items.productId');
        
        if (!order) {
            req.flash('error', 'Order not found.');
            return res.redirect('/');
        }

        if (!order.userId || !order.userId.equals(req.session.user.id)) {
            return res.status(404).render('error', {
                error: 'Order not found.',
                title: 'Order Not Found'
            });
        }

        res.render('checkout/confirmation', {
            title: 'Order Confirmation',
            order
        });

        logger.info('Order confirmation viewed:', order.orderNumber);
    } catch (error) {
        logger.error('Error displaying order confirmation:', error);
        req.flash('error', 'An error occurred while loading the order confirmation.');
        res.redirect('/');
    }
});

module.exports = router;