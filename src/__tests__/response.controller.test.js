const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const express = require('express');
const request = require('supertest');
const Survey = require('../models/survey.model');
const User = require('../models/user.model');
const responseRoutes = require('../routes/response.routes');

jest.setTimeout(30000);

describe('Response Controller', () => {
  let mongoServer;
  let app;
  let creator;
  let user;
  let survey;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test users
    const creatorPasswordHash = await bcrypt.hash('creator123', 10);
    const userPasswordHash = await bcrypt.hash('user123', 10);

    creator = await User.create({
      username: 'creator',
      email: 'creator@example.com',
      passwordHash: creatorPasswordHash
    });

    user = await User.create({
      username: 'user',
      email: 'user@example.com',
      passwordHash: userPasswordHash
    });

    // Create test survey
    survey = await Survey.create({
      title: 'Test Survey',
      description: 'Test Description',
      area: 'Test Area',
      question: 'Test Question?',
      creator: creator._id,
      guidelines: {
        permittedResponses: 'Test responses',
        minLength: 10,
        maxLength: 2000
      },
      expiryDate: new Date(Date.now() + 86400000)
    });

    app = express();
    app.use(express.json());
    app.use('/surveys', responseRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Survey.updateOne({ _id: survey._id }, { $set: { responses: [] } });
  });

  describe('POST /surveys/:id/responses', () => {
    it('should allow a user to submit a response to an open survey', async () => {
      const response = {
        content: 'This is a test response that meets the length requirements.'
      };

      const res = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', `Bearer ${user.token}`)
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
        .set('Authorization', `Bearer ${user.token}`)
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
        .set('Authorization', `Bearer ${user.token}`)
        .send(initialResponse);

      const responseId = submitRes.body._id;

      // Then update it
      const updatedResponse = {
        content: 'Updated test response.'
      };

      const updateRes = await request(app)
        .put(`/surveys/${survey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${user.token}`)
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
        .set('Authorization', `Bearer ${user.token}`)
        .send(response);

      const responseId = submitRes.body._id;

      // Then delete it
      const deleteRes = await request(app)
        .delete(`/surveys/${survey._id}/responses/${responseId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe('Response deleted successfully');
    });
  });
}); 