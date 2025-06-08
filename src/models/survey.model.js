const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'multiple_choice', 'rating'],
    required: [true, 'Question type is required']
  },
  required: {
    type: Boolean,
    default: true
  },
  options: {
    type: [String],
    validate: {
      validator: function(options) {
        return this.type !== 'multiple_choice' || (options && options.length > 0);
      },
      message: 'Multiple choice questions must have at least one option'
    }
  }
});

const responseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000, // Limit response length
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const summarySchema = new mongoose.Schema({
  content: {
    type: String,
    trim: true,
  },
  isVisible: {
    type: Boolean,
    default: false,
  },
  generatedAt: {
    type: Date,
  },
});

const surveySchema = new mongoose.Schema({
  area: {
    type: String,
    required: [true, 'Survey area is required'],
    trim: true
  },
  question: {
    type: String,
    required: [true, 'Survey question is required'],
    trim: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Survey creator is required']
  },
  permittedDomains: [{
    type: String,
    required: [true, 'At least one permitted domain is required'],
    trim: true
  }],
  permittedResponses: {
    type: String,
    required: [true, 'Response guidelines are required'],
    trim: true
  },
  summaryInstructions: {
    type: String,
    required: [true, 'Summary instructions are required'],
    trim: true
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required'],
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: 'Expiry date must be in the future'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  responses: [responseSchema],
  summary: summarySchema,
});

// Index for faster queries
surveySchema.index({ creator: 1, createdAt: -1 });
surveySchema.index({ expiryDate: 1 });
surveySchema.index({ isActive: 1 });

// Virtual for checking if survey is expired
surveySchema.virtual('isExpired').get(function() {
  return new Date() > this.expiryDate;
});

// Method to check if survey can accept more responses
surveySchema.methods.canAcceptResponses = async function() {
  if (this.isExpired || !this.isActive) {
    return false;
  }
  return true;
};

// Method to check if user has already responded
surveySchema.methods.hasUserResponded = function (userId) {
  return this.responses.some(
    (response) => response.user.toString() === userId.toString(),
  );
};

// Method to get user's response
surveySchema.methods.getUserResponse = function (userId) {
  return this.responses.find(
    (response) => response.user.toString() === userId.toString(),
  );
};

// Method to update user's response
surveySchema.methods.updateUserResponse = function (userId, content) {
  const response = this.getUserResponse(userId);
  if (response) {
    response.content = content;
    response.updatedAt = new Date();
    return true;
  }
  return false;
};

// Method to remove user's response
surveySchema.methods.removeUserResponse = function (userId) {
  const index = this.responses.findIndex(
    (response) => response.user.toString() === userId.toString(),
  );
  if (index !== -1) {
    this.responses.splice(index, 1);
    return true;
  }
  return false;
};

const Survey = mongoose.model("Survey", surveySchema);

module.exports = Survey;
