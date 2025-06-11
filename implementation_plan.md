# Implementation Plan – Survey Server with AI Summarization
*(OpenRouter.ai is the chosen LLM provider)*

## 1. Project Overview
A Node.js/Express REST API that lets authenticated users:
1. Create surveys with free-text responses.
2. Submit / edit / delete their own responses while a survey is open.
3. AI-summarise, AI-validate, and AI-search surveys through OpenRouter-routed LLM calls.
4. View results subject to creator-controlled visibility.

## 2. Technology Stack
• Node.js 18+ & Express 4  
• MongoDB + Mongoose 8  
• JWT (jsonwebtoken) for auth  
• Joi for validation  
• Winston & Morgan for logging  
• OpenRouter.ai (free models) for LLM calls  
• Jest + Supertest + mongodb-memory-server for tests  
• Swagger (swagger-jsdoc + swagger-ui-express) for API docs  

## 3. Environment & Configuration
consider the `.env` (dev) and `.env.test` (test) from `.env.example` already created. 

| Variable | Purpose |
|----------|---------|
| PORT | HTTP port (default 3000) |
| MONGO_URI | Mongo connection string |
| JWT_SECRET / JWT_EXPIRES_IN | Auth |
| REGISTRATION_SECRET | Mandatory registration code |
| OPENROUTER_API_KEY | Key for OpenRouter.ai |
| USE_MOCK_LLM | `true` in tests to bypass real calls |

## 4. Directory Layout
```
ex4-ai-course/
├── src/
│   ├── app.js
│   ├── config/           # db & logger config
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── prompts/          # *.txt already present
│   ├── routes/
│   ├── services/
│   └── tests/            # unit + integration
├── prompts/              # search/validate/summary prompts (copied on build)
└── implementation_plan.md
```

## 5. Data Models (Mongoose)
### User
```js
{ username, email, passwordHash, createdAt }
```
### Survey
```js
{
  title, area,
  guidelines: {
    question, permittedDomains, permittedResponses, summaryInstructions
  },
  creator, expiryDate, isActive,
  responses: [{ user, content, createdAt, updatedAt }],
  summary: { content, isVisible, generatedAt },
  timestamps
}
```

## 6. Authentication Flow
1. `POST /auth/register` – Joi validate, verify `REGISTRATION_SECRET`, hash password (bcryptjs).  
2. `POST /auth/login` – verify email + password → issue JWT `{ userId, username }`.  
3. `authMiddleware` – verifies `Authorization: Bearer <token>` on protected routes.

## 7. Services
### 7.1 LLMService (OpenRouter)
```js
class LlmService {
  constructor() {
    this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.headers = {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    };
  }

  async chat(messages, model = 'openai/gpt-3.5-turbo') {
    const body = { model, messages, temperature: 0.2 };
    const res = await fetch(this.baseUrl, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`LLM error ${res.status}`);
    const { choices } = await res.json();
    return choices[0]?.message?.content?.trim();
  }
}
module.exports = process.env.USE_MOCK_LLM === 'true'
  ? require('../__mocks__/llmService')    // static fake
  : new LlmService();
```

### 7.2 SurveyService
• createSurvey, closeSurvey, addResponse, updateResponse, removeResponse  
• summariseSurvey (calls LlmService with `summaryPrompt.txt`)  
• validateResponses (calls LlmService with `validatePrompt.txt`)  
• searchSurveys (calls LlmService with `searchPrompt.txt`)  

## 8. Controllers / Routes
| HTTP Verb & Path | Controller Method | Auth | Notes |
|------------------|-------------------|------|-------|
| POST /surveys | createSurvey | ✅ | creator = req.user.id |
| PATCH /surveys/:id/close | closeSurvey | ✅ | creator only |
| POST /surveys/:id/responses | addResponse | ✅ | open survey |
| PATCH /surveys/:id/responses | updateOwn | ✅ | owner only |
| DELETE /surveys/:id/responses | deleteOwn | ✅ | owner only |
| POST /surveys/:id/summarise | summariseSurvey | ✅ creator |
| POST /surveys/:id/validate | validateResponses | ✅ creator |
| POST /search | searchSurveys | ✅ | natural-language search |

Swagger documentation in `src/routes/swagger.js`.

## 9. Validation (Joi)
Central schemas in `src/middleware/validators/` for:
• registration • login • survey creation • response submission • patch actions.  
Return `{ error: { code: 400, message } }` on failure.

## 10. Middleware
* `authMiddleware` – JWT verification  
* `errorHandler` – converts thrown errors → JSON `{ error: { code, message } }`  
* `requestLogger` – morgan

## 11. Logging
`winston` transports: console (dev), combined & error files (prod).  
Log unhandled rejections and LLMService errors.

## 12. Testing Strategy
1. Unit tests for:  
   • SurveyService business logic  
   • LlmService mock behaviour  
2. Integration tests (Supertest) for every route with in-memory Mongo.  
3. Coverage target ≥ 70 %.  
4. `__mocks__/llmService.js` returns deterministic fake data.  

## 13. Deployment / Operations
* Dockerfile (optional) → multi-stage build.  
* Health-check route `/health`.  
* CI (GitHub Actions) – run `npm test` & fail on < 70 % coverage.  

## 14. Implementation Timeline
| Day | Task |
|----:|------|
| 1 | Finalise models, env, logger, DB config |
| 2 | Auth routes + middleware |
| 3 | Survey CRUD routes + controllers |
| 4 | Response management routes |
| 5 | LlmService integration (OpenRouter) + prompts |
| 6 | AI endpoints (search, summarise, validate) |
| 7 | Swagger docs + full test suite |
| 8 | Code freeze, README, design.md, reflection.md |
| 9 | Buffer / GUI bonus if time |

---

*This plan satisfies every item in the exercise specification and explicitly integrates OpenRouter.ai for all LLM functionality.* 