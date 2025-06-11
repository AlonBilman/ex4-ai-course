const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const { validateResponse } = require('../middleware/validation.middleware');
const { responseSchema } = require('../utils/validation.schemas');
const responseController = require('../controllers/response.controller');

// Submit a response to a survey
router.post('/:surveyId', 
  auth, 
  validateResponse(responseSchema), 
  responseController.submitResponse
);

// Get responses for a survey (survey creator only)
router.get('/:surveyId', 
  auth, 
  responseController.getSurveyResponses
);

// Get a specific response
router.get('/:surveyId/:responseId', 
  auth, 
  responseController.getResponse
);

// Update a response (only allowed for the response creator)
router.put('/:surveyId/:responseId', 
  auth, 
  validateResponse(responseSchema), 
  responseController.updateResponse
);

// Delete a response (only allowed for the response creator or survey creator)
router.delete('/:surveyId/:responseId', 
  auth, 
  responseController.deleteResponse
);

module.exports = router; 