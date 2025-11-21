const Favorite = require('../models/Favorite');
const Property = require('../models/Property');

const getFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user._id })
      .populate({
        path: 'property',
        populate: {
          path: 'owner',
          select: 'name email avatar'
        }
      })
      .sort({ addedAt: -1 });

    res.json({
      success: true,
      count: favorites.length,
      data: favorites
    });

  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching favorites'
    });
  }
};


const addFavorite = async (req, res) => {
  try {
    const { propertyId, notes } = req.body;

    // Check if property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if already in favorites
    const existingFavorite = await Favorite.findOne({
      user: req.user._id,
      property: propertyId
    });

    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Property already in favorites'
      });
    }

    // Add to favorites
    const favorite = await Favorite.create({
      user: req.user._id,
      property: propertyId,
      notes
    });

    await favorite.populate('property');

    res.status(201).json({
      success: true,
      message: 'Property added to favorites',
      data: favorite
    });

  } catch (error) {
    console.error('Add favorite error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Property already in favorites'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error adding to favorites'
    });
  }
};

// @desc    Remove property from favorites
// @route   DELETE /api/favorites/:propertyId
// @access  Private
const removeFavorite = async (req, res) => {
  try {
    const { propertyId } = req.params;

    const favorite = await Favorite.findOneAndDelete({
      user: req.user._id,
      property: propertyId
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }

    res.json({
      success: true,
      message: 'Property removed from favorites'
    });

  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing from favorites'
    });
  }
};

// @desc    Check if property is in user's favorites
// @route   GET /api/favorites/check/:propertyId
// @access  Private
const checkFavorite = async (req, res) => {
  try {
    const { propertyId } = req.params;

    const favorite = await Favorite.findOne({
      user: req.user._id,
      property: propertyId
    });

    res.json({
      success: true,
      isFavorite: !!favorite
    });

  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking favorite status'
    });
  }
};

// @desc    Clear all favorites
// @route   DELETE /api/favorites
// @access  Private
const clearAllFavorites = async (req, res) => {
  try {
    const result = await Favorite.deleteMany({ user: req.user._id });

    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} favorites`
    });

  } catch (error) {
    console.error('Clear favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing favorites'
    });
  }
};

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
  clearAllFavorites
};
