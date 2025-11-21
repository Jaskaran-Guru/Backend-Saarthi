const UserInteraction = require('../models/UserInteraction');
const crypto = require('crypto');

// Generate session ID
const generateSessionId = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection.remoteAddress;
  const timestamp = Date.now();
  
  return crypto.createHash('md5').update(`${userAgent}-${ip}-${timestamp}`).digest('hex');
};

// Track user interaction
const trackInteraction = async (req, action, details = {}) => {
  try {
    if (!req.user) return; // Only track authenticated users

    const sessionId = req.session.sessionId || generateSessionId(req);
    req.session.sessionId = sessionId;

    const interaction = new UserInteraction({
      user: req.user._id,
      sessionId,
      action,
      details: {
        ...details,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
      }
    });

    await interaction.save();
    console.log(`📊 Tracked: ${action} for user ${req.user.name}`);
  } catch (error) {
    console.error('Tracking error:', error.message);
  }
};

// Middleware to track page views
const trackPageView = (pageName) => {
  return async (req, res, next) => {
    if (req.user) {
      await trackInteraction(req, 'page_view', {
        page: pageName,
        url: req.originalUrl
      });
    }
    next();
  };
};

module.exports = { trackInteraction, trackPageView };
