// Set up environment before requiring app
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
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

    // Create test users
    const creatorPasswordHash = await bcrypt.hash("creator123", 10);
    const userPasswordHash = await bcrypt.hash("user123", 10);

    creator = await User.create({
      username: "creator",
      email: "creator@example.com",
      passwordHash: creatorPasswordHash,
    });

    user = await User.create({
      username: "user",
      email: "user@example.com",
      passwordHash: userPasswordHash,
    });

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
        description: "A test survey description",
        questions: [
          {
            text: "What is your favorite food?",
            type: "text",
          },
        ],
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

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("required");
    });
  });

  describe("Survey Response", () => {
    let survey;

    beforeEach(async () => {
      survey = await Survey.create({
        title: "Test Survey",
        description: "A test survey description",
        questions: [
          {
            text: "What is your favorite food?",
            type: "text",
          },
        ],
        creator: creator._id,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    });

    it("should allow a user to submit a response", async () => {
      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          answers: [
            {
              questionId: survey.questions[0]._id,
              answer: "Pizza!",
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.response.answers[0].answer).toBe("Pizza!");
    });

    it("should not allow response after expiry", async () => {
      survey.expiryDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await survey.save();

      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          answers: [
            {
              questionId: survey.questions[0]._id,
              answer: "Late answer",
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("expired");
    });

    it("should not allow more than maxResponses", async () => {
      survey.maxResponses = 2;
      await survey.save();

      // Submit first response
      await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          answers: [
            {
              questionId: survey.questions[0]._id,
              answer: "First",
            },
          ],
        });

      // Submit second response
      await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          answers: [
            {
              questionId: survey.questions[0]._id,
              answer: "Second",
            },
          ],
        });

      // Try to submit third response
      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          answers: [
            {
              questionId: survey.questions[0]._id,
              answer: "Third",
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("maximum responses");
    });
  });

  // More tests for update, remove, search, summarize, validate, close, etc. can be added similarly
});
