import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../services/firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (firebaseUser) => {
    setUser(firebaseUser);
    setLoading(false);
  }), []);

  const signIn = useCallback(async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return credential.user;
  }, []);

  const signUp = useCallback(async (name, email, password) => {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
    return credential.user;
  }, []);

  const resetPassword = useCallback((email) => sendPasswordResetEmail(auth, email.trim()), []);
  const logout = useCallback(() => signOut(auth), []);

  const value = useMemo(() => ({ user, loading, signIn, signUp, resetPassword, logout }), [user, loading, signIn, signUp, resetPassword, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
