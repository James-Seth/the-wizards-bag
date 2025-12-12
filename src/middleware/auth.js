const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    } else {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be logged in to access this page');
        return res.redirect('/auth/login');
    }
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
    requireGuest,
    setLocals
};