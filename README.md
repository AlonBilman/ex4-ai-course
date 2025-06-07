# Survey Server with AI Summarization

A RESTful API server that enables users to create, participate in, and manage surveys with AI-powered summarization capabilities.

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
cp exampleEnv .env
```

4. Update the `.env` file with your configuration:

```
JWT_SECRET=your_jwt_secret
REGISTRATION_SECRET=your_registration_secret
MONGODB_URI=your_mongodb_uri
LLM_API_KEY=your_llm_api_key
```

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

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

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
