// App Constants
export const APP_NAME = "Brick Production Manager";

// Production Constants
export const DEFAULT_CEMENT_PER_BRICK_RATIO = 0.05; // 0.05 bags of cement per brick
export const BRICKS_PER_CEMENT_BAG = 20; // 20 bricks per bag of cement

// Default Prices
export const DEFAULT_BRICK_PRICE = 2.5; // Price per brick
export const DEFAULT_CEMENT_COST = 25; // Cost per bag of cement

// Stock Alert Thresholds
export const LOW_STOCK_ALERTS = {
  BRICKS: 1000, // Alert when brick stock goes below 1000
  CEMENT: 10, // Alert when cement stock goes below 10 bags
};

// Firebase Database Paths
export const DB_PATHS = {
  BRICKS: "bricks",
  CEMENT: "cement",
  SETTINGS: "settings",
  PRODUCTION: "bricks/production",
  SALES: "bricks/sales",
  CUSTOMERS: "customers",
  COMPANY: "company",
  BANK_DETAILS: "settings/bank_details",
  PAYMENTS: "bricks/sales/payments",
  INVOICES: "bricks/sales/invoices",
  SUPPLIERS: "suppliers",
  PURCHASES: "purchases",
  INVENTORY: {
    BRICKS: "bricks/inventory",
    CEMENT: "cement/inventory",
  },
  MATERIALS: {
    SAND: "materials/sand",
    FLY_ASH: "materials/fly_ash",
    DUST: "materials/dust",
    LIME: "materials/lime",
    CHEMICAL: "materials/chemical",
  },
  MATERIAL_PURCHASES: "materials/purchases",
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: "MMM dd, yyyy",
  API: "yyyy-MM-dd",
  TIMESTAMP: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
};

// Transaction Types
export const TRANSACTION_TYPES = {
  PRODUCTION: "production",
  SALE: "sale",
  CEMENT_PURCHASE: "cement_purchase",
  STOCK_ADJUSTMENT: "stock_adjustment",
};

// Status Types
export const STATUS_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
};

export const SUPPLIER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  BLOCKED: "blocked",
};

export const SUPPLIER_TYPES = {
  RAW_MATERIAL: 'Raw Material',
  CEMENT: 'Cement',
  EQUIPMENT: 'Equipment',
  FUEL: 'Fuel',
  MAINTENANCE: 'Maintenance',
  TRANSPORT: 'Transport',
  OTHER: 'Other'
};

// Form Validation Rules
export const VALIDATION_RULES = {
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 100000,
  MIN_PRICE: 0.01,
  MAX_PRICE: 1000,
  // More flexible phone regex that accepts various formats
  PHONE_REGEX: /^[\+]?[\d\s\-\(\)]{7,15}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  GSTIN_REGEX: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  PINCODE_REGEX: /^[0-9]{6}$/,
  IFSC_REGEX: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  ACCOUNT_NUMBER_REGEX: /^[0-9]{9,18}$/,
};

// GST RATES AND HSN CODES
export const GST_RATES = {
  CGST: 2.5, // Central GST 6%
  SGST: 2.5, // State GST 6%
  IGST: 5, // Integrated GST 12% (for inter-state)
};

export const GST_REPORT_TYPES = {
  GSTR1: 'Outward Supplies', // Outward supplies
  GSTR2: 'Inward Supplies', // Inward supplies
  GSTR3B: 'Total Return', // Monthly return
};

export const HSN_CODES = {
  FLY_ASH_BRICKS: "6815",
  CLAY_BRICKS: "6901",
  CONCRETE_BLOCKS: "6810",
};

// PAYMENT METHODS
export const PAYMENT_METHODS = {
  cash: { id: "cash", label: "Cash", icon: "Money" },
  credit: { id: "credit", label: "Credit", icon: "CreditCard" },
  digital: { id: "digital", label: "Digital Payment", icon: "Payment" },
  cheque: { id: "cheque", label: "Cheque", icon: "Receipt" },
  bank_transfer: {
    id: "bank_transfer",
    label: "Bank Transfer",
    icon: "AccountBalance",
  },
};

