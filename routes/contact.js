// Contact with database
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message, propertyId, interestedIn } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }

    const contactData = {
      name,
      email,
      phone,
      subject,
      message,
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
      contactData.property = propertyId;
    }

    const contact = await Contact.create(contactData);
    console.log('📞 Contact form submission saved:', contact._id);

    res.json({
      success: true,
      message: 'Thank you! We will contact you within 24 hours.',
      data: {
        id: contact._id,
        name,
        email,
        subject,
        timestamp: contact.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Contact save error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving contact form'
    });
  }
});
