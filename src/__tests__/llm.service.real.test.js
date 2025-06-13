const LLMService = require('../services/llm.service');

// Don't mock the service for this test
jest.unmock('../services/llm.service');

describe('LLM Service - Real Implementation', () => {
  beforeEach(() => {
    // Reset the service state
    LLMService.initialized = false;
    LLMService.prompts = {};
    // Ensure we're using the mock mode
    process.env.USE_MOCK_LLM = 'true';
  });

  describe('initialization', () => {
    it('should initialize prompts', async () => {
      await LLMService.initialize();
      expect(LLMService.initialized).toBe(true);
      expect(Object.keys(LLMService.prompts).length).toBeGreaterThan(0);
    });

    it('should handle initialization errors', async () => {
      // Mock fs.readFile to throw error
      const fs = require('fs').promises;
      const originalReadFile = fs.readFile;
      fs.readFile = jest.fn().mockRejectedValue(new Error('File not found'));

      await expect(LLMService.initialize()).rejects.toThrow('Failed to initialize LLM service');

      // Restore original
      fs.readFile = originalReadFile;
    });
  });

  describe('extractJsonFromResponse', () => {
    it('should extract JSON from markdown code blocks', () => {
      const response = '```json\n{"test": "value"}\n```';
      const result = LLMService.extractJsonFromResponse(response);
      expect(result).toBe('{"test": "value"}');
    });

    it('should extract JSON from code blocks without language', () => {
      const response = '```\n{"test": "value"}\n```';
      const result = LLMService.extractJsonFromResponse(response);
      expect(result).toBe('{"test": "value"}');
    });

    it('should return response as-is if no code blocks', () => {
      const response = '{"test": "value"}';
      const result = LLMService.extractJsonFromResponse(response);
      expect(result).toBe('{"test": "value"}');
    });
  });

  describe('chat', () => {
    it('should return mock response when USE_MOCK_LLM is true', async () => {
      process.env.USE_MOCK_LLM = 'true';
      const result = await LLMService.chat([{ role: 'user', content: 'test' }]);
      expect(result).toBe('Mock LLM response');
    });
  });

  describe('searchSurveys', () => {
    it('should search surveys with mock implementation', async () => {
      const surveys = [
        { title: 'Test Survey', description: 'Test description' },
        { title: 'Another Survey', description: 'Different content' }
      ];
      
      const result = await LLMService.searchSurveys('test', surveys);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].survey.title).toBe('Test Survey');
      expect(result[0].reason).toContain('Matches search query');
    });

    it('should handle empty surveys array', async () => {
      const result = await LLMService.searchSurveys('test', []);
      expect(result).toEqual([]);
    });

    it('should handle case insensitive search', async () => {
      const surveys = [
        { title: 'TEST Survey', description: 'description' }
      ];
      
      const result = await LLMService.searchSurveys('test', surveys);
      expect(result.length).toBe(1);
    });
  });

  describe('validateResponse', () => {
    it('should validate response with mock implementation', async () => {
      const result = await LLMService.validateResponse('guidelines', 'response');
      
      expect(result.isValid).toBe(true);
      expect(result.feedback).toBe('Response meets all guidelines');
    });
  });

  describe('generateSummary', () => {
    it('should generate summary with mock implementation', async () => {
      const responses = [{ answer: 'test response' }];
      const result = await LLMService.generateSummary(responses, 'instructions');
      
      expect(result).toBe('Mock summary of responses');
    });
  });

  describe('summarizeResponses', () => {
    it('should summarize responses with mock implementation', async () => {
      const responses = [{ answer: 'test response' }];
      const result = await LLMService.summarizeResponses(responses, 'instructions');
      
      expect(result.summary).toBe('Mock summary of responses');
      expect(result.keyInsights).toEqual(['Insight 1', 'Insight 2']);
    });
  });

  describe('search alias', () => {
    it('should work as alias for searchSurveys', async () => {
      const surveys = [{ title: 'Test', description: 'desc' }];
      const result = await LLMService.search('test', surveys);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });
}); 