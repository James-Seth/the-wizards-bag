/**
 * Cart Session Middleware
 * Manages cart state in user sessions
 */

const { logger } = require('../utils/logger');

/**
 * A fresh, empty cart object.
 */
const emptyCart = () => ({
    items: [],
    totalItems: 0,
    totalPrice: 0,
    lastUpdated: new Date()
});

/**
 * Make the cart available to templates WITHOUT creating one.
 *
 * express-session only saves a session to MongoDB once something is written to it
 * (saveUninitialized: false). The old version wrote an empty cart into every session
 * on every request, so every visitor and every search-engine bot got a session record.
 * Now we only read: visitors who never add anything never get a session.
 */
const exposeCart = (req, res, next) => {
    res.locals.cart = getCartSummary(req.session.cart);
    next();
};

/**
 * Get the visitor's cart, creating it the first time they add something.
 * This is the only place a cart (and therefore a session) gets created.
 * @param {Object} req - Express request object
 */
const getOrCreateCart = (req) => {
    if (!req.session.cart) {
        req.session.cart = emptyCart();
        logger.info('Cart created');
    }
    return req.session.cart;
};

/**
 * Calculate cart totals after any cart operation
 * @param {Object} cart - Cart object from session
 */
const calculateCartTotals = (cart) => {
    try {
        let totalItems = 0;
        let totalPrice = 0;

        cart.items.forEach(item => {
            totalItems += item.quantity;
            totalPrice += (item.price * item.quantity);
        });

        cart.totalItems = totalItems;
        cart.totalPrice = parseFloat(totalPrice.toFixed(2));
        cart.lastUpdated = new Date();

        logger.info('Cart totals calculated', {
            totalItems,
            totalPrice: cart.totalPrice
        });

        return cart;
    } catch (error) {
        logger.error('Error calculating cart totals:', error);
        throw error;
    }
};

/**
 * Find item in cart by product ID
 * @param {Object} cart - Cart object from session
 * @param {String} productId - MongoDB ObjectId as string
 */
const findCartItem = (cart, productId) => {
    return cart.items.find(item => item.productId === productId);
};

/**
 * Add item to cart or update quantity if exists
 * @param {Object} cart - Cart object from session
 * @param {Object} product - Product object from database
 * @param {Number} quantity - Quantity to add
 */
const addToCart = (cart, product, quantity = 1) => {
    try {
        const existingItem = findCartItem(cart, product._id.toString());

        if (existingItem) {
            // Update existing item quantity
            existingItem.quantity += quantity;
            existingItem.subtotal = parseFloat((existingItem.price * existingItem.quantity).toFixed(2));
            
            logger.info('Updated cart item quantity', {
                productId: product._id,
                newQuantity: existingItem.quantity
            });
        } else {
            // Add new item to cart
            const cartItem = {
                productId: product._id.toString(),
                name: product.name,
                price: product.price,
                quantity: quantity,
                subtotal: parseFloat((product.price * quantity).toFixed(2)),
                image: product.images && product.images.length > 0 ? product.images[0] : null
            };

            cart.items.push(cartItem);
            
            logger.info('Added new item to cart', {
                productId: product._id,
                quantity: quantity
            });
        }

        return calculateCartTotals(cart);
    } catch (error) {
        logger.error('Error adding item to cart:', error);
        throw error;
    }
};

/**
 * Update item quantity in cart
 * @param {Object} cart - Cart object from session
 * @param {String} productId - MongoDB ObjectId as string
 * @param {Number} newQuantity - New quantity
 */
const updateCartItem = (cart, productId, newQuantity) => {
    try {
        const item = findCartItem(cart, productId);
        
        if (!item) {
            throw new Error('Item not found in cart');
        }

        if (newQuantity <= 0) {
            // Remove item if quantity is 0 or negative
            cart.items = cart.items.filter(item => item.productId !== productId);
            logger.info('Removed item from cart (quantity <= 0)', { productId });
        } else {
            // Update quantity
            item.quantity = newQuantity;
            item.subtotal = parseFloat((item.price * newQuantity).toFixed(2));
            logger.info('Updated cart item quantity', { productId, newQuantity });
        }

        return calculateCartTotals(cart);
    } catch (error) {
        logger.error('Error updating cart item:', error);
        throw error;
    }
};

/**
 * Remove specific item from cart
 * @param {Object} cart - Cart object from session
 * @param {String} productId - MongoDB ObjectId as string
 */
const removeFromCart = (cart, productId) => {
    try {
        const initialLength = cart.items.length;
        cart.items = cart.items.filter(item => item.productId !== productId);
        
        if (cart.items.length === initialLength) {
            throw new Error('Item not found in cart');
        }

        logger.info('Removed item from cart', { productId });
        return calculateCartTotals(cart);
    } catch (error) {
        logger.error('Error removing item from cart:', error);
        throw error;
    }
};

/**
 * Clear all items from cart
 * @param {Object} cart - Cart object from session
 */
const clearCart = (cart) => {
    try {
        cart.items = [];
        cart.totalItems = 0;
        cart.totalPrice = 0;
        cart.lastUpdated = new Date();

        logger.info('Cart cleared');
        return cart;
    } catch (error) {
        logger.error('Error clearing cart:', error);
        throw error;
    }
};

/**
 * Get cart summary for display
 * @param {Object} cart - Cart object from session
 */
const getCartSummary = (cart) => {
    // Visitors who haven't added anything have no cart yet; show them an empty one.
    if (!cart) cart = emptyCart();
    return {
        items: cart.items,
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
        isEmpty: cart.items.length === 0,
        lastUpdated: cart.lastUpdated
    };
};

/**
 * Return the product's current stock. Cart contents are not reservations.
 * @param {Object} product - Product object from database
 * @returns {Number} Available inventory for this session
 */
const getAvailableInventory = (product) => {
    return product.inventory;
};

module.exports = {
    exposeCart,
    getOrCreateCart,
    calculateCartTotals,
    findCartItem,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartSummary,
    getAvailableInventory
};