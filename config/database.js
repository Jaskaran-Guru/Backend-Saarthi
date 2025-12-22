const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`🗄️  Database Name: ${conn.connection.name}`);
    
    
    console.log('🧪 Testing database connection...');
    await mongoose.connection.db.admin().ping();
    console.log('🎉 MongoDB connection test successful!');

  } catch (error) {
    console.error(`❌ Database connection failed: ${error.message}`);
    console.error('Full error:', error);
    
    
    console.log('⚠️  Continuing without database...');
  }
};

module.exports = connectDB;
