const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const { createTestUser, generateTestToken, createTestSurvey } = require('./helpers/test.helper');
const Survey = require('../models/survey.model');
const User = require('../models/user.model');

jest.setTimeout(30000);

describe('Response Controller - Comprehensive Tests', () => {
  let creator;
  let user;
  let survey;
  let creatorToken;
  let userToken;

  beforeEach(async () => {
    creator = await createTestUser({ username: 'creator', email: 'creator@example.com' });
    user = await createTestUser({ username: 'user', email: 'user@example.com' });
    creatorToken = generateTestToken(creator);
    userToken = generateTestToken(user);
    survey = await createTestSurvey(creator);
  });

  describe('POST /surveys/:surveyId/responses', () => {
    it('should submit a response successfully', async () => {
      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'This is my response to the survey'
        });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe('This is my response to the survey');
      expect(res.body.user).toBe(user._id.toString());
    });

    it('should fail with missing content', async () => {
      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Response content is required');
    });

    it('should fail with non-string content', async () => {
      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 123
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('"content" must be a string');
    });

    it('should fail for non-existent survey', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/surveys/${fakeId}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Response'
        });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe('Survey not found');
    });

    it('should fail for expired survey', async () => {
      await Survey.updateOne(
        { _id: survey._id },
        { expiryDate: new Date(Date.now() - 86400000) }
      );

      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Response'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Survey has expired');
    });

    it('should fail when user already responded', async () => {
      // Submit first response
      await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'First response'
        });

      // Try to submit second response
      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Second response'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('You have already submitted a response to this survey');
    });
  });

  describe('GET /surveys/:surveyId/responses', () => {
    beforeEach(async () => {
      // Add some responses to the survey
      survey.responses.push({
        user: user._id,
        content: 'Test response',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await survey.save();
    });

    it('should get responses for survey creator', async () => {
      const res = await request(app)
        .get(`/surveys/${survey._id}/responses`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.responses).toBeDefined();
      expect(res.body.responses.length).toBe(1);
    });

    it('should fail for non-creator', async () => {
      const res = await request(app)
        .get(`/surveys/${survey._id}/responses`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toBe('Access denied');
    });

    it('should fail for non-existent survey', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/surveys/${fakeId}/responses`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe('Survey not found');
    });
  });

  describe('GET /surveys/:surveyId/responses/:responseId', () => {
    let responseId;

    beforeEach(async () => {
      survey.responses.push({
        user: user._id,
        content: 'Test response',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await survey.save();
      responseId = survey.responses[0]._id;
    });

    it('should get response for survey creator', async () => {
      const res = await request(app)
        .get(`/surveys/${survey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.response).toBeDefined();
      expect(res.body.response.content).toBe('Test response');
    });

    it('should get response for response owner', async () => {
      const res = await request(app)
        .get(`/surveys/${survey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.response).toBeDefined();
    });

    it('should fail for unauthorized user', async () => {
      const anotherUser = await createTestUser({ username: 'another', email: 'another@example.com' });
      const anotherToken = generateTestToken(anotherUser);

      const res = await request(app)
        .get(`/surveys/${survey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${anotherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toBe('Access denied');
    });

    it('should fail for non-existent response', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/surveys/${survey._id}/responses/${fakeId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe('Response not found');
    });
  });

  describe('PUT /surveys/:surveyId/responses/:responseId', () => {
    let responseId;

    beforeEach(async () => {
      survey.responses.push({
        user: user._id,
        content: 'Original response',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await survey.save();
      responseId = survey.responses[0]._id;
    });

    it('should update response by owner', async () => {
      const res = await request(app)
        .put(`/surveys/${survey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Updated response'
        });

      expect(res.status).toBe(200);
      expect(res.body.content).toBe('Updated response');
    });

    it('should fail for non-owner', async () => {
      const res = await request(app)
        .put(`/surveys/${survey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          content: 'Updated response'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toBe('You can only update your own responses');
    });

    it('should fail for expired survey', async () => {
      await Survey.updateOne(
        { _id: survey._id },
        { expiryDate: new Date(Date.now() - 86400000) }
      );

      const res = await request(app)
        .put(`/surveys/${survey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Updated response'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Survey has expired');
    });
  });

  describe('DELETE /surveys/:surveyId/responses/:responseId', () => {
    let responseId;

    beforeEach(async () => {
      survey.responses.push({
        user: user._id,
        content: 'Response to delete',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await survey.save();
      responseId = survey.responses[0]._id;
    });

    it('should delete response by owner', async () => {
      const res = await request(app)
        .delete(`/surveys/${survey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Response deleted successfully');
    });

    it('should delete response by survey creator', async () => {
      const res = await request(app)
        .delete(`/surveys/${survey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Response deleted successfully');
    });

    it('should fail for unauthorized user', async () => {
      const anotherUser = await createTestUser({ username: 'another', email: 'another@example.com' });
      const anotherToken = generateTestToken(anotherUser);

      const res = await request(app)
        .delete(`/surveys/${survey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${anotherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toBe('You can only delete your own responses');
    });
  });
}); 