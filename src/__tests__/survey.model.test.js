const mongoose = require('mongoose');
const Survey = require('../models/survey.model');
const User = require('../models/user.model');
const { createTestUser } = require('./helpers/test.helper');

describe('Survey Model', () => {
  let user;

  beforeEach(async () => {
    user = await createTestUser();
  });

  it('should enforce max length on question text', async () => {
    const longText = 'a'.repeat(501);
    const survey = new Survey({
      title: 'Test Survey',
      creator: user._id,
      expiryDate: new Date(Date.now() + 86400000),
      questions: [{ text: longText, type: 'text' }]
    });

    let err;
    try {
      await survey.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors['questions.0.text'].message).toBe('Question text cannot exceed 500 characters');
  });

  it('should enforce maxResponses limit', async () => {
    const survey = new Survey({
      title: 'Test Survey',
      creator: user._id,
      expiryDate: new Date(Date.now() + 86400000),
      maxResponses: 1
    });

    survey.responses.push({ user: user._id, content: 'Response 1' });
    await survey.save();

    expect(survey.canAcceptResponses()).toBe(false);
  });
}); 