const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const { requireAuth, requireGuest } = require('../middleware/auth');
const { rateLimiters, validateInput, logSecurityEvent } = require('../middleware/security');
const router = express.Router();

const regenerateSession = req => new Promise((resolve, reject) => {
    req.session.regenerate(error => error ? reject(error) : resolve());
});

// GET /auth/signup - Show signup form
router.get('/signup', (req, res) => {
    res.render('auth/signup', { 
        title: 'Sign Up',
        errors: req.flash('error'),
        success: req.flash('success')
    });
});

// POST /auth/signup - Handle signup
router.post('/signup', rateLimiters.auth, async (req, res) => {
    try {
        let { name, email, password, confirmPassword } = req.body;
        
        // Sanitize inputs
        name = validateInput.sanitizeString(name, 50);
        email = validateInput.sanitizeString(email, 100).toLowerCase();
        
        // Validate inputs
        const errors = [];
        
        if (!name || name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }
        
        if (!email || !validateInput.isValidEmail(email)) {
            errors.push('Please enter a valid email address');
        }
        
        if (!password || password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        
        if (password !== confirmPassword) {
            errors.push('Passwords do not match');
        }
        
        if (errors.length > 0) {
            logSecurityEvent('SIGNUP_VALIDATION_FAILED', req, { errors });
            req.flash('error', errors);
            return res.redirect('/auth/signup');
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            logSecurityEvent('SIGNUP_DUPLICATE_EMAIL', req, { email });
            req.flash('error', 'An account with this email already exists');
            return res.redirect('/auth/signup');
        }
        
        // Create new user
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: password
        });
        
        await user.save();
        
        logger.info(`New user created: ${user.email}`);
        req.flash('success', 'Account created successfully! Please log in.');
        res.redirect('/auth/login');
        
    } catch (error) {
        logger.error('Signup error:', error);
        req.flash('error', 'An error occurred during signup. Please try again.');
        res.redirect('/auth/signup');
    }
});

// GET /auth/login - Show login form
router.get('/login', (req, res) => {
    res.render('auth/login', { 
        title: 'Login',
        errors: req.flash('error'),
        success: req.flash('success')
    });
});

// POST /auth/login - Handle login
router.post('/login', rateLimiters.auth, async (req, res) => {
    try {
        let { email, password } = req.body;
        
        // Sanitize inputs
        email = validateInput.sanitizeString(email, 100).toLowerCase();
        
        // Validate inputs
        if (!email || !password) {
            logSecurityEvent('LOGIN_MISSING_CREDENTIALS', req);
            req.flash('error', 'Email and password are required');
            return res.redirect('/auth/login');
        }
        
        if (!validateInput.isValidEmail(email)) {
            logSecurityEvent('LOGIN_INVALID_EMAIL', req, { email });
            req.flash('error', 'Please enter a valid email address');
            return res.redirect('/auth/login');
        }
        
        // Find user
        const user = await User.findOne({ email, isActive: true });
        if (!user) {
            logSecurityEvent('LOGIN_USER_NOT_FOUND', req, { email });
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }
        
        // Check password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            logSecurityEvent('LOGIN_INVALID_PASSWORD', req, { email, userId: user._id });
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }
        
        const redirectTo = req.session.returnTo || '/';
        await regenerateSession(req);

        req.session.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin
        };
        
        logger.info(`User logged in: ${user.email}`);
        req.flash('success', `Welcome back, ${user.name}!`);
        
        res.redirect(redirectTo);
        
    } catch (error) {
        logger.error('Login error:', error);
        req.flash('error', 'An error occurred during login. Please try again.');
        res.redirect('/auth/login');
    }
});

// GET /auth/logout - Handle logout
router.get('/logout', (req, res) => {
    const userName = req.session.user?.name;
    
    req.session.destroy((err) => {
        if (err) {
            logger.error('Logout error:', err);
            return res.redirect('/');
        }
        
        logger.info(`User logged out: ${userName}`);
        res.redirect('/');
    });
});

// GET /auth/account - My Account page
router.get('/account', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/auth/login');
        }
        
        res.render('auth/account', {
            title: 'My Account',
            user: user,
            errors: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        logger.error('Account page error:', error);
        req.flash('error', 'Error loading account page');
        res.redirect('/');
    }
});

