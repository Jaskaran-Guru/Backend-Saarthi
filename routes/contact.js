const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const { isAuthenticated } = require('../middleware/auth');

// POST /api/contact - General inquiries and site tour bookings
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      subject,
      message,
      propertyId,
      interestedIn,
      tourDate,
      tourTime,
      tourType
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    const contactData = {
      name,
      email,
      phone: phone || '',
      subject: subject || (tourDate ? `Site Tour Request - ${tourType || 'In-Person'}` : 'Property Inquiry'),
      message: message || `Interested in property inquiry.`,
      propertyInterest: propertyId || '',
      interestedIn: interestedIn || (tourDate ? 'site-visit' : 'general'),
      source: 'website',
      createdAt: new Date()
    };

    if (req.user) {
      contactData.user = req.user._id;
    }

    const savedContact = await Contact.create(contactData);

    // If tour request, also create a Booking entry
    let bookingEntry = null;
    if (tourDate && propertyId) {
      try {
        bookingEntry = await Booking.create({
          property: propertyId.match(/^[0-9a-fA-F]{24}$/) ? propertyId : undefined,
          user: req.user ? req.user._id : undefined,
          visitDate: new Date(tourDate),
          visitTime: tourTime || '11:00 AM',
          message: `${tourType || 'In-Person'} Visit requested by ${name}. Note: ${message || ''}`,
          contactInfo: { name, email, phone },
          status: 'pending'
        });
      } catch (bookErr) {
        console.warn('Booking creation warning:', bookErr.message);
      }
    }

    console.log('📞 Contact & Tour Lead saved:', savedContact._id);

    res.status(201).json({
      success: true,
      message: tourDate 
        ? `Site visit successfully scheduled for ${new Date(tourDate).toLocaleDateString()} at ${tourTime || '11:00 AM'}! Our dedicated concierge will reach out via WhatsApp/Phone.`
        : 'Thank you! Your inquiry has been received. Our Saarthi property advisor will connect with you within 24 hours.',
      data: {
        id: savedContact._id,
        bookingId: bookingEntry ? bookingEntry._id : null,
        name,
        email
      }
    });

  } catch (error) {
    console.error('❌ Contact submit error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing your request'
    });
  }
});

// GET /api/contact/my-bookings - Get user's tour bookings and inquiries
router.get('/my-bookings', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const userEmail = req.user.email;

    // Find bookings
    const bookings = await Booking.find({
      $or: [
        { user: userId },
        { 'contactInfo.email': userEmail }
      ]
    }).sort({ visitDate: -1, createdAt: -1 });

    // Populate property data
    const populatedBookings = await Promise.all(bookings.map(async (booking) => {
      const bObj = booking.toObject();
      if (bObj.property) {
        try {
          const prop = await Property.findById(bObj.property).select('title address city price propertyType images');
          bObj.propertyDetails = prop;
        } catch (e) {
          // Property not found or deleted
        }
      }
      return bObj;
    }));

    // Find general inquiries
    const inquiries = await Contact.find({
      $or: [
        { user: userId },
        { email: userEmail }
      ]
    }).sort({ createdAt: -1 }).limit(20);

    res.json({
      success: true,
      data: {
        bookings: populatedBookings,
        inquiries
      }
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/contact/bookings/:id/cancel - Cancel a tour booking
router.patch('/bookings/:id/cancel', isAuthenticated, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (booking.user && booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    booking.status = 'cancelled';
    await booking.save();
    res.json({ success: true, message: 'Tour booking cancelled successfully', data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/contact - Admin list of inquiries
router.get('/', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, count: contacts.length, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
