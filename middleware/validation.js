const { body, param, query, validationResult } = require('express-validator');

// Validation middleware to handle errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('error', {
      error: `Validation Error: ${errors.array()[0].msg}`,
      title: 'Validation Error'
    });
  }
  next();
};

// Product validation rules
const validateProduct = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Product name must be between 3 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),
  
  body('category')
    .isIn(['deck-boxes', 'tokens', 'accessories'])
    .withMessage('Category must be one of: deck-boxes, tokens, accessories'),
  
  body('inventory')
    .isInt({ min: 0 })
    .withMessage('Inventory must be a non-negative integer'),
  
  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array'),
  
  body('features.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each feature must be between 1 and 100 characters'),
  
  handleValidationErrors
];

// Product ID validation
const validateProductId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID format'),
  
  handleValidationErrors
];

// Category query validation
const validateCategoryQuery = [
  query('category')
    .optional()
    .isIn(['deck-boxes', 'tokens', 'accessories'])
    .withMessage('Invalid category. Must be one of: deck-boxes, tokens, accessories'),
  
  handleValidationErrors
];

// Search validation
const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  validateCategoryQuery[0], // Reuse category validation
  handleValidationErrors
];

module.exports = {
  validateProduct,
  validateProductId,
  validateCategoryQuery,
  validateSearch,
  handleValidationErrors
};