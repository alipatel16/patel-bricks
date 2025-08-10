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
      } catch (error) {}
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
  purchaseCement: async (
    bags,
    costPerBag,
    supplier = "",
    notes = "",
    date = null
  ) => {
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
      updates[
        `${DB_PATHS.CEMENT}/purchases_by_date/${purchaseDate}/${purchaseKey}`
      ] = purchaseData;

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
  getCementPurchaseHistory: async (limit = null) => {
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
      const result = await dbUtils.readData(
        `${DB_PATHS.CEMENT}/purchases_by_date`
      );

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
        return (
          new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp)
        );
      });

      return {
        success: true,
        data: purchases,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // NEW: Update cement purchase record
  updateCementPurchase: async (purchaseId, updateData) => {
    try {
      const { date, bags, cost_per_bag, total_cost, supplier, notes } =
        updateData;

      // Get current purchase data to find original date
      const currentPurchaseResult = await dbUtils.readData(
        `${DB_PATHS.CEMENT}/purchases/${purchaseId}`
      );

      if (!currentPurchaseResult.success || !currentPurchaseResult.data) {
        return { success: false, error: "Purchase record not found" };
      }

      const currentPurchase = currentPurchaseResult.data;
      const originalDate = currentPurchase.date || dbUtils.dateString();

      // Prepare updated purchase data
      const updatedPurchaseData = {
        ...currentPurchase,
        date,
        bags,
        cost_per_bag,
        total_cost,
        supplier,
        notes,
        last_modified: dbUtils.timestamp(),
      };

      const updates = {};

      // Update in legacy purchases path
      updates[`${DB_PATHS.CEMENT}/purchases/${purchaseId}`] =
        updatedPurchaseData;

      // Handle date-wise storage
      if (date !== originalDate) {
        // If date changed, move from old date to new date
        updates[
          `${DB_PATHS.CEMENT}/purchases_by_date/${originalDate}/${purchaseId}`
        ] = null; // Remove from old date
        updates[`${DB_PATHS.CEMENT}/purchases_by_date/${date}/${purchaseId}`] =
          updatedPurchaseData; // Add to new date
      } else {
        // Same date, just update
        updates[`${DB_PATHS.CEMENT}/purchases_by_date/${date}/${purchaseId}`] =
          updatedPurchaseData;
      }

      const result = await dbUtils.batchUpdate(updates);

      if (result.success) {
        return {
          success: true,
          data: updatedPurchaseData,
          message: "Purchase updated successfully",
        };
      }

      return result;
    } catch (error) {
      console.error("Error updating cement purchase:", error);
      return { success: false, error: error.message };
    }
  },

  // NEW: Delete cement purchase record
  deleteCementPurchase: async (purchaseId) => {
    try {
      // Get current purchase data to find the date
      const currentPurchaseResult = await dbUtils.readData(
        `${DB_PATHS.CEMENT}/purchases/${purchaseId}`
      );

      if (!currentPurchaseResult.success || !currentPurchaseResult.data) {
        return { success: false, error: "Purchase record not found" };
      }

      const currentPurchase = currentPurchaseResult.data;
      const purchaseDate = currentPurchase.date || dbUtils.dateString();

      const updates = {};

      // Delete from legacy purchases path
      updates[`${DB_PATHS.CEMENT}/purchases/${purchaseId}`] = null;

      // Delete from date-wise purchases path
      updates[
        `${DB_PATHS.CEMENT}/purchases_by_date/${purchaseDate}/${purchaseId}`
      ] = null;

      const result = await dbUtils.batchUpdate(updates);

      if (result.success) {
        return {
          success: true,
          data: {
            deleted_purchase: currentPurchase,
            purchase_id: purchaseId,
          },
          message: "Purchase deleted successfully",
        };
      }

      return result;
    } catch (error) {
      console.error("Error deleting cement purchase:", error);
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
          } catch (error) {}
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
  getInventoryHistory: async (type = "all", limit = null) => {
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
  /**
   * MATERIAL INVENTORY OPERATIONS (NEW)
   */

  // Purchase material with Firebase storage
  purchaseMaterial: async (materialData) => {
    try {
      const {
        materialType,
        quantity,
        purchaseRate,
        totalCost,
        unit,
        supplier,
        notes,
        date,
      } = materialData;

      // Use provided date or current date
      const purchaseDate = date || dbUtils.dateString();
      const timestamp = dbUtils.timestamp();

      // Create purchase record
      const purchaseData = {
        material_type: materialType,
        quantity: parseFloat(quantity),
        purchase_rate: parseFloat(purchaseRate),
        total_cost: parseFloat(totalCost),
        unit,
        supplier: supplier || "Unknown Supplier",
        notes: notes || "",
        date: purchaseDate,
        timestamp,
      };

      // Generate purchase key
      const purchaseKey = `${materialType}_${timestamp}`;
      const updates = {};

      // Store in main purchases path
      updates[`${DB_PATHS.MATERIAL_PURCHASES}/${purchaseKey}`] = purchaseData;

      // Store in date-wise purchases for better querying
      updates[
        `${DB_PATHS.MATERIAL_PURCHASES}_by_date/${purchaseDate}/${purchaseKey}`
      ] = purchaseData;

      // Store in material-specific purchases
      updates[
        `${DB_PATHS.MATERIAL_PURCHASES}_by_type/${materialType}/${purchaseKey}`
      ] = purchaseData;

      // Update material stock
      const materialPath = DB_PATHS.MATERIALS[materialType.toUpperCase()];
      if (materialPath) {
        // Get current stock
        const currentStockResult = await dbUtils.readData(
          `${materialPath}/inventory`
        );
        const currentStock = currentStockResult.data || {
          total_quantity: 0,
          unit,
          last_updated: 0,
        };

        const newStock =
          (currentStock.total_quantity || 0) + parseFloat(quantity);

        // Update material inventory
        updates[`${materialPath}/inventory/total_quantity`] = newStock;
        updates[`${materialPath}/inventory/unit`] = unit;
        updates[`${materialPath}/inventory/last_updated`] = timestamp;
        updates[`${materialPath}/inventory/last_purchase_rate`] =
          parseFloat(purchaseRate);

        // Log the material transaction
        const transactionKey = `purchase_${timestamp}`;
        updates[`${materialPath}/transactions/${transactionKey}`] = {
          operation: "add",
          quantity: parseFloat(quantity),
          previous_stock: currentStock.total_quantity || 0,
          new_stock: newStock,
          purchase_rate: parseFloat(purchaseRate),
          total_cost: parseFloat(totalCost),
          supplier,
          notes: notes || `Material purchase: ${quantity} ${unit}`,
          timestamp,
          reference: `PURCHASE_${purchaseKey}`,
        };
      }

      // Execute batch update
      const result = await dbUtils.batchUpdate(updates);

      if (result.success) {
        // Trigger inventory update event
        inventoryService.triggerInventoryUpdate("material", {
          material_type: materialType,
          operation: "purchase",
          quantity: parseFloat(quantity),
          unit,
          timestamp,
        });

        return {
          success: true,
          data: {
            purchase_id: purchaseKey,
            ...purchaseData,
          },
          message: `${materialType} purchase recorded successfully`,
        };
      }

      return result;
    } catch (error) {
      console.error("Error purchasing material:", error);
      return { success: false, error: error.message };
    }
  },

  // Get material purchase history
  getMaterialPurchaseHistory: async (limit = null) => {
    try {
      const result = await dbUtils.readData(DB_PATHS.MATERIAL_PURCHASES);

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
      console.error("Error loading material purchase history:", error);
      return { success: false, error: error.message };
    }
  },

  // Update material purchase record
  updateMaterialPurchase: async (purchaseId, updateData) => {
    try {
      const {
        date,
        material_type,
        quantity,
        purchase_rate,
        total_cost,
        supplier,
        notes,
      } = updateData;

      // Get current purchase data
      const currentPurchaseResult = await dbUtils.readData(
        `${DB_PATHS.MATERIAL_PURCHASES}/${purchaseId}`
      );

      if (!currentPurchaseResult.success || !currentPurchaseResult.data) {
        return { success: false, error: "Purchase record not found" };
      }

      const currentPurchase = currentPurchaseResult.data;
      const originalDate = currentPurchase.date || dbUtils.dateString();
      const originalMaterialType = currentPurchase.material_type;
      const originalQuantity = currentPurchase.quantity;

      // Prepare updated purchase data
      const updatedPurchaseData = {
        ...currentPurchase,
        date,
        material_type,
        quantity: parseFloat(quantity),
        purchase_rate: parseFloat(purchase_rate),
        total_cost: parseFloat(total_cost),
        supplier,
        notes,
        last_modified: dbUtils.timestamp(),
      };

      const updates = {};

      // Update in main purchases path
      updates[`${DB_PATHS.MATERIAL_PURCHASES}/${purchaseId}`] =
        updatedPurchaseData;

      // Handle date-wise storage
      if (date !== originalDate) {
        // If date changed, move from old date to new date
        updates[
          `${DB_PATHS.MATERIAL_PURCHASES}_by_date/${originalDate}/${purchaseId}`
        ] = null;
        updates[
          `${DB_PATHS.MATERIAL_PURCHASES}_by_date/${date}/${purchaseId}`
        ] = updatedPurchaseData;
      } else {
        // Same date, just update
        updates[
          `${DB_PATHS.MATERIAL_PURCHASES}_by_date/${date}/${purchaseId}`
        ] = updatedPurchaseData;
      }

      // Handle material type changes
      if (material_type !== originalMaterialType) {
        // Remove from old material type
        updates[
          `${DB_PATHS.MATERIAL_PURCHASES}_by_type/${originalMaterialType}/${purchaseId}`
        ] = null;
        // Add to new material type
        updates[
          `${DB_PATHS.MATERIAL_PURCHASES}_by_type/${material_type}/${purchaseId}`
        ] = updatedPurchaseData;
      } else {
        // Same material type, just update
        updates[
          `${DB_PATHS.MATERIAL_PURCHASES}_by_type/${material_type}/${purchaseId}`
        ] = updatedPurchaseData;
      }

      const result = await dbUtils.batchUpdate(updates);

      if (result.success) {
        return {
          success: true,
          data: updatedPurchaseData,
          message: "Material purchase updated successfully",
        };
      }

      return result;
    } catch (error) {
      console.error("Error updating material purchase:", error);
      return { success: false, error: error.message };
    }
  },

  // Delete material purchase record
  deleteMaterialPurchase: async (purchaseId) => {
    try {
      // Get current purchase data
      const currentPurchaseResult = await dbUtils.readData(
        `${DB_PATHS.MATERIAL_PURCHASES}/${purchaseId}`
      );

      if (!currentPurchaseResult.success || !currentPurchaseResult.data) {
        return { success: false, error: "Purchase record not found" };
      }

      const currentPurchase = currentPurchaseResult.data;
      const purchaseDate = currentPurchase.date || dbUtils.dateString();
      const materialType = currentPurchase.material_type;

      const updates = {};

      // Delete from main purchases path
      updates[`${DB_PATHS.MATERIAL_PURCHASES}/${purchaseId}`] = null;

      // Delete from date-wise purchases path
      updates[
        `${DB_PATHS.MATERIAL_PURCHASES}_by_date/${purchaseDate}/${purchaseId}`
      ] = null;

      // Delete from material-specific purchases path
      updates[
        `${DB_PATHS.MATERIAL_PURCHASES}_by_type/${materialType}/${purchaseId}`
      ] = null;

      const result = await dbUtils.batchUpdate(updates);

      if (result.success) {
        return {
          success: true,
          data: {
            deleted_purchase: currentPurchase,
            purchase_id: purchaseId,
          },
          message: "Material purchase deleted successfully",
        };
      }

      return result;
    } catch (error) {
      console.error("Error deleting material purchase:", error);
      return { success: false, error: error.message };
    }
  },

  // Update material stock (for adjustments)
  updateMaterialStock: async (
    materialType,
    quantity,
    operation,
    notes = ""
  ) => {
    try {
      const materialPath = DB_PATHS.MATERIALS[materialType.toUpperCase()];
      if (!materialPath) {
        return { success: false, error: "Invalid material type" };
      }

      // Get current stock
      const currentStockResult = await dbUtils.readData(
        `${materialPath}/inventory`
      );
      const currentStock = currentStockResult.data || {
        total_quantity: 0,
        last_updated: 0,
      };

      let newStock;
      if (operation === "add") {
        newStock = (currentStock.total_quantity || 0) + parseFloat(quantity);
      } else if (operation === "subtract") {
        newStock = Math.max(
          0,
          (currentStock.total_quantity || 0) - parseFloat(quantity)
        );
      } else {
        throw new Error('Invalid operation. Use "add" or "subtract"');
      }

      const timestamp = dbUtils.timestamp();
      const updates = {};

      // Update material inventory
      updates[`${materialPath}/inventory/total_quantity`] = newStock;
      updates[`${materialPath}/inventory/last_updated`] = timestamp;

      // Log the transaction
      const transactionKey = `adj_${timestamp}`;
      updates[`${materialPath}/transactions/${transactionKey}`] = {
        operation,
        quantity: parseFloat(quantity),
        previous_stock: currentStock.total_quantity || 0,
        new_stock: newStock,
        notes,
        timestamp,
        reference: `ADJUSTMENT_${transactionKey}`,
      };

      const result = await dbUtils.batchUpdate(updates);

      if (result.success) {
        // Trigger inventory update event
        inventoryService.triggerInventoryUpdate("material", {
          material_type: materialType,
          operation: "adjustment",
          change:
            operation === "add" ? parseFloat(quantity) : -parseFloat(quantity),
          new_stock: newStock,
          timestamp,
        });

        return {
          success: true,
          data: {
            material_type: materialType,
            previous_stock: currentStock.total_quantity || 0,
            new_stock: newStock,
            change:
              operation === "add"
                ? parseFloat(quantity)
                : -parseFloat(quantity),
          },
          message: `${materialType} stock ${
            operation === "add" ? "increased" : "decreased"
          } by ${quantity}`,
        };
      }

      return result;
    } catch (error) {
      console.error("Error updating material stock:", error);
      return { success: false, error: error.message };
    }
  },

  // Get material stock levels
  getMaterialStock: async (materialType = null) => {
    try {
      if (materialType) {
        // Get specific material stock
        const materialPath = DB_PATHS.MATERIALS[materialType.toUpperCase()];
        if (!materialPath) {
          return { success: false, error: "Invalid material type" };
        }

        const result = await dbUtils.readData(`${materialPath}/inventory`);
        return {
          success: true,
          data: result.data || {
            total_quantity: 0,
            unit: "tons",
            last_updated: 0,
          },
        };
      } else {
        // Get all material stocks
        const materialTypes = ["sand", "fly_ash", "dust", "lime", "chemical"];
        const stocks = {};

        for (const type of materialTypes) {
          const materialPath = DB_PATHS.MATERIALS[type.toUpperCase()];
          if (materialPath) {
            const result = await dbUtils.readData(`${materialPath}/inventory`);
            stocks[type] = result.data || {
              total_quantity: 0,
              unit: type === "chemical" ? "litres" : "tons",
              last_updated: 0,
            };
          }
        }

        return {
          success: true,
          data: stocks,
        };
      }
    } catch (error) {
      console.error("Error fetching material stock:", error);
      return { success: false, error: error.message };
    }
  },

  // Get material purchases by date range
  getMaterialPurchasesByDateRange: async (startDate, endDate) => {
    try {
      const result = await dbUtils.readData(
        `${DB_PATHS.MATERIAL_PURCHASES}_by_date`
      );

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
        return (
          new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp)
        );
      });

      return {
        success: true,
        data: purchases,
      };
    } catch (error) {
      console.error("Error getting material purchases by date range:", error);
      return { success: false, error: error.message };
    }
  },

  // Listen to material inventory changes
  listenToMaterialInventory: (callback) => {
    try {
      const unsubscribers = [];
      const materialTypes = ["sand", "fly_ash", "dust", "lime", "chemical"];

      materialTypes.forEach((type) => {
        const materialPath = DB_PATHS.MATERIALS[type.toUpperCase()];
        if (materialPath) {
          const unsubscriber = dbUtils.listenToData(
            `${materialPath}/inventory`,
            (data) => {
              if (data !== null) {
                callback({
                  type: "material",
                  material_type: type,
                  data: data,
                  timestamp: Date.now(),
                });
              }
            }
          );
          unsubscribers.push(unsubscriber);
        }
      });

      // Return cleanup function
      return () => {
        unsubscribers.forEach((unsubscribe) => {
          try {
            if (typeof unsubscribe === "function") {
              unsubscribe();
            }
          } catch (error) {
            console.error(
              "Error unsubscribing from material inventory:",
              error
            );
          }
        });
      };
    } catch (error) {
      console.error("Error setting up material inventory listeners:", error);
      return () => {}; // Return empty cleanup function
    }
  },
};
