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

// Trust proxy for deployment
app.set('trust proxy', 1);

// Basic middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow Google OAuth redirects
}));
app.use(compression());

// CORS configuration  
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', limiter);

// Connect to MongoDB
if (process.env.MONGODB_URI) {
  const connectDB = require('./config/database');
  connectDB();
} else {
  console.log('⚠️  No MongoDB URI found in .env');
}

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-for-development-only',
  resave: false,
  saveUninitialized: false,
  store: process.env.MONGODB_URI ? MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600
  }) : undefined,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// ===== MODELS =====
let User, Property, Contact;

// Only load models if MongoDB is connected
if (process.env.MONGODB_URI) {
  User = require('./models/User');
  Property = require('./models/Property');
  Contact = require('./models/Contact');
}

// ===== PASSWORD HASHING UTILITY FUNCTIONS =====

// Hash password function
const hashPassword = async (password) => {
  try {
    const saltRounds = 12; // Higher salt rounds = more secure but slower
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    throw new Error('Error hashing password');
  }
};

// Compare password function
const comparePassword = async (plainPassword, hashedPassword) => {
  try {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
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

// ===== EMAIL DIGITS SUM CALCULATION UTILITY =====

// Calculate sum of individual digits in email numbers
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

// ===== PASSPORT GOOGLE OAUTH WITH DATABASE =====
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('🎉 Google OAuth Success:', {
        id: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value
      });

      // If MongoDB is not connected, return simple user object
      if (!User) {
        const user = {
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos[0]?.value || '',
          provider: 'google',
          loginTime: new Date().toISOString()
        };
        return done(null, user);
      }

      // Check if user already exists in database
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        // Update existing user
        user.lastLogin = new Date();
        user.avatar = profile.photos[0]?.value || user.avatar;
        await user.save();
        console.log('✅ Existing user logged in:', user.email);
        return done(null, user);
      } else {
        // Check if user exists with same email
        const existingUser = await User.findOne({ email: profile.emails[0].value });
        
        if (existingUser) {
          // Link Google account to existing user
          existingUser.googleId = profile.id;
          existingUser.avatar = profile.photos[0]?.value || existingUser.avatar;
          existingUser.lastLogin = new Date();
          existingUser.provider = 'google';
          await existingUser.save();
          console.log('✅ Linked Google account to existing user:', existingUser.email);
          return done(null, existingUser);
        }

        // Create new user
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos[0]?.value || '',
          provider: 'google',
          lastLogin: new Date()
        });

        console.log('✅ New user created in database:', user.email);
        return done(null, user);
      }
    } catch (error) {
      console.error('❌ Google OAuth Database Error:', error);
      return done(error, null);
    }
  }));

  passport.serializeUser((user, done) => {
    console.log('🔒 Serializing user:', user.email);
    // For database users, serialize with _id, for memory users, serialize entire object
    if (user._id) {
      done(null, user._id);
    } else {
      done(null, user);
    }
  });

  passport.deserializeUser(async (id, done) => {
    try {
      // If User model exists and id is ObjectId, fetch from database
      if (User && typeof id === 'string' && id.length === 24) {
        const user = await User.findById(id);
        console.log('🔓 Deserializing user from database:', user?.email);
        done(null, user);
      } else {
        // For memory-based sessions
        console.log('🔓 Deserializing user from memory:', id.email);
        done(null, id);
      }
    } catch (error) {
      console.error('❌ Deserialize error:', error);
      done(error, null);
    }
  });

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  console.log('✅ Google OAuth with Database configured');
} else {
  console.log('⚠️  Google OAuth not configured - missing CLIENT_ID or CLIENT_SECRET');
}

