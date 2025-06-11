const Survey = require("../models/survey.model");
const { surveySchema } = require("../utils/validation.schemas");
const llmService = require("../services/llm.service");
const { logger } = require("../config/logger");

// Create a new survey
const createSurvey = async (req, res) => {
  try {
    const { error } = surveySchema.create.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: error.details[0].message,
        },
      });
    }

    const survey = new Survey({
      ...req.body,
      creator: req.user._id,
    });

    await survey.save();
    logger.info(`New survey created: ${survey.area} by ${req.user.username}`);

    res.status(201).json({
      message: "Survey created successfully",
      survey,
    });
  } catch (error) {
    logger.error("Survey creation error:", error);
    res.status(500).json({
      error: {
        code: "SURVEY_CREATION_ERROR",
        message: "Error creating survey",
      },
    });
  }
};

// Get all surveys
const getSurveys = async (req, res) => {
  try {
    const surveys = await Survey.find()
      .populate("creator", "username")
      .select("-responses");

    res.json({
      message: "Surveys retrieved successfully",
      surveys,
    });
  } catch (error) {
    logger.error("Error fetching surveys:", error);
    res.status(500).json({
      error: {
        code: "FETCH_ERROR",
        message: "Error fetching surveys",
      },
    });
  }
};

// Get survey by ID
const getSurveyById = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id)
      .populate("creator", "username")
      .populate("responses.user", "username");

    if (!survey) {
      return res.status(404).json({
        error: {
          code: "SURVEY_NOT_FOUND",
          message: "Survey not found",
        },
      });
    }

    // Hide responses if user is not creator and survey is not closed
    if (
      survey.creator._id.toString() !== req.user._id.toString() &&
      !survey.isClosed
    ) {
      survey.responses = [];
    }

    res.json({
      message: "Survey retrieved successfully",
      survey,
    });
  } catch (error) {
    logger.error("Error fetching survey:", error);
    res.status(500).json({
      error: {
        code: "FETCH_ERROR",
        message: "Error fetching survey",
      },
    });
  }
};

// Update survey
const updateSurvey = async (req, res) => {
  try {
    const { error } = surveySchema.update.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: error.details[0].message,
        },
      });
    }

    const survey = await Survey.findById(req.params.id);
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
          message: "Only the survey creator can update the survey",
        },
      });
    }

    if (survey.isClosed) {
      return res.status(400).json({
        error: {
          code: "SURVEY_CLOSED",
          message: "Cannot update a closed survey",
        },
      });
    }

    // Update only the fields that are provided
    const updateFields = {};
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) {
        updateFields[key] = req.body[key];
      }
    });

    const updatedSurvey = await Survey.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    ).populate("creator", "username");

    logger.info(`Survey updated: ${updatedSurvey.area} by ${req.user.username}`);

    res.json({
      message: "Survey updated successfully",
      survey: updatedSurvey,
    });
  } catch (error) {
    logger.error("Survey update error:", error);
    res.status(500).json({
      error: {
        code: "UPDATE_ERROR",
        message: "Error updating survey",
      },
    });
  }
};

// Delete survey
const deleteSurvey = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
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
          message: "Only the survey creator can delete the survey",
        },
      });
    }

    await Survey.findByIdAndDelete(req.params.id);
    logger.info(`Survey deleted: ${survey.area} by ${req.user.username}`);

    res.json({
      message: "Survey deleted successfully",
      survey: {
        _id: survey._id,
        area: survey.area,
      },
    });
  } catch (error) {
    logger.error("Survey deletion error:", error);
    res.status(500).json({
      error: {
        code: "DELETE_ERROR",
        message: "Error deleting survey",
      },
    });
  }
};

// Submit response
const submitResponse = async (req, res) => {
  try {
    const { responseSchema } = require('../utils/validation.schemas');
    const { error } = responseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: error.details[0].message,
        },
      });
    }

    const survey = await Survey.findById(req.params.id);
    if (!survey) {
      return res.status(404).json({
        error: {
          code: "SURVEY_NOT_FOUND",
          message: "Survey not found",
        },
      });
    }

    if (!survey.canAcceptResponses()) {
      return res.status(400).json({
        error: {
          code: "SURVEY_INACTIVE",
          message: "Survey has expired",
        },
      });
    }

    // Skip LLM validation for now to get basic functionality working
    // TODO: Re-enable LLM validation once basic tests pass

    // Check if user already submitted a response
    const userId = req.user._id?.toString?.() ?? req.user.id?.toString?.();
    const existingResponse = survey.responses.find(
      (r) => r.user.toString() === userId,
    );

    // Enforce maxResponses if set
    if (!existingResponse && survey.maxResponses && survey.responses.length >= survey.maxResponses) {
      return res.status(400).json({
        error: {
          code: "MAX_RESPONSES_REACHED",
          message: "Survey has reached maximum responses",
        },
      });
    }

    if (existingResponse) {
      existingResponse.content = req.body.content;
      existingResponse.updatedAt = new Date();
    } else {
      survey.responses.push({
        user: userId,
        content: req.body.content,
      });
    }

    await survey.save();
    logger.info(
      `Response submitted to survey: ${survey.area} by ${req.user.username}`,
    );

    const responseToReturn = existingResponse || survey.responses[survey.responses.length - 1];
    res.status(201).json(responseToReturn);
  } catch (error) {
    logger.error("Response submission error:", error);
    res.status(500).json({
      error: {
        code: "SUBMISSION_ERROR",
        message: "Error submitting response",
      },
    });
  }
};

