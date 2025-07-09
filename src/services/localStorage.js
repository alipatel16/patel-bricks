/**
 * Local Storage fallback for testing without Firebase
 * This is a temporary solution for development/testing
 */

const LOCAL_STORAGE_PREFIX = 'brick_app_';

// Simple local storage utilities
export const localStorageUtils = {
  // Write data to localStorage
  writeData: async (path, data) => {
    try {
      const key = LOCAL_STORAGE_PREFIX + path.replace(/\//g, '_');
      localStorage.setItem(key, JSON.stringify(data));
      return { success: true };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Read data from localStorage
  readData: async (path) => {
    try {
      const key = LOCAL_STORAGE_PREFIX + path.replace(/\//g, '_');
      const data = localStorage.getItem(key);
      return { 
        success: true, 
        data: data ? JSON.parse(data) : null 
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Update data in localStorage
  updateData: async (path, updates) => {
    try {
      const { data: currentData } = await localStorageUtils.readData(path);
      const newData = { ...currentData, ...updates };
      return await localStorageUtils.writeData(path, newData);
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Push data (simulate Firebase push with timestamp key)
  pushData: async (path, data) => {
    try {
      const key = Date.now().toString();
      const fullPath = `${path}/${key}`;
      const result = await localStorageUtils.writeData(fullPath, data);
      return { ...result, key };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Delete data from localStorage
  deleteData: async (path) => {
    try {
      const key = LOCAL_STORAGE_PREFIX + path.replace(/\//g, '_');
      localStorage.removeItem(key);
      return { success: true };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Batch update (simulate Firebase batch operations)
  batchUpdate: async (updates) => {
    try {
      for (const [path, data] of Object.entries(updates)) {
        await localStorageUtils.updateData(path, { [path.split('/').pop()]: data });
      }
      return { success: true };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  },

  // Listen to data changes (simplified, no real-time updates)
  listenToData: (path, callback) => {
    // For localStorage, we'll just call the callback immediately with current data
    localStorageUtils.readData(path).then(result => {
      callback(result.data, result.error);
    });
    
    // Return a dummy unsubscribe function
    return () => {};
  },

  // Utility functions
  timestamp: () => Date.now(),
  dateString: () => new Date().toISOString().split('T')[0],
};

// Initialize with default data
export const initializeLocalStorage = async () => {
  try {
    // Check if data already exists
    const { data: existingData } = await localStorageUtils.readData('settings');
    
    if (!existingData) {
      
      
      // Initialize default data structure
      const defaultData = {
        settings: {
          cement_per_brick_ratio: 0.05,
          default_brick_price: 2.5,
          low_stock_alert: {
            bricks: 1000,
            cement: 10,
          },
          initialized: true,
          created_at: Date.now(),
        },
        bricks: {
          inventory: {
            total_stock: 0,
            last_updated: Date.now(),
          }
        },
        cement: {
          inventory: {
            total_bags: 0,
            cost_per_bag: 25,
            last_updated: Date.now(),
          }
        }
      };

      // Write default data
      for (const [key, value] of Object.entries(defaultData)) {
        await localStorageUtils.writeData(key, value);
      }
      
      
      return { success: true, message: 'LocalStorage initialized' };
    } else {
      
      return { success: true, message: 'LocalStorage already exists' };
    }
  } catch (error) {
    
    return { success: false, error: error.message };
  }
};