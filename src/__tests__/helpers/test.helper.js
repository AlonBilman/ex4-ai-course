const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const User = require("../../models/user.model");
const logger = require('../../utils/logger');

let mongoServer;

const connect = async () => {
  try {
    // Disconnect from any existing connections
    await mongoose.disconnect();

    // Create an in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to the in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    logger.info('Connected to in-memory MongoDB');
  } catch (error) {
    logger.error('Error connecting to in-memory MongoDB:', error);
    throw error;
  }
};

const closeDatabase = async () => {
  try {
    await mongoose.disconnect();
    await mongoServer.stop();
    logger.info('Disconnected from in-memory MongoDB');
  } catch (error) {
    logger.error('Error closing in-memory MongoDB connection:', error);
    throw error;
  }
};

const clearDatabase = async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
    logger.info('Cleared all collections in in-memory MongoDB');
  } catch (error) {
    logger.error('Error clearing in-memory MongoDB collections:', error);
    throw error;
  }
};

const generateTestToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

const setupTestEnv = () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret";
  process.env.USE_MOCK_LLM = "true";
};

const createTestUser = async (userData = {}) => {
  const defaultUser = {
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'password123',
    role: 'user'
  };

  const user = new User({ ...defaultUser, ...userData });
  await user.save();
  return user;
};

const createTestSurvey = async (user, surveyData = {}) => {
  const defaultSurvey = {
    area: "Test Area",
    question: "Test Question?",
    guidelines: {
      permittedDomains: ["test.com"],
      permittedResponses: "Test guidelines",
      summaryInstructions: "Test instructions",
    },
    expiryDate: new Date(Date.now() + 86400000), // 24 hours from now
    creator: user._id,
  };

  const survey = new Survey({ ...defaultSurvey, ...surveyData });
  await survey.save();
  return survey;
};

module.exports = {
  connect,
  closeDatabase,
  clearDatabase,
  generateTestToken,
  setupTestEnv,
  createTestUser,
  createTestSurvey,
};
