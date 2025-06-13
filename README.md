# Survey Server with AI Summarization

A RESTful API server that enables users to create, participate in, and manage surveys with AI-powered summarization capabilities.

## Submitted by

- **Adi Karif:** 208295576
- **Yakir Twil:** 313528168
- **Alon Bilman:** 211684535
- **Ahmad Danaf:** 211787833

## Features

- JWT-based authentication system
- Survey creation and management
- Response collection and validation
- AI-powered survey search
- Response validation using LLM
- Survey summarization with key insights
- Role-based access control
- Comprehensive logging and monitoring

## Tech Stack

- Node.js & Express
- MongoDB & Mongoose
- JWT for authentication
- Joi for validation
- Winston & Morgan for logging
- Jest & Chai for testing
- LLM integration for AI features

## Prerequisites

- Node.js >= 18.0.0
- MongoDB
- LLM API access

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd survey-server
```

2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration (see Required Environment Variables section below)

## Required Environment Variables

Create a `.env` file with the following variables:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/survey-server

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here
REGISTRATION_SECRET=your_registration_secret_code_here

# LLM Configuration (OpenRouter API)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development

# Logging
LOG_LEVEL=info

# Testing/Development Configuration
USE_MOCK_LLM=false
```

**Variable Descriptions:**
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token signing (use a strong, random string)
- `REGISTRATION_SECRET`: Secret code required for user registration
- `OPENROUTER_API_KEY`: Your OpenRouter.ai API key for LLM features
- `PORT`: Server port (defaults to 3000)
- `NODE_ENV`: Environment mode (development/production/test)
- `LOG_LEVEL`: Logging level (error/warn/info/debug)
- `USE_MOCK_LLM`: Set to `true` to use mock LLM responses instead of real API calls

## Running the Application

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## Testing

Run tests (includes coverage by default):

```bash
npm test
```

Tests automatically use mock LLM responses and in-memory MongoDB for fast, reliable testing.

## How to Verify Mock/Test Mode

### Test Mode (Automatic in Tests)
When running `npm test`, the application automatically:
- Sets `NODE_ENV=test` 
- Sets `USE_MOCK_LLM=true`
- Uses in-memory MongoDB
- Uses mock LLM responses

### Development Mock Mode
To use mock LLM responses during development (without using real API credits):

1. Set `USE_MOCK_LLM=true` in your `.env` file
2. Start the server with `npm run dev`
3. Verify mock mode is active by checking:
   - AI search returns simple text matching instead of LLM results
   - Response validation always returns "valid"
   - Summary generation returns "Mock summary of responses"

### Production Mode
For production with real LLM API calls:
- Set `USE_MOCK_LLM=false` or remove this variable
- Ensure `OPENROUTER_API_KEY` is properly configured
- Set `NODE_ENV=production`

## API Documentation

### Authentication

- POST /auth/register - Register a new user
- POST /auth/login - Login and get JWT token

### Surveys

- POST /surveys - Create a new survey
- GET /surveys - List all surveys
- GET /surveys/:id - Get survey details
- PATCH /surveys/:id - Update survey
- DELETE /surveys/:id - Delete survey

### Responses

- POST /surveys/:id/responses - Submit a response
- PATCH /surveys/:id/responses/:responseId - Update a response
- DELETE /surveys/:id/responses/:responseId - Delete a response

### AI Operations

- POST /surveys/search - Search surveys using natural language
- POST /surveys/:id/validate - Validate a response
- POST /surveys/:id/summarize - Generate survey summary
- PATCH /surveys/:id/summary/visibility - Toggle summary visibility

## Project Structure

```
project-root/
├── src/
│   ├── controllers/    # Request handlers
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   ├── middleware/    # Custom middleware
│   ├── utils/         # Helper functions
│   └── config/        # Configuration
├── tests/             # Test files
├── prompts/           # LLM prompts
└── docs/             # Documentation
```

## Error Handling

All API responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Input validation with Joi
- Rate limiting
- CORS configuration
- Environment variable protection

## Logging

- Winston for structured logging
- Morgan for HTTP request logging
- Log files in `logs/` directory

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
