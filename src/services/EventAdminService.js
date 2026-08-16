import { supabase } from '../supabaseClient';
import SessionService from './SessionService';

class EventAdminService {
  getToken() {
    return SessionService.getToken();
  }

  async getEvents() {
    const user = SessionService.getUser();
    if (!user) throw new Error("No active session");
    
    const userId = user.user_id || user.id;
    const role = (user.role || '').replace(/\s+/g, '');

    let assignedEventIds = [];
    if (userId) {
      const { data: assignments } = await supabase
        .from('event_assignments')
        .select('event_id')
        .eq('user_id', userId)
        .eq('deletion_flag', false);
      if (assignments) {
        assignedEventIds = assignments.map(a => a.event_id).filter(Boolean);
      }
    }

    if (['SuperAdmin', 'Admin'].includes(role)) {
      const { data, error } = await supabase.from('events').select('*').order('start_date', { ascending: true });
      if (error) throw error;
      return data || [];
    } else {
      const queries = [];
      if (userId) queries.push(supabase.from('events').select('*').eq('organizer', userId));
      if (assignedEventIds.length > 0) queries.push(supabase.from('events').select('*').in('event_id', assignedEventIds));
      
      const results = await Promise.all(queries);
      const map = new Map();
      results.forEach(res => {
        if (res.data) res.data.forEach(ev => map.set(ev.event_id, ev));
        else if (res.error) console.warn("Error fetching events:", res.error);
      });
      return Array.from(map.values()).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    }
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
    const events = await this.getEvents();
    const eventIds = events.map(e => e.event_id);
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
    const events = await this.getEvents();
    const eventIds = events.map(e => e.event_id);
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
   * Auto-detects scenario from participant_eligibility + duration:
   *   A: bvc_only   + single_day
   *   B: bvc_only   + multi_day
   *   C: all_colleges + single_day
   *   D: all_colleges + multi_day
   */
  async getSingleEventAnalytics(eventId) {
    if (!eventId) throw new Error("Event ID is required");

    const token = this.getToken();
    if (!token) throw new Error("No active session");

    // 1. Validate authorization
    const events = await this.getEvents();
    const authorizedIds = events.map(e => String(e.event_id));
    if (!authorizedIds.includes(String(eventId))) {
      throw new Error("You are not authorized to view analytics for this event.");
    }

    // 2. Fetch event details (including scope field)
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('event_id, event_name, start_date, end_date, participant_eligibility, event_status, departments, location')
      .eq('event_id', eventId)
      .single();
    if (eventErr) throw eventErr;

    // 3. Classify event
    // Use UTC date parts only to avoid timezone drift
    const startParts = (event.start_date || '').split('-').map(Number);
    const endParts = (event.end_date || event.start_date || '').split('-').map(Number);
    const startUTC = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);
    const endUTC = Date.UTC(endParts[0], endParts[1] - 1, endParts[2]);
    const duration = Math.round((endUTC - startUTC) / (1000 * 60 * 60 * 24)) + 1;

    const scope = (event.participant_eligibility || 'bvc_only') === 'all_colleges'
      ? 'ALL_COLLEGE_STUDENTS'
      : 'BVC_STUDENTS_ONLY';
    const durationType = duration >= 2 ? 'MULTI_DAY' : 'SINGLE_DAY';

    event.duration = duration;
    event.scope = scope;
    event.durationType = durationType;

    // 4. Fetch registered participants
    const { data: participantsData, error: partErr } = await supabase
      .from('event_participants')
      .select('participant_id, roll_number, registration_status, registration_timestamp, registration_type')
      .eq('event_id', eventId)
      .eq('deletion_flag', false);
    if (partErr) throw partErr;
    const participants = participantsData || [];
    const rollNumbers = [...new Set(participants.map(p => p.roll_number))].filter(Boolean);

    // 5. Fetch student details from BOTH tables in parallel
    const studentMap = {};
    if (rollNumbers.length > 0) {
      const [{ data: bvcStudents }, { data: otherStudents }] = await Promise.all([
        supabase
          .from('students')
          .select('roll_number, student_name, department_id, year, section')
          .in('roll_number', rollNumbers),
        supabase
          .from('other_college_students')
          .select('roll_number, student_name, department, college_name, year')
          .in('roll_number', rollNumbers)
      ]);

      (bvcStudents || []).forEach(s => {
        studentMap[s.roll_number] = {
          name: s.student_name || 'N/A',
          dept: s.department_id || 'Unknown',
          year: s.year ? String(s.year) : 'Unknown',
          section: s.section || '-',
          college: 'BVC Engineering College'
        };
      });
      (otherStudents || []).forEach(s => {
        if (!studentMap[s.roll_number]) {
          studentMap[s.roll_number] = {
            name: s.student_name || 'N/A',
            dept: s.department || 'Unknown',
            year: s.year ? String(s.year) : 'Unknown',
            section: '-',
            college: s.college_name || 'Other Institution'
          };
        }
      });
    }

    // Populate defaults for unrecognized roll numbers
    participants.forEach(p => {
      if (!studentMap[p.roll_number]) {
        studentMap[p.roll_number] = { name: 'N/A', dept: 'Unknown', year: 'Unknown', section: '-', college: 'Unknown' };
      }
    });

    // 6. Fetch attendance records
    const { data: attendanceData, error: attErr } = await supabase
      .from('attendance')
      .select('attendance_id, roll_number, attendance_status, date, timestamp')
      .eq('event_id', eventId)
      .eq('deletion_flag', false);
    if (attErr) throw attErr;
    const attendance = attendanceData || [];

    // 7. Build daily attendance map (deduplicated per day)
    const dailyMap = {};
    attendance.filter(a => a.attendance_status === 'Present').forEach(a => {
      const dStr = a.date || (a.timestamp ? a.timestamp.split('T')[0] : null);
      if (!dStr) return;
      if (!dailyMap[dStr]) dailyMap[dStr] = new Set();
      dailyMap[dStr].add(a.roll_number);
    });

    // Build the full event date sequence (include days with zero attendance)
    const eventDateSequence = [];
    let cursor = new Date(startUTC);
    const endCursor = new Date(endUTC);
    while (cursor <= endCursor) {
      eventDateSequence.push(cursor.toISOString().split('T')[0]);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const sortedDays = eventDateSequence;

    // 8. Core metrics
    const totalParticipants = participants.length;
    const attendedRolls = new Set();
    Object.values(dailyMap).forEach(daySet => daySet.forEach(r => attendedRolls.add(r)));
    const totalPresent = [...attendedRolls].filter(r => rollNumbers.includes(r)).length;
    const totalAbsent = Math.max(0, totalParticipants - totalPresent);
    const attendanceRate = totalParticipants > 0 ? ((totalPresent / totalParticipants) * 100).toFixed(1) : '0.0';

    // 9. Department / Year / College distribution
    const deptMap = {};
    const yearMap = {};
    const collegeMap = {};

    participants.forEach(p => {
      const s = studentMap[p.roll_number];
      const dept = s?.dept || 'Unknown';
      const year = s?.year || 'Unknown';
      const college = s?.college || 'Unknown';
      const isPresent = attendedRolls.has(p.roll_number);

      if (!deptMap[dept]) deptMap[dept] = { dept, registered: 0, present: 0 };
      deptMap[dept].registered++;
      if (isPresent) deptMap[dept].present++;

      if (!yearMap[year]) yearMap[year] = { year, registered: 0, present: 0 };
      yearMap[year].registered++;
      if (isPresent) yearMap[year].present++;

      if (!collegeMap[college]) collegeMap[college] = { college, registered: 0, present: 0 };
      collegeMap[college].registered++;
      if (isPresent) collegeMap[college].present++;
    });

    // 10. Daily Attendance stats per event day
    const dailyAttendance = sortedDays.map((dStr, idx) => {
      const presentSet = dailyMap[dStr] || new Set();
      const presentRegistered = [...presentSet].filter(r => rollNumbers.includes(r)).length;
      return {
        dayLabel: `Day ${idx + 1}`,
        date: dStr,
        registered: totalParticipants,
        present: presentRegistered,
        rate: totalParticipants > 0 ? ((presentRegistered / totalParticipants) * 100).toFixed(1) : '0.0'
      };
    });

    // 11. Attendance trend (for multi-day)
    let trend = 'STABLE';
    if (dailyAttendance.length >= 2) {
      const rates = dailyAttendance.map(d => parseFloat(d.rate));
      const mid = Math.ceil(rates.length / 2);
      const avgFirst = rates.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
      const avgSecond = rates.slice(mid).reduce((a, b) => a + b, 0) / Math.max(1, rates.length - mid);
      if (avgSecond - avgFirst > 5) trend = 'INCREASING';
      else if (avgFirst - avgSecond > 5) trend = 'DECLINING';
    }

    // 12. Retention from Day 1
    const retention = [];
    if (sortedDays.length > 0 && dailyMap[sortedDays[0]]) {
      const day1Rolls = dailyMap[sortedDays[0]];
      sortedDays.forEach((dStr, idx) => {
        const daySet = dailyMap[dStr] || new Set();
        let retained = 0;
        daySet.forEach(r => { if (day1Rolls.has(r)) retained++; });
        retention.push({
          dayLabel: `Day ${idx + 1}`,
          retained,
          rate: day1Rolls.size > 0 ? ((retained / day1Rolls.size) * 100).toFixed(1) : '0.0'
        });
      });
    }

    // 13. Consistency + Heatmap (multi-day)
    let completedCount = 0;
    const participantConsistencyMap = {};
    const heatmapRows = [];

    participants.forEach(p => {
      let daysAttended = 0;
      const flags = sortedDays.map(dStr => {
        const present = dailyMap[dStr] && dailyMap[dStr].has(p.roll_number);
        if (present) daysAttended++;
        return present;
      });
      if (daysAttended === duration) completedCount++;
      participantConsistencyMap[daysAttended] = (participantConsistencyMap[daysAttended] || 0) + 1;

      if (heatmapRows.length < 60) {
        const s = studentMap[p.roll_number];
        heatmapRows.push({
          roll_number: p.roll_number,
          name: s?.name || p.roll_number,
          dept: s?.dept || 'Unknown',
          flags
        });
      }
    });

    const completionRate = totalParticipants > 0 ? ((completedCount / totalParticipants) * 100).toFixed(1) : '0.0';
    const avgDailyRate = dailyAttendance.length > 0
      ? (dailyAttendance.reduce((s, d) => s + parseFloat(d.rate), 0) / dailyAttendance.length).toFixed(1)
      : '0.0';

    const consistencyArray = Object.keys(participantConsistencyMap)
      .map(Number).sort((a, b) => b - a)
      .map(days => ({
        daysAttended: days,
        label: days === duration ? 'All Days' : (days === 0 ? 'No Days' : `${days} Day${days > 1 ? 's' : ''}`),
        count: participantConsistencyMap[days],
        pct: totalParticipants > 0 ? ((participantConsistencyMap[days] / totalParticipants) * 100).toFixed(0) : 0
      }));

    // 14. Enriched participant table
    const enrichedParticipants = participants.map(p => {
      const s = studentMap[p.roll_number];
      let daysAttended = 0;
      const attendanceFlags = sortedDays.map(dStr => {
        const present = dailyMap[dStr] && dailyMap[dStr].has(p.roll_number);
        if (present) daysAttended++;
        return present;
      });
      const pRate = duration > 0
        ? ((daysAttended / duration) * 100).toFixed(0)
        : (attendedRolls.has(p.roll_number) ? 100 : 0);

      const checkinRecord = durationType === 'SINGLE_DAY'
        ? attendance.find(a => a.roll_number === p.roll_number && a.attendance_status === 'Present')
        : null;

      return {
        roll_number: p.roll_number,
        name: s?.name || 'N/A',
        department: s?.dept || 'Unknown',
        year: s?.year || 'Unknown',
        section: s?.section || '-',
        college: s?.college || 'Unknown',
        registration_type: p.registration_type || 'Online',
        days_attended: daysAttended,
        attendance_percentage: pRate,
        attendance_flags: attendanceFlags,
        checkin_time: checkinRecord?.timestamp || null
      };
    });

    return {
      event,
      scenario: { scope, durationType, duration },
      overview: {
        totalParticipants,
        totalPresent,
        totalAbsent,
        attendanceRate,
        avgDailyRate,
        completionRate,
        departmentCount: Object.keys(deptMap).length,
        collegeCount: Object.keys(collegeMap).length,
        trend
      },
      departments: Object.values(deptMap)
        .map(d => ({ ...d, rate: d.registered > 0 ? ((d.present / d.registered) * 100).toFixed(1) : '0.0' }))
        .sort((a, b) => b.registered - a.registered),
      years: Object.values(yearMap)
        .map(y => ({ ...y, rate: y.registered > 0 ? ((y.present / y.registered) * 100).toFixed(1) : '0.0' }))
        .sort((a, b) => String(a.year).localeCompare(String(b.year))),
      colleges: Object.values(collegeMap)
        .map(c => ({ ...c, rate: c.registered > 0 ? ((c.present / c.registered) * 100).toFixed(1) : '0.0' }))
        .sort((a, b) => b.registered - a.registered),
      dailyAttendance,
      retention,
      consistency: consistencyArray,
      heatmap: { days: sortedDays.map((d, i) => ({ date: d, label: `Day ${i + 1}` })), rows: heatmapRows },
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

