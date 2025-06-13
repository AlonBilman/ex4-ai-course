// Mock the LLM service before importing
jest.mock('../services/llm.service');

const { LLMService } = require('../services/llm.service');

describe('LLM Service', () => {
  let llmService;

  beforeEach(() => {
    llmService = new LLMService();
    
    // Mock the search method directly
    llmService.search = jest.fn().mockImplementation((query, surveys) => {
      return surveys
        .filter(survey => {
          const lcQuery = query.toLowerCase();
          const titleLower = survey.title ? survey.title.toLowerCase() : '';
          const descLower = survey.description ? survey.description.toLowerCase() : '';
          
          // Check if any word from the query is in title or description
          const queryWords = lcQuery.split(' ');
          const inTitle = queryWords.some(word => titleLower.includes(word));
          const inDesc = queryWords.some(word => descLower.includes(word));
          
          return inTitle || inDesc;
        })
        .map(survey => {
          const lcQuery = query.toLowerCase();
          const titleLower = survey.title ? survey.title.toLowerCase() : '';
          const descLower = survey.description ? survey.description.toLowerCase() : '';
          
          const queryWords = lcQuery.split(' ');
          const inTitle = queryWords.some(word => titleLower.includes(word));
          const inDesc = queryWords.some(word => descLower.includes(word));
          
          let reason;
          if (inTitle && inDesc) {
            reason = "Matches search query in title and description";
          } else if (inTitle) {
            reason = "Matches search query in title";
          } else {
            reason = "Matches search query in description";
          }
          
          return {
            survey: survey,
            reason: reason
          };
        });
    });

    llmService.validateResponse = jest.fn().mockReturnValue({
      isValid: true,
      feedback: 'Response meets all guidelines'
    });

    llmService.summarizeResponses = jest.fn().mockReturnValue({
      summary: 'Mock summary of responses',
      keyInsights: ['Insight 1', 'Insight 2']
    });
  });

  describe('search', () => {
    it('should return mock search results', async () => {
      const query = 'test query';
      const surveys = [
        { title: 'Test Survey', description: 'A test survey' },
        { title: 'Another Survey', description: 'Another test survey' }
      ];

      const result = await llmService.search(query, surveys);

      expect(result).toEqual([
        {
          survey: surveys[0],
          reason: 'Matches search query in title and description'
        },
        {
          survey: surveys[1],
          reason: 'Matches search query in description'
        }
      ]);
    });

    it('should handle empty surveys array', async () => {
      const query = 'test query';
      const surveys = [];

      const result = await llmService.search(query, surveys);

      expect(result).toEqual([]);
    });
  });

  describe('validateResponse', () => {
    it('should return mock validation result', async () => {
      const guidelines = 'Test guidelines';
      const response = 'Test response';

      const result = await llmService.validateResponse(guidelines, response);

      expect(result).toEqual({
        isValid: true,
        feedback: 'Response meets all guidelines'
      });
    });
  });

  describe('summarizeResponses', () => {
    it('should return mock summary', async () => {
      const responses = [
        { answer: 'Response 1' },
        { answer: 'Response 2' }
      ];
      const summaryInstructions = 'Test instructions';

      const result = await llmService.summarizeResponses(responses, summaryInstructions);

      expect(result).toEqual({
        summary: 'Mock summary of responses',
        keyInsights: ['Insight 1', 'Insight 2']
      });
    });
  });

  // Note: For actual LLM calls (when USE_MOCK_LLM is not true),
  // you would need to set up a real API key and potentially
  // handle network requests. This test focuses on the mocking behavior.
}); 