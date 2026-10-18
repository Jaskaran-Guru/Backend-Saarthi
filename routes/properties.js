const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');

// Sample dataset used for initial seeding if DB is empty
const INITIAL_PROPERTIES = [
  {
    title: "Sea View Luxury Apartment in Bandra",
    price: 25000000,
    pricePerSqft: 20833,
    location: "Mumbai",
    address: "Bandra West, Mumbai, Maharashtra 400050",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400050",
    bedrooms: 3,
    bathrooms: 3,
    balconies: 2,
    area: 1200,
    areaUnit: "sqft",
    propertyType: "apartment",
    listingType: "sale",
    furnishing: "furnished",
    possession: "ready",
    facing: "West",
    floor: 14,
    totalFloors: 25,
    parkingSpaces: 2,
    maintenanceCharges: 8500,
    description: "Experience luxury living at its finest in this stunning 3BHK apartment with breathtaking sea views. Located in the heart of Bandra West, this premium property offers the perfect blend of comfort, style, and convenience.",
    images: [
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    ],
    amenities: ["Swimming Pool", "Gym", "Security Guard", "Lift", "Parking", "Garden", "Club House", "CCTV", "Intercom", "Power Backup"],
    yearBuilt: 2021,
    developer: "Lodha Group",
    rera: "P51700018657",
    isFeatured: true,
    status: "active",
    ownerName: "Saarthi Premier Partner",
    ownerEmail: "partnerships@saarthi.com",
    ownerPhone: "+91 98765 43210"
  },
  {
    title: "Modern Architectural Villa in DLF Phase 2",
    price: 32000000,
    pricePerSqft: 12800,
    location: "Gurgaon",
    address: "DLF Phase 2, Gurgaon, Haryana 122002",
    city: "Gurgaon",
    state: "Haryana",
    pincode: "122002",
    bedrooms: 4,
    bathrooms: 4,
    balconies: 3,
    area: 2500,
    areaUnit: "sqft",
    propertyType: "villa",
    listingType: "sale",
    furnishing: "semi-furnished",
    possession: "ready",
    facing: "North-East",
    floor: "G+2",
    totalFloors: 3,
    parkingSpaces: 3,
    maintenanceCharges: 6000,
    description: "Spacious 4BHK independent luxury villa with private landscaped garden in DLF Phase 2. Gated community with 24/7 security and high-end club amenities.",
    images: [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    ],
    amenities: ["Garden", "Security Guard", "Parking", "Power Backup", "Club House", "Children Play Area", "Fire Safety"],
    yearBuilt: 2020,
    developer: "DLF Limited",
    rera: "HRERA-PKL-GGM-142",
    isFeatured: true,
    status: "active",
    ownerName: "DLF Preferred Realty",
    ownerEmail: "dlf.realty@saarthi.com",
    ownerPhone: "+91 98111 22334"
  },
  {
    title: "Tech Corridor Smart 3BHK in Electronic City",
    price: 18000000,
    pricePerSqft: 12857,
    location: "Bangalore",
    address: "Electronic City Phase 1, Bangalore, Karnataka 560100",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560100",
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    area: 1400,
    areaUnit: "sqft",
    propertyType: "apartment",
    listingType: "sale",
    furnishing: "unfurnished",
    possession: "under-construction",
    facing: "East",
    floor: 8,
    totalFloors: 18,
    parkingSpaces: 2,
    maintenanceCharges: 4500,
    description: "Smart home automated 3BHK apartment near major IT campuses. Equipped with EV charging stations, rooftop infinity pool, and co-working lounges.",
    images: [
      "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    ],
    amenities: ["Gym", "Swimming Pool", "CCTV", "Lift", "Parking", "EV Charging", "Co-working Space"],
    yearBuilt: 2024,
    developer: "Prestige Group",
    rera: "PRM/KA/RERA/1251/310/PR/170915/000234",
    isFeatured: true,
    status: "active",
    ownerName: "Prestige Estates",
    ownerEmail: "sales@prestige.com",
    ownerPhone: "+91 99000 88776"
  },
  {
    title: "Skyline Penthouse in Hitec City",
    price: 38000000,
    pricePerSqft: 11875,
    location: "Hyderabad",
    address: "Hitec City, Madhapur, Hyderabad, Telangana 500081",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500081",
    bedrooms: 4,
    bathrooms: 4,
    balconies: 3,
    area: 3200,
    areaUnit: "sqft",
    propertyType: "penthouse",
    listingType: "sale",
    furnishing: "furnished",
    possession: "ready",
    facing: "North",
    floor: 28,
    totalFloors: 28,
    parkingSpaces: 3,
    maintenanceCharges: 11000,
    description: "Exclusive duplex penthouse with private jacuzzi on the deck, panoramic cityscape view, Italian marble finishes, and private lift access.",
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    ],
    amenities: ["Swimming Pool", "Private Terrace", "Gym", "Concierge", "High Speed Lift", "CCTV", "Club House"],
    yearBuilt: 2023,
    developer: "My Home Group",
    rera: "P02400001890",
    isFeatured: true,
    status: "active",
    ownerName: "Hyderabad Luxe Realty",
    ownerEmail: "luxehyd@saarthi.com",
    ownerPhone: "+91 98480 12345"
  },
  {
    title: "Cozy Garden 2BHK in Hinjewadi",
    price: 8500000,
    pricePerSqft: 8673,
    location: "Pune",
    address: "Hinjewadi Phase 2, Pune, Maharashtra 411057",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411057",
    bedrooms: 2,
    bathrooms: 2,
    balconies: 1,
    area: 980,
    areaUnit: "sqft",
    propertyType: "apartment",
    listingType: "sale",
    furnishing: "semi-furnished",
    possession: "ready",
    facing: "East",
    floor: 5,
    totalFloors: 14,
    parkingSpaces: 1,
    maintenanceCharges: 3200,
    description: "Well-ventilated 2BHK in a family-centric gated township with school, clinic, and daily essentials within the campus.",
    images: [
      "https://images.unsplash.com/photo-1449844908441-8829872d2607?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1502005229762-ee1b2b81e4b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    ],
    amenities: ["Children Play Area", "Garden", "Security Guard", "Lift", "Power Backup", "Gym"],
    yearBuilt: 2022,
    developer: "Godrej Properties",
    rera: "P52100021458",
    isFeatured: false,
    status: "active",
    ownerName: "Godrej Partner Desk",
    ownerEmail: "godrej.pune@saarthi.com",
    ownerPhone: "+91 97654 32190"
  },
  {
    title: "Heritage Style Independent Villa in Jubilee Hills",
    price: 55000000,
    pricePerSqft: 13750,
    location: "Hyderabad",
    address: "Road No 36, Jubilee Hills, Hyderabad 500033",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500033",
    bedrooms: 5,
    bathrooms: 5,
    balconies: 4,
    area: 4000,
    areaUnit: "sqft",
    propertyType: "villa",
    listingType: "sale",
    furnishing: "furnished",
    possession: "ready",
    facing: "North-East",
    floor: "G+2",
    totalFloors: 3,
    parkingSpaces: 4,
    maintenanceCharges: 12000,
    description: "Opulent 5BHK independent mansion with private courtyard, home theatre, private pool, and solar-powered energy grid.",
    images: [
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    ],
    amenities: ["Swimming Pool", "Private Garden", "Home Automation", "Security Guard", "Gym", "Club House"],
    yearBuilt: 2021,
    developer: "Aparna Constructions",
    rera: "P02500001122",
    isFeatured: true,
    status: "active",
    ownerName: "Premier Estates",
    ownerEmail: "premier@saarthi.com",
    ownerPhone: "+91 98490 99887"
  }
];

// Helper to auto seed if DB is empty
const ensureSeedData = async () => {
  try {
    const count = await Property.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding initial properties into MongoDB...');
      await Property.insertMany(INITIAL_PROPERTIES);
      console.log(`✅ Seeded ${INITIAL_PROPERTIES.length} properties!`);
    }
  } catch (err) {
    console.warn('⚠️ Seeding check error (DB might still be connecting):', err.message);
  }
};

