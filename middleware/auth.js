// Check if user is authenticated via session
const isAuthenticated = (req, res, next) => {
  console.log('Auth Check - Session:', req.session);
  console.log('Auth Check - User:', req.user);
  
  if (req.isAuthenticated && req.isAuthenticated()) {
    console.log('User authenticated:', req.user.email);
    return next();
  }
  
  console.log('User not authenticated');
  return res.status(401).json({
    success: false,
    message: 'Please login with Google to access this resource'
  });
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Admin access required'
  });
};

// Optional authentication (doesn't block if not authenticated)
const optionalAuth = (req, res, next) => {
  // User info will be available in req.user if authenticated
  // but won't block the request if not authenticated
  next();
};

module.exports = {
  isAuthenticated,
  isAdmin,
  optionalAuth
};
