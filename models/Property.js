const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Property title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Property description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Property price is required'],
    min: [0, 'Price cannot be negative']
  },
  location: {
    type: String,
    required: [true, 'Location is required']
  },
  address: {
    type: String,
    required: [true, 'Full address is required']
  },
  city: {
    type: String,
    required: [true, 'City is required']
  },
  propertyType: {
    type: String,
    enum: ['apartment', 'villa', 'house', 'plot', 'commercial'],
    required: [true, 'Property type is required']
  },
  bedrooms: {
    type: Number,
    required: [true, 'Number of bedrooms is required'],
    min: [0, 'Bedrooms cannot be negative']
  },
  bathrooms: {
    type: Number,
    required: [true, 'Number of bathrooms is required'],
    min: [0, 'Bathrooms cannot be negative']
  },
  area: {
    type: Number,
    required: [true, 'Property area is required'],
    min: [1, 'Area must be at least 1 sq ft']
  },
  furnishing: {
    type: String,
    enum: ['furnished', 'semi-furnished', 'unfurnished'],
    required: [true, 'Furnishing status is required']
  },
  possession: {
    type: String,
    enum: ['ready', 'under-construction', 'new-launch'],
    required: [true, 'Possession status is required']
  },
  amenities: [{
    type: String,
    trim: true
  }],
  images: [{
    url: String,
    alt: String
  }],
  features: [{
    type: String,
    trim: true
  }],
  
  // Owner Information
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agent: {
    name: String,
    phone: String,
    email: String,
    image: String
  },
  
  // Property Details
  yearBuilt: {
    type: Number,
    min: [1900, 'Year built cannot be before 1900'],
    max: [new Date().getFullYear() + 2, 'Year built cannot be more than 2 years in future']
  },
  developer: String,
  rera: String,
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'sold', 'rented'],
    default: 'active'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  inquiries: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
propertySchema.index({ city: 1, propertyType: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ owner: 1 });

module.exports = mongoose.model('Property', propertySchema);
