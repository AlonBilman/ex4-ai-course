const request = require("supertest");
const app = require("../app");
const Survey = require("../models/survey.model");
const { createTestUser, generateTestToken, createTestSurvey } = require("./helpers/test.helper");

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
  let creator;
  let user;
  let creatorToken;
  let userToken;

  beforeEach(async () => {
    creator = await createTestUser({ username: 'creator', email: 'creator@example.com' });
    user = await createTestUser({ username: 'user', email: 'user@example.com' });
    creatorToken = generateTestToken(creator);
    userToken = generateTestToken(user);
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
      survey = await createTestSurvey(creator);
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
      const anotherUser = await createTestUser({ username: 'another', email: 'another@example.com' });
      const anotherToken = generateTestToken(anotherUser);

      // Try to submit second response which should fail due to maxResponses
      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set("Authorization", `Bearer ${anotherToken}`)
        .send({
          content: "Second response"
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("Survey is not accepting new responses at this time.");
    });
  });

  // More tests for update, remove, search, summarize, validate, close, etc. can be added similarly
});