// ===== ROUTES =====

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏠 Saarthi Real Estate Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    user: req.user ? {
      name: req.user.name,
      email: req.user.email,
      provider: req.user.provider,
      loginTime: req.user.lastLogin || req.user.loginTime
    } : null,
    database: User ? '✅ Connected' : '❌ Not connected',
    security: '🔐 Password Hashing + Individual Digits Sum',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      properties: '/api/properties/*',
      contact: '/api/contact',
      users: '/api/users'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '✅ Saarthi Backend API is healthy!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: process.env.MONGODB_URI ? '✅ Connected' : '❌ Not configured',
    models: User ? '✅ Loaded' : '❌ Not loaded',
    session: process.env.SESSION_SECRET ? '✅ Configured' : '❌ Not configured',
    security: '🔐 bcrypt password hashing + digits sum calculation active',
    oauth: {
      google: process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '❌ Not configured'
    },
    user: req.user ? `✅ Logged in as ${req.user.name}` : '❌ Not logged in'
  });
});

// ===== SECURE AUTHENTICATION ROUTES =====

// Register new user with password hashing
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    console.log('📝 Registration attempt:', { name, email });
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    // Password strength validation
    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: '❌ Password is too weak',
        requirements: {
          message: 'Password must contain:',
          checks: {
            '8+ characters': passwordCheck.checks.length,
            'Uppercase letter': passwordCheck.checks.upperCase,
            'Lowercase letter': passwordCheck.checks.lowerCase,
            'Number': passwordCheck.checks.numbers,
            'Special character': passwordCheck.checks.specialChar
          },
          score: `${passwordCheck.score}/5`,
          example: 'Example: MyPass123!'
        }
      });
    }
    
    // Check if User model exists
    if (!User) {
      // Hash password even for dummy response
      const hashedPassword = await hashPassword(password);
      
      // Calculate email digits sum for dummy user
      const emailAnalysis = calculateEmailDigitsSum(email);
      
      const dummyUser = {
        id: 'dummy_' + Date.now(),
        name,
        email,
        provider: 'manual',
        hashedPassword: hashedPassword.substring(0, 20) + '...',
        emailDigitsSum: emailAnalysis.totalDigitsSum,
        digitCalculations: emailAnalysis.digitCalculations,
        joinedDate: new Date().toISOString()
      };
      
      console.log('✅ Dummy user created with hashed password:', email);
      console.log('🧮 Email digits sum:', emailAnalysis.totalDigitsSum);
      
      return res.status(201).json({
        success: true,
        message: '🎉 Registration successful! (Dummy mode)',
        data: dummyUser,
        security: '🔐 Password securely hashed with bcrypt',
        emailAnalysis: emailAnalysis,
        note: 'Connect MongoDB for real user storage'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Hash the password
    console.log('🔐 Hashing password...');
    const hashedPassword = await hashPassword(password);
    console.log('✅ Password hashed successfully');
    
    // Calculate email digits sum
    const emailAnalysis = calculateEmailDigitsSum(email);
    console.log('🧮 Email digits sum calculation:', emailAnalysis);
    
    // Create new user with hashed password
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword, // Store hashed password
      provider: 'manual',
      avatar: '',
      role: 'user',
      phone: '',
      preferences: {
        notifications: true,
        newsletter: true
      },
      lastLogin: new Date(),
      isActive: true
    });
    
    console.log('✅ New user registered with secure password:', newUser.email);
    console.log('🧮 User email digits sum:', emailAnalysis.totalDigitsSum);
    
    res.status(201).json({
      success: true,
      message: '🎉 Registration successful!',
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        provider: newUser.provider,
        role: newUser.role,
        joinedDate: newUser.createdAt,
        emailDigitsSum: emailAnalysis.totalDigitsSum,
        digitCalculations: emailAnalysis.digitCalculations,
        security: '🔐 Password securely hashed'
      },
      emailAnalysis: emailAnalysis
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Handle specific MongoDB validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// Login user with password comparison
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt:', email);
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Check if User model exists
    if (!User) {
      // Dummy login with password verification
      if (email.includes('test') || email.includes('demo')) {
        const passwordCheck = isStrongPassword(password);
        if (passwordCheck.isValid) {
          const emailAnalysis = calculateEmailDigitsSum(email);
          
          console.log('✅ Dummy login successful with strong password:', email);
          console.log('🧮 Email digits sum:', emailAnalysis.totalDigitsSum);
          
          return res.json({
            success: true,
            message: '🎉 Login successful! (Dummy mode)',
            data: {
              id: 'dummy_123',
              name: 'Test User',
              email: email,
              provider: 'manual',
              role: 'user',
              emailDigitsSum: emailAnalysis.totalDigitsSum,
              digitCalculations: emailAnalysis.digitCalculations,
              lastLogin: new Date().toISOString()
            },
            emailAnalysis: emailAnalysis,
            security: '🔐 Password strength verified',
            note: 'Connect MongoDB for real authentication'
          });
        } else {
          return res.status(401).json({
            success: false,
            message: 'Password too weak for security standards',
            requirements: passwordCheck.checks
          });
        }
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials (Use test email with strong password)'
        });
      }
    }
    
    // Find user in database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Check if user is manual registration user
    if (user.provider !== 'manual') {
      return res.status(401).json({
        success: false,
        message: `This email is registered with ${user.provider}. Please use ${user.provider} login.`
      });
    }
    
    // Check if user has password (should have for manual users)
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication method'
      });
    }
    
    // Compare password with hashed password
    console.log('🔐 Verifying password...');
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Password verification failed for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Calculate email digits sum
    const emailAnalysis = calculateEmailDigitsSum(user.email);
    console.log('🧮 User email digits sum:', emailAnalysis.totalDigitsSum);
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    console.log('✅ User logged in with verified password:', user.email);
    
    res.json({
      success: true,
      message: '🎉 Login successful!',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        provider: user.provider,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        emailDigitsSum: emailAnalysis.totalDigitsSum,
        digitCalculations: emailAnalysis.digitCalculations,
        lastLogin: user.lastLogin,
        preferences: user.preferences
      },
      emailAnalysis: emailAnalysis,
      security: '🔐 Password securely verified'
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Password strength checker endpoint
app.post('/api/auth/check-password', (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }
    
    const passwordCheck = isStrongPassword(password);
    
    res.json({
      success: true,
      message: 'Password strength analyzed',
      strength: {
        isValid: passwordCheck.isValid,
        score: passwordCheck.score,
        level: passwordCheck.score >= 5 ? 'Very Strong' :
               passwordCheck.score >= 4 ? 'Strong' :
               passwordCheck.score >= 3 ? 'Medium' :
               passwordCheck.score >= 2 ? 'Weak' : 'Very Weak',
        checks: {
          'Length (8+ chars)': passwordCheck.checks.length,
          'Uppercase letter': passwordCheck.checks.upperCase,
          'Lowercase letter': passwordCheck.checks.lowerCase,
          'Numbers': passwordCheck.checks.numbers,
          'Special characters': passwordCheck.checks.specialChar
        }
      },
      recommendations: passwordCheck.isValid ? 
        ['✅ Password meets all security requirements'] :
        [
          !passwordCheck.checks.length ? '❌ Use at least 8 characters' : null,
          !passwordCheck.checks.upperCase ? '❌ Add uppercase letters (A-Z)' : null,
          !passwordCheck.checks.lowerCase ? '❌ Add lowercase letters (a-z)' : null,
          !passwordCheck.checks.numbers ? '❌ Add numbers (0-9)' : null,
          !passwordCheck.checks.specialChar ? '❌ Add special characters (!@#$%)' : null
        ].filter(Boolean)
    });
    
  } catch (error) {
    console.error('❌ Password check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking password strength'
    });
  }
});

