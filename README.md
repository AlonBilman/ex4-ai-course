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
cd ex4-ai-course
```

2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
# Create a .env file in the project root
touch .env
```

4. Add the required environment variables to your `.env` file (see Required Environment Variables section below)

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

### Quick Start

1. **Start MongoDB** (choose one option):
   
   **Option A: Local MongoDB**
   ```bash
   # Start MongoDB service (varies by OS)
   # Windows: Start MongoDB service from Services
   # macOS: brew services start mongodb/brew/mongodb-community
   # Linux: sudo systemctl start mongod
   mongod
   ```
   
   **Option B: MongoDB Atlas (Cloud)**
   - Create a free cluster at [MongoDB Atlas](https://cloud.mongodb.com/)
   - Get your connection string and use it as `MONGODB_URI` in `.env`

2. **Create and configure `.env` file** with required variables (see section above)

3. **Start the application**:
   
   **Development mode** (with auto-restart):
   ```bash
   npm run dev
   ```
   
   **Production mode**:
   ```bash
   npm start
   ```

4. **Access the application**:
   - **API Server**: http://localhost:3000
   - **API Documentation**: http://localhost:3000/api-docs
   - **Frontend**: Open `frontend/index.html` in your browser

### Running Options

**Development Mode:**
```bash
npm run dev
```
- Uses nodemon for automatic restart on file changes
- Detailed logging enabled
- Perfect for development and testing

**Production Mode:**
```bash
npm start
```
- Starts the server with Node.js directly
- Optimized for production use
- Requires `NODE_ENV=production` in `.env`

## Testing

Run tests (includes coverage by default):

```bash
npm test
```

Tests automatically use mock LLM responses and in-memory MongoDB for fast, reliable testing.

## Troubleshooting

### Common Setup Issues

1. **MongoDB Connection Failed**:
   ```
   Error: connect ECONNREFUSED 127.0.0.1:27017
   ```
   **Solutions:**
   - Ensure MongoDB is running: `mongod` or start the MongoDB service
   - Check if the `MONGODB_URI` in `.env` is correct
   - For MongoDB Atlas: Verify connection string and IP whitelist

2. **Port Already in Use**:
   ```
   Error: listen EADDRINUSE: address already in use :::3000
   ```
   **Solutions:**
   - Change `PORT=3001` in your `.env` file
   - Kill existing process: `lsof -ti:3000 | xargs kill` (macOS/Linux) or use Task Manager (Windows)

3. **Missing Environment Variables**:
   ```
   Error: JWT_SECRET is required
   ```
   **Solution:** Ensure all required variables are in your `.env` file

4. **LLM API Errors** (when `USE_MOCK_LLM=false`):
   ```
   Error: OpenRouter API request failed
   ```
   **Solutions:**
   - Set `USE_MOCK_LLM=true` in `.env` for development
   - Verify `OPENROUTER_API_KEY` is valid for production

5. **Frontend CORS Issues**:
   - Ensure the API server is running
   - Check that frontend files reference the correct server URL
   - Open browser developer tools to see specific CORS errors

### Verification Steps

**Check if everything is working:**
1. Server starts without errors
2. Visit http://localhost:3000/api-docs to see API documentation
3. Open `frontend/index.html` in browser
4. MongoDB connection shows "Connected to MongoDB" in logs

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
