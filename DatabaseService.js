const DatabaseService = {
  _cache: {},
  _logicalKeysCache: {},
  _nextIdCounters: {},
  _dbToAppMap: null,
  _appToDbMap: null,
  _tableColumns: {
    departments: ['department_id', 'department_code', 'department_name', 'short_name', 'hod_name', 'hod_employee_id', 'total_students', 'total_coordinators', 'total_events_hosted', 'total_participants', 'status', 'created_by', 'created_at', 'updated_by', 'updated_at', 'remarks', 'deletion_flag'],
    students: ['student_id', 'roll_number', 'student_name', 'email_address', 'year', 'semester', 'section', 'gender', 'student_status', 'phone_number', 'department_id', 'guardian_name', 'date_of_birth', 'enrollment_date', 'last_updated_at', 'notes', 'college', 'deletion_flag'],
    users: ['user_id', 'employee_id', 'first_name', 'last_name', 'email_address', 'phone_number', 'department', 'title_designation', 'username', 'password_hash', 'salt', 'authentication_provider', 'first_login', 'role', 'status', 'profile_picture_url', 'failed_login_attempts', 'account_locked', 'last_login_timestamp', 'last_logout_timestamp', 'password_reset_required', 'password_last_changed', 'password_expiry_date', 'two_factor_enabled', 'two_factor_secret', 'otp', 'otp_expiry', 'otp_attempts', 'popup_notifications', 'notification_sound', 'theme_preference', 'language', 'timezone', 'bio_notes', 'created_by', 'created_at', 'updated_by', 'updated_at', 'deletion_flag'],
    events: ['event_id', 'event_name', 'description', 'location', 'event_category', 'organizer', 'start_date', 'end_date', 'start_time', 'end_time', 'attendance_type', 'barcode_attendance', 'manual_attendance', 'capacity', 'registered_count', 'event_status', 'report_generated', 'report_date', 'remarks', 'created_at', 'updated_at', 'last_attendance_sync', 'notes', 'deletion_flag', 'attendance_window_start', 'attendance_window_end', 'check_out_enabled', 'departments', 'years', 'last_action', 'last_action_at', 'last_action_by', 'enable_registration', 'registration_open', 'registration_close', 'maximum_seats', 'allow_spot_registration', 'registration_fields', 'terms_and_conditions', 'registration_url'],
    event_coordinators: ['assignment_id', 'event_id', 'user_id', 'assignment_role', 'assignment_status', 'assigned_by', 'assigned_date', 'updated_by', 'updated_date', 'remarks', 'deletion_flag'],
    event_participants: ['participant_id', 'event_id', 'roll_number', 'registration_type', 'registration_status', 'attendance_status', 'approval_status', 'approved_by', 'registration_date', 'registration_time', 'registration_timestamp', 'attendance_timestamp', 'certificate_issued', 'certificate_id', 'created_at', 'updated_at', 'created_by', 'deletion_flag', 'last_action', 'remarks', 'last_sync_timestamp', 'custom_fields_data'],
    attendance: ['attendance_id', 'event_id', 'roll_number', 'user_id', 'attendance_status', 'attendance_method', 'date', 'time', 'timestamp', 'is_undo', 'undo_reason', 'undo_timestamp', 'correction_requested', 'correction_status', 'correction_reason', 'correction_handled_by', 'location', 'remarks', 'created_at', 'updated_at', 'sync_status', 'deletion_flag', 'check_out_timestamp', 'total_duration_minutes'],
    sessions: ['session_id', 'user_id', 'username', 'login_timestamp', 'last_activity_timestamp', 'expiry_time', 'logout_timestamp', 'session_status', 'ip_address', 'user_agent', 'device_type', 'os', 'browser', 'location', 'login_method', 'session_token', 'created_by', 'created_at', 'updated_by', 'updated_at', 'deletion_flag', 'remarks'],
    generated_reports: ['report_id', 'event_id', 'generated_by_user_id', 'report_name', 'report_type', 'generated_date', 'generated_time', 'generated_timestamp', 'report_status', 'pdf_available', 'excel_available', 'csv_available', 'print_available', 'total_downloads', 'last_downloaded_by', 'last_downloaded_date', 'file_path', 'remarks', 'deletion_flag'],
    settings: ['setting_id', 'category', 'key', 'value', 'data_type', 'description', 'editable', 'status', 'created_by', 'created_at', 'updated_by', 'updated_at', 'notes', 'deletion_flag'],
    audit_logs: ['log_id', 'user_id', 'employee_id', 'username', 'module', 'action', 'record_id', 'record_type', 'description', 'old_value', 'new_value', 'status', 'ip_address', 'device', 'browser', 'location', 'session_id', 'session_token', 'error_message', 'execution_time_ms', 'created_by', 'created_at', 'updated_by', 'updated_at', 'deletion_flag', 'remarks'],
    notifications: ['notification_id', 'user_id', 'title', 'message', 'notification_type', 'status', 'created_at', 'updated_at', 'deletion_flag'],
    diagnostics: ['id', 'log_type', 'module', 'log_text', 'created_at'],
    export_templates: ['template_id', 'user_id', 'template_name', 'module_type', 'configuration', 'created_at', 'updated_at', 'deletion_flag'],
    event_templates: ['template_id', 'template_name', 'default_config', 'created_at', 'deletion_flag'],
    attendance_corrections: ['request_id', 'attendance_id', 'user_id', 'requested_status', 'reason', 'approval_status', 'handled_by', 'created_at', 'deletion_flag'],
    test_history: ['run_id', 'run_timestamp', 'triggered_by', 'summary', 'details', 'deletion_flag']
  },

  /**
   * Helper to format string into snake_case
   */
  _toSnakeCase: function (str) {
    if (!str) return str;
    return str.toString()
      .replace(/\s+/g, '_')
      .replace(/\//g, '_')
      .replace(/\(/g, '')
      .replace(/\)/g, '')
      .replace(/[\.-]/g, '_')
      .toLowerCase();
  },

  /**
   * Initializes bidirectional column name mappings dynamically.
   */
  _initMappings: function () {
    if (this._dbToAppMap) return;
    this._dbToAppMap = {};
    this._appToDbMap = {};

    if (CONFIG && CONFIG.COLUMNS) {
      for (var key in CONFIG.COLUMNS) {
        var appColName = CONFIG.COLUMNS[key];
        var dbColName = this._toSnakeCase(appColName);
        this._dbToAppMap[dbColName] = appColName;
        this._appToDbMap[appColName] = dbColName;
      }
    }

    // Explicit manual mappings for safety
    this._dbToAppMap['deletion_flag'] = 'Deletion Flag';
    this._appToDbMap['Deletion Flag'] = 'deletion_flag';
  },

  /**
   * Translates application record keys into database column names (snake_case).
   */
  _mapToDbRecord: function (record, dbTable) {
    this._initMappings();
    var dbRecord = {};
    var validCols = dbTable ? this._tableColumns[dbTable] : null;

    for (var key in record) {
      if (key.indexOf('__') === 0) continue; // Skip Apps Script row metadata
      var dbKey = this._appToDbMap[key] || this._toSnakeCase(key);

      // Filter out keys that do not exist in the database table, with special mappings
      if (validCols && validCols.indexOf(dbKey) === -1) {
        if (dbTable === 'users' && (dbKey === 'lastlogin' || dbKey === 'last_login')) {
          dbKey = 'last_login_timestamp';
        } else if (dbTable === 'users' && dbKey === 'profile_photo') {
          dbKey = 'profile_picture_url';
        } else if (dbTable === 'departments' && dbKey === 'hod_emp_id') {
          dbKey = 'hod_employee_id';
        } else if (dbTable === 'departments' && (dbKey === 'hod_email' || dbKey === 'hod_contact_email')) {
          dbKey = 'remarks';
        } else {
          continue; // Skip fields not present in Supabase table
        }
      }

      var val = record[key];
      // Convert empty strings to null for ALL columns to prevent PostgreSQL syntax errors (e.g. 22007 timestamp, 22P02 integer)
      if (val === "") {
        val = null;
      } else if (val !== null && val !== undefined) {
        // If it's a date/timestamp column and is numeric/epoch millisecond format, convert to ISO 8601 string
        if (dbKey.indexOf('timestamp') !== -1 ||
          dbKey.indexOf('date') !== -1 ||
          dbKey === 'expiry_time' ||
          dbKey === 'password_last_changed' ||
          dbKey === 'password_expiry_date') {
          if (!isNaN(val) && val !== "") {
            val = new Date(Number(val)).toISOString();
          } else if (val instanceof Date) {
            val = val.toISOString();
          }
        }
      }

      dbRecord[dbKey] = val;
    }

    // Explicit safety override for strict non-null database fields:
    if (dbTable === 'users' && !dbRecord['salt']) {
      dbRecord['salt'] = 'plain';
    }

    return dbRecord;
  },

  /**
   * Translates database record keys (snake_case) into application column names.
   */
  _mapToAppRecord: function (dbRecord) {
    if (!dbRecord) return dbRecord;
    this._initMappings();
    var appRecord = {};
    for (var key in dbRecord) {
      var appKey = this._dbToAppMap[key] || key;
      appRecord[appKey] = dbRecord[key];
    }
    return appRecord;
  },

  /**
   * Helper to send HTTP requests to Supabase PostgREST API.
   */
  _request: function (endpoint, method, payload, queryParams, extraHeaders) {
    const url = CONFIG.SUPABASE.URL + '/rest/v1/' + endpoint + (queryParams ? '?' + queryParams : '');

    Logger.log("[DEBUG] URL = " + url);

    const headers = {
      'apikey': CONFIG.SUPABASE.KEY,
      'Authorization': 'Bearer ' + CONFIG.SUPABASE.KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    if (extraHeaders) {
      for (var h in extraHeaders) { headers[h] = extraHeaders[h]; }
    }

    const options = {
      method: method,
      headers: headers,
      muteHttpExceptions: true
    };

    if (payload) {
      options.payload = JSON.stringify(payload);
    }

    const response = UrlFetchApp.fetch(url, options);
    Logger.log("[DEBUG] HTTP Status = " + response.getResponseCode());
    Logger.log("[DEBUG] Response Body = " + response.getContentText());
    const code = response.getResponseCode();
    const content = response.getContentText();

    if (code >= 200 && code < 300) {
      return JSON.parse(content || '[]');
    } else {
      throw new Error('Supabase REST Error (' + code + '): ' + content);
    }
  },

  /**
   * Resolves sheet name to logical key.
   */
  _getLogicalSheetKey: function (sheetName) {
    this._initMappings();
    if (this._logicalKeysCache[sheetName]) return this._logicalKeysCache[sheetName];
    let resolved = sheetName;
    if (CONFIG.SHEETS && CONFIG.SHEETS[sheetName]) {
      resolved = sheetName;
    } else {
      for (var key in CONFIG.SHEETS) {
        if (CONFIG.SHEETS[key] === sheetName) {
          resolved = key;
          break;
        }
      }
    }
    this._logicalKeysCache[sheetName] = resolved;
    return resolved;
  },

  _getDbTableName: function (sheetName) {
    var logicalKey = this._getLogicalSheetKey(sheetName);
    var dbTable = logicalKey.toLowerCase();

    // Explicit overrides for table name mapping discrepancies
    if (dbTable === 'auditlogs') return 'audit_logs';
    if (dbTable === 'generatedreports') return 'generated_reports';
    if (dbTable === 'systemhealthlogs') return 'system_health_logs';
    if (dbTable === 'notificationtemplates') return 'notification_templates';
    if (dbTable === 'userpermissions') return 'user_permissions';
    if (dbTable === 'eventassignments') return 'event_assignments';
    if (dbTable === 'exporttemplates') return 'export_templates';
    if (dbTable === 'eventtemplates') return 'event_templates';
    if (dbTable === 'attendancecorrections') return 'attendance_corrections';
    if (dbTable === 'testhistory') return 'test_history';

    return dbTable;
  },

  /**
   * Returns logical headers for compatibility.
   */
  getHeaderRow: function (sheetName) {
    const logicalKey = this._getLogicalSheetKey(sheetName);
    const mockHeaders = [];
    if (CONFIG && CONFIG.COLUMNS) {
      for (var key in CONFIG.COLUMNS) {
        mockHeaders.push(CONFIG.COLUMNS[key]);
      }
    }
    return mockHeaders;
  },

  getHeaders: function (sheetName) {
    return this.getHeaderRow(sheetName);
  },

  /**
   * Counts active records in a table.
   */
  count: function (sheetName) {
    try {
      const dbTable = this._getDbTableName(sheetName);
      const res = this._request(dbTable, 'GET', null, 'select=count&deletion_flag=eq.false', {
        'Prefer': 'count=exact,head=true'
      });
      return res.length; // PostgREST head request returns count metadata
    } catch (e) {
      Logger.log('DatabaseService.count error: ' + e.message);
      // Fallback to read count
      return this.readAllRows(sheetName).length;
    }
  },

  clearCache: function (sheetName) {
    if (sheetName) {
      const logicalKey = this._getLogicalSheetKey(sheetName);
      delete this._cache[logicalKey];
      delete this._nextIdCounters[logicalKey];
    } else {
      this._cache = {};
      this._nextIdCounters = {};
    }
  },

  /**
   * Reads all records from Supabase table.
   */
  readAllRows: function (sheetName) {
    try {
      const logicalKey = this._getLogicalSheetKey(sheetName);
      const dbTable = this._getDbTableName(sheetName);

      // Local runtime caching
      if (this._cache[logicalKey]) return this._cache[logicalKey];

      const dbRecords = this._request(dbTable, 'GET', null, 'deletion_flag=eq.false');
      const records = dbRecords.map(this._mapToAppRecord.bind(this));

      this._cache[logicalKey] = records;
      return records;
    } catch (e) {
      Logger.log('DatabaseService.readAllRows error [' + sheetName + ']: ' + e.message);
      return [];
    }
  },

  /**
   * Reads ALL records from Supabase table INCLUDING soft-deleted rows (deletion_flag=true).
   * Use this for reactivation checks and ID generation where deleted rows must be visible.
   */
  readAllRowsIncludingDeleted: function (sheetName) {
    try {
      const dbTable = this._getDbTableName(sheetName);
      const dbRecords = this._request(dbTable, 'GET', null, '');
      return dbRecords.map(this._mapToAppRecord.bind(this));
    } catch (e) {
      Logger.log('DatabaseService.readAllRowsIncludingDeleted error [' + sheetName + ']: ' + e.message);
      return [];
    }
  },

  getRows: function (sheetName, limit, offset) {
    try {
      const dbTable = this._getDbTableName(sheetName);
      const q = 'deletion_flag=eq.false&limit=' + (limit || 100) + '&offset=' + (offset || 0);
      const dbRecords = this._request(dbTable, 'GET', null, q);
      return dbRecords.map(this._mapToAppRecord.bind(this));
    } catch (e) {
      Logger.log('DatabaseService.getRows error: ' + e.message);
      return [];
    }
  },

  exists: function (sheetName, key, val) {
    try {
      return Boolean(this.findOne(sheetName, key, val));
    } catch (e) {
      return false;
    }
  },

  findOne: function (sheetName, key, val, includeDeleted) {
    const dbTable = this._getDbTableName(sheetName);
    const dbCol = this._appToDbMap[key] || this._toSnakeCase(key);

    let query = dbCol + '=eq.' + encodeURIComponent(val);

    if (!includeDeleted) {
      query += '&deletion_flag=eq.false';
    }

    Logger.log("[DEBUG] Sheet = " + sheetName);
    Logger.log("[DEBUG] App Column = " + key);
    Logger.log("[DEBUG] DB Column = " + dbCol);
    Logger.log("[DEBUG] Value = " + val);
    Logger.log("[DEBUG] Query = " + query);
    try {
      const dbTable = this._getDbTableName(sheetName);
      const dbCol = this._appToDbMap[key] || this._toSnakeCase(key);

      let query = dbCol + '=eq.' + encodeURIComponent(val);
      if (!includeDeleted) {
        query += '&deletion_flag=eq.false';
      }

      const res = this._request(dbTable, 'GET', null, query + '&limit=1');
      if (res && res.length > 0) {
        return this._mapToAppRecord(res[0]);
      }
      return undefined;
    } catch (e) {
      Logger.log('DatabaseService.findOne error [' + sheetName + ']: ' + e.message);
      return undefined;
    }
  },

  findByColumn: function (sheetName, col, val, options) {
    try {
      options = options || { caseSensitive: false, strict: false };
      const dbTable = this._getDbTableName(sheetName);
      const dbCol = this._appToDbMap[col] || this._toSnakeCase(col);

      let query = 'deletion_flag=eq.false';
      if (options.strict) {
        query += '&' + dbCol + '=eq.' + encodeURIComponent(val);
      } else {
        query += '&' + dbCol + '=ilike.*' + encodeURIComponent(val) + '*';
      }

      const res = this._request(dbTable, 'GET', null, query);
      return res.map(this._mapToAppRecord.bind(this));
    } catch (e) {
      Logger.log('DatabaseService.findByColumn error: ' + e.message);
      return [];
    }
  },

  filter: function (sheetName, predicate) {
    try {
      const data = this.readAllRows(sheetName);
      return typeof predicate === 'function' ? data.filter(predicate) : [];
    } catch (e) {
      return [];
    }
  },

  sortByColumn: function (sheetName, col, ascending) {
    try {
      ascending = ascending !== false;
      const dbTable = this._getDbTableName(sheetName);
      const dbCol = this._appToDbMap[col] || this._toSnakeCase(col);

      const query = 'deletion_flag=eq.false&order=' + dbCol + '.' + (ascending ? 'asc' : 'desc');
      const res = this._request(dbTable, 'GET', null, query);
      return res.map(this._mapToAppRecord.bind(this));
    } catch (e) {
      Logger.log('DatabaseService.sortByColumn error: ' + e.message);
      return [];
    }
  },

  sort: function (sheetName, col, ascending) {
    return this.sortByColumn(sheetName, col, ascending);
  },

  paginate: function (sheetName, limit, offset) {
    return this.getRows(sheetName, limit, offset);
  },

  insertRow: function (sheetName, recordData) {
    return this.insertRows(sheetName, [recordData])[0];
  },

  insertRows: function (sheetName, records) {
    try {
      const logicalKey = this._getLogicalSheetKey(sheetName);
      const dbTable = this._getDbTableName(sheetName);
      const idCol = CONFIG.ID_COLUMNS[logicalKey];

      const now = new Date().toISOString();
      const formattedRecords = records.map(function (record) {
        // Generate ID if missing
        const existingId =
          record[idCol] ||
          record.department_id ||
          record.user_id ||
          record.event_id ||
          record.participant_id ||
          record.attendance_id ||
          record.session_id ||
          record.report_id ||
          record.notification_id ||
          record.id;

        if (idCol && !existingId) {

          if (typeof IdService.generateId === "function") {

            record[idCol] = IdService.generateId(logicalKey);

          } else {

            record[idCol] = DatabaseService.generateNextId(logicalKey);

          }

        }
        // Populate standard audit fields
        if (CONFIG.COLUMNS.CREATED_AT) record[CONFIG.COLUMNS.CREATED_AT] = now;
        if (CONFIG.COLUMNS.UPDATED_AT) record[CONFIG.COLUMNS.UPDATED_AT] = now;
        if (CONFIG.COLUMNS.CREATED_BY && record[CONFIG.COLUMNS.CREATED_BY] === undefined) record[CONFIG.COLUMNS.CREATED_BY] = "System";
        if (CONFIG.COLUMNS.UPDATED_BY && record[CONFIG.COLUMNS.UPDATED_BY] === undefined) record[CONFIG.COLUMNS.UPDATED_BY] = "System";

        return DatabaseService._mapToDbRecord(record, dbTable);
      });

      const res = this._request(dbTable, 'POST', formattedRecords);
      this.clearCache(logicalKey);

      const inserted = res.map(this._mapToAppRecord.bind(this));
      inserted.forEach(function (r) { DatabaseService.onInsert(logicalKey, r); });
      return inserted;
    } catch (e) {
      Logger.log('DatabaseService.insertRows error: ' + e.message);
      throw e;
    }
  },

  updateRow: function (sheetName, key, val, updates) {
    try {
      const logicalKey = this._getLogicalSheetKey(sheetName);
      const dbTable = this._getDbTableName(sheetName);
      const dbCol = this._appToDbMap[key] || this._toSnakeCase(key);

      const now = new Date().toISOString();
      if (CONFIG.COLUMNS.UPDATED_AT) updates[CONFIG.COLUMNS.UPDATED_AT] = now;

      const dbUpdates = this._mapToDbRecord(updates, dbTable);
      const query = dbCol + '=eq.' + encodeURIComponent(val);

      const res = this._request(dbTable, 'PATCH', dbUpdates, query);
      this.clearCache(logicalKey);

      if (res && res.length > 0) {
        const updated = this._mapToAppRecord(res[0]);
        this.onUpdate(logicalKey, val, updated);
        return updated;
      }
      return null;
    } catch (e) {
      Logger.log('DatabaseService.updateRow error: ' + e.message);
      return null;
    }
  },

  batchUpdate: function (sheetName, key, vals, updates) {
    try {
      const logicalKey = this._getLogicalSheetKey(sheetName);
      const dbTable = this._getDbTableName(sheetName);
      const dbCol = this._appToDbMap[key] || this._toSnakeCase(key);

      const now = new Date().toISOString();
      if (CONFIG.COLUMNS.UPDATED_AT) updates[CONFIG.COLUMNS.UPDATED_AT] = now;

      const dbUpdates = this._mapToDbRecord(updates, dbTable);

      // Map list of values to CSV/IN query filter
      const valList = (Array.isArray(vals) ? vals : [vals]).map(function (v) { return encodeURIComponent(v); }).join(',');
      const query = dbCol + '=in.(' + valList + ')';

      const res = this._request(dbTable, 'PATCH', dbUpdates, query);
      this.clearCache(logicalKey);

      return res.map(this._mapToAppRecord.bind(this));
    } catch (e) {
      Logger.log('DatabaseService.batchUpdate error: ' + e.message);
      return [];
    }
  },

  hardDelete: function (sheetName, key, val) {
    try {
      const logicalKey = this._getLogicalSheetKey(sheetName);
      const dbTable = this._getDbTableName(sheetName);
      const dbCol = this._appToDbMap[key] || this._toSnakeCase(key);
      const query = dbCol + '=eq.' + encodeURIComponent(val);

      this._request(dbTable, 'DELETE', null, query);
      this.clearCache(logicalKey);
      this.onDelete(logicalKey, val);
      return true;
    } catch (e) {
      Logger.log('DatabaseService.hardDelete error: ' + e.message);
      return false;
    }
  },

  softDelete: function (sheetName, key, val, deletedValue) {
    try {
      const logicalKey = this._getLogicalSheetKey(sheetName);
      const updateData = {};
      updateData[CONFIG.COLUMNS.DELETION_FLAG || 'Deletion Flag'] = (deletedValue !== undefined) ? deletedValue : true;
      return Boolean(this.updateRow(logicalKey, key, val, updateData));
    } catch (e) {
      return false;
    }
  },

  deleteRow: function (sheetName, key, val) {
    try {
      const logicalKey = this._getLogicalSheetKey(sheetName);
      if (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.DELETION_FLAG) {
        if (this.softDelete(logicalKey, key, val)) return true;
      }
      return this.hardDelete(logicalKey, key, val);
    } catch (e) {
      return false;
    }
  },

  validateRecord: function (sheetName, data) {
    // PostgREST/PostgreSQL schema definitions handle constraints.
    // Keeping local check for immediate feedback.
    const logicalKey = this._getLogicalSheetKey(sheetName);
    const required = CONFIG.REQUIRED_FIELDS[logicalKey] || [];
    required.forEach(function (f) { if (!data[f]) throw new Error('Missing field: ' + f); });
  },

  generateNextId: function (sheetName) {
    const logicalKey = this._getLogicalSheetKey(sheetName);
    const cfg = CONFIG.ID_FORMATS[logicalKey];
    const idCol = CONFIG.ID_COLUMNS[logicalKey];
    if (!cfg || !idCol) throw new Error('Missing ID format/column config for ' + logicalKey);

    const records = this.readAllRows(logicalKey);
    const ids = records.map(function (r) {
      const raw = r[idCol] || r.department_id || r.user_id || r.event_id || r.attendance_id || r.id;
      return (raw === undefined || raw === null || raw === '') ? NaN : parseInt(String(raw).replace(cfg.prefix, ''), 10);
    }).filter(function (n) { return !isNaN(n); });

    const maxId = Math.max.apply(null, [0].concat(ids));
    return cfg.prefix + String(maxId + 1).padStart(cfg.digits, '0');
  },

  onInsert: function (s, d) { Logger.log('Audit: Insert ' + s); },
  onUpdate: function (s, k, d) { Logger.log('Audit: Update ' + s); },
  onDelete: function (s, k) { Logger.log('Audit: Delete ' + s); },
  beginTransaction: function () { Logger.log('Transaction Started'); },
  getSheet: function (sheetName) {
    if (typeof SpreadsheetApp === 'undefined') return null;
    try {
      var logicalKey = this._getLogicalSheetKey(sheetName);
      var actualName = CONFIG.SHEETS[logicalKey] || sheetName;
      return SpreadsheetApp.openById(CONFIG.SPREADSHEET.ID).getSheetByName(actualName);
    } catch (e) {
      Logger.log('DatabaseService.getSheet error: ' + e.message);
      return null;
    }
  },
  commit: function () { Logger.log('Transaction Committed'); },
  rollback: function () { Logger.log('Transaction Rollback'); }
};