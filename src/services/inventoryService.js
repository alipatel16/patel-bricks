// Enhanced Inventory Service with Real-time Sync
// services/inventoryService.js - Updated version

import { dbUtils } from "./firebase";
import { DB_PATHS } from "../utils/constants";

/**
 * Inventory Service - Handles all inventory-related operations with real-time sync
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
        data: result.data || { total_stock: 0, last_updated: Date.now() },
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Update brick stock (add or subtract) with comprehensive sync
  updateBrickStock: async (quantity, operation = "add", notes = "") => {
    try {
      const { data: currentInventory } =
        await inventoryService.getBrickInventory();

      let newStock;
      if (operation === "add") {
        newStock = currentInventory.total_stock + quantity;
      } else if (operation === "subtract") {
        newStock = Math.max(0, currentInventory.total_stock - quantity);
      } else {
        throw new Error('Invalid operation. Use "add" or "subtract"');
      }

      const timestamp = dbUtils.timestamp();
      const updates = {};

      // 1. Update main inventory path
      updates[`${DB_PATHS.INVENTORY.BRICKS}/total_stock`] = newStock;
      updates[`${DB_PATHS.INVENTORY.BRICKS}/last_updated`] = timestamp;

      // 2. Update legacy path if it exists (for backward compatibility)
      updates[`${DB_PATHS.BRICKS}/total_stock`] = newStock;
      updates[`${DB_PATHS.BRICKS}/last_updated`] = timestamp;

      // 3. Log the transaction in inventory history
      const transactionKey = `adj_${timestamp}`;
      updates[`${DB_PATHS.INVENTORY.BRICKS}/history/${transactionKey}`] = {
        type: "adjustment",
        operation,
        quantity,
        previous_stock: currentInventory.total_stock,
        new_stock: newStock,
        notes,
        date: dbUtils.dateString(),
        timestamp,
        reference: `INVENTORY_${operation.toUpperCase()}_${transactionKey}`,
      };

      // 4. Update inventory transaction log for tracking
      updates[`${DB_PATHS.INVENTORY.BRICKS}/transactions/${transactionKey}`] = {
        operation,
        quantity,
        previous_stock: currentInventory.total_stock,
        new_stock: newStock,
        notes,
        timestamp,
      };

      // 5. Update global inventory summary for dashboard
      updates[`inventory_summary/bricks`] = {
        total_stock: newStock,
        last_updated: timestamp,
        last_operation: operation,
        last_change: operation === "add" ? quantity : -quantity,
      };

      const result = await dbUtils.batchUpdate(updates);

      if (result.success) {
        // Trigger inventory change event for real-time sync
        inventoryService.triggerInventoryUpdate("bricks", {
          previous_stock: currentInventory.total_stock,
          new_stock: newStock,
          change: operation === "add" ? quantity : -quantity,
          operation,
          timestamp,
        });

        return {
          success: true,
          data: {
            previous_stock: currentInventory.total_stock,
            new_stock: newStock,
            change: operation === "add" ? quantity : -quantity,
          },
          message: `Brick stock ${
            operation === "add" ? "increased" : "decreased"
          } by ${quantity}. New total: ${newStock}`,
        };
      }

      return result;
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Set brick stock to specific amount with comprehensive sync
  setBrickStock: async (quantity, notes = "Manual adjustment") => {
    try {
      const { data: currentInventory } =
        await inventoryService.getBrickInventory();
      const change = quantity - currentInventory.total_stock;

      const timestamp = dbUtils.timestamp();
      const updates = {};

      // 1. Update main inventory path
      updates[`${DB_PATHS.INVENTORY.BRICKS}/total_stock`] = quantity;
      updates[`${DB_PATHS.INVENTORY.BRICKS}/last_updated`] = timestamp;

      // 2. Update legacy path if it exists (for backward compatibility)
      updates[`${DB_PATHS.BRICKS}/total_stock`] = quantity;
      updates[`${DB_PATHS.BRICKS}/last_updated`] = timestamp;

      // 3. Log the transaction
      const transactionKey = `set_${timestamp}`;
      updates[`${DB_PATHS.INVENTORY.BRICKS}/history/${transactionKey}`] = {
        type: "adjustment",
        operation: "set",
        quantity,
        previous_stock: currentInventory.total_stock,
        new_stock: quantity,
        change,
        notes,
        date: dbUtils.dateString(),
        timestamp,
        reference: `INVENTORY_SET_${transactionKey}`,
      };

      // 4. Update inventory transaction log
      updates[`${DB_PATHS.INVENTORY.BRICKS}/transactions/${transactionKey}`] = {
        operation: "set",
        quantity,
        previous_stock: currentInventory.total_stock,
        new_stock: quantity,
        notes,
        timestamp,
      };

      // 5. Update global inventory summary
      updates[`inventory_summary/bricks`] = {
        total_stock: quantity,
        last_updated: timestamp,
        last_operation: "set",
        last_change: change,
      };

      const result = await dbUtils.batchUpdate(updates);

      if (result.success) {
        // Trigger inventory change event for real-time sync
        inventoryService.triggerInventoryUpdate("bricks", {
          previous_stock: currentInventory.total_stock,
          new_stock: quantity,
          change,
          operation: "set",
          timestamp,
        });

        return {
          success: true,
          data: {
            previous_stock: currentInventory.total_stock,
            new_stock: quantity,
            change,
          },
          message: `Brick stock set to ${quantity}. Change: ${
            change > 0 ? "+" : ""
          }${change}`,
        };
      }

      return result;
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  /**
   * REAL-TIME SYNC FUNCTIONS
   */

  // Event listeners for inventory changes
  inventoryListeners: new Set(),

  // Add listener for inventory changes
  addInventoryListener: (callback) => {
    inventoryService.inventoryListeners.add(callback);
    return () => inventoryService.inventoryListeners.delete(callback);
  },

  // Trigger inventory update event
  triggerInventoryUpdate: (type, data) => {
    const updateEvent = {
      type,
      data,
      timestamp: Date.now(),
    };

    // Notify all listeners
    inventoryService.inventoryListeners.forEach((callback) => {
      try {
        callback(updateEvent);
      } catch (error) {
        
      }
    });
  },

  // Listen to inventory changes in Firebase
  listenToInventoryChanges: (callback) => {
    const unsubscribeBricks = dbUtils.listenToData(
      `${DB_PATHS.INVENTORY.BRICKS}/total_stock`,
      (newStock) => {
        if (newStock !== null) {
          callback({
            type: "bricks",
            data: { total_stock: newStock },
            timestamp: Date.now(),
          });
        }
      }
    );

    const unsubscribeCement = dbUtils.listenToData(
      `${DB_PATHS.INVENTORY.CEMENT}/total_bags`,
      (newBags) => {
        if (newBags !== null) {
          callback({
            type: "cement",
            data: { total_bags: newBags },
            timestamp: Date.now(),
          });
        }
      }
    );

    // Return cleanup function
    return () => {
      unsubscribeBricks();
      unsubscribeCement();
    };
  },

  /**
   * CEMENT INVENTORY OPERATIONS (Enhanced)
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
          last_updated: Date.now(),
        },
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Update cement stock with sync
  updateCementStock: async (
    bags,
    operation = "add",
    costPerBag = null,
    notes = ""
  ) => {
    try {
      const { data: currentInventory } =
        await inventoryService.getCementInventory();

      let newStock;
      if (operation === "add") {
        newStock = currentInventory.total_bags + bags;
      } else if (operation === "subtract") {
        newStock = Math.max(0, currentInventory.total_bags - bags);
      } else {
        throw new Error('Invalid operation. Use "add" or "subtract"');
      }

      const timestamp = dbUtils.timestamp();
      const updates = {};

      // Update cement inventory
      updates[`${DB_PATHS.INVENTORY.CEMENT}/total_bags`] = newStock;
      updates[`${DB_PATHS.INVENTORY.CEMENT}/last_updated`] = timestamp;

      if (costPerBag !== null) {
        updates[`${DB_PATHS.INVENTORY.CEMENT}/cost_per_bag`] = costPerBag;
      }

      // Log transaction
      const transactionKey = `cement_${timestamp}`;
      updates[`${DB_PATHS.INVENTORY.CEMENT}/transactions/${transactionKey}`] = {
        operation,
        bags,
        previous_stock: currentInventory.total_bags,
        new_stock: newStock,
        cost_per_bag: costPerBag || currentInventory.cost_per_bag,
        notes,
        timestamp,
      };

      const result = await dbUtils.batchUpdate(updates);

      if (result.success) {
        // Trigger cement inventory update
        inventoryService.triggerInventoryUpdate("cement", {
          previous_stock: currentInventory.total_bags,
          new_stock: newStock,
          change: operation === "add" ? bags : -bags,
          operation,
          timestamp,
        });

        return {
          success: true,
          data: {
            previous_stock: currentInventory.total_bags,
            new_stock: newStock,
            change: operation === "add" ? bags : -bags,
            cost_per_bag: costPerBag || currentInventory.cost_per_bag,
          },
        };
      }

      return result;
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // ENHANCED: Purchase cement with optional date support
  purchaseCement: async (bags, costPerBag, supplier = "", notes = "", date = null) => {
    try {
      // Use provided date or current date
      const purchaseDate = date || dbUtils.dateString();
      
      // First update the stock
      const stockResult = await inventoryService.updateCementStock(
        bags,
        "add",
        costPerBag,
        `Purchase from ${supplier || "Supplier"} on ${purchaseDate}`
      );

      if (!stockResult.success) {
        return stockResult;
      }

      // Record the purchase transaction with date
      const purchaseData = {
        bags,
        cost_per_bag: costPerBag,
        total_cost: bags * costPerBag,
        supplier: supplier || "Unknown Supplier",
        notes,
        date: purchaseDate, // Store the purchase date
        timestamp: dbUtils.timestamp(),
      };

      // ENHANCED: Store in both legacy path and new date-wise path
      const purchaseKey = `purchase_${purchaseData.timestamp}`;
      const updates = {};

      // Store in legacy purchases path
      updates[`${DB_PATHS.CEMENT}/purchases/${purchaseKey}`] = purchaseData;

      // NEW: Store in date-wise purchases for better querying
      updates[`${DB_PATHS.CEMENT}/purchases_by_date/${purchaseDate}/${purchaseKey}`] = purchaseData;

      const purchaseResult = await dbUtils.batchUpdate(updates);

      if (purchaseResult.success) {
        return {
          success: true,
          data: {
            purchase_id: purchaseKey,
            ...purchaseData,
            stock_update: stockResult.data,
          },
        };
      }

      return purchaseResult;
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // NEW: Get cement purchase history
  getCementPurchaseHistory: async (limit = 100) => {
    try {
      const result = await dbUtils.readData(`${DB_PATHS.CEMENT}/purchases`);

      if (!result.success || !result.data) {
        return { success: true, data: [] };
      }

      // Convert to array and sort by timestamp (most recent first)
      let purchases = Object.entries(result.data).map(([key, data]) => ({
        id: key,
        ...data,
      }));

      // Sort by timestamp or date (most recent first)
      purchases = purchases
        .sort((a, b) => {
          const aTime = new Date(a.date || a.timestamp).getTime();
          const bTime = new Date(b.date || b.timestamp).getTime();
          return bTime - aTime;
        })
        .slice(0, limit);

      return {
        success: true,
        data: purchases,
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // NEW: Get cement purchases by date range
  getCementPurchasesByDateRange: async (startDate, endDate) => {
    try {
      const result = await dbUtils.readData(`${DB_PATHS.CEMENT}/purchases_by_date`);

      if (!result.success || !result.data) {
        return { success: true, data: [] };
      }

      let purchases = [];

      // Filter purchases by date range
      Object.entries(result.data).forEach(([date, dayPurchases]) => {
        if (date >= startDate && date <= endDate) {
          Object.entries(dayPurchases).forEach(([key, data]) => {
            purchases.push({
              id: key,
              ...data,
            });
          });
        }
      });

      // Sort by date (most recent first)
      purchases = purchases.sort((a, b) => {
        return new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp);
      });

      return {
        success: true,
        data: purchases,
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  /**
   * UTILITY FUNCTIONS
   */

  // Get complete inventory status
  getInventoryStatus: async () => {
    try {
      const [brickResult, cementResult] = await Promise.all([
        inventoryService.getBrickInventory(),
        inventoryService.getCementInventory(),
      ]);

      if (brickResult.success && cementResult.success) {
        const bricks = brickResult.data;
        const cement = cementResult.data;

        // Calculate inventory value
        const brickPrice = 6.15; // Default price per brick
        const brickValue = (bricks.total_stock || 0) * brickPrice;
        const cementValue =
          (cement.total_bags || 0) * (cement.cost_per_bag || 25);
        const totalValue = brickValue + cementValue;

        // Check for low stock alerts
        const low_stock_alerts = {
          bricks: (bricks.total_stock || 0) <= 1000, // LOW_STOCK_ALERTS.BRICKS
          cement: (cement.total_bags || 0) <= 10, // LOW_STOCK_ALERTS.CEMENT
        };

        const inventory_value = {
          brickValue: brickValue.toFixed(2),
          cementValue: cementValue.toFixed(2),
          totalValue: totalValue.toFixed(2),
        };

        return {
          success: true,
          data: {
            bricks,
            cement,
            inventory_value,
            low_stock_alerts,
            last_updated: Math.max(
              bricks.last_updated || 0,
              cement.last_updated || 0
            ),
          },
        };
      }

      return { success: false, error: "Failed to load inventory status" };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Listen to brick inventory changes
  listenToBrickInventory: (callback) => {
    try {
      return dbUtils.listenToData(DB_PATHS.INVENTORY.BRICKS, callback);
    } catch (error) {
      
      return () => {}; // Return empty cleanup function
    }
  },

  // Listen to cement inventory changes
  listenToCementInventory: (callback) => {
    try {
      return dbUtils.listenToData(DB_PATHS.INVENTORY.CEMENT, callback);
    } catch (error) {
      
      return () => {}; // Return empty cleanup function
    }
  },

  // Listen to complete inventory status - THIS IS THE MISSING FUNCTION
  listenToInventoryStatus: (callback) => {
    try {
      const unsubscribers = [];

      // Listen to both brick and cement inventory
      const brickUnsubscriber = inventoryService.listenToBrickInventory(() => {
        // When brick inventory changes, get complete status and call callback
        inventoryService
          .getInventoryStatus()
          .then(callback)
          .catch((error) => {
            
            callback({ success: false, error: error.message });
          });
      });

      const cementUnsubscriber = inventoryService.listenToCementInventory(
        () => {
          // When cement inventory changes, get complete status and call callback
          inventoryService
            .getInventoryStatus()
            .then(callback)
            .catch((error) => {
              
              callback({ success: false, error: error.message });
            });
        }
      );

      unsubscribers.push(brickUnsubscriber, cementUnsubscriber);

      // Return function to unsubscribe from all listeners
      return () => {
        unsubscribers.forEach((unsubscribe) => {
          try {
            if (typeof unsubscribe === "function") {
              unsubscribe();
            }
          } catch (error) {
            
          }
        });
      };
    } catch (error) {
      
      return () => {}; // Return empty cleanup function
    }
  },

  /**
   * Get all manual inventory adjustments for brick stock calculation
   */
  getInventoryAdjustments: async () => {
    try {
      

      // Get adjustments from both history and transactions paths
      const [historyResult, transactionsResult] = await Promise.all([
        dbUtils.readData(`${DB_PATHS.INVENTORY.BRICKS}/history`),
        dbUtils.readData(`${DB_PATHS.INVENTORY.BRICKS}/transactions`),
      ]);

      const adjustments = [];

      // Process history data (contains detailed adjustment records)
      if (historyResult.success && historyResult.data) {
        Object.entries(historyResult.data).forEach(([key, adjustment]) => {
          // Only include manual adjustments, not production/sales
          if (adjustment.type === "adjustment") {
            adjustments.push({
              id: key,
              operation: adjustment.operation,
              quantity: adjustment.quantity,
              change: adjustment.change,
              previous_stock: adjustment.previous_stock,
              new_stock: adjustment.new_stock,
              notes: adjustment.notes,
              date: adjustment.date,
              timestamp: adjustment.timestamp,
              reference: adjustment.reference,
              source: "history",
            });
          }
        });
      }

      // If history is empty, fall back to transactions data
      if (
        adjustments.length === 0 &&
        transactionsResult.success &&
        transactionsResult.data
      ) {
        Object.entries(transactionsResult.data).forEach(
          ([key, transaction]) => {
            adjustments.push({
              id: key,
              operation: transaction.operation,
              quantity: transaction.quantity,
              change: transaction.new_stock - transaction.previous_stock,
              previous_stock: transaction.previous_stock,
              new_stock: transaction.new_stock,
              notes: transaction.notes,
              timestamp: transaction.timestamp,
              source: "transactions",
            });
          }
        );
      }

      // Sort by timestamp (oldest first) for accurate calculation
      adjustments.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      

      return {
        success: true,
        data: adjustments,
      };
    } catch (error) {
      
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  },

  // Get inventory history/transactions
  getInventoryHistory: async (type = "all", limit = 50) => {
    try {
      const paths = [];

      if (type === "all" || type === "bricks") {
        paths.push(`${DB_PATHS.INVENTORY.BRICKS}/transactions`);
      }

      if (type === "all" || type === "cement") {
        paths.push(`${DB_PATHS.INVENTORY.CEMENT}/transactions`);
        paths.push(`${DB_PATHS.CEMENT}/purchases`);
      }

      const results = await Promise.all(
        paths.map((path) => dbUtils.readData(path))
      );

      const allTransactions = [];

      results.forEach((result, index) => {
        if (result.success && result.data) {
          const transactions = Object.entries(result.data).map(
            ([key, data]) => ({
              id: key,
              type: paths[index].includes("bricks") ? "brick" : "cement",
              category: paths[index].includes("purchases")
                ? "purchase"
                : "adjustment",
              ...data,
            })
          );
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
      
      return { success: false, error: error.message };
    }
  },

  // Simple force refresh for immediate sync
  forceRefreshInventory: async () => {
    try {
      // Read current stock from database
      const brickResult = await dbUtils.readData(DB_PATHS.INVENTORY.BRICKS);
      const cementResult = await dbUtils.readData(DB_PATHS.INVENTORY.CEMENT);

      // Trigger a custom event to notify all components
      const inventoryUpdateEvent = new CustomEvent("inventoryUpdated", {
        detail: {
          bricks: brickResult.data || { total_stock: 0 },
          cement: cementResult.data || { total_bags: 0 },
          timestamp: Date.now(),
        },
      });

      window.dispatchEvent(inventoryUpdateEvent);

      return {
        success: true,
        data: {
          bricks: brickResult.data,
          cement: cementResult.data,
        },
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Force sync all inventory data across the app
  forceSyncInventory: async () => {
    try {
      const status = await inventoryService.getInventoryStatus();

      if (status.success) {
        // Trigger update events for all inventory types
        inventoryService.triggerInventoryUpdate("bricks", {
          total_stock: status.data.bricks.total_stock,
          operation: "sync",
          timestamp: Date.now(),
        });

        inventoryService.triggerInventoryUpdate("cement", {
          total_bags: status.data.cement.total_bags,
          operation: "sync",
          timestamp: Date.now(),
        });

        return { success: true, message: "Inventory synced successfully" };
      }

      return status;
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },
};