/**
 * AuditService.js
 *
 * Production-ready audit logging service.
 * - Writes audit logs into CONFIG.SHEETS.AUDITLOGS
 * - Provides read/search/filter/sort/pagination + statistics
 * - Uses soft delete via DatabaseService.deleteRow (soft-delete aware)
 *
 * NOTE:
 * - This service relies on header mappings from CONFIG.COLUMNS where present.
 * - If CONFIG mappings are missing, it falls back to reasonable header-name defaults.
 * - TODO comments indicate where schema alignment may be required.
 */
const AuditService = {

  // ==============================
  // Private helpers
  // ==============================

  _auditSheet: function() {
    if (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.AUDITLOGS) return CONFIG.SHEETS.AUDITLOGS;
    // TODO: Ensure CONFIG.SHEETS.AUDITLOGS is set to the correct sheet logical name.
    throw new Error('Missing CONFIG.SHEETS.AUDITLOGS');
  },

  _colKeys: function() {
    const c = (CONFIG && CONFIG.COLUMNS) ? CONFIG.COLUMNS : {};

    // Backward compatible: use CONFIG.COLUMNS.* keys when available.
    return {
      id: c.LOG_ID || (CONFIG && CONFIG.ID_COLUMNS && CONFIG.ID_COLUMNS.AUDITLOGS ? CONFIG.ID_COLUMNS.AUDITLOGS : 'Log ID'),
      userId: c.LOG_USER_ID || 'User ID',
      module: c.LOG_MODULE || 'Module',
      action: c.LOG_ACTION || 'Action',

      entityId: c.LOG_ENTITY_ID || 'Entity ID',
      entityType: c.LOG_ENTITY_TYPE || 'Entity Type',
      description: c.LOG_DESCRIPTION || 'Description',

      ip: c.LOG_IP || 'IP Address',
      userAgent: c.LOG_USER_AGENT || 'User Agent',

      timestamp: c.LOG_TIMESTAMP || 'Timestamp',
      status: c.LOG_STATUS || 'Status',
      remarks: c.LOG_REMARKS || 'Remarks',

      createdAt: c.CREATED_AT || 'Created At',
      updatedAt: c.UPDATED_AT || 'Updated At',
      deletionFlag: c.DELETION_FLAG || 'Deletion Flag',

      updatedBy: c.UPDATED_BY || 'Updated By',
      createdBy: c.CREATED_BY || 'Created By'
    };
  },

  _tryNormalizeIpAndAgent: function() {
    // Google Apps Script typically cannot access raw client IP/User-Agent reliably.
    // Provide TODO for future instrumentation.
    // Keep backward compatibility: return empty strings.
    try {
      return { ip: '', userAgent: '' };
    } catch (e) {
      return { ip: '', userAgent: '' };
    }
  },

  _sanitizeAction: function(action) {
    try {
      if (action === undefined || action === null) return '';
      return Utils.trimText ? Utils.trimText(String(action)) : String(action);
    } catch (e) {
      return '';
    }
  },

  _buildFiltersForList: function(records, filters) {
    const k = this._colKeys();
    const f = filters || {};

    let out = Array.isArray(records) ? records.slice() : [];

    if (f.userId) {
      out = out.filter(r => String(r[k.userId] || '') === String(f.userId));
    }
    if (f.module) {
      out = out.filter(r => String(r[k.module] || '') === String(f.module));
    }
    if (f.action) {
      out = out.filter(r => String(r[k.action] || '') === String(f.action));
    }
    if (f.entityId) {
      out = out.filter(r => String(r[k.entityId] || '') === String(f.entityId));
    }
    if (f.entityType) {
      out = out.filter(r => String(r[k.entityType] || '') === String(f.entityType));
    }
    if (f.status) {
      out = out.filter(r => String(r[k.status] || '') === String(f.status));
    }

    if (f.fromDate && f.toDate) {
      const from = new Date(f.fromDate).getTime();
      const to = new Date(f.toDate).getTime();
      out = out.filter(r => {
        const t = new Date(r[k.timestamp] || r[k.createdAt] || 0).getTime();
        return t >= from && t <= to;
      });
    }

    return out;
  },

  _isSoftDeleted: function(record) {
    try {
      const k = this._colKeys();
      const delKey = CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.DELETION_FLAG ? CONFIG.COLUMNS.DELETION_FLAG : k.deletionFlag;
      return Boolean(record && record[delKey]);
    } catch (e) {
      return false;
    }
  },

  _filterNotDeleted: function(records) {
    if (!Array.isArray(records)) return [];
    const out = [];
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (!this._isSoftDeleted(r)) out.push(r);
    }
    return out;
  },

  // ==============================
  // Public API
  // ==============================

  logAction: function(userId, moduleName, actionName, entityId, entityType, description, remarks, status, updatedBy) {
    try {
      const sheetName = this._auditSheet();
      const k = this._colKeys();

      // Generate ID using IdService
      let auditLogId = null;
      try {
        auditLogId = IdService.generateAuditLogId ? IdService.generateAuditLogId() : null;
      } catch (e1) {
        auditLogId = null;
      }
      if (!auditLogId) auditLogId = 'LOG-' + (new Date().getTime());

      const { ip, userAgent } = this._tryNormalizeIpAndAgent();

      const nowTs = Utils.getCurrentTimestamp ? Utils.getCurrentTimestamp() : new Date().getTime();
      const nowIso = new Date().toISOString();

      const record = {};
      record[k.id] = auditLogId;
      record[k.userId] = userId || '';
      record[k.module] = moduleName || '';
      record[k.action] = this._sanitizeAction(actionName || '');

      if (entityId !== undefined) record[k.entityId] = entityId || '';
      if (entityType !== undefined) record[k.entityType] = entityType || '';
      if (description !== undefined) record[k.description] = description || '';

      if (ip) record[k.ip] = ip;
      if (userAgent) record[k.userAgent] = userAgent;

      record[k.timestamp] = nowTs;
      if (status !== undefined) record[k.status] = status;
      if (remarks !== undefined) record[k.remarks] = remarks;

      // Audit lifecycle fields
      if (k.createdAt) record[k.createdAt] = nowIso;
      if (k.updatedAt) record[k.updatedAt] = nowIso;
      if (k.createdBy) record[k.createdBy] = updatedBy || userId || '';
      if (k.updatedBy) record[k.updatedBy] = updatedBy || userId || '';

      // Soft delete default
      if (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.DELETION_FLAG) {
        record[k.deletionFlag] = false;
      }

      const inserted = DatabaseService.insertRow(sheetName, record);
      return Utils.buildResponse(true, 'Audit log created', { auditLog: inserted || record });
    } catch (error) {
      Logger.log('AuditService.logAction error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, error && error.message ? error.message : 'Failed to log audit action');
    }
  },

  createAuditLog: function(payload) {
    // Backward compatible convenience wrapper around logAction.
    try {
      payload = payload || {};
      return this.logAction(
        payload.userId || payload.user_id,
        payload.module || payload.moduleName,
        payload.action || payload.actionName,
        payload.entityId || payload.entity_id,
        payload.entityType || payload.entity_type,
        payload.description,
        payload.remarks,
        payload.status,
        payload.updatedBy || payload.updated_by
      );
    } catch (error) {
      Logger.log('AuditService.createAuditLog error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, error && error.message ? error.message : 'Failed to create audit log');
    }
  },

  getAuditLogById: function(auditLogId) {
    try {
      if (!auditLogId) return null;
      const sheetName = this._auditSheet();
      const k = this._colKeys();

      const records = DatabaseService.findByColumn(sheetName, k.id, auditLogId, { caseSensitive: true, strict: true }) || [];
      if (!records || records.length === 0) return null;
      if (this._isSoftDeleted(records[0])) return null;
      return records[0];
    } catch (error) {
      Logger.log('AuditService.getAuditLogById error: ' + (error && error.message ? error.message : error));
      return null;
    }
  },

  getAuditLogs: function() {
    try {
      const sheetName = this._auditSheet();
      const records = DatabaseService.readAllRows(sheetName) || [];
      return this._filterNotDeleted(records);
    } catch (error) {
      Logger.log('AuditService.getAuditLogs error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  getAuditLogsByUser: function(userId) {
    try {
      if (!userId) return [];
      const all = this.getAuditLogs();
      const k = this._colKeys();
      return all.filter(r => String(r[k.userId] || '') === String(userId));
    } catch (error) {
      Logger.log('AuditService.getAuditLogsByUser error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  getAuditLogsByModule: function(moduleName) {
    try {
      if (!moduleName) return [];
      const all = this.getAuditLogs();
      const k = this._colKeys();
      return all.filter(r => String(r[k.module] || '') === String(moduleName));
    } catch (error) {
      Logger.log('AuditService.getAuditLogsByModule error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  getAuditLogsByAction: function(actionName) {
    try {
      if (!actionName) return [];
      const all = this.getAuditLogs();
      const k = this._colKeys();
      return all.filter(r => String(r[k.action] || '') === String(actionName));
    } catch (error) {
      Logger.log('AuditService.getAuditLogsByAction error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  getAuditLogsByDate: function(fromDate, toDate) {
    try {
      if (!fromDate || !toDate) return [];
      const all = this.getAuditLogs();
      const k = this._colKeys();
      const from = new Date(fromDate).getTime();
      const to = new Date(toDate).getTime();
      return all.filter(r => {
        const t = new Date(r[k.timestamp] || r[k.createdAt] || 0).getTime();
        return t >= from && t <= to;
      });
    } catch (error) {
      Logger.log('AuditService.getAuditLogsByDate error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  searchAuditLogs: function(userId, keyword) {
    try {
      keyword = keyword || '';
      if (!keyword) return userId ? this.getAuditLogsByUser(userId) : this.getAuditLogs();

      const records = userId ? this.getAuditLogsByUser(userId) : this.getAuditLogs();
      const k = this._colKeys();
      const kw = String(keyword).toLowerCase();

      return (records || []).filter(r => {
        const a = r && r[k.action] ? String(r[k.action]).toLowerCase() : '';
        const m = r && r[k.module] ? String(r[k.module]).toLowerCase() : '';
        const d = r && r[k.description] ? String(r[k.description]).toLowerCase() : '';
        return a.indexOf(kw) !== -1 || m.indexOf(kw) !== -1 || d.indexOf(kw) !== -1;
      });
    } catch (error) {
      Logger.log('AuditService.searchAuditLogs error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  filterAuditLogs: function(filters) {
    try {
      const records = this.getAuditLogs();
      return this._buildFiltersForList(records, filters);
    } catch (error) {
      Logger.log('AuditService.filterAuditLogs error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  sortAuditLogs: function(records, sortBy, order) {
    try {
      records = Array.isArray(records) ? records.slice() : [];
      if (!sortBy) return records;

      const dir = String(order || 'desc').toLowerCase() === 'asc' ? 1 : -1;
      const k = this._colKeys();

      var field = sortBy;
      if (sortBy === 'createdAt') field = k.createdAt;
      if (sortBy === 'updatedAt') field = k.updatedAt;
      if (sortBy === 'timestamp') field = k.timestamp;

      if (!field) return records;

      records.sort(function(a, b) {
        var va = a && a[field] !== undefined && a[field] !== null ? a[field] : '';
        var vb = b && b[field] !== undefined && b[field] !== null ? b[field] : '';
        if (va === vb) return 0;
        return va > vb ? dir : -dir;
      });

      return records;
    } catch (error) {
      Logger.log('AuditService.sortAuditLogs error: ' + (error && error.message ? error.message : error));
      return Array.isArray(records) ? records : [];
    }
  },

  paginateAuditLogs: function(records, page, pageSize) {
    try {
      records = Array.isArray(records) ? records : [];
      const meta = (function() {
        var p = Number(page) || 1;
        var s = Number(pageSize) || 10;
        if (p < 1) p = 1;
        if (s < 1) s = 10;
        return { page: p, pageSize: s, offset: (p - 1) * s, limit: s };
      })();

      return {
        totalRecords: records.length,
        currentPage: meta.page,
        totalPages: Math.ceil(records.length / meta.pageSize) || 0,
        items: records.slice(meta.offset, meta.offset + meta.limit)
      };
    } catch (error) {
      Logger.log('AuditService.paginateAuditLogs error: ' + (error && error.message ? error.message : error));
      return { totalRecords: 0, currentPage: 1, totalPages: 0, items: [] };
    }
  },

  deleteAuditLog: function(auditLogId, updatedBy) {
    // Soft delete using DatabaseService.deleteRow.
    try {
      if (!auditLogId) return Utils.buildResponse(false, 'Audit log ID is required.');
      const sheetName = this._auditSheet();
      const k = this._colKeys();

      const ok = DatabaseService.deleteRow(sheetName, k.id, auditLogId);
      return Utils.buildResponse(Boolean(ok), ok ? 'Audit log deleted' : 'Audit log delete failed');
    } catch (error) {
      Logger.log('AuditService.deleteAuditLog error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, error && error.message ? error.message : 'Failed to delete audit log');
    }
  },

  getAuditStatistics: function() {
    try {
      const all = this.getAuditLogs();
      const stats = {
        total: all.length,
        byModule: {},
        byAction: {}
      };

      (all || []).forEach(r => {
        const k = this._colKeys();
        const mod = r[k.module] || '';
        const act = r[k.action] || '';
        if (!stats.byModule[mod]) stats.byModule[mod] = 0;
        if (!stats.byAction[act]) stats.byAction[act] = 0;
        stats.byModule[mod]++;
        stats.byAction[act]++;
      });

      return Utils.buildResponse(true, 'Audit statistics generated', { stats: stats });
    } catch (error) {
      Logger.log('AuditService.getAuditStatistics error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, error && error.message ? error.message : 'Failed to generate audit statistics');
    }
  }

};


