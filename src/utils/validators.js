/**
 * Validation utility functions for the brick production app
 */

import { VALIDATION_RULES } from './constants';

// Basic validation helpers
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

export const isNotEmpty = (value) => !isEmpty(value);

// Number validators
export const isNumber = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

export const isInteger = (value) => {
  return Number.isInteger(parseFloat(value));
};

export const isPositiveNumber = (value) => {
  return isNumber(value) && parseFloat(value) > 0;
};

export const isNonNegativeNumber = (value) => {
  return isNumber(value) && parseFloat(value) >= 0;
};

export const isInRange = (value, min, max) => {
  const num = parseFloat(value);
  return isNumber(value) && num >= min && num <= max;
};

// String validators
export const isString = (value) => {
  return typeof value === 'string';
};

export const hasMinLength = (value, minLength) => {
  return isString(value) && value.length >= minLength;
};

export const hasMaxLength = (value, maxLength) => {
  return isString(value) && value.length <= maxLength;
};

export const isLengthBetween = (value, minLength, maxLength) => {
  return isString(value) && value.length >= minLength && value.length <= maxLength;
};

// Email validator
export const isValidEmail = (email) => {
  if (!isString(email)) return false;
  return VALIDATION_RULES.EMAIL_REGEX.test(email.trim());
};

// Phone number validator
export const isValidPhone = (phone) => {
  if (!isString(phone)) return false;
  const cleanPhone = phone.replace(/\s/g, '');
  return VALIDATION_RULES.PHONE_REGEX.test(cleanPhone);
};

// Date validators
export const isValidDate = (date) => {
  if (!date) return false;
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};

export const isDateInPast = (date) => {
  if (!isValidDate(date)) return false;
  return new Date(date) < new Date();
};

export const isDateInFuture = (date) => {
  if (!isValidDate(date)) return false;
  return new Date(date) > new Date();
};

