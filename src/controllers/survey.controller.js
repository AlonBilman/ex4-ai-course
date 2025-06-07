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
    const { error } = surveySchema.response.validate(req.body);
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

    if (!survey.isActive()) {
      return res.status(400).json({
        error: {
          code: "SURVEY_INACTIVE",
          message: "Survey is closed or expired",
        },
      });
    }

    // Validate response using LLM
    const validation = await llmService.validateResponse(
      req.body.content,
      survey.guidelines.permittedResponses,
    );

    if (!validation.isValid) {
      return res.status(400).json({
        error: {
          code: "INVALID_RESPONSE",
          message: validation.feedback,
        },
      });
    }

    // Check if user already submitted a response
    const existingResponse = survey.responses.find(
      (r) => r.user.toString() === req.user._id.toString(),
    );

    // Enforce maxResponses
    if (!existingResponse && survey.responses.length >= survey.maxResponses) {
      return res.status(400).json({
        error: {
          code: "MAX_RESPONSES_REACHED",
          message: "Maximum number of responses reached",
        },
      });
    }

    if (existingResponse) {
      existingResponse.content = req.body.content;
      existingResponse.updatedAt = new Date();
    } else {
      survey.responses.push({
        user: req.user._id,
        content: req.body.content,
      });
    }

    await survey.save();
    logger.info(
      `Response submitted to survey: ${survey.area} by ${req.user.username}`,
    );

    res.status(201).json({
      message: "Response submitted successfully",
      response:
        existingResponse || survey.responses[survey.responses.length - 1],
    });
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

// Search surveys
const searchSurveys = async (req, res) => {
  try {
    const { error } = surveySchema.search.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: error.details[0].message,
        },
      });
    }

    const results = await llmService.searchSurveys(req.body.query);
    const surveys = await Survey.find({
      _id: { $in: results.matches.map((m) => m.id) },
    }).populate("creator", "username");

    res.json({
      matches: surveys.map((survey) => ({
        id: survey._id,
        area: survey.area,
        question: survey.question,
        creator: survey.creator.username,
        isActive: survey.isActive(),
      })),
    });
  } catch (error) {
    logger.error("Survey search error:", error);
    res.status(500).json({
      error: {
        code: "SEARCH_ERROR",
        message: "Error searching surveys",
      },
    });
  }
};

// Generate summary
const generateSummary = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id).populate(
      "responses.user",
      "username",
    );

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
          message: "Only the survey creator can generate summary",
        },
      });
    }

    if (!survey.isClosed && !survey.isExpired()) {
      return res.status(400).json({
        error: {
          code: "SURVEY_ACTIVE",
          message: "Cannot generate summary for active survey",
        },
      });
    }

    const summary = await llmService.generateSummary(
      survey.responses,
      survey.guidelines.summaryInstructions,
    );

    survey.summary = {
      content: summary.summary,
      isVisible: false,
      generatedAt: new Date(),
    };

    await survey.save();
    logger.info(
      `Summary generated for survey: ${survey.area} by ${req.user.username}`,
    );

    res.json({
      message: "Summary generated successfully",
      summary: survey.summary,
    });
  } catch (error) {
    logger.error("Summary generation error:", error);
    res.status(500).json({
      error: {
        code: "SUMMARY_ERROR",
        message: "Error generating summary",
      },
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
    const { error } = surveySchema.response.validate(req.body);
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
    if (!survey.isActive()) {
      return res.status(400).json({
        error: {
          code: "SURVEY_INACTIVE",
          message: "Survey is closed or expired",
        },
      });
    }
    const response = survey.responses.find(
      (r) => r.user.toString() === req.user._id.toString(),
    );
    if (!response) {
      return res.status(404).json({
        error: {
          code: "RESPONSE_NOT_FOUND",
          message: "Response not found",
        },
      });
    }
    response.content = req.body.content;
    response.updatedAt = new Date();
    await survey.save();
    logger.info(
      `Response updated for survey: ${survey.area} by ${req.user.username}`,
    );
    res.status(200).json({
      message: "Response updated successfully",
      response,
    });
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
    const responseIndex = survey.responses.findIndex(
      (r) => r.user.toString() === req.user._id.toString(),
    );
    if (responseIndex === -1) {
      return res.status(404).json({
        error: {
          code: "RESPONSE_NOT_FOUND",
          message: "Response not found",
        },
      });
    }
    survey.responses.splice(responseIndex, 1);
    await survey.save();
    logger.info(
      `Response removed from survey: ${survey.area} by ${req.user.username}`,
    );
    res.status(200).json({
      message: "Response removed successfully",
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

module.exports = {
  createSurvey,
  getSurveys,
  getSurveyById,
  updateSurvey,
  deleteSurvey,
  submitResponse,
  searchSurveys,
  generateSummary,
  toggleSummaryVisibility,
  updateResponse,
  removeResponse,
};
