/**
 * IntegrationAssertions.js
 * Reusable assertions for BVC System Integration Testing.
 * Throws errors with descriptive messages upon assertion failure to trigger STOP-ON-FAIL.
 */
const IntegrationAssertions = {

  assertSuccess: function(response, msg) {
    if (!response || response.success !== true) {
      throw new Error((msg || 'Expected success response') + ': ' + (response ? response.message : 'No response'));
    }
  },

  assertFailure: function(response, msg) {
    if (response && response.success === true) {
      throw new Error((msg || 'Expected failure response') + ' but succeeded.');
    }
  },

  assertEqual: function(val1, val2, msg) {
    if (String(val1) !== String(val2)) {
      throw new Error((msg || 'Equality assertion failed') + ': Expected "' + val2 + '" but got "' + val1 + '"');
    }
  },

  assertNotNull: function(val, msg) {
    if (val === undefined || val === null || val === '') {
      throw new Error(msg || 'Value is null, undefined, or empty.');
    }
  },

  assertRecordExists: function(sheetName, key, val, msg) {
    const records = DatabaseService.findByColumn(sheetName, key, val) || [];
    if (records.length === 0) {
      throw new Error((msg || 'Record existence assertion failed') + ' in sheet: ' + sheetName + ' for ' + key + '=' + val);
    }
    return records[0];
  },

  assertRecordDeleted: function(sheetName, key, val, msg) {
    const records = DatabaseService.findByColumn(sheetName, key, val) || [];
    if (records.length > 0) {
      throw new Error((msg || 'Record deletion assertion failed') + ': Record still exists in ' + sheetName + ' for ' + key + '=' + val);
    }
  },

  assertAuditCreated: function(action, entityId, msg) {
    const records = DatabaseService.readAllRows(CONFIG.SHEETS.AUDITLOGS) || [];
    const audit = records.find(r => 
      String(r['Action'] || r.action).toUpperCase() === String(action).toUpperCase() &&
      String(r['Entity ID'] || r.entityId || r.recordId) === String(entityId)
    );
    if (!audit) {
      throw new Error((msg || 'Audit log creation assertion failed') + ' for action: ' + action + ' and Entity ID: ' + entityId);
    }
    return audit;
  },

  assertNotificationCreated: function(userId, title, msg) {
    const records = DatabaseService.readAllRows(CONFIG.SHEETS.NOTIFICATIONS) || [];
    const notification = records.find(r =>
      String(r['User ID'] || r.userId) === String(userId) &&
      String(r['Title'] || r.title).indexOf(title) !== -1
    );
    if (!notification) {
      throw new Error((msg || 'Notification creation assertion failed') + ' for User: ' + userId + ', Title: ' + title);
    }
    return notification;
  },

  assertAttendanceCreated: function(rollNumber, eventId, msg) {
    const records = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
    const record = records.find(r =>
      String(r['Roll Number'] || r.rollNumber || r.roll_number) === String(rollNumber) &&
      String(r['Event ID'] || r.eventId || r.event_id) === String(eventId)
    );
    if (!record) {
      throw new Error((msg || 'Attendance record assertion failed') + ' for Roll: ' + rollNumber + ', Event: ' + eventId);
    }
    return record;
  },

  assertParticipantCreated: function(rollNumber, eventId, msg) {
    const records = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];
    const record = records.find(r =>
      String(r['Roll Number'] || r.rollNumber || r.roll_number) === String(rollNumber) &&
      String(r['Event ID'] || r.eventId || r.event_id) === String(eventId)
    );
    if (!record) {
      throw new Error((msg || 'Participant record assertion failed') + ' for Roll: ' + rollNumber + ', Event: ' + eventId);
    }
    return record;
  },

  assertCoordinatorAssigned: function(userId, eventId, msg) {
    const records = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
    const record = records.find(r =>
      String(r['User ID'] || r.userId) === String(userId) &&
      String(r['Event ID'] || r.eventId) === String(eventId) &&
      (r['Assignment Status'] || r.status) === 'Active'
    );
    if (!record) {
      throw new Error((msg || 'Coordinator assignment assertion failed') + ' for User: ' + userId + ', Event: ' + eventId);
    }
    return record;
  },

  assertReportGenerated: function(reportId, msg) {
    const record = DatabaseService.readAllRows(CONFIG.SHEETS.GENERATED_REPORTS).find(r => r['Report ID'] === reportId);
    if (!record) {
      throw new Error((msg || 'Generated report assertion failed') + ' for Report ID: ' + reportId);
    }
    return record;
  },

  assertSessionCreated: function(userId, token, msg) {
    const records = DatabaseService.readAllRows(CONFIG.SHEETS.SESSIONS) || [];
    const record = records.find(r =>
      String(r['User ID'] || r.userId) === String(userId) &&
      String(r['Session Token'] || r.sessionToken || r.token) === String(token)
    );
    if (!record) {
      throw new Error((msg || 'Session creation assertion failed') + ' for User: ' + userId);
    }
    return record;
  },

  assertSessionDestroyed: function(token, msg) {
    const records = DatabaseService.readAllRows(CONFIG.SHEETS.SESSIONS) || [];
    const record = records.find(r => String(r['Session Token'] || r.sessionToken || r.token) === String(token));
    if (record) {
      throw new Error((msg || 'Session destruction assertion failed') + ': Session with token ' + token + ' still active.');
    }
  },

  assertDatabaseConsistent: function(msg) {
    // Top-level integrity checks
    this.assertForeignKeyIntegrity(msg);
    this.assertNoDuplicateRecords(msg);
  },

  assertForeignKeyIntegrity: function(msg) {
    // 1. Participant -> Student
    const students = new Set((DatabaseService.readAllRows(CONFIG.SHEETS.STUDENTS) || []).map(s => String(s['Roll Number'] || s.roll_number)));
    const participants = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];
    participants.forEach(p => {
      const roll = String(p['Roll Number'] || p.roll_number);
      if (!students.has(roll)) {
        throw new Error((msg || 'Foreign key integrity failed') + ': Participant roll ' + roll + ' has no matching student.');
      }
    });

    // 2. Attendance -> Student
    const attendance = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
    attendance.forEach(a => {
      const roll = String(a['Roll Number'] || a.roll_number);
      if (!students.has(roll)) {
        throw new Error((msg || 'Foreign key integrity failed') + ': Attendance roll ' + roll + ' has no matching student.');
      }
    });
  },

  assertNoDuplicateRecords: function(msg) {
    const sheets = [
      { name: CONFIG.SHEETS.USERS, key: 'User ID' },
      { name: CONFIG.SHEETS.STUDENTS, key: 'Roll Number' },
      { name: CONFIG.SHEETS.EVENTS, key: 'Event ID' }
    ];
    sheets.forEach(s => {
      const ids = new Set();
      const all = DatabaseService.readAllRows(s.name) || [];
      all.forEach(row => {
        const id = String(row[s.key] || row[s.key.toLowerCase()] || row[s.key.replace(' ', '')]);
        if (id) {
          if (ids.has(id)) {
            throw new Error((msg || 'Duplicate ID constraint violated') + ' in sheet ' + s.name + ' for key ' + id);
          }
          ids.add(id);
        }
      });
    });
  },

  assertSoftDelete: function(sheetName, key, val, flagKey, msg) {
    const records = DatabaseService.findByColumn(sheetName, key, val) || [];
    if (records.length === 0) {
      throw new Error((msg || 'Soft delete assertion failed') + ': Record does not exist.');
    }
    const isDeleted = records[0][flagKey] === true || String(records[0][flagKey]).toLowerCase() === 'true' || String(records[0][flagKey]).toLowerCase() === 'removed' || String(records[0][flagKey]).toLowerCase() === 'inactive';
    if (!isDeleted) {
      throw new Error((msg || 'Soft delete assertion failed') + ': Deletion flag is not set.');
    }
  },

  assertTimestamp: function(timestampStr, msg) {
    if (isNaN(Date.parse(timestampStr))) {
      throw new Error((msg || 'Timestamp assertion failed') + ': Invalid ISO date format: ' + timestampStr);
    }
  }

};
