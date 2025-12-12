const express = require('express');
const User = require('../models/User');
const { logger } = require('../../utils/logger');
const { requireAuth, requireGuest } = require('../middleware/auth');
const router = express.Router();

// GET /auth/signup - Show signup form
router.get('/signup', (req, res) => {
    res.render('auth/signup', { 
        title: 'Sign Up',
        errors: req.flash('error'),
        success: req.flash('success')
    });
});

// POST /auth/signup - Handle signup
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;
        
        // Validate inputs
        const errors = [];
        
        if (!name || name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }
        
        if (!email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
            errors.push('Please enter a valid email address');
        }
        
        if (!password || password.length < 6) {
            errors.push('Password must be at least 6 characters long');
        }
        
        if (password !== confirmPassword) {
            errors.push('Passwords do not match');
        }
        
        if (errors.length > 0) {
            req.flash('error', errors);
            return res.redirect('/auth/signup');
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
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
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate inputs
        if (!email || !password) {
            req.flash('error', 'Email and password are required');
            return res.redirect('/auth/login');
        }
        
        // Find user
        const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
        if (!user) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }
        
        // Check password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }
        
        // Set session
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email
        };
        
        logger.info(`User logged in: ${user.email}`);
        req.flash('success', `Welcome back, ${user.name}!`);
        
        // Redirect to intended page or home
        const redirectTo = req.session.returnTo || '/';
        delete req.session.returnTo;
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
            const crypto = require('crypto');
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetExpires = new Date(Date.now() + 3600000); // 1 hour
            
            await User.findByIdAndUpdate(user._id, {
                resetPasswordToken: resetToken,
                resetPasswordExpires: resetExpires
            });
            
            // TODO: Send email with reset link
            // For now, just log the reset URL
            const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password/${resetToken}`;
            logger.info(`Password reset requested for: ${email}`);
            logger.info(`Reset URL: ${resetUrl}`);
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
        
        const user = await User.findOne({
            resetPasswordToken: token,
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
        
        // Validate passwords
        if (!password || password.length < 6) {
            req.flash('error', 'Password must be at least 6 characters long');
            return res.redirect(`/auth/reset-password/${token}`);
        }
        
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect(`/auth/reset-password/${token}`);
        }
        
        // Find user with valid token
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
            isActive: true
        });
        
        if (!user) {
            req.flash('error', 'Invalid or expired reset token');
            return res.redirect('/auth/forgot-password');
        }
        
        // Update password and clear reset token
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        
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