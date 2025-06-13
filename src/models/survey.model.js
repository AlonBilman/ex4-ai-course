const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    maxLength: [500, 'Question text cannot exceed 500 characters']
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
  title: {
    type: String,
    required: [true, 'Survey title is required'],
    trim: true
  },
  area: {
    type: String,
    required: false,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  guidelines: {
    question: {
      type: String,
      required: false,
      trim: true
    },
    permittedDomains: [{
      type: String,
      trim: true
    }],
    permittedResponses: {
      type: String,
      trim: true
    },
    summaryInstructions: {
      type: String,
      trim: true
    },
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Survey creator is required']
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
  questions: [questionSchema],
  maxResponses: {
    type: Number,
    default: 100,
    min: [1, 'Maximum responses must be at least 1']
  },
}, {
  timestamps: true
});

// Index for faster queries
surveySchema.index({ creator: 1, createdAt: -1 });
surveySchema.index({ expiryDate: 1 });
surveySchema.index({ isActive: 1 });
surveySchema.index({ "guidelines.question": "text", area: "text", title: "text" });

// Virtual for checking if survey is expired
surveySchema.virtual('isExpired').get(function() {
  return new Date() > this.expiryDate;
});

// Method to check if survey can accept more responses
surveySchema.methods.canAcceptResponses = function() {
  const isFull = this.maxResponses && this.responses.length >= this.maxResponses;
  return this.isActive && !this.isExpired && !isFull;
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
