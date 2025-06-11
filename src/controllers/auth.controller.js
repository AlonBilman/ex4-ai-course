const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const { logger } = require("../config/logger");
const { userSchema, loginSchema } = require("../utils/validation.schemas");

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const register = async (req, res) => {
  try {
    const { error } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.details[0].message } });
    }

    const { username, email, password, registrationCode } = req.body;

    if (registrationCode !== process.env.REGISTRATION_SECRET) {
      return res.status(403).json({ error: { message: 'Invalid registration code' } });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: { message: 'User already exists' } });
    }

    const user = new User({
      username,
      email,
      passwordHash: password
    });

    await user.save();
    logger.info(`New user registered: ${username}`);

    res.status(200).json({ message: 'User registered successfully' });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: { message: 'Registration failed' } });
  }
};

const login = async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.details[0].message } });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    const token = generateToken(user);
    logger.info(`User logged in: ${user.username}`);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: { message: 'Login failed' } });
  }
};

module.exports = {
  register,
  login
};
