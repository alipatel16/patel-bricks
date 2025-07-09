import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { inventoryService } from '../services/inventoryService';
import { useApp } from './AppContext';

// Initial state
const initialState = {
  // Brick inventory
  bricks: {
    total_stock: 0,
    last_updated: null,
    transactions: [],
    loading: false,
    error: null,
  },
  
  // Cement inventory
  cement: {
    total_bags: 0,
    cost_per_bag: 25,
    last_updated: null,
    transactions: [],
    purchases: [],
    loading: false,
    error: null,
  },
  
  // Combined inventory status
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
  
  // History and analytics
  history: {
    transactions: [],
    loading: false,
    error: null,
  },
  
  // Real-time listeners
  listeners: {
    bricks: null,
    cement: null,
    status: null,
  },
};

// Action types
const ActionTypes = {
  // Brick inventory actions
  SET_BRICK_INVENTORY: 'SET_BRICK_INVENTORY',
  SET_BRICK_LOADING: 'SET_BRICK_LOADING',
  SET_BRICK_ERROR: 'SET_BRICK_ERROR',
  UPDATE_BRICK_STOCK: 'UPDATE_BRICK_STOCK',
  
  // Cement inventory actions
  SET_CEMENT_INVENTORY: 'SET_CEMENT_INVENTORY',
  SET_CEMENT_LOADING: 'SET_CEMENT_LOADING',
  SET_CEMENT_ERROR: 'SET_CEMENT_ERROR',
  UPDATE_CEMENT_STOCK: 'UPDATE_CEMENT_STOCK',
  
  // Status actions
  SET_INVENTORY_STATUS: 'SET_INVENTORY_STATUS',
  SET_STATUS_LOADING: 'SET_STATUS_LOADING',
  SET_STATUS_ERROR: 'SET_STATUS_ERROR',
  
  // History actions
  SET_INVENTORY_HISTORY: 'SET_INVENTORY_HISTORY',
  SET_HISTORY_LOADING: 'SET_HISTORY_LOADING',
  SET_HISTORY_ERROR: 'SET_HISTORY_ERROR',
  ADD_HISTORY_TRANSACTION: 'ADD_HISTORY_TRANSACTION',
  
  // Listener actions
  SET_LISTENERS: 'SET_LISTENERS',
  CLEAR_LISTENERS: 'CLEAR_LISTENERS',
  
  // General actions
  RESET_INVENTORY: 'RESET_INVENTORY',
};

// Reducer function
function inventoryReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_BRICK_INVENTORY:
      return {
        ...state,
        bricks: {
          ...state.bricks,
          ...action.payload,
          loading: false,
          error: null,
        },
      };
    
    case ActionTypes.SET_BRICK_LOADING:
      return {
        ...state,
        bricks: {
          ...state.bricks,
          loading: action.payload,
        },
      };
    
    case ActionTypes.SET_BRICK_ERROR:
      return {
        ...state,
        bricks: {
          ...state.bricks,
          error: action.payload,
          loading: false,
        },
      };
    
    case ActionTypes.UPDATE_BRICK_STOCK:
      return {
        ...state,
        bricks: {
          ...state.bricks,
          total_stock: action.payload,
          last_updated: Date.now(),
        },
      };
    
    case ActionTypes.SET_CEMENT_INVENTORY:
      return {
        ...state,
        cement: {
          ...state.cement,
          ...action.payload,
          loading: false,
          error: null,
        },
      };
    
    case ActionTypes.SET_CEMENT_LOADING:
      return {
        ...state,
        cement: {
          ...state.cement,
          loading: action.payload,
        },
      };
    
    case ActionTypes.SET_CEMENT_ERROR:
      return {
        ...state,
        cement: {
          ...state.cement,
          error: action.payload,
          loading: false,
        },
      };
    
    case ActionTypes.UPDATE_CEMENT_STOCK:
      return {
        ...state,
        cement: {
          ...state.cement,
          total_bags: action.payload.total_bags,
          cost_per_bag: action.payload.cost_per_bag || state.cement.cost_per_bag,
          last_updated: Date.now(),
        },
      };
    
    case ActionTypes.SET_INVENTORY_STATUS:
      return {
        ...state,
        status: {
          ...state.status,
          ...action.payload,
          loading: false,
          error: null,
        },
      };
    
    case ActionTypes.SET_STATUS_LOADING:
      return {
        ...state,
        status: {
          ...state.status,
          loading: action.payload,
        },
      };
    
    case ActionTypes.SET_STATUS_ERROR:
      return {
        ...state,
        status: {
          ...state.status,
          error: action.payload,
          loading: false,
        },
      };
    
    case ActionTypes.SET_INVENTORY_HISTORY:
      return {
        ...state,
        history: {
          ...state.history,
          transactions: action.payload,
          loading: false,
          error: null,
        },
      };
    
    case ActionTypes.SET_HISTORY_LOADING:
      return {
        ...state,
        history: {
          ...state.history,
          loading: action.payload,
        },
      };
    
    case ActionTypes.SET_HISTORY_ERROR:
      return {
        ...state,
        history: {
          ...state.history,
          error: action.payload,
          loading: false,
        },
      };
    
    case ActionTypes.ADD_HISTORY_TRANSACTION:
      return {
        ...state,
        history: {
          ...state.history,
          transactions: [action.payload, ...state.history.transactions],
        },
      };
    
    case ActionTypes.SET_LISTENERS:
      return {
        ...state,
        listeners: {
          ...state.listeners,
          ...action.payload,
        },
      };
    
    case ActionTypes.CLEAR_LISTENERS:
      return {
        ...state,
        listeners: {
          bricks: null,
          cement: null,
          status: null,
        },
      };
    
    case ActionTypes.RESET_INVENTORY:
      return initialState;
    
    default:
      return state;
  }
}

