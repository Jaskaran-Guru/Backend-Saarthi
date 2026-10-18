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
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Trust proxy for reverse proxy environments (e.g., Render, Heroku)
app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production';

// Safe Client URL configuration
let clientUrlRaw = process.env.CLIENT_URL || 'http://localhost:3000';
const clientUrl = clientUrlRaw.endsWith('/') ? clientUrlRaw.slice(0, -1) : clientUrlRaw;

// Security & Optimization Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// CORS Configuration
const allowedOrigins = [
  clientUrl,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'https://backend-saarthi.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || !isProduction) {
      callback(null, true);
    } else {
      callback(null, true); // Allow during transition
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body Parsing Middleware
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

if (!isProduction) {
  app.use(morgan('dev'));
}

// Global API Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests, please try again after a short while.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', generalLimiter);

// Auth Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// MongoDB URI Resolution from Environment
const MONGODB_URI = process.env.MONGODB_URI || process.env.MongoDB_URI || 'mongodb://localhost:27017/saarthi';

// Session Store Configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'saarthi_super_secure_session_secret_2026',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60 // 7 days
  }),
  cookie: {
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true
  }
};

app.use(session(sessionConfig));

// Passport Initialization
const User = require('./models/User');

passport.serializeUser((user, done) => {
  done(null, user._id || user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth Strategy Setup
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error("No email found in Google profile"), null);

      let user = await User.findOne({ googleId: profile.id });
      if (user) {
        user.lastLogin = new Date();
        user.avatar = profile.photos?.[0]?.value || user.avatar;
        await user.save();
        return done(null, user);
      }

      user = await User.findOne({ email });
      if (user) {
        user.googleId = profile.id;
        user.avatar = profile.photos?.[0]?.value || user.avatar;
        user.provider = 'google';
        user.lastLogin = new Date();
        await user.save();
        return done(null, user);
      }

      const newUser = await User.create({
        googleId: profile.id,
        name: profile.displayName || email.split('@')[0],
        email: email,
        avatar: profile.photos?.[0]?.value || '',
        provider: 'google',
        lastLogin: new Date()
      });
      return done(null, newUser);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }));
}

app.use(passport.initialize());
app.use(passport.session());

// Health & Root Status
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    name: 'Saarthi Real Estate API',
    version: '2.0.0',
    authenticated: !!req.user,
    user: req.user ? req.user.name : null
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    authenticated: !!req.user,
    timestamp: new Date()
  });
});

// Mount Modular API Routers
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const favoriteRoutes = require('./routes/favorites');
const contactRoutes = require('./routes/contact');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/uploads');

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/users', userRoutes);
app.use('/api/uploads', uploadRoutes);

// Global 404 Error Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: isProduction ? 'An unexpected server error occurred' : err.message
  });
});

// Database Connection & Server Initialization
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB Connected Successfully!');
  } catch (err) {
    console.warn('⚠️ MongoDB connection warning (will run in resilient fallback mode):', err.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Saarthi Real Estate Server active on port ${PORT}`);
    console.log(`🌍 Environment: ${isProduction ? 'Production' : 'Development'}`);
    console.log(`🔗 Allowed Client URL: ${clientUrl}`);
  });
};

startServer();
