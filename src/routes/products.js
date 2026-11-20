const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { getAvailableInventory } = require('../middleware/cart');
const { requireAdmin } = require('../middleware/auth');
const { 
  validateProductId, 
  validateCategoryQuery, 
  validateSearch,
  validateProduct
} = require('../middleware/validation');
const { formatCategory, truncateText } = require('../utils/helpers');

// One sentence per category for the <meta name="description"> tag.
// Search engines often show this as the snippet under your link.
const CATEGORY_DESCRIPTIONS = {
  'deck-boxes': 'Custom deck boxes in carved wood, leather and acrylic that protect your trading cards in style.',
  tokens: 'Metal life counters, spin-down dice, commander damage trackers and token sets for card games.',
  accessories: 'Dice towers, playmats, card sleeves, binders and storage for your tabletop and card games.'
};

// GET all products
router.get('/', validateCategoryQuery, async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const products = await Product.find(filter);
    
    // Calculate available inventory for each product
    const productsWithAvailability = products.map(product => {
      const availableInventory = getAvailableInventory(product);
      return {
        ...product.toObject(),
        availableInventory
      };
    });
    
    res.render('products/index', { 
      products: productsWithAvailability, 
      selectedCategory: category || 'all',
      // Each category gets its own title so search results aren't all "Product Catalog".
      title: category ? formatCategory(category) : 'Product Catalog',
      description: category
        ? CATEGORY_DESCRIPTIONS[category]
        : 'Browse every deck box, token and tabletop accessory at The Wizard\'s Bag.'
    });
  } catch (error) {
    res.status(500).render('error', { 
      error: 'Failed to load products',
      title: 'Error'
    });
  }
});

// GET single product
router.get('/:id', validateProductId, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).render('error', { 
        error: 'Product not found',
        title: 'Product Not Found'
      });
    }
    
    // Calculate available inventory
    const availableInventory = getAvailableInventory(product);
    const productWithAvailability = {
      ...product.toObject(),
      availableInventory
    };
    
    res.render('products/detail', { 
      product: productWithAvailability, 
      title: product.name,
      // Use the product's own description, cut to ~155 characters (the length Google shows).
      description: truncateText(product.description, 155)
    });
  } catch (error) {
    res.status(500).render('error', { 
      error: 'Failed to load product',
      title: 'Error'
    });
  }
});

// POST create new product (for future admin functionality)
router.post('/', requireAdmin, validateProduct, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ 
      message: 'Product created successfully', 
      product 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to create product' 
    });
  }
});

// PUT update product (for future admin functionality)
router.put('/:id', requireAdmin, validateProductId, validateProduct, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE product (for future admin functionality)
router.delete('/:id', requireAdmin, validateProductId, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;