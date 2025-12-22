const mongoose = require('mongoose');

const userInteractionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'page_view', 'property_view', 'property_search',
      'property_favorite', 'booking_request', 'contact_form', 'property_add',
      'profile_update', 'filter_applied'
    ]
  },
  details: {
    page: String,
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property'
    },
    searchQuery: String,
    filters: mongoose.Schema.Types.Mixed,
    formData: mongoose.Schema.Types.Mixed,
    userAgent: String,
    ip: String,
    location: {
      city: String,
      state: String,
      country: String
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});


userInteractionSchema.index({ user: 1, timestamp: -1 });
userInteractionSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('UserInteraction', userInteractionSchema);
