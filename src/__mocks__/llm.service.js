class MockLLMService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
  }

  async search(query, surveys) {
    // Return surveys in the expected format with survey objects and reasons
    return surveys
      .filter(survey => {
        const lcQuery = query.toLowerCase();
        const inTitle = survey.title && survey.title.toLowerCase().includes(lcQuery);
        const inDesc = survey.description && survey.description.toLowerCase().includes(lcQuery);
        return inTitle || inDesc;
      })
      .map(survey => {
        const lcQuery = query.toLowerCase();
        const inTitle = survey.title && survey.title.toLowerCase().includes(lcQuery);
        const inDesc = survey.description && survey.description.toLowerCase().includes(lcQuery);
        
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
  }

  async searchSurveys(query, surveys) {
    return surveys
      .filter(survey => 
        survey.title.toLowerCase().includes(query.toLowerCase()) ||
        survey.description.toLowerCase().includes(query.toLowerCase())
      )
      .map(survey => ({
        id: survey._id.toString(),
        reason: `Mock match for query "${query}"`
      }));
  }

  async validateResponse(guidelines, response) {
    // For testing purposes, mark responses containing "invalid" as invalid
    const isInvalid = response.toLowerCase().includes('invalid');
    
    return {
      isValid: !isInvalid,
      reason: isInvalid ? 'Response contains invalid content' : 'Response meets all guidelines'
    };
  }

  async summarizeResponses(responses, summaryInstructions) {
    return {
      summary: 'Mock summary of responses',
      keyInsights: ['Insight 1', 'Insight 2']
    };
  }

  async generateSummary(responses, summaryInstructions) {
    return `Mock summary of ${responses.length} responses:\n` +
      responses.map(r => `- ${r.content ? r.content.substring(0, 50) : r.answer ? r.answer.substring(0, 50) : 'No content'}...`).join('\n');
  }
}

const mockInstance = new MockLLMService();

// Export both the instance and the class for compatibility
module.exports = mockInstance;
module.exports.LLMService = MockLLMService;
