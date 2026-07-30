/**
 * SecurityUtils.js
 * Centralized Enterprise Row-Level Security (RLS) & Universal Permission Engine.
 */
const SecurityUtils = {

  /**
   * Main Permission evaluation entrypoint.
   */
  hasPermission: function(userId, permissionKey, eventId) {
    try {
      if (!userId) return false;

      // 1. Resolve user context
      const user = this._resolveUser(userId);
      if (!user) return false;

      const status = String(user.Status || user.status || 'Active').trim().toLowerCase();
      if (status !== 'active') return false;

      const role = String(user.Role || user.role || 'Coordinator').trim().toUpperCase();
      const permKeyLower = String(permissionKey).trim().toLowerCase();

      // 2. Explicit Deny Overrides from UserPermissions table
      const overrides = this.getUserPermissionOverrides(userId);
      if (overrides.denied.includes(permKeyLower)) return false;

      // 3. Explicit Allow Overrides from UserPermissions table
      if (overrides.allowed.includes(permKeyLower)) {
        return this._evaluateEventAndArchiveConstraints(user, permKeyLower, eventId);
      }

      // 4. Fallback to Default Role Permission Matrix
      const defaults = this.getRoleDefaultPermissions(role);
      if (!defaults.includes(permKeyLower)) return false;

      return this._evaluateEventAndArchiveConstraints(user, permKeyLower, eventId);
    } catch (e) {
      Logger.log('Error in SecurityUtils.hasPermission: ' + e.message);
      return false;
    }
  },

  /**
   * Evaluates event lifecycle status, department isolation, and ownership assignments.
   */
  _evaluateEventAndArchiveConstraints: function(user, permissionKey, eventId) {
    if (!eventId) return true;

    const role = String(user.Role || user.role || 'Coordinator').trim().toUpperCase();
    const isSuperAdmin = (role === 'SUPER ADMIN' || role === 'SUPER_ADMIN');

    // Super Admin has global override unless explicitly denied
    if (isSuperAdmin) return true;

    // Fetch the target event
    const event = EventService.getEventById(eventId);
    if (!event) return false;

    const userId = String(user['User ID'] || user.user_id || '').trim();

    // HOD is department isolated
    if (role === 'HOD') {
      const userDept = String(user.Department || user.department || '').trim().toUpperCase();
      const rawDepts = String(
        event.departments || event.Departments || 
        event.department || event.Department || ''
      ).trim().toUpperCase();
      
      const belongsToDept = (rawDepts === 'ALL' || rawDepts.includes(userDept) || userDept.includes(rawDepts));
      if (!belongsToDept) return false;
    }

    // Admin & Coordinator scope validation via relational event_assignments
    if (role === 'ADMIN' || role === 'COORDINATOR') {
      const assignments = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_ASSIGNMENTS) || [];
      const isAssigned = assignments.some(a => 
        String(a['Event ID'] || a.event_id).trim() === String(eventId).trim() &&
        String(a['User ID'] || a.user_id).trim() === userId &&
        String(a['Deletion Flag'] || a.deletion_flag || 'false').toLowerCase() !== 'true'
      );
      if (!isAssigned) return false;
    }

    // 7-Day Archival / Read Only Check
    const archiveStatus = String(event.archive_status || event.archiveStatus || 'Active').trim().toLowerCase();
    const completedAtStr = event.completed_at || event.completedAt;

    let isReadOnly = (archiveStatus === 'readonly' || archiveStatus === 'archived');
    if (!isReadOnly && completedAtStr) {
      const completedTime = new Date(completedAtStr).getTime();
      const limitTime = completedTime + (7 * 24 * 60 * 60 * 1000);
      if (new Date().getTime() > limitTime) {
        isReadOnly = true;
      }
    }

    if (isReadOnly) {
      const writeOperations = [
        'edit_event', 'delete_event', 'close_event', 
        'manual_attendance', 'edit_attendance', 
        'add_participants', 'manage_forms'
      ];
      if (writeOperations.includes(permissionKey)) {
        return false;
      }
    }

    return true;
  },

  /**
   * Fetches override rules from the UserPermissions table.
   */
  getUserPermissionOverrides: function(userId) {
    try {
      if (!userId) return { allowed: [], denied: [] };
      const records = DatabaseService.findByColumn(CONFIG.SHEETS.USER_PERMISSIONS, 'User ID', userId) || [];
      const allowed = [];
      const denied = [];
      records.forEach(r => {
        const key = String(r['Permission Key'] || r.permission_key || r.permissionKey || '').trim().toLowerCase();
        var rawVal = r['Is Allowed'];
        if (rawVal === undefined) rawVal = r.is_allowed;
        if (rawVal === undefined) rawVal = r.isAllowed;
        if (rawVal === undefined) rawVal = true;

        const allowedVal = (rawVal === true || String(rawVal).trim().toLowerCase() === 'true');
        if (key) {
          if (allowedVal) {
            allowed.push(key);
          } else {
            denied.push(key);
          }
        }
      });
      return { allowed, denied };
    } catch (e) {
      Logger.log('Error fetching permission overrides: ' + e.message);
      return { allowed: [], denied: [] };
    }
  },

  /**
   * Default fallback permissions matrix.
   */
  getRoleDefaultPermissions: function(role) {
    const normRole = String(role).trim().toUpperCase();
    if (normRole === 'SUPER ADMIN' || normRole === 'SUPER_ADMIN') {
      return [
        'create_user', 'edit_user', 'delete_user', 'reset_password',
        'create_event', 'edit_event', 'delete_event', 'close_event',
        'scan_attendance', 'manual_attendance', 'edit_attendance',
        'view_reports', 'export_excel', 'export_pdf', 'export_csv',
        'view_dashboard'
      ];
    }
    if (normRole === 'HOD') {
      return [
        'create_user', 'edit_user', 'delete_user', 'reset_password',
        'create_event', 'edit_event', 'delete_event', 'close_event',
        'scan_attendance', 'manual_attendance', 'edit_attendance',
        'view_reports', 'export_excel', 'export_pdf', 'export_csv',
        'view_dashboard'
      ];
    }
    if (normRole === 'ADMIN') {
      return [
        'create_user',
        'edit_event', 'delete_event', 'close_event',
        'scan_attendance', 'manual_attendance', 'edit_attendance',
        'view_reports', 'export_excel', 'export_pdf', 'export_csv',
        'view_dashboard'
      ];
    }
    // EVENT ADMIN: Can create and manage events and create inline Event Coordinators
    if (normRole === 'EVENT ADMIN' || normRole === 'EVENT_ADMIN') {
      return [
        'create_user',
        'create_event', 'edit_event', 'delete_event', 'close_event',
        'scan_attendance', 'manual_attendance', 'edit_attendance',
        'add_participants', 'manage_forms',
        'view_reports', 'export_excel', 'export_pdf', 'export_csv',
        'view_dashboard'
      ];
    }
    if (normRole === 'COORDINATOR') {
      return [
        'scan_attendance', 'manual_attendance', 'view_reports'
      ];
    }
    return [];
  },

  /**
   * Filters an array of events based on caller's userContext.
   */
  applyEventRLS: function(events, userContext) {
    if (!Array.isArray(events)) return [];
    if (!userContext) return [];
    if (userContext.isSuperAdmin) return events;

    return events.filter(e => {
      const eventId = e['Event ID'] || e.event_id || e.eventId;
      return this.hasPermission(userContext.userId, 'view_reports', eventId);
    });
  },

  /**
   * Filters student records based on department isolation.
   */
  applyStudentRLS: function(students, userContext) {
    if (!Array.isArray(students)) return [];
    if (!userContext) return [];
    if (userContext.isSuperAdmin) return students;

    if (userContext.isHOD) {
      const userDeptRaw = (userContext.department || '').trim().toUpperCase();
      // Resolve HOD department name/code to the department_id used on student records
      let resolvedDeptId = userDeptRaw;
      try {
        const allDepts = DatabaseService.readAllRows(CONFIG.SHEETS.DEPARTMENTS) || [];
        const matched = allDepts.find(d => {
          const dCode = String(d['Department Code'] || d.department_code || '').trim().toUpperCase();
          const dName = String(d['Department Name'] || d.department_name || '').trim().toUpperCase();
          const dId   = String(d['Department ID']   || d.department_id   || '').trim().toUpperCase();
          return dCode === userDeptRaw || dName === userDeptRaw || dId === userDeptRaw ||
                 dName.includes(userDeptRaw) || userDeptRaw.includes(dCode);
        });
        if (matched) {
          resolvedDeptId = String(matched['Department ID'] || matched.department_id || userDeptRaw).trim().toUpperCase();
        }
      } catch(ex) { /* fallback to raw value */ }

      return students.filter(s => {
        if (!s) return false;
        const studentDept = String(s['Department ID'] || s.department_id || s.departmentId || s['Department'] || '').trim().toUpperCase();
        return studentDept === resolvedDeptId || studentDept === userDeptRaw;
      });
    }

    try {
      const assignedEvents = this.applyEventRLS(DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [], userContext);
      const assignedEventIds = new Set(assignedEvents.map(e => String(e['Event ID'] || e.event_id || e.eventId).trim()));
      
      const participants = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];
      const allowedRolls = new Set(
        participants
          .filter(p => assignedEventIds.has(String(p['Event ID'] || p.event_id).trim()))
          .map(p => String(p['Roll Number'] || p.roll_number).trim())
      );

      return students.filter(s => {
        if (!s) return false;
        const roll = String(s['Roll Number'] || s.roll_number || s.rollNumber).trim();
        return allowedRolls.has(roll);
      });
    } catch (err) {
      return [];
    }
  },

  /**
   * Filters user rosters based on department isolation.
   */
  applyUserRLS: function(users, userContext) {
    if (!Array.isArray(users)) return [];
    if (!userContext) return [];
    if (userContext.isSuperAdmin) return users;

    if (userContext.isHOD) {
      const userDept = (userContext.department || '').trim().toUpperCase();
      return users.filter(u => {
        if (!u) return false;
        const dept = String(u['Department'] || u.department || '').trim().toUpperCase();
        return dept === userDept || dept.includes(userDept) || userDept.includes(dept);
      });
    }

    if (userContext.role === 'Admin' || userContext.role === 'Event Admin' || userContext.role === 'EVENT_ADMIN') {
      return users.filter(u => {
        if (!u) return false;
        const r = String(u['Role'] || u.role || u['User Role'] || '').toUpperCase().trim();
        return r === 'COORDINATOR' || r === 'ADMIN' || r === 'EVENT ADMIN' || r === 'EVENT_ADMIN';
      });
    }

    const uid = String(userContext.userId).trim();
    return users.filter(u => String(u['User ID'] || u.user_id || u.userId).trim() === uid);
  },

  /**
   * Validates if a userContext can access a specific event ID.
   */
  canAccessEvent: function(eventId, userContext) {
    if (!eventId || !userContext) return false;
    if (userContext.isSuperAdmin) return true;
    const events = DatabaseService.findByColumn(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID || 'Event ID', eventId) || [];
    if (events.length === 0) return false;
    const filtered = this.applyEventRLS(events, userContext);
    return filtered.length > 0;
  },

  /**
   * Resolves a user identifier (User ID, username, email, or full name) to a user record.
   */
  _resolveUser: function(identifier) {
    if (!identifier) return null;
    const users = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
    const target = String(identifier).trim().toLowerCase();
    
    return users.find(u => 
      String(u['User ID'] || '').toLowerCase() === target ||
      String(u['Username'] || '').toLowerCase() === target ||
      String(u['Email Address'] || '').toLowerCase() === target ||
      (String(u['First Name'] || '') + ' ' + String(u['Last Name'] || '')).trim().toLowerCase() === target
    );
  },

  /**
   * Checks if the caller is authorized to act as an Event Admin for a specific event.
   */
  isEventAdmin: function(eventId, callerIdentifier) {
    if (!eventId || !callerIdentifier) return false;
    const user = this._resolveUser(callerIdentifier);
    if (!user) return false;

    return this.hasPermission(user['User ID'], 'edit_event', eventId);
  },

  isSuperAdmin: function(userId) {
    if (!userId) return false;
    const user = this._resolveUser(userId);
    if (!user) return false;
    const role = String(user['Role'] || user.role || user.Role || '').toUpperCase().trim();
    return role === 'SUPER ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPERADMIN';
  }
};
