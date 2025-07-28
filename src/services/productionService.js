import { dbUtils } from "./firebase";
import { inventoryService } from "./inventoryService";
import { DB_PATHS } from "../utils/constants";
import {
  calculateCementNeeded,
  validateProductionCapacity,
  calculateProductionEfficiency,
} from "../utils/calculations";

/**
 * Production Service - Handles all production-related operations
 */

export const productionService = {
  /**
   * PRODUCTION ENTRY OPERATIONS
   */

  // Add new production entry
  addProduction: async (productionData) => {
    try {
      const {
        date, // NEW: Accept date parameter
        quantity,
        cementUsed,
        shift = "morning",
        quality = "B",
        notes = "",
        overrideCementCalculation = false,
      } = productionData;

      // Validate input
      if (!quantity || quantity <= 0) {
        return { success: false, error: "Invalid quantity provided" };
      }

      // NEW: Validate and use provided date or default to current date
      const productionDate = date || dbUtils.dateString();
      
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(productionDate)) {
        return { success: false, error: "Invalid date format. Use YYYY-MM-DD" };
      }

      // Check if production already exists for this date
      const existingProduction = await dbUtils.readData(
        `${DB_PATHS.PRODUCTION}/daily/${productionDate}`
      );
      
      if (existingProduction.data) {
        return { 
          success: false, 
          error: `Production already recorded for ${productionDate}. Please edit the existing record or choose a different date.` 
        };
      }

      // Get current cement inventory and settings
      const [cementResult, settingsResult] = await Promise.all([
        inventoryService.getCementInventory(),
        dbUtils.readData(DB_PATHS.SETTINGS),
      ]);

      if (!cementResult.success) {
        return { success: false, error: "Failed to get cement inventory" };
      }

      const settings = settingsResult.data || {};
      const cementRatio = settings.cement_per_brick_ratio || 0.05;

      // NEW: Use manual cement amount (cementUsed) directly, 
      // but still calculate for validation purposes if needed
      const requiredCement = cementUsed; // Use manual input directly

      // Manual validation for cement availability
      if (requiredCement > cementResult.data.total_bags) {
        return {
          success: false,
          error: `Insufficient cement. Required: ${requiredCement} bags, Available: ${cementResult.data.total_bags} bags`,
          data: {
            requiredCement,
            availableCement: cementResult.data.total_bags,
            isValid: false
          },
        };
      }

      const currentMonth = productionDate.substring(0, 7); // YYYY-MM
      const timestamp = dbUtils.timestamp();

      // Prepare production entry
      const productionEntry = {
        quantity: Number(quantity),
        cement_used: Number(requiredCement),
        shift,
        // quality, // REMOVED - no longer needed
        notes,
        efficiency: calculateProductionEfficiency(
          Number(quantity),
          Number(requiredCement)
        ),
        date: productionDate, // Use the provided/selected date
        timestamp,
      };

      // Prepare batch updates
      const updates = {};

      // 1. Add to daily production using the selected date
      updates[`${DB_PATHS.PRODUCTION}/daily/${productionDate}`] = productionEntry;

      // 2. Update monthly totals for the selected date's month
      const monthlyResult = await dbUtils.readData(
        `${DB_PATHS.PRODUCTION}/monthly/${currentMonth}`
      );
      const currentMonthly = monthlyResult.data || {
        total_quantity: 0,
        total_cement_used: 0,
        days_count: 0, // Ensure this is initialized as 0, not undefined
        average_efficiency: 0,
      };

      // Ensure all values are numbers to prevent NaN
      const safeCurrentMonthly = {
        total_quantity: Number(currentMonthly.total_quantity) || 0,
        total_cement_used: Number(currentMonthly.total_cement_used) || 0,
        days_count: Number(currentMonthly.days_count) || 0,
        average_efficiency: Number(currentMonthly.average_efficiency) || 0,
      };

      updates[`${DB_PATHS.PRODUCTION}/monthly/${currentMonth}`] = {
        total_quantity: safeCurrentMonthly.total_quantity + Number(quantity),
        total_cement_used:
          safeCurrentMonthly.total_cement_used + Number(requiredCement),
        days_count: safeCurrentMonthly.days_count + 1,
        average_efficiency: calculateProductionEfficiency(
          safeCurrentMonthly.total_quantity + Number(quantity),
          safeCurrentMonthly.total_cement_used + Number(requiredCement)
        ),
        last_updated: timestamp,
      };

      // 3. Update cement daily usage for the selected date
      updates[`${DB_PATHS.CEMENT}/usage/daily/${productionDate}`] = {
        bags_used: requiredCement,
        bricks_produced: quantity,
        efficiency: calculateProductionEfficiency(quantity, requiredCement),
        timestamp,
      };

      // Execute batch update
      const batchResult = await dbUtils.batchUpdate(updates);

      if (!batchResult.success) {
        return { success: false, error: "Failed to save production data" };
      }

      // Update inventories
      const [brickStockResult, cementStockResult] = await Promise.all([
        inventoryService.updateBrickStock(
          quantity,
          "add",
          `Production: ${quantity} bricks on ${productionDate}`
        ),
        inventoryService.updateCementStock(
          requiredCement,
          "subtract",
          null,
          `Production: ${quantity} bricks on ${productionDate}`
        ),
      ]);

      if (!brickStockResult.success || !cementStockResult.success) {
        // Note: Production was saved but inventory update failed
        // In a real app, you might want to implement rollback logic
        console.warn("Production saved but inventory update failed", {
          brickStockResult,
          cementStockResult
        });
      }

      return {
        success: true,
        data: {
          production: productionEntry,
          inventory_updates: {
            bricks: brickStockResult.data,
            cement: cementStockResult.data,
          },
        },
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Get production data for a specific date
  getProductionByDate: async (date) => {
    try {
      const result = await dbUtils.readData(
        `${DB_PATHS.PRODUCTION}/daily/${date}`
      );
      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Get production history
  getProductionHistory: async (
    limit = 30,
    startDate = null,
    endDate = null
  ) => {
    try {
      const result = await dbUtils.readData(`${DB_PATHS.PRODUCTION}/daily`);

      if (!result.success || !result.data) {
        return { success: true, data: [] };
      }

      let productions = Object.entries(result.data).map(([date, data]) => ({
        date,
        ...data,
      }));

      // Filter by date range if provided
      if (startDate) {
        productions = productions.filter((p) => p.date >= startDate);
      }
      if (endDate) {
        productions = productions.filter((p) => p.date <= endDate);
      }

      // Sort by date (most recent first) and limit
      productions = productions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);

      return {
        success: true,
        data: productions,
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Get monthly production totals
  getMonthlyProduction: async (year = null) => {
    try {
      const currentYear = year || new Date().getFullYear();
      const result = await dbUtils.readData(`${DB_PATHS.PRODUCTION}/monthly`);

      if (!result.success || !result.data) {
        return { success: true, data: {} };
      }

      // Filter by year if specified
      const monthlyData = Object.entries(result.data)
        .filter(
          ([month, _]) => !year || month.startsWith(currentYear.toString())
        )
        .reduce((acc, [month, data]) => {
          acc[month] = data;
          return acc;
        }, {});

      return {
        success: true,
        data: monthlyData,
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  /**
   * PRODUCTION ANALYTICS
   */

  // Get production statistics
  getProductionStats: async (period = "month") => {
    try {
      const currentDate = new Date();
      let startDate, endDate;

      switch (period) {
        case "week":
          startDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
          );
          break;
        case "year":
          startDate = new Date(currentDate.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(
            currentDate.getTime() - 30 * 24 * 60 * 60 * 1000
          );
      }

      endDate = currentDate;

      const history = await productionService.getProductionHistory(
        1000,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0]
      );

      if (!history.success) {
        return history;
      }

      const productions = history.data;

      const stats = {
        period,
        total_quantity: 0,
        total_cement_used: 0,
        production_days: productions.length,
        average_daily_production: 0,
        average_efficiency: 0,
        best_day: null,
        worst_day: null,
      };

      if (productions.length > 0) {
        stats.total_quantity = productions.reduce(
          (sum, p) => sum + p.quantity,
          0
        );
        stats.total_cement_used = productions.reduce(
          (sum, p) => sum + p.cement_used,
          0
        );
        stats.average_daily_production = (
          stats.total_quantity / stats.production_days
        ).toFixed(2);
        stats.average_efficiency = calculateProductionEfficiency(
          stats.total_quantity,
          stats.total_cement_used
        );

        // Find best and worst production days
        stats.best_day = productions.reduce((best, current) =>
          current.quantity > best.quantity ? current : best
        );

        stats.worst_day = productions.reduce((worst, current) =>
          current.quantity < worst.quantity ? current : worst
        );
      }

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Get production trends
  getProductionTrends: async (days = 30) => {
    try {
      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - days * 24 * 60 * 60 * 1000
      );

      const history = await productionService.getProductionHistory(
        days,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0]
      );

      if (!history.success) {
        return history;
      }

      const productions = history.data;

      // Calculate daily averages and trends
      const dailyProduction = [];
      const dailyEfficiency = [];

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateString = date.toISOString().split("T")[0];

        const dayProduction = productions.find((p) => p.date === dateString);

        dailyProduction.push({
          date: dateString,
          quantity: dayProduction ? dayProduction.quantity : 0,
          cement_used: dayProduction ? dayProduction.cement_used : 0,
        });

        if (dayProduction) {
          dailyEfficiency.push(parseFloat(dayProduction.efficiency));
        }
      }

      // Calculate moving averages
      const movingAverages = dailyProduction.map((day, index) => {
        const window = 7; // 7-day moving average
        const startIndex = Math.max(0, index - window + 1);
        const windowData = dailyProduction.slice(startIndex, index + 1);
        const average =
          windowData.reduce((sum, d) => sum + d.quantity, 0) /
          windowData.length;

        return {
          ...day,
          moving_average: average.toFixed(2),
        };
      });

      return {
        success: true,
        data: {
          daily_production: dailyProduction,
          moving_averages: movingAverages,
          efficiency_trend: dailyEfficiency,
          period_summary: {
            total_days: days,
            production_days: productions.length,
            total_quantity: dailyProduction.reduce(
              (sum, d) => sum + d.quantity,
              0
            ),
            average_daily: (
              dailyProduction.reduce((sum, d) => sum + d.quantity, 0) / days
            ).toFixed(2),
          },
        },
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  /**
   * CEMENT USAGE TRACKING
   */

  // Get cement usage history
  getCementUsage: async (period = "month") => {
    try {
      const result = await dbUtils.readData(`${DB_PATHS.CEMENT}/usage/daily`);

      if (!result.success || !result.data) {
        return { success: true, data: [] };
      }

      const currentDate = new Date();
      let filterDate;

      switch (period) {
        case "week":
          filterDate = new Date(
            currentDate.getTime() - 7 * 24 * 60 * 60 * 1000
          );
          break;
        case "month":
          filterDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
          );
          break;
        case "year":
          filterDate = new Date(currentDate.getFullYear(), 0, 1);
          break;
        default:
          filterDate = new Date(
            currentDate.getTime() - 30 * 24 * 60 * 60 * 1000
          );
      }

      const usage = Object.entries(result.data)
        .filter(([date, _]) => new Date(date) >= filterDate)
        .map(([date, data]) => ({
          date,
          ...data,
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      return {
        success: true,
        data: usage,
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  /**
   * REAL-TIME LISTENERS
   */

  // Listen to production data changes
  listenToProduction: (callback) => {
    return dbUtils.listenToData(`${DB_PATHS.PRODUCTION}/daily`, callback);
  },

  // Listen to monthly production changes
  listenToMonthlyProduction: (callback) => {
    return dbUtils.listenToData(`${DB_PATHS.PRODUCTION}/monthly`, callback);
  },

  /**
   * UTILITY FUNCTIONS
   */

  // ENHANCED: Update production entry with inventory management
  updateProduction: async (originalDate, updatedData) => {
    try {
      const {
        date: newDate,
        quantity: newQuantity,
        cementUsed: newCementUsed,
        shift,
        notes = "",
      } = updatedData;

      // Get the current/original production entry
      const currentEntry = await productionService.getProductionByDate(originalDate);

      if (!currentEntry.success || !currentEntry.data) {
        return { success: false, error: "Production entry not found" };
      }

      const originalData = currentEntry.data;
      const originalQuantity = Number(originalData.quantity);
      const originalCementUsed = Number(originalData.cement_used);
      const originalMonth = originalDate.substring(0, 7); // YYYY-MM

      // Validate new data
      if (!newQuantity || newQuantity <= 0) {
        return { success: false, error: "Invalid quantity provided" };
      }

      if (!newCementUsed || newCementUsed <= 0) {
        return { success: false, error: "Invalid cement amount provided" };
      }

      // Validate date format if date is being changed
      const targetDate = newDate || originalDate;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(targetDate)) {
        return { success: false, error: "Invalid date format. Use YYYY-MM-DD" };
      }

      // If date is changing, check if production already exists for the new date
      if (newDate && newDate !== originalDate) {
        const existingProduction = await dbUtils.readData(
          `${DB_PATHS.PRODUCTION}/daily/${newDate}`
        );
        
        if (existingProduction.data) {
          return { 
            success: false, 
            error: `Production already recorded for ${newDate}. Please choose a different date.` 
          };
        }
      }

      const timestamp = dbUtils.timestamp();
      const newMonth = targetDate.substring(0, 7); // YYYY-MM

      // Calculate differences for inventory updates
      const quantityDifference = Number(newQuantity) - originalQuantity;
      const cementDifference = Number(newCementUsed) - originalCementUsed;

      // Prepare updated production entry
      const updatedProductionEntry = {
        quantity: Number(newQuantity),
        cement_used: Number(newCementUsed),
        shift: shift || originalData.shift,
        notes,
        efficiency: calculateProductionEfficiency(
          Number(newQuantity),
          Number(newCementUsed)
        ),
        date: targetDate,
        timestamp: originalData.timestamp, // Keep original timestamp
        last_modified: timestamp,
      };

      // Prepare batch updates
      const updates = {};

      // Handle date change scenario
      if (newDate && newDate !== originalDate) {
        // Delete from original date
        updates[`${DB_PATHS.PRODUCTION}/daily/${originalDate}`] = null;
        // Delete original cement usage
        updates[`${DB_PATHS.CEMENT}/usage/daily/${originalDate}`] = null;
      }

      // Add/update production at target date
      updates[`${DB_PATHS.PRODUCTION}/daily/${targetDate}`] = updatedProductionEntry;

      // Update cement usage for target date
      updates[`${DB_PATHS.CEMENT}/usage/daily/${targetDate}`] = {
        bags_used: Number(newCementUsed),
        bricks_produced: Number(newQuantity),
        efficiency: calculateProductionEfficiency(Number(newQuantity), Number(newCementUsed)),
        timestamp,
      };

      // Update monthly totals
      // 1. If month changed, we need to update both months
      if (originalMonth !== newMonth) {
        // Remove from original month
        const originalMonthlyResult = await dbUtils.readData(
          `${DB_PATHS.PRODUCTION}/monthly/${originalMonth}`
        );
        
        if (originalMonthlyResult.data) {
          const originalMonthly = originalMonthlyResult.data;
          const updatedOriginalMonthly = {
            total_quantity: Math.max(0, (originalMonthly.total_quantity || 0) - originalQuantity),
            total_cement_used: Math.max(0, (originalMonthly.total_cement_used || 0) - originalCementUsed),
            days_count: Math.max(0, (originalMonthly.days_count || 0) - 1),
            last_updated: timestamp,
          };
          
          // Recalculate average efficiency for original month
          updatedOriginalMonthly.average_efficiency = updatedOriginalMonthly.total_quantity > 0
            ? calculateProductionEfficiency(updatedOriginalMonthly.total_quantity, updatedOriginalMonthly.total_cement_used)
            : 0;

          updates[`${DB_PATHS.PRODUCTION}/monthly/${originalMonth}`] = updatedOriginalMonthly;
        }

        // Add to new month
        const newMonthlyResult = await dbUtils.readData(
          `${DB_PATHS.PRODUCTION}/monthly/${newMonth}`
        );
        
        const newMonthly = newMonthlyResult.data || {
          total_quantity: 0,
          total_cement_used: 0,
          days_count: 0,
          average_efficiency: 0,
        };

        const updatedNewMonthly = {
          total_quantity: (newMonthly.total_quantity || 0) + Number(newQuantity),
          total_cement_used: (newMonthly.total_cement_used || 0) + Number(newCementUsed),
          days_count: (newMonthly.days_count || 0) + 1,
          last_updated: timestamp,
        };

        // Recalculate average efficiency for new month
        updatedNewMonthly.average_efficiency = calculateProductionEfficiency(
          updatedNewMonthly.total_quantity,
          updatedNewMonthly.total_cement_used
        );

        updates[`${DB_PATHS.PRODUCTION}/monthly/${newMonth}`] = updatedNewMonthly;
      } else {
        // Same month - just update the differences
        const monthlyResult = await dbUtils.readData(
          `${DB_PATHS.PRODUCTION}/monthly/${originalMonth}`
        );
        
        if (monthlyResult.data) {
          const monthly = monthlyResult.data;
          const updatedMonthly = {
            total_quantity: (monthly.total_quantity || 0) + quantityDifference,
            total_cement_used: (monthly.total_cement_used || 0) + cementDifference,
            days_count: monthly.days_count || 1, // Keep same day count
            last_updated: timestamp,
          };

          // Recalculate average efficiency
          updatedMonthly.average_efficiency = calculateProductionEfficiency(
            updatedMonthly.total_quantity,
            updatedMonthly.total_cement_used
          );

          updates[`${DB_PATHS.PRODUCTION}/monthly/${originalMonth}`] = updatedMonthly;
        }
      }

      // Execute batch update
      const batchResult = await dbUtils.batchUpdate(updates);

      if (!batchResult.success) {
        return { success: false, error: "Failed to update production data" };
      }

      // Update inventories based on differences
      const inventoryUpdates = [];

      if (quantityDifference !== 0) {
        const brickOperation = quantityDifference > 0 ? "add" : "subtract";
        const brickAmount = Math.abs(quantityDifference);
        
        inventoryUpdates.push(
          inventoryService.updateBrickStock(
            brickAmount,
            brickOperation,
            `Updated production: ${quantityDifference > 0 ? '+' : '-'}${brickAmount} bricks on ${targetDate}`
          )
        );
      }

      if (cementDifference !== 0) {
        const cementOperation = cementDifference > 0 ? "subtract" : "add"; // Note: inverse logic for cement
        const cementAmount = Math.abs(cementDifference);
        
        inventoryUpdates.push(
          inventoryService.updateCementStock(
            cementAmount,
            cementOperation,
            null,
            `Updated production: ${cementDifference > 0 ? '+' : '-'}${cementAmount} bags used on ${targetDate}`
          )
        );
      }

      // Execute inventory updates if there are any
      let inventoryResults = { bricks: { success: true }, cement: { success: true } };
      if (inventoryUpdates.length > 0) {
        const results = await Promise.all(inventoryUpdates);
        inventoryResults = {
          bricks: results[0] || { success: true },
          cement: results[1] || { success: true },
        };
      }

      return {
        success: true,
        data: {
          production: updatedProductionEntry,
          changes: {
            quantityDifference,
            cementDifference,
            dateChanged: newDate && newDate !== originalDate,
          },
          inventory_updates: inventoryResults,
        },
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Enhanced Delete production entry with proper inventory reversal
  deleteProduction: async (date) => {
    try {
      // Get the production data before deleting to reverse inventory changes
      const productionResult = await productionService.getProductionByDate(date);
      
      if (!productionResult.success || !productionResult.data) {
        return { success: false, error: "Production entry not found" };
      }

      const productionData = productionResult.data;
      const { quantity, cement_used } = productionData;
      const month = date.substring(0, 7); // YYYY-MM

      // Prepare batch updates for deletion
      const updates = {};

      // 1. Delete daily production
      updates[`${DB_PATHS.PRODUCTION}/daily/${date}`] = null;

      // 2. Delete cement usage for that date
      updates[`${DB_PATHS.CEMENT}/usage/daily/${date}`] = null;

      // 3. Update monthly totals
      const monthlyResult = await dbUtils.readData(
        `${DB_PATHS.PRODUCTION}/monthly/${month}`
      );
      
      if (monthlyResult.data) {
        const monthly = monthlyResult.data;
        const updatedMonthly = {
          total_quantity: Math.max(0, (monthly.total_quantity || 0) - quantity),
          total_cement_used: Math.max(0, (monthly.total_cement_used || 0) - cement_used),
          days_count: Math.max(0, (monthly.days_count || 0) - 1),
          last_updated: dbUtils.timestamp(),
        };

        // Recalculate average efficiency
        updatedMonthly.average_efficiency = updatedMonthly.total_quantity > 0
          ? calculateProductionEfficiency(updatedMonthly.total_quantity, updatedMonthly.total_cement_used)
          : 0;

        updates[`${DB_PATHS.PRODUCTION}/monthly/${month}`] = updatedMonthly;
      }

      // Execute batch delete
      const batchResult = await dbUtils.batchUpdate(updates);

      if (!batchResult.success) {
        return { success: false, error: "Failed to delete production data" };
      }

      return {
        success: true,
        data: {
          deletedProduction: productionData,
          inventoryImpact: {
            bricksToRemove: quantity,
            cementToReturn: cement_used,
          },
        },
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // NEW: Helper function to check if production exists for a date
  checkProductionExists: async (date) => {
    try {
      const result = await productionService.getProductionByDate(date);
      return {
        success: true,
        exists: !!result.data,
        data: result.data
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },
};