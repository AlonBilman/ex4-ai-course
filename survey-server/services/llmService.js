const axios = require('axios');

const summarizeSurvey = async (survey) => {
  const systemPrompt = `You are an assistant summarizing a survey.
Survey title: ${survey.title}
Question: ${survey.question}
Instructions: ${survey.summaryInstructions}
Return a readable summary, possibly with light humor.`;

  const userContent = survey.responses.map((r, i) => `Response ${i + 1}: ${r.content}`).join('\n');

  const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: 'openai/gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ]
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  return res.data.choices[0].message.content;
};

module.exports = {
  summarizeSurvey
};

const searchSurveys = async (query, surveys) => {
    const systemPrompt = `
  You are an AI assistant tasked with searching ALL surveys matching a natural language query.
  You will receive a JSON object with:
  - query: the search query
  - surveys: array of survey objects (each with _id, title, area, question, etc.)
  
  Return a JSON array of:
  - id: survey ID (string)
  - reason: short explanation of match
  
  Return only the JSON array.
  `;
  
    const userPrompt = JSON.stringify({ query, surveys });
  
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'openai/gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
  
    const text = res.data.choices[0].message.content;
  
    try {
      return JSON.parse(text);
    } catch (err) {
      console.error('LLM returned invalid JSON:', text);
      throw new Error('LLM failed to parse JSON');
    }
  };
  
  module.exports = {
    summarizeSurvey,
    searchSurveys
  };
  