// POST /auth/account - Update account info
router.post('/account', requireAuth, async (req, res) => {
    try {
        const { name, email } = req.body;
        const userId = req.session.user.id;
        
        // Validate inputs
        const errors = [];
        
        if (!name || name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }
        
        if (!email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
            errors.push('Please enter a valid email address');
        }
        
        if (errors.length > 0) {
            req.flash('error', errors);
            return res.redirect('/auth/account');
        }
        
        // Check if email already exists (for different user)
        const existingUser = await User.findOne({ 
            email: email.toLowerCase(), 
            _id: { $ne: userId } 
        });
        
        if (existingUser) {
            req.flash('error', 'This email is already in use by another account');
            return res.redirect('/auth/account');
        }
        
        // Update user
        await User.findByIdAndUpdate(userId, {
            name: name.trim(),
            email: email.toLowerCase().trim()
        });
        
        // Update session
        req.session.user.name = name.trim();
        req.session.user.email = email.toLowerCase().trim();
        
        logger.info(`User updated account: ${email}`);
        req.flash('success', 'Account updated successfully!');
        res.redirect('/auth/account');
        
    } catch (error) {
        logger.error('Account update error:', error);
        req.flash('error', 'An error occurred while updating your account');
        res.redirect('/auth/account');
    }
});

// GET /auth/forgot-password - Show forgot password form
router.get('/forgot-password', requireGuest, (req, res) => {
    res.render('auth/forgot-password', {
        title: 'Forgot Password',
        errors: req.flash('error'),
        success: req.flash('success')
    });
});

// POST /auth/forgot-password - Send reset email
router.post('/forgot-password', requireGuest, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            req.flash('error', 'Email is required');
            return res.redirect('/auth/forgot-password');
        }
        
        const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
        
        // Always show success message for security (don't reveal if email exists)
        const successMessage = 'If an account with that email exists, you will receive password reset instructions.';
        
        if (user) {
            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
            const resetExpires = new Date(Date.now() + 3600000); // 1 hour
            
            await User.findByIdAndUpdate(user._id, {
                resetPasswordTokenHash: resetTokenHash,
                resetPasswordExpires: resetExpires
            });
            
            // TODO: Deliver the raw token in a reset email; never log it.
            logger.info('Password reset requested', { userId: user._id });
        }
        
        req.flash('success', successMessage);
        res.redirect('/auth/forgot-password');
        
    } catch (error) {
        logger.error('Forgot password error:', error);
        req.flash('error', 'An error occurred. Please try again.');
        res.redirect('/auth/forgot-password');
    }
});

// GET /auth/reset-password/:token - Show reset password form
router.get('/reset-password/:token', requireGuest, async (req, res) => {
    try {
        const { token } = req.params;
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        const user = await User.findOne({
            resetPasswordTokenHash: tokenHash,
            resetPasswordExpires: { $gt: Date.now() },
            isActive: true
        });
        
        if (!user) {
            req.flash('error', 'Invalid or expired reset token');
            return res.redirect('/auth/forgot-password');
        }
        
        res.render('auth/reset-password', {
            title: 'Reset Password',
            token: token,
            errors: req.flash('error'),
            success: req.flash('success')
        });
        
    } catch (error) {
        logger.error('Reset password page error:', error);
        req.flash('error', 'An error occurred');
        res.redirect('/auth/forgot-password');
    }
});

// POST /auth/reset-password/:token - Process password reset
router.post('/reset-password/:token', requireGuest, async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        // Validate passwords
        if (!password || password.length < 8) {
            req.flash('error', 'Password must be at least 8 characters long');
            return res.redirect(`/auth/reset-password/${token}`);
        }
        
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect(`/auth/reset-password/${token}`);
        }
        
        // Find user with valid token
        const user = await User.findOne({
            resetPasswordTokenHash: tokenHash,
            resetPasswordExpires: { $gt: Date.now() },
            isActive: true
        });
        
        if (!user) {
            req.flash('error', 'Invalid or expired reset token');
            return res.redirect('/auth/forgot-password');
        }
        
        // Update password and clear reset token
        user.password = password;
        user.resetPasswordTokenHash = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        await regenerateSession(req);
        
        logger.info(`Password reset completed for: ${user.email}`);
        req.flash('success', 'Password reset successful! Please log in with your new password.');
        res.redirect('/auth/login');
        
    } catch (error) {
        logger.error('Reset password process error:', error);
        req.flash('error', 'An error occurred while resetting your password');
        res.redirect(`/auth/reset-password/${req.params.token}`);
    }
});

module.exports = router;