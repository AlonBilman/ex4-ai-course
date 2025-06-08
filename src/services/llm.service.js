const fs = require("fs").promises;
const path = require("path");
const { logger } = require("../config/logger");

class LLMService {
  constructor() {
    this.prompts = {};
    this.initialized = false;
  }

  async initialize() {
    try {
      const promptsDir = path.join(__dirname, '../prompts');
      const promptFiles = ['searchPrompt.txt', 'validatePrompt.txt', 'summaryPrompt.txt'];

      for (const file of promptFiles) {
        const content = await fs.readFile(path.join(promptsDir, file), 'utf8');
        this.prompts[file.replace('.txt', '')] = content;
      }

      this.initialized = true;
      logger.info('LLM service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize LLM service:', error);
      throw new Error('Failed to initialize LLM service');
    }
  }

  async searchSurveys(query, surveys) {
    if (!this.initialized) await this.initialize();

    try {
      const prompt = this.prompts.searchPrompt
        .replace('{query}', query)
        .replace('{surveys}', JSON.stringify(surveys));

      // TODO: Replace with actual LLM API call
      const mockResponse = {
        matches: surveys
          .filter(survey => 
            survey.title.toLowerCase().includes(query.toLowerCase()) ||
            survey.description.toLowerCase().includes(query.toLowerCase())
          )
          .map(survey => ({
            id: survey._id.toString(),
            reason: `Matches query "${query}" in title or description`
          }))
      };

      return mockResponse.matches;
    } catch (error) {
      logger.error('Error in searchSurveys:', error);
      throw new Error('Failed to search surveys');
    }
  }

  async validateResponse(guidelines, response) {
    if (!this.initialized) await this.initialize();

    try {
      const prompt = this.prompts.validatePrompt
        .replace('{guidelines}', guidelines)
        .replace('{response}', response);

      // TODO: Replace with actual LLM API call
      const mockResponse = {
        isValid: response.length >= 10 && response.length <= 2000,
        reason: response.length < 10 
          ? 'Response is too short' 
          : response.length > 2000 
            ? 'Response is too long' 
            : 'Response meets guidelines'
      };

      return mockResponse;
    } catch (error) {
      logger.error('Error in validateResponse:', error);
      throw new Error('Failed to validate response');
    }
  }

  async generateSummary(responses, summaryInstructions) {
    if (!this.initialized) await this.initialize();

    try {
      const prompt = this.prompts.summaryPrompt
        .replace('{responses}', JSON.stringify(responses))
        .replace('{summaryInstructions}', summaryInstructions);

      // TODO: Replace with actual LLM API call
      const mockResponse = {
        summary: `Summary of ${responses.length} responses:\n` +
          responses.map(r => `- ${r.content.substring(0, 50)}...`).join('\n')
      };

      return mockResponse.summary;
    } catch (error) {
      logger.error('Error in generateSummary:', error);
      throw new Error('Failed to generate summary');
    }
  }
}

module.exports = new LLMService();
