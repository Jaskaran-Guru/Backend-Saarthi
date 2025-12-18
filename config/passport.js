const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User'); // Tumhara User Model Import karo

module.exports = function(passport) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
    proxy: true // IMPORTANT: Render deployment ke liye zaroori hai (HTTPS redirect fix)
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // 1. Check if user already exists in DB
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        // User mil gaya -> Login success
        console.log('✅ Existing Google user login:', user.email);
        return done(null, user);
      } 
      
      // 2. Check if email exists (Link Google to existing email account)
      const existingUser = await User.findOne({ email: profile.emails[0].value });
      if (existingUser) {
        console.log('🔗 Linking Google to existing email:', existingUser.email);
        existingUser.googleId = profile.id;
        existingUser.avatar = profile.photos[0]?.value;
        await existingUser.save();
        return done(null, existingUser);
      }

      // 3. New User -> Create in DB
      const newUser = await User.create({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        avatar: profile.photos[0]?.value,
        provider: 'google'
      });
      
      console.log('🎉 New Google user created:', newUser.email);
      return done(null, newUser);

    } catch (error) {
      console.error('❌ Google OAuth Database Error:', error);
      return done(error, null);
    }
  }));

  // Serialize: Sirf ID save karo session mein (Lightweight)
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize: ID se pura user DB se nikalo
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
