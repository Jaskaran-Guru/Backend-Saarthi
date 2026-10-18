const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { isAuthenticated } = require('../middleware/auth');

// All favorite routes require authentication
router.get('/', isAuthenticated, favoriteController.getFavorites);
router.post('/', isAuthenticated, favoriteController.addFavorite);
router.delete('/:propertyId', isAuthenticated, favoriteController.removeFavorite);
router.get('/check/:propertyId', isAuthenticated, favoriteController.checkFavorite);
router.delete('/', isAuthenticated, favoriteController.clearAllFavorites);

module.exports = router;
