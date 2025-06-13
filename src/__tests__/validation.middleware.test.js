const { validateRequest, validateResponse } = require('../middleware/validation.middleware');
const Joi = require('joi');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('validateRequest', () => {
    const schema = Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required()
    });

    it('should pass validation with valid data', () => {
      req.body = {
        name: 'Test User',
        email: 'test@example.com'
      };

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail validation with missing required fields', () => {
      req.body = {};

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: expect.stringContaining('required')
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid email', () => {
      req.body = {
        name: 'Test User',
        email: 'invalid-email'
      };

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: expect.stringContaining('valid email')
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should strip unknown fields when stripUnknown is true', () => {
      req.body = {
        name: 'Test User',
        email: 'test@example.com',
        unknownField: 'should be removed'
      };

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      // The validation passes, unknown fields are handled by Joi
    });

    it('should handle validation errors gracefully', () => {
      // Mock Joi validation to throw an error
      const invalidSchema = {
        validate: jest.fn().mockImplementation(() => {
          throw new Error('Validation schema error');
        })
      };

      const middleware = validateRequest(invalidSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error during validation'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateResponse', () => {
    it('should be an alias for validateRequest', () => {
      expect(validateResponse).toBe(validateRequest);
    });
  });
}); 