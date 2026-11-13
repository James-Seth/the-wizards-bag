require('dotenv').config();
const mongoose = require('mongoose');
const { logger } = require('../src/utils/logger');

const encodeCredential = value => encodeURIComponent(value).replace(/[!'()*]/g, character =>
  `%${character.charCodeAt(0).toString(16).toUpperCase()}`
);

const buildMongoUri = ({ host, username, password, database }) => {
  if (!host || !/^[a-zA-Z0-9.-]+$/.test(host)) {
    throw new Error('MONGODB_HOST must be an Atlas hostname without a protocol or path');
  }
  if (!username || password === undefined || password === '') {
    throw new Error('MONGODB_USERNAME and MONGODB_PASSWORD must both be set');
  }

  return `mongodb+srv://${encodeCredential(username)}:${encodeCredential(password)}@${host}/${encodeURIComponent(database)}?retryWrites=true&w=majority`;
};

const getMongoUri = (defaultUri, env = process.env) => {
  if (env.MONGODB_URI) {
    return env.MONGODB_URI;
  }

  const hasSeparateCredentials = ['MONGODB_HOST', 'MONGODB_USERNAME', 'MONGODB_PASSWORD']
    .some(key => env[key] !== undefined && env[key] !== '');

  if (!hasSeparateCredentials) {
    return defaultUri;
  }

  return buildMongoUri({
    host: env.MONGODB_HOST,
    username: env.MONGODB_USERNAME,
    password: env.MONGODB_PASSWORD,
    database: env.MONGODB_DATABASE || defaultUri.split('/').pop()
  });
};

const connectDB = async () => {
  try {
    const dbConfig = getDatabaseConfig();
    await mongoose.connect(dbConfig.uri, dbConfig.options);
    logger.info('MongoDB connected', {
      host: mongoose.connection.host,
      database: mongoose.connection.name
    });
    return mongoose.connection;
  } catch (error) {
    logger.error('Database connection error:', error);
    process.exit(1);
  }
};

const getDatabaseConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  const configs = {
    development: {
      uri: getMongoUri('mongodb://localhost:27017/the-wizards-bag'),
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }
    },
    
    production: {
      uri: getMongoUri('mongodb://localhost:27017/the-wizards-bag-prod'),
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        w: 'majority'
      }
    },
    
    test: {
      uri: process.env.MONGODB_TEST_URI || getMongoUri('mongodb://localhost:27017/the-wizards-bag-test'),
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
module.exports.getDatabaseConfig = getDatabaseConfig;
module.exports.buildMongoUri = buildMongoUri;