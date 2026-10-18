const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { isAuthenticated } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

const isProduction = process.env.NODE_ENV === 'production';
const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');

// POST /api/auth/register - Register with Email & Password
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone || '',
      provider: 'manual',
      lastLogin: new Date()
    });

    req.login(newUser, (err) => {
      if (err) {
        return res.status(201).json({
          success: true,
          message: 'Account created! Please log in.',
          user: { id: newUser._id, name: newUser.name, email: newUser.email }
        });
      }
      res.status(201).json({
        success: true,
        message: 'Welcome to Saarthi Real Estate!',
        user: { id: newUser._id, name: newUser.name, email: newUser.email, avatar: newUser.avatar, role: newUser.role }
      });
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/login - Login with Email & Password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Session initialization error' });
      }
      res.json({
        success: true,
        message: `Welcome back, ${user.name}!`,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          phone: user.phone
        }
      });
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/auth/google - Initiate Google OAuth
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ success: false, message: 'Google Auth not configured in environment' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// GET /api/auth/google/callback
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', {
    failureRedirect: `${clientUrl}/?login=failed`,
  })(req, res, (err) => {
    if (err) {
      console.error('OAuth Callback Error:', err);
      return res.redirect(`${clientUrl}/?login=failed`);
    }
    req.session.save(() => {
      res.redirect(`${clientUrl}/?login=success`);
    });
  });
});

// GET /api/auth/check - Check current session
router.get('/check', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    res.json({
      success: true,
      isAuthenticated: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
        role: req.user.role,
        phone: req.user.phone,
        preferences: req.user.preferences
      }
    });
  } else {
    res.json({
      success: true,
      isAuthenticated: false,
      user: null
    });
  }
});

// GET /api/auth/me - Alias for check
router.get('/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    res.json({
      success: true,
      data: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
        role: req.user.role,
        phone: req.user.phone
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Not authenticated' });
  }
});

// POST /api/auth/logout - Terminate session
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) console.error('Logout error:', err);
    if (req.session) {
      req.session.destroy((destroyErr) => {
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logged out successfully' });
      });
    } else {
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    }
  });
});

module.exports = router;
