import { DEFAULT_CEMENT_PER_BRICK_RATIO, GST_RATES, VALIDATION_RULES } from './constants';

/**
 * Production Calculations
 */

// Calculate cement needed for brick production
export const calculateCementNeeded = (brickQuantity, cementRatio = DEFAULT_CEMENT_PER_BRICK_RATIO) => {
  return Math.ceil(brickQuantity * cementRatio);
};

// Calculate maximum bricks possible with available cement
export const calculateMaxBricksFromCement = (cementBags, cementRatio = DEFAULT_CEMENT_PER_BRICK_RATIO) => {
  return Math.floor(cementBags / cementRatio);
};

// Calculate production efficiency (bricks per bag of cement)
export const calculateProductionEfficiency = (bricksProduced, cementUsed) => {
  if (cementUsed === 0) return 0;
  return (bricksProduced / cementUsed).toFixed(2);
};

/**
 * Inventory Calculations
 */

// Calculate total inventory value
export const calculateInventoryValue = (brickStock, brickPrice, cementStock, cementCost) => {
  const brickValue = brickStock * brickPrice;
  const cementValue = cementStock * cementCost;
  return {
    brickValue: brickValue.toFixed(2),
    cementValue: cementValue.toFixed(2),
    totalValue: (brickValue + cementValue).toFixed(2),
  };
};

// Check if stock is low
export const isStockLow = (currentStock, threshold) => {
  return currentStock <= threshold;
};

// Calculate stock depletion rate (days until stock runs out)
export const calculateStockDepletionRate = (currentStock, dailyUsage) => {
  if (dailyUsage === 0) return Infinity;
  return Math.floor(currentStock / dailyUsage);
};

/**
 * Sales Calculations
 */

// Calculate total sale amount
export const calculateSaleAmount = (quantity, pricePerBrick, discount = 0) => {
  const subtotal = quantity * pricePerBrick;
  const discountAmount = (subtotal * discount) / 100;
  return {
    subtotal: subtotal.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    total: (subtotal - discountAmount).toFixed(2),
  };
};

// Calculate profit from sale
export const calculateSaleProfit = (quantity, sellingPrice, costPrice) => {
  const revenue = quantity * sellingPrice;
  const cost = quantity * costPrice;
  const profit = revenue - cost;
  const profitMargin = cost > 0 ? ((profit / revenue) * 100).toFixed(2) : 0;
  
  return {
    revenue: revenue.toFixed(2),
    cost: cost.toFixed(2),
    profit: profit.toFixed(2),
    profitMargin: profitMargin,
  };
};

/**
 * Financial Calculations
 */

// Calculate daily/monthly/yearly totals
export const calculatePeriodTotals = (transactions, period = 'daily') => {
  const totals = {
    quantity: 0,
    revenue: 0,
    transactions: 0,
  };

  transactions.forEach(transaction => {
    totals.quantity += transaction.quantity || 0;
    totals.revenue += transaction.total_amount || 0;
    totals.transactions += 1;
  });

  return totals;
};

// Calculate cost per brick (including cement cost)
export const calculateCostPerBrick = (cementCostPerBag, cementRatio = DEFAULT_CEMENT_PER_BRICK_RATIO, additionalCosts = 0) => {
  const cementCostPerBrick = cementCostPerBag * cementRatio;
  return (cementCostPerBrick + additionalCosts).toFixed(4);
};

// Calculate break-even price
export const calculateBreakEvenPrice = (costPerBrick, overheadPercentage = 20) => {
  const overhead = (costPerBrick * overheadPercentage) / 100;
  return (parseFloat(costPerBrick) + overhead).toFixed(2);
};

/**
 * Analytics Calculations
 */

// Calculate growth rate
export const calculateGrowthRate = (currentValue, previousValue) => {
  if (previousValue === 0) return currentValue > 0 ? 100 : 0;
  return (((currentValue - previousValue) / previousValue) * 100).toFixed(2);
};

// Calculate average values
export const calculateAverage = (values) => {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return (sum / values.length).toFixed(2);
};

// Calculate moving average
export const calculateMovingAverage = (values, period = 7) => {
  if (values.length < period) return calculateAverage(values);
  
  const recentValues = values.slice(-period);
  return calculateAverage(recentValues);
};

/**
 * Date-based Calculations
 */

// Get date range data
export const getDateRangeData = (data, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return Object.entries(data).filter(([date, _]) => {
    const dataDate = new Date(date);
    return dataDate >= start && dataDate <= end;
  });
};