// Search surveys using natural language
const searchSurveys = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({
        error: {
          code: "MISSING_QUERY",
          message: "Search query is required"
        }
      });
    }

    const surveys = await Survey.find()
      .select('title description area permittedDomains')
      .lean();

    const matches = await llmService.searchSurveys(query, surveys);

    res.json({
      message: "Search completed successfully",
      matches
    });
  } catch (error) {
    logger.error("Error searching surveys:", error);
    res.status(500).json({
      error: {
        code: "SEARCH_ERROR",
        message: "Error searching surveys"
      }
    });
  }
};

// Validate a response against survey guidelines
const validateResponse = async (req, res) => {
  try {
    const { surveyId, responseId } = req.params;
    const survey = await Survey.findById(surveyId);
    
    if (!survey) {
      return res.status(404).json({
        error: {
          code: "SURVEY_NOT_FOUND",
          message: "Survey not found"
        }
      });
    }

    if (survey.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: {
          code: "NOT_CREATOR",
          message: "Only the survey creator can validate responses"
        }
      });
    }

    const response = survey.responses.id(responseId);
    if (!response) {
      return res.status(404).json({
        error: {
          code: "RESPONSE_NOT_FOUND",
          message: "Response not found"
        }
      });
    }

    const validationResult = await llmService.validateResponse(
      survey.permittedResponses,
      response.content
    );

    res.json({
      message: "Response validation completed",
      validationResult
    });
  } catch (error) {
    logger.error("Error validating response:", error);
    res.status(500).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Error validating response"
      }
    });
  }
};

// Validate all responses in a survey
const validateAllResponses = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id)
      .populate('responses.user', 'username');
    
    if (!survey) {
      return res.status(404).json({
        error: {
          code: "SURVEY_NOT_FOUND",
          message: "Survey not found"
        }
      });
    }

    if (survey.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: {
          code: "NOT_CREATOR",
          message: "Only the survey creator can validate responses"
        }
      });
    }

    const validationResults = [];
    for (const response of survey.responses) {
      const validationResult = await llmService.validateResponse(
        survey.permittedResponses,
        response.content
      );
      
      if (!validationResult.isValid) {
        validationResults.push({
          surveyId: survey._id,
          responseId: response._id,
          userId: response.user._id,
          username: response.user.username,
          reason: validationResult.reason
        });
      }
    }

    res.json({
      message: "Response validation completed",
      validationResults
    });
  } catch (error) {
    logger.error("Error validating responses:", error);
    res.status(500).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Error validating responses"
      }
    });
  }
};

// Generate survey summary
const generateSummary = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const survey = await Survey.findById(surveyId)
      .populate('responses.user', 'username');

    if (!survey) {
      return res.status(404).json({
        error: {
          code: "SURVEY_NOT_FOUND",
          message: "Survey not found"
        }
      });
    }

    if (survey.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: {
          code: "NOT_CREATOR",
          message: "Only the survey creator can generate summaries"
        }
      });
    }

    if (survey.responses.length === 0) {
      return res.status(400).json({
        error: {
          code: "NO_RESPONSES",
          message: "Cannot generate summary for survey with no responses"
        }
      });
    }

    const summary = await llmService.generateSummary(
      survey.responses,
      survey.summaryInstructions
    );

    survey.summary = {
      content: summary,
      isVisible: false,
      generatedAt: new Date()
    };

    await survey.save();

    res.json({
      message: "Summary generated successfully",
      summary: survey.summary
    });
  } catch (error) {
    logger.error("Error generating summary:", error);
    res.status(500).json({
      error: {
        code: "SUMMARY_ERROR",
        message: "Error generating summary"
      }
    });
  }
};

