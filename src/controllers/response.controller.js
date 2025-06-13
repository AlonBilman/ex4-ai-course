const Survey = require('../models/survey.model');

// Submit a response to a survey
exports.submitResponse = async (req, res) => {
  try {
    const { id: surveyId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Basic validation
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: { message: 'Content is required' } });
    }

    const survey = await Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ error: { message: 'Survey not found' } });
    }

    // Check if survey is inactive
    if (!survey.isActive) {
      return res.status(400).json({ error: { message: 'Survey is not active' } });
    }

    // Check expiry
    if (survey.expiryDate && survey.expiryDate < new Date()) {
      return res.status(400).json({ error: { message: 'Survey has expired' } });
    }

    // Check if survey has reached max responses
    if (survey.maxResponses && survey.responses.length >= survey.maxResponses) {
      return res.status(400).json({ error: { message: 'Survey is not accepting new responses at this time.' } });
    }

    // Check if user already responded
    if (survey.hasUserResponded(userId)) {
      return res.status(400).json({ 
        error: { 
          code: 'RESPONSE_ALREADY_EXISTS',
          message: 'You have already submitted a response to this survey' 
        } 
      });
    }

    // Add response to survey
    const response = {
      user: userId,
      content: content,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    survey.responses.push(response);
    await survey.save();

    // Return the newly created response
    const newResponse = survey.responses[survey.responses.length - 1];
    res.status(201).json(newResponse);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

// Get responses for a survey (survey creator only)
exports.getSurveyResponses = async (req, res) => {
  try {
    const { id: surveyId } = req.params;
    const userId = req.user.id;

    const survey = await Survey.findById(surveyId).populate('responses.user', 'username email');
    if (!survey) {
      return res.status(404).json({ error: { message: 'Survey not found' } });
    }

    // Check if user is the survey creator
    if (survey.creator.toString() !== userId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    res.json({ responses: survey.responses });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

// Get a specific response
exports.getResponse = async (req, res) => {
  try {
    const { id: surveyId, responseId } = req.params;
    const userId = req.user.id;

    const survey = await Survey.findById(surveyId).populate('responses.user', 'username email');
    if (!survey) {
      return res.status(404).json({ error: { message: 'Survey not found' } });
    }

    const response = survey.responses.id(responseId);
    if (!response) {
      return res.status(404).json({ error: { message: 'Response not found' } });
    }

    // Check if user is the survey creator or the response owner
    if (survey.creator.toString() !== userId && response.user._id.toString() !== userId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

// Update a response (only allowed for the response creator)
exports.updateResponse = async (req, res) => {
  try {
    const { id: surveyId, responseId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const survey = await Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ error: { message: 'Survey not found' } });
    }

    const response = survey.responses.id(responseId);
    if (!response) {
      return res.status(404).json({ error: { message: 'Response not found' } });
    }

    // Check if user is the response owner
    if (response.user.toString() !== userId) {
      return res.status(403).json({ error: { message: 'You can only update your own responses' } });
    }

    // Check if survey is still open
    if (survey.expiryDate && survey.expiryDate < new Date()) {
      return res.status(400).json({ error: { message: 'Survey has expired' } });
    }

    // Update the response
    response.content = content;
    response.updatedAt = new Date();
    await survey.save();

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

// Delete a response (only allowed for the response creator or survey creator)
exports.deleteResponse = async (req, res) => {
  try {
    const { id: surveyId, responseId } = req.params;
    const userId = req.user.id;

    const survey = await Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ error: { message: 'Survey not found' } });
    }

    const response = survey.responses.id(responseId);
    if (!response) {
      return res.status(404).json({ error: { message: 'Response not found' } });
    }

    // Check if user is the survey creator or the response owner
    if (survey.creator.toString() !== userId && response.user.toString() !== userId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    survey.responses.pull(responseId);
    await survey.save();
    res.json({ message: 'Response deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}; 