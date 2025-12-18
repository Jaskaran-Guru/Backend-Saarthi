const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt'); // 🔐 Password hashing
require('dotenv').config();

const app = express();




// ==========================================
// 1. CRITICAL DEPLOYMENT SETTINGS
// ==========================================

// Trust proxy is REQUIRED for Render/Heroku (handles HTTPS correctly)
app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production';
const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

// ==========================================
// 2. MIDDLEWARE & CORS
// ==========================================

app.use(helmet({
  contentSecurityPolicy: false, // Allow Google OAuth redirects
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images/resources to load
}));
app.use(compression());

// CORS configuration (Fixes Access-Control-Allow-Origin errors)
const corsOptions = {
  origin: clientUrl,
  credentials: true, // Important for cookies/sessions
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (!isProduction) {
  app.use(morgan('dev'));
}

// Rate limiting (Protect against spam)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', limiter);

// ==========================================
// 3. DATABASE CONNECTION
// ==========================================
let User, Property, Contact;

if (process.env.MONGODB_URI) {
  const connectDB = require('./config/database');
  connectDB();
  
  // Load Models
  User = require('./models/User');
  Property = require('./models/Property');
  Contact = require('./models/Contact');
} else {
  console.log('⚠️  No MongoDB URI found in .env');
}

// ==========================================
// 4. SESSION CONFIGURATION (The Main Fix)
// ==========================================
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_do_not_use_in_prod',
  resave: false,
  saveUninitialized: false,
  // Use MongoDB to store sessions (Persistent login)
  store: process.env.MONGODB_URI ? MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 1 day
  }) : null,
  cookie: {
    secure: isProduction, // true on Render (HTTPS), false on Localhost
    sameSite: isProduction ? 'none' : 'lax', // 'none' is required for cross-site cookies
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    httpOnly: true // Prevents JS access to cookie (Security)
  }
}));

// ==========================================
// 5. UTILITY FUNCTIONS
// ==========================================

// Hash password function
const hashPassword = async (password) => {
  try {
    const saltRounds = 12; 
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    throw new Error('Error hashing password');
  }
};

// Compare password function
const comparePassword = async (plainPassword, hashedPassword) => {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    throw new Error('Error comparing password');
  }
};

// Password strength checker
const isStrongPassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return {
    isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
    checks: {
      length: password.length >= minLength,
      upperCase: hasUpperCase,
      lowerCase: hasLowerCase,
      numbers: hasNumbers,
      specialChar: hasSpecialChar
    },
    score: [password.length >= minLength, hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length
  };
};

// Calculate email digits sum
const calculateEmailDigitsSum = (email) => {
  const numbers = email.match(/\d+/g) || [];
  let totalDigitsSum = 0;
  const allDigits = [];
  const digitCalculations = [];

  numbers.forEach(numberGroup => {
    const digits = numberGroup.split('').map(digit => parseInt(digit));
    allDigits.push(...digits);
    const groupSum = digits.reduce((sum, digit) => sum + digit, 0);
    totalDigitsSum += groupSum;
    digitCalculations.push({
      numberGroup: numberGroup,
      digits: digits,
      digitsSum: groupSum,
      calculation: `${digits.join('+')} = ${groupSum}`
    });
  });

  return {
    hasNumbers: numbers.length > 0,
    numberGroups: numbers,
    individualDigits: allDigits,
    digitCalculations: digitCalculations,
    totalDigitsSum: totalDigitsSum,
    numberGroupCount: numbers.length,
    totalDigitsCount: allDigits.length
  };
};