// Calculate monthly totals from daily data
export const calculateMonthlyTotals = (dailyData) => {
  const monthlyTotals = {};
  
  Object.entries(dailyData).forEach(([date, data]) => {
    const month = date.substring(0, 7); // YYYY-MM format
    
    if (!monthlyTotals[month]) {
      monthlyTotals[month] = {
        total_quantity: 0,
        total_revenue: 0,
        total_cement_used: 0,
        days_count: 0,
      };
    }
    
    monthlyTotals[month].total_quantity += data.quantity || 0;
    monthlyTotals[month].total_revenue += data.total_amount || data.total_revenue || 0;
    monthlyTotals[month].total_cement_used += data.cement_used || 0;
    monthlyTotals[month].days_count += 1;
  });
  
  return monthlyTotals;
};

/**
 * Validation Calculations
 */

// Validate if production is possible with available cement
export const validateProductionCapacity = (requestedBricks, availableCement, cementRatio = DEFAULT_CEMENT_PER_BRICK_RATIO) => {
  const requiredCement = calculateCementNeeded(requestedBricks, cementRatio);
  const isValid = requiredCement <= availableCement;
  const maxPossible = isValid ? requestedBricks : calculateMaxBricksFromCement(availableCement, cementRatio);
  
  return {
    isValid,
    requiredCement,
    availableCement,
    maxPossible,
    shortage: isValid ? 0 : requiredCement - availableCement,
  };
};

// Validate if sale is possible with available stock
export const validateSaleCapacity = (requestedQuantity, availableStock) => {
  const isValid = requestedQuantity <= availableStock;
  
  return {
    isValid,
    requestedQuantity,
    availableStock,
    shortage: isValid ? 0 : requestedQuantity - availableStock,
  };
};

/**
 * Utility Functions
 */

// Round to specific decimal places
export const roundTo = (value, decimals = 2) => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// Format number with commas
export const formatNumber = (number) => {
  return new Intl.NumberFormat().format(number);
};

// Convert percentage to decimal
export const percentageToDecimal = (percentage) => {
  return percentage / 100;
};

// Convert decimal to percentage
export const decimalToPercentage = (decimal) => {
  return (decimal * 100).toFixed(2);
};

/**
 * =============================================================================
 * NEW ENHANCED FUNCTIONS - Added for Customer & Sales Management
 * These functions extend the existing functionality without breaking anything
 * =============================================================================
 */

/**
 * Enhanced GST Calculations
 */

// Calculate GST amounts based on taxable amount and interstate status
export const calculateGSTAmounts = (taxableAmount, isInterState = false) => {
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    // Inter-state: IGST 12%
    igstAmount = (taxableAmount * GST_RATES.IGST) / 100;
  } else {
    // Intra-state: CGST 6% + SGST 6%
    cgstAmount = (taxableAmount * GST_RATES.CGST) / 100;
    sgstAmount = (taxableAmount * GST_RATES.SGST) / 100;
  }

  const totalTax = cgstAmount + sgstAmount + igstAmount;

  return {
    cgstAmount: Math.round(cgstAmount * 100) / 100,
    sgstAmount: Math.round(sgstAmount * 100) / 100,
    igstAmount: Math.round(igstAmount * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    cgstRate: isInterState ? 0 : GST_RATES.CGST,
    sgstRate: isInterState ? 0 : GST_RATES.SGST,
    igstRate: isInterState ? GST_RATES.IGST : 0,
  };
};

/**
 * Enhanced Sale Amount Calculations (with different discount types)
 */

// Calculate sale amounts with enhanced discount support
export const calculateEnhancedSaleAmounts = (quantity, pricePerBrick, discount = 0, discountType = 'amount') => {
  const subtotal = quantity * pricePerBrick;
  
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = (subtotal * discount) / 100;
  } else {
    discountAmount = discount;
  }
  
  const taxableAmount = subtotal - discountAmount;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    discountPercentage: subtotal > 0 ? Math.round((discountAmount / subtotal) * 10000) / 100 : 0
  };
};

// Calculate total sale amount with GST
export const calculateTotalSaleAmount = (quantity, pricePerBrick, discount = 0, discountType = 'amount', customerState = 'GJ', companyState = 'GJ') => {
  const amounts = calculateEnhancedSaleAmounts(quantity, pricePerBrick, discount, discountType);
  const isInterState = customerState !== companyState;
  const gstAmounts = calculateGSTAmounts(amounts.taxableAmount, isInterState);
  
  const totalAmount = amounts.taxableAmount + gstAmounts.totalTax;
  
  return {
    ...amounts,
    ...gstAmounts,
    isInterState,
    totalAmount: Math.round(totalAmount * 100) / 100
  };
};

/**
 * Data Validation Functions
 */

