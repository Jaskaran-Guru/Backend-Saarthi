const User = require('../models/User');

const googleAuthSuccess = async (req, res) => {
  if (req.user) {
    res.redirect('http://localhost:3000/?login=success');
  } else {
    res.redirect('http://localhost:3000/?login=failed');
  }
};

const getMe = async (req, res) => {
  if (req.user) {
    res.json({ success: true, data: req.user });
  } else {
    res.status(401).json({ success: false, message: 'Not logged in' });
  }
};

const logout = (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.json({ success: true, message: 'Logged out' });
    });
  });
};

module.exports = { googleAuthSuccess, getMe, logout };
