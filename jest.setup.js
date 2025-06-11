// Silence logging during tests and ensure required environment variables.
const { logger } = require("./src/config/logger");

logger.silent = true;

process.env.NODE_ENV = "test";
process.env.USE_MOCK_LLM = "true";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.REGISTRATION_SECRET = process.env.REGISTRATION_SECRET || "test-registration-secret";

// Mock the LLM service to ensure tests use the mock implementation
jest.mock('./src/services/llm.service', () => {
  const MockLLMService = require('./src/__mocks__/llm.service');
  return MockLLMService;
});
