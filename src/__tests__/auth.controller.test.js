const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const authRoutes = require('../routes/auth.routes');
const User = require('../models/user.model');
const { connect, closeDatabase, clearDatabase } = require('./helpers/test.helper');

describe('Auth Controller', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    await connect();
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('POST /auth/register', () => {
    it('should register a new user with valid data', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          registrationCode: process.env.REGISTRATION_SECRET
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('User registered successfully');
      const user = await User.findOne({ email: 'test@example.com' });
      expect(user).toBeDefined();
      expect(await bcrypt.compare('password123', user.passwordHash)).toBe(true);
    });

    it('should reject registration with existing email', async () => {
      await User.create({
        username: 'existing',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password123', 10)
      });

      const res = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          registrationCode: process.env.REGISTRATION_SECRET
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.message).toEqual('User already exists');
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'password123',
          registrationCode: process.env.REGISTRATION_SECRET
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.message).toContain('valid email address');
    });

    it('should reject registration with short password', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: '123',
          registrationCode: process.env.REGISTRATION_SECRET
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.message).toContain('at least 6 characters');
    });

    it('should reject registration with short username', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          username: 'te',
          email: 'test@example.com',
          password: 'password123',
          registrationCode: process.env.REGISTRATION_SECRET
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.message).toContain('at least 3 characters');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password123', 10)
      });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('username', 'testuser');
    });

    it('should reject login with invalid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.error.message).toEqual('Invalid credentials');
    });

    it('should reject login with invalid email format', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.message).toContain('valid email address');
    });

    it('should reject login with missing fields', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.message).toContain('required');
    });
  });
}); 