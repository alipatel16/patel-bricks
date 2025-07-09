import { productionService } from './productionService';
import { salesService } from './salesService';
import { inventoryService } from './inventoryService';

/**
 * Reports Service - Handles all reporting and analytics operations
 */

export const reportsService = {
  /**
   * COMPREHENSIVE REPORTS
   */

  // Generate comprehensive business report
  generateBusinessReport: async (startDate, endDate, includeComparisons = true) => {
    try {
      const [
        productionResult,
        salesResult,
        inventoryResult,
        productionStatsResult,
        salesStatsResult,
      ] = await Promise.all([
        productionService.getProductionHistory(365, startDate, endDate),
        salesService.getSalesHistory(1000, startDate, endDate),
        inventoryService.getInventoryStatus(),
        productionService.getProductionStats('custom'),
        salesService.getSalesStats('custom'),
      ]);

      const production = productionResult.success ? productionResult.data : [];
      const sales = salesResult.success ? salesResult.data : [];
      const inventory = inventoryResult.success ? inventoryResult.data : null;
      const productionStats = productionStatsResult.success ? productionStatsResult.data : null;
      const salesStats = salesStatsResult.success ? salesStatsResult.data : null;

      // Calculate period summaries
      const periodSummary = {
        production: {
          totalQuantity: production.reduce((sum, p) => sum + p.quantity, 0),
          totalCementUsed: production.reduce((sum, p) => sum + p.cement_used, 0),
          averageEfficiency: production.length > 0 
            ? (production.reduce((sum, p) => sum + parseFloat(p.efficiency || 0), 0) / production.length).toFixed(2)
            : 0,
          productionDays: production.length,
        },
        sales: {
          totalQuantity: sales.reduce((sum, s) => sum + s.quantity, 0),
          totalRevenue: sales.reduce((sum, s) => sum + s.total_amount, 0),
          totalTransactions: sales.length,
          averageTransactionValue: sales.length > 0 
            ? (sales.reduce((sum, s) => sum + s.total_amount, 0) / sales.length).toFixed(2)
            : 0,
        },
        inventory: inventory ? {
          brickStock: inventory.bricks.total_stock,
          cementStock: inventory.cement.total_bags,
          totalValue: inventory.inventory_value.totalValue,
          lowStockAlerts: inventory.low_stock_alerts,
        } : null,
      };

      // Performance metrics
      const performanceMetrics = {
        productionEfficiency: periodSummary.production.averageEfficiency,
        stockTurnover: periodSummary.sales.totalQuantity / (periodSummary.inventory?.brickStock || 1),
        revenuePerBrick: periodSummary.sales.totalQuantity > 0 
          ? (periodSummary.sales.totalRevenue / periodSummary.sales.totalQuantity).toFixed(2)
          : 0,
        cementUtilization: periodSummary.production.totalCementUsed > 0 
          ? (periodSummary.production.totalQuantity / periodSummary.production.totalCementUsed).toFixed(2)
          : 0,
      };

      return {
        success: true,
        data: {
          period: { startDate, endDate },
          summary: periodSummary,
          performance: performanceMetrics,
          production: production,
          sales: sales,
          inventory: inventory,
          stats: {
            production: productionStats,
            sales: salesStats,
          },
        },
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Generate financial report
  generateFinancialReport: async (period = 'month') => {
    try {
      const [salesResult, productionResult, inventoryResult] = await Promise.all([
        salesService.getSalesStats(period),
        productionService.getProductionStats(period),
        inventoryService.getInventoryStatus(),
      ]);

      const sales = salesResult.success ? salesResult.data : null;
      const production = productionResult.success ? productionResult.data : null;
      const inventory = inventoryResult.success ? inventoryResult.data : null;

      // Calculate financial metrics
      const revenue = sales?.total_revenue || 0;
      const grossProfit = sales?.total_profit || 0;
      const inventoryValue = inventory ? parseFloat(inventory.inventory_value.totalValue) : 0;

      // Estimate costs (basic calculation)
      const cementCost = production?.total_cement_used * (inventory?.cement.cost_per_bag || 25) || 0;
      const estimatedCosts = cementCost;
      const netProfit = revenue - estimatedCosts;
      const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0;

      return {
        success: true,
        data: {
          period,
          revenue: {
            total: revenue,
            growth: 0, // Would need historical data for comparison
          },
          costs: {
            cement: cementCost,
            total: estimatedCosts,
          },
          profit: {
            gross: grossProfit,
            net: netProfit,
            margin: profitMargin,
          },
          inventory: {
            value: inventoryValue,
            turnover: sales?.total_quantity / (inventory?.bricks.total_stock || 1) || 0,
          },
          metrics: {
            revenuePerBrick: sales?.average_price_per_brick || 0,
            costPerBrick: production?.total_quantity > 0 ? (estimatedCosts / production.total_quantity).toFixed(2) : 0,
            profitPerBrick: production?.total_quantity > 0 ? (netProfit / production.total_quantity).toFixed(2) : 0,
          },
        },
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Generate inventory analysis report
  generateInventoryReport: async () => {
    try {
      const [inventoryResult, historyResult] = await Promise.all([
        inventoryService.getInventoryStatus(),
        inventoryService.getInventoryHistory('all', 100),
      ]);

      const inventory = inventoryResult.success ? inventoryResult.data : null;
      const history = historyResult.success ? historyResult.data : [];

      if (!inventory) {
        throw new Error('Unable to fetch inventory data');
      }

      // Analyze inventory movements
      const movements = {
        brickMovements: history.filter(h => h.type === 'brick'),
        cementMovements: history.filter(h => h.type === 'cement'),
        purchases: history.filter(h => h.category === 'purchase'),
      };

      // Calculate inventory metrics
      const metrics = {
        brickStockDays: 30, // Placeholder - would need consumption rate
        cementStockDays: 15, // Placeholder - would need usage rate
        stockValue: inventory.inventory_value,
        stockDistribution: {
          brickPercentage: (parseFloat(inventory.inventory_value.brickValue) / parseFloat(inventory.inventory_value.totalValue) * 100).toFixed(1),
          cementPercentage: (parseFloat(inventory.inventory_value.cementValue) / parseFloat(inventory.inventory_value.totalValue) * 100).toFixed(1),
        },
      };

      return {
        success: true,
        data: {
          current: inventory,
          movements: movements,
          metrics: metrics,
          alerts: inventory.low_stock_alerts,
          recommendations: reportsService.generateInventoryRecommendations(inventory, movements),
        },
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Generate production efficiency report
  generateProductionReport: async (period = 'month') => {
    try {
      const [productionResult, trendsResult, cementResult] = await Promise.all([
        productionService.getProductionStats(period),
        productionService.getProductionTrends(30),
        productionService.getCementUsage(period),
      ]);

      const production = productionResult.success ? productionResult.data : null;
      const trends = trendsResult.success ? trendsResult.data : null;
      const cement = cementResult.success ? cementResult.data : [];

      if (!production) {
        throw new Error('Unable to fetch production data');
      }

      // Calculate efficiency metrics
      const efficiency = {
        averageEfficiency: production.average_efficiency,
        bestEfficiency: trends?.efficiency_trend ? Math.max(...trends.efficiency_trend) : 0,
        worstEfficiency: trends?.efficiency_trend ? Math.min(...trends.efficiency_trend) : 0,
        consistencyScore: trends?.efficiency_trend ? 
          (100 - (Math.max(...trends.efficiency_trend) - Math.min(...trends.efficiency_trend))).toFixed(1) : 0,
      };

      // Production quality analysis (placeholder)
      const quality = {
        gradeA: 30,
        gradeB: 60,
        gradeC: 10,
      };

      return {
        success: true,
        data: {
          period,
          production: production,
          efficiency: efficiency,
          quality: quality,
          cement: cement,
          trends: trends,
          recommendations: reportsService.generateProductionRecommendations(production, efficiency),
        },
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Generate sales analysis report
  generateSalesReport: async (period = 'month') => {
    try {
      const [salesResult, trendsResult, customersResult] = await Promise.all([
        salesService.getSalesStats(period),
        salesService.getSalesTrends(30),
        salesService.getAllCustomers(),
      ]);

      const sales = salesResult.success ? salesResult.data : null;
      const trends = trendsResult.success ? trendsResult.data : null;
      const customers = customersResult.success ? customersResult.data : [];

      if (!sales) {
        throw new Error('Unable to fetch sales data');
      }

      // Customer analysis
      const customerAnalysis = {
        totalCustomers: customers.length,
        repeatCustomers: customers.filter(c => c.total_purchases > 1).length,
        topCustomers: customers
          .sort((a, b) => (b.total_purchases || 0) - (a.total_purchases || 0))
          .slice(0, 5),
      };

      // Sales performance
      const performance = {
        averageTransactionValue: sales.average_transaction_value,
        averagePricePerBrick: sales.average_price_per_brick,
        conversionRate: 100, // Placeholder
        salesGrowth: 0, // Would need historical data
      };

      return {
        success: true,
        data: {
          period,
          sales: sales,
          performance: performance,
          customers: customerAnalysis,
          trends: trends,
          recommendations: reportsService.generateSalesRecommendations(sales, customerAnalysis),
        },
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  /**
   * RECOMMENDATION ENGINES
   */

  // Generate inventory recommendations
  generateInventoryRecommendations: (inventory, movements) => {
    const recommendations = [];

    if (inventory.low_stock_alerts.bricks) {
      recommendations.push({
        type: 'urgent',
        category: 'inventory',
        title: 'Increase Brick Production',
        description: 'Brick stock is critically low. Increase daily production or adjust stock levels.',
        action: 'Record production or adjust inventory',
      });
    }

    if (inventory.low_stock_alerts.cement) {
      recommendations.push({
        type: 'urgent',
        category: 'inventory',
        title: 'Purchase Cement Immediately',
        description: 'Cement stock is critically low. Production may halt without immediate restocking.',
        action: 'Purchase cement from supplier',
      });
    }

    // Add more recommendations based on data analysis
    const totalValue = parseFloat(inventory.inventory_value.totalValue);
    if (totalValue > 50000) {
      recommendations.push({
        type: 'info',
        category: 'finance',
        title: 'High Inventory Value',
        description: 'Consider increasing sales efforts to improve cash flow.',
        action: 'Review pricing strategy or marketing',
      });
    }

    return recommendations;
  },

  // Generate production recommendations
  generateProductionRecommendations: (production, efficiency) => {
    const recommendations = [];

    if (production.average_efficiency < 15) {
      recommendations.push({
        type: 'warning',
        category: 'production',
        title: 'Low Production Efficiency',
        description: 'Current efficiency is below optimal. Review cement usage and production processes.',
        action: 'Optimize cement mixing ratios',
      });
    }

    if (production.production_days < 20) {
      recommendations.push({
        type: 'info',
        category: 'production',
        title: 'Increase Production Frequency',
        description: 'More consistent daily production could improve overall output.',
        action: 'Schedule regular production days',
      });
    }

    return recommendations;
  },

  // Generate sales recommendations
  generateSalesRecommendations: (sales, customerAnalysis) => {
    const recommendations = [];

    if (customerAnalysis.repeatCustomers / customerAnalysis.totalCustomers < 0.3) {
      recommendations.push({
        type: 'opportunity',
        category: 'sales',
        title: 'Improve Customer Retention',
        description: 'Low repeat customer rate. Consider loyalty programs or better customer service.',
        action: 'Implement customer retention strategy',
      });
    }

    if (sales.average_price_per_brick < 2.0) {
      recommendations.push({
        type: 'revenue',
        category: 'pricing',
        title: 'Review Pricing Strategy',
        description: 'Average selling price is low. Consider market analysis for price optimization.',
        action: 'Conduct market research',
      });
    }

    return recommendations;
  },

  /**
   * EXPORT FUNCTIONS
   */

  // Export report data to CSV format
  exportToCSV: (reportData, reportType) => {
    try {
      let csvContent = '';
      
      switch (reportType) {
        case 'sales':
          csvContent = reportsService.generateSalesCSV(reportData);
          break;
        case 'production':
          csvContent = reportsService.generateProductionCSV(reportData);
          break;
        case 'inventory':
          csvContent = reportsService.generateInventoryCSV(reportData);
          break;
        default:
          throw new Error('Unknown report type');
      }

      return {
        success: true,
        data: csvContent,
        filename: `${reportType}_report_₹{new Date().toISOString().split('T')[0]}.csv`,
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Generate sales CSV
  generateSalesCSV: (salesData) => {
    const headers = ['Date', 'Customer', 'Quantity', 'Price per Brick', 'Total Amount', 'Payment Method'];
    const rows = salesData.map(sale => [
      sale.date,
      sale.customer_name || 'Walk-in',
      sale.quantity,
      sale.price_per_brick,
      sale.total_amount,
      sale.payment_method,
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  },

  // Generate production CSV
  generateProductionCSV: (productionData) => {
    const headers = ['Date', 'Quantity', 'Cement Used', 'Efficiency', 'Shift', 'Quality'];
    const rows = productionData.map(prod => [
      prod.date,
      prod.quantity,
      prod.cement_used,
      prod.efficiency,
      prod.shift,
      prod.quality,
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  },

  // Generate inventory CSV
  generateInventoryCSV: (inventoryData) => {
    const headers = ['Type', 'Current Stock', 'Value', 'Last Updated'];
    const rows = [
      ['Bricks', inventoryData.current.bricks.total_stock, inventoryData.current.inventory_value.brickValue, new Date(inventoryData.current.bricks.last_updated).toLocaleDateString()],
      ['Cement', inventoryData.current.cement.total_bags, inventoryData.current.inventory_value.cementValue, new Date(inventoryData.current.cement.last_updated).toLocaleDateString()],
    ];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  },
};