// services/salesService.js - Updated to support GST toggle and maintain backward compatibility with FIXED edit functionality
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

  // FIXED: Record new sale with enhanced features including proper edit mode handling
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
    includeGST = false,
    calculatedAmounts = null,
    // EDIT MODE parameters
    isEdit = false,
    originalSaleId = null,
    preserveInvoiceNumber = null,
    originalQuantity = null, // CRITICAL: Original quantity for stock adjustment
  }) => {
    try {
      // Validate required parameters
      if (!quantity || !pricePerBrick || !customerName || !customerPhone || !customerAddress) {
        return {
          success: false,
          error: "Missing required fields: quantity, price, customer name, phone, and address are required",
        };
      }

      const currentDate = date || dbUtils.dateString();
      const timestamp = dbUtils.timestamp();

      // FIXED: Proper invoice number handling
      let invoiceNumber;
      if (isEdit && preserveInvoiceNumber) {
        invoiceNumber = preserveInvoiceNumber;
        
      } else {
        invoiceNumber = await generateInvoiceNumber(currentDate);
        
      }

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

      // CRITICAL FIX: Proper stock handling for edit mode
      let stockUpdates = {};
      
      if (isEdit) {
        // EDIT MODE: Calculate stock adjustment based on quantity difference
        
        
        if (originalQuantity && originalQuantity !== quantity) {
          // Get current stock
          const capacityResult = await dbUtils.readData(DB_PATHS.INVENTORY.BRICKS);
          if (!capacityResult.success) {
            return {
              success: false,
              error: "Could not verify brick availability for edit",
            };
          }

          const currentStock = capacityResult.data?.total_stock || 0;
          const quantityDifference = quantity - originalQuantity;
          
          // If new quantity > original quantity, we need to deduct more from stock
          // If new quantity < original quantity, we need to add back to stock
          const newStock = currentStock - quantityDifference;
          
          // Validate stock availability for increased quantities
          if (quantityDifference > 0 && currentStock < quantityDifference) {
            return {
              success: false,
              error: `Insufficient stock for quantity increase. Required additional: ${quantityDifference.toLocaleString()}, Available: ${currentStock.toLocaleString()}`,
            };
          }

          stockUpdates = {
            [`${DB_PATHS.INVENTORY.BRICKS}/total_stock`]: newStock,
            [`${DB_PATHS.INVENTORY.BRICKS}/last_updated`]: timestamp,
          };
        }
      } else {
        // NEW SALE: Standard stock validation and deduction
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

        const newStock = currentStock - quantity;
        
        stockUpdates = {
          [`${DB_PATHS.INVENTORY.BRICKS}/total_stock`]: newStock,
          [`${DB_PATHS.INVENTORY.BRICKS}/last_updated`]: timestamp,
        };
      }

      // Load current bank details
      let bankDetails = DEFAULT_BANK_DETAILS;
      try {
        const bankResult = await dbUtils.readData("settings/bank_details");
        if (bankResult.success && bankResult.data) {
          bankDetails = bankResult.data;
        }
      } catch (error) {
        console.error("Error loading bank details:", error);
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

        // Location details
        location_name: locationName,
        location_id: locationId,

        // Transport details
        vehicle_number: vehicleNumber,
        challan_number: challanNumber,

        // Amount calculations
        subtotal,
        discount_amount: discountAmount,
        discount_type: discountType,
        taxable_amount: taxableAmount,

        // GST details - Store the GST toggle flag
        include_gst: includeGST,
        gst_included: includeGST,
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
        
        // EDIT MODE: Add edit metadata
        ...(isEdit && {
          last_edited: timestamp,
          edit_history: originalSaleId,
          original_quantity: originalQuantity, // Keep track for audit
        }),
      };

      // Prepare batch updates
      const updates = {};

      // 1. Add/Update sales transaction - CRITICAL FIX: Use same invoice number for edits
      updates[`${DB_PATHS.SALES}/transactions/${invoiceNumber}`] = saleEntry;

      // 2. CRITICAL FIX: Proper daily sales handling for edits
      if (isEdit && originalSaleId) {
        // Get the original sale to see if date changed
        const originalSaleResult = await dbUtils.readData(`${DB_PATHS.SALES}/transactions/${originalSaleId}`);
        
        if (originalSaleResult.success && originalSaleResult.data) {
          const originalSale = originalSaleResult.data;
          const originalDate = originalSale.date;
          const originalQuantity = parseInt(originalSale.quantity || 0);
          const originalAmount = parseFloat(originalSale.total_amount || 0);
          
          // If date changed, update both old and new date summaries
          if (originalDate !== currentDate) {
            
            // 1. REMOVE from original date's daily sales
            const originalDailyPath = `${DB_PATHS.SALES}/daily/${originalDate}`;
            const originalDailyResult = await dbUtils.readData(originalDailyPath);
            
            if (originalDailyResult.success && originalDailyResult.data) {
              const originalDaily = originalDailyResult.data;
              updates[originalDailyPath] = {
                date: originalDate,
                total_sales: Math.max(0, (originalDaily.total_sales || 0) - 1),
                total_quantity: Math.max(0, (originalDaily.total_quantity || 0) - originalQuantity),
                total_revenue: Math.max(0, (originalDaily.total_revenue || 0) - originalAmount),
                last_updated: timestamp,
              };
            }
            
            // 2. ADD to new date's daily sales
            const newDailyPath = `${DB_PATHS.SALES}/daily/${currentDate}`;
            const newDailyResult = await dbUtils.readData(newDailyPath);
            const newDaily = (newDailyResult.success && newDailyResult.data) ? newDailyResult.data : {};
            
            updates[newDailyPath] = {
              date: currentDate,
              total_sales: (newDaily.total_sales || 0) + 1,
              total_quantity: (newDaily.total_quantity || 0) + quantity,
              total_revenue: (newDaily.total_revenue || 0) + totalAmount,
              last_updated: timestamp,
            };
            
            // 3. Update monthly summaries for both months if they're different
            const originalMonth = originalDate.substring(0, 7);
            const currentMonth = currentDate.substring(0, 7);
            
            if (originalMonth !== currentMonth) {
              // Remove from original month
              const originalMonthlyPath = `${DB_PATHS.SALES}/monthly/${originalMonth}`;
              const originalMonthlyResult = await dbUtils.readData(originalMonthlyPath);
              
              if (originalMonthlyResult.success && originalMonthlyResult.data) {
                const originalMonthly = originalMonthlyResult.data;
                updates[originalMonthlyPath] = {
                  month: originalMonth,
                  total_sales: Math.max(0, (originalMonthly.total_sales || 0) - 1),
                  total_quantity: Math.max(0, (originalMonthly.total_quantity || 0) - originalQuantity),
                  total_revenue: Math.max(0, (originalMonthly.total_revenue || 0) - originalAmount),
                  last_updated: timestamp,
                };
              }
              
              // Add to new month
              const newMonthlyPath = `${DB_PATHS.SALES}/monthly/${currentMonth}`;
              const newMonthlyResult = await dbUtils.readData(newMonthlyPath);
              const newMonthly = (newMonthlyResult.success && newMonthlyResult.data) ? newMonthlyResult.data : {};
              
              updates[newMonthlyPath] = {
                month: currentMonth,
                total_sales: (newMonthly.total_sales || 0) + 1,
                total_quantity: (newMonthly.total_quantity || 0) + quantity,
                total_revenue: (newMonthly.total_revenue || 0) + totalAmount,
                last_updated: timestamp,
              };
            } else {
              // Same month - just update the difference
              const monthlyPath = `${DB_PATHS.SALES}/monthly/${currentMonth}`;
              const monthlyResult = await dbUtils.readData(monthlyPath);
              const monthly = (monthlyResult.success && monthlyResult.data) ? monthlyResult.data : {};
              
              const quantityDifference = quantity - originalQuantity;
              const amountDifference = totalAmount - originalAmount;
              
              updates[monthlyPath] = {
                month: currentMonth,
                total_sales: monthly.total_sales || 0, // No change in transaction count for same month
                total_quantity: (monthly.total_quantity || 0) + quantityDifference,
                total_revenue: (monthly.total_revenue || 0) + amountDifference,
                last_updated: timestamp,
              };
            }
          } else {
            // Same date - just update the existing daily sales with the difference
            const quantityDifference = quantity - originalQuantity;
            const amountDifference = totalAmount - originalAmount;
            
            if (quantityDifference !== 0 || amountDifference !== 0) {
              const dailyPath = `${DB_PATHS.SALES}/daily/${currentDate}`;
              const dailyResult = await dbUtils.readData(dailyPath);
              const daily = (dailyResult.success && dailyResult.data) ? dailyResult.data : {};
              
              updates[dailyPath] = {
                date: currentDate,
                total_sales: daily.total_sales || 0, // No change in transaction count
                total_quantity: (daily.total_quantity || 0) + quantityDifference,
                total_revenue: (daily.total_revenue || 0) + amountDifference,
                last_updated: timestamp,
              };
              
              // Update monthly summary with the difference
              const monthlyPath = `${DB_PATHS.SALES}/monthly/${currentDate.substring(0, 7)}`;
              const monthlyResult = await dbUtils.readData(monthlyPath);
              const monthly = (monthlyResult.success && monthlyResult.data) ? monthlyResult.data : {};
              
              updates[monthlyPath] = {
                month: currentDate.substring(0, 7),
                total_sales: monthly.total_sales || 0, // No change in transaction count
                total_quantity: (monthly.total_quantity || 0) + quantityDifference,
                total_revenue: (monthly.total_revenue || 0) + amountDifference,
                last_updated: timestamp,
              };
            }
          }
        }
      } else {
        // NEW SALE: Standard daily and monthly updates (existing logic)
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

        // Update monthly sales summary
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
      }

      // 4. Apply stock updates (for both new sales and edits with quantity changes)
      if (Object.keys(stockUpdates).length > 0) {
        Object.assign(updates, stockUpdates);
        
        // 5. Add to inventory history 
        const capacityResult = await dbUtils.readData(DB_PATHS.INVENTORY.BRICKS);
        const currentStock = capacityResult.data?.total_stock || 0;
        
        let inventoryHistoryEntry;
        
        if (isEdit) {
          // Edit mode: Record the adjustment
          const quantityDifference = quantity - (originalQuantity || 0);
          inventoryHistoryEntry = {
            type: "sale_edit",
            quantity: -quantityDifference, // Negative for deduction, positive for return
            reference: invoiceNumber,
            customer: customerName,
            location: locationName,
            vehicle: vehicleNumber,
            challan: challanNumber,
            date: currentDate,
            timestamp,
            stock_before: currentStock + quantityDifference, // What it was before this adjustment
            stock_after: currentStock,
            original_quantity: originalQuantity,
            new_quantity: quantity,
            notes: `Sale edited - quantity changed from ${originalQuantity} to ${quantity}`,
          };
        } else {
          // New sale: Record the deduction
          inventoryHistoryEntry = {
            type: "sale",
            quantity: -quantity,
            reference: invoiceNumber,
            customer: customerName,
            location: locationName,
            vehicle: vehicleNumber,
            challan: challanNumber,
            date: currentDate,
            timestamp,
            stock_before: currentStock + quantity, // What it was before deduction
            stock_after: currentStock,
          };
        }
        
        updates[`${DB_PATHS.INVENTORY.BRICKS}/history/${invoiceNumber}_${timestamp}`] = inventoryHistoryEntry;
      }

      // 6. Update or create customer record (for both new and edit)
      try {
        // Check if customer exists
        const existingCustomerResult = await customerService.getCustomerById(customerPhone);
        
        if (existingCustomerResult.success && existingCustomerResult.data) {
          // Update existing customer
          const existingCustomer = existingCustomerResult.data;
          const updatedCustomer = {
            ...existingCustomer,
            name: customerName,
            email: customerEmail,
            last_purchase: currentDate,
            // Only increment totals for new sales, not edits
            total_purchases: isEdit ? existingCustomer.total_purchases : (existingCustomer.total_purchases || 0) + 1,
            total_amount: isEdit ? existingCustomer.total_amount : (existingCustomer.total_amount || 0) + totalAmount,
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
        } else if (!isEdit) {
          // Create new customer only for new sales, not edits
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
        console.error("Customer update error:", customerError);
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
          message: isEdit 
            ? `Sale updated successfully. Invoice: ${invoiceNumber}` 
            : `Sale recorded successfully. Invoice: ${invoiceNumber}`,
        };
      }

      return {
        success: false,
        error: "Failed to save sale data",
      };
    } catch (error) {
      console.error("Error in recordSale:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Get sales history with enhanced filtering
  getSalesHistory: async (limit = null, filters = {}) => {
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