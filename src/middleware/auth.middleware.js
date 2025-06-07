const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { logger } = require("../config/logger");

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({
        error: {
          code: "AUTH_TOKEN_MISSING",
          message: "Authentication token is required",
        },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        error: {
          code: "AUTH_TOKEN_MISSING",
          message: "Authentication token is required",
        },
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        });
      }

      // Check if token is about to expire (within 5 minutes)
      const tokenExp = decoded.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      if (tokenExp - now < 300000) { // 5 minutes in milliseconds
        // Generate new token
        const newToken = jwt.sign(
          { userId: user._id.toString(), username: user.username },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );
        res.setHeader("X-New-Token", newToken);
      }

      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          error: {
            code: "TOKEN_EXPIRED",
            message: "Authentication token has expired",
          },
        });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          error: {
            code: "INVALID_TOKEN",
            message: "Invalid authentication token",
          },
        });
      }
      throw error;
    }
  } catch (error) {
    logger.error("Authentication error:", error);
    res.status(401).json({
      error: {
        code: "AUTH_ERROR",
        message: "Authentication failed",
      },
    });
  }
};

const isCreator = async (req, res, next) => {
  try {
    const survey = await req.survey;
    if (!survey) {
      return res.status(404).json({
        error: {
          code: "SURVEY_NOT_FOUND",
          message: "Survey not found",
        },
      });
    }

    if (survey.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: {
          code: "NOT_CREATOR",
          message: "Only the survey creator can perform this action",
        },
      });
    }

    next();
  } catch (error) {
    logger.error("Creator verification error:", error);
    res.status(500).json({
      error: {
        code: "SERVER_ERROR",
        message: "Error verifying survey creator",
      },
    });
  }
};

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: error.details[0].message,
        },
      });
    }
    next();
  };
};

module.exports = {
  auth,
  isCreator,
  validateRequest,
};
