import React, { createContext, useContext, useState, useEffect } from 'react';
import SessionService from '../services/SessionService';
import { normalizeRole } from '../constants/Roles';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Initial load
    refreshUser();

    // Listen for custom login/logout events from AuthService
    const handleAuthStateChanged = () => refreshUser();
    window.addEventListener('auth_state_changed', handleAuthStateChanged);

    return () => {
      window.removeEventListener('auth_state_changed', handleAuthStateChanged);
    };
  }, []);

  const refreshUser = async () => {
    setLoading(true);
    
    // Fast check first using local cache
    if (!SessionService.isAuthenticated()) {
      clearAuthState();
      setLoading(false);
      return;
    }

    const cachedUser = SessionService.getUser();
    setUser(cachedUser);
    setIsAuthenticated(true);

    try {
      // Validate session with backend and fetch fresh profile
      const sessionValidation = await SessionService.validateSession();
      
      if (!sessionValidation.valid) {
        if (!sessionValidation.networkError) {
          // Only log out if it's explicitly invalid (not just a network error)
          clearAuthState();
        } else {
          // If network error, trust cache for now but maybe show warning
          await fetchProfile(cachedUser.user_id || cachedUser.id, cachedUser);
        }
      } else {
        const freshUser = sessionValidation.user;
        setUser(freshUser);
        await fetchProfile(freshUser.user_id || freshUser.id, freshUser);
      }
    } catch (error) {
      console.error("Error refreshing user context:", error);
      // Fallback to cache
      await fetchProfile(cachedUser.user_id || cachedUser.id, cachedUser);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId, fallbackUser) => {
    try {
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching full profile:", error);
      }

      setProfile(userProfile || fallbackUser);
    } catch (error) {
      console.error("Error fetching full profile:", error);
      setProfile(fallbackUser);
    }
  };

  const clearAuthState = () => {
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
  };

  const logout = () => {
    // Rely on AuthService for full backend invalidate, this is just local cleanup if needed
    // But usually we call AuthService.logout() from UI instead of this.
    SessionService.clearSession();
    clearAuthState();
  };

  // Derive useful properties
  const role = profile?.role || user?.role || null;
  const normalizedRole = normalizeRole(role);
  const department = profile?.department || profile?.department_id || user?.department || null;
  const userId = profile?.user_id || user?.user_id || user?.id || null;
  const name = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : (user?.name || null);

  // Check if profile needs completion
  const isSuperOrDev = normalizedRole === 'SUPERADMIN' || normalizedRole === 'DEVELOPER';
  const hasName = profile?.name || profile?.first_name || user?.name;
  const hasDept = profile?.department_code || profile?.department || user?.department;
  const isFirstLogin = profile?.first_login === true || profile?.first_login === 'true';
  const profileIncomplete = !isSuperOrDev && (isFirstLogin || !hasName || !hasDept || !(profile?.phone_number || user?.phone_number));

  const value = {
    user,
    profile,
    loading,
    isAuthenticated,
    role,
    normalizedRole,
    department,
    userId,
    name,
    profileIncomplete,
    refreshUser,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
