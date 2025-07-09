// services/salesService.js - Updated to support GST toggle and maintain backward compatibility
import { dbUtils } from "./firebase";
import { customerService } from "./customerService";
import {
  DB_PATHS,
  DEFAULT_COMPANY_INFO,
  DEFAULT_BANK_DETAILS,
  HSN_CODES,
  GST_RATES,
} from "../utils/constants";

// Utility function to calculate GST amounts
const calculateGSTAmounts = (taxableAmount, isInterState = false) => {
  let cgstAmount = 0,
    sgstAmount = 0,
    igstAmount = 0;

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
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    cgstRate: isInterState ? 0 : GST_RATES.CGST,
    sgstRate: isInterState ? 0 : GST_RATES.SGST,
    igstRate: isInterState ? GST_RATES.IGST : 0,
  };
};

// Generate invoice number
const generateInvoiceNumber = async (date) => {
  try {
    const currentMonth = date.substring(0, 7); // YYYY-MM
    const monthPath = `${DB_PATHS.SALES}/counters/${currentMonth}`;

    // Get current counter for the month
    const counterResult = await dbUtils.readData(monthPath);
    const currentCounter = counterResult.success
      ? counterResult.data?.count || 0
      : 0;
    const newCounter = currentCounter + 1;

    // Update counter
    await dbUtils.writeData(monthPath, {
      count: newCounter,
      last_updated: dbUtils.timestamp(),
    });

    // Generate invoice number: B18-YYMM-001
    const year = date.substring(2, 4); // YY
    const month = date.substring(5, 7); // MM
    const invoiceNumber = `B18-${year}${month}-${newCounter
      .toString()
      .padStart(3, "0")}`;

    return invoiceNumber;
  } catch (error) {
    
    // Fallback to timestamp-based number
    return `B18-${Date.now()}`;
  }
};

// Calculate sale amounts
const calculateSaleAmount = (
  quantity,
  pricePerBrick,
  discount = 0,
  discountType = "amount"
) => {
  const subtotal = quantity * pricePerBrick;
  const discountAmount =
    discountType === "percentage" 
      ? (subtotal * discount) / 100 
      : discount;
  const taxableAmount = subtotal - discountAmount;

  return {
    subtotal,
    discountAmount,
    taxableAmount,
  };
};