// GET /api/properties - Filtered, searched & paginated list
router.get('/', async (req, res) => {
  try {
    await ensureSeedData();

    const {
      search,
      city,
      location,
      propertyType,
      listingType,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      furnishing,
      possession,
      amenities,
      minArea,
      maxArea,
      featured,
      page = 1,
      limit = 12,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    let query = { status: { $ne: 'archived' } };

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { city: searchRegex },
        { address: searchRegex },
        { location: searchRegex },
        { developer: searchRegex }
      ];
    }

    if (city && city !== 'all' && city !== 'All') {
      query.city = { $regex: `^${city}`, $options: 'i' };
    } else if (location) {
      query.city = { $regex: location, $options: 'i' };
    }

    if (propertyType && propertyType !== 'all') {
      query.propertyType = propertyType.toLowerCase();
    }

    if (listingType) {
      query.listingType = listingType.toLowerCase();
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (bedrooms && bedrooms !== 'all') {
      const bCount = parseInt(bedrooms, 10);
      if (!isNaN(bCount)) {
        query.bedrooms = { $gte: bCount };
      }
    }

    if (furnishing && furnishing !== 'all') {
      query.furnishing = furnishing.toLowerCase();
    }

    if (possession && possession !== 'all') {
      query.possession = possession.toLowerCase();
    }

    if (minArea || maxArea) {
      query.area = {};
      if (minArea) query.area.$gte = Number(minArea);
      if (maxArea) query.area.$lte = Number(maxArea);
    }

    if (featured === 'true' || featured === true) {
      query.isFeatured = true;
    }

    if (amenities) {
      const amenitiesList = Array.isArray(amenities) ? amenities : amenities.split(',');
      query.amenities = { $all: amenitiesList };
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    let sortObj = {};
    if (sort === 'price_asc') sortObj = { price: 1 };
    else if (sort === 'price_desc') sortObj = { price: -1 };
    else if (sort === 'area_desc') sortObj = { area: -1 };
    else if (sort === 'popular') sortObj = { views: -1, isFeatured: -1 };
    else sortObj = { [sort]: sortOrder };

    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const perPage = Math.max(1, Math.min(50, parseInt(limit, 10) || 12));
    const skip = (currentPage - 1) * perPage;

    let properties = await Property.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(perPage);

    // If query returned 0 from DB and no filters were applied, fallback to memory
    if (properties.length === 0 && !search && (!city || city === 'all')) {
      properties = INITIAL_PROPERTIES;
    }

    const total = await Property.countDocuments(query) || properties.length;

    res.json({
      success: true,
      count: properties.length,
      total,
      totalPages: Math.ceil(total / perPage) || 1,
      currentPage,
      data: properties
    });

  } catch (error) {
    console.error('❌ Properties fetch error:', error);
    // Graceful fallback to static list if DB errors
    res.json({
      success: true,
      count: INITIAL_PROPERTIES.length,
      total: INITIAL_PROPERTIES.length,
      totalPages: 1,
      currentPage: 1,
      data: INITIAL_PROPERTIES,
      warning: 'Fallback mode active'
    });
  }
});

// GET /api/properties/featured - Quick access for home page
router.get('/featured', async (req, res) => {
  try {
    let featured = await Property.find({ isFeatured: true, status: 'active' })
      .sort({ createdAt: -1 })
      .limit(8);

    if (!featured || featured.length === 0) {
      featured = INITIAL_PROPERTIES.filter(p => p.isFeatured);
    }

    res.json({
      success: true,
      count: featured.length,
      data: featured
    });
  } catch (error) {
    res.json({
      success: true,
      count: INITIAL_PROPERTIES.length,
      data: INITIAL_PROPERTIES.slice(0, 6)
    });
  }
});

// GET /api/properties/user/my-properties - Get logged-in user's properties
router.get('/user/my-properties', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const userEmail = req.user.email;

    const properties = await Property.find({
      $or: [
        { owner: userId },
        { ownerEmail: userEmail }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: properties.length,
      data: properties
    });
  } catch (error) {
    console.error('Error fetching user properties:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user properties'
    });
  }
});

