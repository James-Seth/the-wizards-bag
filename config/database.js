require('dotenv').config();
const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const connectDB = async () => {
  try {
    const dbConfig = getDatabaseConfig();
    await mongoose.connect(dbConfig.uri, dbConfig.options);
    logger.info(`MongoDB connected: ${dbConfig.uri.split('@')[1] || 'localhost'}`);
  } catch (error) {
    logger.error('Database connection error:', error);
    process.exit(1);
  }
};

const getDatabaseConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  const configs = {
    development: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kevins-deck-boxes',
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }
    },
    
    production: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/the-wizards-bag-prod',
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        w: 'majority'
      }
    },
    
    test: {
      uri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/the-wizards-bag-test',
      options: {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }
    }
  };

  return configs[env] || configs.development;
};

// Handle connection events
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from MongoDB');
});

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('Mongoose connection closed through app termination');
    process.exit(0);
  } catch (error) {
    logger.error('Error closing mongoose connection:', error);
    process.exit(1);
  }
});

module.exports = connectDB;