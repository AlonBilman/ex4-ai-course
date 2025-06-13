const express = require('express');
const responseRoutes = require('../routes/response.routes');

describe('Response Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/responses', responseRoutes);
  });

  it('should have all required routes defined', () => {
    const routes = responseRoutes.stack.map(layer => ({
      path: layer.route?.path,
      methods: Object.keys(layer.route?.methods || {})
    }));

    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/:surveyId', methods: ['post'] }),
        expect.objectContaining({ path: '/:surveyId', methods: ['get'] }),
        expect.objectContaining({ path: '/:surveyId/:responseId', methods: ['get'] }),
        expect.objectContaining({ path: '/:surveyId/:responseId', methods: ['put'] }),
        expect.objectContaining({ path: '/:surveyId/:responseId', methods: ['delete'] })
      ])
    );
  });

  it('should export router', () => {
    expect(responseRoutes).toBeDefined();
    expect(typeof responseRoutes).toBe('function');
  });
}); 