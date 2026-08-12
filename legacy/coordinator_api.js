/**
 * Coordinator Terminal API Endpoint Routing Layer
 * Maps frontend CoordinatorAPI network promises to the backend service layers.
 */

/**
 * 1. Loads all context for the active terminal session (User, Event, Stats, Logs)
 * @returns {Object} Standardized response package
 */
function loadCoordinatorTerminalContext() {
  try {
    const sessionRes = validateActiveTerminalSession();
    if (!sessionRes.success) return sessionRes;

    const userId = sessionRes.data.user['User ID'] || sessionRes.data.user.userId;
    const eventId = sessionRes.data.event['Event ID'] || sessionRes.data.event.eventId;

    // Fetch stats and stream logs concurrently
    const stats = getTerminalLiveStatistics();
    const recentScans = getTerminalRecentScansStream();

    return Utils.buildResponse(true, 'Terminal context loaded successfully.', {
      user: sessionRes.data.user,
      event: sessionRes.data.event,
      statistics: stats.success ? stats.data : { present: 0, remaining: 0, total: 0 },
      recentScans: recentScans.success ? recentScans.data : []
    });
  } catch (error) {
    Logger.log('coordinator_api.gs: loadCoordinatorTerminalContext error: ' + error.message);
    return Utils.buildResponse(false, 'Failed to assemble terminal state context.');
  }
}

/**
 * 2. Marks attendance for a student via the terminal input stream
 * @param {Object} payload - Encloses { rollNumber, attendanceMethod }
 * @returns {Object} Standardized response package
 */
function markAttendanceFromTerminal(payload) {
  try {
    const sessionRes = validateActiveTerminalSession();
    if (!sessionRes.success) return sessionRes;

    const userId = sessionRes.data.user['User ID'] || sessionRes.data.user.userId;
    const eventId = sessionRes.data.event['Event ID'] || sessionRes.data.event.eventId;

    if (!payload || !payload.rollNumber) {
      return Utils.buildResponse(false, 'Missing required student registration identifier.');
    }

    // Explicitly package payload parameters for core AttendanceService execution
    const attendanceData = {
      event_id: eventId,
      roll_number: payload.rollNumber.trim().toUpperCase(),
      attendanceMethod: payload.attendanceMethod || 'Barcode',
      status: CONFIG.ATTENDANCE_STATUS.PRESENT
    };

    return AttendanceService.markAttendance(attendanceData, userId);
  } catch (error) {
    Logger.log('coordinator_api.gs: markAttendanceFromTerminal error: ' + error.message);
    return Utils.buildResponse(false, 'Critical failure processing real-time attendance ingestion.');
  }
}

/**
 * 3. Compiles live tracking summary metrics for the active event
 * @returns {Object} Standardized response package enclosing stats payload
 */
function getTerminalLiveStatistics() {
  try {
    const sessionRes = validateActiveTerminalSession();
    if (!sessionRes.success) return sessionRes;

    const eventId = sessionRes.data.event['Event ID'] || sessionRes.data.event.eventId;
    const counts = AttendanceService.getEventAttendanceCount(eventId);

    return Utils.buildResponse(true, 'Live statistics compiled.', {
      present: counts.present || 0,
      remaining: counts.absent || counts.total - counts.present || 0,
      total: counts.total || 0
    });
  } catch (error) {
    Logger.log('coordinator_api.gs: getTerminalLiveStatistics error: ' + error.message);
    return Utils.buildResponse(false, 'Failed to compute terminal dashboard statistics counters.');
  }
}

/**
 * 4. Extracts the active chronological feed list up to 10 entries
 * @returns {Object} Standardized response package enclosing an array stream
 */
