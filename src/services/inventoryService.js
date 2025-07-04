import { dbUtils } from './firebase';
import { DB_PATHS } from '../utils/constants';
import { calculateInventoryValue, isStockLow } from '../utils/calculations';

/**
 * Inventory Service - Handles all inventory-related operations
 */

export const inventoryService = {
  /**
   * BRICK INVENTORY OPERATIONS
   */

  // Get current brick inventory
  getBrickInventory: async () => {
    try {
      const result = await dbUtils.readData(DB_PATHS.INVENTORY.BRICKS);
      return {
        success: true,
        data: result.data || { total_stock: 0, last_updated: Date.now() }
      };
    } catch (error) {
      console.error('Error getting brick inventory:', error);
      return { success: false, error: error.message };
    }
  },

  // Update brick stock (add or subtract)
  updateBrickStock: async (quantity, operation = 'add', notes = '') => {
    try {
      const { data: currentInventory } = await inventoryService.getBrickInventory();
      
      let newStock;
      if (operation === 'add') {
        newStock = currentInventory.total_stock + quantity;
      } else if (operation === 'subtract') {
        newStock = Math.max(0, currentInventory.total_stock - quantity);
      } else {
        throw new Error('Invalid operation. Use "add" or "subtract"');
      }

      const updates = {
        [`${DB_PATHS.INVENTORY.BRICKS}/total_stock`]: newStock,
        [`${DB_PATHS.INVENTORY.BRICKS}/last_updated`]: dbUtils.timestamp(),
      };

      // Log the transaction
      if (notes) {
        const transactionKey = dbUtils.timestamp();
        updates[`${DB_PATHS.INVENTORY.BRICKS}/transactions/${transactionKey}`] = {
          operation,
          quantity,
          previous_stock: currentInventory.total_stock,
          new_stock: newStock,
          notes,
          timestamp: dbUtils.timestamp(),
        };
      }

      const result = await dbUtils.batchUpdate(updates);
      
      if (result.success) {
        return {
          success: true,
          data: {
            previous_stock: currentInventory.total_stock,
            new_stock: newStock,
            change: operation === 'add' ? quantity : -quantity,
          }
        };
      }
      
      return result;
    } catch (error) {
      console.error('Error updating brick stock:', error);
      return { success: false, error: error.message };
    }
  },

  // Set brick stock to specific amount
  setBrickStock: async (quantity, notes = 'Manual adjustment') => {
    try {
      const { data: currentInventory } = await inventoryService.getBrickInventory();
      
      const updates = {
        [`${DB_PATHS.INVENTORY.BRICKS}/total_stock`]: quantity,
        [`${DB_PATHS.INVENTORY.BRICKS}/last_updated`]: dbUtils.timestamp(),
      };

      // Log the adjustment
      const transactionKey = dbUtils.timestamp();
      updates[`${DB_PATHS.INVENTORY.BRICKS}/transactions/${transactionKey}`] = {
        operation: 'set',
        quantity,
        previous_stock: currentInventory.total_stock,
        new_stock: quantity,
        notes,
        timestamp: dbUtils.timestamp(),
      };

      const result = await dbUtils.batchUpdate(updates);
      
      if (result.success) {
        return {
          success: true,
          data: {
            previous_stock: currentInventory.total_stock,
            new_stock: quantity,
            change: quantity - currentInventory.total_stock,
          }
        };
      }
      
      return result;
    } catch (error) {
      console.error('Error setting brick stock:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * CEMENT INVENTORY OPERATIONS
   */

  // Get current cement inventory
  getCementInventory: async () => {
    try {
      const result = await dbUtils.readData(DB_PATHS.INVENTORY.CEMENT);
      return {
        success: true,
        data: result.data || { 
          total_bags: 0, 
          cost_per_bag: 25, 
          last_updated: Date.now() 
        }
      };
    } catch (error) {
      console.error('Error getting cement inventory:', error);
      return { success: false, error: error.message };
    }
  },

  // Update cement stock
  updateCementStock: async (bags, operation = 'add', costPerBag = null, notes = '') => {
    try {
      const { data: currentInventory } = await inventoryService.getCementInventory();
      
      let newStock;
      if (operation === 'add') {
        newStock = currentInventory.total_bags + bags;
      } else if (operation === 'subtract') {
        newStock = Math.max(0, currentInventory.total_bags - bags);
      } else {
        throw new Error('Invalid operation. Use "add" or "subtract"');
      }

      const updates = {
        [`${DB_PATHS.INVENTORY.CEMENT}/total_bags`]: newStock,
        [`${DB_PATHS.INVENTORY.CEMENT}/last_updated`]: dbUtils.timestamp(),
      };

      // Update cost per bag if provided
      if (costPerBag !== null) {
        updates[`${DB_PATHS.INVENTORY.CEMENT}/cost_per_bag`] = costPerBag;
      }

      // Log the transaction
      if (notes) {
        const transactionKey = dbUtils.timestamp();
        updates[`${DB_PATHS.INVENTORY.CEMENT}/transactions/${transactionKey}`] = {
          operation,
          bags,
          previous_stock: currentInventory.total_bags,
          new_stock: newStock,
          cost_per_bag: costPerBag || currentInventory.cost_per_bag,
          notes,
          timestamp: dbUtils.timestamp(),
        };
      }

      const result = await dbUtils.batchUpdate(updates);
      
      if (result.success) {
        return {
          success: true,
          data: {
            previous_stock: currentInventory.total_bags,
            new_stock: newStock,
            change: operation === 'add' ? bags : -bags,
          }
        };
      }
      
      return result;
    } catch (error) {
      console.error('Error updating cement stock:', error);
      return { success: false, error: error.message };
    }
  },

  // Purchase cement (add to stock with cost tracking)
  purchaseCement: async (bags, costPerBag, supplier = '', notes = '') => {
    try {
      // First update the stock
      const stockResult = await inventoryService.updateCementStock(
        bags, 
        'add', 
        costPerBag, 
        `Purchase from ${supplier || 'Supplier'}`
      );

      if (!stockResult.success) {
        return stockResult;
      }

      // Record the purchase transaction
      const purchaseData = {
        bags,
        cost_per_bag: costPerBag,
        total_cost: bags * costPerBag,
        supplier: supplier || 'Unknown Supplier',
        notes,
        date: dbUtils.dateString(),
        timestamp: dbUtils.timestamp(),
      };

      const purchaseResult = await dbUtils.pushData(
        `${DB_PATHS.CEMENT}/purchases`, 
        purchaseData
      );

      if (purchaseResult.success) {
        return {
          success: true,
          data: {
            purchase_id: purchaseResult.key,
            ...purchaseData,
            stock_update: stockResult.data,
          }
        };
      }

      return purchaseResult;
    } catch (error) {
      console.error('Error purchasing cement:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * COMBINED INVENTORY OPERATIONS
   */

  // Get complete inventory status
  getInventoryStatus: async () => {
    try {
      const [brickResult, cementResult, settingsResult] = await Promise.all([
        inventoryService.getBrickInventory(),
        inventoryService.getCementInventory(),
        dbUtils.readData(DB_PATHS.SETTINGS),
      ]);

      if (!brickResult.success || !cementResult.success) {
        throw new Error('Failed to fetch inventory data');
      }

      const settings = settingsResult.data || {};
      const brickData = brickResult.data;
      const cementData = cementResult.data;

      // Calculate inventory values
      const inventoryValue = calculateInventoryValue(
        brickData.total_stock,
        settings.default_brick_price || 2.5,
        cementData.total_bags,
        cementData.cost_per_bag
      );

      // Check stock alerts
      const lowStockAlerts = {
        bricks: isStockLow(
          brickData.total_stock, 
          settings.low_stock_alert?.bricks || 1000
        ),
        cement: isStockLow(
          cementData.total_bags, 
          settings.low_stock_alert?.cement || 10
        ),
      };

      return {
        success: true,
        data: {
          bricks: brickData,
          cement: cementData,
          inventory_value: inventoryValue,
          low_stock_alerts: lowStockAlerts,
          last_updated: Math.max(
            brickData.last_updated || 0,
            cementData.last_updated || 0
          ),
        }
      };
    } catch (error) {
      console.error('Error getting inventory status:', error);
      return { success: false, error: error.message };
    }
  },

  // Get inventory history/transactions
  getInventoryHistory: async (type = 'all', limit = 50) => {
    try {
      const paths = [];
      
      if (type === 'all' || type === 'bricks') {
        paths.push(`${DB_PATHS.INVENTORY.BRICKS}/transactions`);
      }
      
      if (type === 'all' || type === 'cement') {
        paths.push(`${DB_PATHS.INVENTORY.CEMENT}/transactions`);
        paths.push(`${DB_PATHS.CEMENT}/purchases`);
      }

      const results = await Promise.all(
        paths.map(path => dbUtils.readData(path))
      );

      const allTransactions = [];
      
      results.forEach((result, index) => {
        if (result.success && result.data) {
          const transactions = Object.entries(result.data).map(([key, data]) => ({
            id: key,
            type: paths[index].includes('bricks') ? 'brick' : 'cement',
            category: paths[index].includes('purchases') ? 'purchase' : 'adjustment',
            ...data,
          }));
          allTransactions.push(...transactions);
        }
      });

      // Sort by timestamp (most recent first) and limit results
      const sortedTransactions = allTransactions
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, limit);

      return {
        success: true,
        data: sortedTransactions,
      };
    } catch (error) {
      console.error('Error getting inventory history:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * REAL-TIME LISTENERS
   */

  // Listen to brick inventory changes
  listenToBrickInventory: (callback) => {
    return dbUtils.listenToData(DB_PATHS.INVENTORY.BRICKS, callback);
  },

  // Listen to cement inventory changes
  listenToCementInventory: (callback) => {
    return dbUtils.listenToData(DB_PATHS.INVENTORY.CEMENT, callback);
  },

  // Listen to complete inventory status
  listenToInventoryStatus: (callback) => {
    const unsubscribers = [];
    
    // Listen to both brick and cement inventory
    const brickUnsubscriber = inventoryService.listenToBrickInventory(() => {
      inventoryService.getInventoryStatus().then(callback);
    });
    
    const cementUnsubscriber = inventoryService.listenToCementInventory(() => {
      inventoryService.getInventoryStatus().then(callback);
    });

    unsubscribers.push(brickUnsubscriber, cementUnsubscriber);

    // Return function to unsubscribe from all listeners
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  },
};