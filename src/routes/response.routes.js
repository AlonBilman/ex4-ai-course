const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { validateResponse } = require('../middleware/validation.middleware');
const { responseSchema } = require('../utils/validation.schemas');
const responseController = require('../controllers/response.controller');

// Submit a response to a survey
router.post('/:surveyId', 
  authenticate, 
  validateResponse(responseSchema), 
  responseController.submitResponse
);

// Get responses for a survey (survey creator only)
router.get('/:surveyId', 
  authenticate, 
  responseController.getSurveyResponses
);

// Get a specific response
router.get('/:surveyId/:responseId', 
  authenticate, 
  responseController.getResponse
);

// Delete a response (only allowed for the response creator or survey creator)
router.delete('/:surveyId/:responseId', 
  authenticate, 
  responseController.deleteResponse
);

module.exports = router; 