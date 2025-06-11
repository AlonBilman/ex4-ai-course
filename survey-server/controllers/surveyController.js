const Survey = require('../models/Survey');
const Joi = require('joi');

const createSurvey = async (req, res, next) => {
  try {
    const schema = Joi.object({
      title: Joi.string().required(),
      area: Joi.string().required(),
      question: Joi.string().required(),
      permittedDomains: Joi.array().items(Joi.string()).required(),
      permittedResponses: Joi.array().items(Joi.string()).required(),
      summaryInstructions: Joi.string().allow(''),
      expiryDate: Joi.date().required()
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: { message: error.message } });

    const survey = new Survey({
      ...req.body,
      creatorId: req.user.userId
    });

    await survey.save();
    res.status(201).json(survey);
  } catch (err) {
    next(err);
  }
};

const addResponse = async (req, res, next) => {
    try {
      const schema = Joi.object({
        surveyId: Joi.string().required(),
        content: Joi.string().required()
      });
  
      const { error } = schema.validate(req.body);
      if (error) return res.status(400).json({ error: { message: error.message } });
  
      const survey = await Survey.findById(req.body.surveyId);
      if (!survey) return res.status(404).json({ error: { message: 'Survey not found' } });
  
      if (survey.closed || new Date() > new Date(survey.expiryDate))
        return res.status(403).json({ error: { message: 'Survey is closed or expired' } });
  
      // אם כבר שלח תגובה, מחק את הקודמת
      survey.responses = survey.responses.filter(r => r.userId.toString() !== req.user.userId);
  
      survey.responses.push({
        userId: req.user.userId,
        content: req.body.content
      });
  
      await survey.save();
      res.json({ message: 'Response added', surveyId: survey._id });
    } catch (err) {
      next(err);
    }
  };
  


module.exports = { createSurvey };

const { searchSurveys: llmSearch } = require('../services/llmService');
const Survey = require('../models/Survey');

const searchSurveys = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: { message: 'Missing query' } });

    const allSurveys = await Survey.find();
    const result = await llmSearch(query, allSurveys);

    res.json(result);
  } catch (err) {
    next(err);
  }
};