// Validate customer data
export const validateCustomerData = (customerData, includeGSTINValidation = false) => {
  const errors = {};
  
  // Required fields
  if (!customerData.name || customerData.name.trim().length < 2) {
    errors.name = 'Customer name must be at least 2 characters';
  }
  
  if (!customerData.phone || customerData.phone.trim().length < 7) {
    errors.phone = 'Valid phone number is required';
  }
  
  // Phone validation
  if (customerData.phone && !VALIDATION_RULES.PHONE_REGEX.test(customerData.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }
  
  // Email validation (if provided)
  if (customerData.email && !VALIDATION_RULES.EMAIL_REGEX.test(customerData.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // GSTIN validation (if provided)
  if (includeGSTINValidation && customerData.gstin && !VALIDATION_RULES.GSTIN_REGEX.test(customerData.gstin)) {
    errors.gstin = 'Please enter a valid GSTIN (15 characters)';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Validate location data
export const validateLocationData = (locationData) => {
  const errors = {};
  
  if (!locationData.name || locationData.name.trim().length < 2) {
    errors.name = 'Location name must be at least 2 characters';
  }
  
  if (!locationData.address || locationData.address.trim().length < 10) {
    errors.address = 'Address must be at least 10 characters';
  }
  
  if (locationData.pincode && !VALIDATION_RULES.PINCODE_REGEX.test(locationData.pincode)) {
    errors.pincode = 'Please enter a valid 6-digit pincode';
  }
  
  if (locationData.brick_rate && (isNaN(locationData.brick_rate) || parseFloat(locationData.brick_rate) <= 0)) {
    errors.brick_rate = 'Brick rate must be a positive number';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Validate sale data
export const validateSaleData = (saleData, includeGST: any) => {
  const errors = {};
  
  // Product validation
  if (!saleData.quantity || saleData.quantity < 1) {
    errors.quantity = 'Quantity must be at least 1';
  }
  
  if (!saleData.pricePerBrick || saleData.pricePerBrick <= 0) {
    errors.pricePerBrick = 'Price per brick must be greater than 0';
  }
  
  // Customer validation
  const customerValidation = validateCustomerData({
    name: saleData.customerName,
    phone: saleData.customerPhone,
    email: saleData.customerEmail,
    gstin: saleData.customerGSTIN
  });
  
  if (!customerValidation.isValid) {
    Object.assign(errors, customerValidation.errors);
  }
  
  // Vehicle number validation (if provided)
  if (saleData.vehicleNumber && saleData.vehicleNumber.trim().length > 0) {
    const vehicleRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/;
    if (!vehicleRegex.test(saleData.vehicleNumber.replace(/\s/g, '').toUpperCase())) {
      errors.vehicleNumber = 'Please enter a valid vehicle number (e.g., GJ01AB1234)';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Formatting Functions
 */

// Format currency for display
export const formatCurrency = (amount, currency = '₹') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${currency}0`;
  }
  
  return `${currency}${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
};

// Format quantity for display
export const formatQuantity = (quantity, unit = 'pieces') => {
  if (quantity === null || quantity === undefined || isNaN(quantity)) {
    return '0 pieces';
  }
  
  return `${Number(quantity).toLocaleString('en-IN')} ${unit}`;
};

/**
 * Enhanced Analytics Functions
 */

// Calculate profit margin (enhanced version)
export const calculateEnhancedProfitMargin = (sellingPrice, costPrice) => {
  if (!costPrice || costPrice === 0) return { profit: 0, marginPercentage: 0 };
  
  const profit = sellingPrice - costPrice;
  const marginPercentage = (profit / costPrice) * 100;
  
  return {
    profit: Math.round(profit * 100) / 100,
    marginPercentage: Math.round(marginPercentage * 100) / 100
  };
};

// Calculate customer statistics
export const calculateCustomerStats = (sales = []) => {
  if (!sales || sales.length === 0) {
    return {
      totalOrders: 0,
      totalQuantity: 0,
      totalAmount: 0,
      averageOrderValue: 0,
      averageQuantityPerOrder: 0,
      lastOrderDate: null,
      firstOrderDate: null
    };
  }
  
  const totalOrders = sales.length;
  const totalQuantity = sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
  const totalAmount = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
  
  const sortedByDate = sales.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return {
    totalOrders,
    totalQuantity,
    totalAmount: Math.round(totalAmount * 100) / 100,
    averageOrderValue: totalOrders > 0 ? Math.round((totalAmount / totalOrders) * 100) / 100 : 0,
    averageQuantityPerOrder: totalOrders > 0 ? Math.round((totalQuantity / totalOrders) * 100) / 100 : 0,
    lastOrderDate: sortedByDate[sortedByDate.length - 1]?.date || null,
    firstOrderDate: sortedByDate[0]?.date || null
  };
};

// Calculate monthly trends
export const calculateMonthlyTrends = (sales = [], months = 12) => {
  const now = new Date();
  const trends = [];
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toISOString().substring(0, 7); // YYYY-MM
    
    const monthlySales = sales.filter(sale => sale.date.startsWith(monthKey));
    
    trends.push({
      month: monthKey,
      monthName: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
      totalSales: monthlySales.length,
      totalQuantity: monthlySales.reduce((sum, sale) => sum + (sale.quantity || 0), 0),
      totalRevenue: monthlySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0),
      averageOrderValue: monthlySales.length > 0 
        ? monthlySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) / monthlySales.length 
        : 0
    });
  }
  
  return trends;
};

// Calculate daily trends
export const calculateDailyTrends = (sales = [], days = 30) => {
  const now = new Date();
  const trends = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const dailySales = sales.filter(sale => sale.date === dateKey);
    
    trends.push({
      date: dateKey,
      dayName: date.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' }),
      totalSales: dailySales.length,
      totalQuantity: dailySales.reduce((sum, sale) => sum + (sale.quantity || 0), 0),
      totalRevenue: dailySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
    });
  }
  
  return trends;
};

// Calculate location-wise statistics
export const calculateLocationStats = (sales = []) => {
  const locationMap = new Map();
  
  sales.forEach(sale => {
    const location = sale.location_name || 'No Location';
    
    if (!locationMap.has(location)) {
      locationMap.set(location, {
        locationName: location,
        totalOrders: 0,
        totalQuantity: 0,
        totalAmount: 0,
        customers: new Set()
      });
    }
    
    const stats = locationMap.get(location);
    stats.totalOrders += 1;
    stats.totalQuantity += sale.quantity || 0;
    stats.totalAmount += sale.total_amount || 0;
    stats.customers.add(sale.customer_phone);
  });
  
  return Array.from(locationMap.values()).map(stats => ({
    ...stats,
    uniqueCustomers: stats.customers.size,
    averageOrderValue: stats.totalOrders > 0 ? stats.totalAmount / stats.totalOrders : 0,
    customers: undefined // Remove Set object
  })).sort((a, b) => b.totalAmount - a.totalAmount);
};

/**
 * Auto-Complete Helper Functions
 */

// Generate auto-complete suggestions for customer names
export const generateCustomerSuggestions = (customers = [], searchTerm = '') => {
  if (!searchTerm || searchTerm.length < 2) {
    return [];
  }
  
  const term = searchTerm.toLowerCase();
  
  return customers
    .filter(customer => 
      customer.name.toLowerCase().includes(term) ||
      customer.phone.includes(term) ||
      (customer.business_name && customer.business_name.toLowerCase().includes(term))
    )
    .map(customer => ({
      id: customer.id,
      label: `${customer.name} (${customer.phone})`,
      value: customer.name,
      customer: customer
    }))
    .slice(0, 10); // Limit to 10 suggestions
};

// Generate auto-complete suggestions for locations
export const generateLocationSuggestions = (customer, searchTerm = '') => {
  if (!customer || !customer.locations) {
    return [];
  }
  
  if (!searchTerm) {
    return customer.locations.map(location => ({
      id: location.id,
      label: `${location.name} - ${location.address}`,
      value: location.name,
      location: location
    }));
  }
  
  const term = searchTerm.toLowerCase();
  
  return customer.locations
    .filter(location => 
      location.name.toLowerCase().includes(term) ||
      location.address.toLowerCase().includes(term)
    )
    .map(location => ({
      id: location.id,
      label: `${location.name} - ${location.address}`,
      value: location.name,
      location: location
    }));
};

/**
 * Number to Words Conversion (for invoices)
 */

// Convert number to words (for invoice amounts)
export const numberToWords = (amount) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
               'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 
               'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const convertHundreds = (num) => {
    let result = '';
    
    if (num > 99) {
      result += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    
    if (num > 19) {
      result += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    }
    
    if (num > 0) {
      result += ones[num] + ' ';
    }
    
    return result;
  };
  
  if (amount === 0) return 'Zero Rupees Only';
  
  const crore = Math.floor(amount / 10000000);
  amount %= 10000000;
  
  const lakh = Math.floor(amount / 100000);
  amount %= 100000;
  
  const thousand = Math.floor(amount / 1000);
  amount %= 1000;
  
  const hundred = Math.floor(amount);
  const paise = Math.round((amount - hundred) * 100);
  
  let result = '';
  
  if (crore > 0) {
    result += convertHundreds(crore) + 'Crore ';
  }
  
  if (lakh > 0) {
    result += convertHundreds(lakh) + 'Lakh ';
  }
  
  if (thousand > 0) {
    result += convertHundreds(thousand) + 'Thousand ';
  }
  
  if (hundred > 0) {
    result += convertHundreds(hundred);
  }
  
  if (result) {
    result += 'Rupees ';
  }
  
  if (paise > 0) {
    result += convertHundreds(paise) + 'Paise ';
  }
  
  result += 'Only';
  
  return result.trim();
};