// ===== GOOGLE OAUTH ROUTES =====

// Start Google OAuth
app.get('/api/auth/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.json({
      error: 'Google OAuth not configured',
      message: 'Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env file',
      setup_url: 'https://console.cloud.google.com/apis/credentials'
    });
  }
  
  console.log('🚀 Starting Google OAuth...');
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

// Google OAuth callback
app.get('/api/auth/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=auth_failed`
  }),
  (req, res) => {
    console.log('✅ Google OAuth callback success');
    console.log('👤 User logged in:', req.user.name);
    
    // Calculate email digits sum for Google user
    if (req.user && req.user.email) {
      const emailAnalysis = calculateEmailDigitsSum(req.user.email);
      console.log('🧮 Google user email digits sum:', emailAnalysis.totalDigitsSum);
    }
    
    // Redirect to frontend with success
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/?login=success`);
  }
);

// Check authentication status
app.get('/api/auth/check', (req, res) => {
  if (req.user) {
    // Calculate email digits sum for authenticated user
    const emailAnalysis = calculateEmailDigitsSum(req.user.email);
    
    res.json({
      success: true,
      isAuthenticated: true,
      user: {
        id: req.user._id || req.user.googleId,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
        role: req.user.role || 'user',
        provider: req.user.provider,
        emailDigitsSum: emailAnalysis.totalDigitsSum,
        digitCalculations: emailAnalysis.digitCalculations,
        loginTime: req.user.lastLogin || req.user.loginTime
      },
      emailAnalysis: emailAnalysis
    });
  } else {
    res.json({
      success: true,
      isAuthenticated: false,
      user: null
    });
  }
});

// Get current user
app.get('/api/auth/me', (req, res) => {
  if (req.user) {
    // Calculate email digits sum for current user
    const emailAnalysis = calculateEmailDigitsSum(req.user.email);
    
    res.json({
      success: true,
      data: {
        id: req.user._id || req.user.googleId,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
        role: req.user.role || 'user',
        provider: req.user.provider,
        phone: req.user.phone,
        preferences: req.user.preferences,
        emailDigitsSum: emailAnalysis.totalDigitsSum,
        digitCalculations: emailAnalysis.digitCalculations,
        joinedDate: req.user.createdAt || null,
        lastLogin: req.user.lastLogin || req.user.loginTime
      },
      emailAnalysis: emailAnalysis
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  if (req.user) {
    const userName = req.user.name;
    req.logout((err) => {
      if (err) {
        console.error('❌ Logout error:', err);
        return res.status(500).json({
          success: false,
          message: 'Error logging out'
        });
      }
      
      req.session.destroy((err) => {
        if (err) {
          console.error('❌ Session destroy error:', err);
        }
        
        res.clearCookie('connect.sid');
        console.log('👋 User logged out:', userName);
        
        res.json({
          success: true,
          message: `Goodbye ${userName}! You have been logged out successfully.`
        });
      });
    });
  } else {
    res.json({
      success: true,
      message: 'Already logged out'
    });
  }
});

// ===== PROPERTIES ROUTES =====

// Get all properties
app.get('/api/properties', async (req, res) => {
  try {
    // If database is connected, try to fetch from database
    if (Property) {
      let properties = await Property.find({ status: 'active' })
        .populate('owner', 'name email avatar')
        .sort({ createdAt: -1 })
        .limit(50);

      // If no properties in database and user is logged in, create sample data
      if (properties.length === 0 && req.user) {
        console.log('📊 Creating sample properties for logged-in user...');
        
        const sampleProperties = [
          {
            title: "Sea View Luxury Apartment",
            price: 25000000,
            location: "Mumbai",
            address: "Bandra West, Mumbai, Maharashtra 400050",
            city: "Mumbai",
            bedrooms: 3,
            bathrooms: 3,
            area: 1200,
            propertyType: "apartment",
            furnishing: "furnished",
            possession: "ready",
            description: "Premium 3BHK apartment with stunning sea views in Bandra West",
            images: [{ url: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80", alt: "Sea View Apartment" }],
            amenities: ["Swimming Pool", "Gym", "Security Guard", "Lift", "Parking"],
            features: ["Sea-facing balconies", "Premium marble flooring", "Central AC"],
            yearBuilt: 2020,
            developer: "Lodha Group",
            owner: req.user._id,
            agent: {
              name: "Priya Sharma",
              phone: "+91 98765 43210",
              email: "priya.sharma@saarthi.com"
            }
          }
        ];

        const createdProperties = await Property.insertMany(sampleProperties);
        console.log(`✅ Created ${createdProperties.length} sample properties in database`);
        
        properties = await Property.find({ status: 'active' })
          .populate('owner', 'name email avatar')
          .sort({ createdAt: -1 });
      }

      return res.json({
        success: true,
        count: properties.length,
        total: properties.length,
        data: properties,
        user: req.user ? req.user.name : 'Guest',
        source: 'database'
      });
    }
    
    // Fallback to sample data if no database
    const sampleProperties = [
      {
        id: 1,
        title: "Sea View Luxury Apartment",
        price: 25000000,
        location: "Mumbai",
        bedrooms: 3,
        bathrooms: 3,
        area: 1200,
        propertyType: "apartment",
        furnishing: "furnished",
        possession: "ready",
        description: "Premium 3BHK apartment with stunning sea views in Bandra West",
        images: ["https://images.unsplash.com/photo-1518780664697-55e3ad937233?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"],
        amenities: ["Swimming Pool", "Gym", "Security Guard", "Lift", "Parking"]
      }
    ];

    res.json({
      success: true,
      count: sampleProperties.length,
      total: sampleProperties.length,
      data: sampleProperties,
      user: req.user ? req.user.name : 'Guest',
      source: 'sample_data',
      note: 'Connect MongoDB to see database properties'
    });

  } catch (error) {
    console.error('❌ Properties fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching properties',
      error: error.message
    });
  }
});

// ===== CONTACT ROUTE =====

// Contact form submission
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message, propertyId, interestedIn } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }

    // If database is available, save to database
    if (Contact) {
      const contactData = {
        name,
        email,
        phone,
        subject,
        message,
        interestedIn,
        source: 'website',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      // Add user if authenticated
      if (req.user && req.user._id) {
        contactData.user = req.user._id;
      }

      // Add property if specified
      if (propertyId) {
        contactData.property = propertyId;
      }

      const contact = await Contact.create(contactData);
      console.log('📞 Contact form saved to database:', contact._id);

      return res.json({
        success: true,
        message: 'Thank you! We will contact you within 24 hours.',
        data: {
          id: contact._id,
          name,
          email,
          subject,
          timestamp: contact.createdAt,
          user: req.user ? req.user.name : 'Guest'
        },
        source: 'database'
      });
    }

    // Fallback: Just log to console
    console.log('📞 Contact form submission (memory):', { name, email, subject });

    res.json({
      success: true,
      message: 'Thank you for contacting us! We will get back to you within 24 hours.',
      data: { 
        name, 
        email, 
        subject, 
        timestamp: new Date().toISOString(),
        user: req.user ? req.user.name : 'Guest'
      },
      source: 'memory'
    });

  } catch (error) {
    console.error('❌ Contact save error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving contact form'
    });
  }
});

// ===== USERS ROUTES WITH EMAIL DIGITS SUM CALCULATION =====

console.log('📝 Registering users routes with individual digits sum calculation...');

// POST /api/users - Individual digits sum calculation of numbers in user emails
app.post('/api/users', async (req, res) => {
  try {
    console.log('🧮 Users individual digits sum calculation API hit via POST!');
    console.log('Request body:', req.body);
    
    // Check if User model is available
    if (!User) {
      console.log('❌ Database not connected, using dummy data');
      
      // Dummy data for testing when database is not available
      const dummyUsers = [
        { name: "Jaskaran Guru", email: "gurujaskaran2006@gmail.com" },
        { name: "John Smith", email: "john123@gmail.com" },
        { name: "Alice Johnson", email: "alice2024@yahoo.com" },
        { name: "Bob Wilson", email: "bob456789@outlook.com" },
        { name: "Sarah Davis", email: "sarah@gmail.com" },
        { name: "Mike Brown", email: "mike789xyz@hotmail.com" },
        { name: "Test User", email: "test1866@gmail.com" }
      ];

      let grandTotalDigitsSum = 0;
      const results = [];

      console.log('🧮 Processing dummy users for INDIVIDUAL DIGITS sum calculation:');
      dummyUsers.forEach((user, index) => {
        const emailAnalysis = calculateEmailDigitsSum(user.email);
        grandTotalDigitsSum += emailAnalysis.totalDigitsSum;
        
        console.log(`\n${index + 1}. ${user.name}: ${user.email}`);
        console.log(`   🔢 Number groups: [${emailAnalysis.numberGroups.join(', ')}]`);
        emailAnalysis.digitCalculations.forEach(calc => {
          console.log(`   📊 ${calc.numberGroup} → ${calc.calculation}`);
        });
        console.log(`   ✅ Total digits sum: ${emailAnalysis.totalDigitsSum}`);
        
        results.push({
          name: user.name,
          email: user.email,
          numberGroups: emailAnalysis.numberGroups,
          individualDigits: emailAnalysis.individualDigits,
          digitCalculations: emailAnalysis.digitCalculations,
          individualDigitsSum: emailAnalysis.totalDigitsSum,
          hasNumbers: emailAnalysis.hasNumbers
        });
      });

      console.log(`\n📊 DUMMY DATA SUMMARY:`);
      console.log(`   🧮 Grand Total Digits Sum: ${grandTotalDigitsSum}`);
      console.log(`   👥 Total Users: ${dummyUsers.length}`);
      console.log(`   🔢 Users with Numbers: ${results.filter(u => u.hasNumbers).length}`);

      return res.json({
        success: true,
        message: '🧮 Dummy users individual digits sum calculation completed',
        source: 'dummy_data',
        calculation_method: 'Individual digits sum (e.g., 2006 → 2+0+0+6 = 8, 1866 → 1+8+6+6 = 21)',
        summary: {
          totalUsers: dummyUsers.length,
          usersWithNumbers: results.filter(u => u.hasNumbers).length,
          grandTotalDigitsSum: grandTotalDigitsSum,
          averageDigitsSumPerUser: parseFloat((grandTotalDigitsSum / dummyUsers.length).toFixed(2))
        },
        data: results,
        note: 'This calculates sum of individual digits in email numbers. Connect MongoDB for real data.'
      });
    }

    // Fetch users from database
    const users = await User.find({})
      .select('name email googleId avatar role provider createdAt lastLogin isActive preferences phone')
      .sort({ createdAt: -1 });

    if (users.length === 0) {
      console.log('⚠️ No users found in database');
      return res.json({
        success: true,
        message: '👥 No users found in database',
        totalUsers: 0,
        totalDigitsSum: 0,
        data: [],
        note: 'Register users to see calculations'
      });
    }

    console.log(`👥 Found ${users.length} users in database, calculating INDIVIDUAL DIGITS sum...`);

    let grandTotalDigitsSum = 0;
    const processedUsers = [];

    // Process each user to find numbers in email and calculate INDIVIDUAL DIGITS sum
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. Processing user: ${user.name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🔗 Provider: ${user.provider}`);
      
      const emailAnalysis = calculateEmailDigitsSum(user.email);
      grandTotalDigitsSum += emailAnalysis.totalDigitsSum;
      
      console.log(`   🔢 Number groups: [${emailAnalysis.numberGroups.join(', ')}]`);
      emailAnalysis.digitCalculations.forEach(calc => {
        console.log(`   📊 ${calc.numberGroup} → ${calc.calculation}`);
      });
      console.log(`   ✅ Total digits sum: ${emailAnalysis.totalDigitsSum}`);
      
      // Store processed user data
      processedUsers.push({
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        provider: user.provider,
        phone: user.phone,
        preferences: user.preferences,
        joinedDate: user.createdAt,
        lastLogin: user.lastLogin,
        isActive: user.isActive,
        emailAnalysis: {
          hasNumbers: emailAnalysis.hasNumbers,
          numberGroups: emailAnalysis.numberGroups,
          individualDigits: emailAnalysis.individualDigits,
          digitCalculations: emailAnalysis.digitCalculations,
          individualDigitsSum: emailAnalysis.totalDigitsSum,
          numberGroupCount: emailAnalysis.numberGroupCount,
          totalDigitsCount: emailAnalysis.totalDigitsCount
        }
      });
    });

    // Calculate statistics
    const usersWithNumbers = processedUsers.filter(user => user.emailAnalysis.hasNumbers);
    const usersWithoutNumbers = processedUsers.filter(user => !user.emailAnalysis.hasNumbers);
    const googleUsers = processedUsers.filter(user => user.provider === 'google');
    const manualUsers = processedUsers.filter(user => user.provider === 'manual');

    console.log(`\n📊 INDIVIDUAL DIGITS CALCULATION RESULTS:`);
    console.log(`   🧮 Grand Total Digits Sum: ${grandTotalDigitsSum}`);
    console.log(`   👥 Total Users: ${users.length}`);
    console.log(`   🔢 Users with Numbers: ${usersWithNumbers.length}`);
    console.log(`   ❌ Users without Numbers: ${usersWithoutNumbers.length}`);
    console.log(`   🔐 Google Users: ${googleUsers.length}`);
    console.log(`   📝 Manual Users: ${manualUsers.length}`);
    console.log(`   📈 Average Digits Sum per User: ${users.length > 0 ? (grandTotalDigitsSum / users.length).toFixed(2) : 0}`);

    // Return comprehensive response
    res.json({
      success: true,
      message: '🧮 Users individual digits sum calculation completed successfully',
      timestamp: new Date().toISOString(),
      source: 'database',
      calculation_method: 'Individual digits sum (e.g., 2006 → 2+0+0+6 = 8, 1866 → 1+8+6+6 = 21)',
      security: '🔐 Secure API with bcrypt password hashing',
      summary: {
        totalUsers: users.length,
        usersWithNumbers: usersWithNumbers.length,
        usersWithoutNumbers: usersWithoutNumbers.length,
        googleUsers: googleUsers.length,
        manualUsers: manualUsers.length,
        grandTotalDigitsSum: grandTotalDigitsSum,
        averageDigitsSumPerUser: users.length > 0 ? parseFloat((grandTotalDigitsSum / users.length).toFixed(2)) : 0,
        averageDigitsSumPerUserWithNumbers: usersWithNumbers.length > 0 ? 
          parseFloat((grandTotalDigitsSum / usersWithNumbers.length).toFixed(2)) : 0
      },
      calculations: processedUsers,
      topUsersDigitsSum: usersWithNumbers
        .sort((a, b) => b.emailAnalysis.individualDigitsSum - a.emailAnalysis.individualDigitsSum)
        .slice(0, 5)
        .map(user => ({
          name: user.name,
          email: user.email,
          provider: user.provider,
          digitsSum: user.emailAnalysis.individualDigitsSum,
          digitCalculations: user.emailAnalysis.digitCalculations
        })),
      breakdown: {
        usersWithNumbers: usersWithNumbers.map(user => ({
          name: user.name,
          email: user.email,
          provider: user.provider,
          numberGroups: user.emailAnalysis.numberGroups,
          individualDigits: user.emailAnalysis.individualDigits,
          digitCalculations: user.emailAnalysis.digitCalculations,
          digitsSum: user.emailAnalysis.individualDigitsSum
        })),
        usersWithoutNumbers: usersWithoutNumbers.map(user => ({
          name: user.name,
          email: user.email,
          provider: user.provider
        })),
        byProvider: {
          google: googleUsers.length,
          manual: manualUsers.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Users digits sum calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating users digits sum',
      error: error.message
    });
  }
});

