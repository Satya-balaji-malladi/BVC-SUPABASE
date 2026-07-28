/**
 * CoordinatorService
 * Handles all logic for Coordinator Management and Event assignments (Sprint 1)
 */
const CoordinatorService = {

  _normId: function (id) {
    if (!id) return '';
    let clean = String(id).toUpperCase().replace(/[^A-Z0-9]/g, '');
    let match = clean.match(/([A-Z]+)0*(\d+)/);
    return match ? (match[1] + match[2]) : clean;
  },
  _isBvcOnlyEvent: function (event) {
    if (!event) return true;

    var eligibility = String(
      event.student_eligibility ||
      event['Student Eligibility'] ||
      'BVC_ONLY'
    ).trim().toUpperCase();

    return eligibility !== 'ALL_COLLEGES';
  },
  _tryWrap: function (methodName, failureMessage, fn) {
    if (typeof failureMessage === 'function') {
      fn = failureMessage;
      failureMessage = 'Coordinator action failed.';
    }
    try {
      return fn();
    } catch (error) {
      Logger.log('[COORD-AUTH][ERROR] CoordinatorService.' + methodName + ' error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, failureMessage);
    }
  },

  _parseBoolean: function (val) {
    if (val === true || val === false) return val;
    if (val === 1 || val === '1') return true;
    if (val === 0 || val === '0') return false;
    if (typeof val === 'string') {
      var clean = val.trim().toLowerCase();
      if (clean === 'true') return true;
      if (clean === 'false') return false;
    }
    return Boolean(val);
  },

  _getEffectiveRegistrationFields: function (event) {
    var fields = this.parseRegistrationFields(event);

    if (!Array.isArray(fields)) {
      return [];
    }

    // ALL_COLLEGES events can use all admin-configured fields.
    if (!this._isBvcOnlyEvent(event)) {
      return fields;
    }

    // BVC_ONLY events must never ask for college details.
    return fields.filter(function (field) {
      if (!field) return false;

      var rawName =
        field.name ||
        field.label ||
        field.fieldName ||
        field.key ||
        field.field_name ||
        '';

      var normalized = String(rawName)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      return (
        normalized !== 'college' &&
        normalized !== 'college_name' &&
        normalized !== 'college_details' &&
        normalized !== 'institution' &&
        normalized !== 'institution_name'
      );
    });
  },

  _normalizeFieldName: function (value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  },

  _hasValue: function (value) {
    return value !== undefined && value !== null && String(value).trim() !== '';
  },

  _findValueByNormalizedKey: function (obj, targetKey) {
    if (!obj || typeof obj !== 'object') return null;
    var normalizedTarget = this._normalizeFieldName(targetKey);
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      if (this._normalizeFieldName(keys[i]) === normalizedTarget) {
        return obj[keys[i]];
      }
    }
    return null;
  },

  _lookupOtherCollegeStudent: function (normRoll) {
    if (!normRoll) return null;
    try {
      var sheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.OTHER_COLLEGE_STUDENTS)
        ? CONFIG.SHEETS.OTHER_COLLEGE_STUDENTS
        : 'OTHER_COLLEGE_STUDENTS';

      var rows = DatabaseService.readAllRows(sheetName) || [];
      return rows.find(function (row) {
        if (!row) return false;
        var r = row['Roll Number'] || row.roll_number || row.rollNumber || row['Roll No'] || row.roll_no || '';
        return String(r).trim().toUpperCase() === normRoll;
      }) || null;
    } catch (e) {
      Logger.log('[COORDINATOR-FLOW][ERROR] External student lookup failed: ' + (e && e.message ? e.message : e));
      return null;
    }
  },

  assignCoordinator: function (eventId, userId, role, assignedBy, remarks) {
    return this._tryWrap('assignCoordinator', 'Failed to assign coordinator.', () => {
      if (assignedBy && assignedBy !== 'System') {
        const isAuthorized = SecurityUtils.isEventAdmin(eventId, assignedBy);
        if (!isAuthorized) {
          return Utils.buildResponse(false, 'Unauthorized: Only Event Admins can assign coordinators.');
        }
      }

      const event = EventService.getEventById(eventId);
      if (!event) {
        return Utils.buildResponse(false, 'Event not found.');
      }

      const user = UserService.getUserById(userId);
      if (!user) {
        return Utils.buildResponse(false, 'User not found.');
      }
      const userStatus = user.Status || user.status;
      if (userStatus !== 'Active') {
        return Utils.buildResponse(false, 'Cannot assign an inactive user.');
      }

      const all = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      const duplicate = all.find(a => {
        if (!a) return false;
        const rEventId = a['Event ID'] !== undefined ? a['Event ID'] : a.event_id;
        const rUserId = a['User ID'] !== undefined ? a['User ID'] : a.user_id;
        const rStatus = a['Assignment Status'] !== undefined ? a['Assignment Status'] : a.assignment_status;

        return String(rEventId || '').trim() === String(eventId || '').trim() &&
          this._normId(rUserId) === this._normId(userId) &&
          String(rStatus || '').trim().toLowerCase() === 'active';
      });
      if (duplicate) {
        return Utils.buildResponse(false, 'User is already assigned to this event.');
      }

      const targetRole = (role === 'Lead Coordinator' || role === 'Primary Coordinator') ? 'Primary Coordinator' : (role || 'Coordinator');
      const isLead = targetRole === 'Primary Coordinator';
      if (isLead) {
        const leadExist = all.some(a => {
          if (!a) return false;
          const rEventId = a['Event ID'] !== undefined ? a['Event ID'] : a.event_id;
          const rStatus = a['Assignment Status'] !== undefined ? a['Assignment Status'] : a.assignment_status;
          const rRole = a['Assignment Role'] !== undefined ? a['Assignment Role'] : a.assignment_role;
          const normRole = String(rRole || '').trim().toLowerCase();

          return String(rEventId || '').trim() === String(eventId || '').trim() &&
            String(rStatus || '').trim().toLowerCase() === 'active' &&
            (normRole === 'primary coordinator' || normRole === 'lead coordinator');
        });
        if (leadExist) {
          return Utils.buildResponse(false, 'A Lead Coordinator is already assigned to this event.');
        }
      }

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
          Logger.log('[COORD-AUTH][ERROR] Error syncing to event_assignments: ' + (e && e.message ? e.message : e));
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
          Logger.log('[COORD-AUTH][ERROR] AuditService failure: ' + (e && e.message ? e.message : e));
        }
        return Utils.buildResponse(true, 'Coordinator assigned successfully.', { assignment: record });
      }
      return Utils.buildResponse(false, 'Failed to insert coordinator assignment row.');
    });
  },

  removeCoordinator: function (assignmentId, userId) {
    return this._tryWrap('removeCoordinator', 'Failed to remove coordinator.', () => {
      const all = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      const record = all.find(a => {
        if (!a) return false;
        const rId = a['Assignment ID'] !== undefined ? a['Assignment ID'] : a.assignment_id;
        return String(rId || '').trim() === String(assignmentId || '').trim();
      });
      if (!record) {
        return Utils.buildResponse(false, 'Assignment record not found.');
      }

      const recEventId = record['Event ID'] !== undefined ? record['Event ID'] : record.event_id;
      const recUserId = record['User ID'] !== undefined ? record['User ID'] : record.user_id;

      if (userId && userId !== 'System') {
        const isAuthorized = SecurityUtils.isEventAdmin(recEventId, userId);
        if (!isAuthorized) {
          return Utils.buildResponse(false, 'Unauthorized: Only Event Admins can remove coordinators.');
        }
      }

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
          Logger.log('[COORD-AUTH][ERROR] Error syncing removal to event_assignments: ' + (e && e.message ? e.message : e));
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
            recUserId
          );
        } catch (e) {
          Logger.log('[COORD-AUTH][ERROR] AuditService failure: ' + (e && e.message ? e.message : e));
        }
        return Utils.buildResponse(true, 'Coordinator removed successfully.');
      }
      return Utils.buildResponse(false, 'Failed to update assignment status.');
    });
  },

  updateCoordinatorRole: function (assignmentId, newRole, updatedBy) {
    return this._tryWrap('updateCoordinatorRole', 'Failed to update role.', () => {
      const all = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      const record = all.find(a => {
        if (!a) return false;
        const rId = a['Assignment ID'] !== undefined ? a['Assignment ID'] : a.assignment_id;
        return String(rId || '').trim() === String(assignmentId || '').trim();
      });
      if (!record) {
        return Utils.buildResponse(false, 'Assignment record not found.');
      }

      const recEventId = record['Event ID'] !== undefined ? record['Event ID'] : record.event_id;

      if (updatedBy && updatedBy !== 'System') {
        const isAuthorized = SecurityUtils.isEventAdmin(recEventId, updatedBy);
        if (!isAuthorized) {
          return Utils.buildResponse(false, 'Unauthorized: Only Event Admins can update coordinator roles.');
        }
      }

      const targetRole = (newRole === 'Lead Coordinator' || newRole === 'Primary Coordinator') ? 'Primary Coordinator' : (newRole || 'Coordinator');

      const isLead = targetRole === 'Primary Coordinator';
      if (isLead) {
        const leadExist = all.some(a => {
          if (!a) return false;
          const rEventId = a['Event ID'] !== undefined ? a['Event ID'] : a.event_id;
          const rId = a['Assignment ID'] !== undefined ? a['Assignment ID'] : a.assignment_id;
          const rStatus = a['Assignment Status'] !== undefined ? a['Assignment Status'] : a.assignment_status;
          const rRole = a['Assignment Role'] !== undefined ? a['Assignment Role'] : a.assignment_role;
          const normRole = String(rRole || '').trim().toLowerCase();

          return String(rEventId || '').trim() === String(recEventId || '').trim() &&
            String(rId || '').trim() !== String(assignmentId || '').trim() &&
            String(rStatus || '').trim().toLowerCase() === 'active' &&
            (normRole === 'primary coordinator' || normRole === 'lead coordinator');
        });
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
          Logger.log('[COORD-AUTH][ERROR] Error syncing update to event_assignments: ' + (e && e.message ? e.message : e));
        }
        return Utils.buildResponse(true, 'Role updated successfully.');
      }
      return Utils.buildResponse(false, 'Failed to update role.');
    });
  },

  activateCoordinator: function (assignmentId, updatedBy) {
    return this._tryWrap('activateCoordinator', 'Failed to activate coordinator.', () => {
      const all = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      const record = all.find(a => {
        if (!a) return false;
        const rId = a['Assignment ID'] !== undefined ? a['Assignment ID'] : a.assignment_id;
        return String(rId || '').trim() === String(assignmentId || '').trim();
      });
      if (!record) {
        return Utils.buildResponse(false, 'Assignment record not found.');
      }

      const recEventId = record['Event ID'] !== undefined ? record['Event ID'] : record.event_id;

      if (updatedBy && updatedBy !== 'System') {
        const isAuthorized = SecurityUtils.isEventAdmin(recEventId, updatedBy);
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
          Logger.log('[COORD-AUTH][ERROR] Error syncing activation to event_assignments: ' + (e && e.message ? e.message : e));
        }
        return Utils.buildResponse(true, 'Coordinator activated successfully.');
      }
      return Utils.buildResponse(false, 'Failed to activate coordinator.');
    });
  },

  deactivateCoordinator: function (assignmentId, updatedBy) {
    return this._tryWrap('deactivateCoordinator', 'Failed to deactivate coordinator.', () => {
      const all = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
      const record = all.find(a => {
        if (!a) return false;
        const rId = a['Assignment ID'] !== undefined ? a['Assignment ID'] : a.assignment_id;
        return String(rId || '').trim() === String(assignmentId || '').trim();
      });
      if (!record) {
        return Utils.buildResponse(false, 'Assignment record not found.');
      }

      const recEventId = record['Event ID'] !== undefined ? record['Event ID'] : record.event_id;

      if (updatedBy && updatedBy !== 'System') {
        const isAuthorized = SecurityUtils.isEventAdmin(recEventId, updatedBy);
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
          Logger.log('[COORD-AUTH][ERROR] Error syncing deactivation to event_assignments: ' + (e && e.message ? e.message : e));
        }
        return Utils.buildResponse(true, 'Coordinator deactivated successfully.');
      }
      return Utils.buildResponse(false, 'Failed to deactivate coordinator.');
    });
  },

  getCoordinatorById: function (assignmentId) {
    if (!assignmentId) return null;
    const records = DatabaseService.findByColumn(CONFIG.SHEETS.EVENT_COORDINATORS, 'Assignment ID', assignmentId) || [];
    if (records.length > 0) return records[0];
    const altRecords = DatabaseService.findByColumn(CONFIG.SHEETS.EVENT_COORDINATORS, 'assignment_id', assignmentId) || [];
    return altRecords.length > 0 ? altRecords[0] : null;
  },

  getCoordinatorByUserId: function (userId) {
    if (!userId) return [];
    const targetNorm = this._normId(userId);
    const allAssignments = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
    return allAssignments.filter(row => {
      if (!row) return false;
      const rUserId = row['User ID'] !== undefined ? row['User ID'] : row.user_id;
      return this._normId(rUserId) === targetNorm;
    });
  },

  getCoordinatorByEmployeeId: function (employeeId) {
    if (!employeeId) return [];
    var users = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, 'Employee ID', employeeId) || [];
    if (users.length === 0) {
      users = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, 'employee_id', employeeId) || [];
    }
    if (users.length === 0) return [];
    const uId = users[0]['User ID'] !== undefined ? users[0]['User ID'] : users[0].user_id;
    return this.getCoordinatorByUserId(uId);
  },

  getCoordinatorByEvent: function (eventId) {
    if (!eventId) return [];
    const normEventId = String(eventId).trim();
    const allAssignments = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
    return allAssignments.filter(row => {
      if (!row) return false;
      const rEventId = row['Event ID'] !== undefined ? row['Event ID'] : row.event_id;
      return String(rEventId || '').trim() === normEventId;
    });
  },

  getEventsByCoordinator: function (userId) {
    return this.getAssignedEvents(userId);
  },

  getAllCoordinators: function () {
    return DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
  },

  createCoordinator: function (eventId, userId, role, assignedBy, remarks) {
    return this.assignCoordinator(eventId, userId, role, assignedBy, remarks);
  },

  updateCoordinator: function (assignmentId, updates) {
    return this._tryWrap('updateCoordinator', 'Failed to update coordinator.', () => {
      const success = DatabaseService.updateRow(CONFIG.SHEETS.EVENT_COORDINATORS, 'Assignment ID', assignmentId, updates);
      if (success) return Utils.buildResponse(true, 'Coordinator updated successfully.');
      return Utils.buildResponse(false, 'Failed to update coordinator.');
    });
  },

  deleteCoordinator: function (assignmentId, userId) {
    return this.removeCoordinator(assignmentId, userId);
  },

  // ==========================================
  // AUTHORIZATION & SINGLE SOURCE OF TRUTH METHODS
  // ==========================================

  canManageEvent: function (userId, eventId) {
    const startTime = Date.now();

    try {
      const normalizedUserId = this._normId(userId);
      const normalizedEventId = String(eventId || '').trim();

      Logger.log(
        '[COORD-AUTH] Checking user=' +
        normalizedUserId +
        ' event=' +
        normalizedEventId
      );

      if (!normalizedUserId || !normalizedEventId) {
        Logger.log('[COORD-AUTH] Missing userId or eventId -> access=false');
        return false;
      }

      const allRows =
        DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];

      const hasAccess = allRows.some(row => {
        if (!row) return false;

        const rowUserId =
          row['User ID'] !== undefined
            ? row['User ID']
            : row.user_id;

        const rowEventId =
          row['Event ID'] !== undefined
            ? row['Event ID']
            : row.event_id;

        const rowStatus =
          row['Assignment Status'] !== undefined
            ? row['Assignment Status']
            : row.assignment_status;

        const normalizedRowUserId = this._normId(rowUserId);
        const normalizedRowEventId = String(rowEventId || '').trim();
        const normalizedStatus = String(rowStatus || '')
          .trim()
          .toLowerCase();

        return (
          normalizedRowUserId === normalizedUserId &&
          normalizedRowEventId === normalizedEventId &&
          normalizedStatus === 'active'
        );
      });

      Logger.log(
        '[COORD-AUTH] canManageEvent user=' +
        normalizedUserId +
        ' event=' +
        normalizedEventId +
        ' access=' +
        hasAccess +
        ' ExecutionTime=' +
        (Date.now() - startTime) +
        'ms'
      );

      return hasAccess;

    } catch (error) {
      Logger.log(
        '[COORD-AUTH][ERROR] canManageEvent failed: ' +
        (error && error.message ? error.message : error)
      );

      return false;
    }
  },

  getActiveAssignment: function (userId, eventId) {
    const startTime = Date.now();

    try {
      const normalizedUserId = this._normId(userId);
      const normalizedEventId = String(eventId || '').trim();

      if (!normalizedUserId || !normalizedEventId) {
        Logger.log('[COORD-AUTH] getActiveAssignment -> null (missing input)');
        return null;
      }

      const allRows =
        DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];

      const assignment = allRows.find(row => {
        if (!row) return false;

        const rowUserId =
          row['User ID'] !== undefined
            ? row['User ID']
            : row.user_id;

        const rowEventId =
          row['Event ID'] !== undefined
            ? row['Event ID']
            : row.event_id;

        const rowStatus =
          row['Assignment Status'] !== undefined
            ? row['Assignment Status']
            : row.assignment_status;

        return (
          this._normId(rowUserId) === normalizedUserId &&
          String(rowEventId || '').trim() === normalizedEventId &&
          String(rowStatus || '').trim().toLowerCase() === 'active'
        );
      }) || null;

      Logger.log(
        '[COORD-AUTH] getActiveAssignment user=' +
        normalizedUserId +
        ' event=' +
        normalizedEventId +
        ' found=' +
        Boolean(assignment) +
        ' ExecutionTime=' +
        (Date.now() - startTime) +
        'ms'
      );

      return assignment;

    } catch (error) {
      Logger.log(
        '[COORD-AUTH][ERROR] getActiveAssignment: ' +
        (error && error.message ? error.message : error)
      );

      return null;
    }
  },

  getPrimaryCoordinator: function (eventId) {
    const startTime = Date.now();

    try {
      const normalizedEventId = String(eventId || '').trim();

      if (!normalizedEventId) {
        Logger.log('[COORD-AUTH] getPrimaryCoordinator -> null (missing event)');
        return null;
      }

      const allRows =
        DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];

      const primary = allRows.find(row => {
        if (!row) return false;

        const rowEventId =
          row['Event ID'] !== undefined
            ? row['Event ID']
            : row.event_id;

        const rowStatus =
          row['Assignment Status'] !== undefined
            ? row['Assignment Status']
            : row.assignment_status;

        const rowRole =
          row['Assignment Role'] !== undefined
            ? row['Assignment Role']
            : row.assignment_role;

        const normalizedRole = String(rowRole || '')
          .trim()
          .toLowerCase();

        return (
          String(rowEventId || '').trim() === normalizedEventId &&
          String(rowStatus || '').trim().toLowerCase() === 'active' &&
          (
            normalizedRole === 'primary coordinator' ||
            normalizedRole === 'lead coordinator'
          )
        );
      }) || null;

      Logger.log(
        '[COORD-AUTH] getPrimaryCoordinator event=' +
        normalizedEventId +
        ' found=' +
        Boolean(primary) +
        ' ExecutionTime=' +
        (Date.now() - startTime) +
        'ms'
      );

      return primary;

    } catch (error) {
      Logger.log(
        '[COORD-AUTH][ERROR] getPrimaryCoordinator: ' +
        (error && error.message ? error.message : error)
      );

      return null;
    }
  },

  getAssignedEventIds: function (userId) {
    const startTime = Date.now();

    try {
      const normUser = this._normId(userId);
      if (!normUser) {
        Logger.log('[COORD-AUTH] getAssignedEventIds -> [] (missing user)');
        return [];
      }

      const cacheKey = "coord_assigned_events_" + normUser;
      if (typeof CacheManager !== 'undefined') {
        const cached = CacheManager.get(cacheKey);
        if (cached && Array.isArray(cached)) {
          Logger.log('[COORD-AUTH] getAssignedEventIds user=' + normUser + ' cachedCount=' + cached.length);
          return cached;
        }
      }

      const allRows = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];

      const assignedEventIds = allRows
        .filter(row => {
          if (!row) return false;
          const rowUserId = row['User ID'] !== undefined ? row['User ID'] : row.user_id;
          const rowStatus = row['Assignment Status'] !== undefined ? row['Assignment Status'] : row.assignment_status;
          return this._normId(rowUserId) === normUser &&
            String(rowStatus || '').trim().toLowerCase() === 'active';
        })
        .map(row => {
          const rowEventId = row['Event ID'] !== undefined ? row['Event ID'] : row.event_id;
          return String(rowEventId || '').trim();
        })
        .filter(id => id.length > 0);

      const allEvents = EventService.getAllEvents() || [];
      const coordinatorIdCol = (CONFIG.COLUMNS && CONFIG.COLUMNS.COORDINATOR_ID) ? CONFIG.COLUMNS.COORDINATOR_ID : 'Organizer';
      const createdByCol = (CONFIG.COLUMNS && CONFIG.COLUMNS.CREATED_BY) ? CONFIG.COLUMNS.CREATED_BY : 'Created By';

      const primaryEvents = allEvents.filter(ev => {
        if (!ev) return false;
        const cId = this._normId(
          ev[coordinatorIdCol] || ev.coordinatorId || ev.coordinator_id || ev['Coordinator ID'] || ev.Organizer
        );
        const crId = this._normId(
          ev[createdByCol] || ev.created_by || ev.createdBy || ev['Created By']
        );
        return (cId === normUser || crId === normUser);
      }).map(ev => {
        const eId = (CONFIG.COLUMNS && CONFIG.COLUMNS.EVENT_ID) ? ev[CONFIG.COLUMNS.EVENT_ID] : null;
        return String(eId || ev.eventId || ev.event_id || ev['Event ID'] || '').trim();
      }).filter(id => id.length > 0);

      const combinedIds = Array.from(new Set(assignedEventIds.concat(primaryEvents)));

      const activeEventIds = combinedIds.filter(id => {
        const event = EventService.getEventById(id);
        if (!event) return false;
        const status = String(event.status || event.event_status || event['Event Status'] || '').toUpperCase();
        return status !== 'COMPLETED' && status !== 'CANCELLED';
      });

      if (typeof CacheManager !== 'undefined' && activeEventIds) {
        CacheManager.put(cacheKey, activeEventIds, 60);
      }

      Logger.log(
        '[COORD-AUTH] getAssignedEventIds user=' +
        normUser +
        ' count=' +
        activeEventIds.length +
        ' ExecutionTime=' +
        (Date.now() - startTime) +
        'ms'
      );

      return activeEventIds;
    } catch (error) {
      Logger.log('[COORD-AUTH][ERROR] getAssignedEventIds: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  getAssignedEvents: function (userId) {
    const startTime = Date.now();

    try {
      const normUser = this._normId(userId);
      if (!normUser) {
        return [];
      }

      const eventIds = this.getAssignedEventIds(normUser);
      const events = [];

      eventIds.forEach(id => {
        const event = EventService.getEventById(id);
        if (event) events.push(event);
      });

      Logger.log(
        '[COORD-AUTH] getAssignedEvents user=' +
        normUser +
        ' count=' +
        events.length +
        ' ExecutionTime=' +
        (Date.now() - startTime) +
        'ms'
      );

      return events;
    } catch (error) {
      Logger.log('[COORD-AUTH][ERROR] getAssignedEvents: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  isCoordinatorAssigned: function (userId) {
    const startTime = Date.now();

    try {
      const normalizedUserId = this._normId(userId);

      if (!normalizedUserId) {
        Logger.log('[COORD-AUTH] isCoordinatorAssigned -> false (missing user)');
        return false;
      }

      const allRows =
        DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];

      const hasAssignment = allRows.some(row => {
        if (!row) return false;

        const rowUserId =
          row['User ID'] !== undefined
            ? row['User ID']
            : row.user_id;

        const rowStatus =
          row['Assignment Status'] !== undefined
            ? row['Assignment Status']
            : row.assignment_status;

        return (
          this._normId(rowUserId) === normalizedUserId &&
          String(rowStatus || '').trim().toLowerCase() === 'active'
        );
      });

      Logger.log(
        '[COORD-AUTH] isCoordinatorAssigned user=' +
        normalizedUserId +
        ' result=' +
        hasAssignment +
        ' ExecutionTime=' +
        (Date.now() - startTime) +
        'ms'
      );

      return hasAssignment;

    } catch (error) {
      Logger.log(
        '[COORD-AUTH][ERROR] isCoordinatorAssigned: ' +
        (error && error.message ? error.message : error)
      );

      return false;
    }
  },

  validateCoordinatorSession: function (sessionUser) {
    return this._tryWrap('validateCoordinatorSession', 'Session validation failed.', () => {
      const startTime = Date.now();

      if (!sessionUser) {
        Logger.log('[COORD-AUTH] validateCoordinatorSession -> missing sessionUser');
        return Utils.buildResponse(false, 'Session does not exist.');
      }

      const rawUserId = sessionUser.userId || sessionUser.id || sessionUser['User ID'] || sessionUser['user_id'] || sessionUser.user_id;
      const normalizedUserId = this._normId(rawUserId);

      if (!normalizedUserId) {
        Logger.log('[COORD-AUTH] validateCoordinatorSession -> missing userId in session object');
        return Utils.buildResponse(false, 'Invalid session user.');
      }

      const user = UserService.getUserById(rawUserId);

      if (!user) {
        Logger.log('[COORD-AUTH] validateCoordinatorSession user=' + normalizedUserId + ' access=false (user not found)');
        return Utils.buildResponse(false, 'User not found.');
      }

      const userRole = String(user.Role || user.role || user['Role'] || '').toUpperCase();
      const allowedRoles = ['COORDINATOR', 'EVENT ADMIN', 'SUPERADMIN', 'ADMIN'];
      if (!allowedRoles.includes(userRole)) {
        Logger.log('[COORD-AUTH] validateCoordinatorSession user=' + normalizedUserId + ' role=' + userRole + ' access=false (unauthorized role)');
        return Utils.buildResponse(false, 'User is not authorized as a coordinator.');
      }

      const allAssignments = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];

      const hasActiveAssignment = allAssignments.some(row => {
        if (!row) return false;
        const rowUserId = row['User ID'] !== undefined ? row['User ID'] : row.user_id;
        const rowStatus = row['Assignment Status'] !== undefined ? row['Assignment Status'] : row.assignment_status;

        return this._normId(rowUserId) === normalizedUserId &&
          String(rowStatus || '').trim().toLowerCase() === 'active';
      });

      if (!hasActiveAssignment && userRole !== 'SUPERADMIN' && userRole !== 'ADMIN') {
        Logger.log('[COORD-AUTH] validateCoordinatorSession user=' + normalizedUserId + ' role=' + userRole + ' access=false (no active assignment)');
        return Utils.buildResponse(false, 'No active event assignment found for this coordinator.');
      }

      Logger.log(
        '[COORD-AUTH] validateCoordinatorSession user=' +
        normalizedUserId +
        ' role=' +
        userRole +
        ' access=true ExecutionTime=' +
        (Date.now() - startTime) +
        'ms'
      );

      return Utils.buildResponse(true, 'Coordinator session is valid and active.', { user: user });
    });
  },

  // ==========================================================================
  // DYNAMIC FIELD PARSER
  // ==========================================================================
  parseRegistrationFields: function (event) {
    if (!event) return [];
    var regCol = (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.EVENT_REGISTRATION_FIELDS)
      ? CONFIG.COLUMNS.EVENT_REGISTRATION_FIELDS
      : 'Registration Fields';

    var rawFields = event[regCol] !== undefined
      ? event[regCol]
      : (event.registration_fields !== undefined ? event.registration_fields : (event.registrationFields !== undefined ? event.registrationFields : event['Registration Fields']));

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
    } catch (e) {
      Logger.log('[COORDINATOR-FLOW][ERROR] Malformed JSON registration_fields: ' + (e && e.message ? e.message : e));
    }
    return [];
  },

  // ==========================================================================
  // CENTRAL ORCHESTRATOR: processParticipantForEvent
  // ==========================================================================
  processParticipantForEvent: function (sessionToken, eventId, rawRollNumber) {
    var startTime = Date.now();
    var normRoll = String(rawRollNumber || '').trim().toUpperCase();
    var normEventId = String(eventId || '').trim();

    Logger.log('[COORDINATOR-FLOW][01] Request received roll=' + normRoll + ' event=' + normEventId);

    if (!normRoll) {
      Logger.log('[COORDINATOR-FLOW][09] Final state=INVALID_ROLL_NUMBER');
      return Utils.buildResponse(false, 'Roll number is required.', { state: 'INVALID_ROLL_NUMBER' });
    }

    // 1. Validate Session & Authorization
    var userId = SessionService.getCurrentUser(sessionToken);
    if (!userId) {
      Logger.log('[COORDINATOR-FLOW][02] Coordinator authorization failed: Invalid session token');
      return Utils.buildResponse(false, 'Invalid or expired session.', { state: 'UNAUTHORIZED' });
    }

    var actionUser = UserService.getUserById(userId);
    var validation = this.validateCoordinatorSession(actionUser);
    if (!validation.success) {
      Logger.log('[COORDINATOR-FLOW][02] Coordinator authorization failed: ' + validation.message);
      return Utils.buildResponse(false, validation.message, { state: 'UNAUTHORIZED' });
    }

    // Explicit event access check for Coordinators
    var userRole = String((actionUser && (actionUser.Role || actionUser.role)) || '').toUpperCase();
    if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN') {
      var isAssigned = this.canManageEvent(userId, normEventId);
      if (!isAssigned) {
        Logger.log('[COORDINATOR-FLOW][02] Coordinator user=' + this._normId(userId) + ' not assigned to event=' + normEventId);
        return Utils.buildResponse(false, 'Unauthorized: You are not assigned to manage this event.', { state: 'UNAUTHORIZED' });
      }
    }
    Logger.log('[COORDINATOR-FLOW][02] Coordinator authorized user=' + this._normId(userId));

    // 2. Validate Event
    var event = EventService.getEventById(normEventId);
    if (!event) {
      Logger.log('[COORDINATOR-FLOW][03] Event loaded: NOT_FOUND event=' + normEventId);
      return Utils.buildResponse(false, 'Event not found or deleted.', { state: 'EVENT_NOT_AVAILABLE' });
    }
    var eventStatus = String(
      event.event_status ||
      event['Event Status'] ||
      event.status ||
      ''
    ).trim().toUpperCase();

    var blockedEventStatuses = [
      'CANCELLED',
      'COMPLETED',
      'STOPPED',
      'DRAFT',
      'UPCOMING'
    ];

    if (blockedEventStatuses.indexOf(eventStatus) !== -1) {
      Logger.log(
        '[COORDINATOR-FLOW][03] Event unavailable status=' +
        eventStatus +
        ' event=' +
        normEventId
      );

      return Utils.buildResponse(
        false,
        'Attendance cannot be marked because this event is ' + eventStatus.toLowerCase() + '.',
        {
          state: 'EVENT_NOT_AVAILABLE',
          eventStatus: eventStatus,
          event: event
        }
      );
    }

    Logger.log(
      '[COORDINATOR-FLOW][03] Event loaded: ACTIVE event=' +
      normEventId +
      ' status=' +
      eventStatus
    );
    // 3. Check Duplicate Participation
    var alreadyAttended = AttendanceService.hasStudentAttended(normEventId, normRoll);
    if (alreadyAttended) {
      Logger.log('[COORDINATOR-FLOW][08] Participation already marked for roll=' + normRoll);
      var attendanceList = AttendanceService.getAttendanceByEvent(normEventId) || [];
      var existingRecord = attendanceList.find(function (a) {
        if (!a) return false;
        var r = a['Roll Number'] || a.roll_number || a.rollNumber || '';
        return String(r).trim().toUpperCase() === normRoll && !this._parseBoolean(a['Deletion Flag'] || a.deletion_flag);
      }.bind(this));

      var studentObj = StudentService.getStudentByRollNumber(normRoll) || this._lookupOtherCollegeStudent(normRoll) || {};
      var dispName = studentObj['Student Name'] || studentObj.student_name || studentObj.name || studentObj['Full Name'] || studentObj.full_name || 'Participant';

      Logger.log('[COORDINATOR-FLOW][09] Final state=ALREADY_MARKED');
      return Utils.buildResponse(true, 'Participation has already been recorded for this student.', {
        state: 'ALREADY_MARKED',
        rollNumber: normRoll,
        studentName: dispName,
        recordedAt: existingRecord ? (existingRecord.Timestamp || existingRecord.timestamp || existingRecord.Date || existingRecord.time || existingRecord.created_at) : new Date().toISOString(),
        record: existingRecord
      });
    }

    // 4. Student Lookup (BVC -> Other College -> Unknown)
    // 4. Student Lookup based on event eligibility
    var isBvcOnly = this._isBvcOnlyEvent(event);

    Logger.log(
      '[COORDINATOR-FLOW][04A] Student eligibility=' +
      (isBvcOnly ? 'BVC_ONLY' : 'ALL_COLLEGES')
    );

    var student =
      StudentService.getStudentByRollNumber(normRoll);

    var otherStudent = null;
    var studentSource = 'UNKNOWN';

    if (student) {
      // STUDENTS is the authoritative BVC student database.
      studentSource = 'BVC';

      Logger.log(
        '[COORDINATOR-FLOW][05] BVC lookup result: FOUND'
      );

    } else {

      Logger.log(
        '[COORDINATOR-FLOW][05] BVC lookup result: NOT_FOUND'
      );

      // External database must NEVER be searched for BVC-only events.
      if (!isBvcOnly) {

        otherStudent =
          this._lookupOtherCollegeStudent(normRoll);

        if (otherStudent) {
          studentSource = 'EXTERNAL';

          Logger.log(
            '[COORDINATOR-FLOW][06] External lookup result: FOUND'
          );

        } else {
          studentSource = 'UNKNOWN';

          Logger.log(
            '[COORDINATOR-FLOW][06] External lookup result: NOT_FOUND'
          );
        }

      } else {

        studentSource = 'UNKNOWN';

        Logger.log(
          '[COORDINATOR-FLOW][06] External lookup skipped: BVC_ONLY event'
        );
      }
    }
    // Helper to resolve student field attributes safely
    var effectiveStudent = student || otherStudent;

    var sName = effectiveStudent ? (this._findValueByNormalizedKey(effectiveStudent, 'student_name') || this._findValueByNormalizedKey(effectiveStudent, 'name') || '') : '';
    var sBranch = effectiveStudent ? (this._findValueByNormalizedKey(effectiveStudent, 'department') || this._findValueByNormalizedKey(effectiveStudent, 'branch') || this._findValueByNormalizedKey(effectiveStudent, 'department_id') || '') : '';

    var rawCollege = effectiveStudent ? (this._findValueByNormalizedKey(effectiveStudent, 'college_name') || this._findValueByNormalizedKey(effectiveStudent, 'college') || '') : '';
    var sCollege = rawCollege;
    if (!sCollege && studentSource === 'BVC') {
      sCollege = 'BVC Engineering College';
    }

    var sYear = effectiveStudent ? (this._findValueByNormalizedKey(effectiveStudent, 'year') || '') : '';
    var sSection = effectiveStudent ? (this._findValueByNormalizedKey(effectiveStudent, 'section') || '') : '';
    var sPhone = effectiveStudent ? (this._findValueByNormalizedKey(effectiveStudent, 'phone') || this._findValueByNormalizedKey(effectiveStudent, 'phone_number') || this._findValueByNormalizedKey(effectiveStudent, 'mobile') || this._findValueByNormalizedKey(effectiveStudent, 'mobile_number') || '') : '';
    var sEmail = effectiveStudent ? (this._findValueByNormalizedKey(effectiveStudent, 'email') || this._findValueByNormalizedKey(effectiveStudent, 'email_address') || '') : '';

    var knownData = {
      rollNumber: normRoll,
      studentName: sName,
      branch: sBranch,
      college: sCollege,
      year: sYear,
      section: sSection,
      phone: sPhone,
      email: sEmail,
      studentSource: studentSource,
      isKnownStudent: !!effectiveStudent,
      sourceStudent: effectiveStudent || {}
    };

    if (!effectiveStudent) {
      Logger.log('[COORDINATOR-FLOW][05] Student not found in database: roll=' + normRoll);
      return Utils.buildResponse(true, 'Student with roll number ' + normRoll + ' was not found in the system database.', {
        state: 'STUDENT_NOT_FOUND',
        rollNumber: normRoll,
        event: event,
        studentData: knownData
      });
    }

    // 5. Registration Mode Resolution
    var regCol = (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION) ? CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION : 'Enable Registration';
    var rawRegEnable = event[regCol] !== undefined ? event[regCol] : (event.enable_registration !== undefined ? event.enable_registration : event.enableRegistration);
    var isRegRequired = this._parseBoolean(rawRegEnable);

    Logger.log('[COORDINATOR-FLOW][04] Registration mode resolved: ' + (isRegRequired ? 'REGISTRATION_REQUIRED' : 'NO_REGISTRATION'));

    var configuredFields =
      this._getEffectiveRegistrationFields(event);


    // Dynamic & Standard Required Field Evaluator
    var checkMissingFields = function (configured, known) {
      var missing = [];
      configured = Array.isArray(configured) ? configured : [];
      known = known || {};

      var customData = known.customData || {};
      var sourceStudent = known.sourceStudent || {};
      var regRecord = known.registrationRecord || {};

      configured.forEach(function (field) {
        if (!field) return;

        var isRequired =
          field.required === true ||
          field.isRequired === true ||
          String(field.required || '').toLowerCase() === 'true' ||
          String(field.isRequired || '').toLowerCase() === 'true';

        if (!isRequired) return;

        var fieldName = field.name || field.label || field.fieldName || field.key || '';
        var normalizedName = this._normalizeFieldName(fieldName);
        var value = null;

        if (
          normalizedName === 'name' ||
          normalizedName === 'studentname' ||
          normalizedName === 'participantname' ||
          normalizedName === 'fullname'
        ) {
          value = known.studentName;
        } else if (
          normalizedName === 'roll' ||
          normalizedName === 'rollno' ||
          normalizedName === 'rollnumber' ||
          normalizedName === 'studentrollnumber'
        ) {
          value = known.rollNumber;
        } else if (
          normalizedName === 'branch' ||
          normalizedName === 'department' ||
          normalizedName === 'departmentid' ||
          normalizedName === 'dept'
        ) {
          value = known.branch;
        } else if (
          normalizedName === 'college' ||
          normalizedName === 'collegename'
        ) {
          value = known.college;
        } else if (
          normalizedName === 'year' ||
          normalizedName === 'studentyear'
        ) {
          value = known.year;
        } else if (
          normalizedName === 'section' ||
          normalizedName === 'studentsection'
        ) {
          value = known.section;
        } else if (
          normalizedName === 'phone' ||
          normalizedName === 'phonenumber' ||
          normalizedName === 'mobile' ||
          normalizedName === 'mobilenumber' ||
          normalizedName === 'contact' ||
          normalizedName === 'contactnumber'
        ) {
          value = known.phone;
        } else if (
          normalizedName === 'email' ||
          normalizedName === 'emailaddress' ||
          normalizedName === 'studentemail'
        ) {
          value = known.email;
        }

        if (!this._hasValue(value)) {
          value = this._findValueByNormalizedKey(customData, fieldName);
        }

        if (!this._hasValue(value)) {
          value = this._findValueByNormalizedKey(known, fieldName);
        }

        if (!this._hasValue(value)) {
          value = this._findValueByNormalizedKey(sourceStudent, fieldName);
        }

        if (!this._hasValue(value)) {
          value = this._findValueByNormalizedKey(regRecord, fieldName);
        }

        if (!this._hasValue(value)) {
          missing.push(field);
        }
      }.bind(this));

      return missing;
    }.bind(this);

    // ------------------------------------------------------------------------
    // FLOW A: NO REGISTRATION REQUIRED
    // ------------------------------------------------------------------------
    if (!isRegRequired) {
      var missingFieldsA = checkMissingFields(configuredFields, knownData);
      Logger.log('[COORDINATOR-FLOW][07] Required fields evaluated missingCount=' + missingFieldsA.length);

      if (missingFieldsA.length > 0) {
        Logger.log('[COORDINATOR-FLOW][09] Final state=MISSING_REQUIRED_FIELDS');
        return Utils.buildResponse(true, 'Required participant details missing.', {
          state: 'MISSING_REQUIRED_FIELDS',
          event: event,
          studentData: knownData,
          missingFields: missingFieldsA,
          configuredFields: configuredFields
        });
      }

      Logger.log('[COORDINATOR-FLOW][09] Final state=READY_TO_MARK');
      return Utils.buildResponse(true, 'Participant ready for attendance confirmation.', {
        state: 'READY_TO_MARK',
        event: event,
        studentData: knownData,
        missingFields: [],
        configuredFields: configuredFields
      });
    }

    // ------------------------------------------------------------------------
    // FLOW B: REGISTRATION REQUIRED
    // ------------------------------------------------------------------------
    Logger.log('[COORDINATOR-FLOW][08] Registration evaluated for roll=' + normRoll);
    var participantsList = DatabaseService.findByColumn(
      CONFIG.SHEETS.EVENT_PARTICIPANTS,
      'Event ID',
      normEventId,
      {
        strict: true
      }
    ) || [];

    if (participantsList.length === 0) {
      participantsList = DatabaseService.findByColumn(
        CONFIG.SHEETS.EVENT_PARTICIPANTS,
        'event_id',
        normEventId,
        {
          strict: true
        }
      ) || [];
    }

    var registrationRecord = participantsList.find(function (p) {
      if (!p) return false;
      var r = p['Roll Number'] || p.roll_number || p.rollNumber || '';
      var status = String(p['Registration Status'] || p.registration_status || p.status || '').trim().toLowerCase();
      var isDeleted = this._parseBoolean(p['Deletion Flag'] || p.deletion_flag);

      return String(r).trim().toUpperCase() === normRoll &&
        status !== 'cancelled' &&
        status !== 'rejected' &&
        !isDeleted;
    }.bind(this));

    if (registrationRecord) {
      var customData = {};
      var rawCustom = registrationRecord.custom_fields_data || registrationRecord['Custom Fields Data'] || registrationRecord.customFields;
      if (rawCustom) {
        try {
          customData = typeof rawCustom === 'string' ? JSON.parse(rawCustom) : rawCustom;
        } catch (e) {
          Logger.log('[COORDINATOR-FLOW][ERROR] Failed parsing custom_fields_data: ' + (e && e.message ? e.message : e));
        }
      }

      knownData.registrationRecord = registrationRecord;
      knownData.customData = customData;

      var missingFieldsB = checkMissingFields(configuredFields, knownData);
      Logger.log('[COORDINATOR-FLOW][07] Required fields evaluated missingCount=' + missingFieldsB.length);

      if (missingFieldsB.length > 0) {
        Logger.log('[COORDINATOR-FLOW][09] Final state=MISSING_REQUIRED_FIELDS');
        return Utils.buildResponse(true, 'Registered participant is missing additional required fields.', {
          state: 'MISSING_REQUIRED_FIELDS',
          event: event,
          studentData: knownData,
          missingFields: missingFieldsB,
          configuredFields: configuredFields
        });
      }

      Logger.log('[COORDINATOR-FLOW][09] Final state=READY_TO_MARK');
      return Utils.buildResponse(true, 'Registered participant ready for attendance confirmation.', {
        state: 'READY_TO_MARK',
        event: event,
        studentData: knownData,
        missingFields: [],
        configuredFields: configuredFields
      });
    }

    // Participant is NOT registered -> Check Spot Registration
    var spotCol = (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.EVENT_ALLOW_SPOT_REGISTRATION) ? CONFIG.COLUMNS.EVENT_ALLOW_SPOT_REGISTRATION : 'Allow Spot Registration';
    var rawSpot = event[spotCol] !== undefined ? event[spotCol] : (event.allow_spot_registration !== undefined ? event.allow_spot_registration : event.allowSpotRegistration);
    var isSpotAllowed = this._parseBoolean(rawSpot);

    Logger.log('[COORDINATOR-FLOW][08] Spot registration evaluated allowed=' + isSpotAllowed);

    if (!isSpotAllowed) {
      Logger.log('[COORDINATOR-FLOW][09] Final state=NOT_REGISTERED_SPOT_DISABLED');
      return Utils.buildResponse(false, 'This participant is not registered for this event and spot registration is not available.', {
        state: 'NOT_REGISTERED_SPOT_DISABLED',
        event: event,
        rollNumber: normRoll
      });
    }

    var missingSpotFields = checkMissingFields(configuredFields, knownData);
    Logger.log('[COORDINATOR-FLOW][09] Final state=SPOT_REGISTRATION_REQUIRED');
    return Utils.buildResponse(true, 'Participant is not registered for this event. Spot registration is available.', {
      state: 'SPOT_REGISTRATION_REQUIRED',
      event: event,
      studentData: knownData,
      configuredFields: configuredFields,
      missingFields: missingSpotFields
    });
  },

  // ==========================================================================
  // SPOT REGISTRATION ACTION
  // ==========================================================================
  spotRegisterParticipant: function (sessionToken, eventId, rawRollNumber, spotData) {
    var normRoll = String(rawRollNumber || '').trim().toUpperCase();
    var normEventId = String(eventId || '').trim();
    spotData = spotData || {};
    // Extract custom fields safely from supported input formats.
    var customFieldsInput =
      spotData.customFields ||
      spotData.custom_fields ||
      spotData.customData ||
      spotData.custom_fields_data ||
      {};

    // Support JSON string input as well as object input.
    if (typeof customFieldsInput === 'string') {
      try {
        customFieldsInput = JSON.parse(customFieldsInput);
      } catch (e) {
        Logger.log(
          '[COORDINATOR-FLOW][ERROR] Invalid custom fields JSON: ' +
          (e && e.message ? e.message : e)
        );
        customFieldsInput = {};
      }
    }

    // Prevent invalid values such as arrays/numbers from entering the workflow.
    if (
      !customFieldsInput ||
      typeof customFieldsInput !== 'object' ||
      Array.isArray(customFieldsInput)
    ) {
      customFieldsInput = {};
    }
    Logger.log(
      '[COORDINATOR-FLOW][01] Spot registration requested roll=' +
      normRoll +
      ' event=' +
      normEventId
    );

    // ------------------------------------------------------------
    // 1. BASIC VALIDATION
    // ------------------------------------------------------------

    if (!normRoll) {
      return Utils.buildResponse(
        false,
        'Roll number is required for spot registration.',
        { state: 'INVALID_ROLL_NUMBER' }
      );
    }

    var userId = SessionService.getCurrentUser(sessionToken);

    if (!userId) {
      return Utils.buildResponse(
        false,
        'Invalid or expired session.',
        { state: 'UNAUTHORIZED' }
      );
    }

    var actionUser = UserService.getUserById(userId);
    var validation = this.validateCoordinatorSession(actionUser);

    if (!validation.success) {
      return Utils.buildResponse(
        false,
        validation.message,
        { state: 'UNAUTHORIZED' }
      );
    }

    var userRole = String(
      (actionUser && (actionUser.Role || actionUser.role)) || ''
    ).trim().toUpperCase();

    if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN') {
      if (!this.canManageEvent(userId, normEventId)) {
        Logger.log(
          '[COORDINATOR-FLOW][ERROR] Spot registration authorization failed'
        );

        return Utils.buildResponse(
          false,
          'Unauthorized: You are not assigned to manage this event.',
          { state: 'UNAUTHORIZED' }
        );
      }
    }

    // ------------------------------------------------------------
    // 2. LOAD EVENT
    // ------------------------------------------------------------

    var event = EventService.getEventById(normEventId);
    if (!event) {
      return Utils.buildResponse(
        false,
        'Event not found.',
        { state: 'EVENT_NOT_AVAILABLE' }
      );
    }
    var eventStatus = String(
      event.event_status ||
      event['Event Status'] ||
      event.status ||
      ''
    ).trim().toUpperCase();

    var blockedEventStatuses = [
      'CANCELLED',
      'COMPLETED',
      'STOPPED',
      'DRAFT',
      'UPCOMING'
    ];

    if (blockedEventStatuses.indexOf(eventStatus) !== -1) {
      Logger.log(
        '[COORDINATOR-FLOW][03] Mark blocked event=' +
        normEventId +
        ' status=' +
        eventStatus
      );

      return Utils.buildResponse(
        false,
        'Attendance cannot be marked because this event is ' + eventStatus.toLowerCase() + '.',
        {
          state: 'EVENT_NOT_AVAILABLE',
          eventStatus: eventStatus
        }
      );
    }

    var regCol =
      CONFIG &&
        CONFIG.COLUMNS &&
        CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION
        ? CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION
        : 'Enable Registration';

    var rawRegEnable =
      event[regCol] !== undefined
        ? event[regCol]
        : (
          event.enable_registration !== undefined
            ? event.enable_registration
            : event.enableRegistration
        );

    var isRegRequired = this._parseBoolean(rawRegEnable);

    // Spot registration must never be used for a no-registration event.
    if (!isRegRequired) {
      Logger.log(
        '[COORDINATOR-FLOW][09] Spot registration rejected because registration is disabled'
      );

      return Utils.buildResponse(
        false,
        'Spot registration is not required because registration is disabled for this event.',
        {
          state: 'REGISTRATION_NOT_REQUIRED',
          event: event
        }
      );
    }

    var spotCol =
      CONFIG &&
        CONFIG.COLUMNS &&
        CONFIG.COLUMNS.EVENT_ALLOW_SPOT_REGISTRATION
        ? CONFIG.COLUMNS.EVENT_ALLOW_SPOT_REGISTRATION
        : 'Allow Spot Registration';

    var rawSpot =
      event[spotCol] !== undefined
        ? event[spotCol]
        : (
          event.allow_spot_registration !== undefined
            ? event.allow_spot_registration
            : event.allowSpotRegistration
        );

    var isSpotAllowed = this._parseBoolean(rawSpot);

    if (!isSpotAllowed) {
      return Utils.buildResponse(
        false,
        'Spot registration is not allowed for this event.',
        { state: 'NOT_REGISTERED_SPOT_DISABLED' }
      );
    }

    // ------------------------------------------------------------
    // 3. LOAD CURRENT PARTICIPANTS ONCE
    // ------------------------------------------------------------

    var participantsList =
      DatabaseService.findByColumn(
        CONFIG.SHEETS.EVENT_PARTICIPANTS,
        'Event ID',
        normEventId
      ) || [];

    if (participantsList.length === 0) {
      participantsList =
        DatabaseService.findByColumn(
          CONFIG.SHEETS.EVENT_PARTICIPANTS,
          'event_id',
          normEventId
        ) || [];
    }

    var validParticipants = participantsList.filter(function (p) {
      if (!p) return false;

      var status = String(
        p['Registration Status'] ||
        p.registration_status ||
        p.status ||
        ''
      ).trim().toLowerCase();

      var isDeleted = this._parseBoolean(
        p['Deletion Flag'] !== undefined
          ? p['Deletion Flag']
          : p.deletion_flag
      );

      return (
        !isDeleted &&
        status !== 'cancelled' &&
        status !== 'rejected' &&
        status !== 'deleted'
      );
    }.bind(this));

    // ------------------------------------------------------------
    // 4. DUPLICATE REGISTRATION CHECK
    // ------------------------------------------------------------

    var existing = validParticipants.find(function (p) {
      var participantRoll =
        p['Roll Number'] ||
        p.roll_number ||
        p.rollNumber ||
        '';

      return (
        String(participantRoll).trim().toUpperCase() === normRoll
      );
    });

    if (existing) {
      Logger.log(
        '[COORDINATOR-FLOW][04] Existing registration found roll=' +
        normRoll
      );

      return this.processParticipantForEvent(
        sessionToken,
        normEventId,
        normRoll
      );
    }

    // ------------------------------------------------------------
    // 5. CAPACITY CHECK
    // ------------------------------------------------------------

    var maxSeatsCol =
      CONFIG &&
        CONFIG.COLUMNS &&
        CONFIG.COLUMNS.EVENT_MAXIMUM_SEATS
        ? CONFIG.COLUMNS.EVENT_MAXIMUM_SEATS
        : 'Maximum Seats';

    var rawMaxSeats =
      event[maxSeatsCol] !== undefined
        ? event[maxSeatsCol]
        : (
          event.maximum_seats !== undefined
            ? event.maximum_seats
            : event.capacity
        );

    var maxSeats = parseInt(rawMaxSeats, 10);

    if (isNaN(maxSeats) || maxSeats < 0) {
      maxSeats = 0;
    }

    // Use actual valid participant rows as primary capacity source.
    var currentCount = validParticipants.length;

    if (maxSeats > 0 && currentCount >= maxSeats) {
      Logger.log(
        '[COORDINATOR-FLOW][09] Final state=CAPACITY_REACHED'
      );

      return Utils.buildResponse(
        false,
        'Spot registration failed: Maximum capacity reached for this event.',
        {
          state: 'CAPACITY_REACHED',
          currentCount: currentCount,
          maximumSeats: maxSeats
        }
      );
    }

    // ------------------------------------------------------------
    // 6. LOOKUP EXISTING STUDENT BEFORE VALIDATING FORM
    // ------------------------------------------------------------

    var existingStudent =
      StudentService.getStudentByRollNumber(normRoll);

    var existingOther = null;

    // Respect event student eligibility.
    // BVC_ONLY events must never search OTHER_COLLEGE_STUDENTS.
    var isBvcOnly = this._isBvcOnlyEvent(event);

    if (!existingStudent && !isBvcOnly) {
      existingOther =
        this._lookupOtherCollegeStudent(normRoll);
    }

    var existingSource =
      existingStudent
        ? 'BVC'
        : (existingOther ? 'EXTERNAL' : 'UNKNOWN');

    var sourceStudent =
      existingStudent ||
      existingOther ||
      {};
    // Safely read an existing value from the matched student record.
    var getExistingValue = function () {
      for (var i = 0; i < arguments.length; i++) {
        var value =
          this._findValueByNormalizedKey(
            sourceStudent,
            arguments[i]
          );

        if (this._hasValue(value)) {
          return value;
        }
      }

      return '';
    }.bind(this);

    Logger.log(
      '[COORDINATOR-FLOW][05] Spot student lookup source=' +
      existingSource +
      ' eligibility=' +
      (isBvcOnly ? 'BVC_ONLY' : 'ALL_COLLEGES')
    );

    if (typeof customFieldsInput === 'string') {
      try {
        customFieldsInput =
          JSON.parse(customFieldsInput);
      } catch (e) {
        Logger.log(
          '[COORDINATOR-FLOW][ERROR] Invalid custom fields JSON: ' +
          (e && e.message ? e.message : e)
        );

        customFieldsInput = {};
      }
    }

    var knownSpotData = {
      rollNumber: normRoll,

      studentName:
        spotData.studentName ||
        spotData.name ||
        getExistingValue('student_name', 'name'),

      branch:
        spotData.branch ||
        spotData.department ||
        getExistingValue(
          'department',
          'branch',
          'department_id'
        ),

      college:
        spotData.college ||
        spotData.collegeName ||
        getExistingValue(
          'college_name',
          'college'
        ),

      year:
        spotData.year ||
        getExistingValue('year'),

      section:
        spotData.section ||
        getExistingValue('section'),

      phone:
        spotData.phone ||
        spotData.phoneNumber ||
        spotData.mobile ||
        getExistingValue(
          'phone',
          'phone_number',
          'mobile',
          'mobile_number'
        ),

      email:
        spotData.email ||
        spotData.emailAddress ||
        getExistingValue(
          'email',
          'email_address'
        ),

      studentSource: existingSource,
      isKnownStudent: !!(existingStudent || existingOther),
      sourceStudent: sourceStudent,
      customData: customFieldsInput
    };

    if (
      !this._hasValue(knownSpotData.college) &&
      existingSource === 'BVC'
    ) {
      knownSpotData.college =
        'BVC Engineering College';
    }

    // ------------------------------------------------------------
    // 7. REQUIRED FIELD VALIDATION
    // ------------------------------------------------------------

    var configuredFields =
      this._getEffectiveRegistrationFields(event);

    var missingSpotFields = [];

    configuredFields.forEach(function (field) {
      if (!field) return;

      var isRequired =
        field.required === true ||
        field.isRequired === true ||
        String(field.required || '')
          .trim()
          .toLowerCase() === 'true' ||
        String(field.isRequired || '')
          .trim()
          .toLowerCase() === 'true';

      if (!isRequired) return;

      var fieldName =
        field.name ||
        field.label ||
        field.fieldName ||
        field.key ||
        '';

      var normalized =
        this._normalizeFieldName(fieldName);

      var value = null;

      if (
        normalized === 'name' ||
        normalized === 'studentname' ||
        normalized === 'fullname'
      ) {
        value = knownSpotData.studentName;
      } else if (
        normalized === 'roll' ||
        normalized === 'rollno' ||
        normalized === 'rollnumber'
      ) {
        value = knownSpotData.rollNumber;
      } else if (
        normalized === 'branch' ||
        normalized === 'department' ||
        normalized === 'departmentid' ||
        normalized === 'dept'
      ) {
        value = knownSpotData.branch;
      } else if (
        normalized === 'college' ||
        normalized === 'collegename'
      ) {
        value = knownSpotData.college;
      } else if (
        normalized === 'year' ||
        normalized === 'studentyear'
      ) {
        value = knownSpotData.year;
      } else if (
        normalized === 'section' ||
        normalized === 'studentsection'
      ) {
        value = knownSpotData.section;
      } else if (
        normalized === 'phone' ||
        normalized === 'phonenumber' ||
        normalized === 'mobile' ||
        normalized === 'mobilenumber' ||
        normalized === 'contact' ||
        normalized === 'contactnumber'
      ) {
        value = knownSpotData.phone;
      } else if (
        normalized === 'email' ||
        normalized === 'emailaddress' ||
        normalized === 'studentemail'
      ) {
        value = knownSpotData.email;
      }

      if (!this._hasValue(value)) {
        value =
          this._findValueByNormalizedKey(
            customFieldsInput,
            fieldName
          );
      }

      if (!this._hasValue(value)) {
        missingSpotFields.push(field);
      }
    }.bind(this));

    if (missingSpotFields.length > 0) {
      Logger.log(
        '[COORDINATOR-FLOW][07] Spot required fields missing=' +
        missingSpotFields.length
      );

      return Utils.buildResponse(
        true,
        'Spot registration is missing required fields.',
        {
          state: 'SPOT_REGISTRATION_REQUIRED',
          event: event,
          studentData: knownSpotData,
          configuredFields: configuredFields,
          missingFields: missingSpotFields
        }
      );
    }

    // ------------------------------------------------------------
    // 8. DETERMINE STUDENT TYPE SAFELY
    // ------------------------------------------------------------
    var rawType =
      spotData.studentType ||
      spotData.type ||
      existingSource ||
      '';

    var typeUpper =
      String(rawType).trim().toUpperCase();

    var collegeName =
      String(knownSpotData.college || '').trim();

    var collegeLower =
      collegeName.toLowerCase();

    // Event eligibility is authoritative.
    var isBvcOnly =
      this._isBvcOnlyEvent(event);

    var isExplicitOther =
      !isBvcOnly &&
      (
        existingSource === 'EXTERNAL' ||
        typeUpper.indexOf('OTHER') !== -1 ||
        typeUpper.indexOf('EXTERNAL') !== -1 ||
        (
          collegeName !== '' &&
          collegeLower.indexOf('bvc') === -1 &&
          collegeLower.indexOf('bonam') === -1
        )
      );

    var isExplicitBvc =
      existingSource === 'BVC' ||
      typeUpper.indexOf('BVC') !== -1 ||
      collegeLower.indexOf('bvc') !== -1 ||
      collegeLower.indexOf('bonam') !== -1;

    // BVC_ONLY events never ask the coordinator to classify
    // a participant as BVC vs External.
    // An unknown roll is treated as a new BVC student candidate.
    if (
      isBvcOnly &&
      existingSource === 'UNKNOWN'
    ) {
      isExplicitBvc = true;
      isExplicitOther = false;

      Logger.log(
        '[COORDINATOR-FLOW][08] Unknown student treated as BVC candidate because event eligibility=BVC_ONLY'
      );
    }

    // Only ALL_COLLEGES events require classification
    // when the student cannot be identified.
    if (
      !isBvcOnly &&
      existingSource === 'UNKNOWN' &&
      !isExplicitOther &&
      !isExplicitBvc
    ) {
      Logger.log(
        '[COORDINATOR-FLOW][09] Final state=STUDENT_TYPE_REQUIRED'
      );

      return Utils.buildResponse(
        false,
        'Student classification (BVC or External College) is required.',
        {
          state: 'STUDENT_TYPE_REQUIRED',
          rollNumber: normRoll,
          studentData: knownSpotData
        }
      );
    }

    // ------------------------------------------------------------
    // 9. CREATE STUDENT MASTER RECORD ONLY WHEN NECESSARY
    // ------------------------------------------------------------

    if (!existingStudent && !existingOther) {

      if (isExplicitOther) {

        var otherSheet =
          CONFIG &&
            CONFIG.SHEETS &&
            CONFIG.SHEETS.OTHER_COLLEGE_STUDENTS
            ? CONFIG.SHEETS.OTHER_COLLEGE_STUDENTS
            : 'OTHER_COLLEGE_STUDENTS';

        var otherStudentPayload = {
          id:
            'OCS_' +
            Date.now() +
            '_' +
            Math.floor(Math.random() * 1000),

          roll_number: normRoll,
          student_name: knownSpotData.studentName,
          college_name: knownSpotData.college,
          department: knownSpotData.branch,
          year: knownSpotData.year,
          section: knownSpotData.section,
          status: 'Active',
          created_by: 'Coordinator',
          created_at: new Date().toISOString()
        };

        try {
          var otherInserted =
            DatabaseService.insertRow(
              otherSheet,
              otherStudentPayload
            );

          if (!otherInserted) {
            return Utils.buildResponse(
              false,
              'Failed to save external student details.',
              { state: 'ERROR' }
            );
          }

        } catch (externalInsertError) {

          Logger.log(
            '[COORDINATOR-FLOW][ERROR] External student insert failed: ' +
            (
              externalInsertError &&
                externalInsertError.message
                ? externalInsertError.message
                : externalInsertError
            )
          );

          return Utils.buildResponse(
            false,
            'Database write failed for external student record.',
            { state: 'ERROR' }
          );
        }

      } else {

        // IMPORTANT:
        // branch/code must NEVER be written directly into department_id.
        //
        // An unknown BVC student requires a REAL department primary ID.
        //
        // Accept departmentId only when the caller explicitly provides it.
        // Do not invent or derive a fake department_id from branch.

        var realDepartmentId =
          spotData.departmentId ||
          spotData.department_id ||
          '';

        realDepartmentId = String(realDepartmentId || '').trim();

        if (!realDepartmentId && knownSpotData.branch) {

          var departments =
            DatabaseService.readAllRows(
              CONFIG.SHEETS.DEPARTMENTS
            ) || [];

          var branch =
            String(knownSpotData.branch)
              .trim()
              .toUpperCase();

          var department = departments.find(function (dept) {

            return (
              String(dept["Department Code"] || "")
                .trim()
                .toUpperCase() === branch ||

              String(dept["Department Name"] || "")
                .trim()
                .toUpperCase() === branch
            );

          });

          if (department) {

            realDepartmentId =
              String(
                department["Department ID"] || ""
              ).trim();

          }
        }

        if (!realDepartmentId) {

          Logger.log(
            '[COORDINATOR-FLOW][09] Final state=DEPARTMENT_ID_REQUIRED'
          );

          return Utils.buildResponse(
            false,
            'A valid department ID is required before creating a new BVC student.',
            {
              state: 'DEPARTMENT_ID_REQUIRED',
              rollNumber: normRoll,
              branch: knownSpotData.branch,
              studentData: knownSpotData
            }
          );
        }

        var studentPayload = {
          student_id:
            'STU_SPOT_' +
            Date.now() +
            '_' +
            Math.floor(Math.random() * 1000),

          roll_number: normRoll,
          student_name: knownSpotData.studentName,

          // REAL department primary ID only.
          department_id: realDepartmentId,

          year: knownSpotData.year,
          section: knownSpotData.section,
          status: 'Active',
          college:
            knownSpotData.college ||
            'BVC Engineering College'
        };

        try {

          var bvcInserted =
            DatabaseService.insertRow(
              CONFIG.SHEETS.STUDENTS,
              studentPayload
            );

          if (!bvcInserted) {
            return Utils.buildResponse(
              false,
              'Failed to save student details.',
              { state: 'ERROR' }
            );
          }

        } catch (studentInsertError) {

          Logger.log(
            '[COORDINATOR-FLOW][ERROR] BVC student insert failed: ' +
            (
              studentInsertError &&
                studentInsertError.message
                ? studentInsertError.message
                : studentInsertError
            )
          );

          return Utils.buildResponse(
            false,
            'Database write failed for student record.',
            { state: 'ERROR' }
          );
        }
      }
    }

    // ------------------------------------------------------------
    // 10. FINAL DUPLICATE CHECK BEFORE INSERT
    // ------------------------------------------------------------

    var latestParticipants =
      DatabaseService.findByColumn(
        CONFIG.SHEETS.EVENT_PARTICIPANTS,
        'Event ID',
        normEventId
      ) || [];

    if (latestParticipants.length === 0) {
      latestParticipants =
        DatabaseService.findByColumn(
          CONFIG.SHEETS.EVENT_PARTICIPANTS,
          'event_id',
          normEventId
        ) || [];
    }

    var duplicateNow =
      latestParticipants.find(function (p) {

        if (!p) return false;

        var roll =
          p['Roll Number'] ||
          p.roll_number ||
          p.rollNumber ||
          '';

        var status =
          String(
            p['Registration Status'] ||
            p.registration_status ||
            p.status ||
            ''
          )
            .trim()
            .toLowerCase();

        var deleted =
          this._parseBoolean(
            p['Deletion Flag'] !== undefined
              ? p['Deletion Flag']
              : p.deletion_flag
          );

        return (
          String(roll).trim().toUpperCase() === normRoll &&
          !deleted &&
          status !== 'cancelled' &&
          status !== 'rejected' &&
          status !== 'deleted'
        );

      }.bind(this));

    if (duplicateNow) {
      return this.processParticipantForEvent(
        sessionToken,
        normEventId,
        normRoll
      );
    }

    // ------------------------------------------------------------
    // 11. CREATE PARTICIPANT
    // ------------------------------------------------------------

    var now =
      new Date();

    var participantId =
      'PART_' +
      Date.now() +
      '_' +
      Math.floor(Math.random() * 100000);

    var participantRecord = {
      participant_id: participantId,
      event_id: normEventId,
      roll_number: normRoll,
      registration_type: 'Spot',
      registration_status: 'Active',
      attendance_status: 'Absent',
      approval_status: 'Approved',
      registration_date: Utils.formatDate(now),
      registration_timestamp: now.toISOString(),

      custom_fields_data:
        JSON.stringify(customFieldsInput || {}),

      created_by: userId,
      created_at: now.toISOString()
    };

    try {

      var participantInserted =
        DatabaseService.insertRow(
          CONFIG.SHEETS.EVENT_PARTICIPANTS,
          participantRecord
        );

      if (!participantInserted) {

        Logger.log(
          '[COORDINATOR-FLOW][ERROR] Participant insert returned false'
        );

        return Utils.buildResponse(
          false,
          'Failed to create spot registration in database.',
          { state: 'ERROR' }
        );
      }

    } catch (participantInsertError) {

      Logger.log(
        '[COORDINATOR-FLOW][ERROR] Participant insert failed: ' +
        (
          participantInsertError &&
            participantInsertError.message
            ? participantInsertError.message
            : participantInsertError
        )
      );

      return Utils.buildResponse(
        false,
        'Failed to create spot registration in database.',
        { state: 'ERROR' }
      );
    }

    // ------------------------------------------------------------
    // 12. REGISTERED COUNT — SECONDARY/DENORMALIZED VALUE
    // ------------------------------------------------------------

    try {

      var countCol =
        CONFIG &&
          CONFIG.COLUMNS &&
          CONFIG.COLUMNS.EVENT_REGISTERED_COUNT
          ? CONFIG.COLUMNS.EVENT_REGISTERED_COUNT
          : 'Registered Count';

      var updatePayload = {};

      // Participant rows are the source used for the capacity decision.
      updatePayload[countCol] =
        validParticipants.length + 1;

      DatabaseService.updateRow(
        CONFIG.SHEETS.EVENTS,
        CONFIG.COLUMNS &&
          CONFIG.COLUMNS.EVENT_ID
          ? CONFIG.COLUMNS.EVENT_ID
          : 'Event ID',
        normEventId,
        updatePayload
      );

    } catch (countError) {

      // Registration already exists.
      // Do not falsely report registration failure because only the
      // denormalized count failed to update.

      Logger.log(
        '[COORDINATOR-FLOW][ERROR] Registered count synchronization failed: ' +
        (
          countError && countError.message
            ? countError.message
            : countError
        )
      );
    }

    Logger.log(
      '[COORDINATOR-FLOW][09] Spot registration successful roll=' +
      normRoll
    );

    return this.processParticipantForEvent(
      sessionToken,
      normEventId,
      normRoll
    );
  },

  // ==========================================================================
  // CONFIRM PARTICIPATION ACTION (MARK PARTICIPATED)
  // ==========================================================================
  confirmMarkParticipation: function (
    sessionToken,
    eventId,
    rawRollNumber,
    additionalData
  ) {

    var normRoll =
      String(rawRollNumber || '')
        .trim()
        .toUpperCase();

    var normEventId =
      String(eventId || '').trim();

    additionalData =
      additionalData &&
        typeof additionalData === 'object'
        ? additionalData
        : {};

    Logger.log(
      '[COORDINATOR-FLOW][01] Mark participation requested roll=' +
      normRoll +
      ' event=' +
      normEventId
    );

    if (!normRoll) {
      return Utils.buildResponse(
        false,
        'Roll number is required.',
        { state: 'INVALID_ROLL_NUMBER' }
      );
    }

    // ------------------------------------------------------------
    // 1. SESSION
    // ------------------------------------------------------------

    var userId =
      SessionService.getCurrentUser(sessionToken);

    if (!userId) {
      return Utils.buildResponse(
        false,
        'Invalid or expired session.',
        { state: 'UNAUTHORIZED' }
      );
    }

    var actionUser =
      UserService.getUserById(userId);

    var validation =
      this.validateCoordinatorSession(actionUser);

    if (!validation.success) {
      return Utils.buildResponse(
        false,
        validation.message,
        { state: 'UNAUTHORIZED' }
      );
    }

    var userRole =
      String(
        (
          actionUser &&
          (actionUser.Role || actionUser.role)
        ) || ''
      )
        .trim()
        .toUpperCase();

    if (
      userRole !== 'SUPERADMIN' &&
      userRole !== 'ADMIN'
    ) {

      if (!this.canManageEvent(userId, normEventId)) {

        return Utils.buildResponse(
          false,
          'Unauthorized: You are not assigned to manage this event.',
          { state: 'UNAUTHORIZED' }
        );
      }
    }

    // ------------------------------------------------------------
    // 2. EVENT
    // ------------------------------------------------------------

    var event =
      EventService.getEventById(normEventId);

    if (!event) {
      return Utils.buildResponse(
        false,
        'Event not found.',
        { state: 'EVENT_NOT_AVAILABLE' }
      );
    }

    // ------------------------------------------------------------
    // 3. DUPLICATE ATTENDANCE
    // ------------------------------------------------------------

    if (
      AttendanceService.hasStudentAttended(
        normEventId,
        normRoll
      )
    ) {

      Logger.log(
        '[COORDINATOR-FLOW][08] Duplicate attendance prevented roll=' +
        normRoll
      );

      return Utils.buildResponse(
        true,
        'Participation has already been recorded for this student.',
        {
          state: 'ALREADY_MARKED',
          rollNumber: normRoll
        }
      );
    }

    // ------------------------------------------------------------
    // 4. REVALIDATE WORKFLOW BEFORE MARKING
    // ------------------------------------------------------------

    var workflow =
      this.processParticipantForEvent(
        sessionToken,
        normEventId,
        normRoll
      );

    if (!workflow) {
      return Utils.buildResponse(
        false,
        'Unable to validate participant workflow.',
        { state: 'ERROR' }
      );
    }

    var workflowState =
      workflow.state ||
      (
        workflow.data &&
          workflow.data.state
          ? workflow.data.state
          : ''
      );

    var workflowData =
      workflow.data || workflow;

    // States that must NEVER directly mark attendance.
    if (
      workflowState === 'UNAUTHORIZED' ||
      workflowState === 'EVENT_NOT_AVAILABLE' ||
      workflowState === 'NOT_REGISTERED_SPOT_DISABLED' ||
      workflowState === 'SPOT_REGISTRATION_REQUIRED' ||
      workflowState === 'STUDENT_TYPE_REQUIRED' ||
      workflowState === 'DEPARTMENT_ID_REQUIRED' ||
      workflowState === 'INVALID_ROLL_NUMBER' ||
      workflowState === 'ERROR'
    ) {

      Logger.log(
        '[COORDINATOR-FLOW][09] Mark blocked by workflow state=' +
        workflowState
      );

      return workflow;
    }

    if (workflowState === 'ALREADY_MARKED') {
      return workflow;
    }

    // ------------------------------------------------------------
    // 5. REQUIRED FIELDS
    // ------------------------------------------------------------

    if (workflowState === 'MISSING_REQUIRED_FIELDS') {

      var missingFields =
        workflowData.missingFields || [];

      var stillMissing = [];

      // ----------------------------------------------------------
      // Build one combined source of participant data.
      //
      // Priority:
      //   existing workflow/master data
      //        +
      //   existing participant custom fields
      //        +
      //   newly supplied coordinator data
      //
      // New data is used to fill missing values, not to decide
      // whether existing master data should be overwritten.
      // ----------------------------------------------------------

      var existingWorkflowData =
        workflowData.studentData || {};

      var existingCustomData =
        workflowData.customFields ||
        workflowData.custom_fields_data ||
        {};

      if (typeof existingCustomData === 'string') {
        try {
          existingCustomData =
            JSON.parse(existingCustomData);
        } catch (e) {
          existingCustomData = {};
        }
      }

      var suppliedCustomData =
        additionalData.customFields ||
        additionalData.custom_fields ||
        additionalData.customData ||
        {};

      if (typeof suppliedCustomData === 'string') {
        try {
          suppliedCustomData =
            JSON.parse(suppliedCustomData);
        } catch (e) {
          suppliedCustomData = {};
        }
      }

      missingFields.forEach(function (field) {

        if (!field) return;

        var fieldName =
          field.name ||
          field.label ||
          field.fieldName ||
          field.key ||
          field.field_name ||
          '';

        if (!fieldName) {
          stillMissing.push(field);
          return;
        }

        // 1. Check existing master/workflow student data.
        var value =
          this._findValueByNormalizedKey(
            existingWorkflowData,
            fieldName
          );

        // 2. Check existing participant custom fields.
        if (!this._hasValue(value)) {
          value =
            this._findValueByNormalizedKey(
              existingCustomData,
              fieldName
            );
        }

        // 3. Check newly supplied canonical/form data.
        if (!this._hasValue(value)) {
          value =
            this._findValueByNormalizedKey(
              additionalData,
              fieldName
            );
        }

        // 4. Check newly supplied custom fields.
        if (!this._hasValue(value)) {
          value =
            this._findValueByNormalizedKey(
              suppliedCustomData,
              fieldName
            );
        }

        if (!this._hasValue(value)) {
          stillMissing.push(field);
        }

      }.bind(this));

      if (stillMissing.length > 0) {

        Logger.log(
          '[COORDINATOR-FLOW][07] Mark blocked missing fields=' +
          stillMissing.length
        );

        return Utils.buildResponse(
          true,
          'Required participant details are still missing.',
          {
            state: 'MISSING_REQUIRED_FIELDS',
            event: event,
            studentData: existingWorkflowData,
            configuredFields:
              workflowData.configuredFields || [],
            missingFields: stillMissing
          }
        );
      }

      // Required fields are now satisfied.
      // Promote workflow so attendance processing can continue.
      workflowState = 'READY_TO_MARK';

      Logger.log(
        '[COORDINATOR-FLOW][07] Required fields satisfied; promoted state=READY_TO_MARK'
      );

    } else if (workflowState !== 'READY_TO_MARK') {

      Logger.log(
        '[COORDINATOR-FLOW][09] Unexpected workflow state=' +
        workflowState
      );

      return Utils.buildResponse(
        false,
        'Participant is not ready to mark attendance.',
        {
          state:
            workflowState ||
            'ERROR'
        }
      );
    }

    // ------------------------------------------------------------
    // 6. SAVE PROVIDED CANONICAL STUDENT DETAILS WHEN POSSIBLE
    // ------------------------------------------------------------

    var existingStudent =
      StudentService.getStudentByRollNumber(normRoll);

    if (
      existingStudent &&
      Object.keys(additionalData).length > 0
    ) {

      var studentUpdates = {};

      // Helper: get an existing student value regardless of column naming style.
      var getExistingStudentValue = function () {
        for (var i = 0; i < arguments.length; i++) {
          var key = arguments[i];

          if (
            existingStudent[key] !== undefined &&
            existingStudent[key] !== null &&
            String(existingStudent[key]).trim() !== ''
          ) {
            return existingStudent[key];
          }
        }

        return '';
      };

      // ------------------------------------------------------------
      // NAME
      // Only save coordinator-supplied name when DB name is missing.
      // ------------------------------------------------------------
      var existingName = getExistingStudentValue(
        'Student Name',
        'student_name',
        'name',
        'Full Name',
        'full_name'
      );

      var suppliedName =
        additionalData.studentName ||
        additionalData.name ||
        '';

      if (
        !this._hasValue(existingName) &&
        this._hasValue(suppliedName)
      ) {
        studentUpdates[
          CONFIG.COLUMNS &&
            CONFIG.COLUMNS.STUDENT_NAME
            ? CONFIG.COLUMNS.STUDENT_NAME
            : 'Student Name'
        ] = suppliedName;
      }

      // ------------------------------------------------------------
      // PHONE
      // Never overwrite an already-filled phone number.
      // ------------------------------------------------------------
      var existingPhone = getExistingStudentValue(
        'Phone',
        'phone',
        'Phone Number',
        'phone_number',
        'Mobile',
        'mobile',
        'Mobile Number',
        'mobile_number'
      );

      var suppliedPhone =
        additionalData.phone ||
        additionalData.phoneNumber ||
        additionalData.mobile ||
        '';

      if (
        !this._hasValue(existingPhone) &&
        this._hasValue(suppliedPhone)
      ) {
        studentUpdates['Phone'] = suppliedPhone;
      }

      // ------------------------------------------------------------
      // EMAIL
      // Never overwrite an already-filled email address.
      // ------------------------------------------------------------
      var existingEmail = getExistingStudentValue(
        'Email',
        'email',
        'Email Address',
        'email_address'
      );

      var suppliedEmail =
        additionalData.email ||
        additionalData.emailAddress ||
        '';

      if (
        !this._hasValue(existingEmail) &&
        this._hasValue(suppliedEmail)
      ) {
        studentUpdates['Email'] = suppliedEmail;
      }

      Logger.log(
        '[COORDINATOR-FLOW] Protected student updates fields=' +
        Object.keys(studentUpdates).join(',')
      );

      if (Object.keys(studentUpdates).length > 0) {

        try {

          var updateResult =
            DatabaseService.updateRow(
              CONFIG.SHEETS.STUDENTS,
              CONFIG.COLUMNS &&
                CONFIG.COLUMNS.STUDENT_ROLL_NUMBER
                ? CONFIG.COLUMNS.STUDENT_ROLL_NUMBER
                : 'Roll Number',
              normRoll,
              studentUpdates
            );

          if (updateResult === false) {

            Logger.log(
              '[COORDINATOR-FLOW][ERROR] Required student data update returned false'
            );

            return Utils.buildResponse(
              false,
              'Participant details could not be saved. Attendance was not marked.',
              { state: 'ERROR' }
            );
          }

        } catch (updateError) {

          Logger.log(
            '[COORDINATOR-FLOW][ERROR] Student detail update failed: ' +
            (
              updateError && updateError.message
                ? updateError.message
                : updateError
            )
          );

          return Utils.buildResponse(
            false,
            'Participant details could not be saved. Attendance was not marked.',
            { state: 'ERROR' }
          );
        }
      }
    }

    // ------------------------------------------------------------
    // 7. FINAL DUPLICATE CHECK
    // ------------------------------------------------------------

    if (
      AttendanceService.hasStudentAttended(
        normEventId,
        normRoll
      )
    ) {

      return Utils.buildResponse(
        true,
        'Participation has already been recorded for this student.',
        {
          state: 'ALREADY_MARKED',
          rollNumber: normRoll
        }
      );
    }

    // ------------------------------------------------------------
    // 8. SAVE ATTENDANCE RECORD
    // ------------------------------------------------------------

    var attendancePayload = {
      eventId: normEventId,
      rollNumber: normRoll,
      attendanceMethod: 'Barcode'
    };

    var result =
      AttendanceService.markAttendance(
        attendancePayload,
        userId
      );

    if (!result || !result.success) {

      Logger.log(
        '[COORDINATOR-FLOW][ERROR] Attendance insertion failed: ' +
        (result ? result.message : 'Unknown error')
      );

      return (
        result ||
        Utils.buildResponse(
          false,
          'Failed to mark participation.',
          { state: 'ERROR' }
        )
      );
    }

    // ------------------------------------------------------------
    // 9. DATABASE VERIFICATION
    // ------------------------------------------------------------

    var dbVerified =
      AttendanceService.hasStudentAttended(
        normEventId,
        normRoll
      );

    if (!dbVerified) {

      Logger.log(
        '[COORDINATOR-FLOW][ERROR] Attendance DB verification failed roll=' +
        normRoll
      );

      return Utils.buildResponse(
        false,
        'Participation was processed but database verification failed.',
        { state: 'ERROR' }
      );
    }

    Logger.log(
      '[COORDINATOR-FLOW][09] Participation marked successfully roll=' +
      normRoll
    );

    var counts =
      AttendanceService.getEventAttendanceCount(
        normEventId
      ) || {};

    var stats = {
      present: counts.present || 0,
      remaining:
        counts.absent ||
        (
          counts.total
            ? (counts.total - counts.present)
            : 0
        ),
      total: counts.total || 0
    };

    var studentObj =
      StudentService.getStudentByRollNumber(normRoll);

    if (!studentObj && !this._isBvcOnlyEvent(event)) {
      studentObj =
        this._lookupOtherCollegeStudent(normRoll);
    }

    studentObj = studentObj || {};

    var dispName =
      studentObj['Student Name'] ||
      studentObj.student_name ||
      studentObj.name ||
      additionalData.studentName ||
      additionalData.name ||
      'Participant';

    var scanItem = {
      roll_number: normRoll,
      student_name: dispName,
      timestamp: new Date().toLocaleTimeString(),
      status: 'Present',
      attendance_method: 'Barcode'
    };

    return Utils.buildResponse(
      true,
      'Participation marked successfully.',
      {
        state: 'COMPLETED',
        rollNumber: normRoll,
        statistics: stats,
        scanItem: scanItem
      }
    );
  }

};