// INDIAN STATES WITH CODES
export const INDIAN_STATES = {
  AN: { code: "35", name: "Andaman and Nicobar Islands" },
  AP: { code: "28", name: "Andhra Pradesh" },
  AR: { code: "12", name: "Arunachal Pradesh" },
  AS: { code: "18", name: "Assam" },
  BR: { code: "10", name: "Bihar" },
  CH: { code: "04", name: "Chandigarh" },
  CG: { code: "22", name: "Chhattisgarh" },
  DH: { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  DL: { code: "07", name: "Delhi" },
  GA: { code: "30", name: "Goa" },
  GJ: { code: "24", name: "Gujarat" },
  HR: { code: "06", name: "Haryana" },
  HP: { code: "02", name: "Himachal Pradesh" },
  JK: { code: "01", name: "Jammu and Kashmir" },
  JH: { code: "20", name: "Jharkhand" },
  KA: { code: "29", name: "Karnataka" },
  KL: { code: "32", name: "Kerala" },
  LA: { code: "37", name: "Ladakh" },
  LD: { code: "31", name: "Lakshadweep" },
  MP: { code: "23", name: "Madhya Pradesh" },
  MH: { code: "27", name: "Maharashtra" },
  MN: { code: "14", name: "Manipur" },
  ML: { code: "17", name: "Meghalaya" },
  MZ: { code: "15", name: "Mizoram" },
  NL: { code: "13", name: "Nagaland" },
  OR: { code: "21", name: "Odisha" },
  PY: { code: "34", name: "Puducherry" },
  PB: { code: "03", name: "Punjab" },
  RJ: { code: "08", name: "Rajasthan" },
  SK: { code: "11", name: "Sikkim" },
  TN: { code: "33", name: "Tamil Nadu" },
  TS: { code: "36", name: "Telangana" },
  TR: { code: "16", name: "Tripura" },
  UP: { code: "09", name: "Uttar Pradesh" },
  UK: { code: "05", name: "Uttarakhand" },
  WB: { code: "19", name: "West Bengal" },
};

// COMPANY DEFAULT DETAILS (Static company info)
export const DEFAULT_COMPANY_INFO = {
  name: "PATEL BRICKS",
  address: "BEHIND PATEL PETROLEUM, MANDAL ROAD, @BHOJVA, VIRAMGAM-382150",
  phone: ["98980321392", "8000001819"],
  email: "patelbricks1819@gmail.com",
  gstin: "24BLLPP8863R1ZX",
  state: "GUJARAT",
  stateCode: "24",
  hsnCode: HSN_CODES.FLY_ASH_BRICKS,
  productDescription: "FLY ASH BRICKS",
  transportationMode: "BY ROAD",
};

// INVOICE TERMS AND CONDITIONS
export const INVOICE_TERMS = [
  "Goods once sold can not be taken back or exchange",
  "Payment will be made after one month of delivery",
  "All Taxes and Commission will be charged extra.",
];

// INVOICE SETTINGS
export const INVOICE_SETTINGS = {
  reverseCharge: false,
  reverseChargeText: "NO",
  hsnCodeStatic: HSN_CODES.FLY_ASH_BRICKS, // Static HSN code as per requirement
  productDescription: "FLY ASH BRICKS",
  defaultTransportMode: "BY ROAD",
};

// DEFAULT BANK DETAILS (Editable via settings)
export const DEFAULT_BANK_DETAILS = {
  bankName: "KOTAK MAHINDRA BANK",
  accountNumber: "3647213697",
  ifscCode: "KKBK0000160",
  branch: "Viramgam Branch",
};

// Number to words utility constants
export const NUMBER_TO_WORDS = {
  ones: [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ],
  tens: [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ],
  scales: ["", "Thousand", "Lakh", "Crore"],
};

// Bank details validation schema
export const BANK_DETAILS_SCHEMA = {
  bankName: { required: true, minLength: 2, maxLength: 100 },
  accountNumber: {
    required: true,
    pattern: VALIDATION_RULES.ACCOUNT_NUMBER_REGEX,
  },
  ifscCode: { required: true, pattern: VALIDATION_RULES.IFSC_REGEX },
  branch: { required: true, minLength: 2, maxLength: 100 },
};

// Export utility functions for bank details
export const getBankDetails = async () => {
  // This function should be implemented in a service to fetch from Firebase
  // For now, return default
  return DEFAULT_BANK_DETAILS;
};

export const updateBankDetails = async (newBankDetails) => {
  // This function should be implemented in a service to update Firebase
  // Validate against BANK_DETAILS_SCHEMA before saving
  return { success: true, data: newBankDetails };
};

// Chart Colors
export const CHART_COLORS = {
  PRIMARY: "#1976d2",
  SECONDARY: "#dc004e",
  SUCCESS: "#2e7d32",
  WARNING: "#ed6c02",
  ERROR: "#d32f2f",
  INFO: "#0288d1",
};

// Navigation Menu Items
export const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", path: "/", icon: "Dashboard" },
  {
    id: "production",
    label: "Production",
    path: "/production",
    icon: "Factory",
  },
  {
    id: "inventory",
    label: "Inventory",
    path: "/inventory",
    icon: "Inventory",
  },
  { id: "sales", label: "Sales", path: "/sales", icon: "ShoppingCart" },
  { id: "customers", label: "Customers", path: "/customers", icon: "People" },
  {
    id: "suppliers",
    label: "Suppliers",
    path: "/suppliers",
    icon: "LocalShipping",
  }, // NEW
  // { id: "reports", label: "Reports", path: "/reports", icon: "Assessment" },
  {
    id: "gst-reports",
    label: "GST Reports",
    path: "/gst-reports",
    icon: "Receipt",
  },
  { id: "settings", label: "Settings", path: "/settings", icon: "Settings" },
];

