# API Documentation

## Overview
The Wizard's Bag API provides endpoints for managing products in an e-commerce application for deck boxes and TTRPG accessories.

## Base URL
```
http://localhost:3001
```

## Authentication
Currently, no authentication is required for read operations. Write operations (create, update, delete) are planned for future admin functionality.

## Endpoints

### Products

#### GET /products
Retrieve all products with optional category filtering.

**Query Parameters:**
- `category` (optional): Filter by product category
  - Valid values: `deck-boxes`, `tokens`, `accessories`

**Example Request:**
```
GET /products?category=deck-boxes
```

**Example Response:**
```html
<!-- Returns rendered HTML page with product list -->
```

#### GET /products/:id
Retrieve a single product by ID.

**Parameters:**
- `id`: MongoDB ObjectId of the product

**Example Request:**
```
GET /products/507f1f77bcf86cd799439011
```

**Example Response:**
```html
<!-- Returns rendered HTML page with product details -->
```

#### POST /products
Create a new product (Admin functionality - not yet implemented in UI).

**Request Body:**
```json
{
  "name": "Premium Deck Box - Forest Theme",
  "description": "A beautifully crafted deck box with forest-inspired artwork.",
  "price": 29.99,
  "category": "deck-boxes",
  "inventory": 15,
  "inStock": true,
  "features": ["Holds 100+ cards", "Magnetic closure"]
}
```

**Validation Rules:**
- `name`: 3-100 characters, required
- `description`: 10-500 characters, required
- `price`: Positive number, required
- `category`: Must be one of: `deck-boxes`, `tokens`, `accessories`
- `inventory`: Non-negative integer, required
- `inStock`: Boolean, optional
- `features`: Array of strings (1-100 chars each), optional

#### PUT /products/:id
Update an existing product.

**Parameters:**
- `id`: MongoDB ObjectId of the product

**Request Body:** Same as POST /products

#### DELETE /products/:id
Delete a product.

**Parameters:**
- `id`: MongoDB ObjectId of the product

## Error Responses

### Validation Errors (400)
```json
{
  "error": "Validation Error: Product name must be between 3 and 100 characters"
}
```

### Not Found (404)
```json
{
  "error": "Product not found"
}
```

### Server Error (500)
```json
{
  "error": "Failed to load products"
}
```

## Data Models

### Product
```javascript
{
  _id: ObjectId,
  name: String,           // Product name
  description: String,    // Product description
  price: Number,          // Price in USD
  category: String,       // Product category
  image: String,          // Image URL/path
  inStock: Boolean,       // Availability status
  inventory: Number,      // Quantity available
  features: [String],     // Product features
  createdAt: Date,        // Creation timestamp
  updatedAt: Date         // Last update timestamp
}
```

## Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `404`: Not Found
- `500`: Internal Server Error