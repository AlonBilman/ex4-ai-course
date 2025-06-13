const surveyService = require('../services/survey.service');
const Survey = require('../models/survey.model');
const User = require('../models/user.model');
const { createTestUser } = require('./helpers/test.helper');

jest.setTimeout(30000);

describe('Survey Service', () => {
  let creator;
  let user;
  let testSurvey;

  beforeEach(async () => {
    // Create test users
    creator = await createTestUser({ username: 'creator', email: 'creator@test.com' });
    user = await createTestUser({ username: 'user', email: 'user@test.com' });

    // Create a test survey
    testSurvey = await Survey.create({
      title: 'Test Survey',
      description: 'A test survey',
      creator: creator._id,
      questions: [
        {
          text: 'Test question?',
          type: 'text',
          required: true
        }
      ],
      expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    });
  });

  describe('createSurvey', () => {
    it('should create a new survey', async () => {
      const surveyData = {
        title: 'New Survey',
        description: 'A new survey',
        questions: [
          {
            text: 'New question?',
            type: 'text',
            required: true
          }
        ],
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      const survey = await surveyService.createSurvey(surveyData, creator._id);
      expect(survey).toBeDefined();
      expect(survey.title).toBe(surveyData.title);
      expect(survey.creator.toString()).toBe(creator._id.toString());
    });
  });

  describe('getSurveyById', () => {
    it('should retrieve a survey by ID', async () => {
      const survey = await surveyService.getSurveyById(testSurvey._id);
      expect(survey).toBeDefined();
      expect(survey._id.toString()).toBe(testSurvey._id.toString());
    });
  });

  describe('updateSurvey', () => {
    it('should update a survey', async () => {
      const updateData = {
        title: 'Updated Survey',
        description: 'An updated survey'
      };

      const updatedSurvey = await surveyService.updateSurvey(
        testSurvey._id,
        updateData,
        creator._id
      );

      expect(updatedSurvey).toBeDefined();
      expect(updatedSurvey.title).toBe(updateData.title);
      expect(updatedSurvey.description).toBe(updateData.description);
    });

    it('should not update a survey if user is not creator', async () => {
      const updateData = {
        title: 'Updated Survey',
        description: 'An updated survey'
      };

      await expect(
        surveyService.updateSurvey(testSurvey._id, updateData, user._id)
      ).rejects.toThrow('Not authorized to update this survey');
    });
  });

  describe('deleteSurvey', () => {
    it('should delete a survey', async () => {
      await surveyService.deleteSurvey(testSurvey._id, creator._id);
      const deletedSurvey = await Survey.findById(testSurvey._id);
      expect(deletedSurvey).toBeNull();
    });

    it('should not delete a survey if user is not creator', async () => {
      await expect(
        surveyService.deleteSurvey(testSurvey._id, user._id)
      ).rejects.toThrow('Not authorized to delete this survey');
    });
  });
}); 