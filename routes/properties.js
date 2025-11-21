// Properties with database
app.get('/api/properties', async (req, res) => {
  try {
    const properties = await Property.find({ status: 'active' })
      .populate('owner', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    if (properties.length === 0) {
      // Insert sample data if no properties exist
      const sampleProperties = [
        {
          title: "Sea View Luxury Apartment",
          price: 25000000,
          location: "Mumbai",
          address: "Bandra West, Mumbai, Maharashtra 400050",
          city: "Mumbai",
          bedrooms: 3,
          bathrooms: 3,
          area: 1200,
          propertyType: "apartment",
          furnishing: "furnished",
          possession: "ready",
          description: "Premium 3BHK apartment with stunning sea views",
          images: [{ url: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" }],
          amenities: ["Swimming Pool", "Gym", "Security", "Lift", "Parking"],
          features: ["Sea-facing balconies", "Premium marble flooring"],
          yearBuilt: 2020,
          developer: "Lodha Group",
          owner: req.user?._id || null,
          agent: {
            name: "Priya Sharma",
            phone: "+91 98765 43210",
            email: "priya.sharma@saarthi.com"
          }
        },
        {
          title: "Modern Villa in DLF City",
          price: 32000000,
          location: "Gurgaon",
          address: "DLF Phase 2, Gurgaon, Haryana 122002",
          city: "Gurgaon",
          bedrooms: 4,
          bathrooms: 4,
          area: 2500,
          propertyType: "villa",
          furnishing: "semi-furnished",
          possession: "ready",
          description: "Spacious 4BHK independent villa with private garden",
          images: [{ url: "https://images.unsplash.com/photo-1613977257363-707ba9348227?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" }],
          amenities: ["Garden", "Security", "Parking", "Power Backup"],
          yearBuilt: 2019,
          developer: "DLF Limited",
          owner: req.user?._id || null
        }
      ];

      // Only create if user is logged in
      if (req.user) {
        await Property.insertMany(sampleProperties.map(prop => ({
          ...prop,
          owner: req.user._id
        })));
        
        const newProperties = await Property.find({ status: 'active' })
          .populate('owner', 'name email avatar')
          .sort({ createdAt: -1 });
          
        return res.json({
          success: true,
          count: newProperties.length,
          data: newProperties,
          message: 'Sample properties created for demo'
        });
      }
      
      // Return empty array if no user and no properties
      return res.json({
        success: true,
        count: 0,
        data: [],
        message: 'No properties found. Login to see sample data.'
      });
    }

    res.json({
      success: true,
      count: properties.length,
      data: properties,
      user: req.user ? req.user.name : 'Guest'
    });
  } catch (error) {
    console.error('❌ Properties fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching properties'
    });
  }
});
