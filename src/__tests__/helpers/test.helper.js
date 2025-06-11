const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../../models/user.model");
const Survey = require("../../models/survey.model");
const logger = require('../../utils/logger');

let mongoServer;

const connect = async () => {
  if (mongoose.connection.readyState === 1) {
    // Already connected
    return;
  }

  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);
    logger.info('Connected to in-memory MongoDB');
  } catch (error) {
    logger.error('Error connecting to in-memory MongoDB:', error);
    throw error;
  }
};

const closeDatabase = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
      mongoServer = undefined;
    }
    logger.info('Disconnected from in-memory MongoDB');
  } catch (error) {
    logger.error('Error closing in-memory MongoDB connection:', error);
    throw error;
  }
};

const clearDatabase = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany();
      }
      logger.info('Cleared all collections in in-memory MongoDB');
    }
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
  process.env.REGISTRATION_SECRET = "test-registration-secret";
};

const createTestUser = async (userData = {}) => {
  const defaultPassword = 'password123';
  const hashedPassword = await bcrypt.hash(userData.password || defaultPassword, 10);
  
  const defaultUser = {
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: hashedPassword,
    role: 'user'
  };

  // Remove password from userData if it exists (we've already hashed it)
  const { password, ...cleanUserData } = userData;
  
  const user = new User({ ...defaultUser, ...cleanUserData });
  await user.save();
  return user;
};

const createTestSurvey = async (user, surveyData = {}) => {
  const defaultSurvey = {
    title: "Test Survey",
    area: "Test Area",
    guidelines: {
      question: "Test Question?",
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
