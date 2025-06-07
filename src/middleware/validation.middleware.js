const logger = require('../utils/logger');

const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const { error } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(', ');
        logger.warn('Validation error:', { error: errorMessage, body: req.body });
        return res.status(400).json({
          error: {
            message: errorMessage
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      return res.status(500).json({
        error: {
          message: 'Internal server error during validation'
        }
      });
    }
  };
};

module.exports = {
  validateRequest
}; 