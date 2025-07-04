/**
 * Utility functions for number formatting and conversion
 */

// Number to words conversion for Indian currency format
export const numberToWords = (amount) => {
  if (amount === 0) return 'Zero Rupees Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  // Convert number to string and separate rupees and paise
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  // Convert rupees to words
  const convertGroup = (num) => {
    let result = '';
    
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    } else if (num >= 10) {
      result += teens[num - 10] + ' ';
      return result;
    }
    
    if (num > 0) {
      result += ones[num] + ' ';
    }
    
    return result;
  };
  
  let rupeesInWords = '';
  
  if (rupees >= 10000000) { // Crores
    const crores = Math.floor(rupees / 10000000);
    rupeesInWords += convertGroup(crores) + 'Crore ';
    rupees %= 10000000;
  }
  
  if (rupees >= 100000) { // Lakhs
    const lakhs = Math.floor(rupees / 100000);
    rupeesInWords += convertGroup(lakhs) + 'Lakh ';
    rupees %= 100000;
  }
  
  if (rupees >= 1000) { // Thousands
    const thousands = Math.floor(rupees / 1000);
    rupeesInWords += convertGroup(thousands) + 'Thousand ';
    rupees %= 1000;
  }
  
  if (rupees > 0) {
    rupeesInWords += convertGroup(rupees);
  }
  
  // Build final result
  let result = 'Rupees ' + rupeesInWords.trim();
  
  if (paise > 0) {
    result += ' and ' + convertGroup(paise).trim() + ' Paise';
  }
  
  result += ' Only';
  
  return result;
};

// Format currency for display (Indian format)
export const formatCurrency = (amount, options = {}) => {
  const {
    includeCurrency = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  } = options;
  
  const formatter = new Intl.NumberFormat('en-IN', {
    style: includeCurrency ? 'currency' : 'decimal',
    currency: 'INR',
    minimumFractionDigits,
    maximumFractionDigits,
  });
  
  return formatter.format(amount || 0);
};

// Format number with Indian numbering system
export const formatNumber = (num, options = {}) => {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2
  } = options;
  
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(num || 0);
};

// Calculate percentage
export const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

// Round to specified decimal places
export const roundToDecimal = (num, decimals = 2) => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// Parse Indian formatted number string back to number
export const parseIndianNumber = (numberString) => {
  if (!numberString) return 0;
  
  // Remove currency symbols and spaces
  const cleaned = numberString.toString().replace(/[^\d.,]/g, '');
  
  // Handle Indian comma formatting
  const parts = cleaned.split('.');
  if (parts.length > 1) {
    // Has decimal part
    const integerPart = parts[0].replace(/,/g, '');
    const decimalPart = parts[1];
    return parseFloat(`${integerPart}.${decimalPart}`);
  } else {
    // No decimal part
    return parseFloat(cleaned.replace(/,/g, ''));
  }
};

// Validate if a string represents a valid number
export const isValidNumber = (value) => {
  if (value === null || value === undefined || value === '') return false;
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num);
};

// Convert number to fixed decimal places without rounding errors
export const toFixedNumber = (num, digits = 2) => {
  const pow = Math.pow(10, digits);
  return Math.round(num * pow) / pow;
};

// Calculate tax amounts for GST
export const calculateGST = (taxableAmount, gstRate) => {
  return toFixedNumber((taxableAmount * gstRate) / 100);
};

// Calculate discount amount
export const calculateDiscount = (amount, discount, discountType = 'amount') => {
  if (discountType === 'percentage') {
    return toFixedNumber((amount * discount) / 100);
  }
  return toFixedNumber(discount);
};

// Generate random invoice number (fallback)
export const generateRandomInvoiceNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `INV-${timestamp}-${random}`;
};

// Validate Indian GSTIN format
export const validateGSTIN = (gstin) => {
  if (!gstin) return true; // Optional field
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
};

// Validate Indian phone number
export const validatePhoneNumber = (phone) => {
  if (!phone) return false;
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,15}$/;
  return phoneRegex.test(phone);
};

// Format phone number for display
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Format as +91 XXXXX XXXXX for Indian numbers
  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    return `+91 ${cleaned.slice(3, 8)} ${cleaned.slice(8)}`;
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  return phone; // Return original if can't format
};

// Calculate compound interest
export const calculateCompoundInterest = (principal, rate, time, compoundingFrequency = 1) => {
  const amount = principal * Math.pow((1 + rate / (100 * compoundingFrequency)), compoundingFrequency * time);
  return toFixedNumber(amount - principal);
};

// Calculate simple interest
export const calculateSimpleInterest = (principal, rate, time) => {
  return toFixedNumber((principal * rate * time) / 100);
};

// Convert amount to different units (for inventory)
export const convertUnits = (amount, fromUnit, toUnit) => {
  const conversions = {
    pieces_to_dozens: amount / 12,
    dozens_to_pieces: amount * 12,
    kg_to_grams: amount * 1000,
    grams_to_kg: amount / 1000,
    bags_to_kg: amount * 50, // Assuming 50kg per bag
    kg_to_bags: amount / 50,
  };
  
  const conversionKey = `${fromUnit}_to_₹{toUnit}`;
  return conversions[conversionKey] || amount;
};

// Calculate profit margin
export const calculateProfitMargin = (sellingPrice, costPrice) => {
  if (costPrice === 0) return 0;
  return toFixedNumber(((sellingPrice - costPrice) / costPrice) * 100);
};

// Calculate markup percentage
export const calculateMarkup = (sellingPrice, costPrice) => {
  if (costPrice === 0) return 0;
  return toFixedNumber(((sellingPrice - costPrice) / costPrice) * 100);
};

// Export all utilities as default object
export default {
  numberToWords,
  formatCurrency,
  formatNumber,
  calculatePercentage,
  roundToDecimal,
  parseIndianNumber,
  isValidNumber,
  toFixedNumber,
  calculateGST,
  calculateDiscount,
  generateRandomInvoiceNumber,
  validateGSTIN,
  validatePhoneNumber,
  formatPhoneNumber,
  calculateCompoundInterest,
  calculateSimpleInterest,
  convertUnits,
  calculateProfitMargin,
  calculateMarkup,
};