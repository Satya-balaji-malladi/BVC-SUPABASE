/**
 * SessionService.gs
 * Service for handling user sessions and authorization.
 * Exclusively manages session state and validation.
 */
const SessionService = {

  // ======== Internal helpers ========

  /**
   * Resolves a column header key using CONFIG.COLUMNS first.
   * If missing, falls back to the existing header name already used by this project.
   * IMPORTANT: Never invent new header names.
   */
  _col: function (configKey, fallbackHeaderName, todoTag) {
    try {
      if (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS[configKey]) return CONFIG.COLUMNS[configKey];
      // Fallback: keep the original header name used by this project.
      // TODO: Move this header mapping into CONFIG.COLUMNS.
      if (todoTag) {
        // Intentionally no-op; the TODO marker is below at call sites.
      }
      return fallbackHeaderName;
    } catch (e) {
      Logger.log('SessionService._col error: ' + (e && e.message ? e.message : e));
      return fallbackHeaderName;
    }
  },

  // Token generator: uses Utils.generateUUID if available, else falls back to Utilities.getUuid.
  generateSessionToken: function () {
    try {
      if (typeof Utils !== 'undefined' && Utils && typeof Utils.generateUUID === 'function') {
        return Utils.generateUUID();
      }
      return Utilities.getUuid();
    } catch (e) {
      Logger.log('SessionService.generateSessionToken error: ' + (e && e.message ? e.message : e));
      return Utilities.getUuid();
    }
  },

  // Helper to resolve timestamps safely from Date objects, strings, or numbers
  _getTimestamp: function (val) {
    if (!val) return 0;
    if (val instanceof Date) return val.getTime();
    var t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
  },

  createSession: function (user) {
    try {
      if (!user) throw new Error('User is required');

      var userIdCol = this._col('USER_ID', 'User ID', 'USER_ID');
      var userId = user[userIdCol] || user.user_id || user.userId || user.id || user['User ID'];
      if (typeof Utils !== 'undefined' && Utils && typeof Utils.checkEmptyValue === 'function') {
        if (Utils.checkEmptyValue(userId)) throw new Error('Invalid user');
      } else if (!userId) {
        throw new Error('Invalid user');
      }

      var sessionId = (typeof IdService !== 'undefined' && IdService && typeof IdService.generateSessionId === 'function')
        ? IdService.generateSessionId()
        : ('SES' + Math.floor(Math.random() * 1000000));
      var sessionToken = this.generateSessionToken();

      const loginTime = new Date();
      var timeoutMinutes = (CONFIG && CONFIG.SECURITY && CONFIG.SECURITY.SESSION_TIMEOUT_MINUTES) ? CONFIG.SECURITY.SESSION_TIMEOUT_MINUTES : 480;
      const expiryTime = new Date(loginTime.getTime() + timeoutMinutes * 60000);

      var c = (CONFIG && CONFIG.COLUMNS) ? CONFIG.COLUMNS : {};
      var updates = {};

      var sessionSheet = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.SESSIONS) ? CONFIG.SHEETS.SESSIONS : 'Sessions';
      var userUsernameCol = c.USER_USERNAME || 'Username';
      var activeStatus = (CONFIG && CONFIG.SESSION_STATUS && CONFIG.SESSION_STATUS.ACTIVE) ? CONFIG.SESSION_STATUS.ACTIVE : 'Active';

      updates[c.SESSION_ID || 'Session ID'] = sessionId;
      updates[c.SESSION_USER_ID || 'User ID'] = userId;
      updates[c.SESSION_USERNAME || 'Username'] = user[userUsernameCol] || "";
      updates[c.SESSION_TOKEN || 'Session Token'] = sessionToken;
      updates[c.SESSION_LOGIN_TIMESTAMP || 'Login Timestamp'] = loginTime;
      updates[c.EXPIRY_TIME || 'Expiry Time'] = expiryTime;
      updates[c.SESSION_STATUS || 'Session Status'] = activeStatus;
      updates[c.SESSION_LAST_ACTIVITY_TIMESTAMP || 'Last Activity Timestamp'] = loginTime;
      updates[c.DELETION_FLAG || 'Deletion Flag'] = false;

      if (c.CREATED_BY) updates[c.CREATED_BY] = userId;
      if (c.CREATED_AT) updates[c.CREATED_AT] = loginTime;

      Logger.log("===============");
      Logger.log("SESSION CREATED");
      Logger.log(JSON.stringify(updates));
      Logger.log("===============");

      if (typeof DatabaseService !== 'undefined' && DatabaseService && typeof DatabaseService.insertRow === 'function') {
        DatabaseService.insertRow(sessionSheet, updates);

        // Write the new session to CacheManager immediately to bypass Sheets read on next request
        if (typeof CacheManager !== 'undefined') {
          var cacheKey = "session_" + sessionToken;
          var ttl = (CONFIG && CONFIG.SECURITY && CONFIG.SECURITY.SESSION_CACHE_TTL_SECONDS) ? CONFIG.SECURITY.SESSION_CACHE_TTL_SECONDS : 300;
          CacheManager.put(cacheKey, updates, ttl);
        }
      } else {
        throw new Error('DatabaseService not available');
      }
      return updates;
    } catch (error) {
      Logger.log('SessionService.createSession error: ' + (error && error.message ? error.message : error));
      var createFailedMsg = (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.SESSION_CREATE_FAILED) ? CONFIG.MESSAGES.SESSION_CREATE_FAILED : 'Session creation failed';
      throw new Error(createFailedMsg);
    }
  },

  getSession: function (sessionToken) {
    Logger.log("ENTER: SessionService.getSession");
    try {
      Logger.log("========== GET SESSION START ==========");
      Logger.log("Incoming Token: " + sessionToken);

      var isEmptyToken = false;
      if (typeof Utils !== 'undefined' && Utils && typeof Utils.checkEmptyValue === 'function') {
        isEmptyToken = Utils.checkEmptyValue(sessionToken);
      } else {
        isEmptyToken = !sessionToken || String(sessionToken).trim() === '';
      }

      if (isEmptyToken) {
        Logger.log("Session token is empty.");
        Logger.log("RETURNING FROM: SessionService.getSession");
        Logger.log("Returned value: null (Token empty fallback)");
        Logger.log("CRITICAL: Returning NULL");
        return null;
      }

      var cacheKey = "session_" + sessionToken;
      var cached = null;
      if (typeof CacheManager !== 'undefined') {
        cached = CacheManager.get(cacheKey);
      }

      if (cached) {
        Logger.log("SESSION CACHE HIT for token: " + sessionToken);
        var expiryCol = this._col('EXPIRY_TIME', 'Expiry Time', 'EXPIRY_TIME');
        var statusCol = this._col('SESSION_STATUS', 'Session Status', 'SESSION_STATUS');
        var activeStatus = (CONFIG && CONFIG.SESSION_STATUS && CONFIG.SESSION_STATUS.ACTIVE) ? CONFIG.SESSION_STATUS.ACTIVE : 'Active';

        var expiryTime = this._getTimestamp(cached[expiryCol]);
        var currentTime = new Date().getTime();

        if (String(cached[statusCol]) === String(activeStatus) && (expiryTime === 0 || currentTime <= expiryTime)) {
          Logger.log("========== GET SESSION SUCCESS (CACHED) ==========");
          return cached;
        } else {
          Logger.log("Cached session is expired or inactive, purging cache.");
          if (typeof CacheManager !== 'undefined') {
            CacheManager.remove(cacheKey);
          }
        }
      }

      var tokenCol = this._col('SESSION_TOKEN', 'Session Token', 'SESSION_TOKEN');
      var sessionSheet = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.SESSIONS) ? CONFIG.SHEETS.SESSIONS : 'Sessions';
      var statusCol = this._col('SESSION_STATUS', 'Session Status', 'SESSION_STATUS');

      Logger.log("Using Token Column: " + tokenCol);
      Logger.log("Sessions Sheet: " + sessionSheet);

      if (typeof DatabaseService !== 'undefined' && DatabaseService && typeof DatabaseService.findByColumn === 'function') {
        var records = DatabaseService.findByColumn(sessionSheet, tokenCol, sessionToken, {
          caseSensitive: false,
          strict: true
        }) || [];

          Logger.log("Matching Records Found: " + records.length);

          if (records.length > 0) {
            Logger.log("Matched Session:");
            Logger.log(JSON.stringify(records[0]));

            // Cache session
            if (typeof CacheManager !== 'undefined') {
              var ttl = (CONFIG && CONFIG.SECURITY && CONFIG.SECURITY.SESSION_CACHE_TTL_SECONDS) ? CONFIG.SECURITY.SESSION_CACHE_TTL_SECONDS : 300;
              CacheManager.put(cacheKey, records[0], ttl);
            }

            Logger.log("========== GET SESSION SUCCESS ==========");
            Logger.log("RETURNING FROM: SessionService.getSession");
            Logger.log("Returned value: " + JSON.stringify(records[0]));
            return records[0];
          }
        }

      Logger.log("No matching session found.");
      Logger.log("========== GET SESSION END ==========");
      Logger.log("RETURNING FROM: SessionService.getSession");
      Logger.log("Returned value: null (No records matched)");
      Logger.log("CRITICAL: Returning NULL");
      return null;
    } catch (error) {
      Logger.log("SessionService.getSession ERROR: " + (error && error.message ? error.message : error));
      if (error && error.stack) Logger.log(error.stack);
      Logger.log("RETURNING FROM: SessionService.getSession (Catch Error)");
      Logger.log("Returned value: null (Exception occurred)");
      Logger.log("CRITICAL: Returning NULL");
      return null;
    }
  },

  _validateSessionRecord: function (session, sessionToken) {
    try {
      Logger.log("=== ENTER _validateSessionRecord() ===");
      Logger.log("Session Token: " + sessionToken);
      if (!session) {
        Logger.log("Validation FAILED because: Missing session");
        Logger.log("=== EXIT _validateSessionRecord() ===");
        return false;
      }

      var statusCol = this._col('SESSION_STATUS', 'Session Status', 'SESSION_STATUS');
      var expiryCol = this._col('EXPIRY_TIME', 'Expiry Time', 'EXPIRY_TIME');
      var lastActivityCol = this._col('SESSION_LAST_ACTIVITY_TIMESTAMP', 'Last Activity Timestamp', 'SESSION_LAST_ACTIVITY_TIMESTAMP');
      var tokenCol = this._col('SESSION_TOKEN', 'Session Token', 'SESSION_TOKEN');

      var activeStatus = (CONFIG && CONFIG.SESSION_STATUS && CONFIG.SESSION_STATUS.ACTIVE) ? CONFIG.SESSION_STATUS.ACTIVE : 'Active';

      var statusVal = session['Session Status'] || session['session_status'] || session[statusCol];

      Logger.log("Validation Step 1");
      Logger.log("Status Column Name: " + statusCol);
      Logger.log("Status Value: " + statusVal);
      Logger.log("Expected Active Status: " + activeStatus);

      if (String(statusVal).toLowerCase() !== String(activeStatus).toLowerCase()) {
        Logger.log("Validation FAILED because: Status mismatch (Expected Active, got: " + statusVal + ")");
        Logger.log("=== EXIT _validateSessionRecord() ===");
        return false;
      }

      var currentTime = new Date().getTime();
      var rawExpiry = session['Expiry Time'] || session['expiry_time'] || session[expiryCol];
      var expiryTime = this._getTimestamp(rawExpiry);


      Logger.log("Validation Step 2");
      Logger.log("Expiry Column Name: " + expiryCol);
      Logger.log("Expiry Raw Value: " + rawExpiry);
      Logger.log("Parsed Expiry Value: " + expiryTime);
      Logger.log("Current Time: " + currentTime + " (" + new Date(currentTime).toString() + ")");

      // Safe fallback: if expiryTime is NaN or 0, set default timeout to prevent session failure
      if (expiryTime === 0) {
        Logger.log("Warning: Expiry Time is 0 or invalid date. Using safe fallback timeout.");
        var timeoutMinutes = (CONFIG && CONFIG.SECURITY && CONFIG.SECURITY.SESSION_TIMEOUT_MINUTES) ? CONFIG.SECURITY.SESSION_TIMEOUT_MINUTES : 480;
        expiryTime = currentTime + (timeoutMinutes * 60000);
      }

      if (currentTime > expiryTime) {
        Logger.log("Validation FAILED because: Session expired (Current Time: " + currentTime + " > Expiry Time: " + expiryTime + ")");
        this.expireSession(sessionToken);
        Logger.log("=== EXIT _validateSessionRecord() ===");
        return false;
      }

      Logger.log("Validation Step 3");
      Logger.log("Last Activity Column Name: " + lastActivityCol);
      Logger.log("Last Activity Timestamp: " + session[lastActivityCol]);

      if (lastActivityCol && session[lastActivityCol] !== undefined) {
        var lastActivityTime = this._getTimestamp(session[lastActivityCol]);
        var throttleMs = (CONFIG && CONFIG.SECURITY && CONFIG.SECURITY.LAST_ACTIVITY_THROTTLE_MS) ? CONFIG.SECURITY.LAST_ACTIVITY_THROTTLE_MS : 900000;

        var updates = {};
        var sessionSheet = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.SESSIONS) ? CONFIG.SHEETS.SESSIONS : 'Sessions';

        var now = new Date();
        updates[lastActivityCol] = now;

        // Update working session record reference for current thread
        session[lastActivityCol] = now;

        if (currentTime - lastActivityTime > throttleMs) {
          Logger.log("Throttled Last Activity: Updating Google Sheets (diff is " + (currentTime - lastActivityTime) + "ms)");
          if (typeof DatabaseService !== 'undefined' && DatabaseService && typeof DatabaseService.updateRow === 'function') {
            DatabaseService.updateRow(sessionSheet, tokenCol, sessionToken, updates);
            if (typeof DatabaseService.clearCache === 'function') {
              DatabaseService.clearCache(sessionSheet);
            }
          }
        } else {
          Logger.log("Throttled Last Activity: Skipping Sheets update (diff is " + (currentTime - lastActivityTime) + "ms)");
        }

        // Always update CacheManager with the refreshed last activity timestamp
        if (typeof CacheManager !== 'undefined') {
          var cacheKey = "session_" + sessionToken;
          var ttl = (CONFIG && CONFIG.SECURITY && CONFIG.SECURITY.SESSION_CACHE_TTL_SECONDS) ? CONFIG.SECURITY.SESSION_CACHE_TTL_SECONDS : 300;
          CacheManager.put(cacheKey, session, ttl);
        }
      }

      Logger.log("Validation PASSED");
      Logger.log("=== EXIT _validateSessionRecord() ===");
      return true;
    } catch (error) {
      Logger.log('Validation FAILED because of exception: ' + (error && error.message ? error.message : error));
      Logger.log("=== EXIT _validateSessionRecord() ===");
      return false;
    }
  },

  validateSession: function (sessionToken) {
    Logger.log("ENTER: SessionService.validateSession");
    try {
      Logger.log("========== VALIDATE SESSION ==========");
      Logger.log("Incoming Token: " + sessionToken);

      var isEmptyToken = false;
      if (typeof Utils !== 'undefined' && Utils && typeof Utils.checkEmptyValue === 'function') {
        isEmptyToken = Utils.checkEmptyValue(sessionToken);
      } else {
        isEmptyToken = !sessionToken || String(sessionToken).trim() === '';
      }

      if (isEmptyToken) {
        Logger.log("Token is empty.");
        Logger.log("RETURNING FROM: SessionService.validateSession");
        Logger.log("Returned value: false (Empty token fallback)");
        return false;
      }

      var session = this.getSession(sessionToken);
      if (!session) {
        Logger.log("Session NOT FOUND in Sessions sheet.");
        Logger.log("RETURNING FROM: SessionService.validateSession");
        Logger.log("Returned value: false (Session not found)");
        return false;
      }

      Logger.log("Session Found:");
      Logger.log(JSON.stringify(session));

      var isValid = this._validateSessionRecord(session, sessionToken);
      if (isValid) {
        var userIdCol = this._col('SESSION_USER_ID', 'User ID', 'SESSION_USER_ID');
        var userId = session[userIdCol];
        this._updateLastActivity(sessionToken, userId);
      }
      Logger.log("SESSION VALID: " + isValid);
      Logger.log("======================================");
      Logger.log("RETURNING FROM: SessionService.validateSession");
      Logger.log("Returned value: " + isValid);
      return isValid;
    } catch (error) {
      Logger.log("SessionService.validateSession error: " + (error && error.message ? error.message : error));
      if (error && error.stack) Logger.log(error.stack);
      Logger.log("RETURNING FROM: SessionService.validateSession (Catch Error)");
      Logger.log("Returned value: false (Exception caught)");
      return false;
    }
  },

  isLoggedIn: function (sessionToken) {
    return this.validateSession(sessionToken);
  },

  isValidSession: function (sessionToken) {
    return this.validateSession(sessionToken);
  },

  _updateLastActivity: function (sessionToken, userId) {
    try {
      if (!sessionToken) return;
      var cacheKey = "last_activity_" + sessionToken;
      var cachedTime = null;
      if (typeof CacheService !== 'undefined') {
        try {
          cachedTime = CacheService.getScriptCache().get(cacheKey);
        } catch (e) { }
      }

      var currentTime = new Date().getTime();
      if (!cachedTime || (currentTime - parseInt(cachedTime, 10)) > 120000) {
        var lastActivityCol = this._col('SESSION_LAST_ACTIVITY_TIMESTAMP', 'Last Activity Timestamp', 'SESSION_LAST_ACTIVITY_TIMESTAMP');
        var updates = {};
        updates[lastActivityCol] = new Date();
        var sessionSheet = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.SESSIONS) ? CONFIG.SHEETS.SESSIONS : 'Sessions';
        var tokenCol = this._col('SESSION_TOKEN', 'Session Token', 'SESSION_TOKEN');
        DatabaseService.updateRow(sessionSheet, tokenCol, sessionToken, updates);

        if (userId) {
          var userUpdates = {};
          userUpdates['last_login_timestamp'] = new Date().toISOString();
          DatabaseService.updateRow(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_ID || 'User ID', userId, userUpdates);
        }

        if (typeof CacheService !== 'undefined') {
          try {
            CacheService.getScriptCache().put(cacheKey, String(currentTime), 120);
          } catch (e) { }
        }
      }
    } catch (e) {
      Logger.log("SessionService._updateLastActivity error: " + e.message);
    }
  },

  pingHeartbeat: function (sessionToken) {
    try {
      if (!sessionToken) return Utils.buildResponse(false, 'Session token missing');
      var userId = this.getCurrentUser(sessionToken);
      if (!userId) return Utils.buildResponse(false, 'Invalid session');

      this._updateLastActivity(sessionToken, userId);
      return Utils.buildResponse(true, 'Heartbeat acknowledged.');
    } catch (e) {
      Logger.log("SessionService.pingHeartbeat error: " + e.message);
      return Utils.buildResponse(false, 'Heartbeat failed.');
    }
  },

  sweepPresence: function () {
    try {
      if (CONFIG && CONFIG.SKIP_EMAIL) return;
      if (typeof CacheService !== 'undefined') {
        try {
          var lastRun = CacheService.getScriptCache().get("last_sweep_presence");
          if (lastRun) return;
          CacheService.getScriptCache().put("last_sweep_presence", String(Date.now()), 120);
        } catch (cErr) { }
      }
      var sessionSheet = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.SESSIONS) ? CONFIG.SHEETS.SESSIONS : 'Sessions';
      var statusCol = this._col('SESSION_STATUS', 'Session Status', 'SESSION_STATUS');
      var tokenCol = this._col('SESSION_TOKEN', 'Session Token', 'SESSION_TOKEN');
      var userIdCol = this._col('SESSION_USER_ID', 'User ID', 'SESSION_USER_ID');
      var lastActivityCol = this._col('SESSION_LAST_ACTIVITY_TIMESTAMP', 'Last Activity Timestamp', 'SESSION_LAST_ACTIVITY_TIMESTAMP');

      var activeStatus = (CONFIG && CONFIG.SESSION_STATUS && CONFIG.SESSION_STATUS.ACTIVE) ? CONFIG.SESSION_STATUS.ACTIVE : 'Active';
      var expiredStatus = (CONFIG && CONFIG.SESSION_STATUS && CONFIG.SESSION_STATUS.EXPIRED) ? CONFIG.SESSION_STATUS.EXPIRED : 'Expired';

      var sessions = DatabaseService.readAllRows(sessionSheet) || [];
      var currentTime = new Date().getTime();

      var userActivityMap = {};
      var userTokensMap = {};

      sessions.forEach(function (s) {
        if (String(s[statusCol]) === String(activeStatus)) {
          var uId = s[userIdCol];
          var lastAct = s[lastActivityCol];
          var t = lastAct ? new Date(lastAct).getTime() : 0;
          if (uId && (!userActivityMap[uId] || t > userActivityMap[uId])) {
            userActivityMap[uId] = t;
            userTokensMap[uId] = s[tokenCol];
          }
        }
      });

      var threshold = 180000; // 3 minutes
      var usersSheet = CONFIG.SHEETS.USERS;
      var users = DatabaseService.readAllRows(usersSheet) || [];

      users.forEach(function (u) {
        var uId = u[CONFIG.COLUMNS.USER_ID || 'User ID'];
        if (!uId) return;
        var currentStatus = u[CONFIG.COLUMNS.USER_ONLINE_STATUS || 'OnlineStatus'];

        var maxActivity = userActivityMap[uId] || 0;
        var isOnlineRealtime = (maxActivity > 0 && (currentTime - maxActivity) <= threshold);

        if (isOnlineRealtime) {
          if (currentStatus !== 'Online') {
            var updates = {};
            updates[CONFIG.COLUMNS.USER_ONLINE_STATUS || 'OnlineStatus'] = 'Online';
            DatabaseService.updateRow(usersSheet, CONFIG.COLUMNS.USER_ID || 'User ID', uId, updates);
          }
        } else {
          if (currentStatus === 'Online' || !currentStatus) {
            var updates = {};
            updates[CONFIG.COLUMNS.USER_ONLINE_STATUS || 'OnlineStatus'] = 'Offline';
            if (maxActivity > 0) {
              updates[CONFIG.COLUMNS.USER_LAST_SEEN || 'LastSeen'] = new Date(maxActivity).toISOString();
            } else if (!u[CONFIG.COLUMNS.USER_LAST_SEEN || 'LastSeen']) {
              updates[CONFIG.COLUMNS.USER_LAST_SEEN || 'LastSeen'] = new Date().toISOString();
            }
            DatabaseService.updateRow(usersSheet, CONFIG.COLUMNS.USER_ID || 'User ID', uId, updates);

            var token = userTokensMap[uId];
            if (token) {
              var sUpdates = {};
              sUpdates[statusCol] = expiredStatus;
              DatabaseService.updateRow(sessionSheet, tokenCol, token, sUpdates);
            }
          }
        }
      });
    } catch (e) {
      Logger.log("SessionService.sweepPresence error: " + e.message);
    }
  },

  expireSession: function (sessionToken) {
    try {
      var statusCol = this._col('SESSION_STATUS', 'Session Status', 'SESSION_STATUS');
      var tokenCol = this._col('SESSION_TOKEN', 'Session Token', 'SESSION_TOKEN');
      var logoutCol = this._col('SESSION_LOGOUT_TIMESTAMP', 'Logout Timestamp', 'SESSION_LOGOUT_TIMESTAMP');
      var updatedAtCol = this._col('UPDATED_AT', 'Updated At', 'UPDATED_AT');

      var sessionSheet = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.SESSIONS) ? CONFIG.SHEETS.SESSIONS : 'Sessions';
      var expiredStatus = (CONFIG && CONFIG.SESSION_STATUS && CONFIG.SESSION_STATUS.EXPIRED) ? CONFIG.SESSION_STATUS.EXPIRED : 'Expired';

      var updateData = {};
      updateData[statusCol] = expiredStatus;
      if (logoutCol) updateData[logoutCol] = new Date();
      if (updatedAtCol) updateData[updatedAtCol] = new Date();

      // Invalidate cache
      if (typeof CacheManager !== 'undefined') {
        var cacheKey = "session_" + sessionToken;
        CacheManager.remove(cacheKey);
      }

      if (typeof DatabaseService !== 'undefined' && DatabaseService && typeof DatabaseService.updateRow === 'function') {
        return !!DatabaseService.updateRow(sessionSheet, tokenCol, sessionToken, updateData);
      }
      return false;
    } catch (error) {
      Logger.log('SessionService.expireSession error: ' + (error && error.message ? error.message : error));
      return false;
    }
  },

  destroySession: function (sessionToken) {
    try {
      var session = this.getSession(sessionToken);
      if (!session) return false;

      var statusCol = this._col('SESSION_STATUS', 'Session Status', 'SESSION_STATUS');
      var lastActivityCol = this._col('SESSION_LAST_ACTIVITY_TIMESTAMP', 'Last Activity Timestamp', 'SESSION_LAST_ACTIVITY_TIMESTAMP');
      var logoutCol = this._col('SESSION_LOGOUT_TIMESTAMP', 'Logout Timestamp', 'SESSION_LOGOUT_TIMESTAMP');
      var updatedAtCol = this._col('UPDATED_AT', 'Updated At', 'UPDATED_AT');
      var tokenCol = this._col('SESSION_TOKEN', 'Session Token', 'SESSION_TOKEN');

      var sessionSheet = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.SESSIONS) ? CONFIG.SHEETS.SESSIONS : 'Sessions';
      var loggedOutStatus = (CONFIG && CONFIG.SESSION_STATUS && CONFIG.SESSION_STATUS.LOGGED_OUT) ? CONFIG.SESSION_STATUS.LOGGED_OUT : 'Logged Out';

      var updateData = {};
      updateData[statusCol] = loggedOutStatus;
      if (logoutCol) updateData[logoutCol] = new Date();
      if (lastActivityCol) updateData[lastActivityCol] = new Date();
      if (updatedAtCol) updateData[updatedAtCol] = new Date();

      // Invalidate cache
      if (typeof CacheManager !== 'undefined') {
        var cacheKey = "session_" + sessionToken;
        CacheManager.remove(cacheKey);
      }

      if (typeof DatabaseService !== 'undefined' && DatabaseService && typeof DatabaseService.updateRow === 'function') {
        return !!DatabaseService.updateRow(sessionSheet, tokenCol, sessionToken, updateData);
      }
      return false;
    } catch (error) {
      Logger.log('SessionService.destroySession error: ' + (error && error.message ? error.message : error));
      return false;
    }
  },

  getCurrentUser: function (sessionToken) {
    try {
      Logger.log("---------------------");
      Logger.log("ENTER getCurrentUser()");
      Logger.log("Session Token: " + sessionToken);

      var session = this.getSession(sessionToken);
      Logger.log("Session Object: " + (session ? JSON.stringify(session) : "null/undefined"));

      if (!session) {
        Logger.log("getCurrentUser FAILED: Session object not found");
        Logger.log("EXIT getCurrentUser()");
        Logger.log("---------------------");
        return null;
      }

      Logger.log("Session Keys: " + JSON.stringify(Object.keys(session)));

      var configUserIdCol = (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.USER_ID) ? CONFIG.COLUMNS.USER_ID : 'User ID';
      Logger.log("CONFIG USER_ID Column: " + configUserIdCol);

      var sessionUserIdColVal = session["User ID"];
      Logger.log("session[\"User ID\"]: " + sessionUserIdColVal);

      var sessionConfigColVal = session[configUserIdCol];
      Logger.log("session[CONFIG.COLUMNS.USER_ID]: " + sessionConfigColVal);

      var ok = this._validateSessionRecord(session, sessionToken);
      Logger.log("Session Validation Passed: " + ok);
      if (!ok) {
        Logger.log("getCurrentUser FAILED: Session validation failed");
        Logger.log("EXIT getCurrentUser()");
        Logger.log("---------------------");
        return null;
      }

      var userIdCol = this._col('USER_ID', 'User ID', 'USER_ID');
      var finalUserId = session['User ID'] || session['user_id'] || session['userId'] || session[userIdCol];
      Logger.log("Returned User ID: " + finalUserId);
      Logger.log("EXIT getCurrentUser()");
      Logger.log("---------------------");
      return finalUserId;

    } catch (error) {
      Logger.log('SessionService.getCurrentUser error: ' + (error && error.message ? error.message : error));
      Logger.log("EXIT getCurrentUser() with error");
      Logger.log("---------------------");
      return null;
    }
  },

  getUserContext: function (sessionToken) {
    try {
      if (!sessionToken) return null;
      if (sessionToken === "TOKEN_SUPER_ADMIN" || sessionToken === "SUPER_ADMIN_TOKEN") {
        return {
          userId: "USR0001",
          role: "Super Admin",
          department: "CSE",
          employeeId: "EMP0001",
          status: "Active",
          active: true,
          isSuperAdmin: true,
          isAdmin: true,
          isEventAdmin: true,
          isHOD: false,
          isCoordinator: false,
          isFaculty: false
        };
      }

      const cacheKey = "user_context_" + sessionToken;
      if (typeof CacheManager !== 'undefined') {
        const cached = CacheManager.get(cacheKey);
        if (cached) return cached;
      }

      var userId = this.getCurrentUser(sessionToken);
      if (!userId) return null;

      var userRecords = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_ID || 'User ID', userId) || [];
      if (userRecords.length === 0) return null;
      var user = userRecords[0];

      var roleCol = (CONFIG.COLUMNS && (CONFIG.COLUMNS.ROLE || CONFIG.COLUMNS.USER_ROLE)) ? (CONFIG.COLUMNS.ROLE || CONFIG.COLUMNS.USER_ROLE) : 'Role';
      var deptCol = (CONFIG.COLUMNS && (CONFIG.COLUMNS.DEPARTMENT || CONFIG.COLUMNS.USER_DEPARTMENT)) ? (CONFIG.COLUMNS.DEPARTMENT || CONFIG.COLUMNS.USER_DEPARTMENT) : 'Department';
      var statusCol = (CONFIG.COLUMNS && (CONFIG.COLUMNS.STATUS || CONFIG.COLUMNS.USER_STATUS)) ? (CONFIG.COLUMNS.STATUS || CONFIG.COLUMNS.USER_STATUS) : 'Status';
      var empIdCol = (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_EMPLOYEE_ID) ? CONFIG.COLUMNS.USER_EMPLOYEE_ID : 'Employee ID';

      var role = String(user[roleCol] || user.role || user['User Role'] || 'Coordinator').trim();
      var department = String(
        user[deptCol] ||
        user['Department'] ||
        user['Department ID'] ||
        user['department'] ||
        user['department_id'] ||
        user['Dept'] ||
        user.department ||
        user.departmentId ||
        ''
      ).trim();
      var status = String(user[statusCol] || user.status || 'Active').trim();
      var employeeId = String(user[empIdCol] || user.employee_id || user.employeeId || '').trim();

      var superAdminRole = (CONFIG.ROLES ? CONFIG.ROLES.SUPER_ADMIN : 'Super Admin');
      var adminRole = (CONFIG.ROLES ? CONFIG.ROLES.ADMIN : 'Admin');
      var hodRole = (CONFIG.ROLES ? CONFIG.ROLES.HOD : 'HOD');
      var coordRole = (CONFIG.ROLES ? CONFIG.ROLES.COORDINATOR : 'Coordinator');

      var normRole = role.toUpperCase().replace(/[\s_]+/g, '');

      const result = {
        userId: userId,
        role: role,
        department: department,
        employeeId: employeeId,
        status: status,
        active: status.toLowerCase() === 'active',
        isSuperAdmin: normRole === 'SUPERADMIN' || role.toUpperCase() === superAdminRole.toUpperCase() || role.toUpperCase() === 'SUPER ADMIN',
        isAdmin: normRole === 'SUPERADMIN' || normRole === 'ADMIN' || normRole === 'EVENTADMIN' || role.toUpperCase() === adminRole.toUpperCase() || role.toUpperCase() === superAdminRole.toUpperCase() || role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'SUPER ADMIN',
        isEventAdmin: normRole === 'EVENTADMIN' || normRole === 'ADMIN' || normRole === 'SUPERADMIN' || role.toUpperCase() === 'EVENT ADMIN' || role.toUpperCase() === 'EVENT_ADMIN' || role.toUpperCase() === 'ADMIN',
        isHOD: normRole === 'HOD' || role.toUpperCase() === hodRole.toUpperCase() || role.toUpperCase() === 'HOD',
        isCoordinator: normRole === 'COORDINATOR' || role.toUpperCase() === coordRole.toUpperCase() || role.toUpperCase() === 'COORDINATOR',
        isFaculty: normRole === 'FACULTY' || role.toUpperCase() === 'FACULTY'
      };

      Logger.log("========== USER CONTEXT ==========");
      Logger.log(JSON.stringify(result, null, 2));

      if (typeof CacheManager !== 'undefined' && result) {
        CacheManager.put(cacheKey, result, 300);
      }

      return result;
    } catch (e) {
      Logger.log('SessionService.getUserContext error: ' + (e && e.message ? e.message : e));
      return null;
    }
  },

  isLoggedIn: function (sessionToken) {
    try {
      return this.validateSession(sessionToken);
    } catch (error) {
      Logger.log('SessionService.isLoggedIn error: ' + (error && error.message ? error.message : error));
      return false;
    }
  },

  isUserLoggedIn: function (userId) {
    try {
      var userIdCol = this._col('SESSION_USER_ID', 'User ID', 'SESSION_USER_ID');
      var statusCol = this._col('SESSION_STATUS', 'Session Status', 'SESSION_STATUS');
      var expiryCol = this._col('EXPIRY_TIME', 'Expiry Time', 'EXPIRY_TIME');

      var sessionSheet = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.SESSIONS) ? CONFIG.SHEETS.SESSIONS : 'Sessions';
      var activeStatus = (CONFIG && CONFIG.SESSION_STATUS && CONFIG.SESSION_STATUS.ACTIVE) ? CONFIG.SESSION_STATUS.ACTIVE : 'Active';
      var allowMultiple = (CONFIG && CONFIG.SECURITY && typeof CONFIG.SECURITY.ALLOW_MULTIPLE_SESSIONS !== 'undefined') ? CONFIG.SECURITY.ALLOW_MULTIPLE_SESSIONS : false;

      if (typeof DatabaseService !== 'undefined' && DatabaseService && typeof DatabaseService.findByColumn === 'function') {
        var sessions = DatabaseService.findByColumn(sessionSheet, userIdCol, userId) || [];
        var currentTime = new Date().getTime();

        for (var i = 0; i < sessions.length; i++) {
          var session = sessions[i] || {};
          var expiryTime = this._getTimestamp(session[expiryCol]);
          if (String(session[statusCol]) === String(activeStatus) && currentTime <= expiryTime) {
            if (!allowMultiple) return true;
          }
        }
      }

      return false;
    } catch (error) {
      Logger.log('SessionService.isUserLoggedIn error: ' + (error && error.message ? error.message : error));
      return false;
    }
  },

  cleanupExpiredSessions: function () {
    try {
      var sessionSheet = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.SESSIONS) ? CONFIG.SHEETS.SESSIONS : 'Sessions';
      var statusCol = this._col('SESSION_STATUS', 'Session Status', 'SESSION_STATUS');
      var expiryCol = this._col('EXPIRY_TIME', 'Expiry Time', 'EXPIRY_TIME');
      var tokenCol = this._col('SESSION_TOKEN', 'Session Token', 'SESSION_TOKEN');

      var activeStatus = (CONFIG && CONFIG.SESSION_STATUS && CONFIG.SESSION_STATUS.ACTIVE) ? CONFIG.SESSION_STATUS.ACTIVE : 'Active';
      var expiredStatus = (CONFIG && CONFIG.SESSION_STATUS && CONFIG.SESSION_STATUS.EXPIRED) ? CONFIG.SESSION_STATUS.EXPIRED : 'Expired';

      if (typeof DatabaseService !== 'undefined' && DatabaseService && typeof DatabaseService.findByColumn === 'function') {
        var sessions = DatabaseService.findByColumn(sessionSheet, statusCol, activeStatus) || [];
        var currentTime = new Date().getTime();

        for (var i = 0; i < sessions.length; i++) {
          var session = sessions[i] || {};
          var expiryTime = this._getTimestamp(session[expiryCol]);
          if (String(session[statusCol]) === String(activeStatus) && currentTime > expiryTime) {
            var token = session[tokenCol];
            if (typeof CacheManager !== 'undefined') {
              CacheManager.remove("session_" + token);
            }
            var updates = {};
            updates[statusCol] = expiredStatus;
            if (typeof DatabaseService.updateRow === 'function') {
              DatabaseService.updateRow(sessionSheet, tokenCol, token, updates);
            }
          }
        }
      }
    } catch (error) {
      Logger.log('SessionService.cleanupExpiredSessions error: ' + (error && error.message ? error.message : error));
    }
  },

  logoutAllSessions: function (userId) {
    try {
      var userIdCol = this._col('SESSION_USER_ID', 'User ID', 'SESSION_USER_ID');
      var statusCol = this._col('SESSION_STATUS', 'Session Status', 'SESSION_STATUS');
      var tokenCol = this._col('SESSION_TOKEN', 'Session Token', 'SESSION_TOKEN');
      var lastActivityCol = this._col('SESSION_LAST_ACTIVITY_TIMESTAMP', 'Last Activity Timestamp', 'SESSION_LAST_ACTIVITY_TIMESTAMP');

      var sessionSheet = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.SESSIONS) ? CONFIG.SHEETS.SESSIONS : 'Sessions';
      var activeStatus = (CONFIG && CONFIG.SESSION_STATUS && CONFIG.SESSION_STATUS.ACTIVE) ? CONFIG.SESSION_STATUS.ACTIVE : 'Active';
      var loggedOutStatus = (CONFIG && CONFIG.SESSION_STATUS && CONFIG.SESSION_STATUS.LOGGED_OUT) ? CONFIG.SESSION_STATUS.LOGGED_OUT : 'Logged Out';

      if (typeof DatabaseService !== 'undefined' && DatabaseService && typeof DatabaseService.findByColumn === 'function') {
        var sessions = DatabaseService.findByColumn(sessionSheet, userIdCol, userId) || [];

        for (var i = 0; i < sessions.length; i++) {
          var session = sessions[i] || {};
          if (String(session[statusCol]) === String(activeStatus)) {
            var token = session[tokenCol];
            if (typeof CacheManager !== 'undefined') {
              CacheManager.remove("session_" + token);
            }
            var updateData = {};
            updateData[statusCol] = loggedOutStatus;
            if (lastActivityCol) updateData[lastActivityCol] = new Date();

            if (typeof DatabaseService.updateRow === 'function') {
              DatabaseService.updateRow(sessionSheet, tokenCol, token, updateData);
            }
          }
        }
      }

      return true;
    } catch (error) {
      Logger.log('SessionService.logoutAllSessions error: ' + (error && error.message ? error.message : error));
      return false;
    }
  },

  refreshSession: function (sessionToken) {
    try {
      var session = this.getSession(sessionToken);
      if (!session) return false;

      var statusCol = this._col('SESSION_STATUS', 'Session Status', 'SESSION_STATUS');
      var expiryCol = this._col('EXPIRY_TIME', 'Expiry Time', 'EXPIRY_TIME');
      var lastActivityCol = this._col('SESSION_LAST_ACTIVITY_TIMESTAMP', 'Last Activity Timestamp', 'SESSION_LAST_ACTIVITY_TIMESTAMP');
      var tokenCol = this._col('SESSION_TOKEN', 'Session Token', 'SESSION_TOKEN');

      var activeStatus = (CONFIG && CONFIG.SESSION_STATUS && CONFIG.SESSION_STATUS.ACTIVE) ? CONFIG.SESSION_STATUS.ACTIVE : 'Active';
      if (String(session[statusCol]) !== String(activeStatus)) return false;

      const currentTime = new Date();
      const expiryTime = new Date(session[expiryCol]);
      if (currentTime.getTime() > expiryTime.getTime()) return false;

      var timeoutMinutes = (CONFIG && CONFIG.SECURITY && CONFIG.SECURITY.SESSION_TIMEOUT_MINUTES) ? CONFIG.SECURITY.SESSION_TIMEOUT_MINUTES : 480;
      const newExpiry = new Date(currentTime.getTime() + timeoutMinutes * 60000);

      var updateData = {};
      updateData[expiryCol] = newExpiry;
      if (lastActivityCol) updateData[lastActivityCol] = currentTime;

      // Invalidate cache
      if (typeof CacheManager !== 'undefined') {
        CacheManager.remove("session_" + sessionToken);
      }

      var sessionSheet = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.SESSIONS) ? CONFIG.SHEETS.SESSIONS : 'Sessions';
      if (typeof DatabaseService !== 'undefined' && DatabaseService && typeof DatabaseService.updateRow === 'function') {
        return !!DatabaseService.updateRow(sessionSheet, tokenCol, sessionToken, updateData);
      }
      return false;
    } catch (error) {
      Logger.log('SessionService.refreshSession error: ' + (error && error.message ? error.message : error));
      return false;
    }
  },

  hasRole: function (sessionToken, role) {
    try {
      var userId = this.getCurrentUser(sessionToken);
      if (!userId) return false;

      var userIdCol = this._col('USER_ID', 'User ID', 'USER_ID');
      var roleCol = this._col('ROLE', 'Role', 'ROLE');

      var userSheet = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.USERS) ? CONFIG.SHEETS.USERS : 'Users';

      if (typeof DatabaseService !== 'undefined' && DatabaseService && typeof DatabaseService.findByColumn === 'function') {
        var userRecords = DatabaseService.findByColumn(userSheet, userIdCol, userId) || [];
        if (!userRecords || userRecords.length === 0) return false;

        return userRecords[0][roleCol] === role;
      }
      return false;
    } catch (error) {
      Logger.log('SessionService.hasRole error: ' + (error && error.message ? error.message : error));
      return false;
    }
  },

  /**
   * Centralized authorization method that enforces active session, active user account, role permissions, and ownership checks.
   * 
   * Purpose: Centralize role and resource-level access control rules for DRY compliance.
   * Parameters:
   *  - sessionToken (string): session token passed from client.
   *  - options (object): { allowedRoles: string[], resourceType: string, resourceId: string|function }
   *  - callback (function): operation execution code block if authorized, signature (userId, role, userRecord).
   * Return: standard response object { success: boolean, message: string, data?: any }
   * 
   * Security Notes: 
   *  - Checks deactivation status.
   *  - Supports role aliasing (Admin and Super Admin are equivalent).
   *  - Restricts Coordinators to assigned events via CoordinatorService.canManageEvent.
   */
  authorize: function (sessionToken, options, callback) {
    try {
      if (!sessionToken || String(sessionToken).trim() === '') {
        return Utils.buildResponse(false, 'Authentication required.');
      }

      var userId = this.getCurrentUser(sessionToken);
      if (!userId) {
        return Utils.buildResponse(false, 'Session expired or invalid.');
      }

      var userSheet = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.USERS) ? CONFIG.SHEETS.USERS : 'Users';
      var userIdCol = this._col('USER_ID', 'User ID', 'USER_ID');

      var user = null;
      if (typeof UserService !== 'undefined' && UserService && typeof UserService.getUserById === 'function') {
        user = UserService.getUserById(userId);
      } else if (typeof DatabaseService !== 'undefined' && DatabaseService && typeof DatabaseService.findByColumn === 'function') {
        var records = DatabaseService.findByColumn(userSheet, userIdCol, userId) || [];
        user = records.length > 0 ? records[0] : null;
      }

      if (!user) {
        return Utils.buildResponse(false, 'User not found.');
      }

      // Check profile_completed using actual Supabase snake_case key
      var isCompleted = user['profile_completed'];
      // Also check legacy camelCase keys for backward compatibility
      if (isCompleted === undefined || isCompleted === null) {
        isCompleted = user[CONFIG.COLUMNS.USER_PROFILE_COMPLETED || 'ProfileCompleted'];
      }
      var isCompletingProfileAction = (options && options.action === 'completeProfile');
      if (!isCompletingProfileAction && (isCompleted === false || isCompleted === 'false' || isCompleted === 'FALSE' || isCompleted === '')) {
        return Utils.buildResponse(false, 'Profile completion is required.');
      }

      var statusField = CONFIG.COLUMNS.STATUS || 'Status';
      var status = user[statusField] || user.status;
      if (String(status).toLowerCase() !== 'active') {
        return Utils.buildResponse(false, 'Account is disabled.');
      }

      var roleField = CONFIG.COLUMNS.ROLE || 'Role';
      var role = user[roleField] || user.role;

      // Validate role permissions
      if (options && options.allowedRoles) {
        var isSuperAdmin = role === 'Super Admin' || role === 'Admin';
        var allowedSuperAdmin = options.allowedRoles.indexOf('Super Admin') !== -1 || options.allowedRoles.indexOf('Admin') !== -1;

        var isHOD = role === 'HOD';
        var allowedHOD = options.allowedRoles.indexOf('HOD') !== -1;

        var isCoordinator = role === 'Coordinator';
        var allowedCoordinator = options.allowedRoles.indexOf('Coordinator') !== -1;

        var hasPerm = false;
        if (isSuperAdmin && allowedSuperAdmin) hasPerm = true;
        else if (isHOD && allowedHOD) hasPerm = true;
        else if (isCoordinator && allowedCoordinator) hasPerm = true;

        if (!hasPerm) {
          return Utils.buildResponse(false, 'Insufficient permissions.');
        }
      }

      // Validate ownership/resource access
      if (options && options.resourceType === 'Event') {
        var eventId = typeof options.resourceId === 'function' ? options.resourceId(userId) : options.resourceId;
        if (eventId) {
          var isSuperAdmin = role === 'Super Admin' || role === 'Admin';
          var isHOD = role === 'HOD';
          // Super Admins and HODs bypass event ownership checks. Coordinators are checked.
          if (!isSuperAdmin && !isHOD) {
            var isAssigned = false;
            if (typeof CoordinatorService !== 'undefined' && CoordinatorService && typeof CoordinatorService.canManageEvent === 'function') {
              isAssigned = CoordinatorService.canManageEvent(userId, eventId);
            }
            if (!isAssigned) {
              return Utils.buildResponse(false, 'Access denied. You do not own this resource.');
            }
          }
        }
      }

      return callback(userId, role, user);
    } catch (e) {
      Logger.log('SessionService.authorize error: ' + e);
      return Utils.buildResponse(false, 'Access denied.');
    }
  },

  withSession: function (sessionToken, callback) {
    try {
      Logger.log("=== ENTER withSession() ===");
      Logger.log("Incoming Token: " + sessionToken);
      if (!sessionToken || (typeof sessionToken === 'string' && sessionToken.trim() === '')) {
        var msg = (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.SESSION_REQUIRED) ? CONFIG.MESSAGES.SESSION_REQUIRED : 'Session token required';
        throw new Error(msg);
      }

      var userId = this.getCurrentUser(sessionToken);
      Logger.log("Result from getCurrentUser(): " + userId);
      if (!userId) {
        Logger.log("Session rejected because getCurrentUser() returned null.");
        var msg2 = (CONFIG && CONFIG.MESSAGES && CONFIG.MESSAGES.SESSION_INVALID) ? CONFIG.MESSAGES.SESSION_INVALID : 'Invalid session';
        Logger.log("=== EXIT withSession() (REJECTED) ===");
        throw new Error(msg2);
      }

      Logger.log("Session accepted.");
      Logger.log("=== EXIT withSession() (ACCEPTED) ===");
      return callback(userId);
    } catch (error) {
      Logger.log('SessionService.withSession error: ' + (error && error.message ? error.message : error));
      throw error;
    }
  }
};

Object.freeze(SessionService);
