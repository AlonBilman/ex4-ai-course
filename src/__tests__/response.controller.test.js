const request = require('supertest');
const app = require('../app');
const Survey = require('../models/survey.model');
const { createTestUser, generateTestToken, createTestSurvey } = require('./helpers/test.helper');

jest.setTimeout(30000);

describe('Response Controller - Basic Tests', () => {
  let creator;
  let user;
  let creatorToken;
  let userToken;
  let testSurvey;

  beforeEach(async () => {
    creator = await createTestUser({ username: 'creator', email: 'creator@example.com' });
    user = await createTestUser({ username: 'user', email: 'user@example.com' });
    creatorToken = generateTestToken(creator);
    userToken = generateTestToken(user);
    testSurvey = await createTestSurvey(creator);
  });

  describe('submitResponse', () => {
    it('should submit a response successfully', async () => {
      const response = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'This is my response'
        });

      expect(response.status).toBe(201);
      expect(response.body.content).toBe('This is my response');
    });

    it('should return 400 when content is missing', async () => {
      const response = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Response content is required');
    });
  });

  describe('getSurveyResponses', () => {
    it('should get survey responses for creator', async () => {
      // Add a response first
      await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Test response' });

      const response = await request(app)
        .get(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.responses).toBeDefined();
      expect(response.body.responses.length).toBe(1);
    });
  });
}); 