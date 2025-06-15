# Design Document - Survey Server with AI Summarization

## Architecture Overview

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Express API   │    │    MongoDB      │
│   HTML/JS/CSS   │◄──►│    Server       │◄──►│   Database      │
│   (Static)      │    │   (src/app.js)  │    │   (Mongoose)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ OpenRouter.ai   │
                       │   LLM API       │
                       │ (or Mock LLM)   │
                       └─────────────────┘
```

## Project Structure

```
project-root/
├── src/                          # Main application code
│   ├── controllers/              # Request handlers
│   ├── models/                   # Database models (MongoDB/Mongoose)
│   ├── routes/                   # API route definitions
│   ├── services/                 # Business logic layer
│   ├── middleware/               # Custom middleware functions
│   ├── utils/                    # Helper functions and utilities
│   ├── config/                   # Configuration files
│   ├── prompts/                  # LLM prompt templates
│   ├── tests/                    # Test setup files
│   ├── __tests__/                # Unit tests
│   ├── __mocks__/                # Mock implementations
│   └── app.js                    # Main application entry point
├── frontend/                     # Frontend HTML files
│   ├── assets/                   # Shared frontend assets
│   ├── index.html                # Landing page
│   ├── login.html                # Login page
│   ├── register.html             # Registration page
│   ├── dashboard.html            # User dashboard
│   ├── create-survey.html        # Survey creation page
│   └── survey.html               # Survey participation page
├── assets/                       # Global static assets
│   ├── css/                      # Stylesheets
│   └── js/                       # JavaScript files
├── prompts/                      # Additional LLM prompts
├── logs/                         # Application log files
├── coverage/                     # Test coverage reports
├── package.json                  # Node.js dependencies and scripts
├── jest.config.js                # Jest testing configuration
├── jest.setup.js                 # Jest setup file
├── server.js                     # Alternative server entry point (references src/app.js)
├── design.md                     # Project design documentation
├── reflection.md                 # Project reflection notes
├── Survey-Server-API.postman_collection.json  # Postman API collection
└── Survey-Server-Environment.postman_environment.json  # Postman environment
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
  title: String (required),
  area: String,
  description: String,
  guidelines: {
    question: String,
    permittedDomains: [String],
    permittedResponses: String,
    summaryInstructions: String
  },
  creator: ObjectId (ref: User, required),
  expiryDate: Date (required, must be future),
  isActive: Boolean (default: true),
  maxResponses: Number (default: 100, min: 1),
  responses: [{
    user: ObjectId (ref: User),
    content: String (max: 2000 chars),
    createdAt: Date,
    updatedAt: Date
  }],
  summary: {
    content: String,
    isVisible: Boolean (default: false),
    generatedAt: Date
  },
  questions: [{
    text: String (max: 500 chars),
    type: String (enum: text/multiple_choice/rating),
    required: Boolean (default: true),
    options: [String] (for multiple_choice)
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### 3. API Endpoints

#### Authentication Routes
- `POST /auth/register` - User registration with secret code
- `POST /auth/login` - User login and JWT issuance

#### Survey Management Routes
- `GET /surveys` - List all surveys (public)
- `POST /surveys` - Create new survey (authenticated)
- `GET /surveys/:id` - Get survey details (authenticated)
- `PATCH /surveys/:id` - Update survey (creator only)
- `DELETE /surveys/:id` - Delete survey (creator only)
- `POST /surveys/:id/close` - Close survey early (creator only)

#### Response Management Routes
- `POST /surveys/:id/responses` - Submit response (authenticated)
- `GET /surveys/:id/responses` - Get all survey responses (authenticated)
- `GET /surveys/:id/responses/:responseId` - Get specific response (authenticated)
- `PUT /surveys/:id/responses/:responseId` - Update own response (authenticated)
- `DELETE /surveys/:id/responses/:responseId` - Delete own response (authenticated)

#### AI-Powered Routes
- `POST /surveys/search` - Natural language survey search (public)
- `POST /surveys/:id/summary` - Generate AI summary (creator only)
- `PATCH /surveys/:id/summary/visibility` - Toggle summary visibility (creator only)
- `GET /surveys/:id/responses/:responseId/validate` - Validate single response (creator only)
- `GET /surveys/:id/responses/validate` - Validate all responses (creator only)

### 4. LLM Integration

#### Service Architecture
- **Abstracted LLM Service** with OpenRouter.ai integration
- **Mock implementation** for testing environments (controlled by `USE_MOCK_LLM` env var)
- **Prompt template system** loaded from `/prompts/` directory
- **Error handling** with fallback responses
- **Environment-based switching** between real and mock responses

#### AI Functions
1. **Search**: Semantic search across surveys using natural language
2. **Summarization**: Generate summaries based on survey responses with custom instructions
3. **Validation**: Check response adherence to survey guidelines and permitted domains

#### Prompt Templates
Located in `/prompts/` directory:
- `searchPrompt.txt` - For natural language survey search
- `summaryPrompt.txt` - For generating survey summaries
- `validatePrompt.txt` - For validating responses against guidelines

## Key Design Decisions

### 1. Authentication Strategy
**Decision**: JWT with registration codes
**Rationale**: 
- Stateless authentication scales better than sessions
- Registration codes provide access control without complex admin flows
- Bearer tokens work well with frontend frameworks

### 2. Database Schema Design
**Decision**: Embedded responses within survey documents + separate response model
**Rationale**:
- Responses are tightly coupled to surveys
- Reduces query complexity for survey+responses operations
- MongoDB handles array operations efficiently
- Simplifies aggregation for AI summarization
- Additional response model provides flexibility for complex queries
- Schema includes validation for response length (2000 chars max)

### 3. LLM Service Abstraction
**Decision**: Service layer with environment-based mocking (`USE_MOCK_LLM` flag)
**Rationale**:
- Enables testing without external API calls
- Centralizes LLM configuration and error handling
- Allows easy switching between LLM providers
- Reduces testing costs and flakiness
- Environment variable controls real vs mock behavior
- Automatic mock mode in test environment (`NODE_ENV=test`)

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

## Additional Features

### 1. Survey Questions System
- **Flexible question types**: text, multiple_choice, rating
- **Validation**: Required questions, option validation for multiple choice
- **Character limits**: Questions max 500 chars, responses max 2000 chars

### 2. Survey Capacity Management
- **Response limits**: Configurable `maxResponses` per survey (default: 100)
- **Automatic closure**: Surveys auto-close when reaching capacity
- **Status checking**: Built-in methods to check if survey can accept responses

### 3. Enhanced Data Validation
- **User model**: Email format validation, password hashing with bcrypt
- **Survey model**: Future date validation for expiry, character limits
- **Index optimization**: Database indexes for faster queries on common patterns

## Trade-offs

### 1. Embedded vs Referenced Responses
**Chosen**: Embedded responses in survey documents + separate model
**Trade-off**: 
- ✅ Simpler queries and atomic operations
- ✅ Flexibility with separate response model
- ❌ Document size limits with many responses
- ❌ Some data duplication

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
   - Creator and creation date indexes
   - Text search indexes for survey content
   - Expiry date and status indexes
2. **Response Pagination**: Limiting large survey result sets
3. **Data Validation**: Schema-level validation prevents invalid data storage
4. **LLM Caching**: Future consideration for repeated AI operations
5. **Rate Limiting**: Prevents system overload from expensive operations
6. **Capacity Management**: `maxResponses` limits prevent document bloat

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live survey updates
2. **Advanced Analytics**: Survey response analytics and insights
3. **Multi-language Support**: Internationalization for global usage
4. **Advanced AI Features**: Sentiment analysis, response clustering
5. **Admin Dashboard**: Survey moderation and system monitoring 
