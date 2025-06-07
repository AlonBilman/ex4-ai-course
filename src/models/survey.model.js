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
  title: {
    type: String,
    required: [true, 'Survey title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Survey description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Survey creator is required']
  },
  questions: {
    type: [questionSchema],
    required: [true, 'Survey must have at least one question'],
    validate: {
      validator: function(questions) {
        return questions && questions.length > 0;
      },
      message: 'Survey must have at least one question'
    }
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
  maxResponses: {
    type: Number,
    min: [1, 'Maximum responses must be at least 1'],
    default: 1000
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
  const responseCount = await mongoose.model('Response').countDocuments({ survey: this._id });
  return responseCount < this.maxResponses;
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
