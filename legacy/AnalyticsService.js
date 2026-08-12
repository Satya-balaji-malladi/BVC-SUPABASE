/**
 * Service for enterprise-grade analytics aggregation and chart data generation.
 * Pulls from existing Sheets records. Does not write or mutate any state.
 */
const AnalyticsService = {
  _requestCache: null,

  _safeGetDate: function(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  },

  _getAnalyticsCacheKey: function(userId, type) {
    return `dashboard_stats_analytics_${userId}_${type}`;
  },

  _getCache: function(userId) {
    if (this._requestCache) return this._requestCache;

    const allEventsResponse = EventService.getAllEvents() || [];
    const allEvents = Array.isArray(allEventsResponse) ? allEventsResponse : (allEventsResponse.data || []);
    const allStudentsResponse = StudentService.getAllStudents();
    const allStudents = (allStudentsResponse && allStudentsResponse.success) ? allStudentsResponse.students : [];
    const allAttendance = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
    const allUsers = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
    const allParticipants = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];

    const studentMap = new Map();
    (allStudents || []).forEach(s => {
      const roll = s['Roll Number'] || s.roll_number || s.rollNumber;
      if (roll) studentMap.set(String(roll).trim().toUpperCase(), s);
    });

    const userMap = new Map();
    (allUsers || []).forEach(u => {
      const uId = u['User ID'] || u.user_id || u.userId;
      if (uId) userMap.set(String(uId).trim(), u);
    });

    const userRecord = userMap.get(String(userId).trim());
    let authorizedEvents = allEvents;
    let authorizedStudents = allStudents;
    let authorizedUsers = allUsers;
    if (userRecord) {
      const roleStr = String(userRecord['Role'] || userRecord.role || '').toUpperCase();
      const deptStr = String(userRecord['Department'] || userRecord.department || '').trim().toUpperCase();
      const normRole = roleStr.replace(/[\s_]+/g, '');
      const userContext = {
        userId: userId,
        role: userRecord['Role'] || userRecord.role,
        department: deptStr,
        isSuperAdmin: normRole === 'SUPERADMIN',
        isAdmin: normRole === 'SUPERADMIN' || normRole === 'ADMIN' || normRole === 'EVENTADMIN',
        isEventAdmin: normRole === 'EVENTADMIN',
        isHOD: normRole === 'HOD',
        isCoordinator: normRole === 'COORDINATOR'
      };
      authorizedEvents = SecurityUtils.applyEventRLS(allEvents, userContext);
      authorizedStudents = SecurityUtils.applyStudentRLS(allStudents, userContext);
      authorizedUsers = SecurityUtils.applyUserRLS(allUsers, userContext);
    }

    const authorizedEventIds = new Set((authorizedEvents || []).map(e => e.event_id || e.eventId || e['Event ID']));
    const authorizedAttendance = (allAttendance || []).filter(a => {
      const eId = a['Event ID'] || a.event_id || a.eventId;
      const deletionKey = CONFIG.COLUMNS.DELETION_FLAG || 'Deletion Flag';
      const isDeleted = a[deletionKey] === true || a[deletionKey] === 'true';
      return authorizedEventIds.has(eId) && !isDeleted;
    });

    const authorizedParticipants = (allParticipants || []).filter(p => {
      const eId = p['Event ID'] || p.event_id;
      const isCancelled = p['Registration Status'] === 'Cancelled' || p.status === 'Cancelled';
      return authorizedEventIds.has(eId) && !isCancelled;
    });

    this._requestCache = {
      events: authorizedEvents,
      students: authorizedStudents,
      attendance: authorizedAttendance,
      users: authorizedUsers,
      participants: authorizedParticipants,
      studentMap,
      userMap,
      authorizedEvents,
      authorizedAttendance,
      authorizedEventIds,
      allEvents,
      allStudents,
      allUsers
    };
    return this._requestCache;
  },

  _clearCache: function() {
    this._requestCache = null;
  },

  _calculatePercentage: function(present, total) {
    if (!total || total === 0) return 0;
    return Number(((present / total) * 100).toFixed(2));
  },

  /**
   * Generates single-event scoped analytics graphs & metric breakdowns.
   * Scoped strictly to the selected eventId.
   */
  getSingleEventAnalytics: function (sessionToken, eventId) {
    return SessionService.withSession(sessionToken, function (userId) {
      try {
        if (!eventId) return Utils.buildResponse(false, 'Target Event ID required.');

        var attendanceLogs = DatabaseService.findByColumn(CONFIG.SHEETS.ATTENDANCE, 'event_id', eventId, { strict: true }) || [];
        var allStudents = DatabaseService.readAllRows(CONFIG.SHEETS.STUDENTS) || [];

        var studentMap = {};
        allStudents.forEach(function (s) {
          var r = String(s.roll_number || s['Roll Number'] || '').toUpperCase().trim();
          if (r) studentMap[r] = s;
        });

        var deptWise = {};
        var yearWise = {};
        var hourlyWise = {};
        var collegeWise = {};

        attendanceLogs.forEach(function (att) {
          var roll = String(att.roll_number || att['Roll Number'] || '').toUpperCase().trim();
          var sObj = studentMap[roll] || {};

          var dept = sObj.department_id || sObj['Department ID'] || 'CSE';
          deptWise[dept] = (deptWise[dept] || 0) + 1;

          var year = 'Year ' + (sObj.year || sObj.Year || 1);
          yearWise[year] = (yearWise[year] || 0) + 1;

          var college = sObj.college || sObj.College || 'BVC';
          collegeWise[college] = (collegeWise[college] || 0) + 1;

          var dt = new Date(att.attendance_timestamp || att.created_at);
          var hr = !isNaN(dt.getTime()) ? dt.getHours() + ':00' : 'Unknown';
          hourlyWise[hr] = (hourlyWise[hr] || 0) + 1;
        });

        return Utils.buildResponse(true, 'Single event analytics retrieved.', {
          eventId: eventId,
          totalPresent: attendanceLogs.length,
          deptWise: deptWise,
          yearWise: yearWise,
          collegeWise: collegeWise,
          hourlyWise: hourlyWise
        });

      } catch (e) {
        Logger.log('[ERROR][AnalyticsService.getSingleEventAnalytics] ' + (e.message || e));
        return Utils.buildResponse(false, 'Failed to fetch single event analytics: ' + (e.message || e));
      }
    });
  },

  getAnalyticsSummary: function(userId) {
    try {
      const cacheKey = this._getAnalyticsCacheKey(userId, 'summary');
      if (typeof CacheManager !== 'undefined') {
        const cached = CacheManager.get(cacheKey);
        if (cached !== null) return cached;
      }

      const cache = this._getCache(userId);
      const events = cache.authorizedEvents;
      const attendance = cache.authorizedAttendance;
      const participants = cache.participants;

      const totalPresent = attendance.filter(a => (a['Attendance Status'] || a.status) === CONFIG.ATTENDANCE_STATUS.PRESENT).length;
      const totalParticipants = participants.length;

      // Current and prior month stats for growth calculations
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed

      const getMonthStats = (year, month) => {
        const monthEvents = events.filter(e => {
          const d = this._safeGetDate(e.start_date || e['Start Date']);
          return d && d.getFullYear() === year && d.getMonth() === month;
        });
        const monthEventIds = new Set(monthEvents.map(e => e.event_id || e['Event ID']));
        const monthAtt = attendance.filter(a => monthEventIds.has(a['Event ID'] || a.event_id));
        const monthPresent = monthAtt.filter(a => (a['Attendance Status'] || a.status) === CONFIG.ATTENDANCE_STATUS.PRESENT).length;
        
        return {
          eventsCount: monthEvents.length,
          presentCount: monthPresent,
          totalCount: monthAtt.length
        };
      };

      const currentStats = getMonthStats(currentYear, currentMonth);
      
      const priorMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const priorYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const priorStats = getMonthStats(priorYear, priorMonth);

      const calculateGrowth = (curr, prev) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return Number((((curr - prev) / prev) * 100).toFixed(1));
      };

      const eventGrowth = calculateGrowth(currentStats.eventsCount, priorStats.eventsCount);
      const checkinGrowth = calculateGrowth(currentStats.presentCount, priorStats.presentCount);
      const rateGrowth = Number((this._calculatePercentage(currentStats.presentCount, currentStats.totalCount) - this._calculatePercentage(priorStats.presentCount, priorStats.totalCount)).toFixed(1));

      const resp = Utils.buildResponse(true, 'Analytics summary fetched successfully', {
        summary: {
          totalEvents: events.length,
          totalParticipants: totalParticipants,
          totalCheckIns: totalPresent,
          overallAttendanceRate: this._calculatePercentage(totalPresent, attendance.length),
          growth: {
            events: eventGrowth,
            checkins: checkinGrowth,
            rate: rateGrowth
          }
        }
      });

      if (typeof CacheManager !== 'undefined') {
        CacheManager.put(cacheKey, resp, 180);
      }
      return resp;
    } catch (e) {
      return Utils.buildResponse(false, e.message);
    }
  },

  getTrendData: function(userId) {
    try {
      const cacheKey = this._getAnalyticsCacheKey(userId, 'trend');
      if (typeof CacheManager !== 'undefined') {
        const cached = CacheManager.get(cacheKey);
        if (cached !== null) return cached;
      }

      const cache = this._getCache(userId);
      const events = cache.authorizedEvents;
      const attendance = cache.authorizedAttendance;

      // Group by Year-Month for the last 6 months
      const monthMap = {};
      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.getFullYear() + '-' + Utils.padNumber(d.getMonth() + 1, 2);
        monthMap[key] = { label: d.toLocaleString('default', { month: 'short', year: '2-digit' }), present: 0, total: 0, eventsCount: 0 };
      }

      events.forEach(e => {
        const d = this._safeGetDate(e.start_date || e['Start Date']);
        if (!d) return;
        const key = d.getFullYear() + '-' + Utils.padNumber(d.getMonth() + 1, 2);
        if (monthMap[key]) {
          monthMap[key].eventsCount++;
        }
      });

      attendance.forEach(a => {
        const timestamp = a['Timestamp'] || a['Date'] || a.attendance_time;
        const d = this._safeGetDate(timestamp);
        if (!d) return;
        const key = d.getFullYear() + '-' + Utils.padNumber(d.getMonth() + 1, 2);
        if (monthMap[key]) {
          monthMap[key].total++;
          if ((a['Attendance Status'] || a.status) === CONFIG.ATTENDANCE_STATUS.PRESENT) {
            monthMap[key].present++;
          }
        }
      });

      const labels = [];
      const rates = [];
      const volumes = [];
      const eventCounts = [];

      Object.keys(monthMap).sort().forEach(k => {
        const m = monthMap[k];
        labels.push(m.label);
        rates.push(this._calculatePercentage(m.present, m.total));
        volumes.push(m.present);
        eventCounts.push(m.eventsCount);
      });

      const resp = Utils.buildResponse(true, 'Trend data fetched', {
        labels,
        rates,
        volumes,
        eventCounts
      });

      if (typeof CacheManager !== 'undefined') {
        CacheManager.put(cacheKey, resp, 180);
      }
      return resp;
    } catch (e) {
      return Utils.buildResponse(false, e.message);
    }
  },

  getDepartmentData: function(userId) {
    try {
      const cache = this._getCache(userId);
      const students = cache.students;
      const attendance = cache.authorizedAttendance;

      const deptMap = {};

      students.forEach(s => {
        const dept = s['Department ID'] || s.department || 'Unknown';
        if (!deptMap[dept]) {
          deptMap[dept] = { studentsCount: 0, present: 0, total: 0 };
        }
        deptMap[dept].studentsCount++;
      });

      attendance.forEach(a => {
        const roll = a['Roll Number'] || a.roll_number;
        const s = cache.studentMap.get(String(roll).trim().toUpperCase());
        if (s) {
          const dept = s['Department ID'] || s.department || 'Unknown';
          if (!deptMap[dept]) {
            deptMap[dept] = { studentsCount: 0, present: 0, total: 0 };
          }
          deptMap[dept].total++;
          if ((a['Attendance Status'] || a.status) === CONFIG.ATTENDANCE_STATUS.PRESENT) {
            deptMap[dept].present++;
          }
        }
      });

      const labels = [];
      const rates = [];
      const studentCounts = [];

      Object.keys(deptMap).forEach(dept => {
        labels.push(dept);
        rates.push(this._calculatePercentage(deptMap[dept].present, deptMap[dept].total));
        studentCounts.push(deptMap[dept].studentsCount);
      });

      return Utils.buildResponse(true, 'Department data fetched', {
        labels,
        rates,
        studentCounts
      });
    } catch (e) {
      return Utils.buildResponse(false, e.message);
    }
  },

  getEventWiseData: function(userId) {
    try {
      const cache = this._getCache(userId);
      const events = cache.authorizedEvents.filter(e => (e.status || e['Event Status']) === CONFIG.EVENT_STATUS.COMPLETED);
      const attendance = cache.authorizedAttendance;

      const labels = [];
      const rates = [];
      const volumes = [];

      // Sort events by date limit to last 10 completed events
      const sortedEvents = events.sort((a, b) => {
        return new Date(b.start_date || b['Start Date']) - new Date(a.start_date || a['Start Date']);
      }).slice(0, 10).reverse();

      sortedEvents.forEach(e => {
        const eId = e.event_id || e['Event ID'];
        const name = e.event_name || e['Event Name'] || eId;

        const eventAtt = attendance.filter(a => String(a['Event ID'] || a.event_id) === String(eId));
        const present = eventAtt.filter(a => (a['Attendance Status'] || a.status) === CONFIG.ATTENDANCE_STATUS.PRESENT).length;

        labels.push(name);
        rates.push(this._calculatePercentage(present, eventAtt.length));
        volumes.push(present);
      });

      return Utils.buildResponse(true, 'Event wise data fetched', {
        labels,
        rates,
        volumes
      });
    } catch (e) {
      return Utils.buildResponse(false, e.message);
    }
  },

  getCheckInPatterns: function(userId) {
    try {
      const cache = this._getCache(userId);
      const attendance = cache.authorizedAttendance;

      // Hourly blocks from 8 AM to 5 PM
      const hourMap = {
        '08 AM': 0, '09 AM': 0, '10 AM': 0, '11 AM': 0,
        '12 PM': 0, '01 PM': 0, '02 PM': 0, '03 PM': 0,
        '04 PM': 0, '05 PM': 0, 'Other': 0
      };

      attendance.forEach(a => {
        if ((a['Attendance Status'] || a.status) !== CONFIG.ATTENDANCE_STATUS.PRESENT) return;
        const timestamp = a['Timestamp'] || a['Date'] || a.attendance_time;
        if (!timestamp) return;

        const d = new Date(timestamp);
        const hour = d.getHours();
        let label = 'Other';

        if (hour >= 8 && hour <= 17) {
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour > 12 ? hour - 12 : hour;
          label = Utils.padNumber(displayHour, 2) + ' ' + ampm;
        }

        if (hourMap[label] !== undefined) {
          hourMap[label]++;
        } else {
          hourMap['Other']++;
        }
      });

      const labels = Object.keys(hourMap);
      const counts = Object.values(hourMap);

      return Utils.buildResponse(true, 'Check-in hourly pattern data fetched', {
        labels,
        counts
      });
    } catch (e) {
      return Utils.buildResponse(false, e.message);
    }
  },

  getPerformanceDistribution: function(userId) {
    try {
      const cache = this._getCache(userId);
      const students = cache.students;
      const attendance = cache.authorizedAttendance;

      // Track attendance counts per student
      const studentStats = {};
      students.forEach(s => {
        const roll = String(s['Roll Number'] || s.roll_number || s.rollNumber).trim().toUpperCase();
        if (roll) {
          studentStats[roll] = { present: 0, total: 0 };
        }
      });

      attendance.forEach(a => {
        const roll = String(a['Roll Number'] || a.roll_number).trim().toUpperCase();
        if (studentStats[roll]) {
          studentStats[roll].total++;
          if ((a['Attendance Status'] || a.status) === CONFIG.ATTENDANCE_STATUS.PRESENT) {
            studentStats[roll].present++;
          }
        }
      });

      const tiers = {
        'Excellent (>=90%)': 0,
        'Good (75-89%)': 0,
        'Warning (50-74%)': 0,
        'Critical (<50%)': 0,
        'Unregistered': 0
      };

      Object.values(studentStats).forEach(s => {
        if (s.total === 0) {
          tiers['Unregistered']++;
          return;
        }
        const rate = this._calculatePercentage(s.present, s.total);
        if (rate >= 90) tiers['Excellent (>=90%)']++;
        else if (rate >= 75) tiers['Good (75-89%)']++;
        else if (rate >= 50) tiers['Warning (50-74%)']++;
        else tiers['Critical (<50%)']++;
      });

      return Utils.buildResponse(true, 'Performance distribution fetched', {
        labels: Object.keys(tiers),
        counts: Object.values(tiers)
      });
    } catch (e) {
      return Utils.buildResponse(false, e.message);
    }
  },

  getDefaulterDistribution: function(userId) {
    try {
      const cache = this._getCache(userId);
      const students = cache.students;
      const attendance = cache.authorizedAttendance;

      const studentStats = {};
      students.forEach(s => {
        const roll = String(s['Roll Number'] || s.roll_number || s.rollNumber).trim().toUpperCase();
        if (roll) {
          studentStats[roll] = { roll: roll, dept: s['Department ID'] || s.department || 'Unknown', present: 0, total: 0 };
        }
      });

      attendance.forEach(a => {
        const roll = String(a['Roll Number'] || a.roll_number).trim().toUpperCase();
        if (studentStats[roll]) {
          studentStats[roll].total++;
          if ((a['Attendance Status'] || a.status) === CONFIG.ATTENDANCE_STATUS.PRESENT) {
            studentStats[roll].present++;
          }
        }
      });

      const defaultersDeptMap = {};

      Object.values(studentStats).forEach(s => {
        if (s.total === 0) return;
        const rate = this._calculatePercentage(s.present, s.total);
        if (rate < 75) {
          const dept = s.dept;
          defaultersDeptMap[dept] = (defaultersDeptMap[dept] || 0) + 1;
        }
      });

      const labels = Object.keys(defaultersDeptMap);
      const counts = Object.values(defaultersDeptMap);

      return Utils.buildResponse(true, 'Defaulters department distribution fetched', {
        labels,
        counts
      });
    } catch (e) {
      return Utils.buildResponse(false, e.message);
    }
  },

  getLeaderboard: function(userId) {
    try {
      const cache = this._getCache(userId);
      const students = cache.students;
      const attendance = cache.authorizedAttendance;

      const studentStats = {};
      students.forEach(s => {
        const roll = String(s['Roll Number'] || s.roll_number || s.rollNumber).trim().toUpperCase();
        if (roll) {
          studentStats[roll] = {
            roll_number: roll,
            student_name: s['Student Name'] || s.student_name || roll,
            department: s['Department ID'] || s.department || 'Unknown',
            present: 0,
            total: 0
          };
        }
      });

      attendance.forEach(a => {
        const roll = String(a['Roll Number'] || a.roll_number).trim().toUpperCase();
        if (studentStats[roll]) {
          studentStats[roll].total++;
          if ((a['Attendance Status'] || a.status) === CONFIG.ATTENDANCE_STATUS.PRESENT) {
            studentStats[roll].present++;
          }
        }
      });

      const list = Object.values(studentStats)
        .filter(s => s.total > 0)
        .map(s => ({
          roll_number: s.roll_number,
          student_name: s.student_name,
          department: s.department,
          events_attended: s.present,
          attendance_percentage: this._calculatePercentage(s.present, s.total)
        }))
        .sort((a, b) => b.events_attended - a.events_attended || b.attendance_percentage - a.attendance_percentage)
        .slice(0, 10);

      return Utils.buildResponse(true, 'Leaderboard data fetched', { leaderboard: list });
    } catch (e) {
      return Utils.buildResponse(false, e.message);
    }
  },

  /**
   * Generates Cross-Department Participation Matrix, Top Cross-Dept Events, and Top Cross-Dept Students analytics.
   * @param {string} userId - Caller user ID.
   * @returns {object} Response object with cross-dept matrix metrics.
   */
  getCrossDepartmentMatrix: function (userId) {
    try {
      const cache = this._getCache(userId);
      const attendance = cache.authorizedAttendance || [];
      const eventsMap = new Map((cache.allEvents || []).map(e => [String(e.event_id || e['Event ID']).trim(), e]));
      const studentMap = cache.studentMap;

      const matrix = {}; // { fromDept: { toDept: count } }
      const eventCrossCounts = {}; // { eventId: count }
      const studentCrossCounts = {}; // { roll: { name, homeDept, count } }
      let totalCrossScans = 0;

      attendance.forEach(a => {
        if ((a['Attendance Status'] || a.status) !== CONFIG.ATTENDANCE_STATUS.PRESENT) return;
        const eId = String(a['Event ID'] || a.event_id || '').trim();
        const roll = String(a['Roll Number'] || a.roll_number || '').trim().toUpperCase();

        const evt = eventsMap.get(eId);
        const student = studentMap.get(roll);

        if (evt && student) {
          const homeDept = String(student['Department ID'] || student.department || student.department_id || 'Unknown').trim().toUpperCase();
          const rawHostDepts = String(evt['Departments'] || evt['Department'] || evt.departments || evt.department || 'General').trim().toUpperCase();
          const hostDepts = rawHostDepts.split(',').map(d => d.trim().replace(/[\s_]+/g, ''));

          // Check if student's home department is different from event host department
          const isCrossDept = (rawHostDepts !== 'ALL' && !hostDepts.includes(homeDept.replace(/[\s_]+/g, '')));

          if (isCrossDept) {
            totalCrossScans++;
            const primaryHostDept = hostDepts[0] || 'General';

            // Matrix tally
            if (!matrix[homeDept]) matrix[homeDept] = {};
            matrix[homeDept][primaryHostDept] = (matrix[homeDept][primaryHostDept] || 0) + 1;

            // Top Event tally
            eventCrossCounts[eId] = (eventCrossCounts[eId] || 0) + 1;

            // Top Student tally
            if (!studentCrossCounts[roll]) {
              studentCrossCounts[roll] = {
                rollNumber: roll,
                studentName: student['Student Name'] || student.student_name || roll,
                homeDept: homeDept,
                crossDeptScans: 0
              };
            }
            studentCrossCounts[roll].crossDeptScans++;
          }
        }
      });

      // Top Cross-Dept Events
      const topCrossEvents = Object.keys(eventCrossCounts)
        .map(eId => {
          const evt = eventsMap.get(eId);
          return {
            eventId: eId,
            eventName: evt ? (evt['Event Name'] || evt.event_name || eId) : eId,
            department: evt ? (evt['Department'] || evt.departments || 'General') : 'General',
            crossDeptCount: eventCrossCounts[eId]
          };
        })
        .sort((a, b) => b.crossDeptCount - a.crossDeptCount)
        .slice(0, 10);

      // Top Cross-Dept Students
      const topCrossStudents = Object.values(studentCrossCounts)
        .sort((a, b) => b.crossDeptScans - a.crossDeptScans)
        .slice(0, 10);

      return Utils.buildResponse(true, 'Cross-Department Matrix data generated successfully', {
        totalCrossScans: totalCrossScans,
        matrix: matrix,
        topCrossEvents: topCrossEvents,
        topCrossStudents: topCrossStudents
      });
    } catch (e) {
      return Utils.buildResponse(false, 'Failed to compute Cross-Department Matrix: ' + e.message);
    }
  }
};
