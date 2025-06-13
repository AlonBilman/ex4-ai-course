const request = require('supertest');
const express = require('express');
const errorHandler = require('../../middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    app = null;
  });

  describe('Validation Error Handling', () => {
    it('should handle ValidationError correctly', (done) => {
      app.get('/test-validation-error', (req, res, next) => {
        const error = new Error('Field is required');
        error.name = 'ValidationError';
        next(error);
      });
      app.use(errorHandler);

      request(app)
        .get('/test-validation-error')
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).toBe('VALIDATION_ERROR');
          expect(res.body.error.message).toBe('Field is required');
        })
        .end(done);
    });
  });

  describe('JWT Error Handling', () => {
    it('should handle JsonWebTokenError correctly', (done) => {
      app.get('/test-jwt-error', (req, res, next) => {
        const error = new Error('jwt malformed');
        error.name = 'JsonWebTokenError';
        next(error);
      });
      app.use(errorHandler);

      request(app)
        .get('/test-jwt-error')
        .expect(401)
        .expect((res) => {
          expect(res.body.error.code).toBe('INVALID_TOKEN');
          expect(res.body.error.message).toBe('Invalid authentication token');
        })
        .end(done);
    });
  });

  describe('Generic Error Handling', () => {
    it('should handle generic errors with custom status and code', (done) => {
      app.get('/test-custom-error', (req, res, next) => {
        const error = new Error('Custom error message');
        error.status = 403;
        error.code = 'CUSTOM_ERROR';
        next(error);
      });
      app.use(errorHandler);

      request(app)
        .get('/test-custom-error')
        .expect(403)
        .expect((res) => {
          expect(res.body.error.code).toBe('CUSTOM_ERROR');
          expect(res.body.error.message).toBe('Custom error message');
        })
        .end(done);
    });

    it('should handle generic errors with default status and message', (done) => {
      app.get('/test-default-error', (req, res, next) => {
        const error = new Error();
        next(error);
      });
      app.use(errorHandler);

      request(app)
        .get('/test-default-error')
        .expect(500)
        .expect((res) => {
          expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
          expect(res.body.error.message).toBe('An unexpected error occurred');
        })
        .end(done);
    });

    it('should handle errors with custom message but no status', (done) => {
      app.get('/test-message-only-error', (req, res, next) => {
        const error = new Error('Something went wrong');
        next(error);
      });
      app.use(errorHandler);

      request(app)
        .get('/test-message-only-error')
        .expect(500)
        .expect((res) => {
          expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
          expect(res.body.error.message).toBe('Something went wrong');
        })
        .end(done);
    });

    it('should handle errors with custom status but no code', (done) => {
      app.get('/test-status-only-error', (req, res, next) => {
        const error = new Error('Bad request');
        error.status = 400;
        next(error);
      });
      app.use(errorHandler);

      request(app)
        .get('/test-status-only-error')
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
          expect(res.body.error.message).toBe('Bad request');
        })
        .end(done);
    });
  });

  describe('Error Stack Logging', () => {
    it('should handle errors without crashing', (done) => {
      app.get('/test-logging', (req, res, next) => {
        const error = new Error('Test error for logging');
        error.stack = 'Error: Test error for logging\n    at /test/path:1:1';
        next(error);
      });
      app.use(errorHandler);

      request(app)
        .get('/test-logging')
        .expect(500)
        .expect((res) => {
          expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
          expect(res.body.error.message).toBe('Test error for logging');
        })
        .end(done);
    });
  });
}); 