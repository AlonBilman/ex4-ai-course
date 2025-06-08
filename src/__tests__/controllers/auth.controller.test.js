const request = require("supertest");
const app = require("../../app");
const {
  connect,
  closeDatabase,
  clearDatabase,
  setupTestEnv,
} = require("../helpers/test.helper");
const User = require("../../models/user.model");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const express = require("express");

describe("Auth Controller", () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    // Set required environment variables for testing
    process.env.JWT_SECRET = "test-secret-key";
    process.env.NODE_ENV = "test";
    process.env.USE_MOCK_LLM = "true";

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);

    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe("POST /auth/register", () => {
    it("should register a new user with valid data", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        registrationCode: process.env.REGISTRATION_SECRET
      };

      const response = await request(app).post("/auth/register").send(userData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "User registered successfully");
    });

    it("should reject registration with existing email", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        registrationCode: process.env.REGISTRATION_SECRET
      };

      await User.create({
        username: userData.username,
        email: userData.email,
        passwordHash: await bcrypt.hash(userData.password, 10)
      });

      const response = await request(app).post("/auth/register").send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject registration with invalid email format", async () => {
      const userData = {
        username: "testuser",
        email: "invalid-email",
        password: "password123",
      };

      const response = await request(app).post("/auth/register").send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject registration with short password", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "123",
      };

      const response = await request(app).post("/auth/register").send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject registration with short username", async () => {
      const userData = {
        username: "te",
        email: "test@example.com",
        password: "password123",
      };

      const response = await request(app).post("/auth/register").send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /auth/login", () => {
    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);
      await User.create({
        username: "testuser",
        email: "test@example.com",
        passwordHash: hashedPassword
      });
    });

    it("should login with valid credentials", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "test@example.com",
        password: "password123"
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body.user).toHaveProperty("username", "testuser");
      expect(response.body.user).toHaveProperty("email", "test@example.com");
    });

    it("should reject login with invalid credentials", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "test@example.com",
        password: "wrongpassword"
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject login with invalid email format", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "invalid-email",
        password: "password123"
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject login with missing fields", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "test@example.com"
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });
});
