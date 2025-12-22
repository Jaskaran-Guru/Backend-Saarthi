// Format price to Indian currency format
const formatPrice = (price) => {
  if (!price || isNaN(price)) return '₹0';
  
  if (price >= 10000000) {
    return `₹${(price / 10000000).toFixed(1)} Cr`;
  } else if (price >= 100000) {
    return `₹${(price / 100000).toFixed(0)} L`;
  } else if (price >= 1000) {
    return `₹${(price / 1000).toFixed(0)}K`;
  } else {
    return `₹${price}`;
  }
};


const generateSlug = (title, id) => {
  return title
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 50) + '-' + id;
};


const calculateEMI = (principal, rate, tenure) => {
  const monthlyRate = rate / 12 / 100;
  const months = tenure * 12;
  
  if (monthlyRate === 0) {
    return principal / months;
  }
  
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
              (Math.pow(1 + monthlyRate, months) - 1);
  
  return Math.round(emi);
};


const validatePhone = (phone) => {
  const phoneRegex = /^(\+91[\-\s]?)?[0]?(91)?[789]\d{9}$/;
  return phoneRegex.test(phone);
};


const validatePincode = (pincode) => {
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  return pincodeRegex.test(pincode);
};


const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Puducherry', 'Chandigarh', 'Dadra and Nagar Haveli', 'Daman and Diu',
  'Lakshadweep', 'Ladakh', 'Jammu and Kashmir'
];

const majorCities = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai',
  'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur',
  'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad',
  'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik',
  'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivali', 'Vasai-Virar',
  'Varanasi', 'Srinagar', 'Dhanbad', 'Jodhpur', 'Amritsar', 'Raipur',
  'Allahabad', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada',
  'Madurai', 'Gurgaon', 'Navi Mumbai', 'Aurangabad', 'Solapur',
  'Ranchi', 'Howrah', 'Jalandhar', 'Tiruchirappalli', 'Bhubaneswar'
];


const generatePropertyId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `SAR${timestamp}${random}`.toUpperCase();
};


const getPagination = (page = 1, limit = 10) => {
  const currentPage = Math.max(1, parseInt(page));
  const perPage = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (currentPage - 1) * perPage;
  
  return {
    currentPage,
    perPage,
    skip
  };
};


const apiResponse = (res, statusCode, success, message, data = null, extra = {}) => {
  const response = {
    success,
    message,
    ...extra
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
};


const successResponse = (res, message, data = null, extra = {}) => {
  return apiResponse(res, 200, true, message, data, extra);
};


const errorResponse = (res, statusCode = 500, message = 'Server Error', data = null) => {
  return apiResponse(res, statusCode, false, message, data);
};

module.exports = {
  formatPrice,
  generateSlug,
  calculateEMI,
  validatePhone,
  validatePincode,
  indianStates,
  majorCities,
  generatePropertyId,
  getPagination,
  apiResponse,
  successResponse,
  errorResponse
};
