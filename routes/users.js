const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const User = require('../models/User');


router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        phone: user.phone,
        role: user.role,
        preferences: user.preferences,
        joinedDate: user.joinedDate,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


router.put('/profile', isAuthenticated, async (req, res) => {
  try {
    const { name, phone, preferences } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields only
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
});

// GET /api/users/saved-searches
router.get('/saved-searches', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: user.savedSearches || []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users/saved-searches
router.post('/saved-searches', isAuthenticated, async (req, res) => {
  try {
    const { name, params } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.savedSearches) user.savedSearches = [];
    
    // Prevent duplicate saves
    user.savedSearches.unshift({
      name: name || 'Custom Search',
      params: params || {},
      createdAt: new Date()
    });

    // Keep up to 25 saved searches
    if (user.savedSearches.length > 25) {
      user.savedSearches = user.savedSearches.slice(0, 25);
    }

    await user.save();
    res.status(201).json({
      success: true,
      message: 'Search criteria saved to your profile!',
      data: user.savedSearches
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/users/saved-searches/:id
router.delete('/saved-searches/:id', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.savedSearches) {
      user.savedSearches = user.savedSearches.filter(
        s => s._id && s._id.toString() !== req.params.id
      );
      await user.save();
    }

    res.json({
      success: true,
      message: 'Saved search removed',
      data: user.savedSearches || []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    
    let query = {};
    
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const currentPage = parseInt(page);
    const perPage = parseInt(limit);
    const skip = (currentPage - 1) * perPage;

    const users = await User.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / perPage),
      currentPage,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});


router.put('/:id/role', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'agent', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user role'
    });
  }
});


router.delete('/profile', isAuthenticated, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    
    // Clear session
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({
          success: true,
          message: 'Account deleted successfully'
        });
      });
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account'
    });
  }
});

module.exports = router;
