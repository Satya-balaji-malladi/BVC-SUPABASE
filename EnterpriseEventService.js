/**
 * EnterpriseEventService.js
 * Handles advanced enterprise event functionalities: templates, cloning, and approval workflows.
 */
const EnterpriseEventService = {

  /**
   * Retrieves all active event templates.
   */
  getEventTemplates: function() {
    try {
      const records = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_TEMPLATES) || [];
      return records.filter(r => !r.deletion_flag);
    } catch (e) {
      Logger.log("EnterpriseEventService.getEventTemplates error: " + e.message);
      return [];
    }
  },

  /**
   * Saves or updates an event template.
   */
  saveEventTemplate: function(name, config) {
    try {
      if (!name || !config) return Utils.buildResponse(false, "Invalid template data.");
      const templateId = 'TPL-' + Date.now();
      const payload = {
        template_id: templateId,
        template_name: name,
        default_config: typeof config === 'object' ? JSON.stringify(config) : config,
        created_at: new Date().toISOString(),
        deletion_flag: false
      };
      const success = DatabaseService.insertRow(CONFIG.SHEETS.EVENT_TEMPLATES, payload);
      if (success) {
        return Utils.buildResponse(true, "Template saved successfully.", { template: payload });
      }
      return Utils.buildResponse(false, "Failed to save template.");
    } catch (e) {
      Logger.log("EnterpriseEventService.saveEventTemplate error: " + e.message);
      return Utils.buildResponse(false, e.message);
    }
  },

  /**
   * Clones an existing event configuration while ignoring participants, scans, and analytics.
   */
  cloneEvent: function(eventId, newName, newDates, newAdminId, creatorId) {
    try {
      const original = EventService.getEventById(eventId);
      if (!original) return Utils.buildResponse(false, "Original event not found.");

      const newId = IdService.generateEventId();
      const nowIso = new Date().toISOString();

      // Deep copy original settings
      const cloned = Object.assign({}, original, {
        [CONFIG.COLUMNS.EVENT_ID]: newId,
        [CONFIG.COLUMNS.EVENT_NAME]: newName,
        [CONFIG.COLUMNS.START_DATE]: newDates.start_date,
        [CONFIG.COLUMNS.END_DATE]: newDates.end_date,
        [CONFIG.COLUMNS.START_TIME]: newDates.start_time || original[CONFIG.COLUMNS.START_TIME],
        [CONFIG.COLUMNS.END_TIME]: newDates.end_time || original[CONFIG.COLUMNS.END_TIME],
        [CONFIG.COLUMNS.COORDINATOR_ID]: newAdminId || original[CONFIG.COLUMNS.COORDINATOR_ID],
        [CONFIG.COLUMNS.EVENT_STATUS]: CONFIG.EVENT_STATUS.DRAFT,
        [CONFIG.COLUMNS.DELETION_FLAG]: false,
        [CONFIG.COLUMNS.CREATED_AT]: nowIso,
        [CONFIG.COLUMNS.CREATED_BY]: creatorId || 'System',
        [CONFIG.COLUMNS.UPDATED_AT]: nowIso,
        [CONFIG.COLUMNS.UPDATED_BY]: creatorId || 'System',
        'registered_count': 0
      });

      const success = DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, cloned);
      if (success) {
        // Auto-assign new coordinator
        if (newAdminId) {
          CoordinatorService.assignCoordinator(newId, newAdminId, 'Event Admin', creatorId || 'System', 'Assigned upon cloning');
        }
        AuditService.logAction(creatorId || 'System', 'EnterpriseEventService', 'CLONE_EVENT', newId, 'Event', 'Event cloned from ' + eventId, '', '', 'SUCCESS', creatorId || 'System');
        return Utils.buildResponse(true, "Event cloned successfully into draft status.", { event: cloned });
      }
      return Utils.buildResponse(false, "Failed to insert cloned event record.");
    } catch (e) {
      Logger.log("EnterpriseEventService.cloneEvent error: " + e.message);
      return Utils.buildResponse(false, e.message);
    }
  },

  /**
   * Submits a Draft event for approval.
   */
  submitForApproval: function(eventId, userId) {
    try {
      const event = EventService.getEventById(eventId);
      if (!event) return Utils.buildResponse(false, "Event not found.");
      
      const success = DatabaseService.updateRow(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eventId, {
        [CONFIG.COLUMNS.EVENT_STATUS]: 'Pending Approval',
        [CONFIG.COLUMNS.UPDATED_BY]: userId,
        [CONFIG.COLUMNS.UPDATED_AT]: new Date().toISOString()
      });

      if (success) {
        AuditService.logAction(userId, 'EnterpriseEventService', 'SUBMIT_APPROVAL', eventId, 'Event', 'Event submitted for approval', 'Draft', 'Pending Approval', 'SUCCESS', userId);
        return Utils.buildResponse(true, "Submitted for HOD/Super Admin approval.");
      }
      return Utils.buildResponse(false, "Failed to update status.");
    } catch (e) {
      return Utils.buildResponse(false, e.message);
    }
  },

  /**
   * Approves a pending event.
   */
  approveEvent: function(eventId, approverId) {
    try {
      const event = EventService.getEventById(eventId);
      if (!event) return Utils.buildResponse(false, "Event not found.");

      const success = DatabaseService.updateRow(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eventId, {
        [CONFIG.COLUMNS.EVENT_STATUS]: 'Configuration',
        [CONFIG.COLUMNS.UPDATED_BY]: approverId,
        [CONFIG.COLUMNS.UPDATED_AT]: new Date().toISOString()
      });

      if (success) {
        AuditService.logAction(approverId, 'EnterpriseEventService', 'APPROVE_EVENT', eventId, 'Event', 'Event approved by manager', 'Pending Approval', 'Configuration', 'SUCCESS', approverId);
        return Utils.buildResponse(true, "Event approved. It is now in Configuration state.");
      }
      return Utils.buildResponse(false, "Failed to update status.");
    } catch (e) {
      return Utils.buildResponse(false, e.message);
    }
  }
};
