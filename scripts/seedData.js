require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../src/models/Product');

const sampleProducts = [
  {
    name: "Premium Deck Box - Forest Theme",
    description: "A beautifully crafted deck box with forest-inspired artwork. Perfect for protecting your trading cards with style and durability.",
    price: 29.99,
    category: "deck-boxes",
    image: "/images/placeholder.svg",
    inStock: true,
    inventory: 15,
    features: ["Holds 100+ cards", "Magnetic closure", "Premium materials", "Custom artwork"]
  },
  {
    name: "Metal Life Counters Set",
    description: "Durable metal life counter tokens for Magic: The Gathering and other card games. Precision crafted and built to last.",
    price: 12.99,
    category: "tokens",
    image: "/images/placeholder.svg",
    inStock: true,
    inventory: 50,
    features: ["Set of 10 counters", "Engraved numbers", "Anti-tarnish coating", "Multiple denominations"]
  },
  {
    name: "Card Sleeves - Ultra Pro Premium",
    description: "High-quality protective sleeves for your valuable cards. Crystal clear with superior durability.",
    price: 8.99,
    category: "accessories",
    image: "/images/placeholder.svg",
    inStock: false,
    inventory: 0,
    features: ["Pack of 100 sleeves", "Crystal clear finish", "Acid-free materials", "Tournament legal"]
  },
  {
    name: "Custom Dice Tower - Dragon Theme",
    description: "Hand-crafted wooden dice tower with intricate dragon carvings. Perfect for any tabletop gaming session.",
    price: 45.99,
    category: "accessories",
    image: "/images/placeholder.svg",
    inStock: true,
    inventory: 8,
    features: ["Solid wood construction", "Hand-carved details", "Felt-lined interior", "Removable dice tray"]
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kevins-deck-boxes');
    console.log('Connected to database...');
    
    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products...');
    
    // Insert sample products
    await Product.insertMany(sampleProducts);
    console.log('Sample products inserted successfully!');
    
    console.log(`\n✅ Database seeded with ${sampleProducts.length} products:`);
    sampleProducts.forEach(product => {
      console.log(`   - ${product.name} ($${product.price})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
