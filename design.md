# Design Document - Survey Server with AI Summarization

## Architecture Overview

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   Express API   │    │    MongoDB      │
│   (Frontend)    │◄──►│    Server       │◄──►│   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ OpenRouter.ai   │
                       │   LLM API       │
                       └─────────────────┘
```

### Directory Structure
```
src/
├── config/           # Configuration (logger, swagger, rate limiting)
├── controllers/      # Request handlers and business logic
├── middleware/       # Authentication, validation, error handling
├── models/          # Mongoose data models
├── routes/          # Express route definitions
├── services/        # External service integrations (LLM)
├── utils/           # Utility functions and validation schemas
├── prompts/         # LLM prompt templates
├── __tests__/       # Test suites
└── __mocks__/       # Mock implementations for testing
```

## Core Components

### 1. Authentication System
- **JWT-based authentication** with Bearer tokens
- **Registration gating** via mandatory `REGISTRATION_SECRET`
- **Middleware-based protection** for authenticated routes
- **Token refresh** mechanism to prevent session expiry

### 2. Data Models

#### User Model
```javascript
{
  username: String (unique),
  email: String (unique),
  passwordHash: String (bcrypt),
  role: String (enum: user/admin),
  createdAt: Date
}
```

#### Survey Model
```javascript
{
  title: String,
  area: String,
  guidelines: {
    question: String,
    permittedDomains: [String],
    permittedResponses: String,
    summaryInstructions: String
  },
  creator: ObjectId (ref: User),
  expiryDate: Date,
  isActive: Boolean,
  responses: [{
    user: ObjectId (ref: User),
    content: String,
    createdAt: Date,
    updatedAt: Date
  }],
  summary: {
    content: String,
    isVisible: Boolean,
    generatedAt: Date
  }
}
```

### 3. API Endpoints

#### Authentication Routes
- `POST /auth/register` - User registration with secret code
- `POST /auth/login` - User login and JWT issuance

#### Survey Management Routes
- `GET /surveys` - List all surveys (public)
- `POST /surveys` - Create new survey (authenticated)
- `GET /surveys/:id` - Get survey details
- `PATCH /surveys/:id` - Update survey (creator only)
- `DELETE /surveys/:id` - Delete survey (creator only)
- `POST /surveys/:id/close` - Close survey early (creator only)

#### Response Management Routes
- `POST /surveys/:id/responses` - Submit response
- `PUT /surveys/:id/responses/:responseId` - Update own response
- `DELETE /surveys/:id/responses/:responseId` - Delete own response

#### AI-Powered Routes
- `POST /surveys/search` - Natural language survey search
- `POST /surveys/:id/summary` - Generate AI summary (creator only)
- `PATCH /surveys/:id/summary/visibility` - Toggle summary visibility
- `GET /surveys/:id/responses/:responseId/validate` - Validate single response
- `GET /surveys/:id/responses/validate` - Validate all responses

### 4. LLM Integration

#### Service Architecture
- **Abstracted LLM Service** with OpenRouter.ai integration
- **Mock implementation** for testing environments
- **Prompt template system** loaded from `/prompts/` directory
- **Error handling** with fallback responses

#### AI Functions
1. **Search**: Semantic search across surveys using natural language
2. **Summarization**: Generate summaries based on survey responses
3. **Validation**: Check response adherence to survey guidelines

## Key Design Decisions

### 1. Authentication Strategy
**Decision**: JWT with registration codes
**Rationale**: 
- Stateless authentication scales better than sessions
- Registration codes provide access control without complex admin flows
- Bearer tokens work well with frontend frameworks

### 2. Database Schema Design
**Decision**: Embedded responses within survey documents
**Rationale**:
- Responses are tightly coupled to surveys
- Reduces query complexity for survey+responses operations
- MongoDB handles array operations efficiently
- Simplifies aggregation for AI summarization

### 3. LLM Service Abstraction
**Decision**: Service layer with environment-based mocking
**Rationale**:
- Enables testing without external API calls
- Centralizes LLM configuration and error handling
- Allows easy switching between LLM providers
- Reduces testing costs and flakiness

### 4. Prompt Management
**Decision**: File-based prompt templates
**Rationale**:
- Version control for prompt engineering
- Easy updates without code deployment
- Clear separation of prompts from business logic
- Template interpolation for dynamic content

### 5. Error Handling Strategy
**Decision**: Standardized error response format
**Rationale**:
- Consistent client-side error handling
- Structured logging for debugging
- Clear error codes for API consumers
- Security through controlled error exposure

### 6. Rate Limiting
**Decision**: Tiered rate limiting by endpoint type
**Rationale**:
- Prevents abuse of expensive AI operations
- Protects authentication endpoints from brute force
- Allows normal API usage while preventing spam

## Trade-offs

### 1. Embedded vs Referenced Responses
**Chosen**: Embedded responses in survey documents
**Trade-off**: 
- ✅ Simpler queries and atomic operations
- ❌ Document size limits with many responses
- ❌ Harder to query responses independently

### 2. Synchronous vs Asynchronous AI Processing
**Chosen**: Synchronous LLM calls
**Trade-off**:
- ✅ Simpler implementation and error handling
- ✅ Immediate response to users
- ❌ Potential timeouts on slow LLM responses
- ❌ Blocking request threads

### 3. JWT vs Session-based Authentication
**Chosen**: JWT tokens
**Trade-off**:
- ✅ Stateless and scalable
- ✅ Works well with SPAs and mobile apps
- ❌ Token revocation complexity
- ❌ Larger request headers

### 4. Mock vs Real LLM in Tests
**Chosen**: Comprehensive mocking in test environment
**Trade-off**:
- ✅ Fast, reliable tests
- ✅ No external dependencies in CI/CD
- ✅ Cost control
- ❌ May miss real LLM integration issues

## Security Considerations

1. **Authentication**: JWT secret rotation capability
2. **Authorization**: Role-based access with creator permissions
3. **Input Validation**: Joi schemas for all request bodies
4. **Rate Limiting**: Protection against abuse and DDoS
5. **Error Handling**: No sensitive information in error responses
6. **Environment Variables**: Secure management of API keys and secrets

## Performance Considerations

1. **Database Indexing**: Optimized queries for common access patterns
2. **Response Pagination**: Limiting large survey result sets
3. **LLM Caching**: Future consideration for repeated AI operations
4. **Rate Limiting**: Prevents system overload from expensive operations

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live survey updates
2. **Advanced Analytics**: Survey response analytics and insights
3. **Multi-language Support**: Internationalization for global usage
4. **Advanced AI Features**: Sentiment analysis, response clustering
5. **Admin Dashboard**: Survey moderation and system monitoring 