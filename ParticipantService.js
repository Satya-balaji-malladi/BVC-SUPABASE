/**
 * ParticipantService
 * Handles all logic for Participant Management (Sprint 1)
 *
 * NOTE (production refactor): This service previously used DatabaseService.read/writeAll and relied on
 * non-existent APIs in the current DatabaseService implementation. It now uses only DatabaseService
 * methods that exist in this repository: readAllRows, findByColumn, insertRow, updateRow.
 */
const ParticipantService = {

  // Fetch all participants for a specific event
  getEventParticipants: function(eventId, userId) {
    const startTime = Date.now();
    Logger.log('[START] ParticipantService.getEventParticipants | Event ID: ' + eventId + ', User ID: ' + userId);
    
    try {
      // 1. Centralized Authorization via CoordinatorService
      Logger.log('[START] Authorization');
      const user = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_ID || 'User ID', userId)[0];
      if (!user) {
        Logger.log('[END] ParticipantService.getEventParticipants | User not found');
        return Utils.buildResponse(false, 'Unauthorized: User not found.');
      }

      const role = user[CONFIG.COLUMNS.ROLE || 'Role'] || user.role || user.Role;
      if (role === CONFIG.ROLES.COORDINATOR) {
        const isAuthorized = CoordinatorService.canManageEvent(userId, eventId);
        if (!isAuthorized) {
          Logger.log('[END] ParticipantService.getEventParticipants | Coordinator Unauthorized');
          return Utils.buildResponse(false, 'Unauthorized: You can only manage participants for your assigned events.');
        }
      }
      Logger.log('[END] Authorization');

      // 2. Fetch participants from registrations
      Logger.log('[START] Participant Lookup');
      const participants = DatabaseService.findByColumn(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Event ID', eventId) || [];
      
      // Fetch actual attendees from Attendance sheet
      const attendance = DatabaseService.findByColumn(CONFIG.SHEETS.ATTENDANCE, 'Event ID', eventId) || [];
      
      // Merge attendees into participants list if they are not already there
      const participantRolls = new Set(participants.map(p => String(p['Roll Number'] || p.roll_number || p.rollNumber).trim().toUpperCase()));
      
      attendance.forEach(att => {
        const roll = String(att['Roll Number'] || att.roll_number).trim().toUpperCase();
        if (roll && !participantRolls.has(roll)) {
          participants.push({
            'Event ID': eventId,
            'Roll Number': roll,
            'Registration Status': 'Confirmed',
            'status': 'Active',
            'Joined At': att.Timestamp || att.Date || ''
          });
          participantRolls.add(roll);
        }
      });
      
      // 3. Join with Students and Attendance data
      const allStudents = DatabaseService.readAllRows(CONFIG.SHEETS.STUDENTS) || [];
      
      const attendedRolls = new Set(
        attendance
          .filter(a => !a['Deletion Flag'])
          .map(a => String(a['Roll Number'] || a.roll_number || a.rollNumber).trim().toUpperCase())
      );

      const enriched = participants.map(p => {
        const roll = String(p['Roll Number'] || p.roll_number || p.rollNumber).trim().toUpperCase();
        const student = allStudents.find(s => String(s['Roll Number']).trim().toUpperCase() === roll) || {};
        const attendanceStatus = attendedRolls.has(roll) ? 'Present' : (p['Attendance Status'] || p.attendance_status || 'Absent');
        
        return {
          ...p,
          student_name: student['Student Name'] || 'Unknown',
          department: student['Department ID'] || 'Unknown',
          branch: student['Branch'] || student['Department ID'] || 'Unknown',
          year: student['Year'] || 'Unknown',
          section: student['Section'] || 'Unknown',
          'Attendance Status': attendanceStatus,
          attendance_status: attendanceStatus
        };
      });
      Logger.log('[END] Participant Lookup');
      
      Logger.log('[END] ParticipantService.getEventParticipants | Execution Time: ' + (Date.now() - startTime) + 'ms');
      return Utils.buildResponse(true, 'Participants retrieved successfully.', enriched);
    } catch (error) {
      Logger.log('[ERROR] ParticipantService.getEventParticipants: ' + error.message);
      return Utils.buildResponse(false, 'Failed to retrieve event participants.');
    }
  },

  // Check if a student is eligible for an event
  checkEligibility: function(eventId, rollNumber, userId) {
    const startTime = Date.now();
    Logger.log('[START] ParticipantService.checkEligibility | Roll: ' + rollNumber);

    try {
      const studentRecords = DatabaseService.findByColumn(CONFIG.SHEETS.STUDENTS, 'Roll Number', rollNumber);
      if (studentRecords.length === 0) {
        return { eligible: false, reason: `Student Not Found: Roll Number ${rollNumber} does not exist.` };
      }
      const student = studentRecords[0];

      const eventRecords = DatabaseService.findByColumn(CONFIG.SHEETS.EVENTS, 'Event ID', eventId);
      if (eventRecords.length === 0) {
        return { eligible: false, reason: 'Event Not Found.' };
      }
      const event = eventRecords[0];

      // Check if already an active participant
      const partsAll = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];
      const existing = partsAll.filter(p => p['Event ID'] === eventId && p['Roll Number'] === rollNumber);
      
      const activeStatus = 'Confirmed';
      if (existing.length > 0 && existing[0]['Registration Status'] === activeStatus) {
        return { eligible: false, reason: 'Already Added: This student is already an active participant.' };
      }

      // Check Department Mismatch
      if (event['Departments']) {
        const allowedDepts = event['Departments'].split(',').map(d => d.trim());
        if (allowedDepts.length > 0 && !allowedDepts.includes(student['Department ID'])) {
          return { eligible: false, reason: `Department mismatch: Allowed Departments: ${allowedDepts.join(', ')} | Student Department: ${student['Department ID']}` };
        }
      }

      // Check Year Mismatch
      if (event['Years']) {
        const allowedYears = event['Years'].split(',').map(y => y.trim());
        if (allowedYears.length > 0 && !allowedYears.includes(String(student['Year']))) {
          return { eligible: false, reason: `Year mismatch: Allowed Years: ${allowedYears.join(', ')} | Student Year: ${student['Year']}` };
        }
      }

      Logger.log('[END] ParticipantService.checkEligibility | Execution Time: ' + (Date.now() - startTime) + 'ms');
      return { eligible: true, reason: 'Eligible' };
    } catch (error) {
      Logger.log('[ERROR] ParticipantService.checkEligibility: ' + error.message);
      return { eligible: false, reason: 'Eligibility calculation crash.' };
    }
  },

  // Private helper: composite key fields used for best-effort updates/search.
  _participantKeyFields: function() {
    return { eventIdField: 'Event ID', rollNumberField: 'Roll Number' };
  },

  addParticipant: function(eventId, rollNumber, userId) {
    const startTime = Date.now();
    Logger.log('[START] ParticipantService.addParticipant | Event ID: ' + eventId + ', Roll: ' + rollNumber);

    try {
      // 1. Centralized Authorization via CoordinatorService
      Logger.log('[START] Authorization');
      const user = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_ID || 'User ID', userId)[0];
      if (!user) {
        return Utils.buildResponse(false, 'Unauthorized: User not found.');
      }
      const role = user[CONFIG.COLUMNS.ROLE || 'Role'] || user.role || user.Role;
      if (role === CONFIG.ROLES.COORDINATOR) {
        const isAuthorized = CoordinatorService.canManageEvent(userId, eventId);
        if (!isAuthorized) {
          return Utils.buildResponse(false, 'Unauthorized: You can only manage participants for your assigned events.');
        }
      }
      Logger.log('[END] Authorization');

      // 2. Eligibility, Duplicate Check & Save (Lock protected critical transaction)
      Logger.log('[START] Eligibility, Duplicate check and Registration Lock');
      if (typeof LockManager !== 'undefined') {
        return LockManager.withLock('Script', 15000, () => {
          // Eligibility Checking
          Logger.log('[START] Eligibility');
          const eligibility = this.checkEligibility(eventId, rollNumber, userId);
          if (!eligibility.eligible) {
            return Utils.buildResponse(false, eligibility.reason);
          }
          Logger.log('[END] Eligibility');

          // Duplicate and Restoration Logic
          Logger.log('[START] Participant Lookup');
          const keyFields = this._participantKeyFields();
          const partsAll = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];
          const existing = partsAll.filter(p => p[keyFields.eventIdField] === eventId && p[keyFields.rollNumberField] === rollNumber);
          Logger.log('[END] Participant Lookup');

          const activeStatus = 'Confirmed';

          if (existing.length > 0) {
            Logger.log('[START] Update');
            const updates = {
              'Registration Status': activeStatus,
              'Registration Timestamp': new Date().toISOString(),
              'Created By': userId,
              'Updated At': new Date().toISOString()
            };

            DatabaseService.updateRow(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Roll Number', rollNumber, updates);
            Logger.log('[END] Update');

            try {
              NotificationService.createNotification({
                user_id: userId,
                title: 'Participant Added',
                message: 'Participant (Roll ' + rollNumber + ') added/restored to event ' + eventId + '.',
                type: 'Participant',
                related_event_id: eventId
              });
            } catch (error) {
              Logger.log(error);
            }
            try {
              AuditService.logAction(userId, 'ParticipantService', 'ADD_PARTICIPANT', eventId, 'Participant', 'Participant restored/added', '', 'SUCCESS', rollNumber);
            } catch (error) {
              Logger.log(error);
            }

            Logger.log('[END] ParticipantService.addParticipant | Execution Time: ' + (Date.now() - startTime) + 'ms');
            return Utils.buildResponse(true, 'Participant restored successfully.');
          } else {
            Logger.log('[START] Insert');
            const newParticipant = {
              'Event ID': eventId,
              'Roll Number': rollNumber,
              'Registration Timestamp': new Date().toISOString(),
              'Created By': userId,
              'Registration Status': activeStatus,
              'Registration Type': 'Pre-Registered',
              'Attendance Status': 'Absent',
              'Approval Status': 'Approved',
              'Created At': new Date().toISOString(),
              'Updated At': new Date().toISOString(),
              'Deletion Flag': false
            };
            DatabaseService.insertRow(CONFIG.SHEETS.EVENT_PARTICIPANTS, newParticipant);
            Logger.log('[END] Insert');

            try {
              AuditService.logAction(userId, 'ParticipantService', 'ADD_PARTICIPANT', eventId, 'Participant', 'Participant added', '', 'SUCCESS', rollNumber);
            } catch (error) {
              Logger.log(error);
            }

            Logger.log('[END] ParticipantService.addParticipant | Execution Time: ' + (Date.now() - startTime) + 'ms');
            return Utils.buildResponse(true, 'Participant added successfully.');
          }
        });
      }

      return Utils.buildResponse(false, 'LockManager not available.');
    } catch (error) {
      Logger.log('[ERROR] ParticipantService.addParticipant: ' + error.message);
      return Utils.buildResponse(false, 'Failed to add participant.');
    }
  },

  removeParticipant: function(eventId, rollNumber, userId) {
    const startTime = Date.now();
    Logger.log('[START] ParticipantService.removeParticipant | Event ID: ' + eventId + ', Roll: ' + rollNumber);

    try {
      // 1. Centralized Authorization via CoordinatorService
      Logger.log('[START] Authorization');
      const user = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_ID || 'User ID', userId)[0];
      if (!user) {
        return Utils.buildResponse(false, 'Unauthorized: User not found.');
      }
      const role = user[CONFIG.COLUMNS.ROLE || 'Role'] || user.role || user.Role;
      if (role === CONFIG.ROLES.COORDINATOR) {
        const isAuthorized = CoordinatorService.canManageEvent(userId, eventId);
        if (!isAuthorized) {
          return Utils.buildResponse(false, 'Unauthorized: You can only manage participants for your assigned events.');
        }
      }
      Logger.log('[END] Authorization');

      // 2. Lookup existing row
      Logger.log('[START] Participant Lookup');
      const keyFields = this._participantKeyFields();
      const allParts = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];
      const idx = allParts.findIndex(p => p[keyFields.eventIdField] === eventId && p[keyFields.rollNumberField] === rollNumber);
      if (idx === -1) {
        return Utils.buildResponse(false, 'Participant not found.');
      }
      Logger.log('[END] Participant Lookup');

      // 3. Perform cancellation update
      Logger.log('[START] Update');
      const removedStatus = 'Cancelled';
      var removedRec = allParts[idx];

      DatabaseService.updateRow(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Roll Number', removedRec['Roll Number'], { 
        'Registration Status': removedStatus, 
        'Updated At': new Date().toISOString() 
      });
      Logger.log('[END] Update');

      try {
        NotificationService.createNotification({
          user_id: userId,
          title: 'Participant Removed',
          message: 'Participant (Roll ' + rollNumber + ') removed from event ' + eventId + '.',
          type: 'Participant',
          related_event_id: eventId
        });
      } catch (error) {
        Logger.log(error);
      }
      try {
        AuditService.logAction(userId, 'ParticipantService', 'REMOVE_PARTICIPANT', eventId, 'Participant', 'Participant removed', '', 'SUCCESS', rollNumber);
      } catch (error) {
        Logger.log(error);
      }

      Logger.log('[END] ParticipantService.removeParticipant | Execution Time: ' + (Date.now() - startTime) + 'ms');
      return Utils.buildResponse(true, 'Participant removed successfully.');
    } catch (error) {
      Logger.log('[ERROR] ParticipantService.removeParticipant: ' + error.message);
      return Utils.buildResponse(false, 'Failed to remove participant.');
    }
  },

  restoreParticipant: function(eventId, rollNumber, userId) {
    // Shared validation wrapper around addParticipant
    return this.addParticipant(eventId, rollNumber, userId);
  },

  getAllEnrichedParticipants: function(userId) {
    const startTime = Date.now();
    Logger.log('[START] ParticipantService.getAllEnrichedParticipants | User: ' + userId);

    try {
      // 1. Centralized Authorization Check
      Logger.log('[START] Authorization');
      const allUsers = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
      const trueUser = allUsers.find(u => String(u[CONFIG.COLUMNS.USER_ID || 'User ID']) === String(userId));
      if (!trueUser) {
        return Utils.buildResponse(false, 'Unauthorized: User not found.');
      }
      Logger.log('[END] Authorization');

      // 2. Query structural lists
      Logger.log('[START] Participant Lookup');
      let participants = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];
      
      if (CONFIG.COLUMNS.DELETION_FLAG) {
        participants = participants.filter(p => p[CONFIG.COLUMNS.DELETION_FLAG] !== true && p[CONFIG.COLUMNS.DELETION_FLAG] !== 'true');
      }
      
      participants = participants.filter(p => p['Registration Status'] !== 'Cancelled');
      
      // Filter out non-assigned events for Coordinators using centralized CoordinatorService mapping
      const role = trueUser[CONFIG.COLUMNS.ROLE || 'Role'] || trueUser.role || trueUser.Role;
      if (role === CONFIG.ROLES.COORDINATOR) {
        const myEventIds = CoordinatorService.getAssignedEventIds(userId) || [];
        participants = participants.filter(p => myEventIds.includes(p['Event ID']));
      }

      const allStudents = DatabaseService.readAllRows(CONFIG.SHEETS.STUDENTS) || [];
      const allEvents = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];

      const enriched = participants.map(p => {
        const student = allStudents.find(s => s['Roll Number'] === p['Roll Number']) || {};
        const event = allEvents.find(e => e['Event ID'] === p['Event ID']) || {};
        return {
          ...p,
          student_name: student['Student Name'] || 'Unknown',
          department: student['Department ID'] || 'Unknown',
          year: student['Year'] || 'Unknown',
          section: student['Section'] || 'Unknown',
          event_name: event['Event Name'] || 'Unknown',
          event_date: event['Start Date'] || 'Unknown'
        };
      });
      Logger.log('[END] Participant Lookup');

      Logger.log('[END] ParticipantService.getAllEnrichedParticipants | Execution Time: ' + (Date.now() - startTime) + 'ms');
      return Utils.buildResponse(true, 'Enriched participants data evaluated.', enriched);
    } catch (error) {
      Logger.log('[ERROR] ParticipantService.getAllEnrichedParticipants: ' + error.message);
      return Utils.buildResponse(false, 'Failed to map structural participant arrays.');
    }
  },

  bulkAddParticipants: function(eventId, rollNumbers, userId) {
    const startTime = Date.now();
    Logger.log('[START] ParticipantService.bulkAddParticipants | Event: ' + eventId);

    try {
      // Early intercept optimization: single authorization query across batch
      Logger.log('[START] Authorization');
      const isAuthorized = CoordinatorService.canManageEvent(userId, eventId);
      Logger.log('[END] Authorization | Result: ' + isAuthorized);

      if (!isAuthorized) {
        return Utils.buildResponse(false, 'Unauthorized access.');
      }

      const results = { success: [], errors: [] };
      for (let i = 0; i < rollNumbers.length; i++) {
        const roll = rollNumbers[i];
        try {
          // addParticipant will reuse authorization calculations cleanly
          const res = this.addParticipant(eventId, roll, userId);
          if (res.success) {
            results.success.push(roll);
          } else {
            results.errors.push({ roll: roll, error: res.message || 'Unknown error' });
          }
        } catch (err) {
          results.errors.push({ roll: roll, error: err.message });
        }
      }

      Logger.log('[END] ParticipantService.bulkAddParticipants | Execution Time: ' + (Date.now() - startTime) + 'ms');
      return Utils.buildResponse(true, 'Bulk execution operation processed.', results);
    } catch (error) {
      Logger.log('[ERROR] ParticipantService.bulkAddParticipants: ' + error.message);
      return Utils.buildResponse(false, 'Bulk operation crashed.');
    }
  },

  bulkRemoveParticipants: function(eventId, rollNumbers, userId) {
    const startTime = Date.now();
    Logger.log('[START] ParticipantService.bulkRemoveParticipants | Event: ' + eventId);

    try {
      // Early intercept optimization: single authorization query across batch
      Logger.log('[START] Authorization');
      const isAuthorized = CoordinatorService.canManageEvent(userId, eventId);
      Logger.log('[END] Authorization | Result: ' + isAuthorized);

      if (!isAuthorized) {
        return Utils.buildResponse(false, 'Unauthorized access.');
      }

      const results = { success: [], errors: [] };
      for (let i = 0; i < rollNumbers.length; i++) {
        const roll = rollNumbers[i];
        try {
          const res = this.removeParticipant(eventId, roll, userId);
          if (res.success) {
            results.success.push(roll);
          } else {
            results.errors.push({ roll: roll, error: res.message || 'Unknown error' });
          }
        } catch (err) {
          results.errors.push({ roll: roll, error: err.message });
        }
      }

      Logger.log('[END] ParticipantService.bulkRemoveParticipants | Execution Time: ' + (Date.now() - startTime) + 'ms');
      return Utils.buildResponse(true, 'Bulk dynamic removals operation finalized.', results);
    } catch (error) {
      Logger.log('[ERROR] ParticipantService.bulkRemoveParticipants: ' + error.message);
      return Utils.buildResponse(false, 'Bulk remove process hit structural error.');
    }
  }
};