const Joi = require("joi");

const userSchema = Joi.object({
  username: Joi.string().min(3).max(50).required()
    .messages({
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 50 characters',
      'any.required': 'Username is required'
    }),
  email: Joi.string().email().required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string().min(6).required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    }),
  registrationCode: Joi.string().required()
    .messages({
      'any.required': 'Registration code is required'
    })
});

const surveySchema = Joi.object({
  title: Joi.string().min(3).max(100).required()
    .messages({
      'string.min': 'Title must be at least 3 characters long',
      'string.max': 'Title cannot exceed 100 characters',
      'any.required': 'Title is required'
    }),
  description: Joi.string().min(10).max(1000).required()
    .messages({
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 1000 characters',
      'any.required': 'Description is required'
    }),
  questions: Joi.array().items(
    Joi.object({
      text: Joi.string().required(),
      type: Joi.string().valid('text', 'multiple_choice', 'rating').required(),
      options: Joi.when('type', {
        is: 'multiple_choice',
        then: Joi.array().items(Joi.string()).min(2).required(),
        otherwise: Joi.forbidden()
      })
    })
  ).min(1).required()
    .messages({
      'array.min': 'At least one question is required',
      'any.required': 'Questions are required'
    }),
  expiryDate: Joi.date().min('now').required()
    .messages({
      'date.min': 'Expiry date must be in the future',
      'any.required': 'Expiry date is required'
    })
});

const responseSchema = Joi.object({
  surveyId: Joi.string().required()
    .messages({
      'any.required': 'Survey ID is required'
    }),
  answers: Joi.array().items(
    Joi.object({
      questionId: Joi.string().required(),
      answer: Joi.alternatives().conditional('type', {
        switch: [
          {
            is: 'text',
            then: Joi.string().min(10).max(2000).required()
          },
          {
            is: 'multiple_choice',
            then: Joi.string().required()
          },
          {
            is: 'rating',
            then: Joi.number().min(1).max(5).required()
          }
        ]
      })
    })
  ).min(1).required()
    .messages({
      'array.min': 'At least one answer is required',
      'any.required': 'Answers are required'
    })
});

module.exports = {
  userSchema,
  surveySchema,
  responseSchema
};