// GET /api/users - Simple user list with digits sum
app.get('/api/users', async (req, res) => {
  try {
    console.log('📊 Fetching users via GET...');
    
    // Check if User model is available
    if (!User) {
      console.log('❌ Database not connected');
      return res.status(503).json({
        success: false,
        message: '❌ Database not connected',
        note: 'MongoDB connection required to fetch users'
      });
    }

    // Fetch all users from database
    const users = await User.find({})
      .select('name email googleId avatar role provider createdAt lastLogin isActive preferences phone')
      .sort({ createdAt: -1 });

    console.log(`👥 Found ${users.length} users in database`);

    if (users.length === 0) {
      return res.json({
        success: true,
        message: '👥 No users found in database',
        totalUsers: 0,
        data: [],
        note: 'Register users to see them here'
      });
    }

    // Return simple user data with digits sum included
    const userData = users.map(user => {
      const emailAnalysis = calculateEmailDigitsSum(user.email);
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        provider: user.provider,
        phone: user.phone,
        preferences: user.preferences,
        joinedDate: user.createdAt,
        lastLogin: user.lastLogin,
        isActive: user.isActive,
        emailDigitsSum: emailAnalysis.totalDigitsSum,
        digitCalculations: emailAnalysis.digitCalculations
      };
    });

    // Calculate provider statistics
    const googleUsers = userData.filter(user => user.provider === 'google').length;
    const manualUsers = userData.filter(user => user.provider === 'manual').length;
    const totalDigitsSum = userData.reduce((sum, user) => sum + user.emailDigitsSum, 0);

    res.json({
      success: true,
      message: '👥 Users fetched successfully with digits sum',
      totalUsers: users.length,
      statistics: {
        googleUsers,
        manualUsers,
        activeUsers: userData.filter(user => user.isActive).length,
        totalDigitsSum,
        averageDigitsSum: users.length > 0 ? parseFloat((totalDigitsSum / users.length).toFixed(2)) : 0
      },
      data: userData,
      security: '🔐 Secure password storage + individual digits sum',
      calculation_method: 'Individual digits sum (e.g., 2006 → 2+0+0+6 = 8)',
      note: 'Use POST method to /api/users for detailed sum calculations'
    });

  } catch (error) {
    console.error('❌ Users fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

console.log('✅ Users routes registered successfully with individual digits sum calculation');
console.log('🔐 Password hashing implemented with bcrypt');
console.log('🧮 Individual digits sum calculation active');

// ===== 404 HANDLERS =====

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    requested_url: req.originalUrl,
    available_endpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/auth/register',      // 📝 Secure registration with digits sum
      'POST /api/auth/login',         // 🔐 Secure login with digits sum
      'POST /api/auth/check-password', // 🔍 Password strength checker
      'GET /api/auth/google',         // 🔐 Google OAuth
      'GET /api/auth/check',          // ✅ Auth status with digits sum
      'GET /api/auth/me',             // 👤 Current user with digits sum
      'POST /api/auth/logout',        // 🚪 Logout
      'GET /api/properties',          // 🏠 Properties list
      'POST /api/contact',            // 📞 Contact form
      'GET /api/users',               // 👥 Users list with digits sum
      'POST /api/users'               // 🧮 Individual digits sum calculation
    ]
  });
});

