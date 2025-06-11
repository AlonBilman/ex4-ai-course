const express = require('express');
const router = express.Router();
const { createSurvey } = require('../controllers/surveyController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, createSurvey);
router.post('/respond', auth, addResponse); 
router.post('/search', auth, searchSurveys);

module.exports = router;
