const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  // Basic Info
  title: { type: String, required: true },
  description: { type: String },
  propertyType: { type: String }, // Made optional
  listingType: { type: String },  // Made optional

  // Location (Accepts both flat and nested structure)
  address: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  locality: { type: String },
  location: { type: Object }, // Catch-all for nested location

  // Specs
  bedrooms: { type: mongoose.Schema.Types.Mixed }, // Accepts "2" or 2
  bathrooms: { type: mongoose.Schema.Types.Mixed },
  balconies: { type: mongoose.Schema.Types.Mixed },
  area: { type: Number },
  areaUnit: { type: String, default: 'sqft' },
  furnished: { type: String },
  facing: { type: String },
  floor: { type: mongoose.Schema.Types.Mixed },
  totalFloors: { type: mongoose.Schema.Types.Mixed },

  // Pricing
  price: { type: Number, required: true },
  pricePerSqft: { type: Number },
  maintenanceCharges: { type: Number },
  priceNegotiable: { type: Boolean, default: false },

  // Amenities
  amenities: [{ type: String }],

  // Additional
  yearBuilt: { type: mongoose.Schema.Types.Mixed },
  possession: { type: String },
  parkingSpaces: { type: mongoose.Schema.Types.Mixed },

  // Owner Info (Handling both structures)
  ownerName: { type: String },
  ownerPhone: { type: String },
  ownerEmail: { type: String },
  owner: { type: Object }, // Catch-all for nested owner object

  // Images
  images: [{ type: String }], 

  // Meta
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
}, { strict: false }); // <--- YE SABSE IMPORTANT HAI: Allows extra fields!

module.exports = mongoose.model('Property', propertySchema);
