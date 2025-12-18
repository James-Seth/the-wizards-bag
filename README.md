# The Wizards Bag

**The Wizards Bag** is an e-commerce platform designed specifically for tabletop gaming enthusiasts and trading card players. This Node.js application provides a comprehensive marketplace for custom deck boxes, premium gaming accessories, and TTRPG essentials. The **primary** purpose of this project is to develop and refine skills in building full-stack applications.

## What I'm Building Specifically

This project represents a complete e-commerce solution currently designed for a specific company selling custom gaming products. However, the architecture is built with scalability in mind - future iterations may evolve into a multi-vendor marketplace where independent artisans can showcase and sell their handcrafted gaming accessories. Whether you're a Magic: The Gathering player protecting valuable cards, a D&D enthusiast organizing dice and miniatures, or a game master seeking unique accessories, The Wizards Bag serves as your one-stop magical stopping place. Like the loot goblin reaching into a wizards bag. 

**Key Vision:**
- **Premium Card Protection** - Custom deck boxes (wood, carved  with artistic flair)
- **TTRPG Essentials** - Everything needed for epic adventures
- **Artisan Craftsmanship** - Supporting independent creators and artists
- **Community-Focused** - Built by gamers, for gamers

**Target Audience:**
- Trading card game players (MTG, Pokemon, Yu-Gi-Oh!)
- Tabletop RPG enthusiasts (D&D, Pathfinder, etc.)
- Board game collectors
- Miniature painters and hobbyists
- Game masters and dungeon masters

## Features

- **Product Catalog** - Browse and filter products by category
- **Product Detail Pages** - Comprehensive product information and images
- **MongoDB Integration** - Robust database with Mongoose ODM
- **EJS Templating** - Server-side rendering with reusable layouts
- **Input Validation** - Express Validator for secure data handling
- **Bootstrap 5 Framework** - Modern, responsive UI components
- **Mobile-First Design** - Optimized navigation and touch-friendly interface
- **CDN Integration** - Fast loading with Bootstrap and Font Awesome CDNs
- **Professional Architecture** - MVC pattern with organized folder structure


## Project Structure

```
├── config/
│   ├── app.js           # Application configuration
│   └── database.js      # MongoDB connection setup
├── docs/
│   ├── API.md           # API documentation
│   └── deployment.md    # Deployment guide
├── middleware/
│   └── validation.js    # Express Validator middleware
├── utils/
│   ├── helpers.js       # Utility functions
│   └── logger.js        # Winston logging configuration
├── tests/
│   ├── helpers.test.js  # Helper function tests
│   └── products.test.js # Product route tests
├── src/
│   ├── models/          # MongoDB models (Product.js, Order.js)
│   ├── routes/          # Express routes (products.js)
│   └── server.js        # Main application entry point
├── views/
│   ├── layouts/         # EJS layout templates
│   │   ├── main.ejs     # Primary layout with Bootstrap navbar
│   │   ├── header.ejs   # Header layout for product pages
│   │   └── footer.ejs   # Footer with scripts
│   ├── products/        # Product-related views
│   │   ├── index.ejs    # Product catalog page
│   │   └── detail.ejs   # Individual product pages
│   ├── cart/
│   │   └── index.ejs    # Shopping cart page
│   ├── index.ejs        # Homepage
│   └── error.ejs        # Error page template
├── public/
│   ├── css/
│   │   └── style.css    # Custom styles (optimized, 320 lines)
│   ├── js/
│   │   └── main.js      # Client-side JavaScript
│   └── images/          # Static product images
├── scripts/
│   └── seedData.js      # Database seeding script
├── logs/                # Winston log files (auto-created)
├── .env                 # Environment variables
├── package.json         # Dependencies and scripts
└── README.md           # Project documentation
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB connection string
   ```

3. **Seed the database:**
   ```bash
   npm run seed
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   ```
   http://localhost:3001
   ```

## API Validation

The application uses Express Validator for input validation:

     ### Product Validation Rules:
     - **Name:** 3-100 characters
     - **Description:** 10-500 characters  
     - **Price:** Positive number
     - **Category:** Must be one of: `deck-boxes`, `tokens`, `accessories`
     - **Inventory:** Non-negative integer
     - **Features:** Optional array of strings (1-100 chars each)

     ### Route Validation:
     - **Product ID:** Valid MongoDB ObjectId
     - **Category Query:** Valid category name
     - **Search Query:** 1-100 characters

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with sample products for testing

## Technologies Used

- **Backend:** Node.js, Express.js
- **Database:** MongoDB 
- **Frontend Framework:** Bootstrap 5.1.3 (CDN)
- **Icons:** Font Awesome 6.0.0
- **Templating:** EJS with reusable layouts and partials
- **Validation:** Express Validator 
- **Logging:** Winston with file rotation
- **Session Management:** Express-session for cart persistence
- **Configuration:** Environment-based config management
- **Testing:** Jest (unit & integration tests)
- **Development:** Nodemon with auto-reload
- **Architecture:** Professional MVC pattern with organized structure

## Future Updates:

### Phase 1: Shopping Cart System (In Development - December 2025)
-- Completed 0--
   (- **Shopping Cart Functionality** - Add/remove/update items with AJAX
   - **Session-based Persistence** - Cart survives page refreshes and navigation
   - **Real-time Cart Management** - Live totals and quantity updates
   - **Mobile-Optimized Cart** - Touch-friendly controls and responsive design
   - **Checkout Foundation** - Customer information and order summary
   - **Enhanced UX** - Loading states, success/error messaging
   - **Cart Validation** - Stock checking and quantity limits)

### Phase 2: User Authentication & Admin
- **User Registration/Login** - Account creation and authentication
- **Admin Panel** - Product management dashboard (CRUD operations)
- **User Roles** - Admin vs customer permissions - (Work in Progress)
- **Order History** - Track purchases and order status - (Work in Progress)
- **Inventory Management** - Real-time stock updates (Completed)

### Phase 3: Advanced E-commerce
- **Payment Integration** - Stripe/PayPal processing (This will be in the docs as a how to because you need a paypal business account for the api key required in the app)
- **Order Management** - Complete order lifecycle
- **Email Notifications** - Order confirmations and updates
- **Search & Filters** - Enhanced product discovery
- **Product Reviews** - Customer feedback system

### Phase 4: Platform Evolution
- **Multi-vendor Marketplace** - Artisan seller onboarding
- **Seller Dashboard** - Tools for independent creators
- **Commission System** - Revenue sharing for platform
- **Advanced Analytics** - Sales reporting and insights
- **Mobile App** - React Native companion app

## License

MIT License