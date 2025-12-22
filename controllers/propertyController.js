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

    
    let query = { status: 'active' };

    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

   
    if (location) {
      query.city = { $regex: location, $options: 'i' };
    }

    
    if (propertyType) {
      query.propertyType = propertyType;
    }

    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice) * 10000000; 
      if (maxPrice) query.price.$lte = parseFloat(maxPrice) * 10000000;
    }

    
    if (bedrooms) {
      query.bedrooms = { $gte: parseInt(bedrooms) };
    }

   
    if (furnishing) {
      query.furnishing = furnishing;
    }

   
    if (possession) {
      query.possession = possession;
    }

  
    if (minArea || maxArea) {
      query.area = {};
      if (minArea) query.area.$gte = parseInt(minArea);
      if (maxArea) query.area.$lte = parseInt(maxArea);
    }

    
    if (amenities) {
      const amenitiesArray = Array.isArray(amenities) ? amenities : [amenities];
      query.amenities = { $in: amenitiesArray };
    }

    
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = {};
    sortObj[sort] = sortOrder;

    
    const currentPage = parseInt(page);
    const perPage = parseInt(limit);
    const skip = (currentPage - 1) * perPage;

    
    const properties = await Property.find(query)
      .populate('owner', 'name email avatar')
      .sort(sortObj)
      .skip(skip)
      .limit(perPage);

   
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
    
    const propertyData = { ...req.body };
    propertyData.owner = req.user._id;

   
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


const updateProperty = async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

   
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


const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

   
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
