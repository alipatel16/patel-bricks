// services/supplierService.js
import { dbUtils } from './firebase';
import { DB_PATHS, SUPPLIER_STATUS, VALIDATION_RULES } from '../utils/constants';

export const supplierService = {
  /**
   * SUPPLIER MANAGEMENT
   */

  // Create new supplier
  createSupplier: async (supplierData) => {
    try {
      const currentDate = dbUtils.dateString();
      const timestamp = dbUtils.timestamp();

      // Generate supplier ID (using timestamp + first 3 chars of name)
      const supplierId = `SUP_${timestamp}_${supplierData.name.substring(0, 3).toUpperCase()}`;

      // REMOVED: GSTIN validation as requested
      // Allow any GSTIN format for flexibility

      // Prepare supplier entry
      const supplierEntry = {
        // Basic Information
        id: supplierId,
        name: supplierData.name,
        gstin: supplierData.gstin || '',
        type: supplierData.type || '',
        
        // Contact Information (properly structured)
        contact: {
          phone: supplierData.phone || '',
        },
        
        // Address (properly structured)
        address: {
          line1: supplierData.address || '',
        },
        
        // Business Statistics
        total_purchases: 0,
        total_amount: 0,
        last_purchase: null,
        
        // Status
        status: SUPPLIER_STATUS.ACTIVE,
        
        // Timestamps
        created_date: currentDate,
        updated_date: currentDate,
        created_timestamp: timestamp,
        updated_timestamp: timestamp,
        
        // Notes
        notes: supplierData.notes || ''
      };

      // Check if supplier with same GSTIN already exists (if GSTIN provided)
      if (supplierData.gstin) {
        const allSuppliersResult = await dbUtils.readData(DB_PATHS.SUPPLIERS);
        if (allSuppliersResult.success && allSuppliersResult.data) {
          const existingSupplier = Object.values(allSuppliersResult.data).find(
            supplier => supplier.gstin === supplierData.gstin
          );
          if (existingSupplier) {
            return {
              success: false,
              error: 'Supplier with this GSTIN already exists'
            };
          }
        }
      }

      // Save supplier
      const result = await dbUtils.writeData(`${DB_PATHS.SUPPLIERS}/${supplierId}`, supplierEntry);
      
      if (result.success) {
        return {
          success: true,
          data: supplierEntry,
          message: 'Supplier created successfully'
        };
      }

      return result;
    } catch (error) {
      console.error('Error creating supplier:', error);
      return { success: false, error: error.message };
    }
  },

  // FIXED: Update existing supplier with proper nested object handling
  updateSupplier: async (supplierId, updateData) => {
    try {
      const timestamp = dbUtils.timestamp();
      const currentDate = dbUtils.dateString();

      // Get existing supplier
      const existingResult = await dbUtils.readData(`${DB_PATHS.SUPPLIERS}/${supplierId}`);
      if (!existingResult.success || !existingResult.data) {
        return {
          success: false,
          error: 'Supplier not found'
        };
      }

      const existingSupplier = existingResult.data;

      // REMOVED: GSTIN validation as requested
      // Allow any GSTIN format for flexibility

      // Check for duplicate GSTIN (if GSTIN is being changed)
      if (updateData.gstin && updateData.gstin !== existingSupplier.gstin) {
        const allSuppliersResult = await dbUtils.readData(DB_PATHS.SUPPLIERS);
        if (allSuppliersResult.success && allSuppliersResult.data) {
          const duplicateSupplier = Object.values(allSuppliersResult.data).find(
            supplier => supplier.gstin === updateData.gstin && supplier.id !== supplierId
          );
          if (duplicateSupplier) {
            return {
              success: false,
              error: 'Another supplier with this GSTIN already exists'
            };
          }
        }
      }

      // FIXED: Properly handle nested objects during update
      const updatedSupplier = {
        ...existingSupplier,
        // Update basic fields
        name: updateData.name || existingSupplier.name,
        gstin: updateData.gstin || existingSupplier.gstin,
        type: updateData.type || existingSupplier.type,
        notes: updateData.notes || existingSupplier.notes,
        
        // FIXED: Properly update nested contact object
        contact: {
          ...existingSupplier.contact,
          phone: updateData.phone || existingSupplier.contact?.phone || '',
        },
        
        // FIXED: Properly update nested address object
        address: {
          ...existingSupplier.address,
          line1: updateData.address || existingSupplier.address?.line1 || '',
        },
        
        // Update timestamps
        updated_date: currentDate,
        updated_timestamp: timestamp,
      };

      // Save updated supplier
      const result = await dbUtils.writeData(`${DB_PATHS.SUPPLIERS}/${supplierId}`, updatedSupplier);
      
      if (result.success) {
        return {
          success: true,
          data: updatedSupplier,
          message: 'Supplier updated successfully'
        };
      }

      return result;
    } catch (error) {
      console.error('Error updating supplier:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all suppliers
  getAllSuppliers: async () => {
    try {
      const result = await dbUtils.readData(DB_PATHS.SUPPLIERS);
      
      if (result.success && result.data) {
        // Convert object to array and sort by name
        const suppliersArray = Object.entries(result.data).map(([id, supplier]) => ({
          ...supplier,
          id: supplier.id || id
        }));

        // Sort by name
        suppliersArray.sort((a, b) => a.name.localeCompare(b.name));

        return {
          success: true,
          data: suppliersArray
        };
      }

      return {
        success: true,
        data: []
      };
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return { success: false, error: error.message };
    }
  },

  // Get supplier by ID
  getSupplierById: async (supplierId) => {
    try {
      const result = await dbUtils.readData(`${DB_PATHS.SUPPLIERS}/${supplierId}`);
      return result;
    } catch (error) {
      console.error('Error fetching supplier:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete supplier
  deleteSupplier: async (supplierId) => {
    try {
      // Check if supplier has any purchases
      const purchasesResult = await supplierService.getPurchasesBySupplier(supplierId);
      if (purchasesResult.success && purchasesResult.data && purchasesResult.data.length > 0) {
        return {
          success: false,
          error: 'Cannot delete supplier with existing purchase records'
        };
      }

      const result = await dbUtils.deleteData(`${DB_PATHS.SUPPLIERS}/${supplierId}`);
      
      if (result.success) {
        return {
          success: true,
          message: 'Supplier deleted successfully'
        };
      }

      return result;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return { success: false, error: error.message };
    }
  },

  // Search suppliers by name or GSTIN
  searchSuppliers: async (searchTerm) => {
    try {
      const allSuppliersResult = await supplierService.getAllSuppliers();
      
      if (!allSuppliersResult.success) {
        return allSuppliersResult;
      }

      const suppliers = allSuppliersResult.data || [];
      const searchLower = searchTerm.toLowerCase();

      const filteredSuppliers = suppliers.filter(supplier => 
        supplier.name.toLowerCase().includes(searchLower) ||
        supplier.gstin.toLowerCase().includes(searchLower) ||
        supplier.type.toLowerCase().includes(searchLower)
      );

      return {
        success: true,
        data: filteredSuppliers
      };
    } catch (error) {
      console.error('Error searching suppliers:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * PURCHASE MANAGEMENT
   */

  // Create new purchase
  createPurchase: async (purchaseData) => {
    try {
      const currentDate = dbUtils.dateString();
      const timestamp = dbUtils.timestamp();

      // Generate purchase ID
      const purchaseId = `PUR_${timestamp}`;

      // Validate supplier exists
      const supplierResult = await supplierService.getSupplierById(purchaseData.supplierId);
      if (!supplierResult.success || !supplierResult.data) {
        return {
          success: false,
          error: 'Supplier not found'
        };
      }

      const supplier = supplierResult.data;

      // Calculate totals
      const cgstAmount = (purchaseData.amount * (purchaseData.cgst || 0)) / 100;
      const sgstAmount = (purchaseData.amount * (purchaseData.sgst || 0)) / 100;
      const igstAmount = (purchaseData.amount * (purchaseData.igst || 0)) / 100;
      const totalGst = cgstAmount + sgstAmount + igstAmount;
      const totalAmount = purchaseData.amount + totalGst;

      // Prepare purchase entry
      const purchaseEntry = {
        id: purchaseId,
        
        // Purchase Details
        date: purchaseData.date || currentDate,
        bill_number: purchaseData.billNumber || '',
        
        // Supplier Information
        supplier_id: purchaseData.supplierId,
        supplier_name: supplier.name,
        supplier_gstin: supplier.gstin,
        
        // Amount Details
        amount: parseFloat(purchaseData.amount) || 0,
        cgst: parseFloat(purchaseData.cgst) || 0,
        sgst: parseFloat(purchaseData.sgst) || 0,
        igst: parseFloat(purchaseData.igst) || 0,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: igstAmount,
        total_gst: totalGst,
        total_amount: totalAmount,
        
        // Additional Details
        description: purchaseData.description || '',
        notes: purchaseData.notes || '',
        
        // Timestamps
        created_date: currentDate,
        created_timestamp: timestamp,
        
        // Status
        status: 'recorded'
      };

      // Save purchase
      const result = await dbUtils.writeData(`${DB_PATHS.PURCHASES}/${purchaseId}`, purchaseEntry);
      
      if (result.success) {
        // Update supplier statistics
        await supplierService.updateSupplierStats(purchaseData.supplierId, totalAmount);

        return {
          success: true,
          data: purchaseEntry,
          message: 'Purchase recorded successfully'
        };
      }

      return result;
    } catch (error) {
      console.error('Error creating purchase:', error);
      return { success: false, error: error.message };
    }
  },

  // NEW: Update existing purchase
  updatePurchase: async (purchaseId, updateData) => {
    try {
      const currentDate = dbUtils.dateString();
      const timestamp = dbUtils.timestamp();

      // Get existing purchase
      const existingResult = await dbUtils.readData(`${DB_PATHS.PURCHASES}/${purchaseId}`);
      if (!existingResult.success || !existingResult.data) {
        return {
          success: false,
          error: 'Purchase not found'
        };
      }

      const existingPurchase = existingResult.data;
      const oldAmount = existingPurchase.total_amount || 0;

      // Validate supplier if being changed
      if (updateData.supplierId && updateData.supplierId !== existingPurchase.supplier_id) {
        const supplierResult = await supplierService.getSupplierById(updateData.supplierId);
        if (!supplierResult.success || !supplierResult.data) {
          return {
            success: false,
            error: 'Supplier not found'
          };
        }
      }

      // Get supplier info (either new or existing)
      const supplierId = updateData.supplierId || existingPurchase.supplier_id;
      const supplierResult = await supplierService.getSupplierById(supplierId);
      const supplier = supplierResult.data;

      // FIXED: Calculate new totals - properly handle 0 values for GST
      const amount = updateData.hasOwnProperty('amount') ? parseFloat(updateData.amount) || 0 : existingPurchase.amount;
      const cgst = updateData.hasOwnProperty('cgst') ? parseFloat(updateData.cgst) || 0 : existingPurchase.cgst;
      const sgst = updateData.hasOwnProperty('sgst') ? parseFloat(updateData.sgst) || 0 : existingPurchase.sgst;
      const igst = updateData.hasOwnProperty('igst') ? parseFloat(updateData.igst) || 0 : existingPurchase.igst;

      const cgstAmount = (amount * cgst) / 100;
      const sgstAmount = (amount * sgst) / 100;
      const igstAmount = (amount * igst) / 100;
      const totalGst = cgstAmount + sgstAmount + igstAmount;
      const totalAmount = amount + totalGst;

      // Prepare updated purchase
      const updatedPurchase = {
        ...existingPurchase,
        date: updateData.date || existingPurchase.date,
        bill_number: updateData.billNumber || existingPurchase.bill_number,
        supplier_id: supplierId,
        supplier_name: supplier.name,
        supplier_gstin: supplier.gstin,
        amount: amount,
        cgst: cgst,
        sgst: sgst,
        igst: igst,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: igstAmount,
        total_gst: totalGst,
        total_amount: totalAmount,
        description: updateData.description || existingPurchase.description,
        notes: updateData.notes || existingPurchase.notes,
        updated_date: currentDate,
        updated_timestamp: timestamp,
      };

      // Save updated purchase
      const result = await dbUtils.writeData(`${DB_PATHS.PURCHASES}/${purchaseId}`, updatedPurchase);
      
      if (result.success) {
        // Update supplier statistics (adjust for difference)
        const amountDifference = totalAmount - oldAmount;
        if (amountDifference !== 0) {
          await supplierService.adjustSupplierStats(supplierId, amountDifference);
        }

        return {
          success: true,
          data: updatedPurchase,
        };
      }

      return result;
    } catch (error) {
      console.error('Error updating purchase:', error);
      return { success: false, error: error.message };
    }
  },

  // NEW: Delete purchase
  deletePurchase: async (purchaseId) => {
    try {
      // Get purchase to adjust supplier stats
      const purchaseResult = await dbUtils.readData(`${DB_PATHS.PURCHASES}/${purchaseId}`);
      if (!purchaseResult.success || !purchaseResult.data) {
        return {
          success: false,
          error: 'Purchase not found'
        };
      }

      const purchase = purchaseResult.data;
      
      // Delete purchase
      const result = await dbUtils.deleteData(`${DB_PATHS.PURCHASES}/${purchaseId}`);
      
      if (result.success) {
        // Adjust supplier statistics
        await supplierService.adjustSupplierStats(
          purchase.supplier_id, 
          -(purchase.total_amount || 0),
          -1 // Decrease purchase count
        );

        return {
          success: true,
          message: 'Purchase deleted successfully'
        };
      }

      return result;
    } catch (error) {
      console.error('Error deleting purchase:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all purchases
  getAllPurchases: async (limit = null) => {
    try {
      const result = await dbUtils.readData(DB_PATHS.PURCHASES);
      
      if (result.success && result.data) {
        // Convert object to array and sort by date (newest first)
        const purchasesArray = Object.entries(result.data).map(([id, purchase]) => ({
          ...purchase,
          id: purchase.id || id
        }));

        // Sort by date (newest first)
        purchasesArray.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Apply limit
        const limitedPurchases = limit ? purchasesArray.slice(0, limit) : purchasesArray;

        return {
          success: true,
          data: limitedPurchases
        };
      }

      return {
        success: true,
        data: []
      };
    } catch (error) {
      console.error('Error fetching purchases:', error);
      return { success: false, error: error.message };
    }
  },

  // Get purchases by supplier
  getPurchasesBySupplier: async (supplierId) => {
    try {
      const allPurchasesResult = await supplierService.getAllPurchases();
      
      if (!allPurchasesResult.success) {
        return allPurchasesResult;
      }

      const purchases = allPurchasesResult.data || [];
      const supplierPurchases = purchases.filter(purchase => purchase.supplier_id === supplierId);

      return {
        success: true,
        data: supplierPurchases
      };
    } catch (error) {
      console.error('Error fetching supplier purchases:', error);
      return { success: false, error: error.message };
    }
  },

  // Update supplier statistics
  updateSupplierStats: async (supplierId, purchaseAmount) => {
    try {
      const supplierResult = await supplierService.getSupplierById(supplierId);
      if (!supplierResult.success || !supplierResult.data) {
        return { success: false, error: 'Supplier not found' };
      }

      const supplier = supplierResult.data;
      const currentDate = dbUtils.dateString();

      const updatedStats = {
        total_purchases: (supplier.total_purchases || 0) + 1,
        total_amount: (supplier.total_amount || 0) + purchaseAmount,
        last_purchase: currentDate,
        updated_date: currentDate,
        updated_timestamp: dbUtils.timestamp()
      };

      return await dbUtils.updateData(`${DB_PATHS.SUPPLIERS}/${supplierId}`, updatedStats);
    } catch (error) {
      console.error('Error updating supplier stats:', error);
      return { success: false, error: error.message };
    }
  },

  // NEW: Adjust supplier statistics (for updates/deletes)
  adjustSupplierStats: async (supplierId, amountDifference, purchaseCountDifference = 0) => {
    try {
      const supplierResult = await supplierService.getSupplierById(supplierId);
      if (!supplierResult.success || !supplierResult.data) {
        return { success: false, error: 'Supplier not found' };
      }

      const supplier = supplierResult.data;
      const currentDate = dbUtils.dateString();

      const updatedStats = {
        total_purchases: Math.max(0, (supplier.total_purchases || 0) + purchaseCountDifference),
        total_amount: Math.max(0, (supplier.total_amount || 0) + amountDifference),
        updated_date: currentDate,
        updated_timestamp: dbUtils.timestamp()
      };

      return await dbUtils.updateData(`${DB_PATHS.SUPPLIERS}/${supplierId}`, updatedStats);
    } catch (error) {
      console.error('Error adjusting supplier stats:', error);
      return { success: false, error: error.message };
    }
  },

  // Get purchases by date range
  getPurchasesByDateRange: async (fromDate, toDate) => {
    try {
      const allPurchasesResult = await supplierService.getAllPurchases();
      
      if (!allPurchasesResult.success) {
        return allPurchasesResult;
      }

      const purchases = allPurchasesResult.data || [];
      const filteredPurchases = purchases.filter(purchase => {
        const purchaseDate = new Date(purchase.date);
        const from = new Date(fromDate);
        const to = new Date(toDate);
        
        return purchaseDate >= from && purchaseDate <= to;
      });

      return {
        success: true,
        data: filteredPurchases
      };
    } catch (error) {
      console.error('Error fetching purchases by date range:', error);
      return { success: false, error: error.message };
    }
  },

  // Get purchase statistics
  getPurchaseStats: async () => {
    try {
      const allPurchasesResult = await supplierService.getAllPurchases();
      
      if (!allPurchasesResult.success) {
        return allPurchasesResult;
      }

      const purchases = allPurchasesResult.data || [];
      
      const stats = {
        total_purchases: purchases.length,
        total_amount: purchases.reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0),
        total_gst: purchases.reduce((sum, purchase) => sum + (purchase.total_gst || 0), 0),
        this_month_purchases: 0,
        this_month_amount: 0
      };

      // Calculate this month's stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      purchases.forEach(purchase => {
        const purchaseDate = new Date(purchase.date);
        if (purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear) {
          stats.this_month_purchases++;
          stats.this_month_amount += purchase.total_amount || 0;
        }
      });

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error calculating purchase stats:', error);
      return { success: false, error: error.message };
    }
  }
};