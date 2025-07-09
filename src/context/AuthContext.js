import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { auth } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  sendEmailVerification
} from 'firebase/auth';
import toast from 'react-hot-toast';

// Action types
const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_INITIALIZED: 'SET_INITIALIZED',
};

// Initial state
const initialState = {
  user: null,
  loading: true,
  error: null,
  initialized: false,
};

// Reducer function
function authReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    
    case ActionTypes.SET_USER:
      return {
        ...state,
        user: action.payload,
        loading: false,
        error: null,
      };
    
    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    
    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    
    case ActionTypes.SET_INITIALIZED:
      return {
        ...state,
        initialized: true,
        loading: false,
      };
    
    default:
      return state;
  }
}

// Create context
const AuthContext = createContext();

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// AuthProvider component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime,
        };
        dispatch({ type: ActionTypes.SET_USER, payload: userData });
      } else {
        // User is signed out
        dispatch({ type: ActionTypes.SET_USER, payload: null });
      }
      
      if (!state.initialized) {
        dispatch({ type: ActionTypes.SET_INITIALIZED });
      }
    });

    return unsubscribe;
  }, [state.initialized]);

  // Clear error after a delay
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        dispatch({ type: ActionTypes.CLEAR_ERROR });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  // Sign in with email and password
  const signIn = useCallback(async (email, password) => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.CLEAR_ERROR });
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      toast.success('Successfully signed in!');
      return { success: true, user: userCredential.user };
    } catch (error) {
      
      
      let errorMessage = 'Failed to sign in';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        default:
          errorMessage = error.message;
      }
      
      dispatch({ type: ActionTypes.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Sign up with email and password
  const signUp = useCallback(async (email, password, displayName = '') => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.CLEAR_ERROR });
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name if provided
      if (displayName) {
        await updateProfile(userCredential.user, {
          displayName: displayName
        });
      }

      // Send email verification
      await sendEmailVerification(userCredential.user);
      
      toast.success('Account created! Please check your email to verify your account.');
      return { success: true, user: userCredential.user };
    } catch (error) {
      
      
      let errorMessage = 'Failed to create account';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        default:
          errorMessage = error.message;
      }
      
      dispatch({ type: ActionTypes.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Sign out
  const signOutUser = useCallback(async () => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      await signOut(auth);
      toast.success('Successfully signed out');
      return { success: true };
    } catch (error) {
      
      const errorMessage = 'Failed to sign out';
      dispatch({ type: ActionTypes.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email) => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.CLEAR_ERROR });
      
      await sendPasswordResetEmail(auth, email);
      
      toast.success('Password reset email sent! Check your inbox.');
      return { success: true };
    } catch (error) {
      
      
      let errorMessage = 'Failed to send password reset email';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        default:
          errorMessage = error.message;
      }
      
      dispatch({ type: ActionTypes.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, []);

  // Update user profile
  const updateUserProfile = useCallback(async (updates) => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.CLEAR_ERROR });
      
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }

      await updateProfile(auth.currentUser, updates);
      
      // Update local state
      const updatedUser = {
        ...state.user,
        ...updates,
      };
      dispatch({ type: ActionTypes.SET_USER, payload: updatedUser });
      
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      
      const errorMessage = 'Failed to update profile';
      dispatch({ type: ActionTypes.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, [state.user]);

  // Resend email verification
  const resendEmailVerification = useCallback(async () => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }

      await sendEmailVerification(auth.currentUser);
      toast.success('Verification email sent!');
      return { success: true };
    } catch (error) {
      
      const errorMessage = 'Failed to send verification email';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, []);

  // Clear error manually
  const clearError = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_ERROR });
  }, []);

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    return !!state.user;
  }, [state.user]);

  // Check if user's email is verified
  const isEmailVerified = useCallback(() => {
    return state.user?.emailVerified || false;
  }, [state.user]);

  // Get user display name or email
  const getUserDisplayName = useCallback(() => {
    return state.user?.displayName || state.user?.email || 'User';
  }, [state.user]);

  // Context value
  const value = {
    // State
    user: state.user,
    loading: state.loading,
    error: state.error,
    initialized: state.initialized,
    
    // Actions
    signIn,
    signUp,
    signOut: signOutUser,
    resetPassword,
    updateUserProfile,
    resendEmailVerification,
    clearError,
    
    // Helpers
    isAuthenticated,
    isEmailVerified,
    getUserDisplayName,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Higher-order component for protecting routes
export function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, loading, initialized } = useAuth();

    if (!initialized || loading) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}>
          <div>Loading...</div>
        </div>
      );
    }

    if (!isAuthenticated()) {
      // Redirect to login or show login component
      return <div>Please sign in to access this page</div>;
    }

    return <Component {...props} />;
  };
}

export default AuthContext;