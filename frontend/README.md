# Survey Server - Frontend

A modern, responsive web client for the Survey Server application built with vanilla HTML, CSS, and JavaScript.

## Folder Structure

```
frontend/
├── assets/
│   ├── css/
│   │   └── style.css           # Shared styles
│   └── js/
│       ├── auth.js             # Login, register, logout
│       ├── survey.js           # View, submit, edit responses
│       ├── create-survey.js    # Create survey form logic
│       ├── search.js           # Natural language search
│       ├── summary.js          # AI summary toggle
│       ├── validate.js         # Response validation (creator only)
│       └── utils.js            # Token handling and shared logic
├── index.html                  # Entry point (redirects to login or dashboard)
├── login.html                  # Login form
├── register.html               # Register with registration code
├── create-survey.html          # Survey creation
├── dashboard.html              # List/search surveys
├── survey.html                 # View individual survey and respond
```

## How to Run

1. Start your backend server (located in `/src`) at `http://localhost:3000`
2. Serve the frontend:

   ```bash
   # Option 1: Using Python (if installed)
   cd frontend
   python -m http.server 8080

   # Option 2: Open index.html directly in your browser 
   ```

3. Open your browser at `http://localhost:8080` (or open `index.html`)
4. Register using the backend’s `registrationCode`, then log in and use the app

## Notes

- All API requests use JWT stored in `localStorage`
- Summary and validation tools are only available to the survey creator
- The frontend assumes backend behavior as described in the assignment specification
