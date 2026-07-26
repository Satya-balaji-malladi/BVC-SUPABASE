/**
 * CoordinatorService
 * Handles all logic for Coordinator Management and Event assignments (Sprint 1)
 */
const CoordinatorService = {

  _normId: function(id) {
    if (!id) return '';
    let clean = String(id).toUpperCase().replace(/[^A-Z0-9]/g, '');
    let match = clean.match(/([A-Z]+)0*(\d+)/);
    return match ? (match[1] + match[2]) : clean;
  },

  _tryWrap: function(methodName, failureMessage, fn) {
    if (typeof failureMessage === 'function') {
      fn = failureMessage;
      failureMessage = 'Coordinator action failed.';
    }
    try {
      return fn();
    } catch (error) {
      Logger.log('CoordinatorService.' + methodName + ' error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, failureMessage);
    }
  },

  assignCoordinator: function(eventId, userId, role, assignedBy, remarks) {
    return this._tryWrap('assignCoordinator', 'Failed to assign coordinator.', () => {
      // Security Check: Only the Event Admin can assign coordinators
      if (assignedBy && assignedBy !== 'System') {
        const isAuthorized = SecurityUtils.isEventAdmin(eventId, assignedBy);
        if (!isAuthorized) {
          return Utils.buildResponse(false, 'Unauthorized: Only Event Admins can assign coordinators.');
        }
      }

      // 1. Verify Event exists
      const event = EventService.getEventById(eventId);
      if (!event) {
        return Utils.buildResponse(false, 'Event not found.');
      }
      
      // 2. Verify User exists and is active
      const user = UserService.getUserById(userId);
      if (!user) {
        return Utils.buildResponse(false, 'User not found.');
      }
      const userStatus = user.Status || user.status;
      if (userStatus !== 'Active') {
        return Utils.buildResponse(false, 'Cannot assign an inactive user.');
      }

      // 3. Prevent duplicate assignments
      const all = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      const duplicate = all.find(a => 
        String(a['Event ID']).trim() === String(eventId).trim() && 
        this._normId(a['User ID']) === this._normId(userId) &&
        a['Assignment Status'] === 'Active'
      );
      if (duplicate) {
        return Utils.buildResponse(false, 'User is already assigned to this event.');
      }

      // 4. Primary/Lead Coordinator Singleton validation
      // Physical validations allow: Primary Coordinator, Coordinator, Volunteer Coordinator.
      // We map Lead Coordinator to Primary Coordinator.
      const targetRole = (role === 'Lead Coordinator' || role === 'Primary Coordinator') ? 'Primary Coordinator' : (role || 'Coordinator');
      const isLead = targetRole === 'Primary Coordinator';
      if (isLead) {
        const leadExist = all.some(a =>
          String(a['Event ID']).trim() === String(eventId).trim() &&
          a['Assignment Status'] === 'Active' &&
          (a['Assignment Role'] === 'Primary Coordinator' || a['Assignment Role'] === 'Lead Coordinator')
        );
        if (leadExist) {
          return Utils.buildResponse(false, 'A Lead Coordinator is already assigned to this event.');
        }
      }

      // 5. Generate next ID
      const assignmentId = IdService._generateNextIdWithLock('EVENT_COORDINATORS');
      const nowStr = Utils.formatDate(new Date());

      const record = {
        'Assignment ID': assignmentId,
        'Event ID': eventId,
        'User ID': userId,
        'Assignment Role': targetRole,
        'Assignment Status': 'Active',
        'Assigned By': assignedBy || 'System',
        'Assigned Date': nowStr,
        'Updated By': assignedBy || 'System',
        'Updated Date': nowStr,
        'Remarks': remarks || ''
      };

      const success = DatabaseService.insertRow(CONFIG.SHEETS.EVENT_COORDINATORS, record);
      if (success) {
        try {
          const assignmentRecord = {
            'Assignment ID': assignmentId,
            'Event ID': eventId,
            'User ID': userId,
            'Role': targetRole,
            'Assigned By': assignedBy || 'System',
            'Assigned At': nowStr,
            'Deletion Flag': false
          };
          DatabaseService.insertRow(CONFIG.SHEETS.EVENT_ASSIGNMENTS, assignmentRecord);
        } catch (e) {
          Logger.log('Error syncing to event_assignments: ' + e.message);
        }

        try {
          AuditService.logAction(
            assignedBy || 'System',
            'CoordinatorService',
            'ASSIGN_COORDINATOR',
            assignmentId,
            'CoordinatorAssignment',
            'Coordinator assigned to event ' + eventId,
            '',
            'SUCCESS',
            userId
          );
        } catch (e) {
          Logger.log(e);
        }
        return Utils.buildResponse(true, 'Coordinator assigned successfully.', { assignment: record });
      }
      return Utils.buildResponse(false, 'Failed to insert coordinator assignment row.');
    });
  },

  removeCoordinator: function(assignmentId, userId) {
    return this._tryWrap('removeCoordinator', 'Failed to remove coordinator.', () => {
      const all = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      const record = all.find(a => String(a['Assignment ID']).trim() === String(assignmentId).trim());
      if (!record) {
        return Utils.buildResponse(false, 'Assignment record not found.');
      }

      // Security Check: Only the Event Admin can remove coordinators
      if (userId && userId !== 'System') {
        const isAuthorized = SecurityUtils.isEventAdmin(record['Event ID'], userId);
        if (!isAuthorized) {
          return Utils.buildResponse(false, 'Unauthorized: Only Event Admins can remove coordinators.');
        }
      }

      // Validated values restrict status to 'Active', 'Removed'.
      const updates = {
        'Assignment Status': 'Removed',
        'Updated By': userId || 'System',
        'Updated Date': Utils.formatDate(new Date())
      };

      const success = DatabaseService.updateRow(CONFIG.SHEETS.EVENT_COORDINATORS, 'Assignment ID', assignmentId, updates);
      if (success) {
        try {
          DatabaseService.updateRow(CONFIG.SHEETS.EVENT_ASSIGNMENTS, 'Assignment ID', assignmentId, {
            'Deletion Flag': true
          });
        } catch (e) {
          Logger.log('Error syncing removal to event_assignments: ' + e.message);
        }

        try {
          AuditService.logAction(
            userId || 'System',
            'CoordinatorService',
            'REMOVE_COORDINATOR',
            assignmentId,
            'CoordinatorAssignment',
            'Coordinator assignment marked Removed',
            '',
            'SUCCESS',
            record['User ID']
          );
        } catch (e) {
          Logger.log(e);
        }
        return Utils.buildResponse(true, 'Coordinator removed successfully.');
      }
      return Utils.buildResponse(false, 'Failed to update assignment status.');
    });
  },

  updateCoordinatorRole: function(assignmentId, newRole, updatedBy) {
    return this._tryWrap('updateCoordinatorRole', 'Failed to update role.', () => {
      const all = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      const record = all.find(a => String(a['Assignment ID']).trim() === String(assignmentId).trim());
      if (!record) {
        return Utils.buildResponse(false, 'Assignment record not found.');
      }

      // Security Check: Only the Event Admin can update coordinator roles
      if (updatedBy && updatedBy !== 'System') {
        const isAuthorized = SecurityUtils.isEventAdmin(record['Event ID'], updatedBy);
        if (!isAuthorized) {
          return Utils.buildResponse(false, 'Unauthorized: Only Event Admins can update coordinator roles.');
        }
      }

      const targetRole = (newRole === 'Lead Coordinator' || newRole === 'Primary Coordinator') ? 'Primary Coordinator' : (newRole || 'Coordinator');

      // Lead Coordinator singleton check
      const isLead = targetRole === 'Primary Coordinator';
      if (isLead) {
        const leadExist = all.some(a =>
          String(a['Event ID']).trim() === String(record['Event ID']).trim() &&
          String(a['Assignment ID']).trim() !== String(assignmentId).trim() &&
          a['Assignment Status'] === 'Active' &&
          (a['Assignment Role'] === 'Primary Coordinator' || a['Assignment Role'] === 'Lead Coordinator')
        );
        if (leadExist) {
          return Utils.buildResponse(false, 'A Lead Coordinator is already assigned to this event.');
        }
      }

      const updates = {
        'Assignment Role': targetRole,
        'Updated By': updatedBy || 'System',
        'Updated Date': Utils.formatDate(new Date())
      };

      const success = DatabaseService.updateRow(CONFIG.SHEETS.EVENT_COORDINATORS, 'Assignment ID', assignmentId, updates);
      if (success) {
        try {
          DatabaseService.updateRow(CONFIG.SHEETS.EVENT_ASSIGNMENTS, 'Assignment ID', assignmentId, {
            'Role': targetRole
          });
        } catch (e) {
          Logger.log('Error syncing update to event_assignments: ' + e.message);
        }
        return Utils.buildResponse(true, 'Role updated successfully.');
      }
      return Utils.buildResponse(false, 'Failed to update role.');
    });
  },

  activateCoordinator: function(assignmentId, updatedBy) {
    return this._tryWrap('activateCoordinator', 'Failed to activate coordinator.', () => {
      const all = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      const record = all.find(a => String(a['Assignment ID']).trim() === String(assignmentId).trim());
      if (!record) {
        return Utils.buildResponse(false, 'Assignment record not found.');
      }

      // Security Check: Only the Event Admin can activate coordinators
      if (updatedBy && updatedBy !== 'System') {
        const isAuthorized = SecurityUtils.isEventAdmin(record['Event ID'], updatedBy);
        if (!isAuthorized) {
          return Utils.buildResponse(false, 'Unauthorized: Only Event Admins can activate coordinators.');
        }
      }

      const updates = {
        'Assignment Status': 'Active',
        'Updated By': updatedBy || 'System',
        'Updated Date': Utils.formatDate(new Date())
      };
      const success = DatabaseService.updateRow(CONFIG.SHEETS.EVENT_COORDINATORS, 'Assignment ID', assignmentId, updates);
      if (success) {
        try {
          DatabaseService.updateRow(CONFIG.SHEETS.EVENT_ASSIGNMENTS, 'Assignment ID', assignmentId, {
            'Deletion Flag': false
          });
        } catch (e) {
          Logger.log('Error syncing activation to event_assignments: ' + e.message);
        }
        return Utils.buildResponse(true, 'Coordinator activated successfully.');
      }
      return Utils.buildResponse(false, 'Failed to activate coordinator.');
    });
  },

  deactivateCoordinator: function(assignmentId, updatedBy) {
    return this._tryWrap('deactivateCoordinator', 'Failed to deactivate coordinator.', () => {
      const all = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      const record = all.find(a => String(a['Assignment ID']).trim() === String(assignmentId).trim());
      if (!record) {
        return Utils.buildResponse(false, 'Assignment record not found.');
      }

      // Security Check: Only the Event Admin can deactivate coordinators
      if (updatedBy && updatedBy !== 'System') {
        const isAuthorized = SecurityUtils.isEventAdmin(record['Event ID'], updatedBy);
        if (!isAuthorized) {
          return Utils.buildResponse(false, 'Unauthorized: Only Event Admins can deactivate coordinators.');
        }
      }

      const updates = {
        'Assignment Status': 'Removed',
        'Updated By': updatedBy || 'System',
        'Updated Date': Utils.formatDate(new Date())
      };
      const success = DatabaseService.updateRow(CONFIG.SHEETS.EVENT_COORDINATORS, 'Assignment ID', assignmentId, updates);
      if (success) {
        try {
          DatabaseService.updateRow(CONFIG.SHEETS.EVENT_ASSIGNMENTS, 'Assignment ID', assignmentId, {
            'Deletion Flag': true
          });
        } catch (e) {
          Logger.log('Error syncing deactivation to event_assignments: ' + e.message);
        }
        return Utils.buildResponse(true, 'Coordinator deactivated successfully.');
      }
      return Utils.buildResponse(false, 'Failed to deactivate coordinator.');
    });
  },

  getCoordinatorById: function(assignmentId) {
    if (!assignmentId) return null;
    const records = DatabaseService.findByColumn(CONFIG.SHEETS.EVENT_COORDINATORS, 'Assignment ID', assignmentId) || [];
    return records.length > 0 ? records[0] : null;
  },

  getCoordinatorByUserId: function(userId) {
    if (!userId) return [];
    const targetNorm = this._normId(userId);
    const allAssignments = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
    return allAssignments.filter(row => this._normId(row['User ID']) === targetNorm);
  },

  getCoordinatorByEmployeeId: function(employeeId) {
    if (!employeeId) return [];
    const users = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, 'Employee ID', employeeId) || [];
    if (users.length === 0) return [];
    return this.getCoordinatorByUserId(users[0]['User ID']);
  },

  getCoordinatorByEvent: function(eventId) {
    if (!eventId) return [];
    return DatabaseService.findByColumn(CONFIG.SHEETS.EVENT_COORDINATORS, 'Event ID', eventId) || [];
  },

  getEventsByCoordinator: function(userId) {
    if (!userId) return [];
    const assignments = this.getCoordinatorByUserId(userId);
    const active = assignments.filter(a => a['Assignment Status'] === 'Active');
    const events = [];
    active.forEach(a => {
      const event = EventService.getEventById(a['Event ID']);
      if (event) events.push(event);
    });
    return events;
  },

  getAllCoordinators: function() {
    return DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
  },

  // Alias methods for compliance with full test suite mapping
  createCoordinator: function(eventId, userId, role, assignedBy, remarks) {
    return this.assignCoordinator(eventId, userId, role, assignedBy, remarks);
  },

  updateCoordinator: function(assignmentId, updates) {
    return this._tryWrap('updateCoordinator', 'Failed to update coordinator.', () => {
      const success = DatabaseService.updateRow(CONFIG.SHEETS.EVENT_COORDINATORS, 'Assignment ID', assignmentId, updates);
      if (success) return Utils.buildResponse(true, 'Coordinator updated successfully.');
      return Utils.buildResponse(false, 'Failed to update coordinator.');
    });
  },

  deleteCoordinator: function(assignmentId, userId) {
    return this.removeCoordinator(assignmentId, userId);
  },

  // ==========================================
  // NEW AUTHORIZATION & SINGLE SOURCE OF TRUTH METHODS
  // ==========================================

  canManageEvent: function(userId, eventId) {
    const startTime = Date.now();
    Logger.log('[START] CoordinatorService.canManageEvent | Input - User ID: ' + userId + ', Event ID: ' + eventId);
    
    try {
      if (!userId || !eventId) {
        Logger.log('[OUTPUT] CoordinatorService.canManageEvent -> false (Missing inputs) | Execution Time: ' + (Date.now() - startTime) + 'ms');
        Logger.log('[END] CoordinatorService.canManageEvent');
        return false;
      }

      Logger.log('[DATABASE QUERY] Reading rows from Event Coordinators sheet.');
      const allRows = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      Logger.log('[DATABASE RESULT] Fetched ' + allRows.length + ' rows.');

      const hasAccess = allRows.some(row => 
        this._normId(row['User ID']) === this._normId(userId) &&
        String(row['Event ID']).trim() === String(eventId).trim() &&
        String(row['Assignment Status']).trim() === 'Active'
      );

      Logger.log('[OUTPUT] CoordinatorService.canManageEvent -> ' + hasAccess + ' | Execution Time: ' + (Date.now() - startTime) + 'ms');
      Logger.log('[END] CoordinatorService.canManageEvent');
      return hasAccess;
    } catch (error) {
      Logger.log('[ERROR] CoordinatorService.canManageEvent: ' + error.message);
      return false;
    }
  },

  getActiveAssignment: function(userId, eventId) {
    const startTime = Date.now();
    Logger.log('[START] CoordinatorService.getActiveAssignment | Input - User ID: ' + userId + ', Event ID: ' + eventId);
    
    try {
      if (!userId || !eventId) {
        Logger.log('[OUTPUT] CoordinatorService.getActiveAssignment -> null | Execution Time: ' + (Date.now() - startTime) + 'ms');
        Logger.log('[END] CoordinatorService.getActiveAssignment');
        return null;
      }

      Logger.log('[DATABASE QUERY] Reading rows from Event Coordinators sheet.');
      const allRows = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      Logger.log('[DATABASE RESULT] Fetched ' + allRows.length + ' rows.');

      const assignment = allRows.find(row => 
        this._normId(row['User ID']) === this._normId(userId) &&
        String(row['Event ID']).trim() === String(eventId).trim() &&
        String(row['Assignment Status']).trim() === 'Active'
      ) || null;

      Logger.log('[OUTPUT] CoordinatorService.getActiveAssignment -> ' + (assignment ? 'Record Found' : 'null') + ' | Execution Time: ' + (Date.now() - startTime) + 'ms');
      Logger.log('[END] CoordinatorService.getActiveAssignment');
      return assignment;
    } catch (error) {
      Logger.log('[ERROR] CoordinatorService.getActiveAssignment: ' + error.message);
      return null;
    }
  },

  getPrimaryCoordinator: function(eventId) {
    const startTime = Date.now();
    Logger.log('[START] CoordinatorService.getPrimaryCoordinator | Input - Event ID: ' + eventId);
    
    try {
      if (!eventId) {
        Logger.log('[OUTPUT] CoordinatorService.getPrimaryCoordinator -> null | Execution Time: ' + (Date.now() - startTime) + 'ms');
        Logger.log('[END] CoordinatorService.getPrimaryCoordinator');
        return null;
      }

      Logger.log('[DATABASE QUERY] Reading rows from Event Coordinators sheet.');
      const allRows = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      Logger.log('[DATABASE RESULT] Fetched ' + allRows.length + ' rows.');

      const primary = allRows.find(row => 
        String(row['Event ID']).trim() === String(eventId).trim() &&
        String(row['Assignment Status']).trim() === 'Active' &&
        (String(row['Assignment Role']).trim() === 'Primary Coordinator' || String(row['Assignment Role']).trim() === 'Lead Coordinator')
      ) || null;

      Logger.log('[OUTPUT] CoordinatorService.getPrimaryCoordinator -> ' + (primary ? 'Primary Coordinator Found' : 'null') + ' | Execution Time: ' + (Date.now() - startTime) + 'ms');
      Logger.log('[END] CoordinatorService.getPrimaryCoordinator');
      return primary;
    } catch (error) {
      Logger.log('[ERROR] CoordinatorService.getPrimaryCoordinator: ' + error.message);
      return null;
    }
  },

  getAssignedEventIds: function(userId) {
    const startTime = Date.now();
    Logger.log('[START] CoordinatorService.getAssignedEventIds | Input - User ID: ' + userId);
    
    try {
      if (!userId) {
        Logger.log('[OUTPUT] CoordinatorService.getAssignedEventIds -> [] | Execution Time: ' + (Date.now() - startTime) + 'ms');
        Logger.log('[END] CoordinatorService.getAssignedEventIds');
        return [];
      }

      const cacheKey = "coord_assigned_events_" + userId;
      if (typeof CacheManager !== 'undefined') {
        const cached = CacheManager.get(cacheKey);
        if (cached && Array.isArray(cached)) {
          Logger.log('[OUTPUT] CoordinatorService.getAssignedEventIds (cached) -> Count: ' + cached.length);
          return cached;
        }
      }

      Logger.log('[DATABASE QUERY] Reading rows from Event Coordinators sheet.');
      const allRows = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      Logger.log('[DATABASE RESULT] Fetched ' + allRows.length + ' rows.');

      // Handle both snake_case (from Supabase) and Title Case field names
      const assignedEventIds = allRows
        .filter(row => {
          const rowUserId = row['User ID'] || row['user_id'] || '';
          const rowStatus = row['Assignment Status'] || row['assignment_status'] || '';
          return this._normId(rowUserId) === this._normId(userId) &&
                 String(rowStatus).trim().toLowerCase() === 'active';
        })
        .map(row => String(row['Event ID'] || row['event_id'] || '').trim())
        .filter(id => id.length > 0);

      Logger.log('[getAssignedEventIds] Assigned Event IDs from EventCoordinators: ' + JSON.stringify(assignedEventIds));

      // Fallback: Also check EVENTS table for events where user is primary coordinator_id or creator
      const allEvents = EventService.getAllEvents() || [];
      const coordinatorIdCol = CONFIG.COLUMNS.COORDINATOR_ID || 'Organizer';
      const createdByCol = CONFIG.COLUMNS.CREATED_BY || 'Created By';
      const primaryEvents = allEvents.filter(ev => {
        const cId = this._normId(
          ev[coordinatorIdCol] || ev.coordinatorId || ev.coordinator_id || ev['Coordinator ID'] || ev.Organizer
        );
        const crId = this._normId(
          ev[createdByCol] || ev.created_by || ev.createdBy || ev['Created By']
        );
        const uId = this._normId(userId);
        return (cId === uId || crId === uId);
      }).map(ev => String(ev[CONFIG.COLUMNS.EVENT_ID] || ev.eventId || ev.event_id || ev['Event ID'] || '').trim())
        .filter(id => id.length > 0);

      Logger.log('[getAssignedEventIds] Primary Event IDs (coordinator/creator): ' + JSON.stringify(primaryEvents));

      const combinedIds = Array.from(new Set(assignedEventIds.concat(primaryEvents)));
      Logger.log('[getAssignedEventIds] Combined Event IDs: ' + JSON.stringify(combinedIds));

      const activeEventIds = combinedIds.filter(id => {
        const event = EventService.getEventById(id);
        if (!event) return false;
        const status = (event.status || event['Event Status'] || '').toUpperCase();
        return status !== 'COMPLETED' && status !== 'CANCELLED';
      });

      if (typeof CacheManager !== 'undefined' && activeEventIds) {
        CacheManager.put(cacheKey, activeEventIds, 60);
      }
      Logger.log('[OUTPUT] CoordinatorService.getAssignedEventIds -> Count: ' + activeEventIds.length + ' | Execution Time: ' + (Date.now() - startTime) + 'ms');
      Logger.log('[END] CoordinatorService.getAssignedEventIds');
      return activeEventIds;
    } catch (error) {
      Logger.log('[ERROR] CoordinatorService.getAssignedEventIds: ' + error.message);
      return [];
    }
  },

  getAssignedEvents: function(userId) {
    const startTime = Date.now();
    Logger.log('[START] CoordinatorService.getAssignedEvents | Input - User ID: ' + userId);
    
    try {
      if (!userId) {
        Logger.log('[OUTPUT] CoordinatorService.getAssignedEvents -> [] | Execution Time: ' + (Date.now() - startTime) + 'ms');
        Logger.log('[END] CoordinatorService.getAssignedEvents');
        return [];
      }

      const eventIds = this.getAssignedEventIds(userId);
      const events = [];

      Logger.log('[DATABASE QUERY] Fetching full event objects through EventService.');
      eventIds.forEach(id => {
        const event = EventService.getEventById(id);
        if (event) events.push(event);
      });
      Logger.log('[DATABASE RESULT] Successfully compiled full event entities.');

      Logger.log('[OUTPUT] CoordinatorService.getAssignedEvents -> Compiled: ' + events.length + ' events | Execution Time: ' + (Date.now() - startTime) + 'ms');
      Logger.log('[END] CoordinatorService.getAssignedEvents');
      return events;
    } catch (error) {
      Logger.log('[ERROR] CoordinatorService.getAssignedEvents: ' + error.message);
      return [];
    }
  },

  isCoordinatorAssigned: function(userId) {
    const startTime = Date.now();
    Logger.log('[START] CoordinatorService.isCoordinatorAssigned | Input - User ID: ' + userId);
    
    try {
      if (!userId) {
        Logger.log('[OUTPUT] CoordinatorService.isCoordinatorAssigned -> false | Execution Time: ' + (Date.now() - startTime) + 'ms');
        Logger.log('[END] CoordinatorService.isCoordinatorAssigned');
        return false;
      }

      Logger.log('[DATABASE QUERY] Reading rows from Event Coordinators sheet.');
      const allRows = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      Logger.log('[DATABASE RESULT] Fetched ' + allRows.length + ' rows.');

      const hasAssignment = allRows.some(row => 
        this._normId(row['User ID']) === this._normId(userId) && 
        String(row['Assignment Status']).trim() === 'Active'
      );

      Logger.log('[OUTPUT] CoordinatorService.isCoordinatorAssigned -> ' + hasAssignment + ' | Execution Time: ' + (Date.now() - startTime) + 'ms');
      Logger.log('[END] CoordinatorService.isCoordinatorAssigned');
      return hasAssignment;
    } catch (error) {
      Logger.log('[ERROR] CoordinatorService.isCoordinatorAssigned: ' + error.message);
      return false;
    }
  },

  validateCoordinatorSession: function(sessionUser) {
    return this._tryWrap('validateCoordinatorSession', 'Session validation failed.', () => {
      const startTime = Date.now();
      Logger.log('[START] CoordinatorService.validateCoordinatorSession | Input: ' + (sessionUser ? JSON.stringify(sessionUser) : 'null'));

      // 1. Check if Session Exists
      if (!sessionUser) {
        Logger.log('[OUTPUT] CoordinatorService.validateCoordinatorSession -> Session does not exist.');
        return Utils.buildResponse(false, 'Session does not exist.');
      }

      const userId = sessionUser.userId || sessionUser.id || sessionUser['User ID'] || sessionUser['user_id'] || sessionUser.user_id;

      // 2. Check if User Exists
      Logger.log('[DATABASE QUERY] Finding user by ID: ' + userId);
      const user = UserService.getUserById(userId);
      Logger.log('[DATABASE RESULT] User retrieval complete.');
      
      if (!user) {
        Logger.log('[OUTPUT] CoordinatorService.validateCoordinatorSession -> User record not found.');
        return Utils.buildResponse(false, 'User not found.');
      }

      // 3. Check if Role allows coordinator terminal access
      // Allow 'Coordinator', 'Event Admin', 'SuperAdmin', 'Admin' roles
      const userRole = String(user.Role || user.role || user['Role'] || '').toUpperCase();
      const allowedRoles = ['COORDINATOR', 'EVENT ADMIN', 'SUPERADMIN', 'ADMIN'];
      if (!allowedRoles.includes(userRole)) {
        Logger.log('[OUTPUT] CoordinatorService.validateCoordinatorSession -> User is not authorized as a coordinator. Role: ' + userRole);
        return Utils.buildResponse(false, 'User is not authorized as a coordinator.');
      }

      // 4. Check if Assignment Exists & 5. Assignment is Active
      Logger.log('[DATABASE QUERY] Querying Event Coordinators sheet for active assignments.');
      const allAssignments = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      Logger.log('[DATABASE RESULT] Assignment rows gathered.');

      const normTargetUser = this._normId(userId);
      const hasActiveAssignment = allAssignments.some(row => {
        // Handle both snake_case (Supabase) and Title Case field names
        const rowUserId = row['User ID'] || row['user_id'] || row.userId || row.user_id || '';
        const rowStatus = row['Assignment Status'] || row['assignment_status'] || row.status || '';
        return this._normId(rowUserId) === normTargetUser &&
               String(rowStatus).trim().toLowerCase() === 'active';
      });

      // Admins and SuperAdmins bypass active assignment restriction
      if (!hasActiveAssignment && userRole !== 'SUPERADMIN' && userRole !== 'ADMIN') {
        Logger.log('[OUTPUT] CoordinatorService.validateCoordinatorSession -> No active event assignment found.');
        return Utils.buildResponse(false, 'No active event assignment found for this coordinator.');
      }

      Logger.log('[OUTPUT] CoordinatorService.validateCoordinatorSession -> Success | Execution Time: ' + (Date.now() - startTime) + 'ms');
      Logger.log('[END] CoordinatorService.validateCoordinatorSession');
      return Utils.buildResponse(true, 'Coordinator session is valid and active.', { user: user });
    });
  },

  // ==========================================================================
  //  DYNAMIC FIELD PARSER
  // ==========================================================================
  parseRegistrationFields: function(event) {
    if (!event) return [];
    var rawFields = event[CONFIG.COLUMNS.EVENT_REGISTRATION_FIELDS] !== undefined 
      ? event[CONFIG.COLUMNS.EVENT_REGISTRATION_FIELDS] 
      : (event.registration_fields || event.registrationFields || event['Registration Fields']);
    
    if (!rawFields) return [];
    if (Array.isArray(rawFields)) return rawFields;
    
    try {
      if (typeof rawFields === 'string') {
        var parsed = JSON.parse(rawFields);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.fields)) return parsed.fields;
          return [parsed];
        }
      }
    } catch(e) {
      Logger.log('[CoordinatorService.parseRegistrationFields] Warn: Malformed JSON fields: ' + e.message);
    }
    return [];
  },

  // ==========================================================================
  //  CENTRAL ORCHESTRATOR: processParticipantForEvent
  // ==========================================================================
  processParticipantForEvent: function(sessionToken, eventId, rawRollNumber) {
    var startTime = Date.now();
    Logger.log('[COORDINATOR-FLOW][01] Roll number received: ' + rawRollNumber + ' | Event ID: ' + eventId);

    if (!rawRollNumber || String(rawRollNumber).trim() === '') {
      Logger.log('[COORDINATOR-FLOW][13] Response state: INVALID_ROLL_NUMBER');
      return Utils.buildResponse(false, 'Roll number is required.', { state: 'INVALID_ROLL_NUMBER' });
    }
    var normRoll = String(rawRollNumber).trim().toUpperCase();

    // 1. Validate Session & Coordinator Authorization
    var userId = SessionService.getCurrentUser(sessionToken);
    if (!userId) {
      Logger.log('[COORDINATOR-FLOW][02] Session validation FAILED');
      return Utils.buildResponse(false, 'Invalid or expired session.', { state: 'UNAUTHORIZED' });
    }
    var actionUser = UserService.getUserById(userId);
    var validation = this.validateCoordinatorSession(actionUser);
    if (!validation.success) {
      Logger.log('[COORDINATOR-FLOW][02] Coordinator validation FAILED: ' + validation.message);
      return Utils.buildResponse(false, validation.message, { state: 'UNAUTHORIZED' });
    }
    Logger.log('[COORDINATOR-FLOW][02] Session validation PASS | User ID: ' + userId);

    // 2. Validate Event & Eligibility
    Logger.log('[COORDINATOR-FLOW][03] Loading event configuration');
    var event = EventService.getEventById(eventId);
    if (!event) {
      Logger.log('[COORDINATOR-FLOW][03] Event NOT FOUND: ' + eventId);
      return Utils.buildResponse(false, 'Event not found or deleted.', { state: 'EVENT_NOT_AVAILABLE' });
    }
    var status = String(event.event_status || event['Event Status'] || event.status || '').toUpperCase();
    if (status === 'CANCELLED') {
      Logger.log('[COORDINATOR-FLOW][03] Event status inactive: ' + status);
      return Utils.buildResponse(false, 'Event is no longer active for attendance.', { state: 'EVENT_NOT_AVAILABLE' });
    }

    // 3. Duplicate Participation Check
    Logger.log('[COORDINATOR-FLOW][15] Checking duplicate participation');
    var alreadyAttended = AttendanceService.hasStudentAttended(eventId, normRoll);
    if (alreadyAttended) {
      Logger.log('[COORDINATOR-FLOW][15] Duplicate detected for roll: ' + normRoll);
      var attendanceList = AttendanceService.getAttendanceByEvent(eventId) || [];
      var existingRecord = attendanceList.find(function(a) {
        var r = a['Roll Number'] || a.roll_number || '';
        return String(r).trim().toUpperCase() === normRoll && !a['Deletion Flag'];
      });
      var studentObj = StudentService.getStudentByRollNumber(normRoll) || {};
      return Utils.buildResponse(true, 'Participation has already been recorded for this student.', {
        state: 'ALREADY_MARKED',
        rollNumber: normRoll,
        studentName: studentObj['Student Name'] || studentObj.student_name || 'Participant',
        recordedAt: existingRecord ? (existingRecord.Timestamp || existingRecord.timestamp || existingRecord.Date || existingRecord.time) : new Date().toISOString(),
        record: existingRecord
      });
    }

    // 4. Student Database Lookup (BVC & External)
    Logger.log('[COORDINATOR-FLOW][05] BVC lookup started');
    var student = StudentService.getStudentByRollNumber(normRoll);
    var studentSource = 'UNKNOWN';
    if (student) {
      var college = String(student.College || student.college_name || '').toLowerCase();
      studentSource = (!college || college.includes('bvc') || college.includes('bonam')) ? 'BVC' : 'EXTERNAL';
      Logger.log('[COORDINATOR-FLOW][06] Student found. Source: ' + studentSource);
    } else {
      Logger.log('[COORDINATOR-FLOW][06] Student NOT FOUND in master databases');
    }
    Logger.log('[COORDINATOR-FLOW][08] Participant source: ' + studentSource);

    // 5. Parse Configured Registration Fields
    var configuredFields = this.parseRegistrationFields(event);
    Logger.log('[COORDINATOR-FLOW][11] Configured fields loaded: ' + configuredFields.length);

    // 6. Registration Requirement Evaluation
    var regRequiredVal = event[CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION] !== undefined 
      ? event[CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION] 
      : (event.enable_registration || event.enableRegistration || false);
    var isRegRequired = String(regRequiredVal).toLowerCase() === 'true';
    Logger.log('[COORDINATOR-FLOW][04] Registration required: ' + (isRegRequired ? 'TRUE' : 'FALSE'));

    // Extract student attributes helper
    var studentName = student ? (student['Student Name'] || student.student_name || student.name || '') : '';
    var branch = student ? (student['Department ID'] || student.department || student.branch || '') : '';
    var collegeName = student ? (student.College || student.college_name || 'BVC Engineering College') : 'BVC Engineering College';
    var yearVal = student ? (student.Year || student.year || '1') : '';
    var sectionVal = student ? (student.Section || student.section || 'A') : '';

    var knownData = {
      rollNumber: normRoll,
      studentName: studentName,
      branch: branch,
      college: collegeName,
      year: yearVal,
      section: sectionVal,
      studentSource: studentSource,
      isKnownStudent: !!student
    };

    // Calculate missing required fields helper
    var checkMissingFields = function(configured, known) {
      var missing = [];
      configured.forEach(function(f) {
        var isReq = f.required === true || f.isRequired === true;
        if (!isReq) return;
        var key = (f.name || f.label || '').toLowerCase();
        var val = known[key] || (known.customData ? known.customData[key] : null);
        
        // Map common field names
        if (key.includes('name') && known.studentName) val = known.studentName;
        if (key.includes('roll') && known.rollNumber) val = known.rollNumber;
        if ((key.includes('branch') || key.includes('dept')) && known.branch) val = known.branch;
        if (key.includes('college') && known.college) val = known.college;
        
        if (!val || String(val).trim() === '') {
          missing.push(f);
        }
      });
      return missing;
    };

    // ------------------------------------------------------------------------
    // FLOW A: NO REGISTRATION REQUIRED
    // ------------------------------------------------------------------------
    if (!isRegRequired) {
      var missingFieldsA = checkMissingFields(configuredFields, knownData);
      Logger.log('[COORDINATOR-FLOW][12] Missing required fields: ' + JSON.stringify(missingFieldsA.map(m => m.name)));

      if (missingFieldsA.length > 0 && !student) {
        Logger.log('[COORDINATOR-FLOW][13] Response state: MISSING_REQUIRED_FIELDS');
        return Utils.buildResponse(true, 'Required participant details missing.', {
          state: 'MISSING_REQUIRED_FIELDS',
          event: event,
          studentData: knownData,
          missingFields: missingFieldsA,
          configuredFields: configuredFields
        });
      }

      Logger.log('[COORDINATOR-FLOW][13] Response state: READY_TO_MARK');
      return Utils.buildResponse(true, 'Participant ready for attendance confirmation.', {
        state: 'READY_TO_MARK',
        event: event,
        studentData: knownData,
        missingFields: missingFieldsA,
        configuredFields: configuredFields
      });
    }

    // ------------------------------------------------------------------------
    // FLOW B: REGISTRATION REQUIRED
    // ------------------------------------------------------------------------
    Logger.log('[COORDINATOR-FLOW][09] Checking event registration for roll: ' + normRoll);
    var participantsList = DatabaseService.findByColumn(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Event ID', eventId) || [];
    var registrationRecord = participantsList.find(function(p) {
      var r = p['Roll Number'] || p.roll_number || p.rollNumber || '';
      var status = String(p['Registration Status'] || p.registration_status || p.status || '').toLowerCase();
      return String(r).trim().toUpperCase() === normRoll && status !== 'cancelled' && status !== 'rejected' && !p['Deletion Flag'];
    });

    if (registrationRecord) {
      Logger.log('[COORDINATOR-FLOW][10] Registration found: REGISTERED');
      var customData = {};
      if (registrationRecord.custom_fields_data) {
        try { customData = JSON.parse(registrationRecord.custom_fields_data); } catch(e) {}
      }
      knownData.registrationRecord = registrationRecord;
      knownData.customData = customData;

      var missingFieldsB = checkMissingFields(configuredFields, knownData);
      if (missingFieldsB.length > 0) {
        Logger.log('[COORDINATOR-FLOW][13] Response state: MISSING_REQUIRED_FIELDS');
        return Utils.buildResponse(true, 'Registered participant is missing additional required fields.', {
          state: 'MISSING_REQUIRED_FIELDS',
          event: event,
          studentData: knownData,
          missingFields: missingFieldsB,
          configuredFields: configuredFields
        });
      }

      Logger.log('[COORDINATOR-FLOW][13] Response state: READY_TO_MARK');
      return Utils.buildResponse(true, 'Registered participant ready for attendance confirmation.', {
        state: 'READY_TO_MARK',
        event: event,
        studentData: knownData,
        missingFields: [],
        configuredFields: configuredFields
      });
    }

    // Student is NOT registered for this event
    Logger.log('[COORDINATOR-FLOW][10] Registration NOT FOUND');
    var allowSpotVal = event[CONFIG.COLUMNS.EVENT_ALLOW_SPOT_REGISTRATION] !== undefined 
      ? event[CONFIG.COLUMNS.EVENT_ALLOW_SPOT_REGISTRATION] 
      : (event.allow_spot_registration || event.allowSpotRegistration || true);
    var isSpotAllowed = String(allowSpotVal).toLowerCase() === 'true';
    Logger.log('[COORDINATOR-FLOW][10] Spot registration allowed: ' + (isSpotAllowed ? 'TRUE' : 'FALSE'));

    if (!isSpotAllowed) {
      Logger.log('[COORDINATOR-FLOW][13] Response state: NOT_REGISTERED_SPOT_DISABLED');
      return Utils.buildResponse(false, 'This participant is not registered for this event and spot registration is not available.', {
        state: 'NOT_REGISTERED_SPOT_DISABLED',
        event: event,
        rollNumber: normRoll
      });
    }

    // Spot registration IS allowed
    var missingSpotFields = checkMissingFields(configuredFields, knownData);
    Logger.log('[COORDINATOR-FLOW][13] Response state: SPOT_REGISTRATION_REQUIRED');
    return Utils.buildResponse(true, 'Participant is not registered for this event. Spot registration is available.', {
      state: 'SPOT_REGISTRATION_REQUIRED',
      event: event,
      studentData: knownData,
      configuredFields: configuredFields,
      missingFields: missingSpotFields
    });
  },

  // ==========================================================================
  //  SPOT REGISTRATION ACTION
  // ==========================================================================
  spotRegisterParticipant: function(sessionToken, eventId, rawRollNumber, spotData) {
    Logger.log('[COORDINATOR-FLOW][14] Spot registration requested for roll: ' + rawRollNumber);
    spotData = spotData || {};

    if (!rawRollNumber || String(rawRollNumber).trim() === '') {
      return Utils.buildResponse(false, 'Roll number is required for spot registration.', { state: 'INVALID_ROLL_NUMBER' });
    }
    var normRoll = String(rawRollNumber).trim().toUpperCase();

    // Session check
    var userId = SessionService.getCurrentUser(sessionToken);
    if (!userId) return Utils.buildResponse(false, 'Invalid or expired session.', { state: 'UNAUTHORIZED' });

    var event = EventService.getEventById(eventId);
    if (!event) return Utils.buildResponse(false, 'Event not found.', { state: 'EVENT_NOT_AVAILABLE' });

    // Capacity Check
    var maxSeats = event[CONFIG.COLUMNS.EVENT_MAXIMUM_SEATS] || event.maximum_seats || event.capacity || 0;
    if (maxSeats > 0) {
      var currentCount = event[CONFIG.COLUMNS.EVENT_REGISTERED_COUNT] || event.registered_count || 0;
      if (currentCount >= maxSeats) {
        return Utils.buildResponse(false, 'Spot registration failed: Maximum capacity reached for this event.', { state: 'CAPACITY_REACHED' });
      }
    }

    // Check duplicate registration
    var participantsList = DatabaseService.findByColumn(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Event ID', eventId) || [];
    var existing = participantsList.find(function(p) {
      var r = p['Roll Number'] || p.roll_number || p.rollNumber || '';
      return String(r).trim().toUpperCase() === normRoll && !p['Deletion Flag'];
    });
    if (existing) {
      Logger.log('[COORDINATOR-FLOW] Duplicate registration prevented for roll: ' + normRoll);
      // Already registered -> continue directly to process
      return this.processParticipantForEvent(sessionToken, eventId, normRoll);
    }

    // Save/update student details
    spotData = spotData || {};
    var studentType = (spotData.studentType || spotData.type || 'BVC').toUpperCase();
    var studentName = (spotData.studentName || spotData.name || '').trim();
    var collegeName = (spotData.college || spotData.collegeName || 'BVC Engineering College').trim();
    var branch = (spotData.branch || spotData.department || 'CSE').trim().toUpperCase();
    var yearVal = String(spotData.year || '1');
    var sectionVal = String(spotData.section || 'A');

    // Create or update Student entity
    var existingStudent = StudentService.getStudentByRollNumber(normRoll);
    if (!existingStudent) {
      if (studentType.includes('OTHER') || !collegeName.toLowerCase().includes('bvc')) {
        var otherStudentPayload = {
          id: 'OCS_' + Date.now(),
          roll_number: normRoll,
          student_name: studentName,
          college_name: collegeName,
          department: branch,
          year: yearVal,
          section: sectionVal,
          status: 'Active',
          created_by: 'Coordinator',
          created_at: new Date().toISOString()
        };
        try { DatabaseService.insertRow(CONFIG.SHEETS.OTHER_COLLEGE_STUDENTS, otherStudentPayload); } catch(e) {}
      }

      // Ensure main student stub for foreign key constraint
      try {
        var mainStudentPayload = {
          student_id: 'STU_SPOT_' + Date.now(),
          'Roll Number': normRoll,
          'roll_number': normRoll,
          'Student Name': studentName,
          'student_name': studentName,
          'Department ID': branch,
          'department_id': branch,
          'Year': yearVal,
          'year': yearVal,
          'Section': sectionVal,
          'Status': 'Active',
          'College': collegeName
        };
        DatabaseService.insertRow(CONFIG.SHEETS.STUDENTS, mainStudentPayload);
      } catch(e) {
        Logger.log('[spotRegisterParticipant] Stub creation warning: ' + e.message);
      }
    }

    // Insert Participant Record into event_participants
    var participantId = IdService._generateNextIdWithLock('EVENT_PARTICIPANTS');
    var nowIso = new Date().toISOString();
    var nowDate = Utils.formatDate(new Date());

    var participantRecord = {
      'Participant ID': participantId,
      'participant_id': participantId,
      'Event ID': eventId,
      'event_id': eventId,
      'Roll Number': normRoll,
      'roll_number': normRoll,
      'Registration Type': 'Spot',
      'registration_type': 'Spot',
      'Registration Status': 'Active',
      'registration_status': 'Active',
      'Attendance Status': 'Absent',
      'attendance_status': 'Absent',
      'Approval Status': 'Approved',
      'approval_status': 'Approved',
      'Registration Date': nowDate,
      'registration_date': nowDate,
      'Registration Timestamp': nowIso,
      'registration_timestamp': nowIso,
      'Custom Fields Data': JSON.stringify(spotData.customFields || {}),
      'custom_fields_data': JSON.stringify(spotData.customFields || {}),
      'Created By': 'Coordinator',
      'created_by': 'Coordinator',
      'Created At': nowIso,
      'created_at': nowIso
    };

    var insertOk = DatabaseService.insertRow(CONFIG.SHEETS.EVENT_PARTICIPANTS, participantRecord);
    if (!insertOk) {
      return Utils.buildResponse(false, 'Failed to create spot registration in database.', { state: 'ERROR' });
    }

    // Increment registered_count in events table
    try {
      var currentRegistered = event[CONFIG.COLUMNS.EVENT_REGISTERED_COUNT] || event.registered_count || 0;
      var updatePayload = {};
      updatePayload[CONFIG.COLUMNS.EVENT_REGISTERED_COUNT] = currentRegistered + 1;
      DatabaseService.updateRow(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID || 'Event ID', eventId, updatePayload);
    } catch(e) {
      Logger.log('[CoordinatorService.spotRegisterParticipant] Registered count update warning: ' + e.message);
    }

    Logger.log('[COORDINATOR-FLOW] Spot registration successful for roll: ' + normRoll);

    // DIRECTLY continue to participant confirmation without forcing re-scan
    return this.processParticipantForEvent(sessionToken, eventId, normRoll);
  },

  // ==========================================================================
  //  CONFIRM PARTICIPATION ACTION (MARK PARTICIPATED)
  // ==========================================================================
  confirmMarkParticipation: function(sessionToken, eventId, rawRollNumber, additionalData) {
    Logger.log('[COORDINATOR-FLOW][14] Mark participation requested for roll: ' + rawRollNumber);
    
    if (!rawRollNumber || String(rawRollNumber).trim() === '') {
      return Utils.buildResponse(false, 'Roll number is required.', { state: 'INVALID_ROLL_NUMBER' });
    }
    var normRoll = String(rawRollNumber).trim().toUpperCase();

    // 1. Session check
    var userId = SessionService.getCurrentUser(sessionToken);
    if (!userId) return Utils.buildResponse(false, 'Invalid or expired session.', { state: 'UNAUTHORIZED' });

    var actionUser = UserService.getUserById(userId);
    var validation = this.validateCoordinatorSession(actionUser);
    if (!validation.success) return Utils.buildResponse(false, validation.message, { state: 'UNAUTHORIZED' });

    // 2. Event check
    var event = EventService.getEventById(eventId);
    if (!event) return Utils.buildResponse(false, 'Event not found.', { state: 'EVENT_NOT_AVAILABLE' });

    // 3. Double-click & Rapid Double Scan Protection
    Logger.log('[COORDINATOR-FLOW][15] Immediate pre-insertion duplicate check');
    var alreadyAttended = AttendanceService.hasStudentAttended(eventId, normRoll);
    if (alreadyAttended) {
      Logger.log('[COORDINATOR-FLOW][15] Duplicate prevented immediately before insertion');
      return Utils.buildResponse(true, 'Participation has already been recorded for this student.', {
        state: 'ALREADY_MARKED',
        rollNumber: normRoll
      });
    }

    // Save or create student details if provided or missing
    var student = StudentService.getStudentByRollNumber(normRoll);
    if (!student) {
      var sName = (additionalData && (additionalData.studentName || additionalData.name) ? (additionalData.studentName || additionalData.name) : 'Participant').trim();
      var sBranch = this._getValidDepartmentId(additionalData ? (additionalData.branch || additionalData.department) : null);
      var sCollege = (additionalData && (additionalData.college || additionalData.collegeName) ? (additionalData.college || additionalData.collegeName) : 'BVC Engineering College').trim();
      var isBvc = !sCollege || sCollege.toLowerCase().includes('bvc') || sCollege.toLowerCase().includes('bonam');

      if (!isBvc) {
        var otherStudentPayload = {
          id: 'OCS_' + Date.now(),
          roll_number: normRoll,
          student_name: sName,
          college_name: sCollege,
          department: sBranch,
          year: String(additionalData?.year || '1'),
          section: String(additionalData?.section || 'A'),
          status: 'Active',
          created_by: 'Coordinator',
          created_at: new Date().toISOString()
        };
        try { DatabaseService.insertRow(CONFIG.SHEETS.OTHER_COLLEGE_STUDENTS, otherStudentPayload); } catch(e) {}
      }

      try {
        var studentPayload = {
          student_id: 'STU_CONFIRM_' + Date.now(),
          'Roll Number': normRoll,
          'roll_number': normRoll,
          'Student Name': sName,
          'student_name': sName,
          'Department ID': sBranch,
          'department_id': sBranch,
          'Year': String(additionalData?.year || '1'),
          'year': String(additionalData?.year || '1'),
          'Section': String(additionalData?.section || 'A'),
          'Status': 'Active',
          'College': sCollege
        };
        DatabaseService.insertRow(CONFIG.SHEETS.STUDENTS, studentPayload);
      } catch(e) {
        Logger.log('[confirmMarkParticipation] Student stub creation warning: ' + e.message);
      }
    } else if (additionalData && typeof additionalData === 'object') {
      if (additionalData.studentName || additionalData.phone || additionalData.email) {
        var studentUpdates = {};
        if (additionalData.studentName) studentUpdates[CONFIG.COLUMNS.STUDENT_NAME] = additionalData.studentName;
        if (additionalData.phone) studentUpdates['Phone'] = additionalData.phone;
        if (additionalData.email) studentUpdates['Email'] = additionalData.email;
        try { DatabaseService.updateRow(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, normRoll, studentUpdates); } catch(e) {}
      }
    }

    // 4. Save Attendance Record
    Logger.log('[COORDINATOR-FLOW][16] Attendance insertion started');
    var attendancePayload = {
      eventId: eventId,
      rollNumber: normRoll,
      attendanceMethod: 'Barcode'
    };
    var result = AttendanceService.markAttendance(attendancePayload, userId);

    if (!result || !result.success) {
      Logger.log('[COORDINATOR-FLOW][16] Attendance insertion failed: ' + (result ? result.message : 'Unknown error'));
      return result || Utils.buildResponse(false, 'Failed to mark participation.', { state: 'ERROR' });
    }

    // 5. Database Verification
    Logger.log('[COORDINATOR-FLOW][17] Database verification started');
    var dbVerified = AttendanceService.hasStudentAttended(eventId, normRoll);
    if (!dbVerified) {
      Logger.log('[COORDINATOR-FLOW][17] Database verification FAILED');
      return Utils.buildResponse(false, 'Participation was processed but database verification failed.', { state: 'ERROR' });
    }
    Logger.log('[COORDINATOR-FLOW][17] Database verification PASSED');
    Logger.log('[COORDINATOR-FLOW][18] Workflow completed successfully for roll: ' + normRoll);

    // Build refreshed terminal stats & scan item for UI UI hydration
    var counts = AttendanceService.getEventAttendanceCount(eventId);
    var stats = {
      present: counts.present || 0,
      remaining: counts.absent || counts.total - counts.present || 0,
      total: counts.total || 0
    };

    var studentObj = StudentService.getStudentByRollNumber(normRoll) || {};
    var scanItem = {
      roll_number: normRoll,
      student_name: studentObj['Student Name'] || studentObj.student_name || additionalData?.studentName || 'Participant',
      timestamp: new Date().toLocaleTimeString(),
      status: 'Present',
      attendance_method: 'Barcode'
    };

    return Utils.buildResponse(true, 'Participation marked successfully.', {
      state: 'COMPLETED',
      rollNumber: normRoll,
      statistics: stats,
      scanItem: scanItem
    });
  }

};