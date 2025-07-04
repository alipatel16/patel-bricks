import { dbUtils } from "../services/firebase";
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
    console.error("Error generating invoice number:", error);
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
    discountType === "percentage" ? (subtotal * discount) / 100 : discount;
  const taxableAmount = subtotal - discountAmount;

  return {
    subtotal,
    discountAmount,
    taxableAmount,
  };
};

export const salesService = {
  /**
   * SALE OPERATIONS
   */

  // Record a new sale with enhanced GST support
  recordSale: async (saleData) => {
    try {
      const {
        quantity,
        pricePerBrick,
        customerName,
        customerPhone,
        customerEmail = "",
        customerAddress,
        customerState,
        customerStateCode,
        customerGSTIN = "",
        discount = 0,
        discountType = "amount",
        paymentMethod,
        notes = "",
        hsnCode = HSN_CODES.FLY_ASH_BRICKS,
      } = saleData;

      // Validate required fields
      if (
        !quantity ||
        !pricePerBrick ||
        !customerName ||
        !customerPhone ||
        !customerAddress
      ) {
        return { success: false, error: "Missing required fields" };
      }

      // Check inventory availability
      const capacity = await dbUtils.readData(DB_PATHS.INVENTORY.BRICKS);
      if (!capacity.success || (capacity.data?.total_stock || 0) < quantity) {
        return {
          success: false,
          error: `Insufficient stock. Required: ${quantity.toLocaleString()} bricks, Available: ${
            capacity.data?.total_stock?.toLocaleString() || 0
          } bricks`,
          data: capacity.data,
        };
      }

      const currentDate = dbUtils.dateString();
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

      // Calculate GST
      const gstCalculation = calculateGSTAmounts(taxableAmount, isInterState);
      const totalAmount = taxableAmount + gstCalculation.totalTax;

      // Load current bank details
      let bankDetails = DEFAULT_BANK_DETAILS;
      try {
        const bankResult = await dbUtils.readData("settings/bank_details");
        if (bankResult.success && bankResult.data) {
          bankDetails = bankResult.data;
        }
      } catch (error) {
        console.warn("Could not load custom bank details, using defaults");
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

        // Amount calculations
        subtotal,
        discount_amount: discountAmount,
        discount_type: discountType,
        taxable_amount: taxableAmount,

        // GST details
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

      // 2. Update monthly sales summary
      const currentMonth = currentDate.substring(0, 7);
      const monthlySalesPath = `${DB_PATHS.SALES}/monthly/${currentMonth}`;
      const monthlyResult = await dbUtils.readData(monthlySalesPath);
      const monthlySummary = monthlyResult.success
        ? monthlyResult.data
        : {
            total_sales: 0,
            total_revenue: 0,
            total_quantity: 0,
            total_tax: 0,
            sales_count: 0,
          };

      updates[monthlySalesPath] = {
        ...monthlySummary,
        total_sales: (monthlySummary.total_sales || 0) + totalAmount,
        total_revenue: (monthlySummary.total_revenue || 0) + taxableAmount,
        total_quantity: (monthlySummary.total_quantity || 0) + quantity,
        total_tax: (monthlySummary.total_tax || 0) + gstCalculation.totalTax,
        sales_count: (monthlySummary.sales_count || 0) + 1,
        last_updated: timestamp,
      };

      // 3. Update inventory
      const newStock = (capacity.data?.total_stock || 0) - quantity;
      updates[`${DB_PATHS.INVENTORY.BRICKS}/total_stock`] = newStock;
      updates[`${DB_PATHS.INVENTORY.BRICKS}/last_updated`] = timestamp;

      // 4. Add to inventory history
      const inventoryHistoryEntry = {
        type: "sale",
        quantity: -quantity,
        reference: invoiceNumber,
        customer: customerName,
        date: currentDate,
        timestamp,
        stock_before: capacity.data?.total_stock || 0,
        stock_after: newStock,
      };
      updates[`${DB_PATHS.INVENTORY.BRICKS}/history/${invoiceNumber}`] =
        inventoryHistoryEntry;

      // 5. Update or create customer record
      const customerEntry = {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        address: customerAddress,
        state: customerState,
        state_code: customerStateCode,
        gstin: customerGSTIN,
        last_purchase: currentDate,
        total_purchases: 1,
        total_amount: totalAmount,
        created_date: currentDate,
        updated_date: currentDate,
      };

      // Check if customer exists
      const existingCustomerResult = await dbUtils.readData(
        `${DB_PATHS.CUSTOMERS}/${customerPhone}`
      );
      if (existingCustomerResult.success && existingCustomerResult.data) {
        // Update existing customer
        const existingCustomer = existingCustomerResult.data;
        customerEntry.total_purchases =
          (existingCustomer.total_purchases || 0) + 1;
        customerEntry.total_amount =
          (existingCustomer.total_amount || 0) + totalAmount;
        customerEntry.created_date = existingCustomer.created_date;
      }

      updates[`${DB_PATHS.CUSTOMERS}/${customerPhone}`] = customerEntry;

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
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("Error recording sale:", error);
      return { success: false, error: error.message };
    }
  },

  // Get all sales
  getAllSales: async () => {
    try {
      const result = await dbUtils.readData(`${DB_PATHS.SALES}/transactions`);

      if (result.success && result.data) {
        // Convert object to array and add IDs
        const salesArray = Object.entries(result.data).map(([id, sale]) => ({
          ...sale,
          id,
        }));

        return { success: true, data: salesArray };
      }

      return { success: true, data: [] };
    } catch (error) {
      console.error("Error getting sales:", error);
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
      console.error("Error getting sale by invoice:", error);
      return { success: false, error: error.message };
    }
  },

  // Get sales by date range
  getSalesByDateRange: async (startDate, endDate) => {
    try {
      const allSalesResult = await salesService.getAllSales();

      if (!allSalesResult.success) {
        return allSalesResult;
      }

      const filteredSales = allSalesResult.data.filter((sale) => {
        const saleDate = new Date(sale.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return saleDate >= start && saleDate <= end;
      });

      return { success: true, data: filteredSales };
    } catch (error) {
      console.error("Error getting sales by date range:", error);
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
      console.error("Error getting monthly sales summary:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * CUSTOMER OPERATIONS
   */

  // Get all customers
  getAllCustomers: async () => {
    try {
      const result = await dbUtils.readData(DB_PATHS.CUSTOMERS);

      if (result.success && result.data) {
        const customersArray = Object.entries(result.data).map(
          ([id, customer]) => ({
            ...customer,
            id,
          })
        );

        return { success: true, data: customersArray };
      }

      return { success: true, data: [] };
    } catch (error) {
      console.error("Error getting customers:", error);
      return { success: false, error: error.message };
    }
  },

  // Get customer by phone
  getCustomerByPhone: async (phone) => {
    try {
      const result = await dbUtils.readData(`${DB_PATHS.CUSTOMERS}/${phone}`);
      return result;
    } catch (error) {
      console.error("Error getting customer:", error);
      return { success: false, error: error.message };
    }
  },

  // Delete customer
  deleteCustomer: async (customerId) => {
    try {
      const result = await dbUtils.deleteData(
        `${DB_PATHS.CUSTOMERS}/${customerId}`
      );
      return result;
    } catch (error) {
      console.error("Error deleting customer:", error);
      return { success: false, error: error.message };
    }
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
        console.warn("Could not load custom bank details, using defaults");
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

        // Additional details
        payment_method: saleData.payment_method,
        notes: saleData.notes,
        is_inter_state: saleData.is_inter_state,
      };

      return {
        success: true,
        data: invoiceData,
      };
    } catch (error) {
      console.error("Error generating invoice PDF data:", error);
      return { success: false, error: error.message };
    }
  },

  // Update sale (for corrections)
  updateSale: async (invoiceNumber, updatedData) => {
    try {
      const currentSale = await salesService.getSaleByInvoice(invoiceNumber);

      if (!currentSale.success || !currentSale.data) {
        return { success: false, error: "Sale not found" };
      }

      const currentData = currentSale.data;
      const updates = {
        ...currentData,
        ...updatedData,
        last_modified: dbUtils.timestamp(),
      };

      const result = await dbUtils.writeData(
        `${DB_PATHS.SALES}/transactions/${invoiceNumber}`,
        updates
      );

      return result;
    } catch (error) {
      console.error("Error updating sale:", error);
      return { success: false, error: error.message };
    }
  },

  // Delete sale
  deleteSale: async (invoiceNumber) => {
    try {
      // Note: In a real app, you might want to reverse inventory changes
      const result = await dbUtils.deleteData(
        `${DB_PATHS.SALES}/transactions/${invoiceNumber}`
      );
      return result;
    } catch (error) {
      console.error("Error deleting sale:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * BACKWARD COMPATIBILITY FUNCTIONS
   */

  // Backward compatibility: getSalesHistory -> getAllSales
  getSalesHistory: async (limit = 100) => {
    try {
      const result = await salesService.getAllSales();

      if (result.success && result.data) {
        // Apply limit if specified
        const limitedData = limit ? result.data.slice(0, limit) : result.data;
        return { success: true, data: limitedData };
      }

      return result;
    } catch (error) {
      console.error("Error getting sales history:", error);
      return { success: false, error: error.message };
    }
  },

  // Get sales trends over a specified number of days
  getSalesTrends: async (days = 30) => {
    try {
      const allSalesResult = await salesService.getAllSales();

      if (!allSalesResult.success) {
        return allSalesResult;
      }

      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // Filter sales within the specified period
      const periodSales = allSalesResult?.data?.filter((sale) => {
        const saleDate = new Date(sale.date);
        return saleDate >= startDate && saleDate <= now;
      });

      // Group sales by date and calculate daily totals
      const dailySales = {};

      periodSales?.forEach((sale) => {
        const date = sale.date;
        if (!dailySales[date]) {
          dailySales[date] = {
            date: date,
            total_quantity: 0, // ← Changed from 'quantity' to 'total_quantity'
            total_revenue: 0, // ← Changed from 'revenue' to 'total_revenue'
            transactions_count: 0, // ← Changed from 'transactions' to 'transactions_count'
            average_price: 0,
          };
        }

        dailySales[date].total_quantity += parseInt(sale.quantity) || 0;
        dailySales[date].total_revenue += parseFloat(sale.total_amount) || 0;
        dailySales[date].transactions_count += 1;
      });

      // Calculate average prices and convert to array
      const trendsArray = Object.values(dailySales)
        .map((day) => {
          day.average_price =
            day.total_quantity > 0
              ? parseFloat((day.total_revenue / day.total_quantity).toFixed(2))
              : 0;
          return day;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // Fill in missing dates with zero values
      const filledTrends = [];
      const currentDate = new Date(startDate);

      while (currentDate <= now) {
        const dateString = currentDate.toISOString().split("T")[0];
        const existingData = trendsArray.find((day) => day.date === dateString);

        if (existingData) {
          filledTrends.push(existingData);
        } else {
          filledTrends.push({
            date: dateString,
            total_quantity: 0,
            total_revenue: 0,
            transactions_count: 0,
            average_price: 0,
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate summary statistics
      const summary = {
        total_quantity: trendsArray.reduce(
          (sum, day) => sum + day.total_quantity,
          0
        ),
        total_revenue: trendsArray.reduce(
          (sum, day) => sum + day.total_revenue,
          0
        ),
        total_transactions: trendsArray.reduce(
          (sum, day) => sum + day.transactions_count,
          0
        ),
        average_daily_sales:
          trendsArray.length > 0
            ? trendsArray.reduce((sum, day) => sum + day.total_revenue, 0) /
              trendsArray.length
            : 0,
        growth_rate:
          trendsArray.length > 1
            ? (
                ((trendsArray[trendsArray.length - 1].total_revenue -
                  trendsArray[0].total_revenue) /
                  (trendsArray[0].total_revenue || 1)) *
                100
              ).toFixed(2)
            : 0,
      };

      return {
        success: true,
        data: {
          daily_sales: filledTrends, // ← This matches what Reports.js expects
          period_summary: summary,
        },
      };
    } catch (error) {
      console.error("Error getting sales trends:", error);
      return { success: false, error: error.message };
    }
  },

  // Backward compatibility: getMonthlySales
  getMonthlySales: async (month = null) => {
    try {
      const targetMonth = month || new Date().toISOString().slice(0, 7);

      // Try to get from monthly path first
      const monthlyResult = await dbUtils.readData(
        `${DB_PATHS.SALES}/monthly/${targetMonth}`
      );

      if (monthlyResult.success && monthlyResult.data) {
        return { success: true, data: monthlyResult.data };
      }

      // Fallback: Calculate from all sales
      const allSalesResult = await salesService.getAllSales();

      if (!allSalesResult.success) {
        return allSalesResult;
      }

      const monthSales = allSalesResult.data.filter((sale) =>
        sale.date?.startsWith(targetMonth)
      );

      const monthlyData = monthSales.reduce(
        (acc, sale) => ({
          total_quantity: acc.total_quantity + (sale.quantity || 0),
          total_revenue: acc.total_revenue + (sale.total_amount || 0),
          total_tax: acc.total_tax + (sale.total_tax || 0),
          transactions_count: acc.transactions_count + 1,
          average_price: 0, // Will calculate below
        }),
        {
          total_quantity: 0,
          total_revenue: 0,
          total_tax: 0,
          transactions_count: 0,
          average_price: 0,
        }
      );

      monthlyData.average_price =
        monthlyData.total_quantity > 0
          ? monthlyData.total_revenue / monthlyData.total_quantity
          : 0;

      return { success: true, data: monthlyData };
    } catch (error) {
      console.error("Error getting monthly sales:", error);
      return { success: false, error: error.message };
    }
  },

  // Backward compatibility: getDailySales
  getDailySales: async (date = null) => {
    try {
      const targetDate = date || dbUtils.dateString();
      const allSalesResult = await salesService.getAllSales();

      if (!allSalesResult.success) {
        return allSalesResult;
      }

      const dailySales = allSalesResult.data.filter(
        (sale) => sale.date === targetDate
      );

      // Calculate daily summary
      const summary = dailySales.reduce(
        (acc, sale) => ({
          total_quantity: acc.total_quantity + (sale.quantity || 0),
          total_revenue: acc.total_revenue + (sale.total_amount || 0),
          transactions_count: acc.transactions_count + 1,
          average_price: 0, // Will calculate below
        }),
        {
          total_quantity: 0,
          total_revenue: 0,
          transactions_count: 0,
          average_price: 0,
        }
      );

      summary.average_price =
        summary.total_quantity > 0
          ? summary.total_revenue / summary.total_quantity
          : 0;

      return { success: true, data: summary };
    } catch (error) {
      console.error("Error getting daily sales:", error);
      return { success: false, error: error.message };
    }
  },

  // Backward compatibility: getSalesStats
  getSalesStats: async (period = "month") => {
    try {
      const allSalesResult = await salesService.getAllSales();

      if (!allSalesResult.success) {
        return allSalesResult;
      }

      const now = new Date();
      let startDate;

      switch (period) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const periodSales = allSalesResult.data.filter((sale) => {
        const saleDate = new Date(sale.date);
        return saleDate >= startDate;
      });

      // Calculate comprehensive statistics
      const stats = periodSales.reduce(
        (acc, sale) => {
          const totalAmount = parseFloat(sale.total_amount) || 0;
          const quantity = parseInt(sale.quantity) || 0;

          return {
            total_sales: acc.total_sales + totalAmount,
            total_revenue: acc.total_revenue + totalAmount, // Same as total_sales for compatibility
            total_quantity: acc.total_quantity + quantity,
            total_transactions: acc.total_transactions + 1,
            total_tax: acc.total_tax + (parseFloat(sale.total_tax) || 0),
            best_sale_amount: Math.max(acc.best_sale_amount, totalAmount),
          };
        },
        {
          total_sales: 0,
          total_revenue: 0,
          total_quantity: 0,
          total_transactions: 0,
          total_tax: 0,
          best_sale_amount: 0,
        }
      );

      // Calculate derived statistics
      stats.average_transaction_value =
        stats.total_transactions > 0
          ? parseFloat(
              (stats.total_revenue / stats.total_transactions).toFixed(2)
            )
          : 0;

      stats.average_price_per_brick =
        stats.total_quantity > 0
          ? parseFloat((stats.total_revenue / stats.total_quantity).toFixed(2))
          : 0;

      // Find best sale details
      const bestSale = periodSales.reduce((max, sale) => {
        const saleAmount = parseFloat(sale.total_amount) || 0;
        const maxAmount = parseFloat(max?.total_amount) || 0;
        return saleAmount > maxAmount ? sale : max;
      }, null);

      stats.best_sale = bestSale
        ? {
            total_amount: parseFloat(bestSale.total_amount) || 0,
            quantity: parseInt(bestSale.quantity) || 0,
            customer_name: bestSale.customer_name || "Walk-in",
            date: bestSale.date,
          }
        : { total_amount: 0 };

      return { success: true, data: stats };
    } catch (error) {
      console.error("Error getting sales stats:", error);
      return { success: false, error: error.message };
    }
  },

  // Backward compatibility: getMonthlySales
  getMonthlySales: async (month = null) => {
    try {
      const targetMonth = month || new Date().toISOString().slice(0, 7);

      // Try to get from monthly path first
      const monthlyResult = await dbUtils.readData(
        `${DB_PATHS.SALES}/monthly/${targetMonth}`
      );

      if (monthlyResult.success && monthlyResult.data) {
        return { success: true, data: monthlyResult.data };
      }

      // Fallback: Calculate from all sales
      const allSalesResult = await salesService.getAllSales();

      if (!allSalesResult.success) {
        return allSalesResult;
      }

      const monthSales = allSalesResult.data.filter((sale) =>
        sale.date?.startsWith(targetMonth)
      );

      const monthlyData = monthSales.reduce(
        (acc, sale) => ({
          total_quantity: acc.total_quantity + (sale.quantity || 0),
          total_revenue: acc.total_revenue + (sale.total_amount || 0),
          total_tax: acc.total_tax + (sale.total_tax || 0),
          transactions_count: acc.transactions_count + 1,
          average_price: 0, // Will calculate below
        }),
        {
          total_quantity: 0,
          total_revenue: 0,
          total_tax: 0,
          transactions_count: 0,
          average_price: 0,
        }
      );

      monthlyData.average_price =
        monthlyData.total_quantity > 0
          ? monthlyData.total_revenue / monthlyData.total_quantity
          : 0;

      return { success: true, data: monthlyData };
    } catch (error) {
      console.error("Error getting monthly sales:", error);
      return { success: false, error: error.message };
    }
  },

  // Backward compatibility: getMonthlyProduction (for Dashboard compatibility)
  getMonthlyProduction: async (month = null) => {
    try {
      const targetMonth = month || new Date().toISOString().slice(0, 7);
      const result = await dbUtils.readData(
        `bricks/production/monthly/${targetMonth}`
      );

      return {
        success: true,
        data: result.data || { total_quantity: 0, total_production: 0 },
      };
    } catch (error) {
      console.error("Error getting monthly production:", error);
      return { success: false, error: error.message };
    }
  },

  // Backward compatibility: getSaleById
  getSaleById: async (saleId) => {
    try {
      // Try to get by invoice number first
      const result = await salesService.getSaleByInvoice(saleId);
      return result;
    } catch (error) {
      console.error("Error getting sale by ID:", error);
      return { success: false, error: error.message };
    }
  },

  // Backward compatibility: updateCustomerInfo
  updateCustomerInfo: async (customerData) => {
    try {
      const { phone, ...otherData } = customerData;

      if (!phone) {
        return { success: false, error: "Phone number is required" };
      }

      const customerEntry = {
        ...otherData,
        updated_date: dbUtils.dateString(),
      };

      const result = await dbUtils.writeData(
        `${DB_PATHS.CUSTOMERS}/${phone}`,
        customerEntry
      );
      return result;
    } catch (error) {
      console.error("Error updating customer info:", error);
      return { success: false, error: error.message };
    }
  },

  // Backward compatibility: cancelSale
  cancelSale: async (saleId, reason = "") => {
    try {
      const saleResult = await salesService.getSaleById(saleId);

      if (!saleResult.success) {
        return { success: false, error: "Sale not found" };
      }

      const updatedData = {
        status: "cancelled",
        cancellation_reason: reason,
        cancelled_date: dbUtils.dateString(),
        cancelled_timestamp: dbUtils.timestamp(),
      };

      const result = await salesService.updateSale(saleId, updatedData);
      return result;
    } catch (error) {
      console.error("Error cancelling sale:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * UTILITY FUNCTIONS
   */

  // Calculate taxes for a given amount
  calculateTaxes: (taxableAmount, isInterState = false) => {
    return calculateGSTAmounts(taxableAmount, isInterState);
  },

  // Generate invoice number (utility function)
  generateInvoiceNumber,
};
