# A Wizards Bag

**A Wizards Bag** is an e-commerce platform designed specifically for tabletop gaming enthusiasts and trading card players. This Node.js application provides a comprehensive marketplace for custom deck boxes, premium gaming accessories, and TTRPG essentials. The **primary** purpose of this project is to develop and refine skills in building full-stack applications.

## What I'm Building Specifically

This project represents a complete e-commerce solution currently designed for a specific company selling custom gaming products. However, the architecture is built with scalability in mind - future iterations may evolve into a multi-vendor marketplace where independent artisans can showcase and sell their handcrafted gaming accessories. Whether you're a Magic: The Gathering player protecting valuable cards, a D&D enthusiast organizing dice and miniatures, or a game master seeking unique accessories, A Wizards Bag serves as your one-stop magical stopping place. Like the loot goblin reaching into a wizards bag. 

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

- Product catalog with filtering
- Individual product detail pages
- MongoDB database integration
- EJS templating with layouts
- Express Validator for input validation
- Responsive design


## Project Structure

```
├── src/
│   ├── models/          # MongoDB models
│   ├── routes/          # Express routes
│   ├── middleware/      # Custom middleware (validation, etc.)
│   └── server.js        # Main application entry point
├── views/
│   ├── layouts/         # EJS layout templates
│   ├── products/        # Product-related views
│   └── *.ejs           # Page templates
├── public/
│   ├── css/            # Stylesheets
│   ├── js/             # Client-side JavaScript
│   └── images/         # Static images
└── scripts/
    └── seedData.js     # Database seeding script
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
- `npm run seed` - Seed database with sample products

## Technologies Used

- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Templating:** EJS with layouts
- **Validation:** Express Validator
- **Logging:** Winston (with file rotation)
- **Configuration:** Environment-based config management
- **Testing:** Jest (unit & integration tests)
- **Development:** Nodemon
- **Architecture:** MVC pattern with professional folder structure

## Future Updates:

### Phase 1: Shopping Cart System (Next Release)
- **Shopping Cart Functionality** - Add/remove/update items in cart
- **Session-based Cart Storage** - Cart persistence across page refreshes
- **Cart Management** - View cart contents with running totals
- **Quantity Controls** - Increase/decrease item quantities
- **Checkout Foundation** - Basic checkout page with dummy payment
- **Continue Shopping Flow** - Seamless navigation between cart and products

### Phase 2: User Authentication & Admin
- **User Registration/Login** - Account creation and authentication
- **Admin Panel** - Product management dashboard (CRUD operations)
- **User Roles** - Admin vs customer permissions
- **Order History** - Track purchases and order status
- **Inventory Management** - Real-time stock updates

### Phase 3: Advanced E-commerce
- **Payment Integration** - Stripe/PayPal processing
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