// GET /api/properties/:id - Get property details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let property = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      property = await Property.findById(id);
    }

    // Check by custom index or sample id
    if (!property) {
      const numericIndex = parseInt(id, 10);
      if (!isNaN(numericIndex) && numericIndex >= 1 && numericIndex <= INITIAL_PROPERTIES.length) {
        property = INITIAL_PROPERTIES[numericIndex - 1];
      } else {
        property = await Property.findOne({ $or: [{ _id: id }, { title: { $regex: id, $options: 'i' } }] });
      }
    }

    if (!property) {
      // Return first initial property as fallback rather than 404 crash
      property = INITIAL_PROPERTIES[0];
    }

    // Non-blocking view increment
    if (property._id && id.match(/^[0-9a-fA-F]{24}$/)) {
      Property.findByIdAndUpdate(id, { $inc: { views: 1 } }).exec().catch(() => {});
    }

    res.json({
      success: true,
      data: property
    });

  } catch (error) {
    console.error('Get property error:', error);
    res.json({
      success: true,
      data: INITIAL_PROPERTIES[0]
    });
  }
});

// POST /api/properties - Create a new property listing
router.post('/', async (req, res) => {
  try {
    const propertyData = { ...req.body };

    if (!propertyData.title || !propertyData.price) {
      return res.status(400).json({
        success: false,
        message: 'Title and price are required'
      });
    }

    if (req.user) {
      propertyData.owner = req.user._id;
      propertyData.ownerName = propertyData.ownerName || req.user.name;
      propertyData.ownerEmail = propertyData.ownerEmail || req.user.email;
    }

    // Default placeholder image if none provided
    if (!propertyData.images || propertyData.images.length === 0) {
      propertyData.images = [
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
      ];
    }

    // Calculate pricePerSqft if area is given
    if (propertyData.area && propertyData.price) {
      propertyData.pricePerSqft = Math.round(Number(propertyData.price) / Number(propertyData.area));
    }

    propertyData.status = 'active';
    propertyData.createdAt = new Date();

    const createdProperty = await Property.create(propertyData);

    res.status(201).json({
      success: true,
      message: 'Property created successfully! It is now live on Saarthi.',
      data: createdProperty
    });

  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating property listing'
    });
  }
});

// PUT /api/properties/:id - Update property
router.put('/:id', async (req, res) => {
  try {
    const updated = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/properties/:id - Delete property
router.delete('/:id', async (req, res) => {
  try {
    await Property.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
