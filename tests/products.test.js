const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');

describe('Product Routes', () => {
  beforeAll(async () => {
    // Connect to test database
    const testDbUri = 'mongodb://localhost:27017/kevins-deck-boxes-test';
    await mongoose.connect(testDbUri);
  });

  afterAll(async () => {
    // Clean up and close connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe('GET /products', () => {
    test('should return products page', async () => {
      const response = await request(app).get('/products');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Product Catalog');
    });

    test('should filter by category', async () => {
      const response = await request(app).get('/products?category=deck-boxes');
      expect(response.status).toBe(200);
    });

    test('should reject invalid category', async () => {
      const response = await request(app).get('/products?category=invalid-category');
      expect(response.status).toBe(400);
    });
  });

  describe('GET /products/:id', () => {
    test('should reject invalid product ID format', async () => {
      const response = await request(app).get('/products/invalid-id');
      expect(response.status).toBe(400);
    });

    test('should return 404 for non-existent product', async () => {
      const validId = new mongoose.Types.ObjectId();
      const response = await request(app).get(`/products/${validId}`);
      expect(response.status).toBe(404);
    });
  });
});