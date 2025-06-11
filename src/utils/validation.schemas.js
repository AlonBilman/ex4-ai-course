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

const surveySchema = {
  create: Joi.object({
    title: Joi.string().required()
      .messages({
        'any.required': 'Survey title is required'
      }),
    area: Joi.string().required()
      .messages({
        'any.required': 'Survey area is required'
      }),
    guidelines: Joi.object({
      question: Joi.string().required()
        .messages({
          'any.required': 'Survey question is required'
        }),
      permittedDomains: Joi.array().items(Joi.string()).min(1).required()
        .messages({
          'array.min': 'At least one permitted domain is required',
          'any.required': 'Permitted domains are required'
        }),
      permittedResponses: Joi.string().required()
        .messages({
          'any.required': 'Response guidelines are required'
        }),
      summaryInstructions: Joi.string().required()
        .messages({
          'any.required': 'Summary instructions are required'
        })
    }).required(),
    expiryDate: Joi.date().min('now').required()
      .messages({
        'date.min': 'Expiry date must be in the future',
        'any.required': 'Expiry date is required'
      })
  }),
  update: Joi.object({
    title: Joi.string(),
    area: Joi.string(),
    guidelines: Joi.object({
      question: Joi.string(),
      permittedDomains: Joi.array().items(Joi.string()).min(1),
      permittedResponses: Joi.string(),
      summaryInstructions: Joi.string()
    }),
    expiryDate: Joi.date().min('now')
  })
};

const responseSchema = Joi.object({
  content: Joi.string().required()
    .messages({
      'any.required': 'Response content is required'
    })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required',
  }),
});

module.exports = {
  userSchema,
  loginSchema,
  surveySchema,
  responseSchema,
};