// ==========================================
// 6. PASSPORT & AUTH SETUP (Isse Replace Karo)
// ==========================================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
    proxy: true // <--- Yeh Render ke liye zaroori hai
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('🎉 Google OAuth Hit:', profile.emails[0].value);

      // Check if User model is loaded
      if (!User) return done(new Error("Database not connected"), null);

      // 1. Check existing user by Google ID
      let user = await User.findOne({ googleId: profile.id });
      if (user) {
         user.lastLogin = new Date();
         user.avatar = profile.photos[0]?.value; // Update avatar if changed
         await user.save();
         return done(null, user);
      }

      // 2. Check existing user by Email (Account Linking)
      const existingUser = await User.findOne({ email: profile.emails[0].value });
      if (existingUser) {
        console.log("Linking Google to existing email...");
        existingUser.googleId = profile.id;
        existingUser.avatar = profile.photos[0]?.value;
        existingUser.provider = 'google';
        await existingUser.save();
        return done(null, existingUser);
      }

      // 3. Create New User
      console.log("Creating new user...");
      const newUser = await User.create({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        avatar: profile.photos[0]?.value,
        provider: 'google',
        lastLogin: new Date()
      });
      return done(null, newUser);

    } catch (error) {
      console.error('❌ OAuth Error:', error);
      return done(error, null);
    }
  }));

  // Serialize (Sirf ID save karo session chota rakhne ke liye)
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // Deserialize (DB se user fetch karo)
  passport.deserializeUser(async (id, done) => {
    try {
      if (User) {
        const user = await User.findById(id);
        done(null, user);
      } else {
        done(null, null);
      }
    } catch (error) {
      done(error, null);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());
}


// ==========================================
// 7. ROUTES
// ==========================================

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: '🏠 Saarthi Real Estate Backend API',
    user: req.user ? req.user.email : 'Guest'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    mongo: process.env.MONGODB_URI ? 'Connected' : 'Disconnected',
    authenticated: !!req.user
  });
});

// --- AUTH ROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Missing fields' });

    if (User) {
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });

      const hashedPassword = await hashPassword(password);
      const emailAnalysis = calculateEmailDigitsSum(email);

      const newUser = await User.create({
        name, email, password: hashedPassword, provider: 'manual', lastLogin: new Date()
      });

      return res.status(201).json({
        success: true,
        data: { ...newUser.toObject(), emailAnalysis },
        message: 'Registration successful'
      });
    }
    res.status(500).json({ success: false, message: 'Database not connected' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!User) return res.status(500).json({ success: false, message: 'Database not connected' });

    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Login successful
    req.login(user, (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Session error' });
      
      const emailAnalysis = calculateEmailDigitsSum(user.email);
      res.json({
        success: true,
        data: { 
          id: user._id, 
          name: user.name, 
          email: user.email, 
          avatar: user.avatar,
          emailAnalysis 
        }
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Google Auth Start
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google Callback
app.get('/api/auth/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${clientUrl}/login?error=failed` 
  }),
  (req, res) => {
    req.session.save((err) => {
      if (err) console.error('Session save error:', err);
      
      // Ensure clean redirect URL (remove trailing slash if exists)
      const cleanClientUrl = clientUrl.endsWith('/') ? clientUrl.slice(0, -1) : clientUrl;
      
      console.log(`Redirecting to: ${cleanClientUrl}/?login=success`);
      res.redirect(`${cleanClientUrl}/?login=success`);
    });
  }
);

// Check Auth Status (Important for Frontend)
app.get('/api/auth/check', (req, res) => {
  if (req.isAuthenticated() && req.user) {
    const emailAnalysis = calculateEmailDigitsSum(req.user.email);
    res.json({
      success: true,
      isAuthenticated: true,
      user: { ...req.user.toObject ? req.user.toObject() : req.user, emailAnalysis }
    });
  } else {
    res.json({ success: true, isAuthenticated: false, user: null });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy((err) => {
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out' });
    });
  });
});

// --- OTHER ROUTES (Properties, Contact, Users) ---
// Kept minimal to ensure file fits, add your specific logic back here if needed.

// Contact
app.post('/api/contact', async (req, res) => {
    try {
        if(Contact) await Contact.create(req.body);
        res.json({ success: true, message: 'Message sent' });
    } catch(e) { res.status(500).json({ error: e.message }) }
});

// Properties
app.get('/api/properties', async (req, res) => {
    try {
        const props = Property ? await Property.find({ status: 'active' }).limit(20) : [];
        res.json({ success: true, data: props });
    } catch(e) { res.status(500).json({ error: e.message }) }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`🔗 Client URL: ${clientUrl}`);
});
