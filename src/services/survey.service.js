const Survey = require('../models/survey.model');
const logger = require('../utils/logger');

class SurveyService {
  async createSurvey(surveyData, creatorId) {
    try {
      const survey = new Survey({
        ...surveyData,
        creator: creatorId
      });
      await survey.save();
      return survey;
    } catch (error) {
      logger.error('Error creating survey:', error);
      throw new Error('Failed to create survey');
    }
  }

  async getSurveyById(surveyId) {
    try {
      const survey = await Survey.findById(surveyId);
      if (!survey) {
        throw new Error('Survey not found');
      }
      return survey;
    } catch (error) {
      logger.error('Error getting survey:', error);
      throw new Error('Failed to get survey');
    }
  }

  async updateSurvey(surveyId, updateData, userId) {
    try {
      const survey = await Survey.findById(surveyId);
      if (!survey) {
        throw new Error('Survey not found');
      }

      if (survey.creator.toString() !== userId.toString()) {
        throw new Error('Not authorized to update this survey');
      }

      Object.assign(survey, updateData);
      await survey.save();
      return survey;
    } catch (error) {
      logger.error('Error updating survey:', error);
      throw error;
    }
  }

  async deleteSurvey(surveyId, userId) {
    try {
      const survey = await Survey.findById(surveyId);
      if (!survey) {
        throw new Error('Survey not found');
      }

      if (survey.creator.toString() !== userId.toString()) {
        throw new Error('Not authorized to delete this survey');
      }

      await survey.deleteOne();
    } catch (error) {
      logger.error('Error deleting survey:', error);
      throw error;
    }
  }

  async getSurveysByCreator(creatorId) {
    try {
      return await Survey.find({ creator: creatorId });
    } catch (error) {
      logger.error('Error getting surveys by creator:', error);
      throw new Error('Failed to get surveys');
    }
  }

  async getActiveSurveys() {
    try {
      return await Survey.find({
        expiryDate: { $gt: new Date() }
      });
    } catch (error) {
      logger.error('Error getting active surveys:', error);
      throw new Error('Failed to get active surveys');
    }
  }
}

module.exports = new SurveyService(); 