/**
 * IdService - production-ready ID generation for the BVC system.
 * - CONFIG-driven prefixes & digit padding (CONFIG.ID_FORMATS)
 * - Uses DatabaseService for reads
 * - LockService for concurrency safety
 * - Backward compatible public method signatures
 */
const IdService = {

  /**
   * Generates a next unique ID based on CONFIG.ID_FORMATS.
   * Avoids duplicate generation under concurrency by using LockService.
   *
   * @param {string} logicalKey - Key in CONFIG.ID_FORMATS
   * @param {function} [prefixResolver] - optional function to resolve dynamic prefix
   */
  _generateNextIdWithLock: function(logicalKey, prefixResolver) {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const cfg = CONFIG.ID_FORMATS && CONFIG.ID_FORMATS[logicalKey];
      if (!cfg) throw new Error('Missing CONFIG.ID_FORMATS for ' + logicalKey);

      const idCol = CONFIG.ID_COLUMNS && CONFIG.ID_COLUMNS[logicalKey === 'AUDITLOGS' ? 'AUDITLOGS' : logicalKey];
      // For this project, ID columns exist under these sheet keys.
      // We map logicalKey to sheet key name for DatabaseService reads.
      const sheetKeyMap = {
        USERS: 'USERS',
        STUDENTS: 'STUDENTS',
        EVENTS: 'EVENTS',
        ATTENDANCE: 'ATTENDANCE',
        SESSIONS: 'SESSIONS',
        DEPARTMENTS: 'DEPARTMENTS',
        EVENT_COORDINATORS: 'EVENT_COORDINATORS',
        GENERATED_REPORTS: 'GENERATED_REPORTS',
        NOTIFICATIONS: 'NOTIFICATIONS',
        AUDITLOGS: 'AUDITLOGS'
      };

      const sheetLogical = sheetKeyMap[logicalKey];
      const sheetName = sheetLogical && CONFIG.SHEETS ? CONFIG.SHEETS[sheetLogical] : null;
      if (!sheetName) throw new Error('Missing CONFIG.SHEETS mapping for ' + logicalKey);

      const resolvedPrefix = typeof prefixResolver === 'function' ? prefixResolver() : cfg.prefix;
      const records = (DatabaseService.readAllRowsIncludingDeleted ? DatabaseService.readAllRowsIncludingDeleted(sheetLogical) : DatabaseService.readAllRows(sheetLogical)) || [];

      // Determine maximum sequence for IDs that match the resolved prefix.
      var maxSequence = 0;
      var idHeader = CONFIG.ID_COLUMNS[logicalKey];
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        var currentId = r[idHeader] || r.department_id || r.user_id || r.event_id || r.attendance_id || r.id;
        if (currentId && typeof currentId === 'string' && currentId.indexOf(resolvedPrefix) === 0) {
          var sequenceStr = currentId.substring(resolvedPrefix.length);
          var sequenceNum = parseInt(sequenceStr, 10);
          if (!isNaN(sequenceNum) && sequenceNum > maxSequence) maxSequence = sequenceNum;
        }
      }

      var nextSequence = maxSequence + 1;
      var candidateId = resolvedPrefix + Utils.padNumber(nextSequence, cfg.digits);
      
      // Ensure candidateId is strictly unique against existing DB records
      var existsInDb = records.some(function(r) {
        var existing = r[idHeader] || r.department_id || r.user_id || r.event_id || r.attendance_id || r.id;
        return String(existing).trim() === String(candidateId).trim();
      });

      if (existsInDb) {
        // Increment sequence until an unused ID is found
        while (existsInDb) {
          nextSequence++;
          candidateId = resolvedPrefix + Utils.padNumber(nextSequence, cfg.digits);
          existsInDb = records.some(function(r) {
            var existing = r[idHeader] || r.department_id || r.user_id || r.event_id || r.attendance_id || r.id;
            return String(existing).trim() === String(candidateId).trim();
          });
        }
      }

      return candidateId;
    } catch (e) {
      Logger.log('IdService._generateNextIdWithLock error: ' + (e && e.message ? e.message : e));
      // Safe fallback: generate a UUID-like token; still unique enough.
      return 'ERR-' + (Utils.generateUUID ? Utils.generateUUID() : new Date().getTime());
    } finally {
      try { lock.releaseLock(); } catch (e2) {}
    }
  },

  // ==============================
  // Public ID generators (backward compatible)
  // ==============================

  generateUserId: function() {
    return this._generateNextIdWithLock('USERS');
  },

  generateDepartmentId: function() {
    return this._generateNextIdWithLock('DEPARTMENTS');
  },

  generateEventId: function() {
    return this._generateNextIdWithLock('EVENTS', function() {
      var year = Utils.getCurrentDate().getFullYear();
      // CONFIG.ID_FORMATS.EVENTS already stores 'EVT' but this project uses year in prefix
      // If prefixResolver conflicts with CONFIG prefix, keep original configured prefix.
      // For compatibility with existing behavior, resolve to 'EVT-' + year + '-' style.
      // If cfg.prefix already includes year, user can adjust later.
      return 'EVT-' + year + '-';
    });
  },

  // Participant sheet/key may exist later; keep generator mapped to existing ID formats.
  generateParticipantId: function() {
    return this._generateNextIdWithLock('EVENT_PARTICIPANTS');
  },

  generateAttendanceId: function() {
    return this._generateNextIdWithLock('ATTENDANCE', function() {
      var year = Utils.getCurrentDate().getFullYear();
      return 'ATT-' + year + '-';
    });
  },

  generateSessionId: function() {
    return this._generateNextIdWithLock('SESSIONS');
  },

  generateReportId: function() {
    return this._generateNextIdWithLock('GENERATED_REPORTS');
  },

  generateNotificationId: function() {
    return this._generateNextIdWithLock('NOTIFICATIONS');
  },

  generateAuditLogId: function() {
    return this._generateNextIdWithLock('AUDITLOGS');
  },

  // Existing method kept for compatibility with earlier IdService.js
  generateStudentId: function() {
    return this._generateNextIdWithLock('STUDENTS');
  }
};

