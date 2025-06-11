const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const {
  connect,
  closeDatabase,
  clearDatabase,
} = require("./helpers/test.helper");
const User = require("../models/user.model");
const Survey = require("../models/survey.model");
const Response = require("../models/response.model");

describe("Database Connection", () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("should connect to in-memory database", () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });

  it("should clear collections between tests", async () => {
    // Create a test user
    const passwordHash = await bcrypt.hash("password123", 10);
    const user = await User.create({
      username: "testuser",
      email: "test@example.com",
      passwordHash: passwordHash,
    });

    // Verify user was created
    const foundUser = await User.findById(user._id);
    expect(foundUser).toBeTruthy();
    expect(foundUser.email).toBe("test@example.com");

    // Clear database
    await clearDatabase();

    // Verify user was removed
    const deletedUser = await User.findById(user._id);
    expect(deletedUser).toBeNull();
  });

  it("should have empty collections after cleanup", async () => {
    const users = await User.find();
    const surveys = await Survey.find();
    expect(users.length).toBe(0);
    expect(surveys.length).toBe(0);
  });
});

describe("User Model", () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("should create a user successfully", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);
    const userData = {
      username: "testuser",
      email: "test@example.com",
      passwordHash: passwordHash,
    };

    const user = new User(userData);
    await user.save();

    expect(user.username).toBe(userData.username);
    expect(user.email).toBe(userData.email);
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).toMatch(/^\$2[axy]\$\d+\$/); // bcrypt hash pattern
  });

  it("should not create a user with duplicate email", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);
    const userData = {
      username: "testuser",
      email: "test@example.com",
      passwordHash: passwordHash,
    };

    await User.create(userData);

    const duplicateUser = new User(userData);
    await expect(duplicateUser.save()).rejects.toThrow();
  });
});

describe("Survey Model", () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("should create a survey successfully", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);
    const user = await User.create({
      username: "creator",
      email: "creator@example.com",
      passwordHash: passwordHash,
    });

    const surveyData = {
      title: "Test Survey",
      description: "A test survey",
      creator: user._id,
      questions: [
        {
          text: "What is your favorite color?",
          type: "text",
          required: true,
        },
      ],
      expiryDate: new Date(Date.now() + 86400000), // 24 hours from now
    };

    const survey = new Survey(surveyData);
    await survey.save();

    expect(survey.title).toBe(surveyData.title);
    expect(survey.description).toBe(surveyData.description);
    expect(survey.creator.toString()).toBe(user._id.toString());
    expect(survey.questions).toHaveLength(1);
    expect(survey.questions[0].text).toBe(surveyData.questions[0].text);
  });
});

describe("Response Model", () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("should create a response successfully", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);
    const user = await User.create({
      username: "respondent",
      email: "respondent@example.com",
      passwordHash: passwordHash,
    });

    const survey = await Survey.create({
      title: "Test Survey",
      description: "A test survey",
      creator: user._id,
      questions: [
        {
          text: "What is your favorite color?",
          type: "text",
          required: true,
        },
      ],
      expiryDate: new Date(Date.now() + 86400000),
    });

    const responseData = {
      survey: survey._id,
      respondent: user._id,
      answers: [
        {
          questionId: survey.questions[0]._id,
          value: "Blue",
        },
      ],
    };

    const response = new Response(responseData);
    await response.save();

    expect(response.survey.toString()).toBe(survey._id.toString());
    expect(response.respondent.toString()).toBe(user._id.toString());
    expect(response.answers).toHaveLength(1);
    expect(response.answers[0].value).toBe("Blue");
  });
});
