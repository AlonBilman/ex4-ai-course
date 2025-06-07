const Response = require('../models/response.model');
const Survey = require('../models/survey.model');

// Submit a response to a survey
exports.submitResponse = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const { answers } = req.body;
    const respondent = req.user.id;

    // Basic validation (expand as needed)
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: { message: 'Answers are required' } });
    }

    const survey = await Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ error: { message: 'Survey not found' } });
    }

    // Check expiry
    if (survey.expiryDate && survey.expiryDate < new Date()) {
      return res.status(400).json({ error: { message: 'Survey has expired' } });
    }

    const response = await Response.create({
      survey: surveyId,
      respondent,
      answers
    });

    res.status(201).json({ message: 'Response submitted', response });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}; 