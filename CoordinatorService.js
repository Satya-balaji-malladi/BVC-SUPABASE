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

      const assignedEventIds = allRows
        .filter(row => this._normId(row['User ID']) === this._normId(userId) && String(row['Assignment Status']).trim() === 'Active')
        .map(row => String(row['Event ID']).trim());

      // Fallback: Also check EVENTS sheet for events where user is primary coordinator_id or creator
      const allEvents = EventService.getAllEvents() || [];
      const primaryEvents = allEvents.filter(ev => {
        const cId = this._normId(ev.coordinator_id || ev['Coordinator ID'] || ev.Organizer);
        const crId = this._normId(ev.created_by || ev['Created By']);
        const uId = this._normId(userId);
        return (cId === uId || crId === uId);
      }).map(ev => String(ev.event_id || ev['Event ID']).trim());

      const combinedIds = Array.from(new Set(assignedEventIds.concat(primaryEvents)));

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

      const userId = sessionUser.userId || sessionUser.id || sessionUser['User ID'];

      // 2. Check if User Exists
      Logger.log('[DATABASE QUERY] Finding user by ID: ' + userId);
      const user = UserService.getUserById(userId);
      Logger.log('[DATABASE RESULT] User retrieval complete.');
      
      if (!user) {
        Logger.log('[OUTPUT] CoordinatorService.validateCoordinatorSession -> User record not found.');
        return Utils.buildResponse(false, 'User not found.');
      }

      // 3. Check if Role == COORDINATOR
      const userRole = user.Role || user.role || user['Role'];
      if (String(userRole).toUpperCase() !== 'COORDINATOR') {
        Logger.log('[OUTPUT] CoordinatorService.validateCoordinatorSession -> User is not authorized as a coordinator.');
        return Utils.buildResponse(false, 'User is not authorized as a coordinator.');
      }

      // 4. Check if Assignment Exists & 5. Assignment is Active
      Logger.log('[DATABASE QUERY] Querying Event Coordinators sheet for active assignments.');
      const allAssignments = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      Logger.log('[DATABASE RESULT] Assignment rows gathered.');

      const hasActiveAssignment = allAssignments.some(row => 
        this._normId(row['User ID']) === this._normId(userId) &&
        String(row['Assignment Status']).trim() === 'Active'
      );

      if (!hasActiveAssignment) {
        Logger.log('[OUTPUT] CoordinatorService.validateCoordinatorSession -> No active event assignment found.');
        return Utils.buildResponse(false, 'No active event assignment found for this coordinator.');
      }

      Logger.log('[OUTPUT] CoordinatorService.validateCoordinatorSession -> Success | Execution Time: ' + (Date.now() - startTime) + 'ms');
      Logger.log('[END] CoordinatorService.validateCoordinatorSession');
      return Utils.buildResponse(true, 'Coordinator session is valid and active.', { user: user });
    });
  }
};