// Create context
const InventoryContext = createContext();

// Context provider component
export function InventoryProvider({ children }) {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);
  const { actions: appActions } = useApp();

  // Load initial data on mount
  useEffect(() => {
    loadInventoryData();
    setupRealtimeListeners();
    
    return () => {
      cleanupListeners();
    };
  }, []);

  // Load all inventory data
  const loadInventoryData = useCallback(async () => {
    try {
      dispatch({ type: ActionTypes.SET_STATUS_LOADING, payload: true });
      
      const result = await inventoryService.getInventoryStatus();
      
      if (result.success) {
        const { bricks, cement, inventory_value, low_stock_alerts, last_updated } = result.data;
        
        // Update individual inventories
        dispatch({ type: ActionTypes.SET_BRICK_INVENTORY, payload: bricks });
        dispatch({ type: ActionTypes.SET_CEMENT_INVENTORY, payload: cement });
        
        // Update combined status
        dispatch({
          type: ActionTypes.SET_INVENTORY_STATUS,
          payload: {
            inventory_value,
            low_stock_alerts,
            last_updated,
          },
        });
        
        // Show low stock alerts
        if (low_stock_alerts.bricks) {
          appActions.showNotification('Low brick stock alert!', 'warning');
        }
        if (low_stock_alerts.cement) {
          appActions.showNotification('Low cement stock alert!', 'warning');
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      
      dispatch({ type: ActionTypes.SET_STATUS_ERROR, payload: error.message });
      appActions.showNotification('Failed to load inventory data', 'error');
    }
  }, [appActions]);

  // Setup real-time listeners
  const setupRealtimeListeners = useCallback(() => {
    // Listen to inventory status changes
    const statusListener = inventoryService.listenToInventoryStatus((result) => {
      if (result && result.success) {
        const { bricks, cement, inventory_value, low_stock_alerts, last_updated } = result.data;
        
        dispatch({ type: ActionTypes.SET_BRICK_INVENTORY, payload: bricks });
        dispatch({ type: ActionTypes.SET_CEMENT_INVENTORY, payload: cement });
        dispatch({
          type: ActionTypes.SET_INVENTORY_STATUS,
          payload: { inventory_value, low_stock_alerts, last_updated },
        });
      }
    });

    dispatch({
      type: ActionTypes.SET_LISTENERS,
      payload: { status: statusListener },
    });
  }, []);

  // Cleanup listeners
  const cleanupListeners = useCallback(() => {
    const { status } = state.listeners;
    
    if (status) {
      status(); // Call the unsubscribe function
    }
    
    dispatch({ type: ActionTypes.CLEAR_LISTENERS });
  }, [state.listeners]);

  // Load inventory history
  const loadInventoryHistory = useCallback(async (type = 'all', limit = 50) => {
    try {
      dispatch({ type: ActionTypes.SET_HISTORY_LOADING, payload: true });
      
      const result = await inventoryService.getInventoryHistory(type, limit);
      
      if (result.success) {
        dispatch({ type: ActionTypes.SET_INVENTORY_HISTORY, payload: result.data });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      
      dispatch({ type: ActionTypes.SET_HISTORY_ERROR, payload: error.message });
      appActions.showNotification('Failed to load inventory history', 'error');
    }
  }, [appActions]);

  // Action creators
  const actions = {
    // Brick inventory actions
    updateBrickStock: async (quantity, operation = 'add', notes = '') => {
      try {
        dispatch({ type: ActionTypes.SET_BRICK_LOADING, payload: true });
        
        const result = await inventoryService.updateBrickStock(quantity, operation, notes);
        
        if (result.success) {
          dispatch({ type: ActionTypes.UPDATE_BRICK_STOCK, payload: result.data.new_stock });
          appActions.showNotification(
            `Brick stock ${operation === 'add' ? 'increased' : 'decreased'} by ${quantity}`,
            'success'
          );
          
          // Reload inventory data to sync everything
          await loadInventoryData();
        } else {
          throw new Error(result.error);
        }
        
        return result;
      } catch (error) {
        
        dispatch({ type: ActionTypes.SET_BRICK_ERROR, payload: error.message });
        appActions.showNotification('Failed to update brick stock', 'error');
        return { success: false, error: error.message };
      }
    },

    setBrickStock: async (quantity, notes = 'Manual adjustment') => {
      try {
        dispatch({ type: ActionTypes.SET_BRICK_LOADING, payload: true });
        
        const result = await inventoryService.setBrickStock(quantity, notes);
        
        if (result.success) {
          dispatch({ type: ActionTypes.UPDATE_BRICK_STOCK, payload: result.data.new_stock });
          appActions.showNotification(`Brick stock set to ${quantity}`, 'success');
          
          // Reload inventory data to sync everything
          await loadInventoryData();
        } else {
          throw new Error(result.error);
        }
        
        return result;
      } catch (error) {
        
        dispatch({ type: ActionTypes.SET_BRICK_ERROR, payload: error.message });
        appActions.showNotification('Failed to set brick stock', 'error');
        return { success: false, error: error.message };
      }
    },

    // Cement inventory actions
    updateCementStock: async (bags, operation = 'add', costPerBag = null, notes = '') => {
      try {
        dispatch({ type: ActionTypes.SET_CEMENT_LOADING, payload: true });
        
        const result = await inventoryService.updateCementStock(bags, operation, costPerBag, notes);
        
        if (result.success) {
          dispatch({
            type: ActionTypes.UPDATE_CEMENT_STOCK,
            payload: {
              total_bags: result.data.new_stock,
              cost_per_bag: costPerBag,
            },
          });
          appActions.showNotification(
            `Cement stock ${operation === 'add' ? 'increased' : 'decreased'} by ${bags} bags`,
            'success'
          );
          
          // Reload inventory data to sync everything
          await loadInventoryData();
        } else {
          throw new Error(result.error);
        }
        
        return result;
      } catch (error) {
        
        dispatch({ type: ActionTypes.SET_CEMENT_ERROR, payload: error.message });
        appActions.showNotification('Failed to update cement stock', 'error');
        return { success: false, error: error.message };
      }
    },

    purchaseCement: async (bags, costPerBag, supplier = '', notes = '') => {
      try {
        dispatch({ type: ActionTypes.SET_CEMENT_LOADING, payload: true });
        
        const result = await inventoryService.purchaseCement(bags, costPerBag, supplier, notes);
        
        if (result.success) {
          appActions.showNotification(
            `Purchased ${bags} bags of cement for $${(bags * costPerBag).toFixed(2)}`,
            'success'
          );
          
          // Add to history
          dispatch({
            type: ActionTypes.ADD_HISTORY_TRANSACTION,
            payload: {
              id: result.data.purchase_id,
              type: 'cement',
              category: 'purchase',
              ...result.data,
            },
          });
          
          // Reload inventory data to sync everything
          await loadInventoryData();
        } else {
          throw new Error(result.error);
        }
        
        return result;
      } catch (error) {
        
        dispatch({ type: ActionTypes.SET_CEMENT_ERROR, payload: error.message });
        appActions.showNotification('Failed to record cement purchase', 'error');
        return { success: false, error: error.message };
      }
    },

    // Data management actions
    refreshInventory: async () => {
      await loadInventoryData();
    },

    loadHistory: loadInventoryHistory,

    clearErrors: () => {
      dispatch({ type: ActionTypes.SET_BRICK_ERROR, payload: null });
      dispatch({ type: ActionTypes.SET_CEMENT_ERROR, payload: null });
      dispatch({ type: ActionTypes.SET_STATUS_ERROR, payload: null });
      dispatch({ type: ActionTypes.SET_HISTORY_ERROR, payload: null });
    },

    resetInventory: () => {
      cleanupListeners();
      dispatch({ type: ActionTypes.RESET_INVENTORY });
    },
  };

  // Context value
  const contextValue = {
    state,
    actions,
    // Convenience getters
    bricks: state.bricks,
    cement: state.cement,
    status: state.status,
    history: state.history,
    isLoading: state.bricks.loading || state.cement.loading || state.status.loading,
    hasErrors: !!(state.bricks.error || state.cement.error || state.status.error),
    lowStockAlerts: state.status.low_stock_alerts,
    inventoryValue: state.status.inventory_value,
  };

  return (
    <InventoryContext.Provider value={contextValue}>
      {children}
    </InventoryContext.Provider>
  );
}

// Custom hook to use the inventory context
export function useInventory() {
  const context = useContext(InventoryContext);
  
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  
  return context;
}

// Custom hooks for specific inventory types
export function useBrickInventory() {
  const { bricks, actions } = useInventory();
  return {
    bricks,
    updateStock: actions.updateBrickStock,
    setStock: actions.setBrickStock,
    isLoading: bricks.loading,
    error: bricks.error,
  };
}

export function useCementInventory() {
  const { cement, actions } = useInventory();
  return {
    cement,
    updateStock: actions.updateCementStock,
    purchaseCement: actions.purchaseCement,
    isLoading: cement.loading,
    error: cement.error,
  };
}

export default InventoryContext;