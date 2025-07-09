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

      // Calculate cement needed if not overridden
      const requiredCement = overrideCementCalculation
        ? cementUsed
        : calculateCementNeeded(quantity, cementRatio);

      // Validate production capacity
      const capacity = validateProductionCapacity(
        quantity,
        cementResult.data.total_bags,
        cementRatio
      );

      if (!capacity.isValid) {
        return {
          success: false,
          error: `Insufficient cement. Required: ${capacity.requiredCement} bags, Available: ${capacity.availableCement} bags`,
          data: capacity,
        };
      }

      const currentDate = dbUtils.dateString();
      const currentMonth = currentDate.substring(0, 7); // YYYY-MM
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
        date: currentDate,
        timestamp,
      };

      // Prepare batch updates
      const updates = {};

      // 1. Add to daily production
      updates[`${DB_PATHS.PRODUCTION}/daily/${currentDate}`] = productionEntry;

      // 2. Update monthly totals
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

      // 3. Update cement daily usage
      updates[`${DB_PATHS.CEMENT}/usage/daily/${currentDate}`] = {
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
          `Production: ${quantity} bricks`
        ),
        inventoryService.updateCementStock(
          requiredCement,
          "subtract",
          null,
          `Production: ${quantity} bricks`
        ),
      ]);

      if (!brickStockResult.success || !cementStockResult.success) {
        // Note: Production was saved but inventory update failed
        // In a real app, you might want to implement rollback logic
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

  // Update production entry (for corrections)
  updateProduction: async (date, updatedData) => {
    try {
      const currentEntry = await productionService.getProductionByDate(date);

      if (!currentEntry.success || !currentEntry.data) {
        return { success: false, error: "Production entry not found" };
      }

      const currentData = currentEntry.data;
      const updates = {
        ...currentData,
        ...updatedData,
        last_modified: dbUtils.timestamp(),
      };

      // Recalculate efficiency if quantity or cement changed
      if (updatedData.quantity || updatedData.cement_used) {
        updates.efficiency = calculateProductionEfficiency(
          updates.quantity,
          updates.cement_used
        );
      }

      const result = await dbUtils.writeData(
        `${DB_PATHS.PRODUCTION}/daily/${date}`,
        updates
      );

      return result;
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Delete production entry
  deleteProduction: async (date) => {
    try {
      // Note: In a real app, you might want to reverse inventory changes
      const result = await dbUtils.deleteData(
        `${DB_PATHS.PRODUCTION}/daily/${date}`
      );
      return result;
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },
};
