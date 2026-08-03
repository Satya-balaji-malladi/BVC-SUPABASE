/**
 * StatusService.js
 * Centralized Active / Inactive Status Engine for BVC Event Attendance System.
 *
 * All statuses are determined dynamically based on actual event participation.
 * There are no hardcoded permanent "Active" assignments for general users.
 */
var StatusService = {

  /**
   * Helper to fetch active/ongoing events.
   * A user is only active if their participation relates to an active event.
   */
  _getActiveEventIds: function() {
    var allEvents = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
    var activeEventIds = new Set();
    
    allEvents.forEach(function(e) {
      if (e[CONFIG.COLUMNS.DELETION_FLAG]) return;
      var status = String(e[CONFIG.COLUMNS.EVENT_STATUS] || e.event_status || '').toUpperCase();
      if (status !== 'CANCELLED' && status !== 'STOPPED' && status !== 'COMPLETED') {
        activeEventIds.add(String(e[CONFIG.COLUMNS.EVENT_ID] || e.event_id || '').trim());
      }
    });
    return activeEventIds;
  },

  /**
   * Calculate Student Status
   * Active IF: Registered for an active event OR Attended an active event OR Assigned to an active event.
   */
  calculateStudentStatus: function(studentId) {
    if (!studentId) return 'Inactive';
    var cleanId = String(studentId).trim().toUpperCase();
    var activeEvents = this._getActiveEventIds();
    if (activeEvents.size === 0) return 'Inactive';

    // Check Registrations
    var participants = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];
    var isRegistered = participants.some(function(p) {
      if (p[CONFIG.COLUMNS.DELETION_FLAG]) return false;
      var roll = String(p[CONFIG.COLUMNS.PARTICIPANT_ROLL_NUMBER] || p.roll_number || '').trim().toUpperCase();
      var evtId = String(p[CONFIG.COLUMNS.EVENT_ID] || p.event_id || '').trim();
      return roll === cleanId && activeEvents.has(evtId);
    });
    if (isRegistered) return 'Active';

    // Check Attendance
    var attendance = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
    var hasAttended = attendance.some(function(a) {
      if (a[CONFIG.COLUMNS.DELETION_FLAG]) return false;
      var roll = String(a[CONFIG.COLUMNS.ATTENDANCE_ROLL_NUMBER] || a.roll_number || '').trim().toUpperCase();
      var evtId = String(a[CONFIG.COLUMNS.EVENT_ID] || a.event_id || '').trim();
      return roll === cleanId && activeEvents.has(evtId);
    });
    if (hasAttended) return 'Active';

    return 'Inactive';
  },

  /**
   * Calculate Faculty Status
   * Active IF: Hosting an event OR Coordinating an event OR Participating in an event OR Assigned to any active event
   */
  calculateFacultyStatus: function(facultyEmpId) {
    if (!facultyEmpId) return 'Inactive';
    return this._calculateStaffStatus(facultyEmpId);
  },

  /**
   * Calculate HOD Status
   * Active IF: Managing at least one event OR Participating in an event OR Assigned responsibilities
   */
  calculateHODStatus: function(hodEmpId) {
    if (!hodEmpId) return 'Inactive';
    return this._calculateStaffStatus(hodEmpId);
  },

  /**
   * Calculate Coordinator Status
   * Active IF: Assigned to an event OR Managing attendance OR Hosting/Running an event
   */
  calculateCoordinatorStatus: function(coordEmpId) {
    if (!coordEmpId) return 'Inactive';
    return this._calculateStaffStatus(coordEmpId);
  },

  /**
   * Shared logic for Staff (Faculty, HOD, Coordinator, Users)
   */
  _calculateStaffStatus: function(empId) {
    var cleanId = String(empId).trim().toUpperCase();
    var activeEvents = this._getActiveEventIds();
    if (activeEvents.size === 0) return 'Inactive';

    // Check if they are organizing an event
    var allEvents = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
    var isOrganizer = allEvents.some(function(e) {
      if (e[CONFIG.COLUMNS.DELETION_FLAG]) return false;
      var evtId = String(e[CONFIG.COLUMNS.EVENT_ID] || e.event_id || '').trim();
      var organizer = String(e[CONFIG.COLUMNS.EVENT_ORGANIZER] || e.organizer || '').trim().toUpperCase();
      return organizer === cleanId && activeEvents.has(evtId);
    });
    if (isOrganizer) return 'Active';

    // Check if they are assigned as coordinator
    var coordinators = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
    var isAssigned = coordinators.some(function(c) {
      if (c[CONFIG.COLUMNS.DELETION_FLAG]) return false;
      var evtId = String(c[CONFIG.COLUMNS.EVENT_ID] || c.event_id || '').trim();
      var userId = String(c[CONFIG.COLUMNS.USER_ID] || c.user_id || '').trim().toUpperCase();
      return userId === cleanId && activeEvents.has(evtId);
    });
    if (isAssigned) return 'Active';
    
    // Also check event_assignments
    var assignments = DatabaseService.readAllRows('event_assignments') || [];
    var isEventAssigned = assignments.some(function(a) {
      var evtId = String(a.event_id || '').trim();
      var userId = String(a.user_id || '').trim().toUpperCase();
      return userId === cleanId && activeEvents.has(evtId);
    });
    if (isEventAssigned) return 'Active';

    return 'Inactive';
  },

  /**
   * Calculate User Status
   * Admins are ALWAYS Active. Others are calculated based on role.
   */
  calculateUserStatus: function(userId, role) {
    if (!userId) return 'Inactive';
    var safeRole = String(role || '').toUpperCase().trim().replace(/[\s_]+/g, '');
    
    // Administrative roles are ALWAYS Active (never dynamically deactivated)
    if (safeRole === 'SUPERADMIN' || safeRole === 'ADMIN' || safeRole === 'HOD' || safeRole === 'EVENTADMIN') {
      return 'Active';
    }

    if (safeRole === 'STUDENT') {
      return this.calculateStudentStatus(userId);
    }
    
    // For Faculty, Coordinator, standard Users — calculate dynamically
    return this._calculateStaffStatus(userId);
  },

  /**
   * Refreshes a single user's status by calculating it and updating the DB if it changed.
   */
  refreshUserStatus: function(personId, role, isStudentSheet) {
    try {
      if (!personId) return;
      var cleanId = String(personId).trim().toUpperCase();
      
      var calculatedStatus = 'Inactive';
      if (isStudentSheet || (role && String(role).toUpperCase() === 'STUDENT')) {
         calculatedStatus = this.calculateStudentStatus(cleanId);
         this._updateRecordStatus(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, cleanId, CONFIG.COLUMNS.STUDENT_STATUS, calculatedStatus);
      } else {
         // It's a User
         var userObj = DatabaseService.findOne(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_ID, cleanId) || 
                       DatabaseService.findOne(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_EMPLOYEE_ID, cleanId);
         var userRole = role;
         if (userObj) {
            userRole = userObj[CONFIG.COLUMNS.USER_ROLE] || userObj.role || role;
            cleanId = userObj[CONFIG.COLUMNS.USER_ID] || userObj.user_id; // Use primary key
         }
         calculatedStatus = this.calculateUserStatus(cleanId, userRole);
         this._updateRecordStatus(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_ID, cleanId, CONFIG.COLUMNS.USER_STATUS, calculatedStatus);
         
         // Also update faculty sheet if they are faculty
         var facultyObj = DatabaseService.findOne(CONFIG.SHEETS.FACULTY, CONFIG.COLUMNS.FACULTY_EMPLOYEE_ID || 'employee_id', cleanId) ||
                          DatabaseService.findOne(CONFIG.SHEETS.FACULTY, CONFIG.COLUMNS.USER_ID || 'user_id', cleanId);
         if (facultyObj) {
             this._updateRecordStatus(CONFIG.SHEETS.FACULTY, CONFIG.COLUMNS.FACULTY_ID || 'faculty_id', facultyObj[CONFIG.COLUMNS.FACULTY_ID || 'faculty_id'], 'status', calculatedStatus);
         }
      }
    } catch (e) {
      Logger.log('[StatusService] refreshUserStatus error: ' + e);
    }
  },

  /**
   * Batch recalculation of ALL users and students.
   * Call this when a major event occurs (e.g., event deleted or cancelled)
   */
  _calculateStudentStatusInMemory: function(studentId, activeEvents, participants, attendance) {
    if (!studentId) return 'Inactive';
    var cleanId = String(studentId).trim().toUpperCase();
    if (activeEvents.size === 0) return 'Inactive';

    // Check Registrations
    var isRegistered = participants.some(function(p) {
      if (p[CONFIG.COLUMNS.DELETION_FLAG]) return false;
      var roll = String(p[CONFIG.COLUMNS.PARTICIPANT_ROLL_NUMBER] || p.roll_number || '').trim().toUpperCase();
      var evtId = String(p[CONFIG.COLUMNS.EVENT_ID] || p.event_id || '').trim();
      return roll === cleanId && activeEvents.has(evtId);
    });
    if (isRegistered) return 'Active';

    // Check Attendance
    var hasAttended = attendance.some(function(a) {
      if (a[CONFIG.COLUMNS.DELETION_FLAG]) return false;
      var roll = String(a[CONFIG.COLUMNS.ATTENDANCE_ROLL_NUMBER] || a.roll_number || '').trim().toUpperCase();
      var evtId = String(a[CONFIG.COLUMNS.EVENT_ID] || a.event_id || '').trim();
      return roll === cleanId && activeEvents.has(evtId);
    });
    if (hasAttended) return 'Active';

    return 'Inactive';
  },

  _calculateStaffStatusInMemory: function(empId, activeEvents, allEvents, coordinators, assignments) {
    var cleanId = String(empId).trim().toUpperCase();
    if (activeEvents.size === 0) return 'Inactive';

    // Check organizing
    var isOrganizer = allEvents.some(function(e) {
      if (e[CONFIG.COLUMNS.DELETION_FLAG]) return false;
      var evtId = String(e[CONFIG.COLUMNS.EVENT_ID] || e.event_id || '').trim();
      var organizer = String(e[CONFIG.COLUMNS.EVENT_ORGANIZER] || e.organizer || '').trim().toUpperCase();
      return organizer === cleanId && activeEvents.has(evtId);
    });
    if (isOrganizer) return 'Active';

    // Check coordinators
    var isAssigned = coordinators.some(function(c) {
      if (c[CONFIG.COLUMNS.DELETION_FLAG]) return false;
      var evtId = String(c[CONFIG.COLUMNS.EVENT_ID] || c.event_id || '').trim();
      var userId = String(c[CONFIG.COLUMNS.USER_ID] || c.user_id || '').trim().toUpperCase();
      return userId === cleanId && activeEvents.has(evtId);
    });
    if (isAssigned) return 'Active';
    
    // Check event_assignments
    var isEventAssigned = assignments.some(function(a) {
      var evtId = String(a.event_id || '').trim();
      var userId = String(a.user_id || '').trim().toUpperCase();
      return userId === cleanId && activeEvents.has(evtId);
    });
    if (isEventAssigned) return 'Active';

    return 'Inactive';
  },

  _calculateUserStatusInMemory: function(userId, role, activeEvents, participants, attendance, allEvents, coordinators, assignments) {
    if (!userId) return 'Inactive';
    var safeRole = String(role || '').toUpperCase().trim().replace(/[\s_]+/g, '');
    
    // Administrative roles are ALWAYS Active (batch refresh must not demote them)
    if (safeRole === 'SUPERADMIN' || safeRole === 'ADMIN' || safeRole === 'HOD' || safeRole === 'EVENTADMIN') {
      return 'Active';
    }

    if (safeRole === 'STUDENT') {
      return this._calculateStudentStatusInMemory(userId, activeEvents, participants, attendance);
    }
    
    return this._calculateStaffStatusInMemory(userId, activeEvents, allEvents, coordinators, assignments);
  },

  /**
   * Batch recalculation of ALL users and students in-memory.
   * Drastically minimizes UrlFetch calls to prevent Google daily quota locks.
   */
  refreshAllStatuses: function() {
    try {
      Logger.log('[StatusService] Starting optimized batch refresh of all statuses...');
      
      // Load tables once in bulk
      var activeEvents = this._getActiveEventIds();
      var students = DatabaseService.readAllRows(CONFIG.SHEETS.STUDENTS) || [];
      var users = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
      var faculty = DatabaseService.readAllRows(CONFIG.SHEETS.FACULTY) || [];
      var participants = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];
      var attendance = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
      var allEvents = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
      var coordinators = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      var assignments = DatabaseService.readAllRows('event_assignments') || [];

      // 1. Process Students
      students.forEach(function(s) {
         if (s[CONFIG.COLUMNS.DELETION_FLAG]) return;
         var id = s[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] || s.roll_number;
         if (!id) return;
         
         var calculatedStatus = StatusService._calculateStudentStatusInMemory(id, activeEvents, participants, attendance);
         var currentStatus = s[CONFIG.COLUMNS.STUDENT_STATUS] || s.status;
         
         if (currentStatus !== calculatedStatus) {
            var updatePayload = {};
            updatePayload[CONFIG.COLUMNS.STUDENT_STATUS] = calculatedStatus;
            if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_AT) updatePayload[CONFIG.COLUMNS.UPDATED_AT] = new Date().toISOString();
            DatabaseService.updateRow(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, id, updatePayload);
         }
      });

      // 2. Process Users & Faculty
      users.forEach(function(u) {
         if (u[CONFIG.COLUMNS.DELETION_FLAG]) return;
         var id = u[CONFIG.COLUMNS.USER_ID] || u.user_id;
         var role = u[CONFIG.COLUMNS.USER_ROLE] || u.role;
         if (!id) return;
         
         var calculatedStatus = StatusService._calculateUserStatusInMemory(id, role, activeEvents, participants, attendance, allEvents, coordinators, assignments);
         var currentStatus = u[CONFIG.COLUMNS.USER_STATUS] || u.status;
         
         if (currentStatus !== calculatedStatus) {
            var updatePayload = {};
            updatePayload[CONFIG.COLUMNS.USER_STATUS] = calculatedStatus;
            if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_AT) updatePayload[CONFIG.COLUMNS.UPDATED_AT] = new Date().toISOString();
            DatabaseService.updateRow(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_ID, id, updatePayload);
         }

         // Faculty sheet update
         var empId = u[CONFIG.COLUMNS.USER_EMPLOYEE_ID] || u.employee_id || id;
         var cleanEmpId = String(empId).trim().toUpperCase();
         var facultyRecord = faculty.find(function(f) {
           var fEmpId = String(f[CONFIG.COLUMNS.FACULTY_EMPLOYEE_ID || 'employee_id'] || f.employee_id || '').trim().toUpperCase();
           var fUserId = String(f[CONFIG.COLUMNS.USER_ID || 'user_id'] || f.user_id || '').trim().toUpperCase();
           return fEmpId === cleanEmpId || fUserId === cleanEmpId;
         });
         
         if (facultyRecord) {
            var fId = facultyRecord[CONFIG.COLUMNS.FACULTY_ID || 'faculty_id'] || facultyRecord.faculty_id;
            var fCurrentStatus = facultyRecord.status || facultyRecord.Status;
            if (fId && fCurrentStatus !== calculatedStatus) {
               var fUpdatePayload = { 'status': calculatedStatus };
               if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_AT) fUpdatePayload[CONFIG.COLUMNS.UPDATED_AT] = new Date().toISOString();
               DatabaseService.updateRow(CONFIG.SHEETS.FACULTY, CONFIG.COLUMNS.FACULTY_ID || 'faculty_id', fId, fUpdatePayload);
            }
         }
      });
      
      Logger.log('[StatusService] refreshAllStatuses completed successfully (optimized in-memory execution).');
    } catch (e) {
      Logger.log('[StatusService] refreshAllStatuses error: ' + e);
    }
  },

  _updateRecordStatus: function(sheetName, idCol, idVal, statusCol, newStatus) {
      var record = DatabaseService.findOne(sheetName, idCol, idVal);
      if (record) {
         var currentStatus = record[statusCol] || record.status;
         if (currentStatus !== newStatus) {
            var updatePayload = {};
            updatePayload[statusCol] = newStatus;
            if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_AT) updatePayload[CONFIG.COLUMNS.UPDATED_AT] = new Date().toISOString();
            DatabaseService.updateRow(sheetName, idCol, idVal, updatePayload);
         }
      }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatusService;
}
