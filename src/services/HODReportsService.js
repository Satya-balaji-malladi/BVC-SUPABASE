import { supabase } from '../supabaseClient';
import SessionService from './SessionService';

class HODReportsService {
  /**
   * Helper to execute a secure HOD RPC by passing the session token
   */
  static async executeSecureRPC(rpcName, additionalParams = {}) {
    const token = SessionService.getToken();
    if (!token) throw new Error("No session token available for authorization");

    const { data, error } = await supabase.rpc(rpcName, { p_token: token, ...additionalParams });
    if (error) throw error;
    return data;
  }

  static async getDashboardSummary() {
    return this.executeSecureRPC('get_hod_dashboard_summary');
  }

  static async getStudentReport() {
    return this.executeSecureRPC('get_hod_student_report');
  }

  static async getEventReport() {
    return this.executeSecureRPC('get_hod_event_report');
  }
}

export default HODReportsService;
