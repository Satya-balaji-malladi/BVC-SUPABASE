import { supabase } from '../supabaseClient';
import SessionService from './SessionService';
import { emailService } from './emailService';

class AuthService {
  
  /**
   * Check if user exists and if it's their first login
   */
  static async checkUserStatus(identifier) {
    try {
      const { data, error } = await supabase.rpc('check_user_status', {
        p_identifier: identifier
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Check user status error:', error);
      throw error;
    }
  }

  /**
   * Login with email or employee ID and password.
   */
  static async login(identifier, password) {
    try {
      // 1. Validate against DB RPC which handles secure password comparison
      const { data: authResponse, error: authError } = await supabase.rpc('authenticate_user', {
        p_identifier: identifier,
        p_password: password
      });

      if (authError) throw authError;

      if (!authResponse || !authResponse.success) {
        throw new Error(authResponse?.error || 'Invalid credentials');
      }

      // 2. Create secure backend session
      const user = authResponse.user;
      
      // Get basic browser details for session tracking
      const userAgent = navigator.userAgent;
      
      const userId = user.user_id || user.id;

      const { data: sessionToken, error: sessionError } = await supabase.rpc('create_session', {
        p_user_id: userId,
        p_ip: 'Unknown', // In a real edge function we'd get the actual IP
        p_user_agent: userAgent
      });

      if (sessionError) throw sessionError;

      // 3. Store session securely on frontend
      SessionService.setSession(sessionToken, user);
      
      // 4. Notify app of state change
      window.dispatchEvent(new Event('auth_state_changed'));

      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout the current user
   */
  static async logout() {
    try {
      const token = SessionService.getToken();
      if (token) {
        // Invalidate backend session
        await supabase.rpc('invalidate_session', { p_token: token });
      }
    } catch (e) {
      console.error('Error during logout backend invalidation', e);
    } finally {
      // Always clear local session even if backend fails
      SessionService.clearSession();
      window.dispatchEvent(new Event('auth_state_changed'));
    }
  }

  /**
   * Request OTP for password reset
   */
  static async requestOtp(identifier) {
    try {
      const { data, error } = await supabase.rpc('request_otp', {
        p_identifier: identifier
      });

      if (error) throw error;
      
      // Attempt to send the OTP via the Google Apps Script email service
      if (data && data.otp && data.email_address) {
        const emailResult = await emailService.sendOTP({
          email: data.email_address,
          name: data.first_name || 'User',
          otp: data.otp
        });
        
        if (!emailResult.success) {
          console.warn('Failed to dispatch OTP email via external service.');
          throw new Error('Unable to send OTP right now. Please try again.');
        }
      }

      // SECURITY CRITICAL: Strip the OTP and raw email from the response before returning to UI
      // The frontend UI must never have access to the raw OTP or full email in its state.
      const safeResponse = {
        success: data?.success,
        message: 'OTP sent to your registered email.',
        masked_email: data?.masked_email
      };

      return safeResponse; 
    } catch (error) {
      // Do not log the raw error if it contains OTP details
      console.error('Request OTP error:', error.message || 'Unknown error');
      throw new Error(error.message || 'Unable to request OTP');
    }
  }

  /**
   * Reset Password using OTP
   */
  static async resetPassword(identifier, otp, newPassword) {
    try {
      const userAgent = navigator.userAgent;
      const { data, error } = await supabase.rpc('reset_password_with_otp', {
        p_identifier: identifier,
        p_otp: otp,
        p_new_password: newPassword,
        p_ip: 'Unknown',
        p_user_agent: userAgent
      });

      if (error) throw error;
      
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to reset password');
      }

      // Automatically log in the user with the new session
      if (data.session_token && data.user) {
        SessionService.setSession(data.session_token, data.user);
        window.dispatchEvent(new Event('auth_state_changed'));
      }

      return data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }
}

export default AuthService;
