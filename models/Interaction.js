const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'property_view',
      'property_favorited',
      'property_unfavorited',
      'contact_agent_click',
      'schedule_visit_click',
      'emi_calculator_open',
      'contact_form_submit',
      'search_performed',
      'filter_applied',
      'login_modal_open',
      'google_login_attempt',
      'favorites_click',
      'add_property_click',
      'navigation_click',
      'map_view_toggle',
      'property_share',
      'brochure_download'
    ]
  },
  details: {
    propertyId: mongoose.Schema.Types.ObjectId,
    propertyTitle: String,
    propertyPrice: Number,
    searchQuery: String,
    filters: mongoose.Schema.Types.Mixed,
    page: String,
    url: String,
    userAgent: String,
    ipAddress: String,
    sessionId: String,
    source: String,
    timestamp: Date
  },
  session: {
    sessionId: String,
    device: String,
    browser: String,
    os: String,
    referrer: String
  }
}, {
  timestamps: true
});

// Indexes for analytics queries
interactionSchema.index({ user: 1, createdAt: -1 });
interactionSchema.index({ action: 1, createdAt: -1 });
interactionSchema.index({ 'details.propertyId': 1 });
interactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Interaction', interactionSchema);
