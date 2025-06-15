const request = require("supertest");
const app = require("../app");
const Survey = require("../models/survey.model");
const User = require("../models/user.model");
const mongoose = require("mongoose");
const { createTestUser, generateTestToken, createTestSurvey } = require("./helpers/test.helper");

// Mock the LLM service for consistent testing
jest.mock("../services/llm.service", () => require("../__mocks__/llm.service.js"));

jest.setTimeout(30000);

describe("Survey Controller - Comprehensive Tests", () => {
  let creator;
  let user;
  let anotherUser;
  let creatorToken;
  let userToken;
  let anotherUserToken;
  let survey;

  beforeEach(async () => {
    creator = await createTestUser({ username: 'creator', email: 'creator@example.com' });
    user = await createTestUser({ username: 'user', email: 'user@example.com' });
    anotherUser = await createTestUser({ username: 'another', email: 'another@example.com' });
    
    creatorToken = generateTestToken(creator);
    userToken = generateTestToken(user);
    anotherUserToken = generateTestToken(anotherUser);
    
    survey = await createTestSurvey(creator);
  });

  describe("GET /surveys", () => {
    beforeEach(async () => {
      // Create multiple surveys for testing
      await createTestSurvey(creator, { title: "Survey 1", area: "Area 1" });
      await createTestSurvey(user, { title: "Survey 2", area: "Area 2" });
    });

    it("should get all surveys with response counts", async () => {
      const res = await request(app)
        .get("/surveys")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.surveys).toBeDefined();
      expect(Array.isArray(res.body.surveys)).toBe(true);
      expect(res.body.surveys.length).toBeGreaterThan(0);
      
      // Check that response count is included and full responses are excluded
      res.body.surveys.forEach(survey => {
        expect(survey).toHaveProperty('responseCount');
        expect(survey).not.toHaveProperty('responses');
      });
    });

    it("should handle empty survey list", async () => {
      // Clear all surveys
      await Survey.deleteMany({});

      const res = await request(app)
        .get("/surveys")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.surveys).toEqual([]);
    });
  });

  describe("GET /surveys/:id", () => {
    beforeEach(async () => {
      // Add responses to survey
      survey.responses.push({
        user: user._id,
        content: "User response",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      survey.responses.push({
        user: anotherUser._id,
        content: "Another user response",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await survey.save();
    });

    it("should get survey by ID for creator with all responses", async () => {
      const res = await request(app)
        .get(`/surveys/${survey._id}`)
        .set("Authorization", `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.survey).toBeDefined();
      expect(res.body.survey.responses.length).toBe(2);
      expect(res.body.survey.responseCount).toBe(2);
    });

    it("should get survey by ID for user with only their response", async () => {
      const res = await request(app)
        .get(`/surveys/${survey._id}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.survey).toBeDefined();
      expect(res.body.survey.responses.length).toBe(1);
      expect(res.body.survey.responses[0].content).toBe("User response");
      expect(res.body.survey.responseCount).toBe(2); // Total count should still be 2
    });

    it("should return 404 for non-existent survey", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/surveys/${fakeId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("SURVEY_NOT_FOUND");
    });

    it("should handle invalid survey ID format", async () => {
      const res = await request(app)
        .get("/surveys/invalid-id")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(500);
    });
  });

  describe("PATCH /surveys/:id", () => {
    it("should update survey by creator", async () => {
      const updateData = {
        title: "Updated Survey Title",
        area: "Updated Area"
      };

      const res = await request(app)
        .patch(`/surveys/${survey._id}`)
        .set("Authorization", `Bearer ${creatorToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.survey.title).toBe("Updated Survey Title");
      expect(res.body.survey.area).toBe("Updated Area");
    });

    it("should not allow non-creator to update survey", async () => {
      const res = await request(app)
        .patch(`/surveys/${survey._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ title: "Unauthorized Update" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("NOT_CREATOR");
    });

    it("should validate update data", async () => {
      const res = await request(app)
        .patch(`/surveys/${survey._id}`)
        .set("Authorization", `Bearer ${creatorToken}`)
        .send({ expiryDate: "invalid-date" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("DELETE /surveys/:id", () => {
    it("should delete survey by creator", async () => {
      const res = await request(app)
        .delete(`/surveys/${survey._id}`)
        .set("Authorization", `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Survey deleted successfully");

      // Verify survey is deleted
      const deletedSurvey = await Survey.findById(survey._id);
      expect(deletedSurvey).toBeNull();
    });

    it("should not allow non-creator to delete survey", async () => {
      const res = await request(app)
        .delete(`/surveys/${survey._id}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("NOT_CREATOR");
    });

    it("should return 404 for non-existent survey", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/surveys/${fakeId}`)
        .set("Authorization", `Bearer ${creatorToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("SURVEY_NOT_FOUND");
    });
  });
}); 