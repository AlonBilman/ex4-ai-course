const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const winston = require('winston');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const authRoutes = require('./src/routes/auth.routes.js');
const surveyRoutes = require('./src/routes/survey.routes.js');
const errorHandler = require('./src/middleware/errorHandler.js');

require('dotenv').config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/auth', authRoutes);
app.use('/surveys', surveyRoutes);

// Error handler
app.use(errorHandler);

// Database connection
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.error('Could not connect to MongoDB...', err));
}

module.exports = app;