export const salesService = {
  /**
   * SALES OPERATIONS
   */

  // Record new sale with enhanced features including GST toggle
  recordSale: async ({
    date,
    quantity,
    pricePerBrick,
    customerName,
    customerPhone,
    customerEmail = "",
    customerAddress,
    customerState = "GJ",
    customerStateCode = "24",
    customerGSTIN = "",
    locationName = "",
    locationId = null,
    vehicleNumber = "",
    challanNumber = "",
    discount = 0,
    discountType = "amount",
    paymentMethod = "cash",
    notes = "",
    hsnCode = HSN_CODES.FLY_ASH_BRICKS,
    includeGST = false, // New GST toggle parameter
    calculatedAmounts = null, // Pre-calculated amounts from form
  }) => {
    try {
      // Validate required parameters
      if (!quantity || !pricePerBrick || !customerName || !customerPhone || !customerAddress) {
        return {
          success: false,
          error: "Missing required fields: quantity, price, customer name, phone, and address are required",
        };
      }

      // Check brick availability
      const capacityResult = await dbUtils.readData(DB_PATHS.INVENTORY.BRICKS);
      if (!capacityResult.success) {
        return {
          success: false,
          error: "Could not verify brick availability",
        };
      }

      const currentStock = capacityResult.data?.total_stock || 0;
      if (currentStock < quantity) {
        return {
          success: false,
          error: `Insufficient stock. Required: ${quantity.toLocaleString()} bricks, Available: ${currentStock.toLocaleString()} bricks`,
          data: capacityResult.data,
        };
      }

      const currentDate = date || dbUtils.dateString();
      const timestamp = dbUtils.timestamp();

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber(currentDate);

      // Calculate amounts
      const { subtotal, discountAmount, taxableAmount } = calculateSaleAmount(
        quantity,
        pricePerBrick,
        discount,
        discountType
      );

      // Determine if inter-state (assuming company is in Gujarat)
      const isInterState = customerState !== "GJ";

      // Calculate GST only if includeGST is true
      let gstCalculation = {
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTax: 0,
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 0,
      };

      if (includeGST) {
        gstCalculation = calculateGSTAmounts(taxableAmount, isInterState);
      }

      const totalAmount = taxableAmount + gstCalculation.totalTax;

      // Update stock
      const newStock = currentStock - quantity;
      
      // Load current bank details
      let bankDetails = DEFAULT_BANK_DETAILS;
      try {
        const bankResult = await dbUtils.readData("settings/bank_details");
        if (bankResult.success && bankResult.data) {
          bankDetails = bankResult.data;
        }
      } catch (error) {
        
      }

      // Prepare enhanced sale entry
      const saleEntry = {
        // Invoice details
        invoice_number: invoiceNumber,
        date: currentDate,
        timestamp,

        // Product details
        quantity,
        price_per_brick: pricePerBrick,
        hsn_code: hsnCode,
        product_description: "FLY ASH BRICKS",

        // Customer details
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer_address: customerAddress,
        customer_state: customerState,
        customer_state_code: customerStateCode,
        customer_gstin: customerGSTIN,

        // Location details (new)
        location_name: locationName,
        location_id: locationId,

        // Transport details (new)
        vehicle_number: vehicleNumber,
        challan_number: challanNumber,

        // Amount calculations
        subtotal,
        discount_amount: discountAmount,
        discount_type: discountType,
        taxable_amount: taxableAmount,

        // GST details - IMPORTANT: Store the GST toggle flag
        include_gst: includeGST,
        gst_included: includeGST, // Alternative field name for compatibility
        is_inter_state: isInterState,
        cgst_rate: gstCalculation.cgstRate,
        sgst_rate: gstCalculation.sgstRate,
        igst_rate: gstCalculation.igstRate,
        cgst_amount: gstCalculation.cgstAmount,
        sgst_amount: gstCalculation.sgstAmount,
        igst_amount: gstCalculation.igstAmount,
        total_tax: gstCalculation.totalTax,
        total_amount: totalAmount,

        // Payment details
        payment_method: paymentMethod,
        notes,

        // Company and bank details (for invoice generation)
        company_details: DEFAULT_COMPANY_INFO,
        bank_details: bankDetails,

        // Status
        status: "completed",
        created_by: "system",
      };

      // Prepare batch updates
      const updates = {};

      // 1. Add to sales transactions
      updates[`${DB_PATHS.SALES}/transactions/${invoiceNumber}`] = saleEntry;

      // 2. Update daily sales summary
      const dailyPath = `${DB_PATHS.SALES}/daily/${currentDate}`;
      const existingDailyResult = await dbUtils.readData(dailyPath);
      const existingDaily = (existingDailyResult.success && existingDailyResult.data) ? existingDailyResult.data : {};
      
      updates[dailyPath] = {
        date: currentDate,
        total_sales: (existingDaily.total_sales || 0) + 1,
        total_quantity: (existingDaily.total_quantity || 0) + quantity,
        total_revenue: (existingDaily.total_revenue || 0) + totalAmount,
        last_updated: timestamp,
      };

      // 3. Update monthly sales summary
      const monthlyPath = `${DB_PATHS.SALES}/monthly/${currentDate.substring(0, 7)}`;
      const existingMonthlyResult = await dbUtils.readData(monthlyPath);
      const existingMonthly = (existingMonthlyResult.success && existingMonthlyResult.data) ? existingMonthlyResult.data : {};
      
      updates[monthlyPath] = {
        month: currentDate.substring(0, 7),
        total_sales: (existingMonthly.total_sales || 0) + 1,
        total_quantity: (existingMonthly.total_quantity || 0) + quantity,
        total_revenue: (existingMonthly.total_revenue || 0) + totalAmount,
        last_updated: timestamp,
      };

      // 4. Update brick inventory
      updates[`${DB_PATHS.INVENTORY.BRICKS}/total_stock`] = newStock;
      updates[`${DB_PATHS.INVENTORY.BRICKS}/last_updated`] = timestamp;

      // 5. Add to inventory history
      const inventoryHistoryEntry = {
        type: "sale",
        quantity: -quantity,
        reference: invoiceNumber,
        customer: customerName,
        location: locationName,
        vehicle: vehicleNumber,
        challan: challanNumber,
        date: currentDate,
        timestamp,
        stock_before: currentStock,
        stock_after: newStock,
      };
      updates[`${DB_PATHS.INVENTORY.BRICKS}/history/${invoiceNumber}`] = inventoryHistoryEntry;

      // 6. Update or create customer record
      try {
        // Check if customer exists
        const existingCustomerResult = await customerService.getCustomerById(customerPhone);
        
        if (existingCustomerResult.success && existingCustomerResult.data) {
          // Update existing customer
          const existingCustomer = existingCustomerResult.data;
          const updatedCustomer = {
            ...existingCustomer,
            name: customerName, // Update name in case it changed
            email: customerEmail,
            last_purchase: currentDate,
            total_purchases: (existingCustomer.total_purchases || 0) + 1,
            total_amount: (existingCustomer.total_amount || 0) + totalAmount,
            updated_date: currentDate,
            updated_timestamp: timestamp,
          };

          // Add location if it doesn't exist and locationName is provided
          if (locationName && locationId) {
            const locations = existingCustomer.locations || [];
            const locationExists = locations.some(loc => loc.id === locationId);
            
            if (!locationExists) {
              locations.push({
                id: locationId,
                name: locationName,
                address: customerAddress,
                state: customerState,
                state_code: customerStateCode,
                created_date: currentDate,
                is_primary: locations.length === 0
              });
              updatedCustomer.locations = locations;
            }
          }

          updates[`${DB_PATHS.CUSTOMERS}/${customerPhone}`] = updatedCustomer;
        } else {
          // Create new customer
          const newCustomer = {
            name: customerName,
            phone: customerPhone,
            email: customerEmail,
            gstin: customerGSTIN,
            locations: locationName ? [{
              id: locationId || `loc_${timestamp}`,
              name: locationName,
              address: customerAddress,
              state: customerState,
              state_code: customerStateCode,
              created_date: currentDate,
              is_primary: true
            }] : [],
            brick_rates: {},
            total_purchases: 1,
            total_amount: totalAmount,
            last_purchase: currentDate,
            created_date: currentDate,
            updated_date: currentDate,
            created_timestamp: timestamp,
            updated_timestamp: timestamp,
            status: 'active'
          };

          updates[`${DB_PATHS.CUSTOMERS}/${customerPhone}`] = newCustomer;
        }
      } catch (customerError) {
        
        // Continue with sale even if customer update fails
      }

      // Execute all updates atomically
      const result = await dbUtils.batchUpdate(updates);

      if (result.success) {
        return {
          success: true,
          data: {
            ...saleEntry,
            id: invoiceNumber,
          },
          message: `Sale recorded successfully. Invoice: ${invoiceNumber}`,
        };
      }

      return {
        success: false,
        error: "Failed to save sale data",
      };
    } catch (error) {
      
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Get sales history with enhanced filtering
  getSalesHistory: async (limit = 50, filters = {}) => {
    try {
      const result = await dbUtils.readData(`${DB_PATHS.SALES}/transactions`);

      if (result.success && result.data) {
        let salesArray = Object.entries(result.data).map(([id, sale]) => ({
          ...sale,
          id,
        }));

        // Apply filters
        if (filters.customerName) {
          salesArray = salesArray.filter(sale => 
            sale.customer_name.toLowerCase().includes(filters.customerName.toLowerCase())
          );
        }

        if (filters.locationName) {
          salesArray = salesArray.filter(sale => 
            sale.location_name && sale.location_name.toLowerCase().includes(filters.locationName.toLowerCase())
          );
        }

        if (filters.vehicleNumber) {
          salesArray = salesArray.filter(sale => 
            sale.vehicle_number && sale.vehicle_number.toLowerCase().includes(filters.vehicleNumber.toLowerCase())
          );
        }

        if (filters.dateFrom) {
          salesArray = salesArray.filter(sale => sale.date >= filters.dateFrom);
        }

        if (filters.dateTo) {
          salesArray = salesArray.filter(sale => sale.date <= filters.dateTo);
        }

        // Sort by date (newest first) and limit
        salesArray.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (limit) {
          salesArray = salesArray.slice(0, limit);
        }

        return { success: true, data: salesArray };
      }

      return { success: true, data: [] };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Get sale by invoice number
  getSaleByInvoice: async (invoiceNumber) => {
    try {
      const result = await dbUtils.readData(
        `${DB_PATHS.SALES}/transactions/${invoiceNumber}`
      );
      return result;
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Get daily sales
  getDailySales: async (date) => {
    try {
      const result = await dbUtils.readData(`${DB_PATHS.SALES}/daily/${date}`);
      return result;
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Get monthly sales summary
  getMonthlySalesSummary: async (month) => {
    try {
      const result = await dbUtils.readData(
        `${DB_PATHS.SALES}/monthly/${month}`
      );
      return result;
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Get sales statistics
  getSalesStats: async (period = "month") => {
    try {
      const today = new Date();
      let startDate, endDate;

      switch (period) {
        case "week":
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        case "year":
          startDate = new Date(today.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      }

      endDate = today;

      const result = await dbUtils.readData(`${DB_PATHS.SALES}/transactions`);

      if (result.success && result.data) {
        const sales = Object.values(result.data).filter((sale) => {
          const saleDate = new Date(sale.date);
          return saleDate >= startDate && saleDate <= endDate;
        });

        const stats = {
          total_sales: sales.length,
          total_quantity: sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0),
          total_revenue: sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0),
          average_order_value: sales.length > 0 
            ? sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) / sales.length 
            : 0,
          period,
          date_range: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
          },
        };

        return { success: true, data: stats };
      }

      return { success: true, data: { total_sales: 0, total_quantity: 0, total_revenue: 0 } };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  /**
   * BACKWARD COMPATIBILITY METHODS - CRITICAL FOR DASHBOARD
   */

  // Get all sales (for backward compatibility with existing Dashboard/Inventory)
  getAllSales: async () => {
    try {
      const result = await dbUtils.readData(`${DB_PATHS.SALES}/transactions`);

      if (result.success && result.data) {
        const salesArray = Object.entries(result.data).map(([id, sale]) => ({
          ...sale,
          id,
        }));

        // Sort by date (newest first)
        salesArray.sort((a, b) => new Date(b.date) - new Date(a.date));

        return { success: true, data: salesArray };
      }

      return { success: true, data: [] };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Get total sales quantity (for calculating brick stock)
  getTotalSalesQuantity: async () => {
    try {
      const result = await salesService.getAllSales();
      
      if (result.success) {
        const totalQuantity = result.data.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
        return { success: true, data: totalQuantity };
      }
      
      return { success: false, error: 'Failed to get sales data' };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  /**
   * CUSTOMER OPERATIONS (delegated to customerService)
   */

  // Get all customers
  getAllCustomers: async () => {
    return await customerService.getAllCustomers();
  },

  // Get customer by phone
  getCustomerByPhone: async (phone) => {
    return await customerService.getCustomerById(phone);
  },

  // Delete customer
  deleteCustomer: async (customerId) => {
    return await customerService.deleteCustomer(customerId);
  },

  /**
   * INVOICE OPERATIONS
   */

  // Generate GST Invoice PDF data
  generateInvoicePDF: async (invoiceNumber) => {
    try {
      const saleResult = await salesService.getSaleByInvoice(invoiceNumber);

      if (!saleResult.success || !saleResult.data) {
        return { success: false, error: "Invoice not found" };
      }

      const saleData = saleResult.data;

      // Load current bank details
      let bankDetails = DEFAULT_BANK_DETAILS;
      try {
        const bankResult = await dbUtils.readData("settings/bank_details");
        if (bankResult.success && bankResult.data) {
          bankDetails = bankResult.data;
        }
      } catch (error) {
        
      }

      // Structure data for PDF generation
      const invoiceData = {
        // Company details
        company: saleData.company_details || DEFAULT_COMPANY_INFO,

        // Bank details
        bankDetails: bankDetails,

        // Invoice details
        invoice_number: saleData.invoice_number,
        invoice_date: saleData.date,

        // Customer details
        customer: {
          name: saleData.customer_name,
          address: saleData.customer_address,
          state: saleData.customer_state,
          state_code: saleData.customer_state_code,
          gstin: saleData.customer_gstin,
        },

        // Location and transport details
        location_name: saleData.location_name,
        vehicle_number: saleData.vehicle_number,
        challan_number: saleData.challan_number,

        // Product details
        products: [
          {
            description: saleData.product_description || "FLY ASH BRICKS",
            hsn_code: saleData.hsn_code || HSN_CODES.FLY_ASH_BRICKS,
            quantity: saleData.quantity,
            rate: saleData.price_per_brick,
            taxable_value: saleData.taxable_amount,
            cgst_rate: saleData.cgst_rate || 0,
            sgst_rate: saleData.sgst_rate || 0,
            igst_rate: saleData.igst_rate || 0,
            cgst_amount: saleData.cgst_amount || 0,
            sgst_amount: saleData.sgst_amount || 0,
            igst_amount: saleData.igst_amount || 0,
          },
        ],

        // Totals
        total_before_tax: saleData.taxable_amount,
        total_tax: saleData.total_tax,
        total_amount: saleData.total_amount,
      };

      return {
        success: true,
        data: invoiceData,
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },
};