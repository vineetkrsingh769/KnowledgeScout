const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: "FIELD_REQUIRED",
          field: !email ? "email" : "password",
          message: `${!email ? "Email" : "Password"} is required`
        }
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: {
          code: "USER_EXISTS",
          message: "User already exists"
        }
      });
    }

    const user = await User.create({ email, password });
    const token = jwt.sign({ id: user._id }, JWT_SECRET);

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: "REGISTRATION_FAILED",
        message: "Registration failed"
      }
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: "FIELD_REQUIRED",
          field: !email ? "email" : "password",
          message: `${!email ? "Email" : "Password"} is required`
        }
      });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password"
        }
      });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: "LOGIN_FAILED",
        message: "Login failed"
      }
    });
  }
});

module.exports = router;
