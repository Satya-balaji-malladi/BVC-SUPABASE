/**
 * Service for handling student attendance for events.
 * Responsibilities: Marking attendance, deletion, retrieving and summarizing attendance data.
 */
const AttendanceService = {

  // ------------------------------
  // Internal helpers (private)
  // ------------------------------
  _tryWrap: function(methodName, failureMessage, fn) {
    // Supports both call styles:
    // 1) _tryWrap(methodName, fn)
    // 2) _tryWrap(methodName, failureMessage, fn)
    if (typeof failureMessage === 'function') {
      fn = failureMessage;
      failureMessage = (CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_MARK_FAILED) ? CONFIG.MESSAGES.ATTENDANCE_MARK_FAILED : 'Attendance action failed.';
    }

    try {
      return fn();
    } catch (error) {
      Logger.log('AttendanceService.' + methodName + ' error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, failureMessage);
    }
  },

  _getAttendanceColumn: function(maybeConfigKey, fallbackKey) {
    // Centralize “use CONFIG columns if present” behavior to reduce mixed hardcoding.
    // Supports cases where CONFIG.COLUMNS does not include the key.
    if (CONFIG && CONFIG.COLUMNS && maybeConfigKey && CONFIG.COLUMNS[maybeConfigKey]) {
      return CONFIG.COLUMNS[maybeConfigKey];
    }
    if (typeof fallbackKey === 'string' && fallbackKey.length > 0) return fallbackKey;
    return maybeConfigKey;
  },

  _sortByAttendanceTimeDesc: function(list) {
    if (!Array.isArray(list)) return [];

    const timeKey = this._getAttendanceColumn('ATTENDANCE_TIME', 'attendance_time');

    return list.slice().sort((a, b) => {
      const valA = a && (a.Timestamp || a.Date || a[timeKey]);
      const valB = b && (b.Timestamp || b.Date || b[timeKey]);
      const ta = valA ? new Date(valA).getTime() : 0;
      const tb = valB ? new Date(valB).getTime() : 0;
      return tb - ta;
    });
  },

  _getDeletionFlagKey: function() {
    if (CONFIG.COLUMNS && CONFIG.COLUMNS.DELETION_FLAG) return CONFIG.COLUMNS.DELETION_FLAG;
    return 'Deletion Flag';
  },

  _getUpdatedByKey: function() {
    if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_BY) return CONFIG.COLUMNS.UPDATED_BY;
    return 'Updated By';
  },

  _getUpdatedAtKey: function() {
    if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_AT) return CONFIG.COLUMNS.UPDATED_AT;
    return 'Updated At';
  },

  _getLastActionKeys: function() {
    if (CONFIG.COLUMNS && CONFIG.COLUMNS.LAST_ACTION && CONFIG.COLUMNS.LAST_ACTION_BY && CONFIG.COLUMNS.LAST_ACTION_AT) {
      return {
        lastAction: CONFIG.COLUMNS.LAST_ACTION,
        lastActionBy: CONFIG.COLUMNS.LAST_ACTION_BY,
        lastActionAt: CONFIG.COLUMNS.LAST_ACTION_AT
      };
    }
    return {
      lastAction: 'Last Action',
      lastActionBy: 'Last Action By',
      lastActionAt: 'Last Action At'
    };
  },

  _isDeletedAttendance: function(record) {
    if (!record) return false;
    const deletionKey = this._getDeletionFlagKey();
    return Boolean(record[deletionKey]);
  },

  _filterDeletedAttendance: function(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(r => !this._isDeletedAttendance(r));
  },

  _normalizeAttendancePayload: function(attendanceData) {
    // Backward compatibility: support both snake_case and camelCase keys
    if (!attendanceData || typeof attendanceData !== 'object') return {};

    const eventId = attendanceData.event_id !== undefined ? attendanceData.event_id : attendanceData.eventId;
    const rollNumber = attendanceData.roll_number !== undefined ? attendanceData.roll_number : attendanceData.rollNumber;
    const attendanceMethod = attendanceData.attendance_method !== undefined ? attendanceData.attendance_method : attendanceData.attendanceMethod;

    // Keep original keys for any existing logic that depends on them.
    return {
      ...attendanceData,
      // keys expected by ValidationService.validateAttendance()
      eventId: eventId,
      rollNumber: rollNumber,
      attendanceMethod: attendanceMethod,
      // keys used by existing frontend/backend logic
      event_id: eventId,
      roll_number: rollNumber
    };
  },

  _getActionUser: function(userId) {
    try {
      if (!userId) return null;

      const userIdKey = (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_ID) ? CONFIG.COLUMNS.USER_ID : 'user_id';
      const users = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, userIdKey, userId) || [];
      return users.length > 0 ? users[0] : null;
    } catch (e) {
      Logger.log('AttendanceService._getActionUser error: ' + (e && e.message ? e.message : e));
      return null;
    }
  },

  _getUserIdFromUser: function(user) {
    if (!user) return null;
    // Only use the authorization inputs that exist; never reference an undefined local var.
    return user.user_id || user.userId || (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_ID ? user[CONFIG.COLUMNS.USER_ID] : null);
  },

  _validateCoordinatorAccess: function(userId, eventId) {
    if (!userId || !eventId) return false;
    const user = this._getActionUser(userId);
    if (user) {
      const roleField = CONFIG.COLUMNS.ROLE || 'Role';
      const role = user[roleField] || user.role;
      if (role === CONFIG.ROLES.ADMIN) return true;
    }
    // Delegate authorization directly to CoordinatorService as the single source of truth
    return CoordinatorService.canManageEvent(userId, eventId);
  },

  _validateAttendanceWindow: function(eventId) {
    try {
      if (typeof EventService.isAttendanceOpen === 'function') {
        const open = EventService.isAttendanceOpen(eventId);
        if (!open) {
          if (CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_WINDOW_CLOSED) {
            return Utils.buildResponse(false, CONFIG.MESSAGES.ATTENDANCE_WINDOW_CLOSED);
          }
          return Utils.buildResponse(false, 'Attendance window is closed.');
        }
      }

      if (typeof EventService.canScanAttendance === 'function') {
        const can = EventService.canScanAttendance(eventId);
        if (!can) {
          if (CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_WINDOW_CLOSED) {
            return Utils.buildResponse(false, CONFIG.MESSAGES.ATTENDANCE_WINDOW_CLOSED);
          }
          return Utils.buildResponse(false, 'Attendance cannot be recorded at this time.');
        }
      }
    } catch (e) {
      Logger.log('AttendanceService._validateAttendanceWindow error: ' + (e && e.message ? e.message : e));
    }

    return null;
  },

  _getActiveAttendanceIndex: function() {
    // Read attendance sheet once per call.
    const allAttendance = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
    const active = this._filterDeletedAttendance(allAttendance);

    const idx = {};
    const eventKey = this._getAttendanceColumn('EVENT_ID', 'event_id');
    const rollKey = this._getAttendanceColumn('ROLL_NUMBER', 'roll_number');

    active.forEach(r => {
      const k = String(r[eventKey]).trim() + '|' + String(r[rollKey]).trim().toUpperCase();
      idx[k] = true;
    });

    return { active, idx };
  },

  _getEventScannedRolls: function(eventId) {
    try {
      const cacheKey = "event_scanned_rolls_" + eventId;
      if (typeof CacheManager !== 'undefined') {
        const cached = CacheManager.get(cacheKey);
        if (cached && Array.isArray(cached)) return cached;
      }

      const allAttendance = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
      const active = this._filterDeletedAttendance(allAttendance);
      const eventKey = this._getAttendanceColumn('EVENT_ID', 'event_id');
      const rollKey = this._getAttendanceColumn('ROLL_NUMBER', 'roll_number');

      const rolls = active
        .filter(r => String(r[eventKey]).trim() === String(eventId).trim())
        .map(r => String(r[rollKey]).trim().toUpperCase());

      if (typeof CacheManager !== 'undefined') {
        CacheManager.put(cacheKey, rolls, 600); // 10 mins TTL
      }
      return rolls;
    } catch (e) {
      Logger.log("Error in _getEventScannedRolls: " + e.message);
      return [];
    }
  },

  _addEventScannedRoll: function(eventId, rollNumber) {
    try {
      const cacheKey = "event_scanned_rolls_" + eventId;
      const rolls = this._getEventScannedRolls(eventId);
      const upper = String(rollNumber).trim().toUpperCase();
      if (rolls.indexOf(upper) === -1) {
        rolls.push(upper);
        if (typeof CacheManager !== 'undefined') {
          CacheManager.put(cacheKey, rolls, 600);
        }
      }
    } catch (e) {
      Logger.log("Error in _addEventScannedRoll: " + e.message);
    }
  },

  _removeEventScannedRoll: function(eventId, rollNumber) {
    try {
      const cacheKey = "event_scanned_rolls_" + eventId;
      const rolls = this._getEventScannedRolls(eventId);
      const upper = String(rollNumber).trim().toUpperCase();
      const idx = rolls.indexOf(upper);
      if (idx !== -1) {
        rolls.splice(idx, 1);
        if (typeof CacheManager !== 'undefined') {
          CacheManager.put(cacheKey, rolls, 600);
        }
      }
    } catch (e) {
      Logger.log("Error in _removeEventScannedRoll: " + e.message);
    }
  },

  // ------------------------------
  // Public methods (existing API)
  // ------------------------------

  /**
   * Checks if an attendance record already exists for a given event and student.
   * @param {string} eventId
   * @param {string} rollNumber
   * @returns {boolean} True if attendance exists.
   */
  checkAttendanceExists: function(eventId, rollNumber) {
    return this._tryWrap('checkAttendanceExists', () => {
      if (!eventId || !rollNumber) return false;
      const rolls = this._getEventScannedRolls(eventId);
      return rolls.indexOf(String(rollNumber).trim().toUpperCase()) !== -1;
    });
  },

  /**
   * Fast asynchronous attendance marking for scanner UI (sub-50ms instant feedback).
   */
  markAttendanceFast: function(attendanceData, userId) {
    var eventId = (attendanceData && (attendanceData.event_id || attendanceData.eventId)) || '';
    var rollNumber = (attendanceData && (attendanceData.roll_number || attendanceData.rollNumber)) || '';
    var method = (attendanceData && (attendanceData.attendance_method || attendanceData.method)) || 'Barcode';
    var activeUserId = userId || (attendanceData && attendanceData.action_by) || 'Admin';

    return this.markOpenEventAttendanceFast(eventId, rollNumber, activeUserId, method);
  },

  /**
   * Marks attendance for a student at an event.
   * @param {object} attendanceData
   * @param {string} userId - Injected by SessionService
   * @returns {object} Standard response object.
   */
  markAttendance: function(attendanceData, userId) {
    return this._tryWrap(
      'markAttendance',
      CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_MARK_FAILED ? CONFIG.MESSAGES.ATTENDANCE_MARK_FAILED : 'Attendance marking failed.',
      () => {
        const startTime = Date.now();
        Logger.log('[START] AttendanceService.markAttendance | User: ' + userId);

        const normalized = this._normalizeAttendancePayload(attendanceData);

        // ValidationService expects camelCase based on current file.
        const validationResult = ValidationService.validateAttendance({
          eventId: normalized.eventId,
          rollNumber: normalized.rollNumber,
          attendanceMethod: normalized.attendanceMethod
        });

        if (!validationResult.valid) {
          Logger.log('[END] AttendanceService.markAttendance | Validation failed');
          return Utils.buildResponse(false, validationResult.errors.join(' '));
        }

        const eventId = normalized.event_id;
        const rollNumber = String(normalized.roll_number).trim().toUpperCase();

        // 1. Authorization Check (Performance improvement: read once and reuse)
        Logger.log('[START] Authorization Check');
        const isAuthorized = this._validateCoordinatorAccess(userId, eventId);
        Logger.log('[END] Authorization Check | Result: ' + isAuthorized);

        if (!isAuthorized) {
          if (CONFIG.MESSAGES && CONFIG.MESSAGES.UNAUTHORIZED) {
            return Utils.buildResponse(false, CONFIG.MESSAGES.UNAUTHORIZED);
          }
          return Utils.buildResponse(false, 'Unauthorized access.');
        }

        // 2. Attendance Validation
        Logger.log('[START] Attendance Validation');
        
        // Verify event exists
        const event = EventService.getEventById(eventId);
        if (!event) {
          return Utils.buildResponse(false, CONFIG.MESSAGES.EVENT_NOT_FOUND);
        }

        // Verify student exists (skip for Open events — spot auto-registration handled by caller)
        const eventAttType = event ? (event.attendance_type || event['Attendance Type'] || event.attendanceType || 'Fixed') : 'Fixed';
        const isOpenEvent = String(eventAttType).trim().toLowerCase() === 'open';

        const student = StudentService.getStudentByRollNumber(rollNumber);
        if (!student && !isOpenEvent) {
          return Utils.buildResponse(false, CONFIG.MESSAGES.STUDENT_NOT_FOUND);
        }

        // Attendance window validation
        const windowResult = this._validateAttendanceWindow(eventId);
        if (windowResult) return windowResult;

        // Enterprise Configured Time Window verification
        if (event.attendance_window_start || event.attendance_window_end) {
          const nowMs = new Date().getTime();
          if (event.attendance_window_start) {
            const tStart = new Date(event.attendance_window_start).getTime();
            if (nowMs < tStart) {
              return Utils.buildResponse(false, 'Attendance opening time has not started yet.');
            }
          }
          if (event.attendance_window_end) {
            const tEnd = new Date(event.attendance_window_end).getTime();
            if (nowMs > tEnd) {
              return Utils.buildResponse(false, 'Attendance scanning window has closed.');
            }
          }
        }

        if (normalized.attendanceMethod === 'Manual') {
          if (!attendanceData.reason) {
            return Utils.buildResponse(false, 'A reason is mandatory for marking manual attendance.');
          }
        }

        // Date and Time Range validation (e.g. 09:00 to 17:00 on event days)
        if (normalized.attendanceMethod !== 'Manual') {
          const timezone = CONFIG.DATE_TIME.TIMEZONE || 'Asia/Kolkata';
          const todayStr = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');
          const currentTimeStr = Utilities.formatDate(new Date(), timezone, 'HH:mm');

          const formatYMD = (val) => {
            if (!val || val === 'N/A') return null;
            if (val instanceof Date) return Utilities.formatDate(val, timezone, 'yyyy-MM-dd');
            const s = String(val).trim().split('T')[0];
            const d = new Date(s);
            if (!isNaN(d.getTime())) return Utilities.formatDate(d, timezone, 'yyyy-MM-dd');
            return null;
          };

          const sDate = formatYMD(event[CONFIG.COLUMNS.START_DATE] || event.startDate || event.start_date);
          const eDate = formatYMD(event[CONFIG.COLUMNS.END_DATE] || event.endDate || event.end_date);

          if (sDate && eDate && (todayStr < sDate || todayStr > eDate)) {
            return Utils.buildResponse(false, 'Attendance can only be recorded during the event duration (' + sDate + ' to ' + eDate + ').');
          }

          const eventStartTimeRaw = event[CONFIG.COLUMNS.START_TIME] || event.startTime || event.start_time;
          const eventEndTimeRaw = event[CONFIG.COLUMNS.END_TIME] || event.endTime || event.end_time;

          if (eventStartTimeRaw && eventEndTimeRaw && eventStartTimeRaw !== 'N/A' && eventEndTimeRaw !== 'N/A') {
            const getHHMM = (val) => {
              if (!val || val === 'N/A') return null;
              if (val instanceof Date) return Utilities.formatDate(val, timezone, 'HH:mm');
              const s = String(val).trim();
              const match = s.match(/^(\d{1,2}):(\d{2})/);
              if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
              const parsed = new Date(s);
              if (!isNaN(parsed.getTime())) return Utilities.formatDate(parsed, timezone, 'HH:mm');
              return null;
            };
            const sTime = getHHMM(eventStartTimeRaw);
            const eTime = getHHMM(eventEndTimeRaw);
            if (sTime && eTime) {
              if (currentTimeStr < sTime || currentTimeStr > eTime) {
                return Utils.buildResponse(false, 'Attendance can only be recorded between ' + sTime + ' and ' + eTime + ' (Current time: ' + currentTimeStr + ').');
              }
            }
          }
        }

        // Reject completed/cancelled events
        if (event.status === CONFIG.EVENT_STATUS.COMPLETED) {
          return Utils.buildResponse(false, CONFIG.MESSAGES.EVENT_ALREADY_COMPLETED);
        }
        if (event.status === CONFIG.EVENT_STATUS.CANCELLED) {
          if (CONFIG.MESSAGES && CONFIG.MESSAGES.EVENT_CANCELLED) {
            return Utils.buildResponse(false, CONFIG.MESSAGES.EVENT_CANCELLED);
          }
          return Utils.buildResponse(false, 'Attendance cannot be recorded for cancelled events.');
        }

        // Reject inactive student (only if student record exists)
        if (student && student.status && student.status !== CONFIG.USER_STATUS.ACTIVE) {
          if (CONFIG.MESSAGES && CONFIG.MESSAGES.STUDENT_INACTIVE) {
            return Utils.buildResponse(false, CONFIG.MESSAGES.STUDENT_INACTIVE);
          }
          return Utils.buildResponse(false, 'Student is inactive.');
        }

        // Sprint 1 Rules: Check Fixed eligibility (Open events skip participant check)
        const attendanceType = eventAttType;
        if (attendanceType === 'Fixed') {
          const parts = DatabaseService.findByColumn(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Event ID', eventId) || [];
          const isPart = parts.find(p =>
            String(p['Roll Number'] || p.roll_number || p.rollNumber).trim().toUpperCase() === rollNumber &&
            (p['Registration Status'] === 'Confirmed' || p.status === 'Active')
          );
          if (!isPart) {
            if (CONFIG.MESSAGES && CONFIG.MESSAGES.STUDENT_NOT_ACTIVE_PARTICIPANT) {
              return Utils.buildResponse(false, CONFIG.MESSAGES.STUDENT_NOT_ACTIVE_PARTICIPANT);
            }
            return Utils.buildResponse(false, 'Student is not an active participant for this Fixed event.');
          }
        }
        Logger.log('[END] Attendance Validation');

        // 3. Duplicate Check & Save (Lock protected critical transaction)
        Logger.log('[START] Duplicate Check and Attendance Save Lock');
        if (typeof LockManager !== 'undefined') {
          return LockManager.withLock('Script', 15000, () => {
            // 3. Check for Check-out & duplicate check
            const allAtt = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
            const existing = allAtt.find(r => 
              String(r.event_id || r['Event ID']).trim() === String(eventId).trim() && 
              String(r.roll_number || r['Roll Number']).trim().toUpperCase() === rollNumber && 
              !r[CONFIG.COLUMNS.DELETION_FLAG]
            );

            if (existing) {
              if (event.check_out_enabled || event.check_out_enabled === 'true' || event.check_out_enabled === true) {
                if (existing.check_out_timestamp) {
                  return Utils.buildResponse(false, 'Already checked out at ' + new Date(existing.check_out_timestamp).toLocaleTimeString() + '. Initial Check-in: ' + new Date(existing.timestamp || existing.Timestamp).toLocaleTimeString());
                } else {
                  // Perform check-out
                  const checkOutTime = new Date();
                  const duration = Math.round((checkOutTime - new Date(existing.timestamp || existing.Timestamp)) / 60000);
                  const success = DatabaseService.updateRow(CONFIG.SHEETS.ATTENDANCE, 'attendance_id', existing.attendance_id || existing['Attendance ID'], {
                    check_out_timestamp: checkOutTime.toISOString(),
                    total_duration_minutes: duration
                  });
                  if (success) {
                    return Utils.buildResponse(true, 'Check-out registered successfully! Duration: ' + duration + ' mins.');
                  }
                  return Utils.buildResponse(false, 'Failed to register check-out.');
                }
              } else {
                return Utils.buildResponse(false, 'Already checked in at ' + new Date(existing.timestamp || existing.Timestamp).toLocaleTimeString() + '. Duplicate scan blocked.');
              }
            }

            // Determine status
            let status = normalized.status || CONFIG.ATTENDANCE_STATUS.PRESENT;
            if (status !== CONFIG.ATTENDANCE_STATUS.PRESENT && status !== CONFIG.ATTENDANCE_STATUS.ABSENT) {
              return Utils.buildResponse(false, CONFIG.MESSAGES.INVALID_ATTENDANCE_STATUS);
            }

            // 4. Attendance Save
            Logger.log('[START] Attendance Save');
            const now = new Date();
            const newAttendance = {
              [this._getAttendanceColumn('EVENT_ID', 'Event ID')]: eventId,
              [this._getAttendanceColumn('ROLL_NUMBER', 'Roll Number')]: rollNumber,
              [this._getAttendanceColumn('USER_ID', 'User ID')]: userId,
              [this._getAttendanceColumn('ATTENDANCE_STATUS', 'Attendance Status')]: status,
              [this._getAttendanceColumn('ATTENDANCE_METHOD', 'Attendance Method')]: normalized.attendanceMethod || 'Barcode',
              'Date': Utils.formatDate(now),
              'Time': Utilities.formatDate(now, CONFIG.DATE_TIME.TIMEZONE || 'Asia/Kolkata', 'HH:mm:ss'),
              'Timestamp': now.toISOString(),
              'Is Undo': false,
              'Correction Requested': false
            };

            const success = DatabaseService.insertRow(CONFIG.SHEETS.ATTENDANCE, newAttendance);
            Logger.log('[END] Attendance Save | Success: ' + success);

            if (success) {
              this._addEventScannedRoll(eventId, rollNumber);
              const studentRec = StudentService.getStudentByRollNumber(rollNumber);
              let studentInfo = null;
              if (studentRec) {
                studentInfo = {
                  name: studentRec[CONFIG.COLUMNS.STUDENT_NAME] || studentRec['Student Name'] || '',
                  dept: studentRec[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] || studentRec['Department ID'] || '',
                  year: studentRec[CONFIG.COLUMNS.STUDENT_YEAR] || studentRec['Year'] || '',
                  branch: studentRec['Branch'] || studentRec['Department ID'] || ''
                };
              }
              const resp = Utils.buildResponse(true, CONFIG.MESSAGES.ATTENDANCE_MARKED, { 
                attendance: newAttendance,
                student: studentInfo
              });
              try {
                AuditService.logAction(
                  userId,
                  'AttendanceService',
                  'MARK_ATTENDANCE',
                  eventId,
                  'Attendance',
                  'Attendance marked',
                  '',
                  'SUCCESS',
                  userId
                );
              } catch (error) {
                Logger.log('Audit Log Error: ' + error.message);
              }
              try {
                NotificationService.createNotification({
                  user_id: userId,
                  title: 'Attendance Marked',
                  message: 'Attendance marked for event ' + eventId + ' (Roll ' + rollNumber + ').',
                  type: 'Attendance',
                  related_event_id: eventId
                });
              } catch (error) {
                Logger.log('Notification Error: ' + error.message);
              }
              Logger.log('[END] AttendanceService.markAttendance | Execution Time: ' + (Date.now() - startTime) + 'ms');
              return resp;
            }

            Logger.log('[END] AttendanceService.markAttendance | Execution Time: ' + (Date.now() - startTime) + 'ms');
            return Utils.buildResponse(false, CONFIG.MESSAGES.ATTENDANCE_MARK_FAILED);
          });
        }

        Logger.log('[END] AttendanceService.markAttendance | Execution Time: ' + (Date.now() - startTime) + 'ms');
        return Utils.buildResponse(false, CONFIG.MESSAGES.ATTENDANCE_MARK_FAILED);
      }
    );
  },

  /**
   * HIGH-PERFORMANCE attendance writer for Open Events.
   * Eliminates all validation bottlenecks:
   *   - No student DB lookup/create
   *   - No participant check
   *   - No LockManager (CacheService dedup instead)
   *   - No AuditService / NotificationService writes
   *   - Single sheet.appendRow() call
   * Target: 0.5–1s end-to-end.
   */
  markOpenEventAttendanceFast: function(eventId, rollNumber, userId, attendanceMethod) {
    try {
      var startTime = Date.now();
      var roll = String(rollNumber || '').trim().toUpperCase();
      if (!eventId || !roll) {
        return Utils.buildResponse(false, 'Missing event ID or roll number.');
      }

      // CacheService duplicate guard — avoids full attendance sheet read
      var cacheKey = 'event_scanned_rolls_' + eventId;
      var scannedRolls = [];
      if (typeof CacheManager !== 'undefined') {
        var cachedRolls = CacheManager.get(cacheKey);
        if (cachedRolls && Array.isArray(cachedRolls)) scannedRolls = cachedRolls;
      }
      if (scannedRolls.indexOf(roll) !== -1) {
        return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_ALREADY_EXISTS) || 'Student already marked.');
      }

      // Direct sheet append — fastest possible Sheets API call
      var sheet = DatabaseService.getSheet(CONFIG.SHEETS.ATTENDANCE);
      if (!sheet) return Utils.buildResponse(false, 'Attendance sheet not found.');

      var headers = DatabaseService.getHeaderRow(CONFIG.SHEETS.ATTENDANCE);
      var now = new Date();
      var tz = (CONFIG.DATE_TIME && CONFIG.DATE_TIME.TIMEZONE) ? CONFIG.DATE_TIME.TIMEZONE : 'Asia/Kolkata';
      var dateStr = Utilities.formatDate(now, tz, 'dd-MM-yyyy');
      var timeStr = Utilities.formatDate(now, tz, 'HH:mm:ss');
      var tsIso = now.toISOString();

      var row = headers.map(function(h) {
        switch (h) {
          case 'Event ID':             return eventId;
          case 'Roll Number':          return roll;
          case 'User ID':              return userId || '';
          case 'Attendance Status':    return 'PRESENT';
          case 'Attendance Method':    return attendanceMethod || 'Barcode';
          case 'Date':                 return dateStr;
          case 'Time':                 return timeStr;
          case 'Timestamp':            return tsIso;
          case 'Is Undo':              return false;
          case 'Correction Requested': return false;
          default:                     return '';
        }
      });

      sheet.appendRow(row);

      // Bust in-memory cache so subsequent reads are consistent
      if (DatabaseService._cache && DatabaseService._cache['ATTENDANCE']) {
        delete DatabaseService._cache['ATTENDANCE'];
      }

      // Append to CacheService dedup list immediately
      scannedRolls.push(roll);
      if (typeof CacheManager !== 'undefined') {
        CacheManager.put(cacheKey, scannedRolls, 600);
      }

      Logger.log('markOpenEventAttendanceFast completed | roll=' + roll + ' | ' + (Date.now() - startTime) + 'ms');
      
      var student = StudentService.getStudentByRollNumber(roll);
      var studentInfo = null;
      if (student) {
        studentInfo = {
          name: student[CONFIG.COLUMNS.STUDENT_NAME] || student['Student Name'] || '',
          dept: student[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] || student['Department ID'] || '',
          year: student[CONFIG.COLUMNS.STUDENT_YEAR] || student['Year'] || '',
          branch: student['Branch'] || student['Department ID'] || ''
        };
      }

      return Utils.buildResponse(true, (CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_MARKED) || 'Attendance marked.', {
        attendance: { eventId: eventId, rollNumber: roll, status: 'PRESENT', timestamp: tsIso },
        student: studentInfo
      });
    } catch (e) {
      Logger.log('markOpenEventAttendanceFast error: ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, 'Fast attendance write failed.');
    }
  },

  /**
   * Deletes an attendance record.
   * @param {string} attendanceId
   * @param {string} userId - Injected by SessionService
   * @returns {object} Standard response object.
   */
  deleteAttendance: function(attendanceId, userId) {
    return this._tryWrap(
      'deleteAttendance',
      CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_DELETE_FAILED ? CONFIG.MESSAGES.ATTENDANCE_DELETE_FAILED : 'Attendance deletion failed.',
      () => {
        const startTime = Date.now();
        Logger.log('[START] AttendanceService.deleteAttendance | Attendance ID: ' + attendanceId);

        const sheetName = CONFIG.SHEETS.ATTENDANCE;

        const attendanceRecord = this.getAttendanceById(attendanceId);
        if (!attendanceRecord) {
          return Utils.buildResponse(false, CONFIG.MESSAGES.ATTENDANCE_NOT_FOUND);
        }

        const attendanceEventId = attendanceRecord[this._getAttendanceColumn('EVENT_ID', 'event_id')] || attendanceRecord.event_id;
        
        // Authorization Check via central service
        Logger.log('[START] Authorization Check');
        const isAuthorized = this._validateCoordinatorAccess(userId, attendanceEventId);
        Logger.log('[END] Authorization Check | Result: ' + isAuthorized);

        if (!isAuthorized) {
          if (CONFIG.MESSAGES && CONFIG.MESSAGES.UNAUTHORIZED) {
            return Utils.buildResponse(false, CONFIG.MESSAGES.UNAUTHORIZED);
          }
          return Utils.buildResponse(false, 'Unauthorized access.');
        }

        const event = EventService.getEventById(attendanceEventId);
        if (event && event.status === CONFIG.EVENT_STATUS.COMPLETED) {
          return Utils.buildResponse(false, CONFIG.MESSAGES.EVENT_ALREADY_COMPLETED);
        }
        if (event && event.status === CONFIG.EVENT_STATUS.CANCELLED) {
          if (CONFIG.MESSAGES && CONFIG.MESSAGES.EVENT_CANCELLED) {
            return Utils.buildResponse(false, CONFIG.MESSAGES.EVENT_CANCELLED);
          }
          return Utils.buildResponse(false, 'Cannot delete attendance for cancelled events.');
        }

        // Soft delete updates
        const deletionKey = this._getDeletionFlagKey();
        const updatedByKey = this._getUpdatedByKey();
        const updatedAtKey = this._getUpdatedAtKey();
        const lastKeys = this._getLastActionKeys();
        const ts = Utils.getCurrentTimestamp();

        const updateData = {
          [deletionKey]: true,
          [updatedByKey]: userId,
          [updatedAtKey]: ts,
          [lastKeys.lastAction]: 'Deleted',
          [lastKeys.lastActionBy]: userId,
          [lastKeys.lastActionAt]: ts
        };

        const attendanceIdKey = this._getAttendanceColumn('ATTENDANCE_ID', 'attendance_id');
        
        Logger.log('[START] Attendance Save (Soft Delete Update)');
        const success = DatabaseService.updateRow(sheetName, attendanceIdKey, attendanceId, updateData);
        Logger.log('[END] Attendance Save (Soft Delete Update) | Success: ' + success);

        if (success) {
          const attendanceRoll = attendanceRecord[this._getAttendanceColumn('ROLL_NUMBER', 'roll_number')] || attendanceRecord.roll_number;
          this._removeEventScannedRoll(attendanceEventId, attendanceRoll);
          const resp = Utils.buildResponse(true, CONFIG.MESSAGES.ATTENDANCE_DELETED);
          try {
            AuditService.logAction(
              userId,
              'AttendanceService',
              'DELETE_ATTENDANCE',
              attendanceId,
              'Attendance',
              'Attendance deleted',
              '',
              'SUCCESS',
              userId
            );
          } catch (error) {
            Logger.log('Audit Log Error: ' + error.message);
          }
          Logger.log('[END] AttendanceService.deleteAttendance | Execution Time: ' + (Date.now() - startTime) + 'ms');
          return resp;
        }

        Logger.log('[END] AttendanceService.deleteAttendance | Execution Time: ' + (Date.now() - startTime) + 'ms');
        return Utils.buildResponse(false, CONFIG.MESSAGES.ATTENDANCE_DELETE_FAILED);
      }
    );
  },

  /**
   * Retrieves an attendance record by ID.
   * @param {string} attendanceId
   * @returns {object|null}
   */
  getAttendanceById: function(attendanceId) {
    return this._tryWrap('getAttendanceById', () => {
      if (!attendanceId) return null;
      const idKey = this._getAttendanceColumn('ATTENDANCE_ID', 'attendance_id');
      const records = DatabaseService.findByColumn(CONFIG.SHEETS.ATTENDANCE, idKey, attendanceId) || [];
      if (records.length === 0) return null;
      const rec = records[0];
      return this._isDeletedAttendance(rec) ? null : rec;
    });
  },

  /**
   * Retrieves attendance records by Event ID.
   * @param {string} eventId
   * @returns {object[]}
   */
  getAttendanceByEvent: function(eventId) {
    return this._tryWrap('getAttendanceByEvent', () => {
      if (!eventId) return [];
      const eventKey = this._getAttendanceColumn('EVENT_ID', 'event_id');
      const list = DatabaseService.findByColumn(CONFIG.SHEETS.ATTENDANCE, eventKey, eventId) || [];
      return this._sortByAttendanceTimeDesc(this._filterDeletedAttendance(list));
    });
  },

  /**
   * Retrieves attendance records by Student Roll Number.
   * @param {string} rollNumber
   * @returns {object[]}
   */
  getAttendanceByStudent: function(rollNumber) {
    return this._tryWrap('getAttendanceByStudent', () => {
      if (!rollNumber) return [];
      const rollKey = this._getAttendanceColumn('ROLL_NUMBER', 'roll_number');
      const normalizedRoll = String(rollNumber).trim().toUpperCase();
      const list = DatabaseService.findByColumn(CONFIG.SHEETS.ATTENDANCE, rollKey, normalizedRoll) || [];
      return this._sortByAttendanceTimeDesc(this._filterDeletedAttendance(list));
    });
  },

  /**
   * Retrieves attendance records by Date.
   * @param {string} date
   * @returns {object[]}
   */
  getAttendanceByDate: function(date) {
    return this._tryWrap('getAttendanceByDate', () => {
      if (!date) return [];
      const targetDate = Utils.formatDate(date);
      const allAttendance = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
      const active = this._filterDeletedAttendance(allAttendance);

      const dateKey = 'Date';
      const timeKey = this._getAttendanceColumn('ATTENDANCE_TIME', 'attendance_time');
      const filtered = active.filter(record => {
        const val = record[dateKey] || record['Timestamp'] || record[timeKey];
        return Utils.formatDate(val) === targetDate;
      });

      return this._sortByAttendanceTimeDesc(filtered);
    });
  },

  /**
   * Retrieves attendance records by Status.
   * @param {string} status
   * @returns {object[]}
   */
  getAttendanceByStatus: function(status) {
    return this._tryWrap('getAttendanceByStatus', () => {
      if (!status) return [];
      const statusKey = this._getAttendanceColumn('ATTENDANCE_STATUS', 'Attendance Status');
      const list = DatabaseService.findByColumn(CONFIG.SHEETS.ATTENDANCE, statusKey, status) || [];
      return this._sortByAttendanceTimeDesc(this._filterDeletedAttendance(list));
    });
  },

  /**
   * Gets the attendance counts for an event.
   * @param {string} eventId
   * @returns {object} {total, present, absent}
   */
  getEventAttendanceCount: function(eventId) {
    return this._tryWrap('getEventAttendanceCount', () => {
      const records = this.getAttendanceByEvent(eventId);
      let present = 0;
      let absent = 0;

      const statusKey = this._getAttendanceColumn('ATTENDANCE_STATUS', 'Attendance Status');

      records.forEach(record => {
        if (record[statusKey] === CONFIG.ATTENDANCE_STATUS.PRESENT) present++;
        else if (record[statusKey] === CONFIG.ATTENDANCE_STATUS.ABSENT) absent++;
      });

      return { total: records.length, present: present, absent: absent };
    });
  },

  /**
   * Gets the total attendance records count for a student.
   * @param {string} rollNumber
   * @returns {number} Total attendance records count.
   */
  getStudentAttendanceCount: function(rollNumber) {
    return this._tryWrap('getStudentAttendanceCount', () => {
      const records = this.getAttendanceByStudent(rollNumber);
      return records.length;
    });
  },

  /**
   * Gets the summarized attendance data for a student.
   * @param {string} rollNumber
   * @returns {object} {totalEvents, present, absent}
   */
  getStudentAttendanceSummary: function(rollNumber) {
    return this._tryWrap('getStudentAttendanceSummary', () => {
      const records = this.getAttendanceByStudent(rollNumber);
      let present = 0;
      let absent = 0;

      const statusKey = this._getAttendanceColumn('ATTENDANCE_STATUS', 'Attendance Status');

      records.forEach(record => {
        if (record[statusKey] === CONFIG.ATTENDANCE_STATUS.PRESENT) present++;
        else if (record[statusKey] === CONFIG.ATTENDANCE_STATUS.ABSENT) absent++;
      });

      return { totalEvents: records.length, present: present, absent: absent };
    });
  },

  /**
   * Gets overall attendance statistics across all events.
   * @returns {object} {totalAttendance, present, absent, attendancePercentage}
   */
  getOverallAttendanceStatistics: function() {
    return this._tryWrap('getOverallAttendanceStatistics', () => {
      const allAttendance = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
      const active = this._filterDeletedAttendance(allAttendance);

      let present = 0;
      let absent = 0;

      const statusKey = this._getAttendanceColumn('ATTENDANCE_STATUS', 'Attendance Status');

      active.forEach(record => {
        if (record[statusKey] === CONFIG.ATTENDANCE_STATUS.PRESENT) present++;
        else if (record[statusKey] === CONFIG.ATTENDANCE_STATUS.ABSENT) absent++;
      });

      const totalAttendance = active.length;
      const percentage = totalAttendance === 0 ? 0 : (present / totalAttendance) * 100;

      return {
        totalAttendance: totalAttendance,
        present: present,
        absent: absent,
        attendancePercentage: Number(percentage.toFixed(2))
      };
    });
  },

  /**
   * Gets an attendance summary for a specific event.
   * @param {string} eventId
   * @returns {object|null} Summary object or null if event not found.
   */
  getAttendanceSummaryByEvent: function(eventId) {
    return this._tryWrap('getAttendanceSummaryByEvent', () => {
      const event = EventService.getEventById(eventId);
      if (!event) return null;

      const counts = this.getEventAttendanceCount(eventId);
      return {
        eventId: event.event_id,
        eventName: event.event_name,
        total: counts.total,
        present: counts.present,
        absent: counts.absent
      };
    });
  },

  getEventDayAttendance: function(eventId, dayNumber, userContext) {
    return this._tryWrap('getEventDayAttendance', () => {
      if (userContext && typeof SecurityUtils !== 'undefined' && SecurityUtils.canAccessEvent) {
        if (!SecurityUtils.canAccessEvent(eventId, userContext)) {
          return Utils.buildResponse(false, 'Access denied for event attendance.');
        }
      }

      var event = EventService.getEventById(eventId, userContext);
      if (!event) return Utils.buildResponse(false, 'Event not found');

      var startDateStr = event[CONFIG.COLUMNS.START_DATE] || event.startDate || event.start_date;
      var start = new Date(startDateStr);
      if (isNaN(start.getTime())) start = new Date();

      var targetDate = new Date(start.getTime());
      targetDate.setDate(start.getDate() + (parseInt(dayNumber, 10) - 1));
      var targetDateStr = targetDate.toISOString().split('T')[0];

      var records = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
      var activeRecords = this._filterDeletedAttendance(records);

      var eventRecords = activeRecords.filter(r => {
        var rEventId = String(r[CONFIG.COLUMNS.ATTENDANCE_EVENT_ID] || r.eventId || r.event_id || '').trim();
        return rEventId === String(eventId).trim();
      });

      var dayRecords = eventRecords.filter(r => {
        var timestampStr = r[CONFIG.COLUMNS.TIMESTAMP] || r.timestamp || r.date || r.created_at;
        if (!timestampStr) return false;
        var d = new Date(timestampStr);
        if (isNaN(d.getTime())) return false;
        return d.toISOString().split('T')[0] === targetDateStr;
      });

      var participants = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];
      var eventParticipants = participants.filter(p => {
        const isCancelled = p['Registration Status'] === 'Cancelled' || p.status === 'Cancelled';
        return String(p['Event ID'] || p.event_id).trim() === String(eventId).trim() && !isCancelled;
      });

      var totalRegistered = eventParticipants.length;

      // Map day records by Roll Number
      var dayRecordsMap = {};
      dayRecords.forEach(r => {
        var roll = String(r[CONFIG.COLUMNS.ATTENDANCE_ROLL] || r.roll_number || r.rollNumber || '').trim().toUpperCase();
        if (roll) {
          dayRecordsMap[roll] = r;
        }
      });

      var finalAttendance = [];
      var presentCount = 0;

      if (totalRegistered > 0) {
        // Load student profiles for virtual absent mapping
        const allStudentsResponse = StudentService.getAllStudents();
        const allStudents = (allStudentsResponse && allStudentsResponse.success) ? allStudentsResponse.students : [];
        const studentMap = new Map();
        (allStudents || []).forEach(s => {
          const roll = s['Roll Number'] || s.roll_number || s.rollNumber;
          if (roll) studentMap.set(String(roll).trim().toUpperCase(), s);
        });

        eventParticipants.forEach(p => {
          var roll = String(p['Roll Number'] || p.roll_number || p.rollNumber || '').trim().toUpperCase();
          if (!roll) return;
          var record = dayRecordsMap[roll];
          if (record) {
            var status = String(record[CONFIG.COLUMNS.ATTENDANCE_STATUS] || record.status || 'PRESENT').toUpperCase();
            if (status === 'PRESENT') presentCount++;
            
            finalAttendance.push({
              'Roll Number': roll,
              'Student Name': record['Student Name'] || record.student_name || record.name || (studentMap.get(roll) ? studentMap.get(roll)['Student Name'] : '--'),
              'Department ID': record['Department ID'] || record.department_id || record.department || (studentMap.get(roll) ? studentMap.get(roll)['Department'] : '--'),
              'Year': record['Year'] || record.year || (studentMap.get(roll) ? studentMap.get(roll)['Year'] : '--'),
              'Section': record['Section'] || record.section || (studentMap.get(roll) ? studentMap.get(roll)['Section'] : '--'),
              'Attendance Status': status,
              'Timestamp': record[CONFIG.COLUMNS.TIMESTAMP] || record.timestamp || record.attendance_time || record.date || '--'
            });
          } else {
            var student = studentMap.get(roll) || {};
            finalAttendance.push({
              'Roll Number': roll,
              'Student Name': student['Student Name'] || student.student_name || '--',
              'Department ID': student['Department'] || student.department || '--',
              'Year': student['Year'] || student.year || '--',
              'Section': student['Section'] || student.section || '--',
              'Attendance Status': 'ABSENT',
              'Timestamp': '--'
            });
          }
        });
      } else {
        // Open Event or no participants registered
        dayRecords.forEach(record => {
          var status = String(record[CONFIG.COLUMNS.ATTENDANCE_STATUS] || record.status || 'PRESENT').toUpperCase();
          if (status === 'PRESENT') presentCount++;
          
          finalAttendance.push({
            'Roll Number': record[CONFIG.COLUMNS.ATTENDANCE_ROLL] || record.roll_number || record.rollNumber || '--',
            'Student Name': record['Student Name'] || record.student_name || record.name || '--',
            'Department ID': record['Department ID'] || record.department_id || record.department || '--',
            'Year': record['Year'] || record.year || '--',
            'Section': record['Section'] || record.section || '--',
            'Attendance Status': status,
            'Timestamp': record[CONFIG.COLUMNS.TIMESTAMP] || record.timestamp || record.attendance_time || record.date || '--'
          });
        });
        totalRegistered = finalAttendance.length;
      }

      var absentCount = totalRegistered - presentCount;
      var attendancePercentage = totalRegistered > 0 ? Math.round((presentCount / totalRegistered) * 100) : 0;

      return Utils.buildResponse(true, 'Day attendance retrieved', {
        dayNumber: dayNumber,
        dateLabel: targetDateStr,
        attendance: finalAttendance,
        summary: {
          totalRegistered: totalRegistered,
          totalMarked: dayRecords.length,
          presentCount: presentCount,
          absentCount: absentCount,
          attendancePercentage: attendancePercentage
        }
      });
    });
  }

};