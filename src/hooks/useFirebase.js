import { useState, useEffect, useCallback, useRef } from 'react';
import { dbUtils } from '../services/firebase';

/**
 * Custom hook for Firebase Realtime Database operations
 */
export function useFirebase() {
  const [isConnected, setIsConnected] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const listenersRef = useRef(new Map());

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      // Use a simple read operation to check connection
      await dbUtils.readData('.info/connected');
      setIsConnected(true);
      return true;
    } catch (error) {
      console.error('Firebase connection check failed:', error);
      setIsConnected(false);
      return false;
    }
  }, []);

  // Monitor connection status
  useEffect(() => {
    // Initial connection check
    checkConnection();

    // Set up periodic connection checks
    const connectionInterval = setInterval(checkConnection, 30000); // Check every 30 seconds

    // Listen to online/offline events
    const handleOnline = () => {
      setTimeout(checkConnection, 1000); // Check connection after going online
    };

    const handleOffline = () => {
      setIsConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(connectionInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  // Generic read operation
  const readData = useCallback(async (path) => {
    try {
      const result = await dbUtils.readData(path);
      setLastSyncTime(Date.now());
      return result;
    } catch (error) {
      console.error('Firebase read error:', error);
      setIsConnected(false);
      return { success: false, error: error.message };
    }
  }, []);

  // Generic write operation
  const writeData = useCallback(async (path, data) => {
    try {
      const result = await dbUtils.writeData(path, data);
      setLastSyncTime(Date.now());
      return result;
    } catch (error) {
      console.error('Firebase write error:', error);
      setIsConnected(false);
      return { success: false, error: error.message };
    }
  }, []);

  // Generic update operation
  const updateData = useCallback(async (path, updates) => {
    try {
      const result = await dbUtils.updateData(path, updates);
      setLastSyncTime(Date.now());
      return result;
    } catch (error) {
      console.error('Firebase update error:', error);
      setIsConnected(false);
      return { success: false, error: error.message };
    }
  }, []);

  // Generic push operation
  const pushData = useCallback(async (path, data) => {
    try {
      const result = await dbUtils.pushData(path, data);
      setLastSyncTime(Date.now());
      return result;
    } catch (error) {
      console.error('Firebase push error:', error);
      setIsConnected(false);
      return { success: false, error: error.message };
    }
  }, []);

  // Generic delete operation
  const deleteData = useCallback(async (path) => {
    try {
      const result = await dbUtils.deleteData(path);
      setLastSyncTime(Date.now());
      return result;
    } catch (error) {
      console.error('Firebase delete error:', error);
      setIsConnected(false);
      return { success: false, error: error.message };
    }
  }, []);

  // Batch update operation
  const batchUpdate = useCallback(async (updates) => {
    try {
      const result = await dbUtils.batchUpdate(updates);
      setLastSyncTime(Date.now());
      return result;
    } catch (error) {
      console.error('Firebase batch update error:', error);
      setIsConnected(false);
      return { success: false, error: error.message };
    }
  }, []);

  // Listen to real-time data changes
  const listenToData = useCallback((path, callback, onError = null) => {
    try {
      const unsubscribe = dbUtils.listenToData(path, (data, error) => {
        if (error) {
          console.error('Firebase listener error:', error);
          setIsConnected(false);
          if (onError) onError(error);
        } else {
          setIsConnected(true);
          setLastSyncTime(Date.now());
          callback(data);
        }
      });

      // Store the unsubscribe function
      listenersRef.current.set(path, unsubscribe);

      return unsubscribe;
    } catch (error) {
      console.error('Firebase listen setup error:', error);
      setIsConnected(false);
      if (onError) onError(error);
      return null;
    }
  }, []);

  // Stop listening to data changes
  const stopListening = useCallback((path) => {
    const unsubscribe = listenersRef.current.get(path);
    if (unsubscribe) {
      unsubscribe();
      listenersRef.current.delete(path);
    }
  }, []);

  // Stop all listeners
  const stopAllListeners = useCallback(() => {
    listenersRef.current.forEach((unsubscribe) => {
      unsubscribe();
    });
    listenersRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllListeners();
    };
  }, [stopAllListeners]);

  return {
    // Connection status
    isConnected,
    lastSyncTime,
    
    // Connection utilities
    checkConnection,
    
    // Data operations
    readData,
    writeData,
    updateData,
    pushData,
    deleteData,
    batchUpdate,
    
    // Real-time operations
    listenToData,
    stopListening,
    stopAllListeners,
    
    // Utility functions
    timestamp: dbUtils.timestamp,
    dateString: dbUtils.dateString,
  };
}

/**
 * Hook for managing a single document/path with real-time updates
 */
export function useFirebaseDocument(path, initialData = null) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { readData, writeData, updateData, listenToData, stopListening, isConnected } = useFirebase();

  // Load initial data
  useEffect(() => {
    if (!path) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await readData(path);
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [path, readData]);

  // Set up real-time listener
  useEffect(() => {
    if (!path) return;

    const unsubscribe = listenToData(
      path,
      (newData) => {
        setData(newData);
        setError(null);
        if (loading) setLoading(false);
      },
      (err) => {
        setError(err.message);
        if (loading) setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [path, listenToData, loading]);

  // Update document
  const updateDocument = useCallback(async (updates) => {
    if (!path) return { success: false, error: 'No path specified' };
    
    setError(null);
    return await updateData(path, updates);
  }, [path, updateData]);

  // Replace document
  const setDocument = useCallback(async (newData) => {
    if (!path) return { success: false, error: 'No path specified' };
    
    setError(null);
    return await writeData(path, newData);
  }, [path, writeData]);

  return {
    data,
    loading,
    error,
    isConnected,
    updateDocument,
    setDocument,
  };
}

/**
 * Hook for managing a collection with real-time updates
 */
export function useFirebaseCollection(path, orderBy = null, limit = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { readData, pushData, listenToData, isConnected } = useFirebase();

  // Load and listen to collection data
  useEffect(() => {
    if (!path) return;

    const unsubscribe = listenToData(
      path,
      (newData) => {
        if (newData) {
          // Convert object to array with keys as ids
          const dataArray = Object.entries(newData).map(([id, item]) => ({
            id,
            ...item,
          }));

          // Apply ordering
          if (orderBy) {
            dataArray.sort((a, b) => {
              const aVal = a[orderBy];
              const bVal = b[orderBy];
              
              if (typeof aVal === 'number' && typeof bVal === 'number') {
                return bVal - aVal; // Descending for numbers
              }
              
              if (typeof aVal === 'string' && typeof bVal === 'string') {
                return bVal.localeCompare(aVal); // Descending for strings
              }
              
              return 0;
            });
          }

          // Apply limit
          const finalData = limit ? dataArray.slice(0, limit) : dataArray;
          
          setData(finalData);
        } else {
          setData([]);
        }
        
        setError(null);
        if (loading) setLoading(false);
      },
      (err) => {
        setError(err.message);
        if (loading) setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [path, orderBy, limit, listenToData, loading]);

  // Add item to collection
  const addItem = useCallback(async (item) => {
    if (!path) return { success: false, error: 'No path specified' };
    
    setError(null);
    return await pushData(path, item);
  }, [path, pushData]);

  return {
    data,
    loading,
    error,
    isConnected,
    addItem,
  };
}

export default useFirebase;