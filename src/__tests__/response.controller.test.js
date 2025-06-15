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

    it('should return 400 when content is not a string', async () => {
      const response = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 123
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('"content" must be a string');
    });

    it('should return 404 when survey not found', async () => {
      const response = await request(app)
        .post(`/surveys/507f1f77bcf86cd799439011/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Response to non-existent survey'
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Survey not found');
    });

    it('should return 400 when survey is inactive', async () => {
      // Make survey inactive
      await Survey.updateOne({ _id: testSurvey._id }, { $set: { isActive: false } });

      const response = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Response to inactive survey'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Survey is not active');
    });

    it('should return 400 when survey has expired', async () => {
      // Set survey expiry to past
      await Survey.updateOne({ _id: testSurvey._id }, { 
        $set: { expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
      });

      const response = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Response to expired survey'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Survey has expired');
    });

    it('should return 400 when max responses reached', async () => {
      // Set max responses to 1
      await Survey.updateOne({ _id: testSurvey._id }, { $set: { maxResponses: 1 } });

      // Submit first response
      await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'First response' });

      // Create another user for second response
      const anotherUser = await createTestUser({ username: 'another', email: 'another@example.com' });
      const anotherToken = generateTestToken(anotherUser);

      // Try to submit second response
      const response = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({
          content: 'Second response should fail'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Survey is not accepting new responses at this time.');
    });

    it('should return 400 when user already responded', async () => {
      // Submit first response
      await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'First response' });

      // Try to submit another response from same user
      const response = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Duplicate response'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('RESPONSE_ALREADY_EXISTS');
      expect(response.body.error.message).toBe('You have already submitted a response to this survey');
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

    it('should deny access to non-creator', async () => {
      const response = await request(app)
        .get(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('Access denied');
    });

    it('should return 404 when survey not found', async () => {
      const response = await request(app)
        .get(`/surveys/507f1f77bcf86cd799439011/responses`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Survey not found');
    });
  });

  describe('getResponse', () => {
    let responseId;

    beforeEach(async () => {
      // Create a response first
      const submitRes = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Test response for get' });
      responseId = submitRes.body._id;
    });

    it('should get specific response by creator', async () => {
      const response = await request(app)
        .get(`/surveys/${testSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.response).toBeDefined();
      expect(response.body.response.content).toBe('Test response for get');
    });

    it('should get specific response by response owner', async () => {
      const response = await request(app)
        .get(`/surveys/${testSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.response).toBeDefined();
    });

    it('should return 404 when survey not found', async () => {
      const response = await request(app)
        .get(`/surveys/507f1f77bcf86cd799439011/responses/${responseId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Survey not found');
    });

    it('should return 404 when response not found', async () => {
      const response = await request(app)
        .get(`/surveys/${testSurvey._id}/responses/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Response not found');
    });

    it('should deny access to unauthorized user', async () => {
      const anotherUser = await createTestUser({ username: 'another', email: 'another@example.com' });
      const anotherToken = generateTestToken(anotherUser);

      const response = await request(app)
        .get(`/surveys/${testSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${anotherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('Access denied');
    });
  });

  describe('updateResponse', () => {
    let responseId;

    beforeEach(async () => {
      // Create a response first
      const submitRes = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Original content' });
      responseId = submitRes.body._id;
    });

    it('should update response by owner', async () => {
      const response = await request(app)
        .put(`/surveys/${testSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Updated content' });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe('Updated content');
    });

    it('should deny update by non-owner', async () => {
      const anotherUser = await createTestUser({ username: 'another', email: 'another@example.com' });
      const anotherToken = generateTestToken(anotherUser);

      const response = await request(app)
        .put(`/surveys/${testSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({ content: 'Unauthorized update' });

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('You can only update your own responses');
    });

    it('should return 404 when survey not found', async () => {
      const response = await request(app)
        .put(`/surveys/507f1f77bcf86cd799439011/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Update non-existent survey' });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Survey not found');
    });

    it('should return 404 when response not found', async () => {
      const response = await request(app)
        .put(`/surveys/${testSurvey._id}/responses/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Update non-existent response' });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Response not found');
    });

    it('should return 400 when survey has expired', async () => {
      // Set survey expiry to past
      await Survey.updateOne({ _id: testSurvey._id }, { 
        $set: { expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
      });

      const response = await request(app)
        .put(`/surveys/${testSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Update expired survey response' });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Survey has expired');
    });
  });

  describe('deleteResponse', () => {
    let responseId;

    beforeEach(async () => {
      // Create a response first
      const submitRes = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Response to delete' });
      responseId = submitRes.body._id;
    });

    it('should delete response by owner', async () => {
      const response = await request(app)
        .delete(`/surveys/${testSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Response deleted successfully');
    });

    it('should delete response by survey creator', async () => {
      const response = await request(app)
        .delete(`/surveys/${testSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Response deleted successfully');
    });

    it('should return 404 when survey not found', async () => {
      const response = await request(app)
        .delete(`/surveys/507f1f77bcf86cd799439011/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Survey not found');
    });

    it('should return 404 when response not found', async () => {
      const response = await request(app)
        .delete(`/surveys/${testSurvey._id}/responses/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Response not found');
    });

    it('should deny deletion by unauthorized user', async () => {
      const anotherUser = await createTestUser({ username: 'another', email: 'another@example.com' });
      const anotherToken = generateTestToken(anotherUser);

      const response = await request(app)
        .delete(`/surveys/${testSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${anotherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('You can only delete your own responses');
    });
  });

  describe('Error Handling', () => {
    it('should handle submitResponse with invalid survey ID', async () => {
      const response = await request(app)
        .post(`/surveys/invalid-id/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Response to invalid survey'
        });

      expect(response.status).toBe(500);
      expect(response.body.error.message).toBeDefined();
    });

    it('should handle getSurveyResponses with invalid survey ID', async () => {
      const response = await request(app)
        .get(`/surveys/invalid-id/responses`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error.message).toBeDefined();
    });

    it('should handle getResponse with invalid survey ID', async () => {
      const response = await request(app)
        .get(`/surveys/invalid-id/responses/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error.message).toBeDefined();
    });

    it('should handle updateResponse with invalid survey ID', async () => {
      const response = await request(app)
        .put(`/surveys/invalid-id/responses/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Updated content' });

      expect(response.status).toBe(500);
      expect(response.body.error.message).toBeDefined();
    });

    it('should handle deleteResponse with invalid survey ID', async () => {
      const response = await request(app)
        .delete(`/surveys/invalid-id/responses/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error.message).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle survey without max responses limit', async () => {
      // Create survey without max responses
      const noLimitTestSurvey = await createTestSurvey(creator, { maxResponses: null });

      const response = await request(app)
        .post(`/surveys/${noLimitTestSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Response to unlimited survey'
        });

      expect(response.status).toBe(201);
      expect(response.body.content).toBe('Response to unlimited survey');
    });

    it('should handle empty content as falsy value', async () => {
      const response = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('"content" is not allowed to be empty');
    });

    it('should handle null content', async () => {
      const response = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: null
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('"content" must be a string');
    });

    it('should handle survey with future expiry date', async () => {
      // Create survey with far future expiry
      const futureExpiryTestSurvey = await createTestSurvey(creator, { 
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      });

      const response = await request(app)
        .post(`/surveys/${futureExpiryTestSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Response to future expiry survey'
        });

      expect(response.status).toBe(201);
      expect(response.body.content).toBe('Response to future expiry survey');
    });

    it('should handle updating response when survey has future expiry', async () => {
      const futureExpiryTestSurvey = await createTestSurvey(creator, { 
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      });

      // Submit a response first
      const submitRes = await request(app)
        .post(`/surveys/${futureExpiryTestSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Original content' });

      const responseId = submitRes.body._id;

      // Update the response
      const response = await request(app)
        .put(`/surveys/${futureExpiryTestSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Updated content' });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe('Updated content');
    });
  });
}); 