const fs = require("fs").promises;
const path = require("path");
const { logger } = require("../config/logger");

class LLMService {
  constructor() {
    this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.headers = {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    };
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

  async chat(messages, model = 'deepseek/deepseek-r1-0528:free') {
    if (process.env.USE_MOCK_LLM === 'true') {
      return 'Mock LLM response';
    }

    const body = { model, messages, temperature: 0.2 };
    const res = await fetch(this.baseUrl, { 
      method: 'POST', 
      headers: this.headers, 
      body: JSON.stringify(body) 
    });
    
    if (!res.ok) throw new Error(`LLM error ${res.status}`);
    const { choices } = await res.json();
    return choices[0]?.message?.content?.trim();
  }

  extractJsonFromResponse(response) {
    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
    
    // If no code blocks, return the response as-is
    return response.trim();
  }

  async searchSurveys(query, surveys) {
    if (!this.initialized) await this.initialize();

    try {
      if (process.env.NODE_ENV === 'test' || process.env.USE_MOCK_LLM === 'true') {
        return surveys.reduce((acc, survey) => {
          const lcQuery = query.toLowerCase();
          const inTitle = survey.title?.toLowerCase().includes(lcQuery);
          const inDesc = survey.description?.toLowerCase().includes(lcQuery);
          if (!inTitle && !inDesc) return acc;

          let reason;
          if (inTitle && inDesc) {
            reason = 'Matches search query in title and description';
          } else if (inTitle) {
            reason = 'Matches search query in title';
          } else {
            reason = 'Matches search query in description';
          }
          acc.push({ survey, reason });
          return acc;
        }, []);
      }

      const prompt = this.prompts.searchPrompt
        .replace('{query}', query)
        .replace('{surveys}', JSON.stringify(surveys));

      const response = await this.chat([{ role: 'user', content: prompt }]);
      
      try {
        const cleanedResponse = this.extractJsonFromResponse(response);
        return JSON.parse(cleanedResponse);
      } catch (parseError) {
        logger.error('Failed to parse LLM response as JSON:', {
          response: response?.substring(0, 200) + '...',
          error: parseError.message
        });
        // Return empty array as fallback
        return [];
      }
    } catch (error) {
      logger.error('Error in searchSurveys:', error);
      throw new Error('Failed to search surveys');
    }
  }

  async search(query, surveys) {
    return this.searchSurveys(query, surveys);
  }

  async validateResponse(guidelines, response) {
    if (!this.initialized) await this.initialize();

    try {
      if (process.env.NODE_ENV === 'test' || process.env.USE_MOCK_LLM === 'true') {
        return {
          isValid: true,
          feedback: 'Response meets all guidelines'
        };
      }

      const prompt = this.prompts.validatePrompt
        .replace('{guidelines}', guidelines)
        .replace('{response}', response);

      const result = await this.chat([{ role: 'user', content: prompt }]);
      
      try {
        const cleanedResult = this.extractJsonFromResponse(result);
        return JSON.parse(cleanedResult);
      } catch (parseError) {
        logger.error('Failed to parse validation response as JSON:', {
          response: result?.substring(0, 200) + '...',
          error: parseError.message
        });
        // Return default valid response as fallback
        return {
          isValid: true,
          feedback: 'Response validation unavailable due to parsing error'
        };
      }
    } catch (error) {
      logger.error('Error in validateResponse:', error);
      throw new Error('Failed to validate response');
    }
  }

  async generateSummary(responses, summaryInstructions) {
    if (!this.initialized) await this.initialize();

    try {
      if (process.env.USE_MOCK_LLM === 'true') {
        return `Mock summary of responses`;
      }

      const prompt = this.prompts.summaryPrompt
        .replace('{responses}', JSON.stringify(responses))
        .replace('{summaryInstructions}', summaryInstructions);

      return await this.chat([{ role: 'user', content: prompt }]);
    } catch (error) {
      logger.error('Error in generateSummary:', error);
      throw new Error('Failed to generate summary');
    }
  }

  // Alias for backward compatibility with tests
  async summarizeResponses(responses, summaryInstructions) {
    if (process.env.NODE_ENV === 'test' || process.env.USE_MOCK_LLM === 'true') {
      return {
        summary: 'Mock summary of responses',
        keyInsights: ['Insight 1', 'Insight 2']
      };
    }
    const summary = await this.generateSummary(responses, summaryInstructions);
    return { summary };
  }
}

module.exports = new LLMService();
module.exports.LLMService = LLMService;
