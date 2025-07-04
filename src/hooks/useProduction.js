import { useState, useEffect, useCallback } from 'react';
import { productionService } from '../services/productionService';
import { useFirebase } from './useFirebase';
import { DB_PATHS } from '../utils/constants';

/**
 * Custom hook for production management
 */
export function useProduction() {
  const [production, setProduction] = useState({
    history: [],
    todayProduction: null,
    monthlyStats: {},
    stats: null,
    trends: null,
    loading: false,
    error: null,
  });

  const { isConnected, listenToData, stopListening } = useFirebase();

  // Load production data
  const loadProductionData = useCallback(async (period = 30) => {
    try {
      setProduction(prev => ({ ...prev, loading: true, error: null }));

      const today = new Date().toISOString().split('T')[0];

      const [historyResult, todayResult, monthlyResult, statsResult] = await Promise.all([
        productionService.getProductionHistory(period),
        productionService.getProductionByDate(today),
        productionService.getMonthlyProduction(),
        productionService.getProductionStats('month'),
      ]);

      setProduction(prev => ({
        ...prev,
        history: historyResult.success ? historyResult.data : [],
        todayProduction: todayResult.success ? todayResult.data : null,
        monthlyStats: monthlyResult.success ? monthlyResult.data : {},
        stats: statsResult.success ? statsResult.data : null,
        loading: false,
        error: null,
      }));

    } catch (error) {
      console.error('Error loading production data:', error);
      setProduction(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, []);

  // Load production trends
  const loadProductionTrends = useCallback(async (days = 30) => {
    try {
      const result = await productionService.getProductionTrends(days);
      
      if (result.success) {
        setProduction(prev => ({
          ...prev,
          trends: result.data,
        }));
      }
    } catch (error) {
      console.error('Error loading production trends:', error);
    }
  }, []);

  // Add new production entry
  const addProduction = useCallback(async (productionData) => {
    try {
      const result = await productionService.addProduction(productionData);
      
      if (result.success) {
        // Reload data to get updated statistics
        await loadProductionData();
      }
      
      return result;
    } catch (error) {
      console.error('Error adding production:', error);
      return { success: false, error: error.message };
    }
  }, [loadProductionData]);

  // Update production entry
  const updateProduction = useCallback(async (date, updatedData) => {
    try {
      const result = await productionService.updateProduction(date, updatedData);
      
      if (result.success) {
        // Reload data to get updated statistics
        await loadProductionData();
      }
      
      return result;
    } catch (error) {
      console.error('Error updating production:', error);
      return { success: false, error: error.message };
    }
  }, [loadProductionData]);

  // Delete production entry
  const deleteProduction = useCallback(async (date) => {
    try {
      const result = await productionService.deleteProduction(date);
      
      if (result.success) {
        // Reload data to get updated statistics
        await loadProductionData();
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting production:', error);
      return { success: false, error: error.message };
    }
  }, [loadProductionData]);

  // Get production by date
  const getProductionByDate = useCallback(async (date) => {
    try {
      return await productionService.getProductionByDate(date);
    } catch (error) {
      console.error('Error getting production by date:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Get cement usage data
  const getCementUsage = useCallback(async (period = 'month') => {
    try {
      return await productionService.getCementUsage(period);
    } catch (error) {
      console.error('Error getting cement usage:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Set up real-time listeners
  useEffect(() => {
    // Listen to daily production changes
    const unsubscribeDaily = listenToData(
      `${DB_PATHS.PRODUCTION}/daily`,
      (data) => {
        if (data) {
          const history = Object.entries(data)
            .map(([date, productionData]) => ({
              date,
              ...productionData,
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 30);

          setProduction(prev => ({
            ...prev,
            history,
          }));

          // Update today's production
          const today = new Date().toISOString().split('T')[0];
          const todayData = data[today] || null;
          
          setProduction(prev => ({
            ...prev,
            todayProduction: todayData,
          }));
        }
      }
    );

    // Listen to monthly production changes
    const unsubscribeMonthly = listenToData(
      `${DB_PATHS.PRODUCTION}/monthly`,
      (data) => {
        setProduction(prev => ({
          ...prev,
          monthlyStats: data || {},
        }));
      }
    );

    return () => {
      if (unsubscribeDaily) unsubscribeDaily();
      if (unsubscribeMonthly) unsubscribeMonthly();
    };
  }, [listenToData]);

  // Load initial data
  useEffect(() => {
    loadProductionData();
    loadProductionTrends();
  }, [loadProductionData, loadProductionTrends]);

  return {
    // State
    production,
    isConnected,
    
    // Data loading
    loadProductionData,
    loadProductionTrends,
    
    // CRUD operations
    addProduction,
    updateProduction,
    deleteProduction,
    getProductionByDate,
    
    // Additional data
    getCementUsage,
    
    // Computed values
    isLoading: production.loading,
    hasError: !!production.error,
    error: production.error,
    todayProduction: production.todayProduction,
    productionHistory: production.history,
    monthlyStats: production.monthlyStats,
    productionStats: production.stats,
    productionTrends: production.trends,
  };
}

/**
 * Hook for today's production specifically
 */
export function useTodayProduction() {
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { listenToData } = useFirebase();

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // Listen to today's production data
    const unsubscribe = listenToData(
      `${DB_PATHS.PRODUCTION}/daily/${today}`,
      (data) => {
        setTodayData(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [listenToData]);

  const addTodayProduction = useCallback(async (productionData) => {
    try {
      return await productionService.addProduction(productionData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  return {
    todayData,
    loading,
    error,
    addTodayProduction,
    hasProduction: !!todayData,
    quantity: todayData?.quantity || 0,
    cementUsed: todayData?.cement_used || 0,
    efficiency: todayData?.efficiency || 0,
  };
}

/**
 * Hook for production statistics
 */
export function useProductionStats(period = 'month') {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await productionService.getProductionStats(period);
      
      if (result.success) {
        setStats(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refresh: loadStats,
    
    // Computed values
    totalQuantity: stats?.total_quantity || 0,
    totalCementUsed: stats?.total_cement_used || 0,
    productionDays: stats?.production_days || 0,
    averageDaily: stats?.average_daily_production || 0,
    averageEfficiency: stats?.average_efficiency || 0,
    bestDay: stats?.best_day,
    worstDay: stats?.worst_day,
  };
}

/**
 * Hook for production trends and charts
 */
export function useProductionTrends(days = 30) {
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTrends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await productionService.getProductionTrends(days);
      
      if (result.success) {
        setTrends(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  return {
    trends,
    loading,
    error,
    refresh: loadTrends,
    
    // Chart data
    dailyProduction: trends?.daily_production || [],
    movingAverages: trends?.moving_averages || [],
    efficiencyTrend: trends?.efficiency_trend || [],
    periodSummary: trends?.period_summary || {},
  };
}

export default useProduction;