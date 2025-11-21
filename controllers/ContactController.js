const Contact = require('../models/Contact');
const Property = require('../models/Property');


const submitContact = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      subject,
      message,
      propertyInterest,
      propertyId,
      interestedIn
    } = req.body;

    // Create contact entry
    const contactData = {
      name,
      email,
      phone,
      subject,
      message,
      propertyInterest,
      interestedIn,
      source: 'website',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Add user if authenticated
    if (req.user) {
      contactData.user = req.user._id;
    }

    // Add property if specified
    if (propertyId) {
      const property = await Property.findById(propertyId);
      if (property) {
        contactData.property = propertyId;
        // Increment property inquiries
        await Property.findByIdAndUpdate(
          propertyId,
          { $inc: { inquiries: 1 } },
          { new: false }
        );
      }
    }

    const contact = await Contact.create(contactData);

    res.status(201).json({
      success: true,
      message: 'Thank you for your inquiry! We will get back to you within 24 hours.',
      data: {
        id: contact._id,
        submittedAt: contact.createdAt
      }
    });

  } catch (error) {
    console.error('Contact submission error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error submitting contact form'
    });
  }
};


const getAllContacts = async (req, res) => {
  try {
    const {
      status,
      subject,
      priority,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    let query = {};
    if (status) query.status = status;
    if (subject) query.subject = subject;
    if (priority) query.priority = priority;

    // Pagination
    const currentPage = parseInt(page);
    const perPage = parseInt(limit);
    const skip = (currentPage - 1) * perPage;

    const contacts = await Contact.find(query)
      .populate('user', 'name email avatar')
      .populate('property', 'title price location')
      .populate('responseBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage);

    const total = await Contact.countDocuments(query);

    res.json({
      success: true,
      count: contacts.length,
      total,
      totalPages: Math.ceil(total / perPage),
      currentPage,
      data: contacts
    });

  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts'
    });
  }
};

// @desc    Update contact status (admin only)
// @route   PUT /api/contact/:id
// @access  Private/Admin
const updateContact = async (req, res) => {
  try {
    const { status, priority, responseMessage } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    
    if (responseMessage) {
      updateData.responseMessage = responseMessage;
      updateData.responseBy = req.user._id;
      updateData.responseAt = new Date();
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('user', 'name email')
     .populate('property', 'title price location');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: contact
    });

  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating contact'
    });
  }
};

module.exports = {
  submitContact,
  getAllContacts,
  updateContact
};
