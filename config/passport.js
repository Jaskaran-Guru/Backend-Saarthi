const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User'); // Tumhara User Model Import karo

module.exports = function(passport) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
    proxy: true 
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        
        console.log('✅ Existing Google user login:', user.email);
        return done(null, user);
      } 
      
      
      const existingUser = await User.findOne({ email: profile.emails[0].value });
      if (existingUser) {
        console.log('🔗 Linking Google to existing email:', existingUser.email);
        existingUser.googleId = profile.id;
        existingUser.avatar = profile.photos[0]?.value;
        await existingUser.save();
        return done(null, existingUser);
      }

      
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

  
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
