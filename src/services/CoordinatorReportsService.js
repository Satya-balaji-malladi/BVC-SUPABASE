import { supabase } from '../supabaseClient';
import SessionService from './SessionService';

class CoordinatorReportsService {
  getToken() {
    return SessionService.getToken();
  }

  async getAssignedEvents() {
    const token = this.getToken();
    if (!token) throw new Error("No active session");
    
    // Using the secure RPC
    const { data, error } = await supabase.rpc('get_authorized_event_ids', { p_token: token });
    if (error) throw error;
    
    const eventIds = (data || []).map(e => e.get_authorized_event_ids || e.event_id || e);
    if (eventIds.length === 0) return [];

    const { data: events, error: evErr } = await supabase
      .from('events')
      .select('*')
      .in('event_id', eventIds);
      
    if (evErr) throw evErr;
    return events || [];
  }

  async getEventParticipants(eventId) {
    if (!eventId) return [];
    const token = this.getToken();
    if (!token) throw new Error("No active session");
    
    const { data, error } = await supabase.rpc('get_secure_event_participants', { 
      p_token: token, 
      p_event_id: eventId 
    });
    
    if (error) throw error;
    return data || [];
  }

  async getEventAttendance(eventId) {
    if (!eventId) return [];
    const token = this.getToken();
    if (!token) throw new Error("No active session");
    
    const { data, error } = await supabase.rpc('get_secure_event_attendance', { 
      p_token: token, 
      p_event_id: eventId 
    });
    
    if (error) throw error;
    return data || [];
  }
}

export default new CoordinatorReportsService();
