const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const surveySchema = new mongoose.Schema({
  title: { type: String, required: true },
  area: { type: String, required: true },
  question: { type: String, required: true },
  permittedDomains: [String],
  permittedResponses: [String],
  summaryInstructions: { type: String },
  expiryDate: { type: Date, required: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  responses: [responseSchema],
  summary: { type: String },
  summaryVisible: { type: Boolean, default: false },
  closed: { type: Boolean, default: false }
});

module.exports = mongoose.model('Survey', surveySchema);
