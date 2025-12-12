const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { getAvailableInventory } = require('../../middleware/cart');
const { 
  validateProductId, 
  validateCategoryQuery, 
  validateSearch,
  validateProduct
} = require('../../middleware/validation');

// GET all products
router.get('/', validateCategoryQuery, async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const products = await Product.find(filter);
    
    // Calculate available inventory for each product
    const productsWithAvailability = products.map(product => {
      const availableInventory = getAvailableInventory(product, req.session.cart);
      return {
        ...product.toObject(),
        availableInventory
      };
    });
    
    res.render('products/index', { 
      products: productsWithAvailability, 
      selectedCategory: category || 'all',
      title: 'Product Catalog'
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
    const availableInventory = getAvailableInventory(product, req.session.cart);
    const productWithAvailability = {
      ...product.toObject(),
      availableInventory
    };
    
    res.render('products/detail', { 
      product: productWithAvailability, 
      title: product.name 
    });
  } catch (error) {
    res.status(500).render('error', { 
      error: 'Failed to load product',
      title: 'Error'
    });
  }
});

// POST create new product (for future admin functionality)
router.post('/', validateProduct, async (req, res) => {
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
router.put('/:id', validateProductId, validateProduct, async (req, res) => {
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
router.delete('/:id', validateProductId, async (req, res) => {
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
