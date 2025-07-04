import { DEFAULT_CEMENT_PER_BRICK_RATIO, BRICKS_PER_CEMENT_BAG } from './constants';

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