// Global 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requested_url: req.originalUrl,
    suggestion: 'Try /api/health for API status'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Saarthi Backend API running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Properties: http://localhost:${PORT}/api/properties`);
  console.log(`🔐 Google OAuth: http://localhost:${PORT}/api/auth/google`);
  console.log(`👥 Users List: http://localhost:${PORT}/api/users`);
  console.log(`🧮 Users Digits Sum: http://localhost:${PORT}/api/users (POST method)`);
  console.log(`📝 Register: http://localhost:${PORT}/api/auth/register`);
  console.log(`🔐 Login: http://localhost:${PORT}/api/auth/login`);
  
  // Configuration check
  console.log('\n📋 Configuration Status:');
  console.log(`   MongoDB: ${process.env.MONGODB_URI ? '✅' : '❌'}`);
  console.log(`   Models: ${User ? '✅ Loaded' : '❌ Not loaded'}`);
  console.log(`   Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✅' : '❌'}`);
  console.log(`   Session Secret: ${process.env.SESSION_SECRET ? '✅' : '❌'}`);
  console.log(`   🔐 Security: ✅ bcrypt password hashing enabled`);
  console.log(`   🔍 Password validation: ✅ Strength checking active`);
  console.log(`   📝 Manual Registration: ✅ Compatible with existing User model`);
  console.log(`   🧮 Individual Digits Sum: ✅ Active (e.g., 2006 → 2+0+0+6 = 8)`);
  console.log(`   🌐 Frontend Compatible: ✅ CORS enabled for frontend integration\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Unhandled Promise Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;
