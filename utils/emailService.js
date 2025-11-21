const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Send email function
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const message = {
      from: `Saarthi Real Estate <${process.env.EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    const info = await transporter.sendMail(message);
    
    console.log('📧 Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
};

// Email templates
const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to Saarthi Real Estate',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #36a35a 0%, #2a8346 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Saarthi!</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${name}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Welcome to Saarthi Real Estate! We're excited to have you join our community of 
            property enthusiasts. You now have access to:
          </p>
          
          <ul style="color: #666; line-height: 1.8;">
            <li>🏠 Premium property listings across India</li>
            <li>❤️ Save your favorite properties</li>
            <li>💰 EMI calculator and loan assistance</li>
            <li>📞 Direct contact with verified agents</li>
            <li>🔔 Personalized property recommendations</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}" 
               style="background: #36a35a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Start Exploring Properties
            </a>
          </div>
          
          <p style="color: #888; font-size: 14px; text-align: center;">
            Need help? Reply to this email or call us at +91 98765 43210
          </p>
        </div>
      </div>
    `
  }),

  contactConfirmation: (name, subject) => ({
    subject: 'Thank you for contacting Saarthi Real Estate',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #36a35a; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Thank You!</h1>
        </div>
        
        <div style="padding: 30px;">
          <p>Dear ${name},</p>
          
          <p>We have received your inquiry regarding: <strong>${subject}</strong></p>
          
          <p>Our expert team will review your requirements and get back to you within 24 hours.</p>
          
          <div style="background: #f0f9f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #36a35a; margin: 0 0 10px 0;">What happens next?</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Our property expert will contact you</li>
              <li>We'll understand your specific requirements</li>
              <li>Get personalized property recommendations</li>
              <li>Schedule property visits if interested</li>
            </ul>
          </div>
          
          <p>Best regards,<br>
          <strong>Saarthi Real Estate Team</strong><br>
          📞 +91 98765 43210 | ✉️ info@saarthi.com</p>
        </div>
      </div>
    `
  }),

  propertyInquiry: (propertyTitle, userName, userEmail, userPhone, message) => ({
    subject: `New Property Inquiry - ${propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #36a35a; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Property Inquiry</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #333;">Property: ${propertyTitle}</h2>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
            <h3 style="margin: 0 0 15px 0;">Customer Details:</h3>
            <p><strong>Name:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Phone:</strong> ${userPhone}</p>
            
            <h3 style="margin: 20px 0 10px 0;">Message:</h3>
            <p style="background: white; padding: 15px; border-radius: 4px;">${message}</p>
          </div>
          
          <p style="color: #666; margin-top: 20px;">
            Please contact the customer within 24 hours for the best conversion rate.
          </p>
        </div>
      </div>
    `
  })
};

module.exports = {
  sendEmail,
  emailTemplates
};
