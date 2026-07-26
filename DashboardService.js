/**
 * DashboardService.js
 * Service for computing dashboard statistics and recent audit activities.
 * Standardized caching using CacheManager under the dashboard_stats prefix.
 */
const DashboardService = {
  
  _getScopedCacheKey: function(baseKey, userContext) {
    if (!userContext) return baseKey;
    return baseKey + "_" + (userContext.role || 'ALL') + "_" + (userContext.department || 'ALL') + "_" + (userContext.userId || 'ALL');
  },

  getTotalUsersCount: function(userContext) {
    const cacheKey = this._getScopedCacheKey("dashboard_stats_users_count", userContext);
    if (typeof CacheManager !== 'undefined') {
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) return cached;
    }

    var users = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
    var activeUsers = users.filter(function(u) {
      return u[CONFIG.COLUMNS.DELETION_FLAG] !== true && u[CONFIG.COLUMNS.DELETION_FLAG] !== "true";
    });
    var scoped = userContext ? SecurityUtils.applyUserRLS(activeUsers, userContext) : activeUsers;
    const result = scoped.length;

    if (typeof CacheManager !== 'undefined') {
      CacheManager.put(cacheKey, result, 180);
    }
    return result;
  },

  getTotalCoordinatorsCount: function(userContext) {
    const cacheKey = this._getScopedCacheKey("dashboard_stats_coordinators_count", userContext);
    if (typeof CacheManager !== 'undefined') {
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) return cached;
    }

    var users = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
    var activeCoordinators = users.filter(function(u) {
      if (u[CONFIG.COLUMNS.DELETION_FLAG] === true || u[CONFIG.COLUMNS.DELETION_FLAG] === "true") return false;
      var role = u['Role'] || u.role;
      return role === 'COORDINATOR' || role === 'Coordinator';
    });
    var scoped = userContext ? SecurityUtils.applyUserRLS(activeCoordinators, userContext) : activeCoordinators;
    const result = scoped.length;

    if (typeof CacheManager !== 'undefined') {
      CacheManager.put(cacheKey, result, 180);
    }
    return result;
  },

  getTotalStudentsCount: function(userContext) {
    const cacheKey = this._getScopedCacheKey("dashboard_stats_students_count", userContext);
    if (typeof CacheManager !== 'undefined') {
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) return cached;
    }

    var students = DatabaseService.readAllRows(CONFIG.SHEETS.STUDENTS) || [];
    var activeStudents = students.filter(function(s) {
      return !s[CONFIG.COLUMNS.DELETION_FLAG];
    });
    var scoped = userContext ? SecurityUtils.applyStudentRLS(activeStudents, userContext) : activeStudents;
    const result = scoped.length;

    if (typeof CacheManager !== 'undefined') {
      CacheManager.put(cacheKey, result, 180);
    }
    return result;
  },

  getTotalEventsCount: function(userContext) {
    const cacheKey = this._getScopedCacheKey("dashboard_stats_events_count", userContext);
    if (typeof CacheManager !== 'undefined') {
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) return cached;
    }

    var events = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
    var activeEvents = events.filter(function(e) {
      return !e[CONFIG.COLUMNS.DELETION_FLAG];
    });
    var scoped = userContext ? SecurityUtils.applyEventRLS(activeEvents, userContext) : activeEvents;
    const result = scoped.length;

    if (typeof CacheManager !== 'undefined') {
      CacheManager.put(cacheKey, result, 180);
    }
    return result;
  },

  getActiveEventsCount: function(userContext) {
    const cacheKey = this._getScopedCacheKey("dashboard_stats_active_events_count", userContext);
    if (typeof CacheManager !== 'undefined') {
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) return cached;
    }

    var events = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
    var active = events.filter(function(e) {
      if (e[CONFIG.COLUMNS.DELETION_FLAG]) return false;
      var status = e["Event Status"] || e["Status"] || e.status;
      return status === "Active";
    });
    var scoped = userContext ? SecurityUtils.applyEventRLS(active, userContext) : active;
    const result = scoped.length;

    if (typeof CacheManager !== 'undefined') {
      CacheManager.put(cacheKey, result, 180);
    }
    return result;
  },

  getUpcomingEventsCount: function(userContext) {
    const cacheKey = this._getScopedCacheKey("dashboard_stats_upcoming_events_count", userContext);
    if (typeof CacheManager !== 'undefined') {
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) return cached;
    }

    var events = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
    var upcoming = events.filter(function(e) {
      if (e[CONFIG.COLUMNS.DELETION_FLAG]) return false;
      var status = e["Event Status"] || e["Status"] || e.status;
      return status === "Upcoming";
    });
    var scoped = userContext ? SecurityUtils.applyEventRLS(upcoming, userContext) : upcoming;
    const result = scoped.length;

    if (typeof CacheManager !== 'undefined') {
      CacheManager.put(cacheKey, result, 180);
    }
    return result;
  },

  getCompletedEventsCount: function(userContext) {
    const cacheKey = this._getScopedCacheKey("dashboard_stats_completed_events_count", userContext);
    if (typeof CacheManager !== 'undefined') {
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) return cached;
    }

    var events = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
    var completed = events.filter(function(e) {
      if (e[CONFIG.COLUMNS.DELETION_FLAG]) return false;
      var status = e["Event Status"] || e["Status"] || e.status;
      return status === "Completed";
    });
    var scoped = userContext ? SecurityUtils.applyEventRLS(completed, userContext) : completed;
    const result = scoped.length;

    if (typeof CacheManager !== 'undefined') {
      CacheManager.put(cacheKey, result, 180);
    }
    return result;
  },

  getAttendanceTodayCount: function(userId) {
    const cacheKey = "dashboard_stats_attendance_today_" + userId;
    if (typeof CacheManager !== 'undefined') {
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) return cached;
    }

    Logger.log("DASHBOARD_SERVICE | STEP 3 - Reading Google Sheet | Sheet Name: Reports / Sessions");
    var summary = ReportService.getDashboardSummary(userId);
    Logger.log("DASHBOARD_SERVICE | STEP 4 - Processing data");
    var s = (summary && summary.report) ? summary.report : {};
    const result = s.totalAttendance || 0;

    if (typeof CacheManager !== 'undefined') {
      CacheManager.put(cacheKey, result, 180);
    }
    return result;
  },

  getAttendanceTodayAbsenteesCount: function(userId) {
    const cacheKey = "dashboard_stats_absentees_today_" + userId;
    if (typeof CacheManager !== 'undefined') {
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) return cached;
    }

    Logger.log("DASHBOARD_SERVICE | STEP 3 - Reading Google Sheet");
    var summary = ReportService.getDashboardSummary(userId);
    Logger.log("DASHBOARD_SERVICE | STEP 4 - Processing data");
    var s = (summary && summary.report) ? summary.report : {};
    const result = s.totalAbsent || 0;

    if (typeof CacheManager !== 'undefined') {
      CacheManager.put(cacheKey, result, 180);
    }
    return result;
  },

  getMonthlyAttendancePercentage: function(userId) {
    const cacheKey = "dashboard_stats_monthly_percentage_" + userId;
    if (typeof CacheManager !== 'undefined') {
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) return cached;
    }

    Logger.log("DASHBOARD_SERVICE | STEP 3 - Reading Google Sheet");
    var summary = ReportService.getDashboardSummary(userId);
    Logger.log("DASHBOARD_SERVICE | STEP 4 - Processing data");
    var s = (summary && summary.report) ? summary.report : {};
    const result = s.attendancePercentage || 0;

    if (typeof CacheManager !== 'undefined') {
      CacheManager.put(cacheKey, result, 180);
    }
    return result;
  },

  getTotalDepartmentsCount: function() {
    const cacheKey = "dashboard_stats_departments_count";
    if (typeof CacheManager !== 'undefined') {
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) return cached;
    }

    Logger.log("DASHBOARD_SERVICE | STEP 3 - Reading Google Sheet | Sheet Name: " + CONFIG.SHEETS.DEPARTMENTS);
    var depts = DepartmentService.getActiveDepartments() || [];
    const result = depts.length;

    if (typeof CacheManager !== 'undefined') {
      CacheManager.put(cacheKey, result, 180);
    }
    return result;
  },

  getRecentActivities: function() {
    const cacheKey = "dashboard_stats_recent_activities";
    if (typeof CacheManager !== 'undefined') {
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) return cached;
    }

    Logger.log("DASHBOARD_SERVICE | STEP 3 - Reading Google Sheet | Sheet Name: " + CONFIG.SHEETS.AUDIT_LOGS);
    var logs = AuditService.getAuditLogs() || [];
    Logger.log("DASHBOARD_SERVICE | STEP 4 - Processing data");
    var sorted = AuditService.sortAuditLogs(logs, 'timestamp', 'desc');
    const result = sorted.slice(0, 5);

    if (typeof CacheManager !== 'undefined') {
      CacheManager.put(cacheKey, result, 180);
    }
    return result;
  },

  getAggregatedDashboardData: function(userId, userContext) {
    const cacheKey = "dashboard_full_payload_" + (userId || 'ALL') + "_" + (userContext ? userContext.role : 'ALL');
    if (typeof CacheManager !== 'undefined') {
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) return cached;
    }

    // Single pass read of required sheets
    const users = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
    const students = DatabaseService.readAllRows(CONFIG.SHEETS.STUDENTS) || [];
    const events = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
    const depts = DatabaseService.readAllRows(CONFIG.SHEETS.DEPARTMENTS) || [];
    const logs = DatabaseService.readAllRows(CONFIG.SHEETS.AUDITLOGS) || [];

    // Filter non-deleted
    const activeUsers = users.filter(function(u) { return !u[CONFIG.COLUMNS.DELETION_FLAG]; });
    const activeStudents = students.filter(function(s) { return !s[CONFIG.COLUMNS.DELETION_FLAG]; });
    const activeEvents = events.filter(function(e) { return !e[CONFIG.COLUMNS.DELETION_FLAG]; });
    const activeDepts = depts.filter(function(d) { return !d[CONFIG.COLUMNS.DELETION_FLAG]; });

    // Apply RLS
    const scopedUsers = userContext ? SecurityUtils.applyUserRLS(activeUsers, userContext) : activeUsers;
    const scopedStudents = userContext ? SecurityUtils.applyStudentRLS(activeStudents, userContext) : activeStudents;
    const scopedEvents = userContext ? SecurityUtils.applyEventRLS(activeEvents, userContext) : activeEvents;

    const totalUsers = scopedUsers.length;
    const totalCoordinators = scopedUsers.filter(function(u) {
      const role = String(u['Role'] || u.role || '').toUpperCase();
      return role === 'COORDINATOR';
    }).length;
    const totalAdmins = scopedUsers.filter(function(u) {
      const role = String(u['Role'] || u.role || '').toUpperCase();
      return role === 'ADMIN' || role === 'EVENT ADMIN' || role === 'EVENT_ADMIN';
    }).length;
    const totalStudents = scopedStudents.length;
    const totalEvents = scopedEvents.length;

    let activeEventsCount = 0;
    let completedEventsCount = 0;
    let activeEventsList = [];

    scopedEvents.forEach(function(e) {
      const st = String(e["Event Status"] || e["Status"] || e.status || '').toLowerCase();
      if (st === 'active') {
        activeEventsCount++;
        activeEventsList.push(e);
      } else if (st === 'completed') {
        completedEventsCount++;
      }
    });

    let todayAttendance = 0;
    let todayAbsentees = 0;
    let monthlyAttendancePercentage = 0;
    try {
      var summary = ReportService.getDashboardSummary(userId);
      var s = (summary && summary.report) ? summary.report : {};
      todayAttendance = s.totalAttendance || 0;
      todayAbsentees = s.totalAbsent || 0;
      monthlyAttendancePercentage = s.attendancePercentage || 0;
    } catch(err) {
      Logger.log("getDashboardSummary error in getAggregatedDashboardData: " + err);
    }

    var sortedLogs = AuditService.sortAuditLogs(logs, 'timestamp', 'desc');
    var recentActivities = sortedLogs.slice(0, 5);

    // Calculate Top Event Today based on today's attendance scans
    let topEventTodayName = 'No events today';
    let topEventTodayCount = 0;
    try {
      const attendanceRows = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
      const todayIso = new Date().toISOString().slice(0, 10);
      const todayScans = attendanceRows.filter(a => {
        if (a[CONFIG.COLUMNS.DELETION_FLAG]) return false;
        const dateVal = String(a.date || a.Date || a.timestamp || a.Created_At || '').slice(0, 10);
        return dateVal === todayIso;
      });

      if (todayScans.length > 0) {
        const countsByEvent = {};
        todayScans.forEach(a => {
          const eId = String(a.event_id || a['Event ID'] || '');
          if (eId) countsByEvent[eId] = (countsByEvent[eId] || 0) + 1;
        });

        let topEventId = '';
        let maxScans = 0;
        Object.keys(countsByEvent).forEach(eId => {
          if (countsByEvent[eId] > maxScans) {
            maxScans = countsByEvent[eId];
            topEventId = eId;
          }
        });

        if (topEventId) {
          const matchedEvt = scopedEvents.find(e => String(e.event_id || e['Event ID']) === topEventId);
          if (matchedEvt) {
            topEventTodayName = matchedEvt.event_name || matchedEvt['Event Name'] || topEventId;
            topEventTodayCount = maxScans;
          }
        }
      }
    } catch (topEvtErr) {
      Logger.log("Top event calculation error: " + topEvtErr.message);
    }

    const payload = {
      stats: {
        totalUsers: totalUsers,
        totalCoordinators: totalCoordinators,
        totalAdmins: totalAdmins,
        totalStudents: totalStudents,
        totalEvents: totalEvents,
        activeEvents: activeEventsCount,
        completedEvents: completedEventsCount,
        topEventTodayName: topEventTodayName,
        topEventTodayCount: topEventTodayCount,
        todayAttendance: todayAttendance,
        todayAbsentees: todayAbsentees,
        monthlyAttendancePercentage: monthlyAttendancePercentage,
        totalDepartments: activeDepts.length,
        pendingApprovals: 0
      },
      activeEvents: activeEventsList.slice(0, 5),
      recentActivities: recentActivities
    };

    if (typeof CacheManager !== 'undefined') {
      CacheManager.put(cacheKey, payload, 180);
    }

    return payload;
  }
};
