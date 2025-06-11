# Postman Collection Guide

This guide explains how to use the provided Postman collection to test the Survey Server API.

## Files Included

- `Survey-Server-API.postman_collection.json` - Complete API collection
- `Survey-Server-Environment.postman_environment.json` - Environment variables

## Setup Instructions

### 1. Import Files into Postman

1. Open Postman
2. Click "Import" button
3. Import both files:
   - `Survey-Server-API.postman_collection.json`
   - `Survey-Server-Environment.postman_environment.json`
4. Select the "Survey Server Environment" from the environment dropdown

### 2. Configure Environment Variables

Update the environment variables if needed:
- `BASE_URL` - API server URL (default: `http://localhost:3000`)
- `REGISTRATION_SECRET` - Must match your `.env` file's `REGISTRATION_SECRET`

### 3. Start the Server

Make sure your server is running:
```bash
npm start
```

## Collection Structure

The collection is organized into folders:

### 1. Authentication
- **Register User** - Creates a new user account
- **Login User** - Authenticates and saves JWT token

### 2. Survey Management
- **Get All Surveys** - Lists all surveys (public)
- **Create Survey** - Creates a new survey (requires auth)
- **Get Survey by ID** - Gets specific survey details
- **Update Survey** - Modifies survey (creator only)
- **Close Survey** - Manually closes survey (creator only)
- **Delete Survey** - Removes survey (creator only)

### 3. Response Management
- **Submit Response** - Adds response to survey
- **Update Response** - Modifies own response
- **Delete Response** - Removes own response

### 4. AI Features
- **Search Surveys** - Natural language survey search
- **Generate Survey Summary** - AI-powered summary creation
- **Toggle Summary Visibility** - Show/hide survey summary
- **Validate Single Response** - Check response compliance
- **Validate All Responses** - Bulk response validation

### 5. Example Workflows
- **Create SWOT Analysis Survey** - Business strategy example
- **Submit SWOT Response** - Example response submission

## Usage Workflow

### Quick Start (Recommended Order)

1. **Register User** - Create account with registration secret
2. **Login User** - Get JWT token (automatically saved)
3. **Create Survey** - Make a new survey (ID automatically saved)
4. **Submit Response** - Add a response (ID automatically saved)
5. **Generate Survey Summary** - Create AI summary
6. **Toggle Summary Visibility** - Make summary public
7. **Search Surveys** - Test natural language search

### Authentication Flow

1. Run "Register User" first
2. Run "Login User" to get JWT token
3. Token is automatically saved to environment
4. All subsequent requests use this token

### Testing AI Features

1. Create surveys with diverse content
2. Add multiple responses
3. Test search with different queries:
   - "playground safety"
   - "business strategy"
   - "education"
4. Generate summaries and validate responses

## Environment Variables

These variables are automatically managed:

- `JWT_TOKEN` - Set by login, used for authentication
- `SURVEY_ID` - Set when creating surveys
- `RESPONSE_ID` - Set when submitting responses
- `USER_ID` - Set during login

## Error Handling

The collection includes basic test scripts that:
- Log successful operations
- Save important IDs automatically
- Show descriptive error messages

## Advanced Usage

### Custom Surveys

Modify the survey creation requests to test different scenarios:
- Different expiry dates
- Various permitted domains
- Custom summary instructions

### Bulk Testing

Use Postman's Runner feature to:
- Create multiple surveys
- Submit multiple responses
- Test different user scenarios

### Integration Testing

Combine requests to test complete workflows:
1. User registration → Login → Survey creation → Response submission → Summary generation

## Troubleshooting

### Common Issues

1. **401 Unauthorized** - Run login request first
2. **403 Forbidden** - Check registration secret
3. **404 Not Found** - Ensure server is running on correct port
4. **Environment variables not working** - Verify environment is selected

### Debug Tips

- Check Console output for automatic variable saves
- Verify environment variables are set correctly
- Ensure server is running and accessible
- Check that `.env` file has correct `REGISTRATION_SECRET` 