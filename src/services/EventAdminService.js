import { supabase } from '../supabaseClient';
import SessionService from './SessionService';

class EventAdminService {
  getToken() {
    return SessionService.getToken();
  }

  async getEvents() {
    const user = SessionService.getUser();
    if (!user) throw new Error("No active session");
    
    // Fallback to direct query instead of RPC
    const userId = user.user_id || user.id;
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('organizer', userId);
      
    if (error) {
      console.error("Direct Fetch Error getEvents:", JSON.stringify(error, null, 2));
      throw error;
    }
    return data || [];
  }

  async getTeam() {
    const token = this.getToken();
    if (!token) throw new Error("No active session");
    
    const { data, error } = await supabase.rpc('ea_get_team', { p_token: token });
    if (error) {
      console.error("RPC Error ea_get_team:", JSON.stringify(error, null, 2));
      throw error;
    }
    return data || [];
  }

  async getParticipants() {
    const token = this.getToken();
    if (!token) throw new Error("No active session");
    
    const { data: authEvents, error: authErr } = await supabase.rpc('get_authorized_event_ids', { p_token: token });
    if (authErr) throw authErr;
    
    const eventIds = (authEvents || []).map(e => e.get_authorized_event_ids || e.event_id || e);
    if (eventIds.length === 0) return [];

    const { data, error } = await supabase
      .from('event_participants')
      .select('*')
      .in('event_id', eventIds);

    if (error) {
      console.error("Direct Fetch Error getParticipants:", JSON.stringify(error, null, 2));
      throw error;
    }
    
    const participants = data || [];
    if (participants.length === 0) return [];

    const rollNumbers = [...new Set(participants.map(p => p.roll_number))].filter(Boolean);
    const { data: studentsData } = await supabase
      .from('students')
      .select('roll_number, student_name, department_id, year, section, email_address, phone_number')
      .in('roll_number', rollNumbers);

    const studentMap = (studentsData || []).reduce((acc, s) => {
      acc[s.roll_number] = s;
      return acc;
    }, {});
    
    return participants.map(p => {
      const s = studentMap[p.roll_number];
      return {
        participant_id: p.participant_id,
        event_id: p.event_id,
        roll_number: p.roll_number,
        registration_status: p.registration_status,
        attendance_status: p.attendance_status,
        registration_timestamp: p.registration_timestamp,
        first_name: s?.student_name || 'N/A',
        last_name: '',
        department: s?.department_id || '--',
        year: s?.year || '--',
        section: s?.section || '--',
        email_address: s?.email_address || '--',
        phone_number: s?.phone_number || '--',
        registration_type: p.registration_type
      };
    });
  }

  async getAttendance() {
    const token = this.getToken();
    if (!token) throw new Error("No active session");
    
    const { data: authEvents, error: authErr } = await supabase.rpc('get_authorized_event_ids', { p_token: token });
    if (authErr) throw authErr;
    
    const eventIds = (authEvents || []).map(e => e.get_authorized_event_ids || e.event_id || e);
    if (eventIds.length === 0) return [];

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .in('event_id', eventIds);

    if (error) {
      console.error("Direct Fetch Error getAttendance:", JSON.stringify(error, null, 2));
      throw error;
    }
    
    const attendanceRecords = data || [];
    if (attendanceRecords.length === 0) return [];

    const rollNumbers = [...new Set(attendanceRecords.map(a => a.roll_number))].filter(Boolean);
    const { data: studentsData } = await supabase
      .from('students')
      .select('roll_number, student_name, department_id, year, section, email_address, phone_number')
      .in('roll_number', rollNumbers);

    const studentMap = (studentsData || []).reduce((acc, s) => {
      acc[s.roll_number] = s;
      return acc;
    }, {});
    
    return attendanceRecords.map(a => {
      const s = studentMap[a.roll_number];
      return {
        attendance_id: a.attendance_id,
        event_id: a.event_id,
        roll_number: a.roll_number,
        attendance_status: a.attendance_status,
        attendance_method: a.attendance_method,
        date: a.date,
        time: a.time,
        timestamp: a.timestamp,
        location: a.location,
        first_name: s?.student_name || 'N/A',
        last_name: '',
        department: s?.department_id || '--',
        year: s?.year || '--',
        section: s?.section || '--',
        email_address: s?.email_address || '--',
        phone_number: s?.phone_number || '--'
      };
    });
  }

