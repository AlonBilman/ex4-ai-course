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

  describe('Complex Scenarios', () => {
    it('should handle multiple responses from different users', async () => {
      const user2 = await createTestUser({ username: 'user2', email: 'user2@example.com' });
      const user3 = await createTestUser({ username: 'user3', email: 'user3@example.com' });
      const user2Token = generateTestToken(user2);
      const user3Token = generateTestToken(user3);

      // First user responds
      const response1 = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'First user response' });

      // Second user responds
      const response2 = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: 'Second user response' });

      // Third user responds
      const response3 = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${user3Token}`)
        .send({ content: 'Third user response' });

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response3.status).toBe(201);

      // Get all responses as creator
      const allResponses = await request(app)
        .get(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(allResponses.status).toBe(200);
      expect(allResponses.body.responses.length).toBe(3);
    });

    it('should handle response creation with detailed response object structure', async () => {
      const response = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Detailed response for testing object structure'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(response.body.user).toBe(userToken.split('.')[1] ? user._id.toString() : user._id.toString());
      expect(response.body.content).toBe('Detailed response for testing object structure');
    });

    it('should handle survey exactly at max responses limit', async () => {
      // Create survey with max 2 responses
      const limitedSurvey = await createTestSurvey(creator, { maxResponses: 2 });
      
      const user2 = await createTestUser({ username: 'user2', email: 'user2@example.com' });
      const user3 = await createTestUser({ username: 'user3', email: 'user3@example.com' });
      const user2Token = generateTestToken(user2);
      const user3Token = generateTestToken(user3);

      // First response (should succeed)
      const response1 = await request(app)
        .post(`/surveys/${limitedSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'First response' });

      // Second response (should succeed)
      const response2 = await request(app)
        .post(`/surveys/${limitedSurvey._id}/responses`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: 'Second response' });

      // Third response (should fail - over limit)
      const response3 = await request(app)
        .post(`/surveys/${limitedSurvey._id}/responses`)
        .set('Authorization', `Bearer ${user3Token}`)
        .send({ content: 'Third response should fail' });

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response3.status).toBe(400);
      expect(response3.body.error.message).toBe('Survey is not accepting new responses at this time.');
    });

    it('should verify response ownership in getResponse for both creator and owner', async () => {
      // Submit a response
      const submitRes = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Response for ownership test' });

      const responseId = submitRes.body._id;

      // Creator should be able to access
      const creatorAccess = await request(app)
        .get(`/surveys/${testSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      // Owner should be able to access
      const ownerAccess = await request(app)
        .get(`/surveys/${testSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(creatorAccess.status).toBe(200);
      expect(ownerAccess.status).toBe(200);
      expect(creatorAccess.body.response.content).toBe('Response for ownership test');
      expect(ownerAccess.body.response.content).toBe('Response for ownership test');
    });
  });

  describe('Success Path Coverage', () => {
    it('should successfully create response and verify all object properties', async () => {
      // Test the complete success path of submitResponse (lines 42-53)
      const response = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Complete success path test response'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('user', user._id.toString());
      expect(response.body).toHaveProperty('content', 'Complete success path test response');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(new Date(response.body.createdAt)).toBeInstanceOf(Date);
      expect(new Date(response.body.updatedAt)).toBeInstanceOf(Date);
    });

    it('should cover survey.save() and response creation path', async () => {
      // Test the complete save path with response creation
      const beforeCount = (await Survey.findById(testSurvey._id)).responses.length;
      
      const response = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Testing save path and response creation'
        });

      expect(response.status).toBe(201);
      
      const afterSurvey = await Survey.findById(testSurvey._id);
      expect(afterSurvey.responses.length).toBe(beforeCount + 1);
      
      const savedResponse = afterSurvey.responses[afterSurvey.responses.length - 1];
      expect(savedResponse.content).toBe('Testing save path and response creation');
      expect(savedResponse.user.toString()).toBe(user._id.toString());
    });

    it('should verify getSurveyResponses with populated user data', async () => {
      // Submit multiple responses
      const user2 = await createTestUser({ username: 'popuser1', email: 'popuser1@example.com' });
      const user2Token = generateTestToken(user2);

      await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Response 1' });

      await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: 'Response 2' });

      // Test complete getSurveyResponses success path
      const response = await request(app)
        .get(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.responses).toHaveLength(2);
      expect(response.body.responses[0]).toHaveProperty('content');
      expect(response.body.responses[1]).toHaveProperty('content');
    });

    it('should verify getResponse with populated user data success path', async () => {
      // Submit response
      const submitRes = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Response for getResponse test' });

      const responseId = submitRes.body._id;

      // Test complete getResponse success path
      const response = await request(app)
        .get(`/surveys/${testSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.response).toHaveProperty('content', 'Response for getResponse test');
      expect(response.body.response).toHaveProperty('_id', responseId);
    });
  });

  describe('Maximum Success Path Coverage', () => {
    it('should hit all success lines in submitResponse function', async () => {
      // Create fresh survey for success path
      const freshSurvey = await createTestSurvey(creator, {});

      // This should hit all lines 5-53 in submitResponse
      const response = await request(app)
        .post(`/surveys/${freshSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Success path comprehensive test'
        });

      // Verify full success path
      expect(response.status).toBe(201);
      expect(response.body._id).toBeDefined();
      expect(response.body.user).toBe(user._id.toString());
      expect(response.body.content).toBe('Success path comprehensive test');
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();

      // Verify database state
      const savedSurvey = await Survey.findById(freshSurvey._id);
      expect(savedSurvey.responses.length).toBe(1);
      expect(savedSurvey.responses[0].content).toBe('Success path comprehensive test');
    });

    it('should hit all success lines in updateResponse function', async () => {
      // Submit initial response
      const freshSurvey = await createTestSurvey(creator, {});
      
      const submitRes = await request(app)
        .post(`/surveys/${freshSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Initial for update success test' });

      const responseId = submitRes.body._id;

      // This should hit all lines 115-145 in updateResponse
      const updateRes = await request(app)
        .put(`/surveys/${freshSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Updated via success path test' });

      // Verify update success
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.content).toBe('Updated via success path test');
      expect(updateRes.body._id).toBe(responseId);
      expect(updateRes.body.updatedAt).toBeDefined();

      // Verify database persistence
      const savedSurvey = await Survey.findById(freshSurvey._id);
      const savedResponse = savedSurvey.responses.id(responseId);
      expect(savedResponse.content).toBe('Updated via success path test');
    });

    it('should hit all success lines in deleteResponse function', async () => {
      // Submit response to delete
      const freshSurvey = await createTestSurvey(creator, {});
      
      const submitRes = await request(app)
        .post(`/surveys/${freshSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Response for delete success test' });

      const responseId = submitRes.body._id;

      // This should hit all lines 153-174 in deleteResponse
      const deleteRes = await request(app)
        .delete(`/surveys/${freshSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Verify deletion success
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe('Response deleted successfully');

      // Verify response was removed from database
      const savedSurvey = await Survey.findById(freshSurvey._id);
      const deletedResponse = savedSurvey.responses.id(responseId);
      expect(deletedResponse).toBeNull();
      expect(savedSurvey.responses.length).toBe(0);
    });

    it('should test all validation checks and success paths together', async () => {
      // Test content validation first (hit validation logic)
      const invalidRes = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: null });

      expect(invalidRes.status).toBe(400);

      // Then test full success path with valid content
      const validRes = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Valid content after validation test' });

      expect(validRes.status).toBe(201);
      expect(validRes.body.content).toBe('Valid content after validation test');
    });
  });

  describe('Direct Controller Method Testing for Maximum Coverage', () => {
    it('should directly test submitResponse to hit all success lines 5-53', async () => {
      const mockReq = {
        params: { id: testSurvey._id.toString() },
        body: { content: 'Direct submitResponse test content' },
        user: { id: user._id.toString() }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const responseController = require('../controllers/response.controller');
      await responseController.submitResponse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
      
      const createdResponse = mockRes.json.mock.calls[0][0];
      expect(createdResponse.user.toString()).toBe(user._id.toString());
      expect(createdResponse.content).toBe('Direct submitResponse test content');
      expect(createdResponse.createdAt).toBeInstanceOf(Date);
      expect(createdResponse.updatedAt).toBeInstanceOf(Date);

      // Verify database persistence
      const updatedSurvey = await Survey.findById(testSurvey._id);
      const savedResponse = updatedSurvey.responses.find(r => r.content === 'Direct submitResponse test content');
      expect(savedResponse).toBeTruthy();
    });

    it('should directly test updateResponse to hit all success lines 115-145', async () => {
      // First create a response
      const createRes = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Original content for direct update' });

      const responseId = createRes.body._id;

      const mockReq = {
        params: { 
          id: testSurvey._id.toString(),
          responseId: responseId
        },
        body: { content: 'Direct updateResponse test content' },
        user: { id: user._id.toString() }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const responseController = require('../controllers/response.controller');
      await responseController.updateResponse(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      
      const updatedResponse = mockRes.json.mock.calls[0][0];
      expect(updatedResponse.content).toBe('Direct updateResponse test content');
      expect(updatedResponse.updatedAt).toBeInstanceOf(Date);

      // Verify database persistence
      const updatedSurvey = await Survey.findById(testSurvey._id);
      const savedResponse = updatedSurvey.responses.id(responseId);
      expect(savedResponse.content).toBe('Direct updateResponse test content');
    });

    it('should directly test deleteResponse to hit all success lines 153-174', async () => {
      // First create a response
      const createRes = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Content for direct delete test' });

      const responseId = createRes.body._id;

      const mockReq = {
        params: { 
          id: testSurvey._id.toString(),
          responseId: responseId
        },
        user: { id: user._id.toString() }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const responseController = require('../controllers/response.controller');
      await responseController.deleteResponse(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Response deleted successfully' });

      // Verify database deletion
      const updatedSurvey = await Survey.findById(testSurvey._id);
      const deletedResponse = updatedSurvey.responses.id(responseId);
      expect(deletedResponse).toBeNull();
    });

    it('should test controller validation logic directly (line 10-12)', async () => {
      // Test empty content
      const mockReq1 = {
        params: { id: testSurvey._id.toString() },
        body: { content: '' },
        user: { id: user._id.toString() }
      };

      const mockRes1 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const responseController = require('../controllers/response.controller');
      await responseController.submitResponse(mockReq1, mockRes1);

      expect(mockRes1.status).toHaveBeenCalledWith(400);
      expect(mockRes1.json).toHaveBeenCalledWith({ error: { message: 'Content is required' } });

      // Test non-string content
      const mockReq2 = {
        params: { id: testSurvey._id.toString() },
        body: { content: 123 },
        user: { id: user._id.toString() }
      };

      const mockRes2 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.submitResponse(mockReq2, mockRes2);

      expect(mockRes2.status).toHaveBeenCalledWith(400);
      expect(mockRes2.json).toHaveBeenCalledWith({ error: { message: 'Content is required' } });
    });

    it('should test response array push and new response return (lines 47-53)', async () => {
      const initialCount = (await Survey.findById(testSurvey._id)).responses.length;

      const mockReq = {
        params: { id: testSurvey._id.toString() },
        body: { content: 'Testing array push and response return' },
        user: { id: user._id.toString() }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const responseController = require('../controllers/response.controller');
      await responseController.submitResponse(mockReq, mockRes);

      // Verify response was pushed to array
      const finalSurvey = await Survey.findById(testSurvey._id);
      expect(finalSurvey.responses.length).toBe(initialCount + 1);

      // Verify the returned response is the last one added
      const returnedResponse = mockRes.json.mock.calls[0][0];
      const lastResponse = finalSurvey.responses[finalSurvey.responses.length - 1];
      expect(returnedResponse._id.toString()).toBe(lastResponse._id.toString());
      expect(returnedResponse.content).toBe('Testing array push and response return');
    });

    it('should test response.updatedAt assignment in updateResponse (line 137)', async () => {
      // Create response
      const createRes = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Original for updatedAt test' });

      const responseId = createRes.body._id;
      const originalUpdatedAt = createRes.body.updatedAt;

      // Wait briefly to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const mockReq = {
        params: { 
          id: testSurvey._id.toString(),
          responseId: responseId
        },
        body: { content: 'Updated for timestamp test' },
        user: { id: user._id.toString() }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const responseController = require('../controllers/response.controller');
      await responseController.updateResponse(mockReq, mockRes);

      const updatedResponse = mockRes.json.mock.calls[0][0];
      expect(updatedResponse.content).toBe('Updated for timestamp test');
      expect(new Date(updatedResponse.updatedAt).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());

      // Verify in database
      const finalSurvey = await Survey.findById(testSurvey._id);
      const savedResponse = finalSurvey.responses.id(responseId);
      expect(savedResponse.content).toBe('Updated for timestamp test');
      expect(new Date(savedResponse.updatedAt).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());
    });

    it('should test survey.responses.pull operation in deleteResponse (line 170)', async () => {
      // Create multiple responses
      const res1 = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'First response for pull test' });

      const user2 = await createTestUser({ username: 'pulltest2', email: 'pulltest2@example.com' });
      const user2Token = generateTestToken(user2);
      
      const res2 = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: 'Second response for pull test' });

      const responseId1 = res1.body._id;
      const responseId2 = res2.body._id;

      // Verify both exist
      const beforeSurvey = await Survey.findById(testSurvey._id);
      const beforeCount = beforeSurvey.responses.length;
      expect(beforeSurvey.responses.id(responseId1)).toBeTruthy();
      expect(beforeSurvey.responses.id(responseId2)).toBeTruthy();

      // Delete first response
      const mockReq = {
        params: { 
          id: testSurvey._id.toString(),
          responseId: responseId1
        },
        user: { id: user._id.toString() }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const responseController = require('../controllers/response.controller');
      await responseController.deleteResponse(mockReq, mockRes);

      // Verify pull operation worked
      const afterSurvey = await Survey.findById(testSurvey._id);
      expect(afterSurvey.responses.length).toBe(beforeCount - 1);
      expect(afterSurvey.responses.id(responseId1)).toBeNull();
      expect(afterSurvey.responses.id(responseId2)).toBeTruthy();
    });

    it('should test getSurveyResponses populate operation (line 62)', async () => {
      // Add a response
      await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Response for populate test' });

      const mockReq = {
        params: { id: testSurvey._id.toString() },
        user: { id: creator._id.toString() }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const responseController = require('../controllers/response.controller');
      await responseController.getSurveyResponses(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const result = mockRes.json.mock.calls[0][0];
      expect(result.responses).toBeDefined();
      expect(Array.isArray(result.responses)).toBe(true);
      expect(result.responses.length).toBeGreaterThan(0);
    });

    it('should test getResponse populate operation and response access (lines 81-94)', async () => {
      // Create response
      const createRes = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Response for getResponse populate test' });

      const responseId = createRes.body._id;

      const mockReq = {
        params: { 
          id: testSurvey._id.toString(),
          responseId: responseId
        },
        user: { id: creator._id.toString() } // Test creator access
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const responseController = require('../controllers/response.controller');
      await responseController.getResponse(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const result = mockRes.json.mock.calls[0][0];
      expect(result.response).toBeDefined();
      expect(result.response.content).toBe('Response for getResponse populate test');
      expect(result.response._id.toString()).toBe(responseId);
    });

    it('should test remaining uncovered lines with edge cases', async () => {
      // Test line 9 - ensuring userId variable assignment is covered
      const mockReq = {
        params: { id: testSurvey._id.toString() },
        body: { content: 'Testing userId assignment line' },
        user: { id: user._id.toString() }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const responseController = require('../controllers/response.controller');
      await responseController.submitResponse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should hit all updateResponse success lines including 127, 132, 137', async () => {
      // Create response first
      const createRes = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Content for lines 127-137 test' });

      const responseId = createRes.body._id;

      // Update via controller directly to ensure we hit lines 127, 132, 137
      const mockReq = {
        params: { 
          id: testSurvey._id.toString(),
          responseId: responseId
        },
        body: { content: 'Updated content to hit lines 127-137' },
        user: { id: user._id.toString() }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const responseController = require('../controllers/response.controller');
      await responseController.updateResponse(mockReq, mockRes);

      // Verify line 132 (response.content assignment) and 137 (response.updatedAt assignment)
      const updatedResponse = mockRes.json.mock.calls[0][0];
      expect(updatedResponse.content).toBe('Updated content to hit lines 127-137');
      expect(updatedResponse.updatedAt).toBeInstanceOf(Date);

      // Verify line 139 (res.json(response))
      expect(mockRes.json).toHaveBeenCalledWith(updatedResponse);
    });

    it('should hit all deleteResponse success lines including 159, 164, 169', async () => {
      // Create response first
      const createRes = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Content for lines 159-169 test' });

      const responseId = createRes.body._id;

      // Delete via controller directly to ensure we hit lines 159, 164, 169
      const mockReq = {
        params: { 
          id: testSurvey._id.toString(),
          responseId: responseId
        },
        user: { id: user._id.toString() }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const responseController = require('../controllers/response.controller');
      await responseController.deleteResponse(mockReq, mockRes);

      // Verify line 169 (survey.responses.pull) worked
      const finalSurvey = await Survey.findById(testSurvey._id);
      const deletedResponse = finalSurvey.responses.id(responseId);
      expect(deletedResponse).toBeNull();

      // Verify line 171 (res.json success message)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Response deleted successfully' });
    });

    it('should test complete survey save operation success paths', async () => {
      // Test all the await survey.save() lines (lines 50, 138, 170)
      const initialResponseCount = (await Survey.findById(testSurvey._id)).responses.length;

      // Test line 50 (submitResponse save)
      const mockReq1 = {
        params: { id: testSurvey._id.toString() },
        body: { content: 'Testing survey save line 50' },
        user: { id: user._id.toString() }
      };

      const mockRes1 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const responseController = require('../controllers/response.controller');
      await responseController.submitResponse(mockReq1, mockRes1);

      // Verify save worked
      const afterCreateSurvey = await Survey.findById(testSurvey._id);
      expect(afterCreateSurvey.responses.length).toBe(initialResponseCount + 1);

      const newResponseId = afterCreateSurvey.responses[afterCreateSurvey.responses.length - 1]._id;

      // Test line 138 (updateResponse save)
      const mockReq2 = {
        params: { 
          id: testSurvey._id.toString(),
          responseId: newResponseId
        },
        body: { content: 'Updated to test survey save line 138' },
        user: { id: user._id.toString() }
      };

      const mockRes2 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.updateResponse(mockReq2, mockRes2);

      // Verify update save worked
      const afterUpdateSurvey = await Survey.findById(testSurvey._id);
      const updatedResponse = afterUpdateSurvey.responses.id(newResponseId);
      expect(updatedResponse.content).toBe('Updated to test survey save line 138');

      // Test line 170 (deleteResponse save)
      const mockReq3 = {
        params: { 
          id: testSurvey._id.toString(),
          responseId: newResponseId
        },
        user: { id: user._id.toString() }
      };

      const mockRes3 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.deleteResponse(mockReq3, mockRes3);

      // Verify delete save worked
      const afterDeleteSurvey = await Survey.findById(testSurvey._id);
      expect(afterDeleteSurvey.responses.id(newResponseId)).toBeNull();
      expect(afterDeleteSurvey.responses.length).toBe(initialResponseCount);
    });
  });

  describe('Branch Coverage Testing', () => {
    it('should test both parts of content validation condition (!content || typeof content !== string)', async () => {
      // Test !content branch (falsy content)
      const mockReq1 = {
        params: { id: testSurvey._id.toString() },
        body: { content: '' }, // Empty string is falsy
        user: { id: user._id.toString() }
      };

      const mockRes1 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const responseController = require('../controllers/response.controller');
      await responseController.submitResponse(mockReq1, mockRes1);

      expect(mockRes1.status).toHaveBeenCalledWith(400);
      expect(mockRes1.json).toHaveBeenCalledWith({ error: { message: 'Content is required' } });

      // Test typeof content !== 'string' branch
      const mockReq2 = {
        params: { id: testSurvey._id.toString() },
        body: { content: 123 }, // Number instead of string
        user: { id: user._id.toString() }
      };

      const mockRes2 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.submitResponse(mockReq2, mockRes2);

      expect(mockRes2.status).toHaveBeenCalledWith(400);
      expect(mockRes2.json).toHaveBeenCalledWith({ error: { message: 'Content is required' } });

      // Test undefined content (falsy)
      const mockReq3 = {
        params: { id: testSurvey._id.toString() },
        body: { content: undefined },
        user: { id: user._id.toString() }
      };

      const mockRes3 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.submitResponse(mockReq3, mockRes3);

      expect(mockRes3.status).toHaveBeenCalledWith(400);
    });

    it('should test maxResponses branches (survey.maxResponses && survey.responses.length >= survey.maxResponses)', async () => {
      // Test null maxResponses with controller directly
      const mockReq = {
        params: { id: testSurvey._id.toString() },
        body: { content: 'Testing maxResponses branch logic' },
        user: { id: user._id.toString() }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      // Temporarily modify survey to test null maxResponses logic
      const originalMaxResponses = testSurvey.maxResponses;
      testSurvey.maxResponses = null;
      await testSurvey.save({ validateBeforeSave: false });

      const responseController = require('../controllers/response.controller');
      await responseController.submitResponse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);

      // Restore original maxResponses
      testSurvey.maxResponses = originalMaxResponses;
      await testSurvey.save({ validateBeforeSave: false });

      // Test survey with maxResponses but not reached (first part true, second part false)
      const surveyWithLimit = await createTestSurvey(creator, {
        maxResponses: 5
      });

      const response2 = await request(app)
        .post(`/surveys/${surveyWithLimit._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Response to survey under limit' });

      expect(response2.status).toBe(201);
    });

    it('should test getResponse access control branches (creator !== userId && owner !== userId)', async () => {
      // Create response by user
      const submitRes = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Response for access control test' });

      const responseId = submitRes.body._id;

      // Test when user is creator (first part false) - already covered
      const creatorAccess = await request(app)
        .get(`/surveys/${testSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(creatorAccess.status).toBe(200);

      // Test when user is response owner (second part false) - already covered
      const ownerAccess = await request(app)
        .get(`/surveys/${testSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(ownerAccess.status).toBe(200);

      // Test when user is neither creator nor owner (both parts true)
      const thirdUser = await createTestUser({ username: 'thirduser', email: 'third@example.com' });
      const thirdUserToken = generateTestToken(thirdUser);

      const unauthorizedAccess = await request(app)
        .get(`/surveys/${testSurvey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${thirdUserToken}`);

      expect(unauthorizedAccess.status).toBe(403);
      expect(unauthorizedAccess.body.error.message).toBe('Access denied');
    });

    it('should test updateResponse expiry branches (survey.expiryDate && survey.expiryDate < new Date())', async () => {
      // Create response first
      const submitRes = await request(app)
        .post(`/surveys/${testSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Response for expiry branch test' });

      const responseId = submitRes.body._id;

      // Test survey with null expiryDate using controller directly
      const mockReq = {
        params: { 
          id: testSurvey._id.toString(),
          responseId: responseId
        },
        body: { content: 'Updated content for null expiry test' },
        user: { id: user._id.toString() }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      // Temporarily modify survey to test null expiryDate logic
      const originalExpiry = testSurvey.expiryDate;
      testSurvey.expiryDate = null;
      await testSurvey.save({ validateBeforeSave: false });

      const responseController = require('../controllers/response.controller');
      await responseController.updateResponse(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();

      // Restore original expiry
      testSurvey.expiryDate = originalExpiry;
      await testSurvey.save({ validateBeforeSave: false });

      // Test survey with future expiry (first part true, second part false)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const surveyFutureExpiry = await createTestSurvey(creator, {
        expiryDate: futureDate
      });

      const createRes3 = await request(app)
        .post(`/surveys/${surveyFutureExpiry._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Response for future expiry update test' });

      const responseId3 = createRes3.body._id;

      const updateFutureExpiry = await request(app)
        .put(`/surveys/${surveyFutureExpiry._id}/responses/${responseId3}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Updated response future expiry' });

      expect(updateFutureExpiry.status).toBe(200);
    });

    it('should test deleteResponse access control branches (creator !== userId && owner !== userId)', async () => {
      // Use controller directly to avoid rate limiting
      const responseController = require('../controllers/response.controller');

      // Create response using controller directly
      const createReq = {
        params: { id: testSurvey._id.toString() },
        body: { content: 'Response for delete access control test' },
        user: { id: user._id.toString() }
      };

      const createRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.submitResponse(createReq, createRes);
      const responseId = createRes.json.mock.calls[0][0]._id;

      // Test deletion by creator (first part false)
      const creatorDeleteReq = {
        params: { 
          id: testSurvey._id.toString(),
          responseId: responseId
        },
        user: { id: creator._id.toString() }
      };

      const creatorDeleteRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.deleteResponse(creatorDeleteReq, creatorDeleteRes);
      expect(creatorDeleteRes.json).toHaveBeenCalledWith({ message: 'Response deleted successfully' });

      // Create another response for owner deletion test
      const createReq2 = {
        params: { id: testSurvey._id.toString() },
        body: { content: 'Response for owner delete test' },
        user: { id: user._id.toString() }
      };

      const createRes2 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.submitResponse(createReq2, createRes2);
      const responseId2 = createRes2.json.mock.calls[0][0]._id;

      // Test deletion by owner (second part false)
      const ownerDeleteReq = {
        params: { 
          id: testSurvey._id.toString(),
          responseId: responseId2
        },
        user: { id: user._id.toString() }
      };

      const ownerDeleteRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.deleteResponse(ownerDeleteReq, ownerDeleteRes);
      expect(ownerDeleteRes.json).toHaveBeenCalledWith({ message: 'Response deleted successfully' });

      // Test unauthorized deletion (both parts true)
      const createReq3 = {
        params: { id: testSurvey._id.toString() },
        body: { content: 'Response for unauthorized delete test' },
        user: { id: user._id.toString() }
      };

      const createRes3 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.submitResponse(createReq3, createRes3);
      const responseId3 = createRes3.json.mock.calls[0][0]._id;

      const thirdUser = await createTestUser({ username: 'thirduser2', email: 'third2@example.com' });

      const unauthorizedDeleteReq = {
        params: { 
          id: testSurvey._id.toString(),
          responseId: responseId3
        },
        user: { id: thirdUser._id.toString() }
      };

      const unauthorizedDeleteRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.deleteResponse(unauthorizedDeleteReq, unauthorizedDeleteRes);
      expect(unauthorizedDeleteRes.status).toHaveBeenCalledWith(403);
      expect(unauthorizedDeleteRes.json).toHaveBeenCalledWith({ error: { message: 'Access denied' } });
    });

    it('should test edge cases for branch coverage completion', async () => {
      // Test null content explicitly (different from undefined)
      const mockReq = {
        params: { id: testSurvey._id.toString() },
        body: { content: null },
        user: { id: user._id.toString() }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const responseController = require('../controllers/response.controller');
      await responseController.submitResponse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      // Test false content (boolean falsy)
      const mockReq2 = {
        params: { id: testSurvey._id.toString() },
        body: { content: false },
        user: { id: user._id.toString() }
      };

      const mockRes2 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.submitResponse(mockReq2, mockRes2);

      expect(mockRes2.status).toHaveBeenCalledWith(400);

      // Test 0 content (number falsy)
      const mockReq3 = {
        params: { id: testSurvey._id.toString() },
        body: { content: 0 },
        user: { id: user._id.toString() }
      };

      const mockRes3 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.submitResponse(mockReq3, mockRes3);

      expect(mockRes3.status).toHaveBeenCalledWith(400);
    });

    it('should test uncovered branches in conditional statements', async () => {
      // Test line 27 - case where expiryDate exists but is in the future
      const futureSurvey = await createTestSurvey(creator, {
        expiryDate: new Date(Date.now() + 86400000) // One day in the future
      });

      const response1 = await request(app)
        .post(`/surveys/${futureSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Test with future expiry' });
      
      expect(response1.status).toBe(201); // Should succeed because date is in future

      // Test line 32 - case where maxResponses exists but there's still room  
      const limitedSurvey = await createTestSurvey(creator, {
        maxResponses: 3
      });

      // First response - should succeed
      const response2 = await request(app)
        .post(`/surveys/${limitedSurvey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'First response under limit' });
      
      expect(response2.status).toBe(201);
    });

    it('should test error handling paths for improved coverage', async () => {
      // Test different validation error cases using controller directly to avoid rate limiting
      const responseController = require('../controllers/response.controller');
      
      // Test with content that is a number (not string)
      const mockReq1 = {
        params: { id: testSurvey._id.toString() },
        body: { content: 123 },
        user: { id: user._id.toString() }
      };

      const mockRes1 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.submitResponse(mockReq1, mockRes1);
      expect(mockRes1.status).toHaveBeenCalledWith(400);

      // Test with content that is an object (not string)
      const mockReq2 = {
        params: { id: testSurvey._id.toString() },
        body: { content: { text: 'object content' } },
        user: { id: user._id.toString() }
      };

      const mockRes2 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.submitResponse(mockReq2, mockRes2);
      expect(mockRes2.status).toHaveBeenCalledWith(400);

      // Test with content that is an array (not string)
      const mockReq3 = {
        params: { id: testSurvey._id.toString() },
        body: { content: ['array', 'content'] },
        user: { id: user._id.toString() }
      };

      const mockRes3 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.submitResponse(mockReq3, mockRes3);
      expect(mockRes3.status).toHaveBeenCalledWith(400);
    });

    it('should test survey active/inactive branches', async () => {
      // Create inactive survey and test with controller directly
      const inactiveSurvey = await createTestSurvey(creator, {
        isActive: false
      });

      const responseController = require('../controllers/response.controller');
      const mockReq = {
        params: { id: inactiveSurvey._id.toString() },
        body: { content: 'Test with inactive survey' },
        user: { id: user._id.toString() }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.submitResponse(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: { message: 'Survey is not active' } });
    });

    it('should test additional conditional branches for coverage', async () => {
      // Test case where survey exists, is active, not expired, under limit, but user already responded
      // Use controller directly to avoid rate limiting
      const responseController = require('../controllers/response.controller');
      const testUser2 = await createTestUser({ username: 'testuser2', email: 'testuser2@example.com' });

      // Submit first response using controller
      const mockReq1 = {
        params: { id: testSurvey._id.toString() },
        body: { content: 'First response by user2' },
        user: { id: testUser2._id.toString() }
      };

      const mockRes1 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.submitResponse(mockReq1, mockRes1);
      expect(mockRes1.status).toHaveBeenCalledWith(201);

      // Try to submit second response by same user - should fail
      const mockReq2 = {
        params: { id: testSurvey._id.toString() },
        body: { content: 'Second response by same user' },
        user: { id: testUser2._id.toString() }
      };

      const mockRes2 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.submitResponse(mockReq2, mockRes2);
      expect(mockRes2.status).toHaveBeenCalledWith(400);
      expect(mockRes2.json).toHaveBeenCalledWith({ 
        error: { 
          code: 'RESPONSE_ALREADY_EXISTS',
          message: 'You have already submitted a response to this survey' 
        } 
      });
    });

    it('should test specific uncovered lines for maximum coverage', async () => {
      // Test updateResponse and deleteResponse with controller directly
      const responseController = require('../controllers/response.controller');
      const updateTestSurvey = await createTestSurvey(creator);
      
      // Submit a response first using controller
      const submitReq = {
        params: { id: updateTestSurvey._id.toString() },
        body: { content: 'Original content for update test' },
        user: { id: user._id.toString() }
      };

      const submitRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.submitResponse(submitReq, submitRes);
      const responseId = submitRes.json.mock.calls[0][0]._id;

      // Test successful update (should hit line 132, 137)
      const updateReq = {
        params: { 
          id: updateTestSurvey._id.toString(),
          responseId: responseId
        },
        body: { content: 'Updated content' },
        user: { id: user._id.toString() }
      };

      const updateRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.updateResponse(updateReq, updateRes);
      expect(updateRes.json).toHaveBeenCalled();

      // Test deleteResponse success path (should hit line 169, 171)
      const deleteReq = {
        params: { 
          id: updateTestSurvey._id.toString(),
          responseId: responseId
        },
        user: { id: user._id.toString() }
      };

      const deleteRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await responseController.deleteResponse(deleteReq, deleteRes);
      expect(deleteRes.json).toHaveBeenCalledWith({ message: 'Response deleted successfully' });
    });
  });
}); 