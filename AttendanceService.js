/**
 * Service for handling student attendance for events.
 * Responsibilities: Marking attendance, deletion, retrieving and summarizing attendance data.
 */
const AttendanceService = {

  // ------------------------------
  // Internal helpers (private)
  // ------------------------------

  /**
   * Safely parses any value into a boolean.
   * Prevents String("false") from evaluating to true.
   */
  _parseBoolean: function (val) {
    if (val === undefined || val === null) return false;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val === 1;
    const clean = String(val).trim().toLowerCase();
    return clean === 'true' || clean === '1';
  },

  _tryWrap: function (methodName, failureMessage, fn) {
    if (typeof failureMessage === 'function') {
      fn = failureMessage;
      failureMessage = (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_MARK_FAILED) ? CONFIG.MESSAGES.ATTENDANCE_MARK_FAILED : 'Attendance action failed.';
    }

    try {
      return fn();
    } catch (error) {
      Logger.log('AttendanceService.' + methodName + ' error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, failureMessage);
    }
  },

  _getAttendanceColumn: function (maybeConfigKey, fallbackKey) {
    if (CONFIG && CONFIG.COLUMNS && maybeConfigKey && CONFIG.COLUMNS[maybeConfigKey]) {
      return CONFIG.COLUMNS[maybeConfigKey];
    }
    if (typeof fallbackKey === 'string' && fallbackKey.length > 0) return fallbackKey;
    return maybeConfigKey;
  },

  _getRecordEventId: function (record) {
    if (!record) return '';
    const key = this._getAttendanceColumn('EVENT_ID', 'Event ID');
    return String(record[key] || record.event_id || record.eventId || record['Event ID'] || '').trim();
  },

  _getRecordRollNumber: function (record) {
    if (!record) return '';
    const key = this._getAttendanceColumn('ROLL_NUMBER', 'Roll Number');
    return String(record[key] || record.roll_number || record.rollNumber || record['Roll Number'] || '').trim().toUpperCase();
  },

  _getRecordStatus: function (record) {
    if (!record) return '';
    const key = this._getAttendanceColumn('ATTENDANCE_STATUS', 'Attendance Status');
    return String(record[key] || record.attendance_status || record.status || record['Attendance Status'] || 'PRESENT').trim().toUpperCase();
  },

  _getRecordTimestamp: function (record) {
    if (!record) return '';
    const key = this._getAttendanceColumn('ATTENDANCE_TIME', 'attendance_time');
    return record.Timestamp || record.timestamp || record.Date || record[key] || record.created_at || '';
  },

  _sortByAttendanceTimeDesc: function (list) {
    if (!Array.isArray(list)) return [];

    return list.slice().sort((a, b) => {
      const valA = this._getRecordTimestamp(a);
      const valB = this._getRecordTimestamp(b);
      const ta = valA ? new Date(valA).getTime() : 0;
      const tb = valB ? new Date(valB).getTime() : 0;
      return tb - ta;
    });
  },

  _getDeletionFlagKey: function () {
    if (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.DELETION_FLAG) return CONFIG.COLUMNS.DELETION_FLAG;
    return 'Deletion Flag';
  },

  _getUpdatedByKey: function () {
    if (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_BY) return CONFIG.COLUMNS.UPDATED_BY;
    return 'Updated By';
  },

  _getUpdatedAtKey: function () {
    if (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_AT) return CONFIG.COLUMNS.UPDATED_AT;
    return 'Updated At';
  },

  _getLastActionKeys: function () {
    if (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.LAST_ACTION && CONFIG.COLUMNS.LAST_ACTION_BY && CONFIG.COLUMNS.LAST_ACTION_AT) {
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

  _isDeletedAttendance: function (record) {
    if (!record) return false;
    const deletionKey = this._getDeletionFlagKey();
    const rawVal = record[deletionKey] !== undefined ? record[deletionKey] : record.deletion_flag;
    return this._parseBoolean(rawVal);
  },

  _filterDeletedAttendance: function (list) {
    if (!Array.isArray(list)) return [];
    return list.filter(r => !this._isDeletedAttendance(r));
  },

  _normalizeAttendancePayload: function (attendanceData) {
    if (!attendanceData || typeof attendanceData !== 'object') return {};

    const eventId = attendanceData.event_id !== undefined ? attendanceData.event_id : attendanceData.eventId;
    const rollNumber = attendanceData.roll_number !== undefined ? attendanceData.roll_number : attendanceData.rollNumber;
    const attendanceMethod = attendanceData.attendance_method !== undefined ? attendanceData.attendance_method : (attendanceData.attendanceMethod || attendanceData.method);

    return {
      ...attendanceData,
      eventId: eventId,
      rollNumber: rollNumber,
      attendanceMethod: attendanceMethod,
      event_id: eventId,
      roll_number: rollNumber
    };
  },

  _getActionUser: function (userId) {
    try {
      if (!userId) return null;

      const userIdKey = (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.USER_ID) ? CONFIG.COLUMNS.USER_ID : 'user_id';
      const users = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, userIdKey, userId) || [];
      if (users.length > 0) return users[0];

      var strVal = String(userId).trim().toUpperCase();
      if (strVal === 'SYSTEM' || strVal === 'SUPER ADMIN' || strVal === 'SUPER_ADMIN' || strVal === 'ADMIN' || strVal === 'USR0001' || strVal.startsWith('USR')) {
        return { user_id: userId, role: 'Super Admin', Role: 'Super Admin' };
      }
      return null;
    } catch (e) {
      Logger.log('AttendanceService._getActionUser error: ' + (e && e.message ? e.message : e));
      return null;
    }
  },

  _getUserIdFromUser: function (user) {
    if (!user) return null;
    return user.user_id || user.userId || (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.USER_ID ? user[CONFIG.COLUMNS.USER_ID] : null);
  },

  _validateCoordinatorAccess: function (userId, eventId) {
    if (!userId || !eventId) return false;

    // Normalize Super Admin & Admin permissions
    const user = this._getActionUser(userId);
    if (user) {
      const roleField = (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.ROLE) ? CONFIG.COLUMNS.ROLE : 'Role';
      const role = String(user[roleField] || user.role || '').toUpperCase();
      const adminRole = CONFIG && CONFIG.ROLES && CONFIG.ROLES.ADMIN ? String(CONFIG.ROLES.ADMIN).toUpperCase() : 'ADMIN';
      const superAdminRole = CONFIG && CONFIG.ROLES && CONFIG.ROLES.SUPER_ADMIN ? String(CONFIG.ROLES.SUPER_ADMIN).toUpperCase() : 'SUPER_ADMIN';

      if (role === adminRole || role === superAdminRole || role === 'SUPERADMIN') return true;
    }

    // Delegate authorization directly to CoordinatorService
    if (typeof CoordinatorService !== 'undefined' && typeof CoordinatorService.canManageEvent === 'function') {
      return CoordinatorService.canManageEvent(userId, eventId);
    }
    return false;
  },

  _validateAttendanceWindow: function (eventId) {
    try {
      if (typeof EventService !== 'undefined') {
        if (typeof EventService.isAttendanceOpen === 'function') {
          const open = EventService.isAttendanceOpen(eventId);
          if (!open) {
            const msg = (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_WINDOW_CLOSED) ? CONFIG.MESSAGES.ATTENDANCE_WINDOW_CLOSED : 'Attendance window is closed.';
            return Utils.buildResponse(false, msg);
          }
        }

        if (typeof EventService.canScanAttendance === 'function') {
          const can = EventService.canScanAttendance(eventId);
          if (!can) {
            const msg = (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_WINDOW_CLOSED) ? CONFIG.MESSAGES.ATTENDANCE_WINDOW_CLOSED : 'Attendance cannot be recorded at this time.';
            return Utils.buildResponse(false, msg);
          }
        }
      }
    } catch (e) {
      Logger.log('AttendanceService._validateAttendanceWindow error (failing closed): ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, 'Failed to validate attendance window. Action blocked.');
    }

    return null;
  },

  _getActiveAttendanceIndex: function () {
    const allAttendance = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
    const active = this._filterDeletedAttendance(allAttendance);

    const idx = {};
    active.forEach(r => {
      const eId = this._getRecordEventId(r);
      const roll = this._getRecordRollNumber(r);
      if (eId && roll) {
        const k = eId + '|' + roll;
        idx[k] = true;
      }
    });

    return { active, idx };
  },

  _getEventScannedRolls: function (eventId) {
    try {
      const normEventId = String(eventId || '').trim();
      const cacheKey = "event_scanned_rolls_" + normEventId;
      if (typeof CacheManager !== 'undefined') {
        const cached = CacheManager.get(cacheKey);
        if (cached && Array.isArray(cached)) return cached;
      }

      const allAttendance = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
      const active = this._filterDeletedAttendance(allAttendance);

      const rolls = active
        .filter(r => this._getRecordEventId(r) === normEventId)
        .map(r => this._getRecordRollNumber(r));

      if (typeof CacheManager !== 'undefined') {
        CacheManager.put(cacheKey, rolls, 600); // 10 mins TTL
      }
      return rolls;
    } catch (e) {
      Logger.log("Error in _getEventScannedRolls: " + e.message);
      return [];
    }
  },

  _addEventScannedRoll: function (eventId, rollNumber) {
    try {
      const normEventId = String(eventId || '').trim();
      const cacheKey = "event_scanned_rolls_" + normEventId;
      const rolls = this._getEventScannedRolls(normEventId);
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

  _removeEventScannedRoll: function (eventId, rollNumber) {
    try {
      const normEventId = String(eventId || '').trim();
      const cacheKey = "event_scanned_rolls_" + normEventId;
      const rolls = this._getEventScannedRolls(normEventId);
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

  _isRegistrationEnabled: function (event) {
    if (!event) return false;
    const colKey = CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.ENABLE_REGISTRATION ? CONFIG.COLUMNS.ENABLE_REGISTRATION : 'Enable Registration';
    const rawVal = event[colKey] !== undefined ? event[colKey] : (event.enable_registration !== undefined ? event.enable_registration : event.enableRegistration);

    if (rawVal !== undefined && rawVal !== null) {
      return this._parseBoolean(rawVal);
    }

    // Fallback to legacy Attendance Type check if Enable Registration is absent
    const attType = String(event.attendance_type || event['Attendance Type'] || event.attendanceType || 'Fixed').trim().toLowerCase();
    return attType !== 'open';
  },

  // ------------------------------
  // Public methods (existing API)
  // ------------------------------

  /**
   * Checks if an attendance record already exists for a given event and student.
   * @param {string} eventId
   * @param {string} rollNumber
   * @returns {boolean} True if active attendance exists.
   */
  checkAttendanceExists: function (eventId, rollNumber) {
    return this.hasStudentAttended(eventId, rollNumber);
  },

  hasStudentAttended: function (eventId, rollNumber) {
    if (!eventId || !rollNumber) return false;
    const cleanEventId = String(eventId).trim();
    const cleanRoll = String(rollNumber).trim().toUpperCase();
    const records = this.getAttendanceByEvent(cleanEventId) || [];
    return records.some(r => {
      const rRoll = this._getRecordRollNumber(r);
      return rRoll === cleanRoll && !this._isDeletedAttendance(r);
    });
  },

  /**
   * Fast attendance marking - safely delegates to main markAttendance pipeline.
   */
  markAttendanceFast: function (attendanceData, userId) {
    return this.markAttendance(attendanceData, userId);
  },

  /**
   * Fast attendance writer for Open Events - safely delegates to main markAttendance pipeline.
   */
  markOpenEventAttendanceFast: function (eventId, rollNumber, userId, attendanceMethod) {
    return this.markAttendance({
      eventId: eventId,
      rollNumber: rollNumber,
      attendanceMethod: attendanceMethod || 'Barcode'
    }, userId);
  },
  _isRegistrationEnabled: function(event) {
    try {
      if (!event) return false;
      var reqVal = event['Registration Required'] !== undefined ? event['Registration Required'] :
                   (event.registration_required !== undefined ? event.registration_required :
                   (event.is_registration_required !== undefined ? event.is_registration_required : false));
      if (typeof reqVal === 'boolean') return reqVal;
      if (typeof reqVal === 'string') {
        var lower = reqVal.trim().toLowerCase();
        return lower === 'true' || lower === 'yes' || lower === '1';
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  /**
   * Marks attendance for a student at an event safely.
   * @param {object} attendanceData
   * @param {string} userId - Injected by SessionService
   * @returns {object} Standard response object.
   */
  markAttendance: function (attendanceData, userId) {
    return this._tryWrap(
      'markAttendance',
      (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_MARK_FAILED) ? CONFIG.MESSAGES.ATTENDANCE_MARK_FAILED : 'Attendance marking failed.',
      () => {
        const startTime = Date.now();
        Logger.log('[START] AttendanceService.markAttendance | User: ' + userId);

        const normalized = this._normalizeAttendancePayload(attendanceData);

        const validationResult = ValidationService.validateAttendance({
          eventId: normalized.eventId,
          rollNumber: normalized.rollNumber,
          attendanceMethod: normalized.attendanceMethod
        });

        if (!validationResult.valid) {
          Logger.log('[END] AttendanceService.markAttendance | Validation failed');
          return Utils.buildResponse(false, validationResult.errors.join(' '));
        }

        const eventId = String(normalized.event_id).trim();
        const rollNumber = String(normalized.roll_number).trim().toUpperCase();
        const methodStr = String(normalized.attendanceMethod || 'Barcode').trim();

        // 1. Authorization Check
        const isAuthorized = this._validateCoordinatorAccess(userId, eventId);
        if (!isAuthorized) {
          const msg = (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.UNAUTHORIZED) ? CONFIG.MESSAGES.UNAUTHORIZED : 'Unauthorized access.';
          return Utils.buildResponse(false, msg);
        }

        // 2. Attendance & Event Validation
        const event = EventService.getEventById(eventId);
        if (!event) {
          return Utils.buildResponse(false, (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.EVENT_NOT_FOUND) ? CONFIG.MESSAGES.EVENT_NOT_FOUND : 'Event not found.');
        }

        // Reject completed/cancelled events
        const eventStatus = String(event.status || event['Status'] || '').toUpperCase();
        const completedStatus = CONFIG && CONFIG.EVENT_STATUS && CONFIG.EVENT_STATUS.COMPLETED ? String(CONFIG.EVENT_STATUS.COMPLETED).toUpperCase() : 'COMPLETED';
        const cancelledStatus = CONFIG && CONFIG.EVENT_STATUS && CONFIG.EVENT_STATUS.CANCELLED ? String(CONFIG.EVENT_STATUS.CANCELLED).toUpperCase() : 'CANCELLED';

        if (eventStatus === completedStatus) {
          return Utils.buildResponse(false, (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.EVENT_ALREADY_COMPLETED) ? CONFIG.MESSAGES.EVENT_ALREADY_COMPLETED : 'Event is already completed.');
        }
        if (eventStatus === cancelledStatus) {
          const msg = (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.EVENT_CANCELLED) ? CONFIG.MESSAGES.EVENT_CANCELLED : 'Attendance cannot be recorded for cancelled events.';
          return Utils.buildResponse(false, msg);
        }

        // Attendance window validation (Fail Closed)
        const windowResult = this._validateAttendanceWindow(eventId);
        if (windowResult) return windowResult;

        // Enterprise Configured Time Window verification
        if (event.attendance_window_start || event.attendance_window_end) {
          const nowMs = new Date().getTime();
          if (event.attendance_window_start) {
            const tStart = new Date(event.attendance_window_start).getTime();
            if (!isNaN(tStart) && nowMs < tStart) {
              return Utils.buildResponse(false, 'Attendance opening time has not started yet.');
            }
          }
          if (event.attendance_window_end) {
            const tEnd = new Date(event.attendance_window_end).getTime();
            if (!isNaN(tEnd) && nowMs > tEnd) {
              return Utils.buildResponse(false, 'Attendance scanning window has closed.');
            }
          }
        }

        // Manual Attendance Reason Verification
        if (methodStr.toLowerCase() === 'manual') {
          if (!attendanceData.reason && !attendanceData.manual_reason && !attendanceData.reasonText) {
            return Utils.buildResponse(false, 'A reason is mandatory for marking manual attendance.');
          }
        }

        // Date and Time Range validation (Handling night and overnight time ranges safely)
        if (methodStr.toLowerCase() !== 'manual') {
          const timezone = (CONFIG && CONFIG.DATE_TIME && CONFIG.DATE_TIME.TIMEZONE) ? CONFIG.DATE_TIME.TIMEZONE : 'Asia/Kolkata';
          const now = new Date();
          const todayStr = Utilities.formatDate(now, timezone, 'yyyy-MM-dd');
          const currentTimeStr = Utilities.formatDate(now, timezone, 'HH:mm');

          const formatYMD = (val) => {
            if (!val || val === 'N/A') return null;
            if (val instanceof Date) return Utilities.formatDate(val, timezone, 'yyyy-MM-dd');
            const s = String(val).trim().split('T')[0];
            const d = new Date(s);
            if (!isNaN(d.getTime())) return Utilities.formatDate(d, timezone, 'yyyy-MM-dd');
            return null;
          };

          const startDateCol = CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.START_DATE ? CONFIG.COLUMNS.START_DATE : 'Start Date';
          const endDateCol = CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.END_DATE ? CONFIG.COLUMNS.END_DATE : 'End Date';
          const sDate = formatYMD(event[startDateCol] || event.startDate || event.start_date);
          const eDate = formatYMD(event[endDateCol] || event.endDate || event.end_date);

          if (sDate && eDate && (todayStr < sDate || todayStr > eDate)) {
            return Utils.buildResponse(false, 'Attendance can only be recorded during the event duration (' + sDate + ' to ' + eDate + ').');
          }

          const startTimeCol = CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.START_TIME ? CONFIG.COLUMNS.START_TIME : 'Start Time';
          const endTimeCol = CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.END_TIME ? CONFIG.COLUMNS.END_TIME : 'End Time';
          const eventStartTimeRaw = event[startTimeCol] || event.startTime || event.start_time;
          const eventEndTimeRaw = event[endTimeCol] || event.endTime || event.end_time;

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
              let isWithinWindow = false;
              if (sTime <= eTime) {
                // Regular same-day window
                isWithinWindow = (currentTimeStr >= sTime && currentTimeStr <= eTime);
              } else {
                // Overnight window (e.g. 22:00 to 01:00)
                isWithinWindow = (currentTimeStr >= sTime || currentTimeStr <= eTime);
              }

              if (!isWithinWindow) {
                return Utils.buildResponse(false, 'Attendance can only be recorded between ' + sTime + ' and ' + eTime + ' (Current time: ' + currentTimeStr + ').');
              }
            }
          }
        }

        // Student existence check
        const student = StudentService.getStudentByRollNumber(rollNumber);
        if (!student) {
          return Utils.buildResponse(false, (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.STUDENT_NOT_FOUND) ? CONFIG.MESSAGES.STUDENT_NOT_FOUND : 'Student record not found.');
        }
        if (student && student.status) {
          const studentStatus = String(student.status).toUpperCase();
          const activeUserStatus = CONFIG && CONFIG.USER_STATUS && CONFIG.USER_STATUS.ACTIVE ? String(CONFIG.USER_STATUS.ACTIVE).toUpperCase() : 'ACTIVE';
          if (studentStatus !== activeUserStatus) {
            const msg = (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.STUDENT_INACTIVE) ? CONFIG.MESSAGES.STUDENT_INACTIVE : 'Student is inactive.';
            return Utils.buildResponse(false, msg);
          }
        }

        // Registration Eligibility Rules aligned with CoordinatorService
        // FIX 1 APPLIED
        const registrationRequired = this._isRegistrationEnabled(event);

        if (registrationRequired) {
          const participantEventKey =
            (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.EVENT_ID)
              ? CONFIG.COLUMNS.EVENT_ID
              : 'Event ID';

          let parts = [];

          try {
            parts = DatabaseService.findByColumn(
              CONFIG.SHEETS.EVENT_PARTICIPANTS,
              participantEventKey,
              eventId
            ) || [];
          } catch (e) {
            Logger.log(
              '[AttendanceService.markAttendance] Participant lookup fallback: ' +
              (e && e.message ? e.message : e)
            );

            const allParticipants =
              DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];

            parts = allParticipants.filter(p => {
              const pEventId = String(
                p[participantEventKey] ||
                p['Event ID'] ||
                p.event_id ||
                p.eventId ||
                ''
              ).trim();

              return pEventId === eventId;
            });
          }

          const validPart = parts.find(p => {
            const pRoll = String(
              p[
              (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.ROLL_NUMBER)
                ? CONFIG.COLUMNS.ROLL_NUMBER
                : 'Roll Number'
              ] ||
              p['Roll Number'] ||
              p.roll_number ||
              p.rollNumber ||
              ''
            ).trim().toUpperCase();

            if (pRoll !== rollNumber) return false;

            const pStatus = String(
              p[
              (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.REGISTRATION_STATUS)
                ? CONFIG.COLUMNS.REGISTRATION_STATUS
                : 'Registration Status'
              ] ||
              p['Registration Status'] ||
              p.registration_status ||
              p.status ||
              ''
            ).trim().toUpperCase();

            const deletionKey =
              (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.DELETION_FLAG)
                ? CONFIG.COLUMNS.DELETION_FLAG
                : 'Deletion Flag';

            const deleted = this._parseBoolean(
              p[deletionKey] !== undefined
                ? p[deletionKey]
                : p.deletion_flag
            );

            if (deleted) return false;

            if (
              pStatus === 'CANCELLED' ||
              pStatus === 'REJECTED' ||
              pStatus === 'DELETED'
            ) {
              return false;
            }

            return (
              pStatus === 'CONFIRMED' ||
              pStatus === 'ACTIVE' ||
              pStatus === 'APPROVED' ||
              pStatus === 'REGISTERED'
            );
          });

          if (!validPart) {
            const msg =
              (CONFIG &&
                CONFIG.MESSAGES &&
                CONFIG.MESSAGES.STUDENT_NOT_ACTIVE_PARTICIPANT)
                ? CONFIG.MESSAGES.STUDENT_NOT_ACTIVE_PARTICIPANT
                : 'Student is not an active participant for this event.';

            return Utils.buildResponse(false, msg);
          }
        }

        // 3. Lock Protected Transaction for Duplicate Check & Database Save
        const executeTransaction = () => {
          // Re-read attendance rows inside lock to ensure durable duplicate protection
          const allAtt = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
          const activeAtt = this._filterDeletedAttendance(allAtt);
          const existing = activeAtt.find(r =>
            this._getRecordEventId(r) === eventId &&
            this._getRecordRollNumber(r) === rollNumber
          );

          // FIX 2 APPLIED
          const checkOutKey =
            (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.CHECK_OUT_ENABLED)
              ? CONFIG.COLUMNS.CHECK_OUT_ENABLED
              : 'Check Out Enabled';

          let checkOutRaw;

          if (event[checkOutKey] !== undefined) {
            checkOutRaw = event[checkOutKey];
          } else if (event.check_out_enabled !== undefined) {
            checkOutRaw = event.check_out_enabled;
          } else if (event.checkOutEnabled !== undefined) {
            checkOutRaw = event.checkOutEnabled;
          } else {
            checkOutRaw = false;
          }

          const checkOutEnabled = this._parseBoolean(checkOutRaw);

          if (existing) {
            if (checkOutEnabled) {
              if (existing.check_out_timestamp) {
                return Utils.buildResponse(false, 'Already checked out at ' + new Date(existing.check_out_timestamp).toLocaleTimeString() + '. Initial Check-in: ' + new Date(existing.timestamp || existing.Timestamp).toLocaleTimeString());
              } else {
                // Perform Check-Out
                const checkOutTime = new Date();
                const duration = Math.round((checkOutTime - new Date(existing.timestamp || existing.Timestamp)) / 60000);

                const attIdCol = this._getAttendanceColumn('ATTENDANCE_ID', 'attendance_id');
                const targetAttId = existing[attIdCol] || existing.attendance_id || existing['Attendance ID'];

                const success = DatabaseService.updateRow(CONFIG.SHEETS.ATTENDANCE, attIdCol, targetAttId, {
                  check_out_timestamp: checkOutTime.toISOString(),
                  total_duration_minutes: duration
                });

                if (success) {
                  this._addEventScannedRoll(eventId, rollNumber);
                  return Utils.buildResponse(true, 'Check-out registered successfully! Duration: ' + duration + ' mins.');
                }
                return Utils.buildResponse(false, 'Failed to register check-out.');
              }
            } else {
              return Utils.buildResponse(false, 'Already checked in at ' + new Date(existing.timestamp || existing.Timestamp).toLocaleTimeString() + '. Duplicate scan blocked.');
            }
          }

          // Determine status
          let status = String(normalized.status || CONFIG.ATTENDANCE_STATUS.PRESENT).toUpperCase();
          const presentVal = CONFIG && CONFIG.ATTENDANCE_STATUS && CONFIG.ATTENDANCE_STATUS.PRESENT ? String(CONFIG.ATTENDANCE_STATUS.PRESENT).toUpperCase() : 'PRESENT';
          const absentVal = CONFIG && CONFIG.ATTENDANCE_STATUS && CONFIG.ATTENDANCE_STATUS.ABSENT ? String(CONFIG.ATTENDANCE_STATUS.ABSENT).toUpperCase() : 'ABSENT';

          if (status !== presentVal && status !== absentVal) {
            const msg = (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.INVALID_ATTENDANCE_STATUS) ? CONFIG.MESSAGES.INVALID_ATTENDANCE_STATUS : 'Invalid attendance status.';
            return Utils.buildResponse(false, msg);
          }

          // Generate Unique Attendance ID
          const newAttId = (typeof Utils !== 'undefined' && typeof Utils.generateId === 'function') ? Utils.generateId('ATT') : ('ATT_' + Date.now() + '_' + Math.floor(Math.random() * 1000));

          // 4. Attendance Save
          const now = new Date();
          const tz = (CONFIG && CONFIG.DATE_TIME && CONFIG.DATE_TIME.TIMEZONE) ? CONFIG.DATE_TIME.TIMEZONE : 'Asia/Kolkata';

          const newAttendance = {
            [this._getAttendanceColumn('ATTENDANCE_ID', 'Attendance ID')]: newAttId,
            [this._getAttendanceColumn('EVENT_ID', 'Event ID')]: eventId,
            [this._getAttendanceColumn('ROLL_NUMBER', 'Roll Number')]: rollNumber,
            [this._getAttendanceColumn('USER_ID', 'User ID')]: userId,
            [this._getAttendanceColumn('ATTENDANCE_STATUS', 'Attendance Status')]: status,
            [this._getAttendanceColumn('ATTENDANCE_METHOD', 'Attendance Method')]: methodStr,
            'Date': Utilities.formatDate(now, tz, 'yyyy-MM-dd'),
            'Time': Utilities.formatDate(now, tz, 'HH:mm:ss'),
            'Timestamp': now.toISOString(),
            'Is Undo': false,
            'Correction Requested': false,
            [this._getDeletionFlagKey()]: false
          };

          if (methodStr.toLowerCase() === 'manual' && (attendanceData.reason || attendanceData.manual_reason)) {
            newAttendance['Reason'] = attendanceData.reason || attendanceData.manual_reason;
          }

          const success = DatabaseService.insertRow(CONFIG.SHEETS.ATTENDANCE, newAttendance);

          if (success) {
            this._addEventScannedRoll(eventId, rollNumber);

            const studentRec = StudentService.getStudentByRollNumber(rollNumber);
            let studentInfo = null;
            if (studentRec) {
              studentInfo = {
                name: studentRec[CONFIG.COLUMNS.STUDENT_NAME] || studentRec['Student Name'] || '',
                dept: studentRec[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] || studentRec['Department ID'] || studentRec['Department'] || '',
                year: studentRec[CONFIG.COLUMNS.STUDENT_YEAR] || studentRec['Year'] || '',
                branch: studentRec['Branch'] || studentRec['Department ID'] || ''
              };
            }

            const successMsg = (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_MARKED) ? CONFIG.MESSAGES.ATTENDANCE_MARKED : 'Attendance marked successfully.';
            const resp = Utils.buildResponse(true, successMsg, {
              attendance: newAttendance,
              student: studentInfo
            });

            // Non-fatal Audit & Notification side effects
            try {
              if (typeof AuditService !== 'undefined' && typeof AuditService.logAction === 'function') {
                AuditService.logAction(userId, 'AttendanceService', 'MARK_ATTENDANCE', eventId, 'Attendance', 'Attendance marked', '', 'SUCCESS', userId);
              }
            } catch (error) {
              Logger.log('Audit Log Error: ' + error.message);
            }

            try {
              if (typeof NotificationService !== 'undefined' && typeof NotificationService.createNotification === 'function') {
                NotificationService.createNotification({
                  user_id: userId,
                  title: 'Attendance Marked',
                  message: 'Attendance marked for event ' + eventId + ' (Roll ' + rollNumber + ').',
                  type: 'Attendance',
                  related_event_id: eventId
                });
              }
            } catch (error) {
              Logger.log('Notification Error: ' + error.message);
            }

            Logger.log('[END] AttendanceService.markAttendance | Execution Time: ' + (Date.now() - startTime) + 'ms');
            return resp;
          }

          return Utils.buildResponse(false, (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_MARK_FAILED) ? CONFIG.MESSAGES.ATTENDANCE_MARK_FAILED : 'Attendance marking failed.');
        };

        if (typeof LockManager !== 'undefined' && typeof LockManager.withLock === 'function') {
          return LockManager.withLock('Script', 15000, executeTransaction);
        } else {
          const lock = LockService.getScriptLock();
          try {
            if (lock.tryLock(15000)) {
              return executeTransaction();
            } else {
              return Utils.buildResponse(false, 'System busy. Unable to acquire lock for attendance write.');
            }
          } finally {
            try { lock.releaseLock(); } catch (e) { }
          }
        }
      }
    );
  },

  /**
   * Deletes an attendance record safely (Soft Delete).
   * @param {string} attendanceId
   * @param {string} userId - Injected by SessionService
   * @returns {object} Standard response object.
   */
  deleteAttendance: function (attendanceId, userId) {
    return this._tryWrap(
      'deleteAttendance',
      (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_DELETE_FAILED) ? CONFIG.MESSAGES.ATTENDANCE_DELETE_FAILED : 'Attendance deletion failed.',
      () => {
        const startTime = Date.now();
        Logger.log('[START] AttendanceService.deleteAttendance | Attendance ID: ' + attendanceId);

        const sheetName = CONFIG.SHEETS.ATTENDANCE;

        const attendanceRecord = this.getAttendanceById(attendanceId);
        if (!attendanceRecord) {
          return Utils.buildResponse(false, (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_NOT_FOUND) ? CONFIG.MESSAGES.ATTENDANCE_NOT_FOUND : 'Attendance record not found.');
        }

        const attendanceEventId = this._getRecordEventId(attendanceRecord);

        // Authorization Check
        const isAuthorized = this._validateCoordinatorAccess(userId, attendanceEventId);
        if (!isAuthorized) {
          const msg = (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.UNAUTHORIZED) ? CONFIG.MESSAGES.UNAUTHORIZED : 'Unauthorized access.';
          return Utils.buildResponse(false, msg);
        }

        const event = EventService.getEventById(attendanceEventId);
        const eventStatus = event ? String(event.status || event['Status'] || '').toUpperCase() : '';
        const completedStatus = CONFIG && CONFIG.EVENT_STATUS && CONFIG.EVENT_STATUS.COMPLETED ? String(CONFIG.EVENT_STATUS.COMPLETED).toUpperCase() : 'COMPLETED';
        const cancelledStatus = CONFIG && CONFIG.EVENT_STATUS && CONFIG.EVENT_STATUS.CANCELLED ? String(CONFIG.EVENT_STATUS.CANCELLED).toUpperCase() : 'CANCELLED';

        if (eventStatus === completedStatus) {
          return Utils.buildResponse(false, (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.EVENT_ALREADY_COMPLETED) ? CONFIG.MESSAGES.EVENT_ALREADY_COMPLETED : 'Event is already completed.');
        }
        if (eventStatus === cancelledStatus) {
          const msg = (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.EVENT_CANCELLED) ? CONFIG.MESSAGES.EVENT_CANCELLED : 'Cannot delete attendance for cancelled events.';
          return Utils.buildResponse(false, msg);
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
        const success = DatabaseService.updateRow(sheetName, attendanceIdKey, attendanceId, updateData);

        if (success) {
          const attendanceRoll = this._getRecordRollNumber(attendanceRecord);
          this._removeEventScannedRoll(attendanceEventId, attendanceRoll);

          const successMsg = (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_DELETED) ? CONFIG.MESSAGES.ATTENDANCE_DELETED : 'Attendance deleted successfully.';
          const resp = Utils.buildResponse(true, successMsg);

          try {
            if (typeof AuditService !== 'undefined' && typeof AuditService.logAction === 'function') {
              AuditService.logAction(userId, 'AttendanceService', 'DELETE_ATTENDANCE', attendanceId, 'Attendance', 'Attendance deleted', '', 'SUCCESS', userId);
            }
          } catch (error) {
            Logger.log('Audit Log Error: ' + error.message);
          }
          Logger.log('[END] AttendanceService.deleteAttendance | Execution Time: ' + (Date.now() - startTime) + 'ms');
          return resp;
        }

        return Utils.buildResponse(false, (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.ATTENDANCE_DELETE_FAILED) ? CONFIG.MESSAGES.ATTENDANCE_DELETE_FAILED : 'Attendance deletion failed.');
      }
    );
  },

  /**
   * Retrieves an active attendance record by ID.
   * @param {string} attendanceId
   * @returns {object|null}
   */
  getAttendanceById: function (attendanceId) {
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
  getAttendanceByEvent: function (eventId) {
    return this._tryWrap('getAttendanceByEvent', () => {
      if (!eventId) return [];
      const cleanEventId = String(eventId).trim();
      const allAttendance = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
      const active = this._filterDeletedAttendance(allAttendance);
      const filtered = active.filter(r => this._getRecordEventId(r) === cleanEventId);
      return this._sortByAttendanceTimeDesc(filtered);
    });
  },

  /**
   * Retrieves attendance records by Student Roll Number.
   * @param {string} rollNumber
   * @returns {object[]}
   */
  getAttendanceByStudent: function (rollNumber) {
    return this._tryWrap('getAttendanceByStudent', () => {
      if (!rollNumber) return [];
      const cleanRoll = String(rollNumber).trim().toUpperCase();
      const allAttendance = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
      const active = this._filterDeletedAttendance(allAttendance);
      const filtered = active.filter(r => this._getRecordRollNumber(r) === cleanRoll);
      return this._sortByAttendanceTimeDesc(filtered);
    });
  },

  /**
   * Retrieves attendance records by Date.
   * @param {string} date
   * @returns {object[]}
   */
  getAttendanceByDate: function (date) {
    return this._tryWrap('getAttendanceByDate', () => {
      if (!date) return [];
      const timezone = (CONFIG && CONFIG.DATE_TIME && CONFIG.DATE_TIME.TIMEZONE) ? CONFIG.DATE_TIME.TIMEZONE : 'Asia/Kolkata';
      const targetDate = Utils.formatDate(date);
      const allAttendance = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
      const active = this._filterDeletedAttendance(allAttendance);

      const filtered = active.filter(record => {
        const val = this._getRecordTimestamp(record) || record.Date || record.date;
        if (!val) return false;
        let formatted = Utils.formatDate(val);
        if (val instanceof Date) {
          formatted = Utilities.formatDate(val, timezone, 'yyyy-MM-dd');
        }
        return formatted === targetDate;
      });

      return this._sortByAttendanceTimeDesc(filtered);
    });
  },

  /**
   * Retrieves attendance records by Status.
   * @param {string} status
   * @returns {object[]}
   */
  getAttendanceByStatus: function (status) {
    return this._tryWrap('getAttendanceByStatus', () => {
      if (!status) return [];
      const targetStatus = String(status).trim().toUpperCase();
      const allAttendance = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
      const active = this._filterDeletedAttendance(allAttendance);
      const filtered = active.filter(r => this._getRecordStatus(r) === targetStatus);
      return this._sortByAttendanceTimeDesc(filtered);
    });
  },

  /**
   * Gets the attendance counts for an event (Deduplicated per student).
   * @param {string} eventId
   * @returns {object} {total, present, absent}
   */
  getEventAttendanceCount: function (eventId) {
    return this._tryWrap('getEventAttendanceCount', () => {
      const records = this.getAttendanceByEvent(eventId);

      // Deduplicate by student roll number
      const studentMap = new Map();
      records.forEach(record => {
        const roll = this._getRecordRollNumber(record);
        if (roll && !studentMap.has(roll)) {
          studentMap.set(roll, record);
        }
      });

      let present = 0;
      let absent = 0;
      const presentVal = CONFIG && CONFIG.ATTENDANCE_STATUS && CONFIG.ATTENDANCE_STATUS.PRESENT ? String(CONFIG.ATTENDANCE_STATUS.PRESENT).toUpperCase() : 'PRESENT';
      const absentVal = CONFIG && CONFIG.ATTENDANCE_STATUS && CONFIG.ATTENDANCE_STATUS.ABSENT ? String(CONFIG.ATTENDANCE_STATUS.ABSENT).toUpperCase() : 'ABSENT';

      studentMap.forEach(record => {
        const st = this._getRecordStatus(record);
        if (st === presentVal) present++;
        else if (st === absentVal) absent++;
      });

      return { total: studentMap.size, present: present, absent: absent };
    });
  },

  /**
   * Gets the total active attendance records count for a student.
   * @param {string} rollNumber
   * @returns {number} Total attendance records count.
   */
  getStudentAttendanceCount: function (rollNumber) {
    return this._tryWrap('getStudentAttendanceCount', () => {
      const records = this.getAttendanceByStudent(rollNumber);
      // Deduplicate by Event ID
      const eventSet = new Set();
      records.forEach(r => {
        const eId = this._getRecordEventId(r);
        if (eId) eventSet.add(eId);
      });
      return eventSet.size;
    });
  },

  /**
   * Gets the summarized attendance data for a student across distinct events.
   * @param {string} rollNumber
   * @returns {object} {totalEvents, present, absent}
   */
  getStudentAttendanceSummary: function (rollNumber) {
    return this._tryWrap('getStudentAttendanceSummary', () => {
      const records = this.getAttendanceByStudent(rollNumber);

      // Deduplicate by event ID
      const eventMap = new Map();
      records.forEach(record => {
        const eId = this._getRecordEventId(record);
        if (eId && !eventMap.has(eId)) {
          eventMap.set(eId, record);
        }
      });

      let present = 0;
      let absent = 0;
      const presentVal = CONFIG && CONFIG.ATTENDANCE_STATUS && CONFIG.ATTENDANCE_STATUS.PRESENT ? String(CONFIG.ATTENDANCE_STATUS.PRESENT).toUpperCase() : 'PRESENT';
      const absentVal = CONFIG && CONFIG.ATTENDANCE_STATUS && CONFIG.ATTENDANCE_STATUS.ABSENT ? String(CONFIG.ATTENDANCE_STATUS.ABSENT).toUpperCase() : 'ABSENT';

      eventMap.forEach(record => {
        const st = this._getRecordStatus(record);
        if (st === presentVal) present++;
        else if (st === absentVal) absent++;
      });

      return { totalEvents: eventMap.size, present: present, absent: absent };
    });
  },

  /**
   * Gets overall attendance statistics across all events (Deduplicated).
   * @returns {object} {totalAttendance, present, absent, attendancePercentage}
   */
  getOverallAttendanceStatistics: function () {
    return this._tryWrap('getOverallAttendanceStatistics', () => {
      const allAttendance = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
      const active = this._filterDeletedAttendance(allAttendance);

      // Deduplicate active entries by EventID + RollNumber
      // FIX 5 APPLIED
      const uniqueMap = new Map();
      active.forEach(record => {
        const eventId = this._getRecordEventId(record);
        const rollNumber = this._getRecordRollNumber(record);

        if (!eventId || !rollNumber) return;

        const key = eventId + '|' + rollNumber;

        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, record);
        }
      });

      let present = 0;
      let absent = 0;
      const presentVal = CONFIG && CONFIG.ATTENDANCE_STATUS && CONFIG.ATTENDANCE_STATUS.PRESENT ? String(CONFIG.ATTENDANCE_STATUS.PRESENT).toUpperCase() : 'PRESENT';
      const absentVal = CONFIG && CONFIG.ATTENDANCE_STATUS && CONFIG.ATTENDANCE_STATUS.ABSENT ? String(CONFIG.ATTENDANCE_STATUS.ABSENT).toUpperCase() : 'ABSENT';

      uniqueMap.forEach(record => {
        const st = this._getRecordStatus(record);
        if (st === presentVal) present++;
        else if (st === absentVal) absent++;
      });

      const totalAttendance = uniqueMap.size;
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
  getAttendanceSummaryByEvent: function (eventId) {
    return this._tryWrap('getAttendanceSummaryByEvent', () => {
      const event = EventService.getEventById(eventId);
      if (!event) return null;

      const counts = this.getEventAttendanceCount(eventId);
      return {
        eventId: event.event_id || event['Event ID'] || eventId,
        eventName: event.event_name || event['Event Name'] || '',
        total: counts.total,
        present: counts.present,
        absent: counts.absent
      };
    });
  },

  /**
   * Retrieves day-wise attendance for an event with safe local timezone handling.
   */
  getEventDayAttendance: function (eventId, dayNumber, userContext) {
    return this._tryWrap('getEventDayAttendance', () => {
      if (userContext && typeof SecurityUtils !== 'undefined' && typeof SecurityUtils.canAccessEvent === 'function') {
        if (!SecurityUtils.canAccessEvent(eventId, userContext)) {
          return Utils.buildResponse(false, 'Access denied for event attendance.');
        }
      }

      const event = EventService.getEventById(eventId, userContext);
      if (!event) return Utils.buildResponse(false, 'Event not found');

      const timezone = (CONFIG && CONFIG.DATE_TIME && CONFIG.DATE_TIME.TIMEZONE) ? CONFIG.DATE_TIME.TIMEZONE : 'Asia/Kolkata';
      const startDateCol = CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.START_DATE ? CONFIG.COLUMNS.START_DATE : 'Start Date';
      const startDateStr = event[startDateCol] || event.startDate || event.start_date;

      // FIX 6 APPLIED
      let start = new Date(startDateStr);

      if (!startDateStr || isNaN(start.getTime())) {
        return Utils.buildResponse(
          false,
          'Invalid or missing event start date.'
        );
      }

      const parsedDayNumber = parseInt(dayNumber, 10);

      if (!Number.isFinite(parsedDayNumber) || parsedDayNumber < 1) {
        return Utils.buildResponse(
          false,
          'Invalid event day number.'
        );
      }

      const targetDate = new Date(start.getTime());
      targetDate.setDate(start.getDate() + (parsedDayNumber - 1));
      const targetDateStr = Utilities.formatDate(targetDate, timezone, 'yyyy-MM-dd');

      const records = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
      const activeRecords = this._filterDeletedAttendance(records);

      const cleanEventId = String(eventId).trim();
      const eventRecords = activeRecords.filter(r => this._getRecordEventId(r) === cleanEventId);

      const dayRecords = eventRecords.filter(r => {
        const timestampVal = this._getRecordTimestamp(r) || r.Date || r.date;
        if (!timestampVal) return false;
        let dStr = '';
        if (timestampVal instanceof Date) {
          dStr = Utilities.formatDate(timestampVal, timezone, 'yyyy-MM-dd');
        } else {
          const d = new Date(timestampVal);
          if (!isNaN(d.getTime())) {
            dStr = Utilities.formatDate(d, timezone, 'yyyy-MM-dd');
          } else {
            dStr = Utils.formatDate(timestampVal);
          }
        }
        return dStr === targetDateStr;
      });

      // Check registration requirement safely
      const registrationRequired = this._isRegistrationEnabled(event);

      let eventParticipants = [];
      if (registrationRequired) {
        const participants = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];
        eventParticipants = participants.filter(p => {
          const pEventId = String(p['Event ID'] || p.event_id || p.eventId || '').trim();
          if (pEventId !== cleanEventId) return false;

          const pStatus = String(p['Registration Status'] || p.status || p.registration_status || '').trim().toUpperCase();
          const isCancelled = pStatus === 'CANCELLED' || pStatus === 'REJECTED' || pStatus === 'DELETED';
          if (isCancelled) return false;

          return !this._isDeletedAttendance(p);
        });
      }

      // FIX 4 APPLIED
      if (registrationRequired && eventParticipants.length > 0) {
        const uniqueParticipants = new Map();

        eventParticipants.forEach(p => {
          const roll = String(
            p['Roll Number'] ||
            p.roll_number ||
            p.rollNumber ||
            ''
          ).trim().toUpperCase();

          if (roll && !uniqueParticipants.has(roll)) {
            uniqueParticipants.set(roll, p);
          }
        });

        eventParticipants = Array.from(uniqueParticipants.values());
      }

      // Map day records by Roll Number (Deduplicated)
      const dayRecordsMap = {};
      dayRecords.forEach(r => {
        const roll = this._getRecordRollNumber(r);
        if (roll && !dayRecordsMap[roll]) {
          dayRecordsMap[roll] = r;
        }
      });

      const finalAttendance = [];
      let presentCount = 0;

      // FIX 3 APPLIED
      if (registrationRequired) {
        // Load student profiles for virtual absent mapping
        let studentMap = new Map();
        try {
          const allStudentsResponse = StudentService.getAllStudents();
          const allStudents = (allStudentsResponse && allStudentsResponse.success) ? allStudentsResponse.students : [];
          (allStudents || []).forEach(s => {
            const roll = String(s['Roll Number'] || s.roll_number || s.rollNumber || '').trim().toUpperCase();
            if (roll) studentMap.set(roll, s);
          });
        } catch (e) {
          Logger.log('Student load error in getEventDayAttendance: ' + e.message);
        }

        eventParticipants.forEach(p => {
          const roll = String(p['Roll Number'] || p.roll_number || p.rollNumber || '').trim().toUpperCase();
          if (!roll) return;
          const record = dayRecordsMap[roll];
          if (record) {
            const status = this._getRecordStatus(record);
            if (status === 'PRESENT') presentCount++;

            const student = studentMap.get(roll) || {};
            finalAttendance.push({
              'Roll Number': roll,
              'Student Name': record['Student Name'] || record.student_name || record.name || p['Student Name'] || student['Student Name'] || '--',
              'Department ID': record['Department ID'] || record.department_id || record.department || p['Department ID'] || student['Department'] || '--',
              'Year': record['Year'] || record.year || p['Year'] || student['Year'] || '--',
              'Section': record['Section'] || record.section || p['Section'] || student['Section'] || '--',
              'Attendance Status': status,
              'Timestamp': this._getRecordTimestamp(record) || '--'
            });
          } else {
            const student = studentMap.get(roll) || {};
            finalAttendance.push({
              'Roll Number': roll,
              'Student Name': p['Student Name'] || student['Student Name'] || student.student_name || '--',
              'Department ID': p['Department ID'] || student['Department'] || student.department || '--',
              'Year': p['Year'] || student['Year'] || student.year || '--',
              'Section': p['Section'] || student['Section'] || student.section || '--',
              'Attendance Status': 'ABSENT',
              'Timestamp': '--'
            });
          }
        });

        const totalRegistered = eventParticipants.length;
        const absentCount = Math.max(0, totalRegistered - presentCount);
        const attendancePercentage = totalRegistered > 0 ? Math.round((presentCount / totalRegistered) * 100) : 0;

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
      } else {
        // Open Event or No-Registration Event
        Object.keys(dayRecordsMap).forEach(roll => {
          const record = dayRecordsMap[roll];
          const status = this._getRecordStatus(record);
          if (status === 'PRESENT') presentCount++;

          finalAttendance.push({
            'Roll Number': roll,
            'Student Name': record['Student Name'] || record.student_name || record.name || '--',
            'Department ID': record['Department ID'] || record.department_id || record.department || '--',
            'Year': record['Year'] || record.year || '--',
            'Section': record['Section'] || record.section || '--',
            'Attendance Status': status,
            'Timestamp': this._getRecordTimestamp(record) || '--'
          });
        });

        const totalRegistered = finalAttendance.length;
        const absentCount = 0;
        const attendancePercentage = totalRegistered > 0 ? Math.round((presentCount / totalRegistered) * 100) : 0;

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
      }
    });
  },

  // Backward-compatibility Aliases for Test Suite
  getStudentAttendanceHistory: function(rollNumber) {
    return this.getAttendanceByStudent(rollNumber);
  },

  getEventAttendance: function(eventId) {
    return this.getAttendanceByEvent(eventId);
  },

  getAttendanceSummary: function(eventId) {
    return this.getAttendanceSummaryByEvent(eventId);
  },

  getAttendanceSummaryByEvent: function(eventId) {
    try {
      if (!eventId) return Utils.buildResponse(false, 'Event ID required');
      var allAttendance = DatabaseService.findByColumn(CONFIG.SHEETS.ATTENDANCE, CONFIG.COLUMNS.EVENT_ID || 'Event ID', eventId) || [];
      var activeAttendance = allAttendance.filter(r => !r.deletion_flag && String(r['Deletion Flag']).toLowerCase() !== 'true');
      var presentCount = activeAttendance.length;
      return Utils.buildResponse(true, 'Attendance summary retrieved successfully', {
        summary: {
          eventId: eventId,
          totalPresent: presentCount,
          totalAttended: presentCount
        },
        totalPresent: presentCount
      });
    } catch(e) {
      return Utils.buildResponse(false, 'Failed to retrieve attendance summary');
    }
  },

  removeIncorrectAttendance: function(attendanceId, userId) {
    try {
      if (!attendanceId) return Utils.buildResponse(false, 'Attendance ID required');
      var sheet = CONFIG.SHEETS.ATTENDANCE;
      var pk = CONFIG.ID_COLUMNS.ATTENDANCE || 'Attendance ID';
      var deleted = DatabaseService.softDeleteRow ? DatabaseService.softDeleteRow(sheet, pk, attendanceId) : DatabaseService.hardDelete(sheet, pk, attendanceId);
      return Utils.buildResponse(true, 'Attendance record removed successfully.');
    } catch(e) {
      return Utils.buildResponse(false, 'Failed to remove attendance record.');
    }
  },

  deleteAttendanceRecord: function(attendanceId, userId) {
    return this.removeIncorrectAttendance(attendanceId, userId);
  }

};