export const isDateToday = (date) => {
  if (!isValidDate(date)) return false;
  const today = new Date();
  const checkDate = new Date(date);
  return (
    checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
};

// Production-specific validators
export const validateQuantity = (quantity) => {
  const errors = [];
  
  if (isEmpty(quantity)) {
    errors.push('Quantity is required');
  } else if (!isNumber(quantity)) {
    errors.push('Quantity must be a number');
  } else if (!isInteger(quantity)) {
    errors.push('Quantity must be a whole number');
  } else if (!isInRange(quantity, VALIDATION_RULES.MIN_QUANTITY, VALIDATION_RULES.MAX_QUANTITY)) {
    errors.push(`Quantity must be between ${VALIDATION_RULES.MIN_QUANTITY} and ${VALIDATION_RULES.MAX_QUANTITY.toLocaleString()}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validatePrice = (price) => {
  const errors = [];
  
  if (isEmpty(price)) {
    errors.push('Price is required');
  } else if (!isNumber(price)) {
    errors.push('Price must be a number');
  } else if (!isInRange(price, VALIDATION_RULES.MIN_PRICE, VALIDATION_RULES.MAX_PRICE)) {
    errors.push(`Price must be between $${VALIDATION_RULES.MIN_PRICE} and $${VALIDATION_RULES.MAX_PRICE}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateCementRatio = (ratio) => {
  const errors = [];
  
  if (isEmpty(ratio)) {
    errors.push('Cement ratio is required');
  } else if (!isNumber(ratio)) {
    errors.push('Cement ratio must be a number');
  } else if (!isPositiveNumber(ratio)) {
    errors.push('Cement ratio must be greater than 0');
  } else if (parseFloat(ratio) > 1) {
    errors.push('Cement ratio seems too high (should be less than 1 bag per brick)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateDiscount = (discount) => {
  const errors = [];
  
  if (!isEmpty(discount)) {
    if (!isNumber(discount)) {
      errors.push('Discount must be a number');
    } else if (!isInRange(discount, 0, 100)) {
      errors.push('Discount must be between 0% and 100%');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Customer information validators
export const validateCustomerName = (name) => {
  const errors = [];
  
  if (!isEmpty(name)) {
    if (!isString(name)) {
      errors.push('Customer name must be text');
    } else if (!hasMinLength(name, 2)) {
      errors.push('Customer name must be at least 2 characters');
    } else if (!hasMaxLength(name, 100)) {
      errors.push('Customer name must be less than 100 characters');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateCustomerPhone = (phone) => {
  const errors = [];
  
  if (!isEmpty(phone)) {
    if (!isValidPhone(phone)) {
      errors.push('Please enter a valid phone number');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateCustomerEmail = (email) => {
  const errors = [];
  
  if (!isEmpty(email)) {
    if (!isValidEmail(email)) {
      errors.push('Please enter a valid email address');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Stock validators
export const validateStockLevel = (stock, threshold = 0) => {
  const errors = [];
  
  if (isEmpty(stock)) {
    errors.push('Stock level is required');
  } else if (!isNumber(stock)) {
    errors.push('Stock level must be a number');
  } else if (!isInteger(stock)) {
    errors.push('Stock level must be a whole number');
  } else if (!isNonNegativeNumber(stock)) {
    errors.push('Stock level cannot be negative');
  } else if (parseFloat(stock) < threshold) {
    errors.push(`Stock level is below threshold (${threshold})`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings: parseFloat(stock) < threshold ? ['Stock level is low'] : [],
  };
};

export const validateStockOperation = (operation, quantity, currentStock) => {
  const errors = [];
  const quantityValidation = validateQuantity(quantity);
  
  if (!quantityValidation.isValid) {
    errors.push(...quantityValidation.errors);
  }
  
  if (!['add', 'subtract', 'set'].includes(operation)) {
    errors.push('Invalid stock operation');
  }
  
  if (operation === 'subtract') {
    const newStock = currentStock - parseFloat(quantity);
    if (newStock < 0) {
      errors.push('Cannot subtract more than current stock');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Production validators - Updated
export const validateProductionEntry = (data) => {
  const errors = [];
  const { quantity, cementUsed, shift, notes } = data; // Removed quality from destructuring
  
  // Validate quantity
  const quantityValidation = validateQuantity(quantity);
  if (!quantityValidation.isValid) {
    errors.push(...quantityValidation.errors);
  }
  
  // Validate cement used
  if (isEmpty(cementUsed)) {
    errors.push('Cement used is required');
  } else if (!isNumber(cementUsed)) {
    errors.push('Cement used must be a number');
  } else if (!isNonNegativeNumber(cementUsed)) {
    errors.push('Cement used cannot be negative');
  }
  
  // Validate shift - Updated to include new shift values
  if (isEmpty(shift)) {
    errors.push('Production shift is required');
  } else if (!['morning', 'afternoon', 'night', 'allday'].includes(shift)) {
    errors.push('Invalid production shift');
  }
  
  // REMOVED quality validation - no longer needed
  
  // Validate notes (optional)
  if (!isEmpty(notes) && !hasMaxLength(notes, 500)) {
    errors.push('Notes must be less than 500 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Sales validators
export const validateSaleEntry = (data) => {
  const errors = [];
  const { 
    quantity, 
    pricePerBrick, 
    customerName, 
    customerPhone, 
    customerEmail, 
    discount, 
    paymentMethod 
  } = data;
  
  // Validate quantity
  const quantityValidation = validateQuantity(quantity);
  if (!quantityValidation.isValid) {
    errors.push(...quantityValidation.errors);
  }
  
  // Validate price
  const priceValidation = validatePrice(pricePerBrick);
  if (!priceValidation.isValid) {
    errors.push(...priceValidation.errors);
  }
  
  // Validate customer information (optional)
  const nameValidation = validateCustomerName(customerName);
  if (!nameValidation.isValid) {
    errors.push(...nameValidation.errors);
  }
  
  const phoneValidation = validateCustomerPhone(customerPhone);
  if (!phoneValidation.isValid) {
    errors.push(...phoneValidation.errors);
  }
  
  const emailValidation = validateCustomerEmail(customerEmail);
  if (!emailValidation.isValid) {
    errors.push(...emailValidation.errors);
  }
  
  // Validate discount
  const discountValidation = validateDiscount(discount);
  if (!discountValidation.isValid) {
    errors.push(...discountValidation.errors);
  }
  
  // Validate payment method
  if (isEmpty(paymentMethod)) {
    errors.push('Payment method is required');
  } else if (!['cash', 'card', 'check', 'bank_transfer', 'credit'].includes(paymentMethod)) {
    errors.push('Invalid payment method');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Settings validators
export const validateSettings = (settings) => {
  const errors = [];
  
  // Validate cement ratio
  const ratioValidation = validateCementRatio(settings.cement_per_brick_ratio);
  if (!ratioValidation.isValid) {
    errors.push(...ratioValidation.errors);
  }
  
  // Validate default brick price
  const priceValidation = validatePrice(settings.default_brick_price);
  if (!priceValidation.isValid) {
    errors.push(...priceValidation.errors);
  }
  
  // Validate low stock alerts
  if (settings.low_stock_alert) {
    const brickAlertValidation = validateQuantity(settings.low_stock_alert.bricks);
    if (!brickAlertValidation.isValid) {
      errors.push('Invalid brick alert threshold');
    }
    
    const cementAlertValidation = validateQuantity(settings.low_stock_alert.cement);
    if (!cementAlertValidation.isValid) {
      errors.push('Invalid cement alert threshold');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Generic form validator
export const validateForm = (data, rules) => {
  const errors = {};
  let isValid = true;
  
  Object.keys(rules).forEach(field => {
    const fieldRules = rules[field];
    const fieldValue = data[field];
    const fieldErrors = [];
    
    // Check required
    if (fieldRules.required && isEmpty(fieldValue)) {
      fieldErrors.push(`${field} is required`);
    }
    
    // Skip other validations if field is empty and not required
    if (isEmpty(fieldValue) && !fieldRules.required) {
      return;
    }
    
    // Check type
    if (fieldRules.type === 'number' && !isNumber(fieldValue)) {
      fieldErrors.push(`${field} must be a number`);
    } else if (fieldRules.type === 'email' && !isValidEmail(fieldValue)) {
      fieldErrors.push(`${field} must be a valid email`);
    } else if (fieldRules.type === 'phone' && !isValidPhone(fieldValue)) {
      fieldErrors.push(`${field} must be a valid phone number`);
    }
    
    // Check min/max for numbers
    if (fieldRules.type === 'number' && isNumber(fieldValue)) {
      const numValue = parseFloat(fieldValue);
      if (fieldRules.min !== undefined && numValue < fieldRules.min) {
        fieldErrors.push(`${field} must be at least ${fieldRules.min}`);
      }
      if (fieldRules.max !== undefined && numValue > fieldRules.max) {
        fieldErrors.push(`${field} must be at most ${fieldRules.max}`);
      }
    }
    
    // Check min/max length for strings
    if (fieldRules.type === 'string' || typeof fieldValue === 'string') {
      if (fieldRules.minLength && !hasMinLength(fieldValue, fieldRules.minLength)) {
        fieldErrors.push(`${field} must be at least ${fieldRules.minLength} characters`);
      }
      if (fieldRules.maxLength && !hasMaxLength(fieldValue, fieldRules.maxLength)) {
        fieldErrors.push(`${field} must be at most ${fieldRules.maxLength} characters`);
      }
    }
    
    // Custom validator
    if (fieldRules.validator && typeof fieldRules.validator === 'function') {
      const customResult = fieldRules.validator(fieldValue, data);
      if (customResult !== true) {
        fieldErrors.push(customResult);
      }
    }
    
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
      isValid = false;
    }
  });
  
  return {
    isValid,
    errors,
  };
};

// Sanitization helpers
export const sanitizeString = (str) => {
  if (!isString(str)) return '';
  return str.trim().replace(/[<>]/g, '');
};

export const sanitizeNumber = (num) => {
  const parsed = parseFloat(num);
  return isNaN(parsed) ? 0 : parsed;
};

export const sanitizeInteger = (num) => {
  const parsed = parseInt(num);
  return isNaN(parsed) ? 0 : parsed;
};

// Utility function to get all validation errors as a flat array
export const getAllErrors = (validationResult) => {
  if (Array.isArray(validationResult.errors)) {
    return validationResult.errors;
  }
  
  if (typeof validationResult.errors === 'object') {
    return Object.values(validationResult.errors).flat();
  }
  
  return [];
};

// Utility function to check if any validation failed
export const hasValidationErrors = (validationResults) => {
  return validationResults.some(result => !result.isValid);
};