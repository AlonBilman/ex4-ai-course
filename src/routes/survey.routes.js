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
} = require("../controllers/survey.controller");

const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth);

// Survey CRUD operations
router.post("/", createSurvey);
router.get("/", getSurveys);
router.get("/:id", getSurveyById);
router.patch("/:id", isCreator, updateSurvey);
router.delete("/:id", isCreator, deleteSurvey);

// Response management
router.post("/:id/responses", submitResponse);
router.put("/:id/responses", updateResponse);
router.delete("/:id/responses", removeResponse);

// AI operations
router.post("/search", searchSurveys);
router.post("/:id/summarize", isCreator, generateSummary);
router.patch("/:id/summary/visibility", isCreator, toggleSummaryVisibility);

module.exports = router;
