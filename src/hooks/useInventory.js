import { useState, useEffect, useCallback } from 'react';
import { inventoryService } from '../services/inventoryService';
import { useFirebase } from './useFirebase';
import { DB_PATHS } from '../utils/constants';

/**
 * Custom hook for inventory management
 */
export function useInventory() {
  const [inventory, setInventory] = useState({
    bricks: {
      total_stock: 0,
      last_updated: null,
      transactions: [],
      loading: false,
      error: null,
    },
    cement: {
      total_bags: 0,
      cost_per_bag: 25,
      last_updated: null,
      transactions: [],
      purchases: [],
      loading: false,
      error: null,
    },
    status: {
      inventory_value: {
        brickValue: '0.00',
        cementValue: '0.00',
        totalValue: '0.00',
      },
      low_stock_alerts: {
        bricks: false,
        cement: false,
      },
      last_updated: null,
      loading: false,
      error: null,
    },
    history: {
      transactions: [],
      loading: false,
      error: null,
    },
  });

  const { isConnected, listenToData } = useFirebase();

  // Load inventory data
  const loadInventoryData = useCallback(async () => {
    try {
      setInventory(prev => ({
        ...prev,
        status: { ...prev.status, loading: true, error: null },
      }));

      const result = await inventoryService.getInventoryStatus();
      
      if (result.success) {
        const { bricks, cement, inventory_value, low_stock_alerts, last_updated } = result.data;
        
        setInventory(prev => ({
          ...prev,
          bricks: { ...prev.bricks, ...bricks, loading: false, error: null },
          cement: { ...prev.cement, ...cement, loading: false, error: null },
          status: {
            ...prev.status,
            inventory_value,
            low_stock_alerts,
            last_updated,
            loading: false,
            error: null,
          },
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error loading inventory data:', error);
      setInventory(prev => ({
        ...prev,
        status: { ...prev.status, loading: false, error: error.message },
      }));
    }
  }, []);

  // Load inventory history
  const loadInventoryHistory = useCallback(async (type = 'all', limit = 50) => {
    try {
      setInventory(prev => ({
        ...prev,
        history: { ...prev.history, loading: true, error: null },
      }));

      const result = await inventoryService.getInventoryHistory(type, limit);
      
      if (result.success) {
        setInventory(prev => ({
          ...prev,
          history: {
            transactions: result.data,
            loading: false,
            error: null,
          },
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error loading inventory history:', error);
      setInventory(prev => ({
        ...prev,
        history: { ...prev.history, loading: false, error: error.message },
      }));
    }
  }, []);

  // Brick inventory operations
  const updateBrickStock = useCallback(async (quantity, operation = 'add', notes = '') => {
    try {
      setInventory(prev => ({
        ...prev,
        bricks: { ...prev.bricks, loading: true, error: null },
      }));

      const result = await inventoryService.updateBrickStock(quantity, operation, notes);
      
      if (result.success) {
        // Reload inventory data to sync everything
        await loadInventoryData();
        await loadInventoryHistory();
      }
      
      return result;
    } catch (error) {
      console.error('Error updating brick stock:', error);
      setInventory(prev => ({
        ...prev,
        bricks: { ...prev.bricks, loading: false, error: error.message },
      }));
      return { success: false, error: error.message };
    }
  }, [loadInventoryData, loadInventoryHistory]);

  const setBrickStock = useCallback(async (quantity, notes = 'Manual adjustment') => {
    try {
      setInventory(prev => ({
        ...prev,
        bricks: { ...prev.bricks, loading: true, error: null },
      }));

      const result = await inventoryService.setBrickStock(quantity, notes);
      
      if (result.success) {
        // Reload inventory data to sync everything
        await loadInventoryData();
        await loadInventoryHistory();
      }
      
      return result;
    } catch (error) {
      console.error('Error setting brick stock:', error);
      setInventory(prev => ({
        ...prev,
        bricks: { ...prev.bricks, loading: false, error: error.message },
      }));
      return { success: false, error: error.message };
    }
  }, [loadInventoryData, loadInventoryHistory]);

  // Cement inventory operations
  const updateCementStock = useCallback(async (bags, operation = 'add', costPerBag = null, notes = '') => {
    try {
      setInventory(prev => ({
        ...prev,
        cement: { ...prev.cement, loading: true, error: null },
      }));

      const result = await inventoryService.updateCementStock(bags, operation, costPerBag, notes);
      
      if (result.success) {
        // Reload inventory data to sync everything
        await loadInventoryData();
        await loadInventoryHistory();
      }
      
      return result;
    } catch (error) {
      console.error('Error updating cement stock:', error);
      setInventory(prev => ({
        ...prev,
        cement: { ...prev.cement, loading: false, error: error.message },
      }));
      return { success: false, error: error.message };
    }
  }, [loadInventoryData, loadInventoryHistory]);

  const purchaseCement = useCallback(async (bags, costPerBag, supplier = '', notes = '') => {
    try {
      setInventory(prev => ({
        ...prev,
        cement: { ...prev.cement, loading: true, error: null },
      }));

      const result = await inventoryService.purchaseCement(bags, costPerBag, supplier, notes);
      
      if (result.success) {
        // Reload inventory data to sync everything
        await loadInventoryData();
        await loadInventoryHistory();
      }
      
      return result;
    } catch (error) {
      console.error('Error purchasing cement:', error);
      setInventory(prev => ({
        ...prev,
        cement: { ...prev.cement, loading: false, error: error.message },
      }));
      return { success: false, error: error.message };
    }
  }, [loadInventoryData, loadInventoryHistory]);

  // Set up real-time listeners
  useEffect(() => {
    // Listen to brick inventory changes
    const unsubscribeBricks = listenToData(
      DB_PATHS.INVENTORY.BRICKS,
      (data) => {
        if (data) {
          setInventory(prev => ({
            ...prev,
            bricks: {
              ...prev.bricks,
              ...data,
              loading: false,
              error: null,
            },
          }));
        }
      }
    );

    // Listen to cement inventory changes
    const unsubscribeCement = listenToData(
      DB_PATHS.INVENTORY.CEMENT,
      (data) => {
        if (data) {
          setInventory(prev => ({
            ...prev,
            cement: {
              ...prev.cement,
              ...data,
              loading: false,
              error: null,
            },
          }));
        }
      }
    );

    // Set up status listener that updates complete inventory status
    const statusListener = inventoryService.listenToInventoryStatus((result) => {
      if (result && result.success) {
        const { bricks, cement, inventory_value, low_stock_alerts, last_updated } = result.data;
        
        setInventory(prev => ({
          ...prev,
          bricks: { ...prev.bricks, ...bricks },
          cement: { ...prev.cement, ...cement },
          status: {
            ...prev.status,
            inventory_value,
            low_stock_alerts,
            last_updated,
            loading: false,
            error: null,
          },
        }));
      }
    });

    return () => {
      if (unsubscribeBricks) unsubscribeBricks();
      if (unsubscribeCement) unsubscribeCement();
      if (statusListener) statusListener();
    };
  }, [listenToData]);

  // Load initial data
  useEffect(() => {
    loadInventoryData();
    loadInventoryHistory();
  }, [loadInventoryData, loadInventoryHistory]);

  return {
    // State
    inventory,
    isConnected,
    
    // Data loading
    loadInventoryData,
    loadInventoryHistory,
    
    // Brick operations
    updateBrickStock,
    setBrickStock,
    
    // Cement operations
    updateCementStock,
    purchaseCement,
    
    // Computed values
    isLoading: inventory.status.loading || inventory.bricks.loading || inventory.cement.loading,
    hasError: !!(inventory.status.error || inventory.bricks.error || inventory.cement.error),
    bricks: inventory.bricks,
    cement: inventory.cement,
    status: inventory.status,
    history: inventory.history,
    lowStockAlerts: inventory.status.low_stock_alerts,
    inventoryValue: inventory.status.inventory_value,
  };
}

/**
 * Hook for brick inventory specifically
 */
export function useBrickInventory() {
  const [brickData, setBrickData] = useState({
    total_stock: 0,
    last_updated: null,
    loading: true,
    error: null,
  });

  const { listenToData } = useFirebase();

  useEffect(() => {
    const unsubscribe = listenToData(
      DB_PATHS.INVENTORY.BRICKS,
      (data) => {
        setBrickData({
          ...data,
          loading: false,
          error: null,
        });
      },
      (error) => {
        setBrickData(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [listenToData]);

  const updateStock = useCallback(async (quantity, operation = 'add', notes = '') => {
    try {
      return await inventoryService.updateBrickStock(quantity, operation, notes);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const setStock = useCallback(async (quantity, notes = 'Manual adjustment') => {
    try {
      return await inventoryService.setBrickStock(quantity, notes);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  return {
    bricks: brickData,
    loading: brickData.loading,
    error: brickData.error,
    totalStock: brickData.total_stock,
    lastUpdated: brickData.last_updated,
    updateStock,
    setStock,
  };
}

/**
 * Hook for cement inventory specifically
 */
export function useCementInventory() {
  const [cementData, setCementData] = useState({
    total_bags: 0,
    cost_per_bag: 25,
    last_updated: null,
    loading: true,
    error: null,
  });

  const { listenToData } = useFirebase();

  useEffect(() => {
    const unsubscribe = listenToData(
      DB_PATHS.INVENTORY.CEMENT,
      (data) => {
        setCementData({
          ...data,
          loading: false,
          error: null,
        });
      },
      (error) => {
        setCementData(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [listenToData]);

  const updateStock = useCallback(async (bags, operation = 'add', costPerBag = null, notes = '') => {
    try {
      return await inventoryService.updateCementStock(bags, operation, costPerBag, notes);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const purchaseCement = useCallback(async (bags, costPerBag, supplier = '', notes = '') => {
    try {
      return await inventoryService.purchaseCement(bags, costPerBag, supplier, notes);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  return {
    cement: cementData,
    loading: cementData.loading,
    error: cementData.error,
    totalBags: cementData.total_bags,
    costPerBag: cementData.cost_per_bag,
    lastUpdated: cementData.last_updated,
    updateStock,
    purchaseCement,
  };
}

/**
 * Hook for inventory alerts
 */
export function useInventoryAlerts() {
  const [alerts, setAlerts] = useState({
    bricks: false,
    cement: false,
    loading: true,
  });

  const { listenToData } = useFirebase();

  useEffect(() => {
    // Listen to inventory status for alerts
    const statusListener = inventoryService.listenToInventoryStatus((result) => {
      if (result && result.success) {
        setAlerts({
          bricks: result.data.low_stock_alerts.bricks,
          cement: result.data.low_stock_alerts.cement,
          loading: false,
        });
      }
    });

    return () => {
      if (statusListener) statusListener();
    };
  }, [listenToData]);

  return {
    alerts,
    loading: alerts.loading,
    hasBrickAlert: alerts.bricks,
    hasCementAlert: alerts.cement,
    hasAnyAlert: alerts.bricks || alerts.cement,
    alertCount: (alerts.bricks ? 1 : 0) + (alerts.cement ? 1 : 0),
  };
}

/**
 * Hook for inventory value tracking
 */
export function useInventoryValue() {
  const [value, setValue] = useState({
    brickValue: '0.00',
    cementValue: '0.00',
    totalValue: '0.00',
    loading: true,
  });

  const { listenToData } = useFirebase();

  useEffect(() => {
    // Listen to inventory status for value updates
    const statusListener = inventoryService.listenToInventoryStatus((result) => {
      if (result && result.success) {
        setValue({
          ...result.data.inventory_value,
          loading: false,
        });
      }
    });

    return () => {
      if (statusListener) statusListener();
    };
  }, [listenToData]);

  return {
    value,
    loading: value.loading,
    brickValue: parseFloat(value.brickValue),
    cementValue: parseFloat(value.cementValue),
    totalValue: parseFloat(value.totalValue),
    formattedBrickValue: value.brickValue,
    formattedCementValue: value.cementValue,
    formattedTotalValue: value.totalValue,
  };
}

export default useInventory;