import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { dbUtils } from '../services/firebase';
import { DB_PATHS, STORAGE_KEYS } from '../utils/constants';

// Initial state
const initialState = {
  // App settings
  settings: {
    cement_per_brick_ratio: 0.05,
    default_brick_price: 2.5,
    low_stock_alert: {
      bricks: 1000,
      cement: 10,
    },
    currency: 'USD',
    date_format: 'MM/dd/yyyy',
    theme: 'light',
  },
  
  // UI state
  ui: {
    sidebarOpen: true,
    loading: false,
    notifications: [],
    currentPage: 'dashboard',
  },
  
  // User preferences
  preferences: {
    dashboard_widgets: ['inventory', 'production', 'sales', 'alerts'],
    items_per_page: 10,
    default_view: 'grid',
    auto_refresh: true,
    refresh_interval: 30000, // 30 seconds
  },
  
  // Cache
  cache: {
    last_updated: null,
    data: {},
  },
  
  // Connection status
  isOnline: true,
  lastSyncTime: null,
};

// Action types
const ActionTypes = {
  SET_SETTINGS: 'SET_SETTINGS',
  UPDATE_SETTING: 'UPDATE_SETTING',
  SET_UI_STATE: 'SET_UI_STATE',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_LOADING: 'SET_LOADING',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  SET_PREFERENCES: 'SET_PREFERENCES',
  UPDATE_PREFERENCE: 'UPDATE_PREFERENCE',
  SET_CACHE: 'SET_CACHE',
  UPDATE_CACHE: 'UPDATE_CACHE',
  SET_ONLINE_STATUS: 'SET_ONLINE_STATUS',
  SET_LAST_SYNC_TIME: 'SET_LAST_SYNC_TIME',
};

// Reducer function
function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_SETTINGS:
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    
    case ActionTypes.UPDATE_SETTING:
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.key]: action.value,
        },
      };
    
    case ActionTypes.SET_UI_STATE:
      return {
        ...state,
        ui: { ...state.ui, ...action.payload },
      };
    
    case ActionTypes.TOGGLE_SIDEBAR:
      return {
        ...state,
        ui: {
          ...state.ui,
          sidebarOpen: !state.ui.sidebarOpen,
        },
      };
    
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        ui: {
          ...state.ui,
          loading: action.payload,
        },
      };
    
    case ActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [...state.ui.notifications, action.payload],
        },
      };
    
    case ActionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(
            (notification) => notification.id !== action.payload
          ),
        },
      };
    
    case ActionTypes.SET_CURRENT_PAGE:
      return {
        ...state,
        ui: {
          ...state.ui,
          currentPage: action.payload,
        },
      };
    
    case ActionTypes.SET_PREFERENCES:
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
      };
    
    case ActionTypes.UPDATE_PREFERENCE:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          [action.key]: action.value,
        },
      };
    
    case ActionTypes.SET_CACHE:
      return {
        ...state,
        cache: action.payload,
      };
    
    case ActionTypes.UPDATE_CACHE:
      return {
        ...state,
        cache: {
          ...state.cache,
          data: {
            ...state.cache.data,
            [action.key]: action.value,
          },
          last_updated: Date.now(),
        },
      };
    
    case ActionTypes.SET_ONLINE_STATUS:
      return {
        ...state,
        isOnline: action.payload,
      };
    
    case ActionTypes.SET_LAST_SYNC_TIME:
      return {
        ...state,
        lastSyncTime: action.payload,
      };
    
    default:
      return state;
  }
}

// Create context
const AppContext = createContext();

