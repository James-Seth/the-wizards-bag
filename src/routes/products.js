const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET all products
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const products = await Product.find(filter);
    res.render('products/index', { 
      products, 
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
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).render('error', { 
        error: 'Product not found',
        title: 'Product Not Found'
      });
    }
    res.render('products/detail', { product, title: product.name });
  } catch (error) {
    res.status(500).render('error', { 
      error: 'Failed to load product',
      title: 'Error'
    });
  }
});

module.exports = router;
