// hooks/useSales.js - Updated with customer integration
import { useState, useEffect, useCallback } from 'react';
import { salesService } from '../services/salesService';
import { customerService } from '../services/customerService';
import { useFirebase } from './useFirebase';
import { DB_PATHS } from '../utils/constants';
import toast from 'react-hot-toast';

export const useSales = () => {
  // Enhanced state structure
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

  // Load sales data with enhanced features
  const loadSalesData = useCallback(async (limit = null, filters = {}) => {
    try {
      setSales(prev => ({ ...prev, loading: true, error: null }));

      const today = new Date().toISOString().split('T')[0];

      const [historyResult, todayResult, monthlyResult, statsResult, customersResult] = await Promise.all([
        salesService.getSalesHistory(null, filters),
        salesService.getDailySales(today),
        salesService.getMonthlySalesSummary ? salesService.getMonthlySalesSummary(today.substring(0, 7)) : salesService.getSalesStats('month'),
        salesService.getSalesStats('month'),
        salesService.getAllCustomers(),
      ]);

      setSales(prev => ({
        ...prev,
        history: historyResult.success ? historyResult.data : [],
        todaySales: todayResult.success ? todayResult.data : { total_revenue: 0, total_quantity: 0, total_sales: 0 },
        monthlyStats: monthlyResult.success ? monthlyResult.data : {},
        stats: statsResult.success ? statsResult.data : null,
        customers: customersResult.success ? customersResult.data : [],
        loading: false,
        error: null,
      }));

    } catch (error) {
      
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
      const result = await salesService.getSalesTrends ? 
        await salesService.getSalesTrends(days) : 
        { success: false, error: 'Trends not available' };
      
      if (result.success) {
        setSales(prev => ({
          ...prev,
          trends: result.data,
        }));
      }
    } catch (error) {
      
    }
  }, []);

  // Record new sale with enhanced features
  const recordSale = useCallback(async (saleData) => {
    try {
      const result = await salesService.recordSale(saleData);
      
      if (result.success) {
        // REMOVED: Don't automatically reload data here since Sales.js handles it
        // This prevents double loading and ensures proper timing
        // await loadSalesData(); // REMOVED
        
        // Only show success message for new sales (edit messages handled in Sales.js)
        if (!saleData.isEdit) {
          toast.success(result.message || 'Sale recorded successfully!');
        }
        return result;
      } else {
        toast.error(result.error || 'Failed to record sale');
        return result;
      }
    } catch (error) {
      console.error('Error in recordSale:', error);
      toast.error('Failed to record sale');
      return { success: false, error: error.message };
    }
  }, []);

  // Customer management functions
  const loadCustomers = useCallback(async () => {
    try {
      const result = await customerService.getAllCustomers();
      
      if (result.success) {
        setSales(prev => ({
          ...prev,
          customers: result.data || [],
        }));
      }
      
      return result;
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  }, []);

  const searchCustomers = useCallback(async (searchTerm) => {
    try {
      const result = await customerService.searchCustomers(searchTerm);
      return result;
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  }, []);

  const saveCustomer = useCallback(async (customerData, isEditing = false, customerId = null) => {
    try {
      let result;
      
      if (isEditing && customerId) {
        result = await customerService.updateCustomer(customerId, customerData);
      } else {
        result = await customerService.createCustomer(customerData);
      }
      
      if (result.success) {
        // Reload customers after save
        await loadCustomers();
        toast.success(result.message || `Customer ${isEditing ? 'updated' : 'created'} successfully!`);
      } else {
        toast.error(result.error || `Failed to ${isEditing ? 'update' : 'create'} customer`);
      }
      
      return result;
    } catch (error) {
      
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} customer`);
      return { success: false, error: error.message };
    }
  }, [loadCustomers]);

  const deleteCustomer = useCallback(async (customerId) => {
    try {
      const result = await customerService.deleteCustomer(customerId);
      
      if (result.success) {
        await loadCustomers();
        toast.success('Customer deleted successfully!');
      } else {
        toast.error(result.error || 'Failed to delete customer');
      }
      
      return result;
    } catch (error) {
      
      toast.error('Failed to delete customer');
      return { success: false, error: error.message };
    }
  }, [loadCustomers]);

  // Customer location management
  const addCustomerLocation = useCallback(async (customerId, locationData) => {
    try {
      const result = await customerService.addCustomerLocation(customerId, locationData);
      
      if (result.success) {
        await loadCustomers();
        toast.success('Location added successfully!');
      } else {
        toast.error(result.error || 'Failed to add location');
      }
      
      return result;
    } catch (error) {
      
      toast.error('Failed to add location');
      return { success: false, error: error.message };
    }
  }, [loadCustomers]);

  const updateCustomerLocation = useCallback(async (customerId, locationId, locationData) => {
    try {
      const result = await customerService.updateCustomerLocation(customerId, locationId, locationData);
      
      if (result.success) {
        await loadCustomers();
        toast.success('Location updated successfully!');
      } else {
        toast.error(result.error || 'Failed to update location');
      }
      
      return result;
    } catch (error) {
      
      toast.error('Failed to update location');
      return { success: false, error: error.message };
    }
  }, [loadCustomers]);

  const deleteCustomerLocation = useCallback(async (customerId, locationId) => {
    try {
      const result = await customerService.deleteCustomerLocation(customerId, locationId);
      
      if (result.success) {
        await loadCustomers();
        toast.success('Location deleted successfully!');
      } else {
        toast.error(result.error || 'Failed to delete location');
      }
      
      return result;
    } catch (error) {
      
      toast.error('Failed to delete location');
      return { success: false, error: error.message };
    }
  }, [loadCustomers]);

  // Sale operations
  const getSaleByInvoice = useCallback(async (invoiceNumber) => {
    try {
      const result = await salesService.getSaleByInvoice(invoiceNumber);
      return result;
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  }, []);

  const generateInvoicePDF = useCallback(async (invoiceNumber) => {
    try {
      const result = await salesService.generateInvoicePDF(invoiceNumber);
      return result;
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  }, []);

  // Filter sales with enhanced criteria
  const filterSales = useCallback(async (filters) => {
    try {
      const result = await salesService.getSalesHistory(null, filters);
      
      if (result.success) {
        setSales(prev => ({
          ...prev,
          history: result.data || [],
        }));
      }
      
      return result;
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  }, []);

  // Get customer analytics
  const getCustomerAnalytics = useCallback(async (customerId) => {
    try {
      // Get all sales for this customer
      const allSalesResult = await salesService.getSalesHistory(null);
      
      if (!allSalesResult.success) {
        return { success: false, error: 'Failed to load sales data' };
      }
      
      const customerSales = allSalesResult.data.filter(sale => 
        sale.customer_phone === customerId || sale.customer_name.includes(customerId)
      );
      
      const analytics = {
        total_orders: customerSales.length,
        total_quantity: customerSales.reduce((sum, sale) => sum + (sale.quantity || 0), 0),
        total_amount: customerSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0),
        average_order_value: customerSales.length > 0 
          ? customerSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) / customerSales.length 
          : 0,
        last_order_date: customerSales.length > 0 
          ? customerSales.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date 
          : null,
        locations_used: [...new Set(customerSales.map(sale => sale.location_name).filter(Boolean))],
        payment_methods: [...new Set(customerSales.map(sale => sale.payment_method))],
        recent_sales: customerSales.slice(0, 10)
      };
      
      return { success: true, data: analytics };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  }, []);

  // Real-time data listening
  useEffect(() => {
    if (isConnected) {
      // Listen to sales changes
      const unsubscribeSales = listenToData(`${DB_PATHS.SALES}/transactions`, (data) => {
        if (data) {
          const salesArray = Object.entries(data).map(([id, sale]) => ({
            ...sale,
            id
          })).sort((a, b) => new Date(b.date) - new Date(a.date));
          
          setSales(prev => ({
            ...prev,
            history: salesArray
          }));
        }
      });

      // Listen to customer changes
      const unsubscribeCustomers = listenToData(DB_PATHS.CUSTOMERS, (data) => {
        if (data) {
          const customersArray = Object.entries(data).map(([id, customer]) => ({
            ...customer,
            id
          }));
          
          setSales(prev => ({
            ...prev,
            customers: customersArray
          }));
        }
      });

      return () => {
        unsubscribeSales();
        unsubscribeCustomers();
      };
    }
  }, [isConnected, listenToData]);

  // Initialize data on mount
  useEffect(() => {
    loadSalesData();
  }, [loadSalesData]);

  return {
    // State
    sales,
    
    // Sales operations
    loadSalesData,
    loadSalesTrends,
    recordSale,
    getSaleByInvoice,
    generateInvoicePDF,
    filterSales,
    
    // Customer operations
    loadCustomers,
    searchCustomers,
    saveCustomer,
    deleteCustomer,
    
    // Customer location operations
    addCustomerLocation,
    updateCustomerLocation,
    deleteCustomerLocation,
    
    // Analytics
    getCustomerAnalytics,
    
    // Utilities
    isLoading: sales.loading,
    error: sales.error,
  };
};