const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const { requireAuth, requireGuest } = require('../middleware/auth');
const { rateLimiters, validateInput, logSecurityEvent } = require('../middleware/security');
const router = express.Router();

// Give the visitor a brand-new session ID (prevents session fixation), but carry
// their cart across. regenerate() throws away everything stored in the old session,
// so without this a guest who logs in at checkout lands on an empty cart.
const regenerateSession = req => new Promise((resolve, reject) => {
    const cart = req.session.cart;
    req.session.regenerate(error => {
        if (error) return reject(error);
        if (cart) req.session.cart = cart;
        resolve();
    });
});

// Logs are often copied into bug reports, log services and backups, so keep customer
// emails out of them. "seth@example.com" becomes "s***@example.com": still enough to
// spot a pattern (lots of attempts on one account) without storing the address.
const maskEmail = email => {
    if (!email || typeof email !== 'string' || !email.includes('@')) return '[none]';
    const [name, domain] = email.split('@');
    return `${name.charAt(0)}***@${domain}`;
};

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
            logSecurityEvent('SIGNUP_DUPLICATE_EMAIL', req, { email: maskEmail(email) });
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
        
        logger.info('New user created', { userId: user._id });
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
            logSecurityEvent('LOGIN_INVALID_EMAIL', req, { email: maskEmail(email) });
            req.flash('error', 'Please enter a valid email address');
            return res.redirect('/auth/login');
        }
        
        // Find user
        const user = await User.findOne({ email, isActive: true });
        if (!user) {
            logSecurityEvent('LOGIN_USER_NOT_FOUND', req, { email: maskEmail(email) });
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }
        
        // Check password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            logSecurityEvent('LOGIN_INVALID_PASSWORD', req, { userId: user._id });
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
        
        logger.info('User logged in', { userId: user._id });
        req.flash('success', `Welcome back, ${user.name}!`);
        
        res.redirect(redirectTo);
        
    } catch (error) {
        logger.error('Login error:', error);
        req.flash('error', 'An error occurred during login. Please try again.');
        res.redirect('/auth/login');
    }
});

// POST /auth/logout - Handle logout
// POST, not GET: a GET link can be triggered by any page (an <img src="/auth/logout">
// on a forum would log your visitors out). Browsers also prefetch GET links, which
// can log people out by accident. Changing state should always be a POST.
router.post('/logout', (req, res) => {
    const userId = req.session.user?.id;
    
    req.session.destroy((err) => {
        if (err) {
            logger.error('Logout error:', err);
            return res.redirect('/');
        }
        
        logger.info('User logged out', { userId });
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
// Rate-limited because this form now checks a password and could otherwise be used to guess it.
router.post('/account', rateLimiters.accountUpdate, requireAuth, async (req, res) => {
    try {
        const { name, email, currentPassword } = req.body;
        const userId = req.session.user.id;
        
        // Validate inputs
        const errors = [];
        
        if (!name || name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }
        
        if (!email || !validateInput.isValidEmail(email)) {
            errors.push('Please enter a valid email address');
        }
        
        if (errors.length > 0) {
            req.flash('error', errors);
            return res.redirect('/auth/account');
        }
        
        const user = await User.findById(userId);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/auth/login');
        }

        // Changing the email is the first step of taking over an account (change the
        // email, then "forgot password" sends the reset link to the attacker). So if the
        // email is changing, prove you know the current password. Name-only changes don't need it.
        const newEmail = email.toLowerCase().trim();
        if (newEmail !== user.email) {
            if (!currentPassword || !(await user.comparePassword(currentPassword))) {
                logSecurityEvent('ACCOUNT_EMAIL_CHANGE_BAD_PASSWORD', req, { userId });
                req.flash('error', 'Enter your current password to change your email address');
                return res.redirect('/auth/account');
            }
        }

        // Check if email already exists (for different user)
        const existingUser = await User.findOne({ 
            email: newEmail, 
            _id: { $ne: userId } 
        });
        
        if (existingUser) {
            req.flash('error', 'This email is already in use by another account');
            return res.redirect('/auth/account');
        }
        
        // Update user
        await User.findByIdAndUpdate(userId, {
            name: name.trim(),
            email: newEmail
        });
        
        // Update session
        req.session.user.name = name.trim();
        req.session.user.email = newEmail;
        
        logger.info('User updated account', { userId, emailChanged: newEmail !== user.email });
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
// rateLimiters.passwordReset: 3 requests per hour per IP. Once reset emails are sent,
// this stops someone using the form to flood a person's inbox.
router.post('/forgot-password', rateLimiters.passwordReset, requireGuest, async (req, res) => {
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
        
        logger.info('Password reset completed', { userId: user._id });
        req.flash('success', 'Password reset successful! Please log in with your new password.');
        res.redirect('/auth/login');
        
    } catch (error) {
        logger.error('Reset password process error:', error);
        req.flash('error', 'An error occurred while resetting your password');
        res.redirect(`/auth/reset-password/${req.params.token}`);
    }
});

module.exports = router;