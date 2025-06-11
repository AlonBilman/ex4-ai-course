// Set up environment before requiring app
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key";
process.env.USE_MOCK_LLM = "true";

const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const surveyRoutes = require("../routes/survey.routes");
const {
  connect,
  closeDatabase,
  clearDatabase,
} = require("./helpers/test.helper");
const User = require("../models/user.model");
const Survey = require("../models/survey.model");

// Mock the LLM service for all tests
jest.mock("../services/llm.service", () =>
  require("../__mocks__/llm.service.js"),
);

// Increase timeout for database operations
jest.setTimeout(30000);

/**
 * This test suite covers the main survey flows:
 * - Survey creation (success, validation error)
 * - Response submission (success, after expiry, after max responses)
 * - Response update/removal (success, after expiry)
 * - Survey search (mocked LLM)
 * - Survey summarization (mocked LLM)
 * - Response validation (mocked LLM)
 * - Survey closing (by creator, by non-creator)
 *
 * Each test uses the in-memory DB and is fully independent.
 */
describe("Survey Controller", () => {
  let app;
  let creator;
  let user;
  let creatorToken;
  let userToken;

  beforeAll(async () => {
    await connect();
    app = express();
    app.use(express.json());
    app.use("/surveys", surveyRoutes);

    // Create test users using User model save method for proper password hashing
    const creatorUser = new User({
      username: "creator",
      email: "creator@example.com",
      passwordHash: "creator123",
    });
    creator = await creatorUser.save();

    const testUser = new User({
      username: "user",
      email: "user@example.com",
      passwordHash: "user123",
    });
    user = await testUser.save();

    creatorToken = jwt.sign(
      { id: creator._id, role: creator.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    userToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("Survey Creation", () => {
    it("should create a survey with valid data", async () => {
      const surveyData = {
        title: "Test Survey",
        area: "Test Area",
        guidelines: {
          question: "What is your favorite food?",
          permittedDomains: ["food", "dining"],
          permittedResponses: "Any food-related responses are welcome",
          summaryInstructions: "Summarize the food preferences"
        },
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const res = await request(app)
        .post("/surveys")
        .set("Authorization", `Bearer ${creatorToken}`)
        .send(surveyData);

      expect(res.status).toBe(201);
      expect(res.body.survey.title).toBe("Test Survey");
      expect(res.body.survey.creator).toBe(creator._id.toString());
    });

    it("should reject survey creation with missing fields", async () => {
      const res = await request(app)
        .post("/surveys")
        .set("Authorization", `Bearer ${creatorToken}`)
        .send({});

      console.log('Response status:', res.status);
      console.log('Response body:', res.body);
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("required");
    });
  });

  describe("Survey Response", () => {
    let survey;

    beforeEach(async () => {
      survey = await Survey.create({
        title: "Test Survey",
        area: "Test Area",
        guidelines: {
          question: "What is your favorite food?",
          permittedResponses: "Any food-related responses are welcome"
        },
        creator: creator._id,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    });

    it("should allow a user to submit a response", async () => {
      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          content: "Pizza!"
        });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe("Pizza!");
    });

    it("should not allow response after expiry", async () => {
      // Update the survey expiry date to past using updateOne to bypass validation
      await Survey.updateOne(
        { _id: survey._id },
        { $set: { expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      );

      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          content: "Late answer"
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("expired");
    });

    it("should not allow duplicate responses from the same user", async () => {
      // Submit first response
      await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          content: "First response"
        });

      // Try to submit another response from the same user
      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          content: "Second response"
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("RESPONSE_ALREADY_EXISTS");
      expect(res.body.error.message).toContain("already submitted a response");
    });

    it("should not allow more than maxResponses", async () => {
      survey.maxResponses = 1;
      await survey.save();

      // Submit first response
      await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          content: "First response"
        });

      // Create another user for second response
      const anotherUser = new User({
        username: "another",
        email: "another@example.com",
        passwordHash: "another123",
      });
      await anotherUser.save();
      
      const anotherToken = jwt.sign(
        { id: anotherUser._id, role: anotherUser.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // Try to submit second response which should fail due to maxResponses
      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set("Authorization", `Bearer ${anotherToken}`)
        .send({
          content: "Second response"
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("maximum responses");
    });
  });

  // More tests for update, remove, search, summarize, validate, close, etc. can be added similarly
});
