/**
 * EventAdminService.js
 * 
 * Isolated Service for Event Admin Operations.
 * Enforces rule: Event Admins see and manage ONLY their selected assigned event.
 * Handles single-event dashboard cards, coordinator assignments (Faculty, Student, Guest),
 * inline coordinator creation, and event configurations.
 */
const EventAdminService = {

  /**
   * Fetches full dashboard metrics and details for an Event Admin's selected event.
   * 
   * @param {string} sessionToken - Active session token
   * @param {string} eventId - Selected target Event ID
   * @returns {object} Response containing event details, live metrics cards, and coordinator roster
   */
  getEventAdminDashboard: function (sessionToken, eventId) {
    return SessionService.withSession(sessionToken, function (userId) {
      try {
        if (!eventId) return Utils.buildResponse(false, 'Selected Event ID is required.');

        // Verify Event Admin assignment/authority via RoleResolutionEngine
        var roleRes = RoleResolutionEngine.resolveEffectiveRole(sessionToken, eventId);
        if (!roleRes || !roleRes.success) {
          return Utils.buildResponse(false, 'Unauthorized: ' + (roleRes ? roleRes.message : 'No access to event.'));
        }

        var roleStr = String(roleRes.data.effectiveRole).toUpperCase();
        var isSuperAdmin = roleRes.data.isGlobalAdmin === true;
        var isEventAdmin = roleStr === 'EVENT ADMIN' || roleStr === 'EVENT_ADMIN' || roleStr === 'ADMIN' || isSuperAdmin;

        if (!isEventAdmin) {
          return Utils.buildResponse(false, 'Unauthorized: Event Admin access required for event ' + eventId);
        }

        // 1. Fetch Event Details
        var evRecords = DatabaseService.findByColumn(CONFIG.TABLES.EVENTS, 'event_id', eventId, { strict: true });
        if (!evRecords || evRecords.length === 0) {
          return Utils.buildResponse(false, 'Event not found: ' + eventId);
        }
        var eventObj = evRecords[0];

        // 2. Fetch Event Assignments (Coordinators & Admins)
        var assignments = DatabaseService.findByColumn(CONFIG.TABLES.EVENT_ASSIGNMENTS, 'event_id', eventId, { strict: true }) || [];
        var activeAssignments = assignments.filter(function (a) {
          return String(a.status || 'Active').toLowerCase() === 'active';
        });

        // Filter Coordinators
        var coordAssignments = activeAssignments.filter(function (a) {
          return String(a.role).toLowerCase() === 'coordinator';
        });

        // 3. Fetch Registered Participants
        var participants = DatabaseService.findByColumn(CONFIG.TABLES.EVENT_PARTICIPANTS, 'event_id', eventId, { strict: true }) || [];
        var totalRegistered = participants.length;
        var pendingRegs = participants.filter(function (p) {
          return String(p.registration_status || '').toLowerCase() === 'pending';
        }).length;

        // 4. Fetch Attendance Logs for this Event
        var attendanceLogs = DatabaseService.findByColumn(CONFIG.TABLES.ATTENDANCE, 'event_id', eventId, { strict: true }) || [];
        var totalPresent = attendanceLogs.length;

        var totalAbsent = totalRegistered > totalPresent ? totalRegistered - totalPresent : 0;
        var attendancePct = totalRegistered > 0 ? Math.round((totalPresent / totalRegistered) * 100) : 0;

        // Spot registrations count
        var spotRegistrations = attendanceLogs.filter(function (att) {
          return String(att.attendance_method || '').toLowerCase().includes('spot');
        }).length;

        return Utils.buildResponse(true, 'Event Admin dashboard loaded successfully.', {
          event: {
            eventId: eventId,
            eventName: eventObj.event_name || eventObj.EventName || eventObj.eventName,
            description: eventObj.description || eventObj.Description || '',
            venue: eventObj.venue || eventObj.Venue || 'N/A',
            startDate: eventObj.start_date || eventObj.StartDate || 'N/A',
            endDate: eventObj.end_date || eventObj.EndDate || 'N/A',
            startTime: eventObj.start_time || eventObj.StartTime || 'N/A',
            endTime: eventObj.end_time || eventObj.EndTime || 'N/A',
            status: eventObj.status || eventObj.Status || 'Active',
            eventType: eventObj.event_type || eventObj.event_category || 'General',
            attendanceType: eventObj.attendance_type || 'Open',
            capacity: eventObj.capacity || eventObj.MaximumCapacity || 'Unlimited',
            allowSpotRegistration: eventObj.allow_spot_registration !== false
          },
          cards: {
            present: totalPresent,
            absent: totalAbsent,
            registered: totalRegistered,
            attendancePercentage: attendancePct,
            spotRegistrations: spotRegistrations,
            coordinatorCount: coordAssignments.length,
            pendingRegistrations: pendingRegs
          },
          coordinators: coordAssignments.map(function (a) {
            return {
              assignmentId: a.assignment_id,
              userId: a.user_id,
              role: a.role,
              coordinatorType: a.coordinator_type || 'Faculty',
              status: a.status || 'Active',
              assignedAt: a.assigned_at
            };
          })
        });

      } catch (e) {
        Logger.log('[ERROR][EventAdminService.getEventAdminDashboard] ' + (e.message || e));
        return Utils.buildResponse(false, 'Failed to load Event Admin dashboard: ' + (e.message || e));
      }
    });
  },

  /**
   * Assigns an existing user or creates a new inline coordinator for the selected event.
   * 
   * @param {string} sessionToken - Active Event Admin session token
   * @param {string} eventId - Target Event ID
   * @param {object} payload - { targetUserId, role, coordinatorType, username, password, email, mobile, name }
   * @returns {object} Response object
   */
  assignCoordinator: function (sessionToken, eventId, payload) {
    return SessionService.withSession(sessionToken, function (callerUserId) {
      try {
        if (!eventId || !payload) return Utils.buildResponse(false, 'Missing eventId or payload.');

        var targetUserId = payload.targetUserId;
        var coordType = payload.coordinatorType || 'Faculty';

        // Inline Creation: If no existing user ID provided, create new coordinator account in 'users' table
        if (!targetUserId && payload.username && payload.password) {
          var username = String(payload.username).trim().toLowerCase();

          var existing = DatabaseService.findByColumn(CONFIG.TABLES.USERS, 'username', username, { strict: true });
          if (existing && existing.length > 0) {
            return Utils.buildResponse(false, 'Username "' + username + '" is already taken.');
          }

          targetUserId = 'USER_COORD_' + Math.floor(100000 + Math.random() * 900000);
          var hashedPassword = SecurityUtils.hashPassword ? SecurityUtils.hashPassword(payload.password) : payload.password;

          var newCoordRecord = {
            user_id: targetUserId,
            username: username,
            password_hash: hashedPassword,
            email_address: payload.email ? String(payload.email).trim() : '',
            phone_number: payload.mobile ? String(payload.mobile).trim() : '',
            first_name: payload.name ? String(payload.name).trim() : 'Coordinator',
            role: 'Coordinator',
            default_role: 'Coordinator',
            status: 'Active',
            created_at: new Date().toISOString()
          };

          DatabaseService.insertRow(CONFIG.TABLES.USERS, newCoordRecord);
        }

        if (!targetUserId) {
          return Utils.buildResponse(false, 'Coordinator Target User ID or new account credentials required.');
        }

        // Check if assignment already exists
        var existingAssignments = DatabaseService.findByColumn(CONFIG.TABLES.EVENT_ASSIGNMENTS, 'event_id', eventId, { strict: true }) || [];
        var match = existingAssignments.find(function (a) {
          return String(a.user_id) === String(targetUserId) && String(a.role).toLowerCase() === 'coordinator';
        });

        if (match) {
          return Utils.buildResponse(false, 'User is already assigned as Coordinator for this event.');
        }

        // Insert new assignment record
        var assignmentId = 'ASSIGN_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
        var assignmentRecord = {
          assignment_id: assignmentId,
          event_id: eventId,
          user_id: targetUserId,
          role: 'Coordinator',
          coordinator_type: coordType,
          status: 'Active',
          assigned_by: callerUserId,
          assigned_at: new Date().toISOString()
        };

        DatabaseService.insertRow(CONFIG.TABLES.EVENT_ASSIGNMENTS, assignmentRecord);

        // Audit Log
        try {
          DatabaseService.insertRow(CONFIG.TABLES.AUDIT_LOGS, {
            log_id: 'LOG_ASSIGN_' + new Date().getTime(),
            user_id: callerUserId,
            action: 'ASSIGN_COORDINATOR',
            target_entity: 'event_assignments',
            new_value: assignmentRecord,
            session_token: sessionToken,
            created_at: new Date().toISOString()
          });
        } catch (aErr) {}

        return Utils.buildResponse(true, 'Coordinator assigned to event successfully.', {
          assignmentId: assignmentId,
          userId: targetUserId,
          eventId: eventId,
          coordinatorType: coordType
        });

      } catch (e) {
        Logger.log('[ERROR][EventAdminService.assignCoordinator] ' + (e.message || e));
        return Utils.buildResponse(false, 'Failed to assign coordinator: ' + (e.message || e));
      }
    });
  },

  /**
   * Removes or deactivates a coordinator assignment for an event.
   * 
   * @param {string} sessionToken - Active session token
   * @param {string} assignmentId - Assignment ID to remove
   * @param {string} remarks - Optional reason for removal
   * @returns {object} Response object
   */
  removeAssignment: function (sessionToken, assignmentId, remarks) {
    return SessionService.withSession(sessionToken, function (callerUserId) {
      try {
        if (!assignmentId) return Utils.buildResponse(false, 'Assignment ID required.');

        var records = DatabaseService.findByColumn(CONFIG.TABLES.EVENT_ASSIGNMENTS, 'assignment_id', assignmentId, { strict: true });
        if (!records || records.length === 0) {
          return Utils.buildResponse(false, 'Assignment record not found.');
        }

        var record = records[0];
        record.status = 'Removed';
        record.removed_by = callerUserId;
        record.removed_at = new Date().toISOString();
        record.remarks = remarks || 'Removed by Event Admin';

        DatabaseService.updateRow(CONFIG.TABLES.EVENT_ASSIGNMENTS, 'assignment_id', assignmentId, record);

        return Utils.buildResponse(true, 'Assignment removed successfully.', { assignmentId: assignmentId });

      } catch (e) {
        Logger.log('[ERROR][EventAdminService.removeAssignment] ' + (e.message || e));
        return Utils.buildResponse(false, 'Failed to remove assignment: ' + (e.message || e));
      }
    });
  }
};
