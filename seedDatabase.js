/**
 * HomeNest Real Estate — Database Seeder
 * Seeds realistic property listings matching the design specifications.
 * Run: node seedDatabase.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MongoDB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/saarthi';

const Property = require('./models/Property');

// Curated high quality architectural imagery matching the UI mockups
const IMAGES = {
  house1: [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80',
  ],
  apartment1: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
  ],
  villa1: [
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
  ],
  apartment2: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=800&q=80',
  ],
  apartment3: [
    'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1502005229762-ee1b2b814674?auto=format&fit=crop&w=800&q=80',
  ],
  villa2: [
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80',
  ],
  house2: [
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80',
  ],
  commercial1: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80',
  ],
  plot1: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
  ]
};

const seeds = [
  // 1. Primary flagship property shown across screens 1, 2, 3, 4, 10
  {
    title: '3 BHK Independent House',
    description: 'This beautiful 3 BHK independent house is located in the prime location of Sector 15, Chandigarh. It offers modern amenities, spacious rooms and a peaceful environment. Features architectural front facade, lush landscaped garden, modular Italian kitchen, and high ceiling master suite.',
    propertyType: 'house',
    listingType: 'sale',
    address: 'House No. 412, Sector 15-A',
    city: 'Chandigarh',
    state: 'Chandigarh',
    locality: 'Sector 15',
    pincode: '160015',
    bedrooms: 3,
    bathrooms: 3,
    balconies: 2,
    area: 2400,
    areaUnit: 'sqft',
    furnished: 'semi-furnished',
    facing: 'North-East',
    floor: 'G+1',
    totalFloors: '2',
    price: 12500000,
    pricePerSqft: 5208,
    priceNegotiable: true,
    amenities: ['Power Backup', 'Parking', 'Garden', 'Security', 'Lift', 'Gym', 'Swimming Pool', 'Clubhouse'],
    yearBuilt: '2023',
    possession: 'ready',
    parkingSpaces: 2,
    ownerName: 'Rohit Sharma',
    ownerPhone: '+91 98765 43210',
    ownerEmail: 'rohit.sharma@example.com',
    ownerRole: 'Owner',
    images: IMAGES.house1,
    status: 'active',
    featured: true,
    coordinates: { lat: 30.7513, lng: 76.7725 }
  },

  // 2. Featured Card 2 (Screen 1 & 2)
  {
    title: '2 BHK Apartment',
    description: 'Warm and inviting 2 BHK apartment in Green Park, South Delhi. Features sunlit living spaces, wooden flooring, contemporary open kitchen, and 24/7 security. Just 5 minutes walk from Green Park Metro Station.',
    propertyType: 'apartment',
    listingType: 'rent',
    address: 'C-Block, Green Park Main',
    city: 'Delhi',
    state: 'Delhi',
    locality: 'Green Park',
    pincode: '110016',
    bedrooms: 2,
    bathrooms: 2,
    balconies: 1,
    area: 1200,
    areaUnit: 'sqft',
    furnished: 'semi-furnished',
    facing: 'East',
    floor: '2',
    totalFloors: '4',
    price: 35000,
    pricePerSqft: 29,
    priceNegotiable: false,
    amenities: ['Power Backup', 'Parking', 'Security', 'Lift', 'Balcony', 'Intercom'],
    yearBuilt: '2021',
    possession: 'ready',
    parkingSpaces: 1,
    ownerName: 'Aarav Malhotra',
    ownerPhone: '+91 98112 34567',
    ownerEmail: 'aarav.m@example.com',
    ownerRole: 'Owner',
    images: IMAGES.apartment1,
    status: 'active',
    featured: true,
    coordinates: { lat: 28.5589, lng: 77.2028 }
  },

  // 3. Featured Card 3 (Screen 1 & 2 & 10)
  {
    title: '4 BHK Villa',
    description: 'Exclusive 4 BHK ultra-luxury villa situated on Road No. 12, Banjara Hills. Boasting contemporary European architecture, private swimming pool, home automation, double-height living room, and manicured lawns.',
    propertyType: 'villa',
    listingType: 'sale',
    address: 'Road No. 12, Banjara Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    locality: 'Banjara Hills',
    pincode: '500034',
    bedrooms: 4,
    bathrooms: 4,
    balconies: 3,
    area: 4500,
    areaUnit: 'sqft',
    furnished: 'fully-furnished',
    facing: 'East',
    floor: 'G+2',
    totalFloors: '3',
    price: 28000000,
    pricePerSqft: 6222,
    priceNegotiable: true,
    amenities: ['Swimming Pool', 'Gym', 'Clubhouse', 'Power Backup', 'Security', 'Parking', 'Garden', 'Smart Home'],
    yearBuilt: '2022',
    possession: 'ready',
    parkingSpaces: 3,
    ownerName: 'Kavita Reddy',
    ownerPhone: '+91 94401 23456',
    ownerEmail: 'kavita.reddy@example.com',
    ownerRole: 'Owner',
    images: IMAGES.villa1,
    status: 'active',
    featured: true,
    coordinates: { lat: 17.4156, lng: 78.4357 }
  },

  // 4. Featured Card 4 (Screen 1 & 2)
  {
    title: '1 BHK Apartment',
    description: 'Modern 1 BHK techie haven in Whitefield, Bangalore. Well-ventilated layout with smart appliances, high-speed fiber internet provision, clubhouse access, and swimming pool. Walking distance to ITPL.',
    propertyType: 'apartment',
    listingType: 'rent',
    address: 'Brigade Meadows, ITPL Main Road',
    city: 'Bangalore',
    state: 'Karnataka',
    locality: 'Whitefield',
    pincode: '560066',
    bedrooms: 1,
    bathrooms: 1,
    balconies: 1,
    area: 750,
    areaUnit: 'sqft',
    furnished: 'fully-furnished',
    facing: 'North',
    floor: '7',
    totalFloors: '14',
    price: 22000,
    pricePerSqft: 29,
    priceNegotiable: false,
    amenities: ['Power Backup', 'Security', 'Lift', 'Gym', 'Swimming Pool', 'Clubhouse', 'Parking'],
    yearBuilt: '2022',
    possession: 'ready',
    parkingSpaces: 1,
    ownerName: 'Deepak Nair',
    ownerPhone: '+91 99801 98765',
    ownerEmail: 'deepak.nair@example.com',
    ownerRole: 'Owner',
    images: IMAGES.apartment2,
    status: 'active',
    featured: true,
    coordinates: { lat: 12.9698, lng: 77.7500 }
  },

  // 5. Search / Filter Page & Dashboard Card (Screen 4 & 9)
  {
    title: '3 BHK Apartment',
    description: 'Spacious 3 BHK luxury apartment in high-rise tower at Zirakpur, Chandigarh capital region. Unobstructed Shivalik mountain views, clubhouse, sports courts, and rapid airport connectivity.',
    propertyType: 'apartment',
    listingType: 'sale',
    address: 'VIP Road, Zirakpur',
    city: 'Chandigarh',
    state: 'Punjab',
    locality: 'Zirakpur',
    pincode: '140603',
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    area: 1800,
    areaUnit: 'sqft',
    furnished: 'semi-furnished',
    facing: 'North',
    floor: '9',
    totalFloors: '18',
    price: 8500000,
    pricePerSqft: 4722,
    priceNegotiable: true,
    amenities: ['Power Backup', 'Parking', 'Security', 'Lift', 'Gym', 'Swimming Pool', 'Garden'],
    yearBuilt: '2023',
    possession: 'ready',
    parkingSpaces: 2,
    ownerName: 'Manpreet Singh',
    ownerPhone: '+91 98720 11223',
    ownerEmail: 'manpreet.s@example.com',
    ownerRole: 'Owner',
    images: IMAGES.apartment3,
    status: 'active',
    featured: false,
    coordinates: { lat: 30.6425, lng: 76.8173 }
  },

  // 6. Search / Filter Page & Details (Screen 4)
  {
    title: '4 BHK Villa',
    description: 'Palatial 4 BHK designer villa in Sector 6, Panchkula. High-grade construction, solar powered, private home theatre room, private lawn with gazebo, and servant quarter.',
    propertyType: 'villa',
    listingType: 'sale',
    address: 'Sector 6, Panchkula',
    city: 'Chandigarh',
    state: 'Haryana',
    locality: 'Panchkula',
    pincode: '134109',
    bedrooms: 4,
    bathrooms: 4,
    balconies: 3,
    area: 3200,
    areaUnit: 'sqft',
    furnished: 'fully-furnished',
    facing: 'North-East',
    floor: 'G+2',
    totalFloors: '3',
    price: 17500000,
    pricePerSqft: 5468,
    priceNegotiable: true,
    amenities: ['Power Backup', 'Parking', 'Garden', 'Security', 'Lift', 'Gym', 'Swimming Pool', 'Clubhouse'],
    yearBuilt: '2022',
    possession: 'ready',
    parkingSpaces: 3,
    ownerName: 'Simran Kaur',
    ownerPhone: '+91 98881 22334',
    ownerEmail: 'simran.k@example.com',
    ownerRole: 'Owner',
    images: IMAGES.villa2,
    status: 'active',
    featured: true,
    coordinates: { lat: 30.6942, lng: 76.8606 }
  },

  // 7. Search / Filter Page (Screen 4)
  {
    title: '2 BHK Apartment',
    description: 'Affordable modern 2 BHK flat in Sector 82, JLPL Industrial Area, Mohali. Close to IT City, high rental demand, round the clock water and security.',
    propertyType: 'apartment',
    listingType: 'sale',
    address: 'Sector 82, Mohali',
    city: 'Chandigarh',
    state: 'Punjab',
    locality: 'Mohali',
    pincode: '160055',
    bedrooms: 2,
    bathrooms: 2,
    balconies: 1,
    area: 1150,
    areaUnit: 'sqft',
    furnished: 'unfurnished',
    facing: 'East',
    floor: '4',
    totalFloors: '10',
    price: 4800000,
    pricePerSqft: 4173,
    priceNegotiable: true,
    amenities: ['Power Backup', 'Parking', 'Security', 'Lift', 'Garden'],
    yearBuilt: '2024',
    possession: 'ready',
    parkingSpaces: 1,
    ownerName: 'Gaurav Gill',
    ownerPhone: '+91 98140 55667',
    ownerEmail: 'gaurav.gill@example.com',
    ownerRole: 'Owner',
    images: IMAGES.apartment1,
    status: 'active',
    featured: false,
    coordinates: { lat: 30.6698, lng: 76.7212 }
  },

  // 8. Recommended in Dashboard (Screen 9)
  {
    title: '3 BHK House',
    description: 'Graceful 3 BHK residential house located in prime sector of Panchkula with wide front road, proximity to market, and peaceful surroundings.',
    propertyType: 'house',
    listingType: 'sale',
    address: 'Sector 12, Panchkula',
    city: 'Chandigarh',
    state: 'Haryana',
    locality: 'Panchkula',
    pincode: '134112',
    bedrooms: 3,
    bathrooms: 3,
    balconies: 2,
    area: 2200,
    areaUnit: 'sqft',
    furnished: 'semi-furnished',
    facing: 'North',
    floor: 'G+1',
    totalFloors: '2',
    price: 11000000,
    pricePerSqft: 5000,
    priceNegotiable: false,
    amenities: ['Parking', 'Garden', 'Power Backup', 'Security'],
    yearBuilt: '2021',
    possession: 'ready',
    parkingSpaces: 2,
    ownerName: 'Harpreet Singh',
    ownerPhone: '+91 97790 33445',
    ownerEmail: 'harpreet.s@example.com',
    ownerRole: 'Owner',
    images: IMAGES.house2,
    status: 'active',
    featured: false,
    coordinates: { lat: 30.6865, lng: 76.8523 }
  },

  // 9. Recommended in Dashboard (Screen 9)
  {
    title: '2 BHK Apartment',
    description: 'Ready to move 2 BHK apartment in Aerocity Mohali with modern fittings, community center, and children playground.',
    propertyType: 'apartment',
    listingType: 'sale',
    address: 'Aerocity Block C, Mohali',
    city: 'Chandigarh',
    state: 'Punjab',
    locality: 'Mohali',
    pincode: '140306',
    bedrooms: 2,
    bathrooms: 2,
    balconies: 1,
    area: 1350,
    areaUnit: 'sqft',
    furnished: 'semi-furnished',
    facing: 'South-East',
    floor: '6',
    totalFloors: '12',
    price: 9500000,
    pricePerSqft: 7037,
    priceNegotiable: true,
    amenities: ['Power Backup', 'Parking', 'Security', 'Lift', 'Clubhouse', 'Gym'],
    yearBuilt: '2023',
    possession: 'ready',
    parkingSpaces: 1,
    ownerName: 'Jasleen Virdi',
    ownerPhone: '+91 98760 99887',
    ownerEmail: 'jasleen.v@example.com',
    ownerRole: 'Owner',
    images: IMAGES.apartment2,
    status: 'active',
    featured: false,
    coordinates: { lat: 30.6385, lng: 76.7820 }
  },

  // 10. Recommended in Dashboard (Screen 9)
  {
    title: '3 BHK Villa',
    description: 'Magnificent 3 BHK luxury villa within secure gated township in Zirakpur. Includes Italian marble flooring, landscaped terrace, and solar water heating.',
    propertyType: 'villa',
    listingType: 'sale',
    address: 'Ambala Highway, Zirakpur',
    city: 'Chandigarh',
    state: 'Punjab',
    locality: 'Zirakpur',
    pincode: '140603',
    bedrooms: 3,
    bathrooms: 3,
    balconies: 2,
    area: 3600,
    areaUnit: 'sqft',
    furnished: 'fully-furnished',
    facing: 'North-East',
    floor: 'G+2',
    totalFloors: '3',
    price: 39000000,
    pricePerSqft: 10833,
    priceNegotiable: true,
    amenities: ['Swimming Pool', 'Gym', 'Power Backup', 'Security', 'Parking', 'Garden', 'Smart Home'],
    yearBuilt: '2024',
    possession: 'ready',
    parkingSpaces: 3,
    ownerName: 'Amardeep Sandhu',
    ownerPhone: '+91 98150 77889',
    ownerEmail: 'amardeep.s@example.com',
    ownerRole: 'Owner',
    images: IMAGES.villa1,
    status: 'active',
    featured: true,
    coordinates: { lat: 30.6321, lng: 76.8250 }
  },

  // 11. Commercial Space
  {
    title: 'Grade A Corporate Office Space',
    description: 'Plug-and-play commercial office space in Sector 17, Chandigarh business core. 120 workstations, 4 executive cabins, 2 conference rooms with video conferencing equipment.',
    propertyType: 'commercial',
    listingType: 'rent',
    address: 'Bridge Market, Sector 17',
    city: 'Chandigarh',
    state: 'Chandigarh',
    locality: 'Sector 17',
    pincode: '160017',
    bedrooms: 0,
    bathrooms: 4,
    balconies: 0,
    area: 5500,
    areaUnit: 'sqft',
    furnished: 'fully-furnished',
    facing: 'North',
    floor: '3',
    totalFloors: '5',
    price: 275000,
    pricePerSqft: 50,
    priceNegotiable: true,
    amenities: ['Power Backup', 'Security', 'Lift', 'Parking', 'Central AC', 'Fire Safety'],
    yearBuilt: '2020',
    possession: 'ready',
    parkingSpaces: 6,
    ownerName: 'Chamber Properties Ltd',
    ownerPhone: '+91 172 2700100',
    ownerEmail: 'info@chamberproperties.com',
    ownerRole: 'Builder',
    images: IMAGES.commercial1,
    status: 'active',
    featured: false,
    coordinates: { lat: 30.7398, lng: 76.7827 }
  },

  // 12. Residential Plot
  {
    title: 'Corner Residential Plot (10 Marla)',
    description: 'Prime 10 Marla corner plot with 50 ft wide road facing in Sector 21, Chandigarh. Ready for immediate construction of ground + 2 luxury floors.',
    propertyType: 'plot',
    listingType: 'sale',
    address: 'Sector 21-B',
    city: 'Chandigarh',
    state: 'Chandigarh',
    locality: 'Sector 21',
    pincode: '160022',
    bedrooms: 0,
    bathrooms: 0,
    balconies: 0,
    area: 2250,
    areaUnit: 'sqft',
    furnished: 'unfurnished',
    facing: 'North-East',
    floor: 'G',
    totalFloors: '1',
    price: 34000000,
    pricePerSqft: 15111,
    priceNegotiable: true,
    amenities: ['Security', 'Park Facing', 'Wide Road', 'Borewell'],
    yearBuilt: '2024',
    possession: 'ready',
    parkingSpaces: 0,
    ownerName: 'Baljit Bindra',
    ownerPhone: '+91 98888 12345',
    ownerEmail: 'baljit.bindra@example.com',
    ownerRole: 'Owner',
    images: IMAGES.plot1,
    status: 'active',
    featured: false,
    coordinates: { lat: 30.7258, lng: 76.7772 }
  }
];

async function seed() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ MongoDB Connected');

    console.log('🗑️  Clearing old property entries...');
    await Property.deleteMany({});
    console.log('🗑️  Cleaned collection.');

    console.log(`🌱 Seeding ${seeds.length} curated HomeNest property listings...`);
    const inserted = await Property.insertMany(seeds.map(p => ({
      ...p,
      createdAt: new Date(),
      updatedAt: new Date()
    })));
    console.log(`✅ Successfully seeded ${inserted.length} properties!`);

    const total = await Property.countDocuments();
    const forSale = await Property.countDocuments({ listingType: 'sale' });
    const forRent = await Property.countDocuments({ listingType: 'rent' });
    console.log(`\n📊 HomeNest Database Summary:`);
    console.log(`   Total Properties: ${total}`);
    console.log(`   For Sale: ${forSale}`);
    console.log(`   For Rent: ${forRent}`);

  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed, seeds };
