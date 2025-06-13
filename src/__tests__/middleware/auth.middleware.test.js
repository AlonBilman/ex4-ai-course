const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { auth } = require('../../middleware/auth.middleware');
const User = require('../../models/user.model');
const { createTestUser } = require('../helpers/test.helper');

// Mock User model
jest.mock('../../models/user.model');

describe('Auth Middleware', () => {
  let app;
  let testUser;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Test route that requires authentication
    app.get('/protected', auth, (req, res) => {
      res.json({ message: 'Access granted', user: req.user });
    });

    // Error handler
    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({ error: { message: err.message } });
    });

    testUser = {
      _id: '507f1f77bcf86cd799439011',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user'
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Missing Authorization Header', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const res = await request(app)
        .get('/protected');

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Authentication token is required');
    });

    it('should return 401 when authorization header is empty', async () => {
      const res = await request(app)
        .get('/protected')
        .set('Authorization', '');

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Authentication token is required');
    });
  });

  describe('Invalid Token Format', () => {
    it('should return 401 when token does not start with Bearer', async () => {
      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidToken');

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid authentication token');
    });

    it('should return 401 when Bearer token is missing', async () => {
      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer ');

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid authentication token');
    });

    it('should return 401 when Bearer token has extra spaces', async () => {
      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer  ');

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid authentication token');
    });
  });

  describe('Invalid JWT Token', () => {
    it('should return 401 when token is malformed', async () => {
      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid authentication token');
    });

    it('should return 401 when token is expired', async () => {
      const expiredToken = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      const res = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Authentication token has expired');
    });

    it('should return 401 when token has invalid signature', async () => {
      const invalidToken = jwt.sign(
        { id: testUser._id },
        'wrong-secret'
      );

      const res = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid authentication token');
    });
  });

  describe('User Not Found', () => {
    it('should allow access in test environment when user not found', async () => {
      const validToken = jwt.sign(
        { id: testUser._id, role: 'user', username: 'testuser' },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Mock User.findById to return null (simulates test environment behavior)
      User.findById.mockResolvedValue(null);

      const res = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted');
    });

    it('should handle database errors when finding user', async () => {
      const validToken = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Mock User.findById to throw an error
      User.findById.mockRejectedValue(new Error('Database connection error'));

      const res = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Authentication failed');
    });
  });

  describe('Valid Authentication', () => {
    it('should allow access with valid token and existing user', async () => {
      const validToken = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Mock User.findById to return the test user
      User.findById.mockResolvedValue(testUser);

      const res = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted');
      expect(res.body.user.username).toBe(testUser.username);
    });

    it('should handle tokens with additional user data', async () => {
      const validToken = jwt.sign(
        { 
          id: testUser._id,
          username: testUser.username,
          email: testUser.email,
          role: testUser.role
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Mock User.findById to return the test user
      User.findById.mockResolvedValue(testUser);

      const res = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted');
      expect(res.body.user.username).toBe(testUser.username);
    });

    it('should refresh token when expiring soon', async () => {
      // Create token that expires in 3 minutes (less than 5 minute threshold)
      const expiringToken = jwt.sign(
        { id: testUser._id, role: 'user' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '3m' }
      );

      // Mock User.findById to return the test user
      User.findById.mockResolvedValue(testUser);

      const res = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiringToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted');
      expect(res.headers['x-new-token']).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle token with missing user ID in test environment', async () => {
      const tokenWithoutId = jwt.sign(
        { username: 'testuser' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const res = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${tokenWithoutId}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted');
    });

    it('should handle authorization header with multiple Bearer keywords', async () => {
      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer Bearer token');

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid authentication token');
    });

    it('should handle authorization header with lowercase bearer', async () => {
      const validToken = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const res = await request(app)
        .get('/protected')
        .set('Authorization', `bearer ${validToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid authentication token');
    });
  });

  describe('isCreator Middleware', () => {
    const { isCreator } = require('../../middleware/auth.middleware');
    
    let req, res, next;
    
    beforeEach(() => {
      req = {
        user: { _id: testUser._id.toString() },
        survey: null
      };
      res = {
        status: jest.fn(() => res),
        json: jest.fn(() => res)
      };
      next = jest.fn();
    });

    it('should call next when user is creator', async () => {
      req.survey = Promise.resolve({
        creator: { toString: () => testUser._id.toString() }
      });

      await isCreator(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 404 when survey not found', async () => {
      req.survey = Promise.resolve(null);

      await isCreator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'SURVEY_NOT_FOUND',
          message: 'Survey not found'
        }
      });
    });

    it('should return 403 when user is not creator', async () => {
      req.survey = Promise.resolve({
        creator: { toString: () => 'different-user-id' }
      });

      await isCreator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'NOT_CREATOR',
          message: 'Only the survey creator can perform this action'
        }
      });
    });
  });

  describe('validateRequest Middleware', () => {
    const { validateRequest } = require('../../middleware/auth.middleware');
    const Joi = require('joi');
    
    let req, res, next;
    
    beforeEach(() => {
      req = { body: {} };
      res = {
        status: jest.fn(() => res),
        json: jest.fn(() => res)
      };
      next = jest.fn();
    });

    it('should call next when validation passes', () => {
      const schema = Joi.object({
        title: Joi.string().required()
      });
      
      req.body = { title: 'Valid Title' };
      
      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 when validation fails', () => {
      const schema = Joi.object({
        title: Joi.string().required()
      });
      
      req.body = {}; // Missing required title
      
      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('title')
        }
      });
    });
  });
}); 