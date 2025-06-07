const fs = require("fs").promises;
const path = require("path");
const logger = require("../utils/logger");

class LLMService {
  constructor() {
    this.prompts = {};
    this.initializePrompts();
  }

  async initializePrompts() {
    try {
      const promptsDir = path.join(__dirname, '..', 'prompts');
      const files = await fs.readdir(promptsDir);
      
      for (const file of files) {
        if (file.endsWith('.txt')) {
          const promptName = path.basename(file, '.txt');
          const content = await fs.readFile(path.join(promptsDir, file), 'utf8');
          this.prompts[promptName] = content;
        }
      }
      
      logger.info('LLM prompts initialized successfully');
    } catch (error) {
      logger.error('Error initializing LLM prompts:', error);
      throw error;
    }
  }

  async search(query, surveys) {
    if (process.env.USE_MOCK_LLM === 'true') {
      return surveys.map((survey, idx) => ({
        survey,
        reason: idx === 0 ? 'Matches search query in title and description' : 'Matches search query in description'
      }));
    }
    return [];
  }

  async validateResponse(guidelines, response) {
    if (process.env.USE_MOCK_LLM === 'true') {
      return {
        isValid: true,
        feedback: 'Response meets all guidelines'
      };
    }
    return { isValid: false, feedback: 'Not implemented' };
  }

  async summarizeResponses(responses, summaryInstructions) {
    if (process.env.USE_MOCK_LLM === 'true') {
      return {
        summary: 'Mock summary of responses',
        keyInsights: ['Insight 1', 'Insight 2']
      };
    }
    return { summary: '', keyInsights: [] };
  }
}

module.exports = { LLMService };
