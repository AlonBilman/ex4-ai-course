const request = require("supertest");
const app = require("../../app");
const User = require("../../models/user.model");
const { createTestUser } = require("../helpers/test.helper");

describe("Auth Controller", () => {
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

      await createTestUser({ email: userData.email });

      const response = await request(app).post("/auth/register").send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject registration with invalid email format", async () => {
      const userData = {
        username: "testuser",
        email: "invalid-email",
        password: "password123",
        registrationCode: process.env.REGISTRATION_SECRET
      };

      const response = await request(app).post("/auth/register").send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject registration with short password", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "123",
        registrationCode: process.env.REGISTRATION_SECRET
      };

      const response = await request(app).post("/auth/register").send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject registration with short username", async () => {
      const userData = {
        username: "te",
        email: "test@example.com",
        password: "password123",
        registrationCode: process.env.REGISTRATION_SECRET
      };

      const response = await request(app).post("/auth/register").send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /auth/login", () => {
    it("should login with valid credentials", async () => {
      await createTestUser({ email: "test@example.com", password: "password123" });

      const response = await request(app).post("/auth/login").send({
        email: "test@example.com",
        password: "password123"
      });

      expect(response.statusCode).toEqual(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('username', 'testuser');
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