// Context provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load settings and preferences on mount
  useEffect(() => {
    loadAppData();
    loadUserPreferences();
    
    // Set up online/offline detection
    const handleOnline = () => dispatch({ type: ActionTypes.SET_ONLINE_STATUS, payload: true });
    const handleOffline = () => dispatch({ type: ActionTypes.SET_ONLINE_STATUS, payload: false });
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load app settings from Firebase
  const loadAppData = async () => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      
      const result = await dbUtils.readData(DB_PATHS.SETTINGS);
      
      if (result.success && result.data) {
        dispatch({ type: ActionTypes.SET_SETTINGS, payload: result.data });
      }
      
      dispatch({ type: ActionTypes.SET_LAST_SYNC_TIME, payload: Date.now() });
    } catch (error) {
      console.error('Error loading app data:', error);
      showNotification('Failed to load app settings', 'error');
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  };

  // Load user preferences from localStorage
  const loadUserPreferences = () => {
    try {
      const savedPreferences = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        dispatch({ type: ActionTypes.SET_PREFERENCES, payload: preferences });
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  // Save user preferences to localStorage
  const saveUserPreferences = (preferences) => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  };

  // Action creators
  const actions = {
    // Settings actions
    updateSetting: async (key, value) => {
      try {
        dispatch({ type: ActionTypes.UPDATE_SETTING, key, value });
        
        // Save to Firebase
        const updates = { [key]: value };
        await dbUtils.updateData(DB_PATHS.SETTINGS, updates);
        
        showNotification('Setting updated successfully', 'success');
      } catch (error) {
        console.error('Error updating setting:', error);
        showNotification('Failed to update setting', 'error');
      }
    },

    updateSettings: async (settings) => {
      try {
        dispatch({ type: ActionTypes.SET_SETTINGS, payload: settings });
        
        // Save to Firebase
        await dbUtils.updateData(DB_PATHS.SETTINGS, settings);
        
        showNotification('Settings saved successfully', 'success');
      } catch (error) {
        console.error('Error updating settings:', error);
        showNotification('Failed to save settings', 'error');
      }
    },

    // UI actions
    toggleSidebar: () => {
      dispatch({ type: ActionTypes.TOGGLE_SIDEBAR });
    },

    setLoading: (loading) => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: loading });
    },

    setCurrentPage: (page) => {
      dispatch({ type: ActionTypes.SET_CURRENT_PAGE, payload: page });
    },

    // Notification actions
    showNotification: (message, type = 'info', duration = 4000) => {
      const notification = {
        id: Date.now() + Math.random(),
        message,
        type,
        timestamp: Date.now(),
      };
      
      dispatch({ type: ActionTypes.ADD_NOTIFICATION, payload: notification });
      
      // Auto-remove notification after duration
      if (duration > 0) {
        setTimeout(() => {
          actions.removeNotification(notification.id);
        }, duration);
      }
      
      return notification.id;
    },

    removeNotification: (id) => {
      dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id });
    },

    clearNotifications: () => {
      state.ui.notifications.forEach(notification => {
        actions.removeNotification(notification.id);
      });
    },

    // Preference actions
    updatePreference: (key, value) => {
      dispatch({ type: ActionTypes.UPDATE_PREFERENCE, key, value });
      
      const newPreferences = { ...state.preferences, [key]: value };
      saveUserPreferences(newPreferences);
    },

    updatePreferences: (preferences) => {
      dispatch({ type: ActionTypes.SET_PREFERENCES, payload: preferences });
      saveUserPreferences({ ...state.preferences, ...preferences });
    },

    // Cache actions
    updateCache: (key, data) => {
      dispatch({ type: ActionTypes.UPDATE_CACHE, key, value: data });
    },

    clearCache: () => {
      dispatch({ 
        type: ActionTypes.SET_CACHE, 
        payload: { last_updated: null, data: {} }
      });
    },

    // Data refresh
    refreshData: async () => {
      await loadAppData();
    },

    // Sync status
    updateSyncTime: () => {
      dispatch({ type: ActionTypes.SET_LAST_SYNC_TIME, payload: Date.now() });
    },
  };

  // Helper function for showing notifications
  const showNotification = actions.showNotification;

  // Context value
  const contextValue = {
    state,
    actions,
    // Convenience getters
    settings: state.settings,
    ui: state.ui,
    preferences: state.preferences,
    isOnline: state.isOnline,
    lastSyncTime: state.lastSyncTime,
    isLoading: state.ui.loading,
    notifications: state.ui.notifications,
    sidebarOpen: state.ui.sidebarOpen,
    currentPage: state.ui.currentPage,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the app context
export function useApp() {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  
  return context;
}

// Custom hooks for specific parts of the state
export function useSettings() {
  const { settings, actions } = useApp();
  return {
    settings,
    updateSetting: actions.updateSetting,
    updateSettings: actions.updateSettings,
  };
}

export function useNotifications() {
  const { notifications, actions } = useApp();
  return {
    notifications,
    showNotification: actions.showNotification,
    removeNotification: actions.removeNotification,
    clearNotifications: actions.clearNotifications,
  };
}

export function usePreferences() {
  const { preferences, actions } = useApp();
  return {
    preferences,
    updatePreference: actions.updatePreference,
    updatePreferences: actions.updatePreferences,
  };
}

export default AppContext;