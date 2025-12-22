const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  subject: { type: String },
  message: { type: String, required: true },
  propertyInterest: { type: String }, 
  createdAt: { type: Date, default: Date.now }
}, { strict: false }); 

module.exports = mongoose.model('Contact', contactSchema);
