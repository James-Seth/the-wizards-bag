const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    } else {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be logged in to access this page');
        return res.redirect('/auth/login');
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.session?.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.session.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    return next();
};

const requireGuest = (req, res, next) => {
    if (req.session && req.session.user) {
        return res.redirect('/');
    } else {
        return next();
    }
};

// Make user available in all templates
const setLocals = (req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isLoggedIn = !!req.session.user;
    next();
};

module.exports = {
    requireAuth,
    requireAdmin,
    requireGuest,
    setLocals
};