function getTerminalRecentScansStream() {
  try {
    const sessionRes = validateActiveTerminalSession();
    if (!sessionRes.success) return sessionRes;

    const eventId = sessionRes.data.event['Event ID'] || sessionRes.data.event.eventId;
    
    // Fetch historical tracking rows
    const allAttendance = AttendanceService.getAttendanceByEvent(eventId) || [];
    
    // Enforce slice bounds to pull the latest 10 items
    const truncatedList = allAttendance.slice(0, 10).map(record => {
      const student = StudentService.getStudentByRollNumber(record['Roll Number'] || record.roll_number) || {};
      return {
        roll: record['Roll Number'] || record.roll_number,
        name: student['Student Name'] || 'Unknown Student',
        time: record['Time'] || ''
      };
    });

    return Utils.buildResponse(true, 'Recent logs stream populated.', truncatedList);
  } catch (error) {
    Logger.log('coordinator_api.gs: getTerminalRecentScansStream error: ' + error.message);
    return Utils.buildResponse(false, 'Failed to fetch terminal scanning activity stream.');
  }
}

/**
 * 5. Pulls structural verification data metrics for a single identity lookup
 * @param {string} rollNumber - Identification string token
 * @returns {Object} Standardized response package
 */
function getStudentProfileForTerminal(rollNumber) {
  try {
    const sessionRes = validateActiveTerminalSession();
    if (!sessionRes.success) return sessionRes;

    if (!rollNumber) return Utils.buildResponse(false, 'Missing tracking parameter entry.');

    const normalizedRoll = rollNumber.trim().toUpperCase();
    const student = StudentService.getStudentByRollNumber(normalizedRoll);
    
    if (!student) return Utils.buildResponse(false, 'Student not found in institutional database.');

    return Utils.buildResponse(true, 'Student verified successfully.', {
      name: student['Student Name'] || 'Unknown',
      roll: normalizedRoll,
      dept: student['Department ID'] || 'Unknown',
      year: student['Year'] || 'Unknown'
    });
  } catch (error) {
    Logger.log('coordinator_api.gs: getStudentProfileForTerminal error: ' + error.message);
    return Utils.buildResponse(false, 'Database lookup failure occurred.');
  }
}

/**
 * 6. Explicit session termination interface bound to the logging controller
 * @returns {Object} Standardized response package
 */
function terminateTerminalSession() {
  try {
    // Revoke tracking tokens via core SessionService architecture if present
    if (typeof SessionService !== 'undefined' && typeof SessionService.clearSession === 'function') {
      SessionService.clearSession();
    }
    return Utils.buildResponse(true, 'Terminal environment state torn down successfully.');
  } catch (error) {
    Logger.log('coordinator_api.gs: terminateTerminalSession error: ' + error.message);
    return Utils.buildResponse(false, 'Forced logout encountered runtime handling errors.');
  }
}

/**
 * 7. Security guard verification mapping configuration boundaries to identity contexts
 * @returns {Object} Context payload if active, otherwise throws permission rejection bounds
 */
function validateActiveTerminalSession() {
  try {
    // 1. Fetch current runtime session context details safely
    if (typeof SessionService === 'undefined' || typeof SessionService.getActiveUser !== 'function') {
      return Utils.buildResponse(false, 'Authentication framework configuration missing.');
    }

    const sessionUser = SessionService.getActiveUser();
    if (!sessionUser) {
      return Utils.buildResponse(false, 'Terminal session expired or invalid. Please re-authenticate.');
    }

    // 2. Delegate deep session structural constraints logic to CoordinatorService validation engine
    const validation = CoordinatorService.validateCoordinatorSession(sessionUser);
    if (!validation.success) return validation;

    // 3. Resolve and latch the active event currently linked to the assigned account
    const userId = sessionUser.userId || sessionUser.id || sessionUser['User ID'];
    const activeAssignedIds = CoordinatorService.getAssignedEventIds(userId) || [];
    
    if (activeAssignedIds.length === 0) {
      return Utils.buildResponse(false, 'No active event assignments associated with this account credentials.');
    }

    // Select the current operational event node target (default primary array link index)
    const targetEvent = EventService.getEventById(activeAssignedIds[0]);
    if (!targetEvent) {
      return Utils.buildResponse(false, 'Assigned event record is missing or deleted.');
    }

    return Utils.buildResponse(true, 'Session identity boundaries validated.', {
      user: validation.data.user,
      event: targetEvent
    });
  } catch (error) {
    Logger.log('coordinator_api.gs: validateActiveTerminalSession error: ' + error.message);
    return Utils.buildResponse(false, 'Security gate configuration rejected request handling execution pipeline.');
  }
}