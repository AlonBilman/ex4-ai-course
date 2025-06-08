const express = require("express");
const { auth, isCreator } = require("../middleware/auth.middleware");
const {
  createSurvey,
  getSurveys,
  getSurveyById,
  updateSurvey,
  deleteSurvey,
  submitResponse,
  updateResponse,
  removeResponse,
  searchSurveys,
  generateSummary,
  toggleSummaryVisibility,
  validateResponse,
  closeSurvey,
  validateAllResponses,
} = require("../controllers/survey.controller");

const router = express.Router();

// Public routes
router.get("/", getSurveys);
router.get("/search", searchSurveys);

// Protected routes
router.use(auth);

// Survey CRUD operations
router.post("/", createSurvey);
router.get("/:id", getSurveyById);
router.patch("/:id", isCreator, updateSurvey);
router.delete("/:id", isCreator, deleteSurvey);

// Response management
router.post("/:id/responses", submitResponse);
router.put("/:id/responses/:responseId", updateResponse);
router.delete("/:id/responses/:responseId", removeResponse);

// AI operations
router.post("/:id/summary", isCreator, generateSummary);
router.patch("/:id/summary/visibility", isCreator, toggleSummaryVisibility);

// Survey creator only routes
router.get("/:id/responses/:responseId/validate", validateResponse);
router.get("/:id/responses/validate", validateAllResponses);

// Additional route for closing a survey
router.post("/:id/close", closeSurvey);

module.exports = router;
