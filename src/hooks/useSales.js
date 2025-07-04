import { useState, useEffect, useCallback } from 'react';
import { salesService } from '../services/salesService';
import { useFirebase } from './useFirebase';
import { DB_PATHS } from '../utils/constants';
import toast from 'react-hot-toast';

export const useSales = () => {
  // State - matching existing structure
  const [sales, setSales] = useState({
    history: [],
    todaySales: null,
    monthlyStats: {},
    stats: null,
    trends: null,
    customers: [],
    loading: false,
    error: null,
  });

  const { isConnected, listenToData } = useFirebase();

  // Load sales data - enhanced with backward compatibility
  const loadSalesData = useCallback(async (limit = 50) => {
    try {
      setSales(prev => ({ ...prev, loading: true, error: null }));

      const today = new Date().toISOString().split('T')[0];

      const [historyResult, todayResult, monthlyResult, statsResult, customersResult] = await Promise.all([
        salesService.getSalesHistory(limit),
        salesService.getDailySales(today),
        salesService.getMonthlySalesSummary ? salesService.getMonthlySalesSummary(today.substring(0, 7)) : salesService.getSalesStats('month'),
        salesService.getSalesStats('month'),
        salesService.getAllCustomers(),
      ]);

      setSales(prev => ({
        ...prev,
        history: historyResult.success ? historyResult.data : [],
        todaySales: todayResult.success ? todayResult.data : null,
        monthlyStats: monthlyResult.success ? monthlyResult.data : {},
        stats: statsResult.success ? statsResult.data : null,
        customers: customersResult.success ? customersResult.data : [],
        loading: false,
        error: null,
      }));

    } catch (error) {
      console.error('Error loading sales data:', error);
      setSales(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, []);

  // Load sales trends
  const loadSalesTrends = useCallback(async (days = 30) => {
    try {
      const result = await salesService.getSalesTrends(days);
      
      if (result.success) {
        setSales(prev => ({
          ...prev,
          trends: result.data,
        }));
      }
    } catch (error) {
      console.error('Error loading sales trends:', error);
    }
  }, []);

  // Record new sale - enhanced
  const recordSale = useCallback(async (saleData) => {
    try {
      const result = await salesService.recordSale(saleData);
      
      if (result.success) {
        // Reload data to get updated statistics
        await loadSalesData();
        toast.success('Sale recorded successfully!');
      } else {
        toast.error(result.error || 'Failed to record sale');
      }
      
      return result;
    } catch (error) {
      console.error('Error recording sale:', error);
      toast.error('Error recording sale');
      return { success: false, error: error.message };
    }
  }, [loadSalesData]);

  // Load customers
  const loadCustomers = useCallback(async () => {
    try {
      const result = await salesService.getAllCustomers();
      
      if (result.success) {
        setSales(prev => ({
          ...prev,
          customers: result.data || [],
        }));
        return result;
      } else {
        console.error('Failed to load customers:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Update sale
  const updateSale = useCallback(async (transactionId, updatedData) => {
    try {
      const result = await salesService.updateSale(transactionId, updatedData);
      
      if (result.success) {
        // Reload data to get updated statistics
        await loadSalesData();
        toast.success('Sale updated successfully');
      } else {
        toast.error(result.error || 'Failed to update sale');
      }
      
      return result;
    } catch (error) {
      console.error('Error updating sale:', error);
      toast.error('Error updating sale');
      return { success: false, error: error.message };
    }
  }, [loadSalesData]);

  // Cancel sale
  const cancelSale = useCallback(async (transactionId, reason = '') => {
    try {
      const result = await salesService.cancelSale(transactionId, reason);
      
      if (result.success) {
        // Reload data to get updated statistics
        await loadSalesData();
        toast.success('Sale cancelled successfully');
      } else {
        toast.error(result.error || 'Failed to cancel sale');
      }
      
      return result;
    } catch (error) {
      console.error('Error cancelling sale:', error);
      toast.error('Error cancelling sale');
      return { success: false, error: error.message };
    }
  }, [loadSalesData]);

  // Get sale by ID
  const getSaleById = useCallback(async (transactionId) => {
    try {
      return await salesService.getSaleById(transactionId);
    } catch (error) {
      console.error('Error getting sale by ID:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Get daily sales
  const getDailySales = useCallback(async (date = null) => {
    try {
      return await salesService.getDailySales(date);
    } catch (error) {
      console.error('Error getting daily sales:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Customer management
  const updateCustomer = useCallback(async (customerData) => {
    try {
      const result = await salesService.updateCustomerInfo(customerData);
      
      if (result.success) {
        // Reload customers
        await loadCustomers();
        toast.success('Customer updated successfully');
      } else {
        toast.error(result.error || 'Failed to update customer');
      }
      
      return result;
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Error updating customer');
      return { success: false, error: error.message };
    }
  }, [loadCustomers]);

  // Enhanced methods for new functionality
  const getSaleByInvoice = useCallback(async (invoiceNumber) => {
    try {
      const result = await salesService.getSaleByInvoice(invoiceNumber);
      return result;
    } catch (error) {
      console.error('Error getting sale by invoice:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const getSalesByDateRange = useCallback(async (startDate, endDate) => {
    try {
      const result = await salesService.getSalesByDateRange(startDate, endDate);
      return result;
    } catch (error) {
      console.error('Error getting sales by date range:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const getMonthlySummary = useCallback(async (month) => {
    try {
      const result = await salesService.getMonthlySalesSummary 
        ? await salesService.getMonthlySalesSummary(month)
        : await salesService.getSalesStats('month');
      return result;
    } catch (error) {
      console.error('Error getting monthly summary:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const generateInvoicePDF = useCallback(async (invoiceNumber) => {
    try {
      const result = await salesService.generateInvoicePDF(invoiceNumber);
      return result;
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const getCustomerByPhone = useCallback(async (phone) => {
    try {
      const result = await salesService.getCustomerByPhone(phone);
      return result;
    } catch (error) {
      console.error('Error getting customer by phone:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const deleteCustomer = useCallback(async (customerId) => {
    try {
      const result = await salesService.deleteCustomer(customerId);
      
      if (result.success) {
        await loadCustomers();
        toast.success('Customer deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete customer');
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Error deleting customer');
      return { success: false, error: error.message };
    }
  }, [loadCustomers]);

  const deleteSale = useCallback(async (invoiceNumber) => {
    try {
      const result = await salesService.deleteSale(invoiceNumber);
      
      if (result.success) {
        await loadSalesData();
        toast.success('Sale deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete sale');
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast.error('Error deleting sale');
      return { success: false, error: error.message };
    }
  }, [loadSalesData]);

  // Calculate sales summary from sales data
  const calculateSalesSummary = useCallback((salesData) => {
    const summary = salesData.reduce(
      (acc, sale) => ({
        totalSales: acc.totalSales + (sale.total_amount || 0),
        totalRevenue: acc.totalRevenue + (sale.taxable_amount || 0),
        totalQuantity: acc.totalQuantity + (sale.quantity || 0),
        totalTax: acc.totalTax + (sale.total_tax || 0),
        salesCount: acc.salesCount + 1,
      }),
      {
        totalSales: 0,
        totalRevenue: 0,
        totalQuantity: 0,
        totalTax: 0,
        salesCount: 0,
      }
    );
    
    return summary;
  }, []);

  // Get sales statistics
  const getSalesStatistics = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);

    const history = sales.history || [];
    const todaySales = history.filter(sale => new Date(sale.date) >= today);
    const monthSales = history.filter(sale => new Date(sale.date) >= thisMonth);
    const yearSales = history.filter(sale => new Date(sale.date) >= thisYear);

    return {
      today: {
        count: todaySales.length,
        revenue: todaySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0),
        quantity: todaySales.reduce((sum, sale) => sum + (sale.quantity || 0), 0),
      },
      thisMonth: {
        count: monthSales.length,
        revenue: monthSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0),
        quantity: monthSales.reduce((sum, sale) => sum + (sale.quantity || 0), 0),
      },
      thisYear: {
        count: yearSales.length,
        revenue: yearSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0),
        quantity: yearSales.reduce((sum, sale) => sum + (sale.quantity || 0), 0),
      },
      all: calculateSalesSummary(history),
    };
  }, [sales.history, calculateSalesSummary]);

  // Export sales data to CSV
  const exportSalesCSV = useCallback((salesData = sales.history, filename = 'sales-export') => {
    try {
      const headers = [
        'Invoice Number',
        'Date',
        'Customer Name',
        'Phone',
        'Email',
        'Address',
        'State',
        'GSTIN',
        'Quantity',
        'Price per Brick',
        'Subtotal',
        'Discount',
        'Taxable Amount',
        'CGST',
        'SGST',
        'IGST',
        'Total Tax',
        'Total Amount',
        'Payment Method',
        'Notes',
      ];

      const csvData = salesData.map(sale => [
        sale.invoice_number || '',
        sale.date || '',
        sale.customer_name || '',
        sale.customer_phone || '',
        sale.customer_email || '',
        sale.customer_address || '',
        sale.customer_state || '',
        sale.customer_gstin || '',
        sale.quantity || 0,
        sale.price_per_brick || 0,
        sale.subtotal || 0,
        sale.discount_amount || 0,
        sale.taxable_amount || 0,
        sale.cgst_amount || 0,
        sale.sgst_amount || 0,
        sale.igst_amount || 0,
        sale.total_tax || 0,
        sale.total_amount || 0,
        sale.payment_method || '',
        sale.notes || '',
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Sales data exported successfully');
      return { success: true };
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Error exporting sales data');
      return { success: false, error: error.message };
    }
  }, [sales.history]);

  // Set up real-time listeners (if useFirebase is available)
  useEffect(() => {
    if (!listenToData) return;

    // Listen to sales transactions
    const unsubscribeTransactions = listenToData(
      `${DB_PATHS.SALES}/transactions`,
      (data) => {
        if (data) {
          const history = Object.entries(data)
            .map(([id, saleData]) => ({
              id,
              ...saleData,
            }))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 50);

          setSales(prev => ({
            ...prev,
            history,
          }));
        }
      }
    );

    // Listen to daily sales
    const unsubscribeDaily = listenToData(
      `${DB_PATHS.SALES}/daily`,
      (data) => {
        if (data) {
          const today = new Date().toISOString().split('T')[0];
          const todayData = data[today] || {
            total_quantity: 0,
            total_revenue: 0,
            transactions_count: 0,
            average_price: 0,
          };
          
          setSales(prev => ({
            ...prev,
            todaySales: todayData,
          }));
        }
      }
    );

    // Listen to monthly sales
    const unsubscribeMonthly = listenToData(
      `${DB_PATHS.SALES}/monthly`,
      (data) => {
        setSales(prev => ({
          ...prev,
          monthlyStats: data || {},
        }));
      }
    );

    return () => {
      if (unsubscribeTransactions) unsubscribeTransactions();
      if (unsubscribeDaily) unsubscribeDaily();
      if (unsubscribeMonthly) unsubscribeMonthly();
    };
  }, [listenToData]);

  // Initialize data on mount
  useEffect(() => {
    loadSalesData();
    loadSalesTrends();
  }, [loadSalesData, loadSalesTrends]);

  return {
    // State - backward compatible
    sales,
    isConnected,
    
    // Data loading - backward compatible
    loadSalesData,
    loadSalesTrends,
    
    // CRUD operations - backward compatible + enhanced
    recordSale,
    updateSale,
    cancelSale,
    getSaleById,
    getDailySales,
    loadCustomers,
    
    // Enhanced methods
    getSaleByInvoice,
    getSalesByDateRange,
    getMonthlySummary,
    generateInvoicePDF,
    getCustomerByPhone,
    deleteCustomer,
    deleteSale,
    
    // Customer management - backward compatible
    updateCustomer,
    
    // Computed values - backward compatible
    isLoading: sales.loading,
    hasError: sales.error !== null,
    getSalesStatistics,
    calculateSalesSummary,
    exportSalesCSV,
  };
};