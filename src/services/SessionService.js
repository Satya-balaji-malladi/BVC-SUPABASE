import { supabase } from '../supabaseClient';

const SESSION_KEY = 'bvc_secure_session_token';
const USER_KEY = 'bvc_cached_user';

class SessionService {
  /**
   * Save the session token and user data to local storage.
   */
  static setSession(token, user) {
    // Sanitize user object to only store non-sensitive UI routing info
    const sanitizedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      department: user.department
    };
    localStorage.setItem(SESSION_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(sanitizedUser));
  }

  /**
   * Get the current session token.
   */
  static getToken() {
    return localStorage.getItem(SESSION_KEY);
  }

  /**
   * Get the cached user data.
   */
  static getUser() {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }

  /**
   * Validate the session securely against the backend.
   * Returns { valid: boolean, user: Object | null, error: string | null }
   */
  static async validateSession() {
    const token = this.getToken();
    
    if (!token) {
      return { valid: false, error: 'No session token found' };
    }

    try {
      const { data, error } = await supabase.rpc('validate_session_token', { p_token: token });
      
      if (error) {
        console.error('Session validation RPC error:', error);
        return { valid: false, networkError: true, error: 'Database connection error during validation' };
      }

      if (data && data.valid) {
        // Update cached user details in case they changed
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return { valid: true, user: data.user };
      } else {
        // Token was invalid or expired
        this.clearSession();
        return { valid: false, networkError: false, error: data?.error || 'Invalid session' };
      }
    } catch (err) {
      console.error('Unexpected error validating session:', err);
      return { valid: false, networkError: true, error: 'Network error validating session' };
    }
  }

  /**
   * Clear all session data from local storage.
   */
  static clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    // Legacy support cleanup
    localStorage.removeItem('custom_auth_session');
  }

  /**
   * Utility to check if a user is authenticated (checks local cache only, 
   * true validation requires validateSession)
   */
  static isAuthenticated() {
    return !!this.getToken() && !!this.getUser();
  }
}

export default SessionService;