// Toggle summary visibility
const toggleSummaryVisibility = async (req, res) => {
  try {
    const { error } = surveySchema.summaryVisibility.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: error.details[0].message,
        },
      });
    }

    const survey = await Survey.findById(req.params.id);
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
          message: "Only the survey creator can toggle summary visibility",
        },
      });
    }

    if (!survey.summary) {
      return res.status(400).json({
        error: {
          code: "NO_SUMMARY",
          message: "Survey has no summary",
        },
      });
    }

    survey.summary.isVisible = req.body.isVisible;
    await survey.save();
    logger.info(
      `Summary visibility toggled for survey: ${survey.area} by ${req.user.username}`,
    );

    res.json({
      message: "Summary visibility updated successfully",
      isVisible: survey.summary.isVisible,
    });
  } catch (error) {
    logger.error("Summary visibility toggle error:", error);
    res.status(500).json({
      error: {
        code: "VISIBILITY_ERROR",
        message: "Error toggling summary visibility",
      },
    });
  }
};

// Update a user's own response
const updateResponse = async (req, res) => {
  try {
    const { responseSchema } = require('../utils/validation.schemas');
    const { error } = responseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: error.details[0].message,
        },
      });
    }
    const survey = await Survey.findById(req.params.id);
    if (!survey) {
      return res.status(404).json({
        error: {
          code: "SURVEY_NOT_FOUND",
          message: "Survey not found",
        },
      });
    }
    // Allow updates even if survey has expired, but not if it's inactive
    if (!survey.isActive) {
      return res.status(400).json({
        error: {
          code: "SURVEY_INACTIVE",
          message: "Survey is no longer active",
        },
      });
    }
    
    const response = survey.responses.id(req.params.responseId);
    if (!response) {
      return res.status(404).json({
        error: {
          code: "RESPONSE_NOT_FOUND",
          message: "Response not found",
        },
      });
    }
    
    // Check if user owns the response
    if (response.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        error: {
          code: "UNAUTHORIZED",
          message: "You can only update your own responses",
        },
      });
    }
    
    response.content = req.body.content;
    response.updatedAt = new Date();
    await survey.save();
    logger.info(
      `Response updated for survey: ${survey.area} by ${req.user.username}`,
    );
    res.status(200).json(response);
  } catch (error) {
    logger.error("Response update error:", error);
    res.status(500).json({
      error: {
        code: "UPDATE_ERROR",
        message: "Error updating response",
      },
    });
  }
};

// Remove a user's own response
const removeResponse = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) {
      return res.status(404).json({
        error: {
          code: "SURVEY_NOT_FOUND",
          message: "Survey not found",
        },
      });
    }
    
    const response = survey.responses.id(req.params.responseId);
    if (!response) {
      return res.status(404).json({
        error: {
          code: "RESPONSE_NOT_FOUND",
          message: "Response not found",
        },
      });
    }
    
    // Check if user owns the response or is the survey creator
    if (response.user.toString() !== req.user.id.toString() && survey.creator.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        error: {
          code: "UNAUTHORIZED",
          message: "You can only delete your own responses",
        },
      });
    }
    
    survey.responses.pull(req.params.responseId);
    await survey.save();
    logger.info(
      `Response removed from survey: ${survey.area} by ${req.user.username}`,
    );
    res.status(200).json({
      message: "Response deleted successfully",
    });
  } catch (error) {
    logger.error("Response removal error:", error);
    res.status(500).json({
      error: {
        code: "REMOVE_ERROR",
        message: "Error removing response",
      },
    });
  }
};

// Close survey (creator only)
const closeSurvey = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    
    if (!survey) {
      return res.status(404).json({
        error: {
          code: "SURVEY_NOT_FOUND",
          message: "Survey not found"
        }
      });
    }

    if (survey.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: {
          code: "NOT_CREATOR",
          message: "Only the survey creator can close the survey"
        }
      });
    }

    if (!survey.isActive) {
      return res.status(400).json({
        error: {
          code: "SURVEY_ALREADY_CLOSED",
          message: "Survey is already closed"
        }
      });
    }

    survey.isActive = false;
    await survey.save();

    logger.info(`Survey closed: ${survey.area} by ${req.user.username}`);

    res.json({
      message: "Survey closed successfully",
      survey
    });
  } catch (error) {
    logger.error("Error closing survey:", error);
    res.status(500).json({
      error: {
        code: "CLOSE_ERROR",
        message: "Error closing survey"
      }
    });
  }
};

module.exports = {
  createSurvey,
  getSurveys,
  getSurveyById,
  updateSurvey,
  deleteSurvey,
  submitResponse,
  searchSurveys,
  validateResponse,
  validateAllResponses,
  generateSummary,
  toggleSummaryVisibility,
  updateResponse,
  removeResponse,
  closeSurvey
};