// Production Shifts
export const PRODUCTION_SHIFTS = {
  morning: { id: "morning", label: "Morning (6 AM - 2 PM)" },
  afternoon: { id: "afternoon", label: "Afternoon (2 PM - 10 PM)" },
  night: { id: "night", label: "Night (10 PM - 6 AM)" },
  allday: { id: "allday", label: "All Day (6 AM - 6 AM)" },
};

// Quality Grades
export const QUALITY_GRADES = {
  A: { id: "A", label: "Grade A (Premium)", multiplier: 1.2 },
  B: { id: "B", label: "Grade B (Standard)", multiplier: 1.0 },
  C: { id: "C", label: "Grade C (Economy)", multiplier: 0.8 },
};

// Report Types
export const REPORT_TYPES = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
  CUSTOM: "custom",
};

// Local Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: "brick_app_user_preferences",
  THEME: "brick_app_theme",
  LAST_BACKUP: "brick_app_last_backup",
};

// API Response Messages
export const MESSAGES = {
  SUCCESS: {
    PRODUCTION_ADDED: "Production entry added successfully",
    SALE_RECORDED: "Sale recorded successfully",
    INVENTORY_UPDATED: "Inventory updated successfully",
    SETTINGS_SAVED: "Settings saved successfully",
  },
  ERROR: {
    INSUFFICIENT_STOCK: "Insufficient stock available",
    INVALID_DATA: "Invalid data provided",
    NETWORK_ERROR: "Network connection error",
    PERMISSION_DENIED: "Permission denied",
    OPERATION_FAILED: "Operation failed. Please try again",
  },
  WARNING: {
    LOW_STOCK: "Stock is running low",
    UNSAVED_CHANGES: "You have unsaved changes",
    DATA_LOSS: "This action may result in data loss",
  },
};

// Extended Database Paths for Settings
export const SETTINGS_PATHS = {
  COMPANY_INFO: "settings/company_info",
  BANK_DETAILS: "settings/bank_details",
  INVOICE_CONFIG: "settings/invoice_config",
  NOTIFICATIONS: "settings/notifications",
  STOCK_ALERTS: "settings/stock_alerts",
};

// Invoice Terms and Conditions (default)
export const DEFAULT_INVOICE_TERMS = [
  "Goods once sold can not be taken back or exchange",
  "Payment will be made after one month of delivery",
  "All Taxes and Commission will be charged extra",
  "Interest @ 18% per annum will be charged on delayed payments",
  "All disputes subject to Viramgam jurisdiction only",
];

// Default Invoice Configuration
export const DEFAULT_INVOICE_CONFIG = {
  reverseCharge: false,
  reverseChargeText: "NO",
  hsnCodeStatic: HSN_CODES.FLY_ASH_BRICKS,
  productDescription: "FLY ASH BRICKS",
  defaultTransportMode: "BY ROAD",
  gstRates: GST_RATES,
  terms: DEFAULT_INVOICE_TERMS,
  invoiceFormat: {
    showCompanyLogo: true,
    showCustomerDetails: true,
    showBankDetails: true,
    showTerms: true,
    showSignature: true,
  },
  numbering: {
    prefix: "INV",
    startingNumber: 1,
    autoIncrement: true,
  },
};

// Transportation modes
export const TRANSPORT_MODES = [
  "BY ROAD",
  "BY RAIL",
  "BY AIR",
  "BY SEA",
  "BY COURIER",
  "SELF PICKUP",
];

// HSN Code descriptions
export const HSN_CODE_DESCRIPTIONS = {
  [HSN_CODES.FLY_ASH_BRICKS]:
    "Articles of stone, plaster, cement, asbestos, mica or similar materials - Fly Ash Bricks",
  [HSN_CODES.CLAY_BRICKS]:
    "Bricks, blocks, tiles and other ceramic goods of siliceous fossil meals - Clay Bricks",
  [HSN_CODES.CONCRETE_BLOCKS]:
    "Articles of cement, of concrete or of artificial stone - Concrete Blocks",
};

