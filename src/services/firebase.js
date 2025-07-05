// Import Firebase functions
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set, get, update, remove, onValue, off } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Import localStorage fallback
import { localStorageUtils, initializeLocalStorage } from './localStorage';

const validateFirebasePath = (path) => {
  if (!path || path === '/') return path;
  
  // Remove any invalid characters and clean the path
  const cleanPath = path
    .replace(/\/+/g, '/') // Replace multiple slashes with single slash
    .replace(/^\//, '') // Remove leading slash
    .replace(/\/$/, '') // Remove trailing slash
    .replace(/[.#$\[\]]/g, '_'); // Replace invalid Firebase characters
  
  return cleanPath;
};

// Check if Firebase is configured
const isFirebaseConfigured = () => {
  return !!(
    process.env.REACT_APP_FIREBASE_API_KEY &&
    process.env.REACT_APP_FIREBASE_DATABASE_URL &&
    process.env.REACT_APP_FIREBASE_PROJECT_ID
  );
};

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase (only if configured)
let app = null;
let database = null;
let auth = null;
let useLocalStorage = false;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    auth = getAuth(app);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.warn('Firebase initialization failed, falling back to localStorage:', error);
    useLocalStorage = true;
  }
} else {
  console.warn('Firebase not configured, using localStorage mode');
  useLocalStorage = true;
}

export { database, auth };

// Database utility functions (works with both Firebase and localStorage)
export const dbUtils = {
  // Create a reference
  createRef: (path) => {
    if (useLocalStorage) return path;
    return ref(database, path);
  },
  
  // Write data
  writeData: async (path, data) => {
    try {
      if (useLocalStorage) {
        return await localStorageUtils.writeData(path, data);
      }
      
      const dbRef = ref(database, path);
      await set(dbRef, data);
      return { success: true };
    } catch (error) {
      console.error('Error writing data:', error);
      return { success: false, error: error.message };
    }
  },

  // Read data once
  readData: async (path) => {
    try {
      if (useLocalStorage) {
        return await localStorageUtils.readData(path);
      }

      // Validate and clean the path
      const cleanPath = validateFirebasePath(path);
    
      if (!cleanPath) {
        // If path is empty or just '/', read the root
        const snapshot = await get(ref(database));
        const data = snapshot.exists() ? snapshot.val() : null;
        return { success: true, data };
      }
      
      const dbRef = ref(database, path);
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      } else {
        return { success: true, data: null };
      }
    } catch (error) {
      console.error('Error reading data:', error);
      return { success: false, error: error.message };
    }
  },

  // Update data
  updateData: async (path, updates) => {
    try {
      if (useLocalStorage) {
        return await localStorageUtils.updateData(path, updates);
      }
      
      const dbRef = ref(database, path);
      await update(dbRef, updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating data:', error);
      return { success: false, error: error.message };
    }
  },

  // Push new data (generates unique key)
  pushData: async (path, data) => {
    try {
      if (useLocalStorage) {
        return await localStorageUtils.pushData(path, data);
      }
      
      const dbRef = ref(database, path);
      const newRef = await push(dbRef, data);
      return { success: true, key: newRef.key };
    } catch (error) {
      console.error('Error pushing data:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete data
  deleteData: async (path) => {
    try {
      if (useLocalStorage) {
        return await localStorageUtils.deleteData(path);
      }
      
      const dbRef = ref(database, path);
      await remove(dbRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting data:', error);
      return { success: false, error: error.message };
    }
  },

  // Listen to data changes
  listenToData: (path, callback) => {
    if (useLocalStorage) {
      return localStorageUtils.listenToData(path, callback);
    }
    
    const dbRef = ref(database, path);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.exists() ? snapshot.val() : null;
      callback(data);
    }, (error) => {
      console.error('Error listening to data:', error);
      callback(null, error);
    });
    
    return unsubscribe;
  },

  // Stop listening to data changes
  stopListening: (path, callback) => {
    if (useLocalStorage) return;
    
    const dbRef = ref(database, path);
    off(dbRef, 'value', callback);
  },

  // Batch update multiple paths
  batchUpdate: async (updates) => {
    try {
      if (useLocalStorage) {
        return await localStorageUtils.batchUpdate(updates);
      }
      
      await update(ref(database), updates);
      return { success: true };
    } catch (error) {
      console.error('Error in batch update:', error);
      return { success: false, error: error.message };
    }
  },

  // Generate timestamp
  timestamp: () => Date.now(),

  // Generate date string
  dateString: () => new Date().toISOString().split('T')[0], // YYYY-MM-DD format
};

// Initialize database (Firebase or localStorage)
export const initializeDatabase = async () => {
  try {
    if (useLocalStorage) {
      console.log('Initializing localStorage database...');
      return await initializeLocalStorage();
    }
    
    // Check if Firebase data already exists
    const { data: existingData } = await dbUtils.readData('/');
    
    if (!existingData) {
      console.log('Initializing Firebase database with default structure...');
      
      const defaultData = {
        bricks: {
          inventory: {
            total_stock: 0,
            last_updated: dbUtils.timestamp(),
          },
          production: {
            daily: {},
            monthly: {},
          },
          sales: {
            transactions: {},
            daily: {},
          },
        },
        cement: {
          inventory: {
            total_bags: 0,
            cost_per_bag: 25,
            last_updated: dbUtils.timestamp(),
          },
          usage: {
            daily: {},
          },
          purchases: {},
        },
        settings: {
          cement_per_brick_ratio: 0.05,
          default_brick_price: 2.5,
          low_stock_alert: {
            bricks: 1000,
            cement: 10,
          },
          initialized: true,
          created_at: dbUtils.timestamp(),
        },
      };

      await dbUtils.writeData('/', defaultData);
      console.log('Database initialized successfully');
      return { success: true, message: 'Database initialized' };
    } else {
      console.log('Database already exists');
      return { success: true, message: 'Database already exists' };
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error: error.message };
  }
};

// Connection status checker
export const checkConnection = async () => {
  try {
    if (useLocalStorage) {
      return true; // localStorage is always available
    }
    
    const { success } = await dbUtils.readData('/settings');
    return success;
  } catch (error) {
    console.error('Connection check failed:', error);
    return false;
  }
};

export default app;