  async getDashboardStats() {
    const token = this.getToken();
    if (!token) throw new Error("No active session");
    
    const { data, error } = await supabase.rpc('ea_get_dashboard_stats', { p_token: token });
    if (error) {
      console.error("RPC Error ea_get_dashboard_stats:", JSON.stringify(error, null, 2));
      throw error;
    }
    return data || null;
  }

  /**
   * Generates a complete analytics payload for a single selected event.
   * Handles Multi-Day and Single-Day calculations purely in javascript
   * using a small number of optimized backend queries.
   */
  async getSingleEventAnalytics(eventId) {
    if (!eventId) throw new Error("Event ID is required");
    
    const token = this.getToken();
    if (!token) throw new Error("No active session");
    
    // 1. Validate authorization
    const { data: authEvents, error: authErr } = await supabase.rpc('get_authorized_event_ids', { p_token: token });
    if (authErr) throw authErr;
    
    const authorizedIds = (authEvents || []).map(e => String(e.get_authorized_event_ids || e.event_id || e));
    if (!authorizedIds.includes(String(eventId))) {
        throw new Error("You are not authorized to view analytics for this event.");
    }

    // 2. Fetch event details
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('event_id, event_name, start_date, end_date')
      .eq('event_id', eventId)
      .single();
    if (eventErr) throw eventErr;

    // Calculate duration
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const duration = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    event.duration = duration;

    // 3. Fetch participants
    const { data: participantsData, error: partErr } = await supabase
      .from('event_participants')
      .select('participant_id, roll_number, registration_status, attendance_status')
      .eq('event_id', eventId)
      .eq('deletion_flag', false);
    
    if (partErr) throw partErr;
    const participants = participantsData || [];

    // 4. Fetch student details for these participants
    const studentMap = {};
    const rollNumbers = [...new Set(participants.map(p => p.roll_number))].filter(Boolean);
    if (rollNumbers.length > 0) {
      const { data: studentsData, error: stuErr } = await supabase
        .from('students')
        .select('roll_number, student_name, department_id, year, section')
        .in('roll_number', rollNumbers);
        
      if (!stuErr && studentsData) {
        studentsData.forEach(s => {
          studentMap[s.roll_number] = {
            name: s.student_name || 'N/A',
            dept: s.department_id || 'Unknown',
            year: s.year ? String(s.year) : 'Unknown',
            section: s.section || '-'
          };
        });
      }
    }

    // 4. Fetch attendance records
    const { data: attendanceData, error: attErr } = await supabase
      .from('attendance')
      .select('attendance_id, roll_number, attendance_status, date, timestamp')
      .eq('event_id', eventId)
      .eq('deletion_flag', false);
      
    if (attErr) throw attErr;
    const attendance = attendanceData || [];

    // --- PROCESS ANALYTICS ---
    const totalParticipants = participants.length;
    
    // Map roll_number -> Student data already done above
    // Populate defaults for missing students
    participants.forEach(p => {
      if (!studentMap[p.roll_number]) {
        studentMap[p.roll_number] = {
          name: 'N/A',
          dept: 'Unknown',
          year: 'Unknown',
          section: '-'
        };
      }
    });

    // We consider "Present" if they have at least one attendance record.
    // For single-day, simple count. For multi-day, attendance calculations differ.
    const attendedRolls = new Set(attendance.filter(a => a.attendance_status === 'Present').map(a => a.roll_number));
    const totalPresent = attendedRolls.size;
    const totalAbsent = Math.max(0, totalParticipants - totalPresent);
    const attendanceRate = totalParticipants > 0 ? ((totalPresent / totalParticipants) * 100).toFixed(1) : 0;

    // Department Stats
    const deptMap = {};
    const yearMap = {};
    
    participants.forEach(p => {
      const dept = studentMap[p.roll_number]?.dept || 'Unknown';
      const year = studentMap[p.roll_number]?.year || 'Unknown';
      const isPresent = attendedRolls.has(p.roll_number);
      
      if (!deptMap[dept]) deptMap[dept] = { dept, registered: 0, present: 0 };
      deptMap[dept].registered++;
      if (isPresent) deptMap[dept].present++;

      if (!yearMap[year]) yearMap[year] = { year, registered: 0, present: 0 };
      yearMap[year].registered++;
      if (isPresent) yearMap[year].present++;
    });

    // Daily Attendance (Multi-day)
    const dailyMap = {}; // { '2026-08-12': Set of roll_numbers }
    attendance.filter(a => a.attendance_status === 'Present').forEach(a => {
      const dStr = a.date || new Date(a.timestamp).toISOString().split('T')[0];
      if (!dailyMap[dStr]) dailyMap[dStr] = new Set();
      dailyMap[dStr].add(a.roll_number);
    });
    
    const sortedDays = Object.keys(dailyMap).sort();
    const dailyAttendance = sortedDays.map((dStr, idx) => ({
      dayLabel: `Day ${idx + 1}`,
      date: dStr,
      present: dailyMap[dStr].size
    }));

    // Retention (Returning participants based on Day 1)
    const retention = [];
    if (sortedDays.length > 0) {
      const day1Rolls = dailyMap[sortedDays[0]];
      sortedDays.forEach((dStr, idx) => {
        let retained = 0;
        dailyMap[dStr].forEach(r => {
          if (day1Rolls.has(r)) retained++;
        });
        retention.push({
          dayLabel: `Day ${idx + 1}`,
          retained: retained,
          rate: day1Rolls.size > 0 ? ((retained / day1Rolls.size) * 100).toFixed(1) : 0
        });
      });
    }

    // Completion Rate (Attended all days)
    let completedCount = 0;
    const participantConsistencyMap = { '0': 0 }; // Days attended -> count
    
    if (duration > 1) {
      participants.forEach(p => {
        let daysAttended = 0;
        sortedDays.forEach(dStr => {
          if (dailyMap[dStr] && dailyMap[dStr].has(p.roll_number)) daysAttended++;
        });
        if (daysAttended === duration) completedCount++;
        
        participantConsistencyMap[daysAttended] = (participantConsistencyMap[daysAttended] || 0) + 1;
      });
    }
    const completionRate = totalParticipants > 0 ? ((completedCount / totalParticipants) * 100).toFixed(1) : 0;
    
    const consistencyArray = Object.keys(participantConsistencyMap)
      .map(Number)
      .sort((a,b) => b-a)
      .map(days => ({
        daysAttended: days,
        label: days === duration ? 'All Days' : `${days} Day(s)`,
        count: participantConsistencyMap[days]
      }));

    // Generate enriched participant list for the table
    const enrichedParticipants = participants.map(p => {
      let daysAttended = 0;
      const attendanceArr = sortedDays.map(dStr => {
        const isPresent = dailyMap[dStr] && dailyMap[dStr].has(p.roll_number);
        if (isPresent) daysAttended++;
        return isPresent;
      });
      
      const pRate = duration > 0 ? ((daysAttended / duration) * 100).toFixed(0) : (attendedRolls.has(p.roll_number) ? 100 : 0);

      return {
        roll_number: p.roll_number,
        name: studentMap[p.roll_number]?.name,
        department: studentMap[p.roll_number]?.dept,
        year: studentMap[p.roll_number]?.year,
        days_attended: daysAttended,
        attendance_percentage: pRate,
        attendance_flags: attendanceArr // array of booleans mapped to days
      };
    });

    return {
      event: event,
      overview: {
        totalParticipants,
        totalPresent,
        totalAbsent,
        attendanceRate,
        departmentCount: Object.keys(deptMap).length,
        completionRate
      },
      departments: Object.values(deptMap).map(d => ({ ...d, rate: d.registered > 0 ? ((d.present/d.registered)*100).toFixed(1) : 0 })).sort((a,b) => b.registered - a.registered),
      years: Object.values(yearMap).map(y => ({ ...y, rate: y.registered > 0 ? ((y.present/y.registered)*100).toFixed(1) : 0 })).sort((a,b) => a.year.localeCompare(b.year)),
      dailyAttendance,
      retention,
      consistency: consistencyArray,
      participants: enrichedParticipants
    };
  }

