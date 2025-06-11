require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const { logger } = require("./config/logger");
const { apiLimiter, authLimiter, surveyCreationLimiter } = require("./config/rateLimiter");
const authRoutes = require("./routes/auth.routes");
const surveyRoutes = require("./routes/survey.routes");
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Rate limiting
app.use("/auth", authLimiter);
app.use("/surveys/create", surveyCreationLimiter);
app.use("/", apiLimiter);

// Routes
app.use("/auth", authRoutes);
app.use("/surveys", surveyRoutes);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
      },
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      },
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected error occurred",
    },
  });
});

// Only connect to MongoDB if not in test mode
if (process.env.NODE_ENV !== "test") {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => logger.info("Connected to MongoDB"))
    .catch((err) => logger.error("MongoDB connection error:", err));
}

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

module.exports = app;
