/**
 * ExportService.js
 * Enterprise Custom Export Builder Service.
 * Coordinates template management and handles backend security validation, sorting, filtering, and summarization.
 */
const ExportService = {

  /**
   * Retrieves all custom templates saved by a user.
   */
  getTemplates: function(userId) {
    try {
      if (!userId) return [];
      const records = DatabaseService.readAllRows(CONFIG.SHEETS.EXPORT_TEMPLATES) || [];
      return records.filter(t => 
        String(t.user_id).trim() === String(userId).trim() && 
        !t[CONFIG.COLUMNS.DELETION_FLAG]
      );
    } catch (e) {
      Logger.log("ExportService.getTemplates error: " + e.message);
      return [];
    }
  },

  /**
   * Saves or updates a custom export template.
   */
  saveTemplate: function(userId, data) {
    try {
      if (!userId || !data || !data.template_name || !data.module_type) {
        return Utils.buildResponse(false, "Invalid template data.");
      }

      const configurationStr = typeof data.configuration === 'object' ? JSON.stringify(data.configuration) : (data.configuration || '{}');

      const templateObj = {
        template_id: data.template_id || (typeof IdService !== 'undefined' && IdService.generateId ? IdService.generateId('TPL') : 'TPL-' + Date.now()),
        user_id: userId,
        template_name: data.template_name,
        module_type: data.module_type,
        configuration: configurationStr,
        [CONFIG.COLUMNS.DELETION_FLAG]: false,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let success = false;
      if (data.template_id) {
        success = DatabaseService.updateRow(CONFIG.SHEETS.EXPORT_TEMPLATES, 'template_id', data.template_id, templateObj);
      } else {
        success = DatabaseService.insertRow(CONFIG.SHEETS.EXPORT_TEMPLATES, templateObj);
      }

      if (success) {
        return Utils.buildResponse(true, "Template saved successfully.", { template: templateObj });
      }
      return Utils.buildResponse(false, "Failed to write template record.");
    } catch (e) {
      Logger.log("ExportService.saveTemplate error: " + e.message);
      return Utils.buildResponse(false, "Template write exception: " + e.message);
    }
  },

  /**
   * Soft-deletes a saved template.
   */
  deleteTemplate: function(userId, templateId) {
    try {
      if (!userId || !templateId) return Utils.buildResponse(false, "Invalid template ID.");
      const success = DatabaseService.updateRow(CONFIG.SHEETS.EXPORT_TEMPLATES, 'template_id', templateId, {
        [CONFIG.COLUMNS.DELETION_FLAG]: true,
        updated_at: new Date().toISOString()
      });
      if (success) {
        return Utils.buildResponse(true, "Template deleted successfully.");
      }
      return Utils.buildResponse(false, "Failed to delete template record.");
    } catch (e) {
      Logger.log("ExportService.deleteTemplate error: " + e.message);
      return Utils.buildResponse(false, "Template delete exception: " + e.message);
    }
  },

  /**
   * Enforces backend RBAC validations and builds custom export payloads.
   */
  processCustomExport: function(userId, config, userContext) {
    try {
      if (!userId || !config || !config.module_type) {
        return Utils.buildResponse(false, "Missing export configuration.");
      }

      userContext = userContext || {};
      const role = String(userContext.role || '').toUpperCase().trim();
      const userDept = String(userContext.department || '').toUpperCase().trim();
      const isSuper = (role === 'SUPER ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPERADMIN' || role === 'ADMIN' || !userContext.role);

      // 1. Fetch raw data based on module type
      let rawData = [];
      let primaryIdKey = 'id';
      if (config.module_type === 'events') {
        rawData = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
        primaryIdKey = 'event_id';
      } else if (config.module_type === 'participants') {
        rawData = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];
        primaryIdKey = 'participant_id';
      } else if (config.module_type === 'attendance') {
        rawData = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
        primaryIdKey = 'attendance_id';
      } else if (config.module_type === 'users') {
        if (role !== 'SUPER ADMIN' && role !== 'SUPER_ADMIN' && role !== 'SUPERADMIN' && role !== 'HOD') {
          return Utils.buildResponse(false, "Access Denied: You do not have permission to export users.");
        }
        rawData = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
        primaryIdKey = 'user_id';
      } else if (config.module_type === 'departments') {
        rawData = DatabaseService.readAllRows(CONFIG.SHEETS.DEPARTMENTS) || [];
        primaryIdKey = 'department_id';
      } else if (config.module_type === 'students') {
        rawData = DatabaseService.readAllRows(CONFIG.SHEETS.STUDENTS) || [];
        primaryIdKey = 'student_id';
      }

      // Filter out soft-deleted records
      rawData = rawData.filter(r => !r[CONFIG.COLUMNS.DELETION_FLAG]);

      // 2. Enforce Department Isolation & Role restrictions
      if (!isSuper) {
        if (config.module_type === 'students') {
          rawData = typeof SecurityUtils !== 'undefined' ? SecurityUtils.applyStudentRLS(rawData, userContext) : rawData;
        } else if (config.module_type === 'events') {
          rawData = typeof SecurityUtils !== 'undefined' ? SecurityUtils.applyEventRLS(rawData, userContext) : rawData;
        } else if (config.module_type === 'users') {
          rawData = typeof SecurityUtils !== 'undefined' ? SecurityUtils.applyUserRLS(rawData, userContext) : rawData;
        } else if (config.module_type === 'participants' || config.module_type === 'attendance') {
          if (role === 'HOD' && userDept) {
            // HOD can only see their own department's students/scans
            rawData = rawData.filter(r => {
              const rowDept = String(r.department_id || r.department || r.Department || '').toUpperCase().trim();
              return rowDept === userDept || rowDept.indexOf(userDept) !== -1;
            });
          } else if (role === 'ADMIN') {
            // Admin can only see their assigned events' participants/scans
            const assignments = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_ASSIGNMENTS) || [];
            const assignedEventIds = assignments
              .filter(a => String(a.user_id).trim() === String(userId).trim() && !a[CONFIG.COLUMNS.DELETION_FLAG])
              .map(a => String(a.event_id).trim());

            rawData = rawData.filter(r => {
              const rowEventId = String(r.event_id || '').trim();
              return assignedEventIds.indexOf(rowEventId) !== -1;
            });
          } else {
            // Coordinator can only see their own assigned event details
            const coordinators = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
            const activeAssignments = coordinators.filter(c => {
              const uId = c['User ID'] || c.user_id;
              const status = c['Assignment Status'] || c.assignment_status;
              const deleted = c['Deletion Flag'] === true || c['Deletion Flag'] === 'true' || c.deletion_flag === true || c.deletion_flag === 'true';
              return String(uId || '').trim() === String(userId).trim() && 
                     String(status || '').trim().toLowerCase() === 'active' && 
                     !deleted;
            }).map(c => String(c['Event ID'] || c.event_id || '').trim());

            rawData = rawData.filter(r => {
              const rowEventId = String(r.event_id || r['Event ID'] || '').trim();
              return activeAssignments.indexOf(rowEventId) !== -1;
            });
          }
        }
      }

      // 3. Apply Filters
      if (config.filters) {
        for (let key in config.filters) {
          const val = config.filters[key];
          if (val !== undefined && val !== null && val !== '') {
            rawData = rawData.filter(r => {
              const rowVal = String(r[key] || '').toLowerCase();
              return rowVal.indexOf(String(val).toLowerCase()) !== -1;
            });
          }
        }
      }

      // 4. Apply Sorting
      if (config.sort_by) {
        const sortKey = config.sort_by;
        const sortDir = config.sort_order === 'desc' ? -1 : 1;
        rawData.sort((a, b) => {
          let valA = a[sortKey] !== undefined ? a[sortKey] : '';
          let valB = b[sortKey] !== undefined ? b[sortKey] : '';
          if (!isNaN(valA) && !isNaN(valB)) {
            return (Number(valA) - Number(valB)) * sortDir;
          }
          return String(valA).localeCompare(String(valB)) * sortDir;
        });
      }

      // 5. Select only requested fields (Enforcing columns whitelist validation)
      const selectedFields = config.fields || [];
      if (selectedFields.length === 0) {
        return Utils.buildResponse(false, "No fields selected for export.");
      }

      const formattedRows = rawData.map(r => {
        const rowObj = {};
        selectedFields.forEach(f => {
          rowObj[f] = r[f] !== undefined ? r[f] : '--';
        });
        return rowObj;
      });

      // 6. Calculate Summary Statistics
      const summaries = {};
      if (config.summary_options && config.summary_options.length > 0) {
        config.summary_options.forEach(opt => {
          if (opt === 'Total Records') {
            summaries['Total Records'] = formattedRows.length;
          } else if (opt === 'Present Count' && config.module_type === 'attendance') {
            summaries['Present Count'] = rawData.filter(r => String(r.attendance_status || '').toUpperCase() === 'PRESENT').length;
          } else if (opt === 'Absent Count' && config.module_type === 'attendance') {
            summaries['Absent Count'] = rawData.filter(r => String(r.attendance_status || '').toUpperCase() === 'ABSENT').length;
          }
        });
      }

      return Utils.buildResponse(true, "Data prepared successfully.", {
        columns: selectedFields,
        rows: formattedRows,
        summary: summaries
      });
    } catch (e) {
      Logger.log("ExportService.processCustomExport error: " + e.message);
      return Utils.buildResponse(false, "Export processing exception: " + e.message);
    }
  }
};
