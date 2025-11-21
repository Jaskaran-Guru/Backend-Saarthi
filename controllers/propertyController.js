const Property = require('../models/Property');

const getProperties = async (req, res) => {
  try {
    const {
      search,
      location,
      propertyType,
      minPrice,
      maxPrice,
      bedrooms,
      furnishing,
      possession,
      amenities,
      minArea,
      maxArea,
      page = 1,
      limit = 12,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build query
    let query = { status: 'active' };

    // Search in title and description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Location filter
    if (location) {
      query.city = { $regex: location, $options: 'i' };
    }

    // Property type filter
    if (propertyType) {
      query.propertyType = propertyType;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice) * 10000000; // Convert crore to rupees
      if (maxPrice) query.price.$lte = parseFloat(maxPrice) * 10000000;
    }

    // Bedrooms filter
    if (bedrooms) {
      query.bedrooms = { $gte: parseInt(bedrooms) };
    }

    // Furnishing filter
    if (furnishing) {
      query.furnishing = furnishing;
    }

    // Possession filter
    if (possession) {
      query.possession = possession;
    }

    // Area filter
    if (minArea || maxArea) {
      query.area = {};
      if (minArea) query.area.$gte = parseInt(minArea);
      if (maxArea) query.area.$lte = parseInt(maxArea);
    }

    // Amenities filter
    if (amenities) {
      const amenitiesArray = Array.isArray(amenities) ? amenities : [amenities];
      query.amenities = { $in: amenitiesArray };
    }

    // Sorting
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = {};
    sortObj[sort] = sortOrder;

    // Pagination
    const currentPage = parseInt(page);
    const perPage = parseInt(limit);
    const skip = (currentPage - 1) * perPage;

    // Execute query
    const properties = await Property.find(query)
      .populate('owner', 'name email avatar')
      .sort(sortObj)
      .skip(skip)
      .limit(perPage);

    // Get total count
    const total = await Property.countDocuments(query);

    res.json({
      success: true,
      count: properties.length,
      total,
      totalPages: Math.ceil(total / perPage),
      currentPage,
      data: properties
    });

  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching properties'
    });
  }
};


const getProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('owner', 'name email avatar phone');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Increment view count
    try {
      await Property.findByIdAndUpdate(
        req.params.id,
        { $inc: { views: 1 } },
        { new: false }
      );
    } catch (viewError) {
      console.error('View increment error:', viewError);
    }

    res.json({
      success: true,
      data: property
    });

  } catch (error) {
    console.error('Get property error:', error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching property'
    });
  }
};


const createProperty = async (req, res) => {
  try {
    // Add owner to property data
    const propertyData = { ...req.body };
    propertyData.owner = req.user._id;

    // Set agent info if provided
    if (req.body.agentInfo) {
      propertyData.agent = req.body.agentInfo;
      delete propertyData.agentInfo; // Remove the temporary field
    } else {
      // Use owner info as default agent
      propertyData.agent = {
        name: req.user.name,
        phone: req.user.phone || '',
        email: req.user.email,
        image: req.user.avatar || ''
      };
    }

    const property = await Property.create(propertyData);

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property
    });

  } catch (error) {
    console.error('Create property error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Property with this information already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating property'
    });
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private
const updateProperty = async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if user owns the property or is admin
    if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property'
      });
    }

    property = await Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: property
    });

  } catch (error) {
    console.error('Update property error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating property'
    });
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private
const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if user owns the property or is admin
    if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this property'
      });
    }

    await Property.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });

  } catch (error) {
    console.error('Delete property error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting property'
    });
  }
};

// @desc    Get featured properties
// @route   GET /api/properties/featured
// @access  Public
const getFeaturedProperties = async (req, res) => {
  try {
    const properties = await Property.find({
      status: 'active',
      isFeatured: true
    })
    .populate('owner', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(8);

    res.json({
      success: true,
      count: properties.length,
      data: properties
    });

  } catch (error) {
    console.error('Get featured properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured properties'
    });
  }
};

module.exports = {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getFeaturedProperties
};