// Company validation schema
export const COMPANY_VALIDATION_SCHEMA = {
  name: { required: true, minLength: 2, maxLength: 100 },
  address: { required: true, minLength: 10, maxLength: 500 },
  phone: { required: true, pattern: VALIDATION_RULES.PHONE_REGEX },
  email: { required: true, pattern: VALIDATION_RULES.EMAIL_REGEX },
  gstin: { required: true, pattern: VALIDATION_RULES.GSTIN_REGEX },
  state: { required: true },
  stateCode: { required: true, pattern: /^[0-9]{2}$/ },
};

// Invoice validation schema
export const INVOICE_VALIDATION_SCHEMA = {
  hsnCodeStatic: { required: true, minLength: 4, maxLength: 8 },
  productDescription: { required: true, minLength: 3, maxLength: 100 },
  defaultTransportMode: { required: true, minLength: 3, maxLength: 50 },
  "gstRates.CGST": { required: true, min: 0, max: 50 },
  "gstRates.SGST": { required: true, min: 0, max: 50 },
  "gstRates.IGST": { required: true, min: 0, max: 50 },
  "numbering.startingNumber": { required: true, min: 1 },
};

// Notification types
export const NOTIFICATION_TYPES = {
  LOW_STOCK: "low_stock",
  PRODUCTION_REMINDER: "production_reminder",
  SALES_MILESTONE: "sales_milestone",
  DAILY_REPORT: "daily_report",
  SYSTEM_UPDATE: "system_update",
};

// Default notification settings
export const DEFAULT_NOTIFICATION_SETTINGS = {
  lowStockAlerts: true,
  emailNotifications: false,
  smsNotifications: false,
  dailyReports: false,
  productionReminders: true,
  salesNotifications: true,
  systemUpdates: true,
};

// Default stock alert thresholds
export const DEFAULT_STOCK_THRESHOLDS = {
  BRICKS: 1000,
  CEMENT: 10,
  LOW_STOCK_WARNING_DAYS: 7, // Warn when stock will last less than 7 days
  CRITICAL_STOCK_WARNING_DAYS: 3, // Critical when stock will last less than 3 days
};

// Settings categories for organization
export const SETTINGS_CATEGORIES = {
  COMPANY: {
    id: "company",
    label: "Company Information",
    description: "Basic company details and contact information",
    icon: "Business",
  },
  BANK: {
    id: "bank",
    label: "Bank Details",
    description: "Banking information for invoices",
    icon: "AccountBalance",
  },
  INVOICE: {
    id: "invoice",
    label: "Invoice Configuration",
    description: "Invoice format, terms, and GST settings",
    icon: "Receipt",
  },
  NOTIFICATIONS: {
    id: "notifications",
    label: "Notifications",
    description: "Alert preferences and thresholds",
    icon: "Notifications",
  },
  DATA: {
    id: "data",
    label: "Data Management",
    description: "Import, export, and reset options",
    icon: "Storage",
  },
  ABOUT: {
    id: "about",
    label: "About",
    description: "Application information and support",
    icon: "Info",
  },
};

// Export helper functions for settings
export const settingsHelpers = {
  // Validate company information
  validateCompanyInfo: (info) => {
    const errors = {};

    Object.entries(COMPANY_VALIDATION_SCHEMA).forEach(([field, rules]) => {
      const value = info[field];

      if (rules.required && (!value || value.toString().trim().length === 0)) {
        errors[field] = `${
          field.charAt(0).toUpperCase() + field.slice(1)
        } is required`;
      }

      if (
        value &&
        rules.minLength &&
        value.toString().length < rules.minLength
      ) {
        errors[
          field
        ] = `${field} must be at least ${rules.minLength} characters`;
      }

      if (
        value &&
        rules.maxLength &&
        value.toString().length > rules.maxLength
      ) {
        errors[
          field
        ] = `${field} must be no more than ${rules.maxLength} characters`;
      }

      if (value && rules.pattern && !rules.pattern.test(value.toString())) {
        errors[field] = `${field} format is invalid`;
      }
    });

    return errors;
  },

  // Get default settings
  getDefaultSettings: () => ({
    companyInfo: DEFAULT_COMPANY_INFO,
    bankDetails: DEFAULT_BANK_DETAILS,
    invoiceConfig: DEFAULT_INVOICE_CONFIG,
    notifications: DEFAULT_NOTIFICATION_SETTINGS,
    stockThresholds: DEFAULT_STOCK_THRESHOLDS,
  }),

  // Format settings for display
  formatSettingsForDisplay: (settings) => {
    return {
      ...settings,
      companyInfo: {
        ...settings.companyInfo,
        phone: Array.isArray(settings.companyInfo.phone)
          ? settings.companyInfo.phone
          : [settings.companyInfo.phone].filter(Boolean),
      },
    };
  },
};
