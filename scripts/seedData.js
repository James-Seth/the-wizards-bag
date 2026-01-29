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
  },
  {
    name: "Deluxe Card Binder - Black Leather",
    description: "Professional grade card binder with premium leather exterior. Features secure 9-pocket pages for showcasing your collection.",
    price: 34.99,
    category: "accessories",
    image: "/images/placeholder.svg",
    inStock: true,
    inventory: 25,
    features: ["9-pocket pages", "Genuine leather", "Holds 360 cards", "Side-loading pockets"]
  },
  {
    name: "Planeswalker Token Collection",
    description: "Complete set of planeswalker loyalty tokens featuring stunning artwork from popular MTG planeswalkers.",
    price: 19.99,
    category: "tokens",
    image: "/images/placeholder.svg",
    inStock: true,
    inventory: 35,
    features: ["20 different tokens", "Official artwork", "Durable cardboard", "Storage box included"]
  },
  {
    name: "Deck Box - Crystal Clear Acrylic",
    description: "Modern acrylic deck box that showcases your deck while providing superior protection. Perfect for display.",
    price: 24.99,
    category: "deck-boxes",
    image: "/images/placeholder.svg",
    inStock: true,
    inventory: 20,
    features: ["Crystal clear acrylic", "Holds 75+ cards", "Magnetic closure", "Stackable design"]
  },
  {
    name: "Commander Damage Counters",
    description: "Essential counters for tracking commander damage in EDH games. Color-coded for easy identification.",
    price: 15.99,
    category: "tokens",
    image: "/images/placeholder.svg",
    inStock: true,
    inventory: 40,
    features: ["Set of 12 counters", "Color-coded", "Commander themed", "Acrylic construction"]
  },
  {
    name: "Playmat - Mystic Forest",
    description: "Large gaming playmat featuring beautiful mystic forest artwork. Provides smooth surface for card play.",
    price: 22.99,
    category: "accessories",
    image: "/images/placeholder.svg",
    inStock: false,
    inventory: 0,
    features: ["24\" x 14\" size", "Stitched edges", "Non-slip rubber base", "Machine washable"]
  },
  {
    name: "Double Deck Box - Mahogany Wood",
    description: "Elegant wooden deck box that holds two separate decks. Handcrafted from genuine mahogany wood.",
    price: 52.99,
    category: "deck-boxes",
    image: "/images/placeholder.svg",
    inStock: true,
    inventory: 12,
    features: ["Holds 2 decks", "Mahogany wood", "Felt-lined compartments", "Brass hinges"]
  },
  {
    name: "Card Sleeves - Matte Black",
    description: "Professional matte finish sleeves that reduce glare and provide excellent shuffle feel for competitive play.",
    price: 11.99,
    category: "accessories",
    image: "/images/placeholder.svg",
    inStock: true,
    inventory: 75,
    features: ["Pack of 100 sleeves", "Matte finish", "Reduced glare", "Tournament approved"]
  },
  {
    name: "Spin-Down Life Counter Dice Set",
    description: "Set of oversized spin-down dice perfect for tracking life totals. Features clear, easy-to-read numbers.",
    price: 9.99,
    category: "tokens",
    image: "/images/placeholder.svg",
    inStock: true,
    inventory: 60,
    features: ["Set of 4 dice", "Oversized design", "Clear numbers", "Multiple colors"]
  },
  {
    name: "Card Grading Sleeves - Pro Grade",
    description: "Ultra-premium sleeves designed for card grading and long-term storage. Museum quality protection.",
    price: 16.99,
    category: "accessories",
    image: "/images/placeholder.svg",
    inStock: true,
    inventory: 30,
    features: ["Pack of 50 sleeves", "UV protection", "Archival quality", "Perfect fit sizing"]
  },
  {
    name: "Deck Box - Steampunk Leather",
    description: "Unique steampunk-themed leather deck box with brass accents. A perfect blend of style and functionality.",
    price: 39.99,
    category: "deck-boxes",
    image: "/images/placeholder.svg",
    inStock: true,
    inventory: 18,
    features: ["Genuine leather", "Brass accents", "Steampunk design", "Magnetic closure"]
  },
  {
    name: "Energy Counter Tokens - Pokemon",
    description: "Official Pokemon energy counter tokens for tracking energy in Pokemon TCG games.",
    price: 13.99,
    category: "tokens",
    image: "/images/placeholder.svg",
    inStock: false,
    inventory: 0,
    features: ["Set of 15 tokens", "Official Pokemon", "Multiple energy types", "Durable plastic"]
  },
  {
    name: "Gaming Mat - Space Theme",
    description: "Large gaming mat with stunning space nebula artwork. Perfect for any sci-fi themed game night.",
    price: 26.99,
    category: "accessories",
    image: "/images/placeholder.svg",
    inStock: true,
    inventory: 22,
    features: ["26\" x 15\" size", "Space theme", "High-quality printing", "Anti-slip backing"]
  },
  {
    name: "Card Storage Box - 5000 Count",
    description: "Large capacity storage box for serious collectors. Holds up to 5000 cards with dividers included.",
    price: 32.99,
    category: "accessories",
    image: "/images/placeholder.svg",
    inStock: true,
    inventory: 14,
    features: ["Holds 5000 cards", "Includes dividers", "Sturdy cardboard", "Easy assembly"]
  },
  {
    name: "Mini Deck Box Set - Rainbow Collection",
    description: "Adorable mini deck boxes in rainbow colors. Perfect for storing tokens, dice, or small deck collections.",
    price: 18.99,
    category: "deck-boxes",
    image: "/images/placeholder.svg",
    inStock: true,
    inventory: 28,
    features: ["Set of 6 mini boxes", "Rainbow colors", "Holds 30+ cards each", "Stackable design"]
  },
  {
    name: "Damage Counter Glass Beads",
    description: "Elegant glass beads in various colors for tracking damage, counters, and game states in style.",
    price: 14.99,
    category: "tokens",
    image: "/images/placeholder.svg",
    inStock: true,
    inventory: 45,
    features: ["50 glass beads", "5 different colors", "Smooth finish", "Storage pouch included"]
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
