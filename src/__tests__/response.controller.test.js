const request = require('supertest');
const app = require('../../app'); // Import the main app
const Survey = require('../models/survey.model');
const User = require('../models/user.model');
const { createTestUser, createTestSurvey, generateTestToken } = require('./helpers/test.helper');

jest.setTimeout(30000);

describe('Response Controller', () => {
  let creator;
  let user;
  let survey;
  let userToken;

  beforeEach(async () => {
    creator = await createTestUser({ username: 'creator', email: 'creator@example.com' });
    user = await createTestUser({ username: 'user', email: 'user@example.com' });
    survey = await createTestSurvey(creator);
    userToken = generateTestToken(user);

    await Survey.updateOne({ _id: survey._id }, { 
      $set: { 
        responses: [],
        isActive: true,
        expiryDate: new Date(Date.now() + 86400000) // Reset expiry to future 
      } 
    });
  });

  describe('POST /surveys/:id/responses', () => {
    it('should allow a user to submit a response to an open survey', async () => {
      const response = {
        content: 'This is a test response that meets the length requirements.'
      };

      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(response);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.content).toBe(response.content);
    });

    it('should not allow submission to an expired survey', async () => {
      await Survey.updateOne(
        { _id: survey._id },
        { $set: { expiryDate: new Date(Date.now() - 86400000) } }
      );

      const response = {
        content: 'This is a test response that meets the length requirements.'
      };

      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(response);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Survey has expired');
    });
  });

  describe('PUT /surveys/:id/responses/:responseId', () => {
    it('should allow a user to update their own response', async () => {
      // First submit a response
      const initialResponse = {
        content: 'Initial test response.'
      };

      const submitRes = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(initialResponse);

      const responseId = submitRes.body._id;

      // Then update it
      const updatedResponse = {
        content: 'Updated test response.'
      };

      const updateRes = await request(app)
        .put(`/surveys/${survey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updatedResponse);

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.content).toBe(updatedResponse.content);
    });
  });

  describe('DELETE /surveys/:id/responses/:responseId', () => {
    it('should allow a user to remove their own response', async () => {
      // First submit a response
      const response = {
        content: 'Test response to be deleted.'
      };

      const submitRes = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(response);

      const responseId = submitRes.body._id;

      // Then delete it
      const deleteRes = await request(app)
        .delete(`/surveys/${survey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe('Response deleted successfully');
    });
  });
}); 