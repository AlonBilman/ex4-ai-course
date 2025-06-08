const mockLLMService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  searchSurveys: jest.fn().mockImplementation((query, surveys) => {
    return surveys
      .filter(survey => 
        survey.title.toLowerCase().includes(query.toLowerCase()) ||
        survey.description.toLowerCase().includes(query.toLowerCase())
      )
      .map(survey => ({
        id: survey._id.toString(),
        reason: `Mock match for query "${query}"`
      }));
  }),
  validateResponse: jest.fn().mockImplementation((guidelines, response) => {
    return {
      isValid: response.length >= 10 && response.length <= 2000,
      reason: response.length < 10 
        ? 'Response is too short' 
        : response.length > 2000 
          ? 'Response is too long' 
          : 'Response meets guidelines'
    };
  }),
  generateSummary: jest.fn().mockImplementation((responses, summaryInstructions) => {
    return `Mock summary of ${responses.length} responses:\n` +
      responses.map(r => `- ${r.content.substring(0, 50)}...`).join('\n');
  })
};

module.exports = mockLLMService;
