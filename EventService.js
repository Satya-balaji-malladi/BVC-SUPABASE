/**
 * EventService.gs
 * Service for handling event management.
 * Responsibilities: CRUD operations for events, status updates, searching, filtering, sorting, pagination, statistics, and attendance helpers.
 */
const EventService = {

  // ==========================================================
  // Internal helpers (private)
  // ==========================================================

  _normalizeEventTime_: function(timeValue) {
    // Normalizes event start time for dedup/search.
    // Handles values like "HH:mm", "HH:mm:ss" and Date objects as best-effort.
    try {
      if (timeValue === null || timeValue === undefined) return '';

      // If it is a Date object, format to HH:mm directly
      if (timeValue instanceof Date || (typeof timeValue === 'object' && typeof timeValue.getHours === 'function')) {
        return Utilities.formatDate(timeValue, CONFIG.DATE_TIME.TIMEZONE, 'HH:mm');
      }

      var s = String(timeValue).trim();
      if (!s) return '';

      // If it's a full date-time string containing time
      if (s.includes('1899') || s.includes('GMT') || (s.length > 8 && !isNaN(Date.parse(s)))) {
        var parsedDate = new Date(s);
        if (!isNaN(parsedDate.getTime())) {
          return Utilities.formatDate(parsedDate, CONFIG.DATE_TIME.TIMEZONE, 'HH:mm');
        }
      }

      // If already HH:mm:ss keep first HH:mm
      // e.g. "09:30:00" -> "09:30"
      var m = s.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
      if (m) return m[1] + ':' + m[2];

      // Fallback: return trimmed string
      return s;
    } catch (e) {
      Logger.log('EventService._normalizeEventTime_ error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  _safeDeletionFlag_(eventRecord) {
    // Deletion flag can be boolean or string in sheets.
    try {
      if (!eventRecord || !CONFIG || !CONFIG.COLUMNS || !CONFIG.COLUMNS.DELETION_FLAG) return false;
      var v = eventRecord[CONFIG.COLUMNS.DELETION_FLAG];
      if (v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1') return true;
      return false;
    } catch (e) {
      Logger.log('EventService._safeDeletionFlag_ error: ' + (e && e.message ? e.message : e));
      return false;
    }
  },

  _getActiveEventsForDedup_: function() {
    // Best-effort reuse to reduce duplicate DatabaseService reads.
    // Cache is per invocation of EventService object (no cross-request persistence).
    try {
      if (this._activeEventsForDedup_ && Array.isArray(this._activeEventsForDedup_)) {
        return this._activeEventsForDedup_;
      }

      var events = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
      var active = events.filter(function(e) { return !EventService._safeDeletionFlag_(e); });
      this._activeEventsForDedup_ = active;
      return active;
    } catch (e) {
      Logger.log('EventService._getActiveEventsForDedup_ error: ' + (e && e.message ? e.message : e));
      return [];
    }
  },

  _evaluateEventStatus_: function(eventRecord) {
    try {
      if (!eventRecord) return eventRecord;

      var c = CONFIG || {};
      var cols = c.COLUMNS || {};
      var statusKey = eventRecord['Event Status'] !== undefined ? 'Event Status' : (cols.STATUS || null);

      var draft = (c.EVENT_STATUS && c.EVENT_STATUS.DRAFT) ? c.EVENT_STATUS.DRAFT : 'Draft';
      var active = (c.EVENT_STATUS && c.EVENT_STATUS.ACTIVE) ? c.EVENT_STATUS.ACTIVE : 'Active';
      var completed = (c.EVENT_STATUS && c.EVENT_STATUS.COMPLETED) ? c.EVENT_STATUS.COMPLETED : 'Completed';
      var cancelled = (c.EVENT_STATUS && c.EVENT_STATUS.CANCELLED) ? c.EVENT_STATUS.CANCELLED : 'Cancelled';
      var stopped = (c.EVENT_STATUS && c.EVENT_STATUS.STOPPED) ? c.EVENT_STATUS.STOPPED : 'Stopped';
      var upcoming = (c.EVENT_STATUS && c.EVENT_STATUS.UPCOMING) ? c.EVENT_STATUS.UPCOMING : 'Upcoming';

      // 1. If deleted/cancelled
      if (this._safeDeletionFlag_(eventRecord) || (statusKey && (eventRecord[statusKey] === cancelled || eventRecord[statusKey] === 'Cancelled'))) {
        if (statusKey) eventRecord[statusKey] = cancelled;
        return eventRecord;
      }

      // 2. If explicitly Draft or Stopped by admin, respect that status (do not auto-evaluate to Completed/Active)
      var currentEvtStatus = eventRecord['Event Status'] !== undefined ? eventRecord['Event Status'] : (eventRecord.event_status || eventRecord.status || (statusKey ? eventRecord[statusKey] : null));
      if (currentEvtStatus === draft || currentEvtStatus === 'Draft' || currentEvtStatus === stopped || currentEvtStatus === 'Stopped') {
        return eventRecord;
      }

      // 3. Dynamic evaluation based on time
      const startVal = eventRecord['Start Date'] || eventRecord['start_date'] || eventRecord['startDate'] || null;
      const startTimeVal = eventRecord['Start Time'] || eventRecord['start_time'] || eventRecord['startTime'] || '00:00:00';
      const endVal = eventRecord['End Date'] || eventRecord['end_date'] || eventRecord['endDate'] || null;
      const endTimeVal = eventRecord['End Time'] || eventRecord['end_time'] || eventRecord['endTime'] || '23:59:59';

      const timezone = CONFIG.DATE_TIME.TIMEZONE || 'Asia/Kolkata';

      function getFormattedDateTime(dateVal, timeVal, defaultTime) {
        if (!dateVal) return null;
        let d = (dateVal instanceof Date) ? new Date(dateVal.getTime()) : new Date(dateVal);
        if (isNaN(d.getTime())) return null;
        
        let dateStr = Utilities.formatDate(d, timezone, 'yyyy-MM-dd');
        
        let timeStr = defaultTime || '00:00';
        if (timeVal) {
          if (timeVal instanceof Date) {
            timeStr = Utilities.formatDate(timeVal, timezone, 'HH:mm');
          } else {
            let tStr = String(timeVal).trim();
            if (tStr.includes('T') || tStr.includes('GMT') || tStr.includes('1899') || (tStr.length > 8 && !isNaN(Date.parse(tStr)))) {
              let parsedTime = new Date(tStr);
              if (!isNaN(parsedTime.getTime())) {
                timeStr = Utilities.formatDate(parsedTime, timezone, 'HH:mm');
              }
            } else {
              const match = tStr.toUpperCase().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/);
              if (match) {
                let hours = parseInt(match[1], 10);
                const minutes = match[2];
                const ampm = match[3];
                if (ampm === 'PM' && hours < 12) {
                  hours += 12;
                } else if (ampm === 'AM' && hours === 12) {
                  hours = 0;
                }
                timeStr = `${String(hours).padStart(2, '0')}:${minutes}`;
              }
            }
          }
        }
        return `${dateStr} ${timeStr}`;
      }

      const startDateTimeStr = getFormattedDateTime(startVal, startTimeVal, '00:00');
      const endDateTimeStr = getFormattedDateTime(endVal, endTimeVal, '23:59');
      const nowStr = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd HH:mm');

      var currentStatus = statusKey ? eventRecord[statusKey] : 'Active';
      var newStatus = currentStatus;

      if (startDateTimeStr && endDateTimeStr) {
        if (nowStr < startDateTimeStr) {
          newStatus = upcoming;
        } else if (nowStr >= startDateTimeStr && nowStr <= endDateTimeStr) {
          newStatus = active;
        } else {
          newStatus = completed;
        }
      } else if (startDateTimeStr) {
        if (nowStr < startDateTimeStr) {
          newStatus = upcoming;
        } else {
          newStatus = active;
        }
      } else {
        newStatus = active;
      }

      if (statusKey && newStatus !== currentStatus) {
        eventRecord[statusKey] = newStatus;
        try {
          DatabaseService.updateRow(CONFIG.SHEETS.EVENTS, CONFIG.ID_COLUMNS.EVENTS, eventRecord[CONFIG.COLUMNS.EVENT_ID], {
            [statusKey]: newStatus
          });
        } catch (dbErr) {
          Logger.log('Error auto-updating event status in sheet: ' + dbErr);
        }
      }

      return eventRecord;
    } catch (e) {
      Logger.log('EventService._evaluateEventStatus_ error: ' + (e && e.message ? e.message : e));
      return eventRecord;
    }
  },

  _getAllActiveSanitizedEvents_: function() {
    try {
      if (this._allActiveSanitizedEvents_) return this._allActiveSanitizedEvents_;

      var events = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
      var filtered = events.filter(function(e) { return !EventService._safeDeletionFlag_(e); });
      var evaluated = filtered.map(function(e) { return EventService._evaluateEventStatus_(e); });
      this._allActiveSanitizedEvents_ = evaluated.map(function(e) { return Utils.sanitizeEvent(e); });
      return this._allActiveSanitizedEvents_;
    } catch (error) {
      Logger.log('EventService._getAllActiveSanitizedEvents_ error: ' + (error && error.message ? error.message : error));
      this._allActiveSanitizedEvents_ = [];
      return [];
    }
  },

  _getEventValidationPayload_: function(eventData) {
    try {
      var out = {};
      out.eventName = eventData && (eventData[CONFIG.COLUMNS.EVENT_NAME] !== undefined ? eventData[CONFIG.COLUMNS.EVENT_NAME] : (eventData.eventName || eventData.event_name));
      out.startDate = eventData && (eventData[CONFIG.COLUMNS.START_DATE] !== undefined ? eventData[CONFIG.COLUMNS.START_DATE] : (eventData.startDate || eventData.start_date));
      out.endDate = eventData && (eventData[CONFIG.COLUMNS.END_DATE] !== undefined ? eventData[CONFIG.COLUMNS.END_DATE] : (eventData.endDate || eventData.end_date));
      out.startTime = eventData && (eventData[CONFIG.COLUMNS.START_TIME] !== undefined ? eventData[CONFIG.COLUMNS.START_TIME] : (eventData.startTime || eventData.start_time));
      out.endTime = eventData && (eventData[CONFIG.COLUMNS.END_TIME] !== undefined ? eventData[CONFIG.COLUMNS.END_TIME] : (eventData.endTime || eventData.end_time));
      out.venueId = eventData && (eventData[CONFIG.COLUMNS.VENUE] !== undefined ? eventData[CONFIG.COLUMNS.VENUE] : (eventData.venueId || eventData.venue || eventData.location));
      out.status = eventData && (eventData[CONFIG.COLUMNS.EVENT_STATUS] !== undefined ? eventData[CONFIG.COLUMNS.EVENT_STATUS] : (eventData[CONFIG.COLUMNS.STATUS] !== undefined ? eventData[CONFIG.COLUMNS.STATUS] : eventData.status));
      return out;
    } catch (e) {
      Logger.log('EventService._getEventValidationPayload_ error: ' + (e && e.message ? e.message : e));
      return {
        eventName: eventData && (eventData[CONFIG.COLUMNS.EVENT_NAME] || eventData.eventName || eventData.event_name),
        startDate: eventData && (eventData[CONFIG.COLUMNS.START_DATE] || eventData.startDate || eventData.start_date),
        endDate: eventData && (eventData[CONFIG.COLUMNS.END_DATE] || eventData.endDate || eventData.end_date),
        startTime: eventData && (eventData[CONFIG.COLUMNS.START_TIME] || eventData.startTime || eventData.start_time),
        endTime: eventData && (eventData[CONFIG.COLUMNS.END_TIME] || eventData.endTime || eventData.end_time),
        venueId: eventData && (eventData[CONFIG.COLUMNS.VENUE] || eventData.venueId || eventData.venue || eventData.location),
        status: eventData && (eventData[CONFIG.COLUMNS.EVENT_STATUS] || eventData[CONFIG.COLUMNS.STATUS] || eventData.status)
      };
    }
  },

  _invalidateCaches_: function(eventId) {
    try {
      delete this._allActiveSanitizedEvents_;
      delete this._activeEventsForDedup_;
      if (typeof CacheManager !== 'undefined') {
        CacheManager.clearByPrefix("event_by_id");
        if (eventId) {
          CacheManager.remove("event_by_id_" + eventId);
        }
      }
    } catch (e) {
      Logger.log('EventService._invalidateCaches_ error: ' + (e && e.message ? e.message : e));
    }
  },

  _isDuplicateEvent: function(eventName, eventStartDate, venue, startTime, excludeEventId) {
    try {
      // Reuse cached active events (best-effort). Fallback to direct read if cache is unavailable.
      const activeEvents = this._getActiveEventsForDedup_();
      if (!activeEvents || activeEvents.length === 0) return false;

      const normalizedName = eventName ? Utils.trimText(eventName).toLowerCase() : '';
      const normalizedDate = eventStartDate ? Utils.formatDate(eventStartDate) : '';
      const normalizedVenue = venue ? Utils.trimText(venue).toLowerCase() : '';
      const normalizedTime = this._normalizeEventTime_(startTime);

      return activeEvents.some(event => {
        if (excludeEventId && event && event[CONFIG.COLUMNS.EVENT_ID] === excludeEventId) return false;
        const eName = event && event[CONFIG.COLUMNS.EVENT_NAME] ? Utils.trimText(event[CONFIG.COLUMNS.EVENT_NAME]).toLowerCase() : '';
        const eDate = event && event[CONFIG.COLUMNS.START_DATE] ? Utils.formatDate(event[CONFIG.COLUMNS.START_DATE]) : '';
        const eVenue = event && event[CONFIG.COLUMNS.VENUE] ? Utils.trimText(event[CONFIG.COLUMNS.VENUE]).toLowerCase() : '';
        const eTime = this._normalizeEventTime_(event ? event[CONFIG.COLUMNS.START_TIME] : null);

        return (eName === normalizedName && eDate === normalizedDate && eVenue === normalizedVenue && eTime === normalizedTime);
      });
    } catch (error) {
      Logger.log('EventService._isDuplicateEvent error: ' + (error && error.message ? error.message : error));
      return false;
    }
  },

  _normalizeEventPayload: function(eventData) {
    if (!eventData) return {};
    var out = {};
    
    var name = eventData[CONFIG.COLUMNS.EVENT_NAME] !== undefined ? eventData[CONFIG.COLUMNS.EVENT_NAME] : (eventData.event_name || eventData.eventName);
    if (name !== undefined) out[CONFIG.COLUMNS.EVENT_NAME] = name;
    
    var desc = eventData[CONFIG.COLUMNS.DESCRIPTION] !== undefined ? eventData[CONFIG.COLUMNS.DESCRIPTION] : eventData.description;
    if (desc !== undefined) out[CONFIG.COLUMNS.DESCRIPTION] = desc;
    
    var sDate = eventData[CONFIG.COLUMNS.START_DATE] !== undefined ? eventData[CONFIG.COLUMNS.START_DATE] : (eventData.start_date || eventData.startDate);
    if (sDate !== undefined) out[CONFIG.COLUMNS.START_DATE] = sDate;
    
    var eDate = eventData[CONFIG.COLUMNS.END_DATE] !== undefined ? eventData[CONFIG.COLUMNS.END_DATE] : (eventData.end_date || eventData.endDate);
    if (eDate !== undefined) out[CONFIG.COLUMNS.END_DATE] = eDate;
    
    var sTime = eventData[CONFIG.COLUMNS.START_TIME] !== undefined ? eventData[CONFIG.COLUMNS.START_TIME] : (eventData.start_time || eventData.startTime);
    if (sTime !== undefined) out[CONFIG.COLUMNS.START_TIME] = sTime;
    
    var eTime = eventData[CONFIG.COLUMNS.END_TIME] !== undefined ? eventData[CONFIG.COLUMNS.END_TIME] : (eventData.end_time || eventData.endTime);
    if (eTime !== undefined) out[CONFIG.COLUMNS.END_TIME] = eTime;
    
    var venueVal = eventData[CONFIG.COLUMNS.VENUE] !== undefined ? eventData[CONFIG.COLUMNS.VENUE] : (eventData.venue || eventData.venueId);
    if (venueVal !== undefined) out[CONFIG.COLUMNS.VENUE] = venueVal;
    
    var coordId = eventData[CONFIG.COLUMNS.COORDINATOR_ID] !== undefined ? eventData[CONFIG.COLUMNS.COORDINATOR_ID] : (eventData.coordinator_id || eventData.coordinatorId);
    if (coordId !== undefined) out[CONFIG.COLUMNS.COORDINATOR_ID] = coordId;
    
    var depts = eventData[CONFIG.COLUMNS.DEPARTMENTS] !== undefined ? eventData[CONFIG.COLUMNS.DEPARTMENTS] : eventData.departments;
    if (depts !== undefined) out[CONFIG.COLUMNS.DEPARTMENTS] = depts;
    
    var yrs = eventData[CONFIG.COLUMNS.YEARS] !== undefined ? eventData[CONFIG.COLUMNS.YEARS] : eventData.years;
    if (yrs !== undefined) out[CONFIG.COLUMNS.YEARS] = yrs;
    
    var cap = eventData[CONFIG.COLUMNS.CAPACITY] !== undefined ? eventData[CONFIG.COLUMNS.CAPACITY] : eventData.capacity;
    if (cap !== undefined) out[CONFIG.COLUMNS.CAPACITY] = cap;
    
    var statusVal = eventData[CONFIG.COLUMNS.EVENT_STATUS] !== undefined ? eventData[CONFIG.COLUMNS.EVENT_STATUS] : (eventData[CONFIG.COLUMNS.STATUS] !== undefined ? eventData[CONFIG.COLUMNS.STATUS] : (eventData.status || eventData.event_status));
    if (statusVal !== undefined) out[CONFIG.COLUMNS.EVENT_STATUS] = statusVal;
    
    var createdBy = eventData[CONFIG.COLUMNS.CREATED_BY] !== undefined ? eventData[CONFIG.COLUMNS.CREATED_BY] : (eventData.created_by || eventData.createdBy);
    if (createdBy !== undefined) out[CONFIG.COLUMNS.CREATED_BY] = createdBy;
    
    var updatedBy = eventData[CONFIG.COLUMNS.UPDATED_BY] !== undefined ? eventData[CONFIG.COLUMNS.UPDATED_BY] : (eventData.updated_by || eventData.updatedBy);
    if (updatedBy !== undefined) out[CONFIG.COLUMNS.UPDATED_BY] = updatedBy;

    // Registration Config normalization
    var enableReg = eventData[CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION] !== undefined ? eventData[CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION] : (eventData.enable_registration || eventData.enableRegistration);
    if (enableReg !== undefined) out[CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION] = enableReg;
    
    var regOpen = eventData[CONFIG.COLUMNS.EVENT_REGISTRATION_OPEN] !== undefined ? eventData[CONFIG.COLUMNS.EVENT_REGISTRATION_OPEN] : (eventData.registration_open || eventData.registrationOpen);
    if (regOpen !== undefined) out[CONFIG.COLUMNS.EVENT_REGISTRATION_OPEN] = regOpen;
    
    var regClose = eventData[CONFIG.COLUMNS.EVENT_REGISTRATION_CLOSE] !== undefined ? eventData[CONFIG.COLUMNS.EVENT_REGISTRATION_CLOSE] : (eventData.registration_close || eventData.registrationClose);
    if (regClose !== undefined) out[CONFIG.COLUMNS.EVENT_REGISTRATION_CLOSE] = regClose;
    
    var maxSeats = eventData[CONFIG.COLUMNS.EVENT_MAXIMUM_SEATS] !== undefined ? eventData[CONFIG.COLUMNS.EVENT_MAXIMUM_SEATS] : (eventData.maximum_seats || eventData.maxSeats || eventData.maximumSeats);
    if (maxSeats !== undefined) out[CONFIG.COLUMNS.EVENT_MAXIMUM_SEATS] = maxSeats;
    
    var allowSpot = eventData[CONFIG.COLUMNS.EVENT_ALLOW_SPOT_REGISTRATION] !== undefined ? eventData[CONFIG.COLUMNS.EVENT_ALLOW_SPOT_REGISTRATION] : (eventData.allow_spot_registration || eventData.allowSpotRegistration || eventData.allowSpot);
    if (allowSpot !== undefined) out[CONFIG.COLUMNS.EVENT_ALLOW_SPOT_REGISTRATION] = allowSpot;
    
    var regFields = eventData[CONFIG.COLUMNS.EVENT_REGISTRATION_FIELDS] !== undefined ? eventData[CONFIG.COLUMNS.EVENT_REGISTRATION_FIELDS] : (eventData.registration_fields || eventData.registrationFields);
    if (regFields !== undefined) out[CONFIG.COLUMNS.EVENT_REGISTRATION_FIELDS] = regFields;
    
    var termsCond = eventData[CONFIG.COLUMNS.EVENT_TERMS_AND_CONDITIONS] !== undefined ? eventData[CONFIG.COLUMNS.EVENT_TERMS_AND_CONDITIONS] : (eventData.terms_and_conditions || eventData.termsConditions || eventData.terms);
    if (termsCond !== undefined) out[CONFIG.COLUMNS.EVENT_TERMS_AND_CONDITIONS] = termsCond;

    var regUrl = eventData[CONFIG.COLUMNS.EVENT_REGISTRATION_URL] !== undefined ? eventData[CONFIG.COLUMNS.EVENT_REGISTRATION_URL] : (eventData.registration_url || eventData.registrationUrl);
    if (regUrl !== undefined) out[CONFIG.COLUMNS.EVENT_REGISTRATION_URL] = regUrl;

    // Access Restrictions
    var accessType = eventData.access_restriction_type !== undefined ? eventData.access_restriction_type : (eventData.accessRestrictionType || eventData['Access Restriction Type']);
    if (accessType !== undefined) out.access_restriction_type = accessType;

    var allowedCoords = eventData.allowed_coordinator_ids !== undefined ? eventData.allowed_coordinator_ids : (eventData.allowedCoordinatorIds || eventData['Allowed Coordinator IDs']);
    if (allowedCoords !== undefined) out.allowed_coordinator_ids = allowedCoords;

    var allowedDepts = eventData.allowed_departments !== undefined ? eventData.allowed_departments : (eventData.allowedDepartments || eventData['Allowed Departments']);
    if (allowedDepts !== undefined) out.allowed_departments = allowedDepts;

    // Open Event Settings
    var openTarget = eventData.open_target_group !== undefined ? eventData.open_target_group : (eventData.openTargetGroup || eventData['Open Target Group']);
    if (openTarget !== undefined) out.open_target_group = openTarget;

    var openReqFields = eventData.open_required_fields !== undefined ? eventData.open_required_fields : (eventData.openRequiredFields || eventData['Open Required Fields']);
    if (openReqFields !== undefined) out.open_required_fields = openReqFields;

    for (var k in eventData) {
      if (out[k] === undefined && eventData[k] !== undefined) {
        out[k] = eventData[k];
      }
    }
    return out;
  },

  createEvent: function(eventData, creatorId) {
    try {
      this._ensureRegistrationHeaders();
      this._ensureParticipantHeaders();

      eventData = this._normalizeEventPayload(eventData);

      const coordinatorId = eventData[CONFIG.COLUMNS.COORDINATOR_ID];
      if (coordinatorId) {
        const coordinator = UserService.getUserById(coordinatorId);
        const coordStatus = coordinator ? String(coordinator[CONFIG.COLUMNS.USER_STATUS] || coordinator['Status'] || coordinator.status || '').trim() : '';
        const coordRole   = coordinator ? String(coordinator[CONFIG.COLUMNS.USER_ROLE]   || coordinator['Role']   || coordinator.role   || '').trim() : '';
        const allowedRoles = [CONFIG.ROLES.COORDINATOR, CONFIG.ROLES.HOD, CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPER_ADMIN, CONFIG.ROLES.EVENT_ADMIN, 'Event Admin', 'EVENT ADMIN', 'EVENT_ADMIN'];
        if (!coordinator || coordStatus.toLowerCase() !== CONFIG.USER_STATUS.ACTIVE.toLowerCase() || !allowedRoles.map(r => String(r).toUpperCase()).includes(coordRole.toUpperCase())) {
          return Utils.buildResponse(false, CONFIG.MESSAGES.INVALID_COORDINATOR);
        }
      }

      // Populate fallback defaults for Simplified/Draft event creation parameters
      const timezone = CONFIG.DATE_TIME.TIMEZONE || 'Asia/Kolkata';
      const todayStr = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');
      
      const startDateKey = CONFIG.COLUMNS.START_DATE;
      const endDateKey = CONFIG.COLUMNS.END_DATE;
      const startTimeKey = CONFIG.COLUMNS.START_TIME;
      const endTimeKey = CONFIG.COLUMNS.END_TIME;
      const venueKey = CONFIG.COLUMNS.VENUE;

      if (!eventData[startDateKey] && !eventData.start_date && !eventData.startDate) {
        eventData[startDateKey] = todayStr;
        eventData.start_date = todayStr;
      }
      if (!eventData[endDateKey] && !eventData.end_date && !eventData.endDate) {
        eventData[endDateKey] = todayStr;
        eventData.end_date = todayStr;
      }
      if (!eventData[startTimeKey] && !eventData.start_time && !eventData.startTime) {
        eventData[startTimeKey] = '09:00';
        eventData.start_time = '09:00';
      }
      if (!eventData[endTimeKey] && !eventData.end_time && !eventData.endTime) {
        eventData[endTimeKey] = '17:00';
        eventData.end_time = '17:00';
      }
      if (!eventData[venueKey] && !eventData.venue && !eventData.venueId) {
        eventData[venueKey] = 'TBD';
        eventData.venue = 'TBD';
      }

      // Map incoming sheet-style payload to what ValidationService.validateEvent expects.
      const validationPayload = this._getEventValidationPayload_(eventData);
      const validationResult = ValidationService.validateEvent(validationPayload);
      if (!validationResult.valid) {
        return Utils.buildResponse(false, (validationResult.errors || []).join(' '));
      }

      const eventName = Utils.capitalizeWords(Utils.trimText(eventData[CONFIG.COLUMNS.EVENT_NAME]));
      const venue = Utils.capitalizeWords(Utils.trimText(eventData[CONFIG.COLUMNS.VENUE]));

      // Normalize time for duplicate detection.
      const normalizedStartTime = this._normalizeEventTime_(eventData[CONFIG.COLUMNS.START_TIME]);

      if (this._isDuplicateEvent(eventName, eventData[CONFIG.COLUMNS.START_DATE], venue, normalizedStartTime)) {
        return Utils.buildResponse(false, CONFIG.MESSAGES.EVENT_ALREADY_EXISTS);
      }

      // Backward compat: method may not exist in this file; keep safe.
      if (typeof this._ensureAuditColumns === 'function') this._ensureAuditColumns();
      else {
        // TODO: _ensureAuditColumns is missing in EventService.js; audit fields will be set explicitly below.
      }

      const eventId = IdService.generateEventId();
      const nowIso = new Date().toISOString();
      const regUrl = getScriptUrl() ? (getScriptUrl() + "?page=Register&eventId=" + eventId) : "";

      const newEvent = {
        [CONFIG.COLUMNS.EVENT_ID]: eventId,
        [CONFIG.COLUMNS.EVENT_NAME]: eventName,
        [CONFIG.COLUMNS.DESCRIPTION]: eventData[CONFIG.COLUMNS.DESCRIPTION] ? Utils.trimText(eventData[CONFIG.COLUMNS.DESCRIPTION]) : '',
        [CONFIG.COLUMNS.START_DATE]: eventData[CONFIG.COLUMNS.START_DATE],
        [CONFIG.COLUMNS.END_DATE]: eventData[CONFIG.COLUMNS.END_DATE],
        [CONFIG.COLUMNS.START_TIME]: normalizedStartTime,
        [CONFIG.COLUMNS.END_TIME]: eventData[CONFIG.COLUMNS.END_TIME] ? this._normalizeEventTime_(eventData[CONFIG.COLUMNS.END_TIME]) : eventData[CONFIG.COLUMNS.END_TIME],
        [CONFIG.COLUMNS.VENUE]: venue,
        [CONFIG.COLUMNS.COORDINATOR_ID]: eventData[CONFIG.COLUMNS.COORDINATOR_ID],
        [CONFIG.COLUMNS.DEPARTMENTS]: eventData[CONFIG.COLUMNS.DEPARTMENTS],
        [CONFIG.COLUMNS.YEARS]: eventData[CONFIG.COLUMNS.YEARS],
        [CONFIG.COLUMNS.CAPACITY]: eventData[CONFIG.COLUMNS.CAPACITY],
        [CONFIG.COLUMNS.EVENT_STATUS]: eventData[CONFIG.COLUMNS.EVENT_STATUS] || eventData[CONFIG.COLUMNS.STATUS] || CONFIG.EVENT_STATUS.DRAFT,
        [CONFIG.COLUMNS.DELETION_FLAG]: false,
        [CONFIG.COLUMNS.CREATED_AT]: nowIso,
        [CONFIG.COLUMNS.CREATED_BY]: eventData[CONFIG.COLUMNS.CREATED_BY] || 'Unknown',
        [CONFIG.COLUMNS.UPDATED_AT]: nowIso,
        [CONFIG.COLUMNS.UPDATED_BY]: eventData[CONFIG.COLUMNS.CREATED_BY] || 'Unknown',
        [CONFIG.COLUMNS.LAST_ACTION]: 'Created',
        [CONFIG.COLUMNS.LAST_ACTION_AT]: nowIso,
        [CONFIG.COLUMNS.LAST_ACTION_BY]: eventData[CONFIG.COLUMNS.CREATED_BY] || 'Unknown',

        // Registration Settings
        [CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION]: eventData[CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION] ?? 'No',
        [CONFIG.COLUMNS.EVENT_REGISTRATION_OPEN]: eventData[CONFIG.COLUMNS.EVENT_REGISTRATION_OPEN] || '',
        [CONFIG.COLUMNS.EVENT_REGISTRATION_CLOSE]: eventData[CONFIG.COLUMNS.EVENT_REGISTRATION_CLOSE] || '',
        [CONFIG.COLUMNS.EVENT_MAXIMUM_SEATS]: eventData[CONFIG.COLUMNS.EVENT_MAXIMUM_SEATS] || '',
        [CONFIG.COLUMNS.EVENT_ALLOW_SPOT_REGISTRATION]: eventData[CONFIG.COLUMNS.EVENT_ALLOW_SPOT_REGISTRATION] ?? 'No',
        [CONFIG.COLUMNS.EVENT_REGISTRATION_FIELDS]: eventData[CONFIG.COLUMNS.EVENT_REGISTRATION_FIELDS] || '',
        [CONFIG.COLUMNS.EVENT_TERMS_AND_CONDITIONS]: eventData[CONFIG.COLUMNS.EVENT_TERMS_AND_CONDITIONS] || '',
        [CONFIG.COLUMNS.EVENT_REGISTRATION_URL]: regUrl
      };

      for (var k in eventData) {
        if (newEvent[k] === undefined && eventData[k] !== undefined) {
          newEvent[k] = eventData[k];
        }
      }

      const success = DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, newEvent);
      if (success) {
        this._invalidateCaches_();
        const resp = Utils.buildResponse(true, CONFIG.MESSAGES.EVENT_CREATED, { event: Utils.sanitizeEvent(newEvent) });

        // Auto-assign Event Admin to the event
        if (coordinatorId) {
          try {
            Logger.log("Auto-assigning Event Admin " + coordinatorId + " to event " + eventId);
            CoordinatorService.assignCoordinator(
              eventId, 
              coordinatorId, 
              'Event Admin', 
              creatorId || eventData[CONFIG.COLUMNS.CREATED_BY] || 'System', 
              'Auto-assigned upon event creation'
            );
          } catch (assignError) {
            Logger.log("Error in auto-assigning coordinator: " + assignError.message);
          }
        }

        try {
          AuditService.logAction(
            eventData[CONFIG.COLUMNS.CREATED_BY] || eventData[CONFIG.COLUMNS.COORDINATOR_ID],
            'EventService',
            'CREATE_EVENT',
            eventId,
            'Event',
            'Event created',
            '',
            'SUCCESS',
            eventData[CONFIG.COLUMNS.CREATED_BY] || eventData[CONFIG.COLUMNS.COORDINATOR_ID]
          );
        } catch (error) {
          Logger.log(error);
        }
        try {
          NotificationService.createNotification({
            user_id: newEvent[CONFIG.COLUMNS.COORDINATOR_ID] || newEvent[CONFIG.COLUMNS.CREATED_BY] || 'Unknown',
            title: 'Event Created',
            message: 'Event "' + eventName + '" created successfully.',
            type: 'Event'
          });
        } catch (error) {
          Logger.log(error);
        }
        return resp;
      }
      return Utils.buildResponse(false, CONFIG.MESSAGES.EVENT_CREATE_FAILED);
    } catch (error) {
      Logger.log("EventService.createEvent error: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, 'Event creation failed: ' + (error && error.message ? error.message : error));
    }
  },

  updateEvent: function(eventId, eventData, updaterId) {
    try {
      const eventsSheet = CONFIG.SHEETS.EVENTS;
      this._ensureRegistrationHeaders();
      this._ensureParticipantHeaders();

      eventData = this._normalizeEventPayload(eventData);

      // Prefer cached record set (best-effort) to reduce reads.
      // Using getEventById avoids an extra readAllRows on update path when possible.
      const existingEvent = this.getEventById(eventId);
      if (!existingEvent) {
        return Utils.buildResponse(false, CONFIG.MESSAGES.EVENT_NOT_FOUND);
      }

      // 1. Identity Lock: Creator or Assigned Event Admin / Admin can edit Event Name or Description
      const creatorId = existingEvent[CONFIG.COLUMNS.CREATED_BY] || existingEvent.created_by;
      const assignedAdminId = existingEvent[CONFIG.COLUMNS.COORDINATOR_ID] || existingEvent.coordinator_id;
      const isChangingIdentity = 
        (eventData[CONFIG.COLUMNS.EVENT_NAME] !== undefined && eventData[CONFIG.COLUMNS.EVENT_NAME] !== existingEvent[CONFIG.COLUMNS.EVENT_NAME]) ||
        (eventData[CONFIG.COLUMNS.DESCRIPTION] !== undefined && eventData[CONFIG.COLUMNS.DESCRIPTION] !== existingEvent[CONFIG.COLUMNS.DESCRIPTION]);
      
      if (isChangingIdentity && updaterId) {
        const updaterUser = UserService.getUserById(updaterId);
        const updaterRole = String(updaterUser ? (updaterUser.role || updaterUser['Role'] || '') : '').toUpperCase().trim();
        const isCreator = String(updaterId).trim() === String(creatorId).trim();
        const isAssignedAdmin = String(updaterId).trim() === String(assignedAdminId).trim();
        const isSuperOrAdminOrHOD = updaterRole === 'SUPER ADMIN' || updaterRole === 'SUPER_ADMIN' || updaterRole === 'ADMIN' || updaterRole === 'EVENT ADMIN' || updaterRole === 'EVENT_ADMIN' || updaterRole === 'HOD';

        if (!isCreator && !isAssignedAdmin && !isSuperOrAdminOrHOD) {
          return Utils.buildResponse(false, 'Unauthorized: Only the creator or assigned Event Admin can modify the Event Name or Description.');
        }
      }

      // Authorization and Closed Registration Verification for settings changes
      const isChangingRegSettings = 
        eventData[CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION] !== undefined ||
        eventData[CONFIG.COLUMNS.EVENT_REGISTRATION_OPEN] !== undefined ||
        eventData[CONFIG.COLUMNS.EVENT_REGISTRATION_CLOSE] !== undefined ||
        eventData[CONFIG.COLUMNS.EVENT_MAXIMUM_SEATS] !== undefined ||
        eventData[CONFIG.COLUMNS.EVENT_ALLOW_SPOT_REGISTRATION] !== undefined ||
        eventData[CONFIG.COLUMNS.EVENT_REGISTRATION_FIELDS] !== undefined ||
        eventData[CONFIG.COLUMNS.EVENT_TERMS_AND_CONDITIONS] !== undefined;

      if (isChangingRegSettings && updaterId) {
        const updaterUser = UserService.getUserById(updaterId);
        if (!updaterUser) {
          return Utils.buildResponse(false, 'Unauthorized: User not found.');
        }

        const roleStr = String(updaterUser[CONFIG.COLUMNS.USER_ROLE] || updaterUser.role || updaterUser.Role || '').trim().toUpperCase();
        const allowedRoles = ['SUPER ADMIN', 'SUPER_ADMIN', 'ADMIN', 'EVENT ADMIN', 'EVENT_ADMIN', 'HOD'];
        if (!allowedRoles.includes(roleStr)) {
          return Utils.buildResponse(false, 'Unauthorized: Only Event Owners (Admin/HOD) and Super Admins can modify registration settings.');
        }

        // Verify if user is HOD/Admin and owns/created the event
        if (roleStr !== 'SUPER ADMIN' && roleStr !== 'SUPER_ADMIN') {
          const userId = String(updaterUser[CONFIG.COLUMNS.USER_ID] || updaterUser.user_id || '').trim();
          const userEmpId = String(updaterUser[CONFIG.COLUMNS.USER_EMPLOYEE_ID] || updaterUser.employee_id || '').trim().toUpperCase();
          
          const creatorId = String(existingEvent[CONFIG.COLUMNS.CREATED_BY] || existingEvent.created_by || '').trim();
          const coordId = String(existingEvent[CONFIG.COLUMNS.COORDINATOR_ID] || existingEvent.coordinator_id || '').trim();
          const organizerId = String(existingEvent['Organizer'] || existingEvent.organizer || '').trim();

          const normCreatorId = creatorId.toUpperCase();
          const normCoordId = coordId.toUpperCase();
          const normOrganizerId = organizerId.toUpperCase();
          const normUserId = userId.toUpperCase();

          let isOwner = (
            (userId && (userId === creatorId || normUserId === normCreatorId || userId === organizerId || normUserId === normOrganizerId)) ||
            (userEmpId && (userEmpId === normCreatorId || userEmpId === normCoordId || userEmpId === normOrganizerId)) ||
            (coordId && (userId === coordId || normUserId === normCoordId))
          );

          if (roleStr === 'EVENT ADMIN' || roleStr === 'EVENT_ADMIN' || roleStr === 'ADMIN') {
            isOwner = true;
          }

          if (!isOwner && roleStr === 'HOD') {
            const organizerDeptId = existingEvent['Organizer'] || existingEvent.organizer;
            if (organizerDeptId) {
              const deptRows = DatabaseService.findByColumn(CONFIG.SHEETS.DEPARTMENTS, 'Department ID', organizerDeptId) || [];
              if (deptRows.length > 0) {
                const hodEmployeeId = String(deptRows[0]['HOD Employee ID'] || deptRows[0].hod_employee_id || '').trim().toUpperCase();
                if (hodEmployeeId && userEmpId && hodEmployeeId === userEmpId) {
                  isOwner = true;
                }
              }
            }
          }

          if (!isOwner) {
            return Utils.buildResponse(false, 'Unauthorized: You do not own this event.');
          }
        }

        // Check if registration is already closed
        const existingEnableReg = existingEvent[CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION];
        const existingCloseTimeStr = existingEvent[CONFIG.COLUMNS.EVENT_REGISTRATION_CLOSE];
        
        if (existingEnableReg === 'Yes' && existingCloseTimeStr) {
          const closeTime = new Date(existingCloseTimeStr);
          if (!isNaN(closeTime.getTime()) && closeTime < new Date()) {
            return Utils.buildResponse(false, 'Cannot update registration settings because registration is already closed.');
          }
        }
      }

      const updatedEvent = Object.assign({}, existingEvent, eventData);
      updatedEvent[CONFIG.COLUMNS.UPDATED_AT] = new Date().toISOString();

      // Enforce registration url generation on update path if not present
      if (!updatedEvent[CONFIG.COLUMNS.EVENT_REGISTRATION_URL]) {
        updatedEvent[CONFIG.COLUMNS.EVENT_REGISTRATION_URL] = getScriptUrl() ? (getScriptUrl() + "?page=Register&eventId=" + eventId) : "";
      }

      // Ensure status is written to the correct physical sheet column and all alias properties
      if (eventData[CONFIG.COLUMNS.STATUS] !== undefined || eventData[CONFIG.COLUMNS.EVENT_STATUS] !== undefined || eventData.status !== undefined || eventData.event_status !== undefined) {
        const targetStatus = eventData[CONFIG.COLUMNS.EVENT_STATUS] || eventData[CONFIG.COLUMNS.STATUS] || eventData.status || eventData.event_status;
        updatedEvent[CONFIG.COLUMNS.EVENT_STATUS] = targetStatus;
        updatedEvent.status = targetStatus;
        updatedEvent.Status = targetStatus;
        updatedEvent.event_status = targetStatus;
      }

      // Check for Completed status transition to populate completed_at
      const oldStatus = existingEvent[CONFIG.COLUMNS.EVENT_STATUS] || existingEvent.event_status;
      const newStatus = updatedEvent[CONFIG.COLUMNS.EVENT_STATUS];
      if (newStatus === 'Completed' && oldStatus !== 'Completed') {
        updatedEvent[CONFIG.COLUMNS.EVENT_COMPLETED_AT] = new Date().toISOString();
        updatedEvent[CONFIG.COLUMNS.EVENT_ARCHIVE_STATUS] = 'ReadOnly';
      }

      var updatedByKey = CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_BY ? CONFIG.COLUMNS.UPDATED_BY : null;
      if (updatedByKey) {
        updatedEvent[updatedByKey] = eventData[updatedByKey] || updatedEvent[updatedByKey] || 'Unknown';
      }


      // Normalize names/venue/time (null-safe)
      if (updatedEvent[CONFIG.COLUMNS.EVENT_NAME]) {
        updatedEvent[CONFIG.COLUMNS.EVENT_NAME] = Utils.capitalizeWords(Utils.trimText(updatedEvent[CONFIG.COLUMNS.EVENT_NAME]));
      }
      if (updatedEvent[CONFIG.COLUMNS.VENUE]) {
        updatedEvent[CONFIG.COLUMNS.VENUE] = Utils.capitalizeWords(Utils.trimText(updatedEvent[CONFIG.COLUMNS.VENUE]));
      }
      if (updatedEvent[CONFIG.COLUMNS.START_TIME] !== undefined) {
        updatedEvent[CONFIG.COLUMNS.START_TIME] = this._normalizeEventTime_(updatedEvent[CONFIG.COLUMNS.START_TIME]);
      }
      if (updatedEvent[CONFIG.COLUMNS.END_TIME] !== undefined) {
        updatedEvent[CONFIG.COLUMNS.END_TIME] = this._normalizeEventTime_(updatedEvent[CONFIG.COLUMNS.END_TIME]);
      }

      // Validation payload mapping
      const validationPayload = this._getEventValidationPayload_(updatedEvent);
      const validationResult = ValidationService.validateEvent(validationPayload);
      if (!validationResult.valid) {
        return Utils.buildResponse(false, (validationResult.errors || []).join(' '));
      }

      // Duplicate detection only if fields impacting dedup changed (best-effort)
      var nameChanged = (updatedEvent[CONFIG.COLUMNS.EVENT_NAME] && updatedEvent[CONFIG.COLUMNS.EVENT_NAME] !== existingEvent[CONFIG.COLUMNS.EVENT_NAME]);
      var dateChanged = (updatedEvent[CONFIG.COLUMNS.START_DATE] && Utils.formatDate(updatedEvent[CONFIG.COLUMNS.START_DATE]) !== Utils.formatDate(existingEvent[CONFIG.COLUMNS.START_DATE]));
      var venueChanged = (updatedEvent[CONFIG.COLUMNS.VENUE] && updatedEvent[CONFIG.COLUMNS.VENUE] !== existingEvent[CONFIG.COLUMNS.VENUE]);
      var timeChanged = (updatedEvent[CONFIG.COLUMNS.START_TIME] && updatedEvent[CONFIG.COLUMNS.START_TIME] !== existingEvent[CONFIG.COLUMNS.START_TIME]);

      if (nameChanged || dateChanged || venueChanged || timeChanged) {
        if (this._isDuplicateEvent(updatedEvent[CONFIG.COLUMNS.EVENT_NAME], updatedEvent[CONFIG.COLUMNS.START_DATE], updatedEvent[CONFIG.COLUMNS.VENUE], updatedEvent[CONFIG.COLUMNS.START_TIME], eventId)) {
          return Utils.buildResponse(false, CONFIG.MESSAGES.EVENT_ALREADY_EXISTS);
        }
      }

      const success = DatabaseService.updateRow(eventsSheet, CONFIG.COLUMNS.EVENT_ID, eventId, updatedEvent);
      if (success) {
        this._invalidateCaches_(eventId);
        const resp = Utils.buildResponse(true, CONFIG.MESSAGES.EVENT_UPDATED, { event: Utils.sanitizeEvent(updatedEvent) });

        // Handle coordinator change in assignments sheet
        var oldCoordinatorId = existingEvent[CONFIG.COLUMNS.COORDINATOR_ID];
        var newCoordinatorId = updatedEvent[CONFIG.COLUMNS.COORDINATOR_ID];
        if (newCoordinatorId !== oldCoordinatorId) {
          try {
            Logger.log("Coordinator changed from " + oldCoordinatorId + " to " + newCoordinatorId + " for event " + eventId);
            // 1. Deactivate old coordinator assignment if exists
            if (oldCoordinatorId) {
              var allCoords = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
              var oldAssignment = allCoords.find(function(a) {
                return String(a['Event ID']).trim() === String(eventId).trim() &&
                       String(a['User ID']).trim() === String(oldCoordinatorId).trim() &&
                       a['Assignment Status'] === 'Active';
              });
              if (oldAssignment) {
                var updates = { 'Assignment Status': 'Removed', 'Remarks': 'Reassigned on event update' };
                DatabaseService.updateRow(CONFIG.SHEETS.EVENT_COORDINATORS, 'Assignment ID', oldAssignment['Assignment ID'], updates);
              }
            }
            // 2. Assign new coordinator
            if (newCoordinatorId) {
              CoordinatorService.assignCoordinator(
                eventId,
                newCoordinatorId,
                'Event Admin',
                updaterId || eventData[CONFIG.COLUMNS.UPDATED_BY] || 'System',
                'Assigned on event update'
              );
            }
          } catch (assignError) {
            Logger.log("Error updating coordinator assignment on event update: " + assignError.message);
          }
        }

        // Write granular audit logs for identity and assignment updates
        try {
          if (nameChanged) {
            AuditService.logAction(
              updaterId || 'System', 'EventService', 'EDIT_EVENT_NAME', eventId, 'Event',
              'Event Name changed', existingEvent[CONFIG.COLUMNS.EVENT_NAME], updatedEvent[CONFIG.COLUMNS.EVENT_NAME],
              'SUCCESS', updaterId || 'System'
            );
          }
          if (updatedEvent[CONFIG.COLUMNS.DESCRIPTION] !== undefined && updatedEvent[CONFIG.COLUMNS.DESCRIPTION] !== existingEvent[CONFIG.COLUMNS.DESCRIPTION]) {
            AuditService.logAction(
              updaterId || 'System', 'EventService', 'EDIT_EVENT_DESCRIPTION', eventId, 'Event',
              'Event Description changed', existingEvent[CONFIG.COLUMNS.DESCRIPTION], updatedEvent[CONFIG.COLUMNS.DESCRIPTION],
              'SUCCESS', updaterId || 'System'
            );
          }
          if (newCoordinatorId !== oldCoordinatorId) {
            AuditService.logAction(
              updaterId || 'System', 'EventService', 'CHANGE_EVENT_ADMIN', eventId, 'Event',
              'Assigned Event Admin changed', oldCoordinatorId || 'None', newCoordinatorId || 'None',
              'SUCCESS', updaterId || 'System'
            );
          }
        } catch (auditErr) {
          Logger.log("Granular identity audit logging failed: " + auditErr.message);
        }

        try {
          AuditService.logAction(
            updatedEvent[CONFIG.COLUMNS.UPDATED_BY] || 'Unknown',
            'EventService',
            'UPDATE_EVENT',
            eventId,
            'Event',
            'Event updated',
            '',
            'SUCCESS',
            updatedEvent[CONFIG.COLUMNS.UPDATED_BY] || 'Unknown'
          );
        } catch (error) {
          Logger.log(error);
        }
        try {
          NotificationService.createNotification({
            user_id: updatedEvent[CONFIG.COLUMNS.COORDINATOR_ID] || updatedEvent[CONFIG.COLUMNS.UPDATED_BY] || 'Unknown',
            title: 'Event Updated',
            message: 'Event "' + (updatedEvent[CONFIG.COLUMNS.EVENT_NAME] || '') + '" updated successfully.',
            type: 'Event',
            related_event_id: eventId
          });
        } catch (error) {
          Logger.log(error);
        }
        return resp;
      }
      return Utils.buildResponse(false, CONFIG.MESSAGES.EVENT_UPDATE_FAILED);
    } catch (error) {
      Logger.log("EventService.updateEvent error: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, CONFIG.MESSAGES.EVENT_UPDATE_FAILED);
    }
  },

  deleteEvent: function(eventId, updatedBy) {
    try {
      const eventsSheet = CONFIG.SHEETS.EVENTS;
      if (!DatabaseService.exists(eventsSheet, CONFIG.COLUMNS.EVENT_ID, eventId)) {
        return Utils.buildResponse(false, CONFIG.MESSAGES.EVENT_NOT_FOUND);
      }

      const headers = DatabaseService.getHeaderRow(eventsSheet);
      const hasDeletionFlagCol = headers.indexOf(CONFIG.COLUMNS.DELETION_FLAG) !== -1;

      if (!hasDeletionFlagCol) {
        // Fallback to hard delete if spreadsheet schema does not support soft deletes
        DatabaseService.hardDelete(eventsSheet, CONFIG.COLUMNS.EVENT_ID, eventId);
        this._invalidateCaches_();
        try {
          AuditService.logAction(
            updatedBy || 'Unknown',
            'EventService',
            'DELETE_EVENT',
            eventId,
            'Event',
            'Event hard deleted (schema fallback)',
            '',
            'SUCCESS',
            updatedBy || 'Unknown'
          );
        } catch (error) {
          Logger.log(error);
        }
        return Utils.buildResponse(true, CONFIG.MESSAGES.EVENT_DELETED);
      }

      var nowIso = new Date().toISOString();
      // Soft delete and update status.
      const updateData = {
        [CONFIG.COLUMNS.DELETION_FLAG]: true,
        [CONFIG.COLUMNS.STATUS]: CONFIG.EVENT_STATUS.CANCELLED,
        [CONFIG.COLUMNS.UPDATED_BY]: updatedBy || 'Unknown',
        [CONFIG.COLUMNS.UPDATED_AT]: nowIso,
        [CONFIG.COLUMNS.LAST_ACTION]: 'Deleted',
        [CONFIG.COLUMNS.LAST_ACTION_BY]: updatedBy || 'Unknown',
        [CONFIG.COLUMNS.LAST_ACTION_AT]: nowIso
      };

      const success = DatabaseService.updateRow(eventsSheet, CONFIG.COLUMNS.EVENT_ID, eventId, updateData);
      if (success) {
        this._invalidateCaches_();
        const resp = Utils.buildResponse(true, CONFIG.MESSAGES.EVENT_DELETED);
        try {
          AuditService.logAction(
            updatedBy || 'Unknown',
            'EventService',
            'DELETE_EVENT',
            eventId,
            'Event',
            'Event deleted',
            '',
            'SUCCESS',
            updatedBy || 'Unknown'
          );
        } catch (error) {
          Logger.log(error);
        }
        try {
          NotificationService.createNotification({
            user_id: updatedBy || 'Unknown',
            title: 'Event Deleted',
            message: 'Event "' + eventId + '" was deleted.',
            type: 'Event',
            related_event_id: eventId
          });
        } catch (error) {
          Logger.log(error);
        }
        return resp;
      }
      return Utils.buildResponse(false, CONFIG.MESSAGES.EVENT_DELETE_FAILED);
    } catch (error) {
      Logger.log("EventService.deleteEvent error: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, CONFIG.MESSAGES.EVENT_DELETE_FAILED);
    }
  },

  getEventById: function(eventId, userContext) {
    try {
      const cacheKey = "event_by_id_" + eventId;
      if (typeof CacheManager !== 'undefined') {
        const cached = CacheManager.get(cacheKey);
        if (cached) {
          if (userContext && !SecurityUtils.canAccessEvent(eventId, userContext)) {
            Logger.log("Security Access Denied: User cannot access event " + eventId);
            return null;
          }
          return cached;
        }
      }

      const records = DatabaseService.findByColumn(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eventId) || [];
      if (records.length > 0 && !this._safeDeletionFlag_(records[0])) {
        const result = Utils.sanitizeEvent(this._evaluateEventStatus_(records[0]));
        if (typeof CacheManager !== 'undefined' && result) {
          CacheManager.put(cacheKey, result, 60);
        }
        return result;
      }
      return null;
    } catch (error) {
      Logger.log("EventService.getEventById error: " + (error && error.message ? error.message : error));
      return null;
    }
  },

  getAllEvents: function(userContext) {
    try {
      const events = this._getAllActiveSanitizedEvents_() || [];
      if (!userContext) return events;
      return SecurityUtils.applyEventRLS(events, userContext);
    } catch (error) {
      Logger.log("EventService.getAllEvents error: " + (error && error.message ? error.message : error));
      return [];
    }
  },

  searchEvents: function(keyword, userContext) {
    try {
      if (Utils.checkEmptyValue(keyword)) return [];
      var kw = String(keyword).toLowerCase();

      const evaluated = this._getAllActiveSanitizedEvents_();
      const scoped = userContext ? SecurityUtils.applyEventRLS(evaluated, userContext) : evaluated;

      return (scoped || []).filter(function(event) {
        var idVal = event && event[CONFIG.COLUMNS.EVENT_ID];
        var nameVal = event && event[CONFIG.COLUMNS.EVENT_NAME];
        var venueVal = event && event[CONFIG.COLUMNS.VENUE];

        var idStr = idVal !== undefined && idVal !== null ? String(idVal).toLowerCase() : '';
        var nameStr = nameVal !== undefined && nameVal !== null ? String(nameVal).toLowerCase() : '';
        var venueStr = venueVal !== undefined && venueVal !== null ? String(venueVal).toLowerCase() : '';

        return idStr.indexOf(kw) !== -1 || nameStr.indexOf(kw) !== -1 || venueStr.indexOf(kw) !== -1;
      });
    } catch (error) {
      Logger.log("EventService.searchEvents error: " + (error && error.message ? error.message : error));
      return [];
    }
  },

  getEventsByCoordinator: function(coordinatorId) {
    try {
      if (!coordinatorId) return [];
      const records = DatabaseService.findByColumn(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.COORDINATOR_ID, coordinatorId);
      const filtered = records.filter(e => !e[CONFIG.COLUMNS.DELETION_FLAG]);
      return filtered.map(e => Utils.sanitizeEvent(this._evaluateEventStatus_(e)));
    } catch (error) {
      Logger.log("EventService.getEventsByCoordinator error: " + error.message);
      return [];
    }
  },

  getEventsByStatus: function(status) {
    try {
      if (!status) return [];
      const records = DatabaseService.findByColumn(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_STATUS, status);
      const filtered = records.filter(e => !e[CONFIG.COLUMNS.DELETION_FLAG]);
      return filtered.map(e => Utils.sanitizeEvent(this._evaluateEventStatus_(e))).filter(e => e[CONFIG.COLUMNS.STATUS] === status);
    } catch (error) {
      Logger.log("EventService.getEventsByStatus error: " + error.message);
      return [];
    }
  },

  getEventsByDate: function(date) {
    try {
      if (!date) return [];
      const targetDate = Utils.formatDate(date);
      const allEvents = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
      const filtered = allEvents.filter(e => !e[CONFIG.COLUMNS.DELETION_FLAG]);
      return filtered.map(e => this._evaluateEventStatus_(e))
        .filter(event => Utils.formatDate(event[CONFIG.COLUMNS.START_DATE]) === targetDate)
        .map(e => Utils.sanitizeEvent(e));
    } catch (error) {
      Logger.log("EventService.getEventsByDate error: " + error.message);
      return [];
    }
  },

  filterEvents: function(filters) {
    try {
      let results = this.getAllEvents();
      if (filters[CONFIG.COLUMNS.STATUS]) {
        results = results.filter(e => e[CONFIG.COLUMNS.STATUS] === filters[CONFIG.COLUMNS.STATUS]);
      }
      if (filters[CONFIG.COLUMNS.COORDINATOR_ID]) {
        results = results.filter(e => e[CONFIG.COLUMNS.COORDINATOR_ID] === filters[CONFIG.COLUMNS.COORDINATOR_ID]);
      }
      if (filters[CONFIG.COLUMNS.DEPARTMENTS]) {
        results = results.filter(e => e[CONFIG.COLUMNS.DEPARTMENTS] && e[CONFIG.COLUMNS.DEPARTMENTS].includes(filters[CONFIG.COLUMNS.DEPARTMENTS]));
      }
      if (filters[CONFIG.COLUMNS.YEARS]) {
        results = results.filter(e => e[CONFIG.COLUMNS.YEARS] && e[CONFIG.COLUMNS.YEARS].includes(filters[CONFIG.COLUMNS.YEARS]));
      }
      if (filters[CONFIG.COLUMNS.VENUE]) {
        results = results.filter(e => e[CONFIG.COLUMNS.VENUE] === filters[CONFIG.COLUMNS.VENUE]);
      }
      if (filters[CONFIG.COLUMNS.START_DATE]) {
        results = results.filter(e => Utils.formatDate(e[CONFIG.COLUMNS.START_DATE]) === Utils.formatDate(filters[CONFIG.COLUMNS.START_DATE]));
      }
      if (filters[CONFIG.COLUMNS.END_DATE]) {
        results = results.filter(e => Utils.formatDate(e[CONFIG.COLUMNS.END_DATE]) === Utils.formatDate(filters[CONFIG.COLUMNS.END_DATE]));
      }
      return results;
    } catch (error) {
      Logger.log("EventService.filterEvents error: " + error.message);
      return [];
    }
  },

  sortEvents: function(sortBy, order) {
    try {
      const allowedFields = [
        CONFIG.COLUMNS.EVENT_NAME,
        CONFIG.COLUMNS.START_DATE,
        CONFIG.COLUMNS.END_DATE,
        CONFIG.COLUMNS.CREATED_AT,
        CONFIG.COLUMNS.UPDATED_AT,
        CONFIG.COLUMNS.STATUS
      ];
      if (!allowedFields.includes(sortBy)) {
        return [];
      }
      const records = this.getAllEvents();
      const sorted = records.sort((a, b) => {
        const valA = a[sortBy] || '';
        const valB = b[sortBy] || '';
        if (order === 'desc') {
          return valA < valB ? 1 : -1;
        }
        return valA > valB ? 1 : -1;
      });
      return sorted;
    } catch (error) {
      Logger.log("EventService.sortEvents error: " + error.message);
      return [];
    }
  },

  paginateEvents: function(page, pageSize) {
    try {
      if (page < 1 || pageSize <= 0) {
        return { totalRecords: 0, currentPage: 1, totalPages: 0, items: [] };
      }
      const records = this.getAllEvents();
      const totalRecords = records.length;
      const totalPages = Math.ceil(totalRecords / pageSize);
      const startIndex = (page - 1) * pageSize;
      const items = records.slice(startIndex, startIndex + pageSize);
      return {
        totalRecords: totalRecords,
        currentPage: page,
        totalPages: totalPages,
        items: items
      };
    } catch (error) {
      Logger.log("EventService.paginateEvents error: " + error.message);
      return { totalRecords: 0, currentPage: 1, totalPages: 0, items: [] };
    }
  },

  getEventDetailsWithTimeline: function(eventId, userContext) {
    try {
      if (userContext && typeof SecurityUtils !== 'undefined' && SecurityUtils.canAccessEvent) {
        if (!SecurityUtils.canAccessEvent(eventId, userContext)) {
          return Utils.buildResponse(false, 'Access denied. Unauthorized event resource.');
        }
      }

      var event = this.getEventById(eventId, userContext);
      if (!event) return Utils.buildResponse(false, 'Event not found');

      var startDateStr = event[CONFIG.COLUMNS.START_DATE] || event.startDate || event.start_date;
      var endDateStr = event[CONFIG.COLUMNS.END_DATE] || event.endDate || event.end_date || startDateStr;

      var start = new Date(startDateStr);
      var end = new Date(endDateStr);
      
      if (isNaN(start.getTime())) start = new Date();
      if (isNaN(end.getTime())) end = new Date(start.getTime());

      if (end.getTime() < start.getTime()) end = new Date(start.getTime());

      var diffTime = Math.abs(end.getTime() - start.getTime());
      var totalDays = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);

      var today = new Date();
      today.setHours(0, 0, 0, 0);

      var days = [];
      for (var i = 1; i <= totalDays; i++) {
        var dayDate = new Date(start.getTime());
        dayDate.setDate(start.getDate() + (i - 1));
        dayDate.setHours(0, 0, 0, 0);

        var status = 'FUTURE';
        if (dayDate.getTime() < today.getTime()) {
          status = 'COMPLETED';
        } else if (dayDate.getTime() === today.getTime()) {
          status = 'ACTIVE';
        }

        days.push({
          dayNumber: i,
          dateLabel: Utils.formatDate ? Utils.formatDate(dayDate) : dayDate.toISOString().split('T')[0],
          status: status,
          isSelectable: status === 'COMPLETED' || status === 'ACTIVE'
        });
      }

      return Utils.buildResponse(true, 'Event timeline computed successfully', {
        event: event,
        totalDays: totalDays,
        days: days
      });
    } catch (error) {
      Logger.log('EventService.getEventDetailsWithTimeline error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, 'Failed to calculate event timeline');
    }
  },

  _ensureRegistrationHeaders: function() {
    // Spreadsheet headers are not used in Supabase setup. Returning immediately to bypass Google Sheets.
    return;
  },

  _ensureParticipantHeaders: function() {
    // Spreadsheet headers are not used in Supabase setup. Returning immediately to bypass Google Sheets.
    return;
  }
};
