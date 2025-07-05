// hooks/useInventorySync.js - Real-time inventory synchronization
import { useState, useEffect, useCallback } from 'react';
import { inventoryService } from '../services/inventoryService';

/**
 * Hook for real-time inventory synchronization across all components
 */
export const useInventorySync = () => {
  const [inventory, setInventory] = useState({
    bricks: {
      total_stock: 0,
      last_updated: null,
      loading: false,
      error: null
    },
    cement: {
      total_bags: 0,
      cost_per_bag: 25,
      last_updated: null,
      loading: false,
      error: null
    },
    isConnected: false,
    lastSync: null
  });

  // Load initial inventory data
  const loadInventoryData = useCallback(async () => {
    try {
      setInventory(prev => ({
        ...prev,
        bricks: { ...prev.bricks, loading: true, error: null },
        cement: { ...prev.cement, loading: true, error: null }
      }));

      const result = await inventoryService.getInventoryStatus();
      
      if (result.success) {
        setInventory(prev => ({
          ...prev,
          bricks: {
            ...result.data.bricks,
            loading: false,
            error: null
          },
          cement: {
            ...result.data.cement,
            loading: false,
            error: null
          },
          isConnected: true,
          lastSync: Date.now()
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error loading inventory data:', error);
      setInventory(prev => ({
        ...prev,
        bricks: { ...prev.bricks, loading: false, error: error.message },
        cement: { ...prev.cement, loading: false, error: error.message },
        isConnected: false
      }));
    }
  }, []);

  // Handle real-time inventory updates
  const handleInventoryUpdate = useCallback((updateEvent) => {
    const { type, data, timestamp } = updateEvent;
    
    setInventory(prev => {
      if (type === 'bricks') {
        return {
          ...prev,
          bricks: {
            ...prev.bricks,
            ...data,
            last_updated: timestamp
          },
          lastSync: timestamp
        };
      } else if (type === 'cement') {
        return {
          ...prev,
          cement: {
            ...prev.cement,
            ...data,
            last_updated: timestamp
          },
          lastSync: timestamp
        };
      }
      
      return prev;
    });
  }, []);

  // Set up real-time listeners
  useEffect(() => {
    // Load initial data
    loadInventoryData();

    // Set up real-time Firebase listener
    const unsubscribeFirebase = inventoryService.listenToInventoryChanges(handleInventoryUpdate);

    // Set up local event listener for immediate updates
    const unsubscribeLocal = inventoryService.addInventoryListener(handleInventoryUpdate);

    // Cleanup function
    return () => {
      unsubscribeFirebase();
      unsubscribeLocal();
    };
  }, [loadInventoryData, handleInventoryUpdate]);

  // Inventory action functions with automatic sync
  const updateBrickStock = useCallback(async (quantity, operation = 'add', notes = '') => {
    try {
      setInventory(prev => ({
        ...prev,
        bricks: { ...prev.bricks, loading: true }
      }));

      const result = await inventoryService.updateBrickStock(quantity, operation, notes);
      
      if (!result.success) {
        setInventory(prev => ({
          ...prev,
          bricks: { ...prev.bricks, loading: false, error: result.error }
        }));
      }
      
      return result;
    } catch (error) {
      setInventory(prev => ({
        ...prev,
        bricks: { ...prev.bricks, loading: false, error: error.message }
      }));
      return { success: false, error: error.message };
    }
  }, []);

  const setBrickStock = useCallback(async (quantity, notes = 'Manual adjustment') => {
    try {
      setInventory(prev => ({
        ...prev,
        bricks: { ...prev.bricks, loading: true }
      }));

      const result = await inventoryService.setBrickStock(quantity, notes);
      
      if (!result.success) {
        setInventory(prev => ({
          ...prev,
          bricks: { ...prev.bricks, loading: false, error: result.error }
        }));
      }
      
      return result;
    } catch (error) {
      setInventory(prev => ({
        ...prev,
        bricks: { ...prev.bricks, loading: false, error: error.message }
      }));
      return { success: false, error: error.message };
    }
  }, []);

  const updateCementStock = useCallback(async (bags, operation = 'add', costPerBag = null, notes = '') => {
    try {
      setInventory(prev => ({
        ...prev,
        cement: { ...prev.cement, loading: true }
      }));

      const result = await inventoryService.updateCementStock(bags, operation, costPerBag, notes);
      
      if (!result.success) {
        setInventory(prev => ({
          ...prev,
          cement: { ...prev.cement, loading: false, error: result.error }
        }));
      }
      
      return result;
    } catch (error) {
      setInventory(prev => ({
        ...prev,
        cement: { ...prev.cement, loading: false, error: error.message }
      }));
      return { success: false, error: error.message };
    }
  }, []);

  // Force refresh all inventory data
  const refreshInventory = useCallback(async () => {
    await loadInventoryData();
    return inventoryService.forceSyncInventory();
  }, [loadInventoryData]);

  // Get brick stock (for easy access)
  const getBrickStock = useCallback(() => {
    return inventory.bricks.total_stock || 0;
  }, [inventory.bricks.total_stock]);

  // Get cement stock (for easy access)
  const getCementStock = useCallback(() => {
    return inventory.cement.total_bags || 0;
  }, [inventory.cement.total_bags]);

  return {
    // State
    inventory,
    
    // Getters
    getBrickStock,
    getCementStock,
    
    // Actions
    updateBrickStock,
    setBrickStock,
    updateCementStock,
    refreshInventory,
    loadInventoryData,
    
    // Status
    isLoading: inventory.bricks.loading || inventory.cement.loading,
    isConnected: inventory.isConnected,
    hasError: !!inventory.bricks.error || !!inventory.cement.error,
    error: inventory.bricks.error || inventory.cement.error,
    lastSync: inventory.lastSync
  };
};