  /**
   * Search existing Faculty members for assignment as Event Coordinator
   */
  async searchFaculty(queryStr) {
    try {
      const q = (queryStr || '').trim();

      // 1. Search in users table for Faculty, HOD, Event Admin roles
      let userQuery = supabase
        .from('users')
        .select('user_id, employee_id, first_name, last_name, email_address, role, department')
        .in('role', ['Faculty', 'HOD', 'Event Admin', 'SuperAdmin', 'Super Admin'])
        .eq('deletion_flag', false);

      if (q) {
        userQuery = userQuery.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,employee_id.ilike.%${q}%,email_address.ilike.%${q}%,department.ilike.%${q}%`);
      }

      const { data: userData, error: userErr } = await userQuery.limit(20);
      if (userErr) console.warn('User faculty search error:', userErr);

      const userResults = (userData || []).map(u => ({
        user_id: u.user_id,
        faculty_id: u.user_id,
        employee_id: u.employee_id || u.username || 'N/A',
        faculty_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Faculty Member',
        designation: u.role || 'Faculty',
        department: u.department || 'N/A',
        email: u.email_address || 'N/A'
      }));

      // 2. Also search faculty table if user results are sparse
      let facultyQuery = supabase.from('faculty').select('*');
      if (q) {
        facultyQuery = facultyQuery.or(`faculty_name.ilike.%${q}%,employee_id.ilike.%${q}%,email.ilike.%${q}%,department_id.ilike.%${q}%`);
      }
      const { data: facultyData } = await facultyQuery.limit(20);

      const facultyResults = (facultyData || []).map(f => ({
        user_id: f.user_id,
        faculty_id: f.faculty_id,
        employee_id: f.employee_id,
        faculty_name: f.faculty_name,
        designation: f.designation || 'Faculty Member',
        department: f.department_id || 'N/A',
        email: f.email || 'N/A'
      })).filter(f => !!f.user_id);

      // Combine results removing duplicates by user_id
      const combined = [...userResults];
      const seenUserIds = new Set(userResults.map(u => u.user_id));

      for (const f of facultyResults) {
        if (!seenUserIds.has(f.user_id)) {
          seenUserIds.add(f.user_id);
          combined.push(f);
        }
      }

      return combined;
    } catch (err) {
      console.error('searchFaculty error:', err);
      throw err;
    }
  }

  /**
   * Inline Coordinator Creation & Event Assignment logic
   * Supports STUDENT, GUEST, and FACULTY types with strict duplicate checks
   */
  async createInlineCoordinator({ coordinatorType, name, identifier, email, expiresAt, eventId, facultyUserId }) {
    try {
      const currentToken = this.getToken();
      if (!currentToken) throw new Error("No active session token");

      const sessionUser = SessionService.getUser();
      const currentUserId = sessionUser?.id || sessionUser?.user_id;

      // Type 1 & 2: STUDENT or GUEST Creation
      if (coordinatorType === 'STUDENT' || coordinatorType === 'GUEST') {
        if (!name || !name.trim()) throw new Error('Name is required.');
        if (!identifier || !identifier.trim()) throw new Error('Roll No / ID is required.');
        if (!email || !email.trim()) throw new Error('Email is required.');

        const cleanEmail = email.trim().toLowerCase();
        const cleanId = identifier.trim();

        // 1. Check duplicate Email in users table
        const { data: existingEmailUser, error: emailErr } = await supabase
          .from('users')
          .select('user_id, employee_id, email_address')
          .eq('email_address', cleanEmail)
          .maybeSingle();

        if (emailErr) throw emailErr;

        // 2. Check duplicate ID
        const { data: existingIdUser, error: idErr } = await supabase
          .from('users')
          .select('user_id, employee_id, email_address')
          .eq('employee_id', cleanId)
          .maybeSingle();

        if (idErr) throw idErr;

        let targetUserId = null;

        if (existingEmailUser || existingIdUser) {
          if (existingEmailUser?.user_id !== existingIdUser?.user_id && existingEmailUser && existingIdUser) {
            throw new Error('Email and ID belong to different existing accounts.');
          }
          const existingUser = existingEmailUser || existingIdUser;
          if (existingUser.email_address !== cleanEmail || existingUser.employee_id !== cleanId) {
             throw new Error('Provided Email/ID does not match the existing account records.');
          }
          targetUserId = existingUser.user_id;
        }

        if (targetUserId && expiresAt) {
          const { error: updateExpiryErr } = await supabase
            .from('users')
            .update({ account_expires_at: new Date(`${expiresAt}T23:59:59`).toISOString() })
            .eq('user_id', targetUserId);
          if (updateExpiryErr) console.warn('Failed to update account expiry for existing user:', updateExpiryErr);
        }

        // 3. Create User if not exists
        if (!targetUserId) {
          targetUserId = `U-${Date.now()}`;
          const defaultPassword = 'Bvc@123';
          const username = cleanEmail.split('@')[0] + Math.floor(Math.random() * 1000);

          const newUserPayload = {
            user_id: targetUserId,
            employee_id: cleanId,
            first_name: name.trim(),
            email_address: cleanEmail,
            username: username,
            password_hash: defaultPassword,
            salt: 'temp_salt',
            role: coordinatorType, // 'STUDENT' or 'GUEST'
            default_role: coordinatorType,
            status: 'Active',
            profile_completed: true,
            first_login: false,
            account_expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null
          };

          const { error: insertUserErr } = await supabase.from('users').insert([newUserPayload]);
          if (insertUserErr) {
            if (insertUserErr.message?.includes('duplicate key') || insertUserErr.code === '23505') {
              throw new Error('An account with this Email or Roll No / ID already exists.');
            }
            throw insertUserErr;
          }
        }

        // 4. Assign to Event if eventId provided
        if (eventId) {
          const { data: existingAssign } = await supabase
            .from('event_assignments')
            .select('assignment_id')
            .eq('event_id', eventId)
            .eq('user_id', targetUserId)
            .eq('deletion_flag', false)
            .maybeSingle();

          if (existingAssign) {
            throw new Error('This coordinator is already assigned to this event.');
          }

          const roleTitle = coordinatorType === 'STUDENT' ? 'Student Coordinator' : 'Guest Coordinator';
          const assignmentId = `ASG-${Date.now()}`;

          const { error: assignErr } = await supabase.from('event_assignments').insert([{
            assignment_id: assignmentId,
            event_id: eventId,
            user_id: targetUserId,
            role: roleTitle,
            coordinator_type: roleTitle,
            assigned_by: currentUserId,
            status: 'Active'
          }]);

          if (assignErr) throw assignErr;
        }

        return {
          success: true,
          user_id: targetUserId,
          name: name.trim(),
          role: coordinatorType,
          isNewUser: !existingEmailUser && !existingIdUser
        };
      }

      // Type 3: FACULTY Assignment
      if (coordinatorType === 'FACULTY') {
        if (!facultyUserId) throw new Error('Please select an existing Faculty member.');

        if (eventId) {
          const { data: existingAssign } = await supabase
            .from('event_assignments')
            .select('assignment_id')
            .eq('event_id', eventId)
            .eq('user_id', facultyUserId)
            .eq('deletion_flag', false)
            .maybeSingle();

          if (existingAssign) {
            throw new Error('This coordinator is already assigned to this event.');
          }

          const assignmentId = `ASG-${Date.now()}`;
          const { error: assignErr } = await supabase.from('event_assignments').insert([{
            assignment_id: assignmentId,
            event_id: eventId,
            user_id: facultyUserId,
            role: 'Faculty Coordinator',
            coordinator_type: 'Faculty Coordinator',
            assigned_by: currentUserId,
            status: 'Active'
          }]);

          if (assignErr) throw assignErr;
        }

        return {
          success: true,
          user_id: facultyUserId,
          role: 'Faculty'
        };
      }

      throw new Error('Invalid coordinator type specified.');
    } catch (err) {
      console.error('createInlineCoordinator error:', err);
      throw err;
    }
  }
}

export default new EventAdminService();

