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
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();

// ==========================================
// 1. CRITICAL DEPLOYMENT SETTINGS
// ==========================================

// Trust proxy is REQUIRED for Render/Heroku (handles HTTPS correctly)
app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production';

// Ensure CLIENT_URL doesn't have a trailing slash for safety
let clientUrlRaw = process.env.CLIENT_URL || 'http://localhost:3000';
const clientUrl = clientUrlRaw.endsWith('/') ? clientUrlRaw.slice(0, -1) : clientUrlRaw;

// ==========================================
// 2. MIDDLEWARE & CORS
// ==========================================

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// CORS configuration
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', limiter);

// ==========================================
// 3. DATABASE CONNECTION & MODEL LOADING
// ==========================================

// Global variables define karo
let User, Property, Contact;

const mongoose = require('mongoose');

// Models ko connection se pehle hi require kar lo (Safe side)
// Note: Agar DB connect nahi hoga, tab bhi code chalega par error dega jab use karoge
try {
  User = require('./models/User');
  Property = require('./models/Property');
  Contact = require('./models/Contact');
} catch (e) {
  console.error("Model loading error:", e);
}

// Hardcoded Connection String (Password sahi daalna!)
const DB_URI = 'mongodb+srv://appuser:SaarthiFinal2024@cluster0.6twxw04.mongodb.net/Saarthi-realestate?retryWrites=true&w=majority';

console.log('🔌 Connecting to MongoDB...');

mongoose.connect(DB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully!');
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Failed:', err.message);
  });


// ==========================================
// 4. SESSION CONFIGURATION
// ==========================================
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_do_not_use_in_prod',
  resave: false,
  saveUninitialized: false,
  store: process.env.MONGODB_URI ? MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 1 day
  }) : null,
  cookie: {
    secure: isProduction, // true on Render (HTTPS), false on Localhost
    sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-site
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    httpOnly: true
  }
}));

// ==========================================
// 5. UTILITY FUNCTIONS
// ==========================================

const hashPassword = async (password) => {
  try {
    const saltRounds = 12; 
    return await bcrypt.hash(password, saltRounds);
  } catch (error) { throw new Error('Error hashing password'); }
};

const comparePassword = async (plainPassword, hashedPassword) => {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) { throw new Error('Error comparing password'); }
};

const calculateEmailDigitsSum = (email) => {
  const numbers = email.match(/\d+/g) || [];
  let totalDigitsSum = 0;
  numbers.forEach(num => {
    totalDigitsSum += num.split('').reduce((sum, d) => sum + parseInt(d), 0);
  });
  return { totalDigitsSum }; // Simplified for brevity
};

// ==========================================
// 6. PASSPORT & AUTH SETUP
// ==========================================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('🎉 Google OAuth Hit:', profile.emails[0].value);
      if (!User) return done(new Error("Database not connected"), null);

      // Check existing user by Google ID
      let user = await User.findOne({ googleId: profile.id });
      if (user) {
         user.lastLogin = new Date();
         user.avatar = profile.photos[0]?.value;
         await user.save();
         return done(null, user);
      }

      // Check existing user by Email
      const existingUser = await User.findOne({ email: profile.emails[0].value });
      if (existingUser) {
        existingUser.googleId = profile.id;
        existingUser.avatar = profile.photos[0]?.value;
        existingUser.provider = 'google';
        await existingUser.save();
        return done(null, existingUser);
      }

      // Create New User
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

  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    try {
      if (User) {
        const user = await User.findById(id);
        done(null, user);
      } else { done(null, null); }
    } catch (error) { done(error, null); }
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
  res.json({ status: 'healthy', mongo: !!User, authenticated: !!req.user });
});

// --- AUTH ROUTES ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!User) return res.status(500).json({ success: false, message: 'DB Error' });
    if (await User.findOne({ email })) return res.status(400).json({ success: false, message: 'Email exists' });

    const hashedPassword = await hashPassword(password);
    const newUser = await User.create({
      name, email, password: hashedPassword, provider: 'manual', lastLogin: new Date()
    });
    res.status(201).json({ success: true, message: 'Registered' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!User) return res.status(500).json({ success: false, message: 'DB Error' });

    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!await comparePassword(password, user.password)) 
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    req.login(user, (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Session error' });
      const emailAnalysis = calculateEmailDigitsSum(user.email);
      res.json({ success: true, data: { ...user.toObject(), emailAnalysis } });
    });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// Google Auth
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google Callback (FIXED)
app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${clientUrl}/login?error=failed` }),
  (req, res) => {
    req.session.save((err) => {
      if (err) console.error('Session save error:', err);
      // Redirect to Frontend Home with Success Flag
      res.redirect(`${clientUrl}/?login=success`);
    });
  }
);

// Check Auth Status
app.get('/api/auth/check', (req, res) => {
  if (req.isAuthenticated() && req.user) {
    const emailAnalysis = calculateEmailDigitsSum(req.user.email);
    res.json({ success: true, isAuthenticated: true, user: { ...req.user.toObject(), emailAnalysis } });
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

// Other Routes (Properties, Contact)
app.post('/api/contact', async (req, res) => {
    try { if(Contact) await Contact.create(req.body); res.json({ success: true }); } 
    catch(e) { res.status(500).json({ error: e.message }) }
});

app.get('/api/properties', async (req, res) => {
    try { const props = Property ? await Property.find({ status: 'active' }).limit(20) : []; res.json({ success: true, data: props }); } 
    catch(e) { res.status(500).json({ error: e.message }) }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`🔗 Client URL: ${clientUrl}`);
});
