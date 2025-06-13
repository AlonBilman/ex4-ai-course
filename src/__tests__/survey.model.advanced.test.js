const mongoose = require('mongoose');
const Survey = require('../models/survey.model');
const User = require('../models/user.model');
const { createTestUser } = require('./helpers/test.helper');

describe('Survey Model - Advanced Functionality', () => {
  let creator, user1, user2;

  beforeEach(async () => {
    creator = await createTestUser({ username: 'creator', email: 'creator@example.com' });
    user1 = await createTestUser({ username: 'user1', email: 'user1@example.com' });
    user2 = await createTestUser({ username: 'user2', email: 'user2@example.com' });
  });

  describe('Survey Model Methods', () => {
    let survey;

    beforeEach(async () => {
      survey = new Survey({
        title: 'Test Survey',
        area: 'Food',
        creator: creator._id,
        expiryDate: new Date(Date.now() + 86400000), // 24 hours from now
        maxResponses: 3
      });
      await survey.save();
    });

    describe('canAcceptResponses()', () => {
      it('should return true for active, non-expired survey with available slots', () => {
        expect(survey.canAcceptResponses()).toBe(true);
      });

      it('should return false for inactive survey', () => {
        survey.isActive = false;
        expect(survey.canAcceptResponses()).toBe(false);
      });

      it('should return false for expired survey', () => {
        survey.expiryDate = new Date(Date.now() - 86400000); // 24 hours ago
        expect(survey.canAcceptResponses()).toBe(false);
      });

      it('should return false when max responses reached', () => {
        survey.responses = [
          { user: user1._id, content: 'Response 1' },
          { user: user2._id, content: 'Response 2' },
          { user: creator._id, content: 'Response 3' }
        ];
        expect(survey.canAcceptResponses()).toBe(false);
      });

      it('should return true when responses are less than max', () => {
        survey.responses = [
          { user: user1._id, content: 'Response 1' },
          { user: user2._id, content: 'Response 2' }
        ];
        expect(survey.canAcceptResponses()).toBe(true);
      });
    });

    describe('hasUserResponded()', () => {
      beforeEach(() => {
        survey.responses = [
          { user: user1._id, content: 'User 1 response' }
        ];
      });

      it('should return true if user has responded', () => {
        expect(survey.hasUserResponded(user1._id)).toBe(true);
      });

      it('should return false if user has not responded', () => {
        expect(survey.hasUserResponded(user2._id)).toBe(false);
      });

      it('should handle string user IDs', () => {
        expect(survey.hasUserResponded(user1._id.toString())).toBe(true);
        expect(survey.hasUserResponded(user2._id.toString())).toBe(false);
      });
    });

    describe('getUserResponse()', () => {
      beforeEach(() => {
        survey.responses = [
          { user: user1._id, content: 'User 1 response' },
          { user: user2._id, content: 'User 2 response' }
        ];
      });

      it('should return user response if exists', () => {
        const response = survey.getUserResponse(user1._id);
        expect(response).toBeDefined();
        expect(response.content).toBe('User 1 response');
      });

      it('should return undefined if user has not responded', () => {
        const response = survey.getUserResponse(creator._id);
        expect(response).toBeUndefined();
      });

      it('should handle string user IDs', () => {
        const response = survey.getUserResponse(user2._id.toString());
        expect(response).toBeDefined();
        expect(response.content).toBe('User 2 response');
      });
    });

    describe('updateUserResponse()', () => {
      beforeEach(() => {
        survey.responses = [
          { user: user1._id, content: 'Original response' }
        ];
      });

      it('should update existing user response and return true', () => {
        const result = survey.updateUserResponse(user1._id, 'Updated response');
        expect(result).toBe(true);
        
        const response = survey.getUserResponse(user1._id);
        expect(response.content).toBe('Updated response');
        expect(response.updatedAt).toBeInstanceOf(Date);
      });

      it('should return false if user has no existing response', () => {
        const result = survey.updateUserResponse(user2._id, 'New response');
        expect(result).toBe(false);
      });

      it('should handle string user IDs', () => {
        const result = survey.updateUserResponse(user1._id.toString(), 'Updated via string ID');
        expect(result).toBe(true);
        
        const response = survey.getUserResponse(user1._id);
        expect(response.content).toBe('Updated via string ID');
      });
    });

    describe('removeUserResponse()', () => {
      beforeEach(() => {
        survey.responses = [
          { user: user1._id, content: 'Response 1' },
          { user: user2._id, content: 'Response 2' }
        ];
      });

      it('should remove existing user response and return true', () => {
        const originalLength = survey.responses.length;
        const result = survey.removeUserResponse(user1._id);
        
        expect(result).toBe(true);
        expect(survey.responses.length).toBe(originalLength - 1);
        expect(survey.hasUserResponded(user1._id)).toBe(false);
      });

      it('should return false if user has no existing response', () => {
        const originalLength = survey.responses.length;
        const result = survey.removeUserResponse(creator._id);
        
        expect(result).toBe(false);
        expect(survey.responses.length).toBe(originalLength);
      });

      it('should handle string user IDs', () => {
        const result = survey.removeUserResponse(user2._id.toString());
        expect(result).toBe(true);
        expect(survey.hasUserResponded(user2._id)).toBe(false);
      });
    });

    describe('isExpired virtual', () => {
      it('should return false for future expiry date', () => {
        survey.expiryDate = new Date(Date.now() + 86400000); // 24 hours from now
        expect(survey.isExpired).toBe(false);
      });

      it('should return true for past expiry date', () => {
        survey.expiryDate = new Date(Date.now() - 86400000); // 24 hours ago
        expect(survey.isExpired).toBe(true);
      });

      it('should return true for current time', () => {
        survey.expiryDate = new Date(); // Now
        // Give a small buffer for execution time
        setTimeout(() => {
          expect(survey.isExpired).toBe(true);
        }, 1);
      });
    });
  });

  describe('Survey Validation', () => {
    it('should fail validation without required fields', async () => {
      const survey = new Survey({});
      
      await expect(survey.save()).rejects.toThrow();
    });

    it('should fail validation with past expiry date', async () => {
      const survey = new Survey({
        title: 'Test Survey',
        creator: creator._id,
        expiryDate: new Date(Date.now() - 86400000) // 24 hours ago
      });
      
      await expect(survey.save()).rejects.toThrow();
    });

    it('should fail validation with invalid maxResponses', async () => {
      const survey = new Survey({
        title: 'Test Survey',
        creator: creator._id,
        expiryDate: new Date(Date.now() + 86400000),
        maxResponses: 0
      });
      
      await expect(survey.save()).rejects.toThrow();
    });

    it('should pass validation with minimum required fields', async () => {
      const survey = new Survey({
        title: 'Test Survey',
        creator: creator._id,
        expiryDate: new Date(Date.now() + 86400000)
      });
      
      await expect(survey.save()).resolves.toBeDefined();
    });
  });

  describe('Question Schema Validation', () => {
    it('should validate multiple choice questions with options', async () => {
      const survey = new Survey({
        title: 'Test Survey',
        creator: creator._id,
        expiryDate: new Date(Date.now() + 86400000),
        questions: [{
          text: 'What is your favorite color?',
          type: 'multiple_choice',
          options: ['Red', 'Blue', 'Green']
        }]
      });
      
      await expect(survey.save()).resolves.toBeDefined();
    });

    it('should fail validation for multiple choice questions without options', async () => {
      const survey = new Survey({
        title: 'Test Survey',
        creator: creator._id,
        expiryDate: new Date(Date.now() + 86400000),
        questions: [{
          text: 'What is your favorite color?',
          type: 'multiple_choice',
          options: []
        }]
      });
      
      await expect(survey.save()).rejects.toThrow();
    });

    it('should validate text questions without options', async () => {
      const survey = new Survey({
        title: 'Test Survey',
        creator: creator._id,
        expiryDate: new Date(Date.now() + 86400000),
        questions: [{
          text: 'What do you think?',
          type: 'text'
        }]
      });
      
      await expect(survey.save()).resolves.toBeDefined();
    });

    it('should fail validation for questions without text', async () => {
      const survey = new Survey({
        title: 'Test Survey',
        creator: creator._id,
        expiryDate: new Date(Date.now() + 86400000),
        questions: [{
          type: 'text'
        }]
      });
      
      await expect(survey.save()).rejects.toThrow();
    });

    it('should fail validation for questions with invalid type', async () => {
      const survey = new Survey({
        title: 'Test Survey',
        creator: creator._id,
        expiryDate: new Date(Date.now() + 86400000),
        questions: [{
          text: 'Test question',
          type: 'invalid_type'
        }]
      });
      
      await expect(survey.save()).rejects.toThrow();
    });
  });

  describe('Response Schema Validation', () => {
    it('should validate responses with required fields', () => {
      const survey = new Survey({
        title: 'Test Survey',
        creator: creator._id,
        expiryDate: new Date(Date.now() + 86400000),
        responses: [{
          user: user1._id,
          content: 'Valid response'
        }]
      });
      
      expect(survey.responses[0].user).toEqual(user1._id);
      expect(survey.responses[0].content).toBe('Valid response');
    });

    it('should set default timestamps for responses', () => {
      const survey = new Survey({
        title: 'Test Survey',
        creator: creator._id,
        expiryDate: new Date(Date.now() + 86400000),
        responses: [{
          user: user1._id,
          content: 'Valid response'
        }]
      });
      
      expect(survey.responses[0].createdAt).toBeInstanceOf(Date);
      expect(survey.responses[0].updatedAt).toBeInstanceOf(Date);
    });
  });
}); 