const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../../models/user.model");
const Survey = require("../../models/survey.model");
const logger = require('../../utils/logger');

const generateTestToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

const createTestUser = async (userData = {}) => {
  const defaultPassword = 'password123';
  
  const defaultUser = {
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: userData.password || defaultPassword,
    role: 'user'
  };

  // Remove password from userData since we've set it to passwordHash
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
  generateTestToken,
  createTestUser,
  createTestSurvey,
};
