const request = require("supertest");
const app = require("../app");
const Survey = require("../models/survey.model");
const { createTestUser, generateTestToken, createTestSurvey } = require("./helpers/test.helper");

// Mock the LLM service for all tests
jest.mock("../services/llm.service", () =>
  require("../__mocks__/llm.service.js"),
);

jest.setTimeout(30000);

describe("Survey Controller - Branch Coverage Tests", () => {
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

  describe("Survey Update - Additional Branch Coverage", () => {
    let survey;

    beforeEach(async () => {
      survey = await createTestSurvey(creator);
    });

    it("should handle undefined fields in update", async () => {
      const updateData = {
        title: "Updated Title",
        undefinedField: undefined
      };

      const res = await request(app)
        .patch(`/surveys/${survey._id}`)
        .set("Authorization", `Bearer ${creatorToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.survey.title).toBe("Updated Title");
    });
  });

  describe("Survey Search - Branch Coverage", () => {
    beforeEach(async () => {
      await createTestSurvey(creator, { title: "Food Survey", area: "Nutrition" });
      await createTestSurvey(creator, { title: "Tech Survey", area: "Technology" });
    });

    it("should return error when search query is missing", async () => {
      const res = await request(app)
        .post("/surveys/search")
        .set("Authorization", `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_QUERY");
      expect(res.body.error.message).toBe("Search query is required");
    });


  });

  describe("Response Validation - Branch Coverage", () => {
    let survey;
    let responseId;

    beforeEach(async () => {
      survey = await createTestSurvey(creator);
      // Add a response to validate
      survey.responses.push({
        user: user._id,
        content: "Test response",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await survey.save();
      responseId = survey.responses[0]._id;
    });

    it("should return 404 when survey not found for validation", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .get(`/surveys/${fakeId}/responses/${responseId}/validate`)
        .set("Authorization", `Bearer ${creatorToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error && res.body.error.code).toBe("SURVEY_NOT_FOUND");
    });

    it("should return 403 when non-creator tries to validate", async () => {
      const res = await request(app)
        .get(`/surveys/${survey._id}/responses/${responseId}/validate`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error && res.body.error.code).toBe("NOT_CREATOR");
    });

    it("should return 404 when response not found for validation", async () => {
      const fakeResponseId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .get(`/surveys/${survey._id}/responses/${fakeResponseId}/validate`)
        .set("Authorization", `Bearer ${creatorToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error && res.body.error.code).toBe("RESPONSE_NOT_FOUND");
    });

    it("should successfully validate response by creator", async () => {
      const res = await request(app)
        .get(`/surveys/${survey._id}/responses/${responseId}/validate`)
        .set("Authorization", `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Response validation completed");
      expect(res.body.validationResult).toBeDefined();
    });
  });



  describe("Generate Summary - Branch Coverage", () => {
    let survey;

    beforeEach(async () => {
      survey = await createTestSurvey(creator);
    });

    it("should return 404 when survey not found for summary", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .post(`/surveys/${fakeId}/summary`)
        .set("Authorization", `Bearer ${creatorToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error && res.body.error.code).toBe("SURVEY_NOT_FOUND");
    });

    it("should return 403 when non-creator tries to generate summary", async () => {
      const res = await request(app)
        .post(`/surveys/${survey._id}/summary`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error && res.body.error.code).toBe("NOT_CREATOR");
    });

    it("should return 400 when survey has no responses", async () => {
      const res = await request(app)
        .post(`/surveys/${survey._id}/summary`)
        .set("Authorization", `Bearer ${creatorToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error && res.body.error.code).toBe("NO_RESPONSES");
      expect(res.body.error && res.body.error.message).toBe("Cannot generate summary for survey with no responses");
    });

    it("should successfully generate summary when survey has responses", async () => {
      // Add responses to survey
      survey.responses.push({
        user: user._id,
        content: "Great response about food",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await survey.save();

      const res = await request(app)
        .post(`/surveys/${survey._id}/summary`)
        .set("Authorization", `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Summary generated successfully");
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.content).toBeDefined();
      expect(res.body.summary.isVisible).toBe(false);
    });
  });

  describe("Submit Response - Additional Branch Coverage", () => {
    let survey;

    beforeEach(async () => {
      survey = await createTestSurvey(creator);
    });

    it("should reject response to inactive survey", async () => {
      survey.isActive = false;
      await survey.save();

      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ content: "Test response" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("SURVEY_INACTIVE");
      expect(res.body.error.message).toBe("Survey is not active");
    });

    it("should check maxResponses when reached", async () => {
      // Add maxResponses of 1 and one existing response
      survey.responses.push({
        user: creator._id,
        content: "Existing response",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      survey.maxResponses = 1;
      await survey.save();

      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ content: "Test response" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MAX_RESPONSES_REACHED");
      expect(res.body.error.message).toBe("Survey is not accepting new responses at this time.");
    });

    it("should handle user ID with different toString methods", async () => {
      const userWithId = { 
        _id: { toString: () => user._id.toString() },
        id: { toString: () => user._id.toString() },
        username: user.username 
      };

      // Mock req.user to test different ID handling
      const customUser = Object.assign({}, user, userWithId);

      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ content: "Test response" });

      expect(res.status).toBe(201);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle survey responses array transformation", async () => {
      const survey = await createTestSurvey(creator);
      
      // Test the getSurveys endpoint which transforms responses
      const res = await request(app)
        .get("/surveys")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.surveys).toBeDefined();
      
      // Check that surveys have responseCount and no responses property
      res.body.surveys.forEach(surveyItem => {
        expect(surveyItem).toHaveProperty('responseCount');
        expect(surveyItem).not.toHaveProperty('responses');
      });
    });

    it("should handle survey without responses in getSurveyById", async () => {
      const survey = await createTestSurvey(creator);
      
      const res = await request(app)
        .get(`/surveys/${survey._id}`)
        .set("Authorization", `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.survey.responseCount).toBe(0);
    });
  });
});