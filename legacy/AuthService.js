/**
 * AuthService - production-ready authentication service.
 * Notes:
 * - Uses only CONFIG, DatabaseService, Utils, ValidationService, IdService.
 * - No direct Google Sheets access.
 * - Session management delegates to SessionService (existing in codebase).
 */
const AuthService = {

  // --------------------
  // Private helpers
  // --------------------

  _getUsersSheetKey: function () {
    return CONFIG.SHEETS && CONFIG.SHEETS.USERS;
  },

  _getUserById: function (userId) {
    try {
      var usersSheet = this._getUsersSheetKey();
      var userCol = CONFIG.ID_COLUMNS && CONFIG.ID_COLUMNS.USERS;
      if (!usersSheet || !userCol) return null;
      var records = DatabaseService.findByColumn(usersSheet, userCol, userId, { caseSensitive: true, strict: true });
      return records && records.length ? records[0] : null;
    } catch (e) {
      Logger.log('AuthService._getUserById error: ' + (e && e.message ? e.message : e));
      return null;
    }
  },

  _getUserSafe: function (user) {
    return Utils && Utils.sanitizeUser ? Utils.sanitizeUser(user) : user;
  },

  _verifyPassword: function (user, password) {
    try {
      if (!user || !CONFIG.COLUMNS) {
        return false;
      }

      var hashCol = CONFIG.COLUMNS.USER_PASSWORD_HASH;
      if (!hashCol || !user[hashCol]) {
        return false;
      }

      var storedPassword = String(user[hashCol]).trim();
      var inputPassword = String(password || "").trim();

      // Direct plain text password verification for project requirements
      if (storedPassword === inputPassword) {
        return true;
      }

      // Hash comparison fallback in case hashed passwords exist
      var saltCol = CONFIG.COLUMNS.USER_SALT;
      var storedSalt = (saltCol && user[saltCol]) ? String(user[saltCol]).trim() : "";
      var calculatedHash = this._hashPassword(password, storedSalt);

      if (storedPassword === calculatedHash) {
        return true;
      }

      if (storedSalt && storedSalt !== "" && storedSalt.toUpperCase() !== "N/A") {
        var legacyHash = Utils.hashString(String(password).trim() + ":" + storedSalt);
        if (storedPassword === legacyHash) return true;
      }

      return false;
    } catch (e) {
      Logger.log("AuthService._verifyPassword error: " + e);
      return false;
    }
  },
  _hashPassword: function (password, salt) {
    try {

      password = String(password || "").trim();
      salt = String(salt || "").trim();

      // Ignore empty or N/A salt
      if (
        salt &&
        salt !== "" &&
        salt.toUpperCase() !== "N/A"
      ) {
        return Utils.hashString(salt + ":" + password);
      }

      return Utils.hashString(password);

    } catch (e) {
      Logger.log("AuthService._hashPassword error: " + e);
      return "";
    }
  },
  _createSession: function (user) {
    // SessionService is already part of the app; AuthService delegates to it.
    var sessionToken = SessionService.createSession(user);
    return { token: sessionToken, user: this._getUserSafe(user) };
  },

  _standardError: function (msg) {
    return Utils.buildResponse(false, msg || CONFIG.MESSAGES.ERROR_DEFAULT);
  },

  _standardSuccess: function (msg, data) {
    return Utils.buildResponse(true, msg || CONFIG.MESSAGES.SUCCESS_DEFAULT, data || {});
  },

  _incrementFailedAttempts: function (userId, currentAttempts) {
    try {
      // Uses CONFIG-driven column names where possible.
      var attemptsCol = CONFIG.COLUMNS.USER_FAILED_ATTEMPTS;
      var lockCol = CONFIG.COLUMNS.USER_ACCOUNT_LOCKED;
      var usersSheet = CONFIG.SHEETS.USERS;
      var max = CONFIG.SECURITY.MAX_LOGIN_ATTEMPTS;

      if (!attemptsCol || !lockCol || !usersSheet) return;

      var next = currentAttempts + 1;
      var updates = {};
      updates[attemptsCol] = next;
      if (typeof max === 'number' && next >= max) updates[lockCol] = "Yes";

      DatabaseService.updateRow(usersSheet, CONFIG.ID_COLUMNS.USERS, userId, updates);
    } catch (e) {
      Logger.log('AuthService._incrementFailedAttempts error: ' + (e && e.message ? e.message : e));
    }
  },

  _resetFailedAttempts: function (userId) {
    try {
      var attemptsCol = CONFIG.COLUMNS.USER_FAILED_ATTEMPTS;
      if (!attemptsCol) return;
      DatabaseService.updateRow(CONFIG.SHEETS.USERS, CONFIG.ID_COLUMNS.USERS, userId, (function () { var u = {}; u[attemptsCol] = 0; return u; })());
    } catch (e) {
      Logger.log('AuthService._resetFailedAttempts error: ' + (e && e.message ? e.message : e));
    }
  },

  _getLoginAttemptCount: function (user) {
    try {
      var attemptsCol = CONFIG.COLUMNS.USER_FAILED_ATTEMPTS;
      if (!attemptsCol || user[attemptsCol] === undefined || user[attemptsCol] === null) return 0;
      return parseInt(user[attemptsCol], 10) || 0;
    } catch (e) {
      Logger.log('AuthService._getLoginAttemptCount error: ' + (e && e.message ? e.message : e));
      return 0;
    }
  },

  _isAccountLocked: function (user) {
    try {
      var lockCol = CONFIG.COLUMNS.USER_ACCOUNT_LOCKED;
      if (!lockCol || !user) return false;

      var value = String(user[lockCol]).trim().toLowerCase();

      return (
        value === "yes" ||
        value === "true" ||
        value === "1"
      );

    } catch (e) {
      Logger.log(
        "AuthService._isAccountLocked error: " +
        (e && e.message ? e.message : e)
      );
      return false;
    }
  },

  // --------------------
  // Public methods
  // --------------------

  login: function (loginData) {
    try {
      var validationResult = ValidationService.validateLogin(loginData);
      if (!validationResult.valid) {
        return Utils.buildResponse(false, validationResult.errors.join(' '));
      }

      var identifier = String(loginData.employeeId || loginData.employee_id || loginData.usernameOrEmail || loginData.username || loginData.email || '').trim();
      var password = loginData.password;

      var user = null;
      if (identifier) {
        user = DatabaseService.findOne(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_EMPLOYEE_ID || 'employee_id', identifier);
        if (!user) {
          user = DatabaseService.findOne(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_USERNAME || 'username', identifier);
        }
        if (!user) {
          user = DatabaseService.findOne(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_EMAIL_ADDRESS || 'email_address', identifier);
        }
      }

      Logger.log("Identifier: " + identifier);
      Logger.log("User Found:");
      Logger.log(JSON.stringify(user));

      Logger.log("Verify Password:");
      Logger.log(this._verifyPassword(user, password));
      if (!user) return this._standardError(CONFIG.MESSAGES.INVALID_CREDENTIALS);

      // Faculty validation: Employee ID must match a record in the faculty sheet
      var userRoleStr = String(user[CONFIG.COLUMNS.USER_ROLE] || user.role || '').trim().toUpperCase();
      if (userRoleStr === 'FACULTY') {
        var empId = String(user[CONFIG.COLUMNS.USER_EMPLOYEE_ID] || user.employee_id || '').trim().toUpperCase();
        var facultySheet = CONFIG.SHEETS.FACULTY;
        var facultyEmpIdCol = CONFIG.COLUMNS.FACULTY_EMPLOYEE_ID || 'employee_id';
        var facultyObj = DatabaseService.findOne(facultySheet, facultyEmpIdCol, empId);
        if (!facultyObj) {
          return this._standardError("Access Denied: Your Employee ID is not registered in the Faculty database.");
        }
      }

      // Extract internal User ID
      var userId = user[CONFIG.COLUMNS.USER_ID];

      // User status verification
      var statusCol = CONFIG.COLUMNS.USER_STATUS;
      if (statusCol && String(user[statusCol] || '').trim().toLowerCase() === String(CONFIG.USER_STATUS.SUSPENDED || 'Suspended').toLowerCase()) {
        return this._standardError(CONFIG.MESSAGES.ACCOUNT_SUSPENDED || 'Your account is suspended.');
      }

      if (this._isAccountLocked(user)) {
        return this._standardError(CONFIG.MESSAGES.ACCOUNT_LOCKED);
      }

      if (!this._verifyPassword(user, password)) {
        var attempts = this._getLoginAttemptCount(user);
        this._incrementFailedAttempts(userId, attempts);
        return this._standardError(CONFIG.MESSAGES.INVALID_PASSWORD);
      }

      this._resetFailedAttempts(userId);

      // Optional: first login detection
      // Commented out blocking block since frontend has no pre-login change password UI.
      // Users can change their password on the Profile page after login.
      /*
      var firstLoginCol = CONFIG.COLUMNS.USER_FIRST_LOGIN;
      if (firstLoginCol && user[firstLoginCol] === true) {
        return Utils.buildResponse(true, CONFIG.MESSAGES.FIRST_LOGIN, { requiresPasswordChange: true });
      }
      */

      // Session creation via SessionService only
      if (!CONFIG.SECURITY.ALLOW_MULTIPLE_SESSIONS && SessionService.isUserLoggedIn && SessionService.isUserLoggedIn(userId)) {
        SessionService.logoutAllSessions(userId);
      }

      // Update user presence with correct Supabase snake_case column names
      try {
        var loginUpdates = {
          'last_login_timestamp': new Date().toISOString(),
          'updated_at': new Date().toISOString()
        };
        DatabaseService.updateRow(CONFIG.SHEETS.USERS, 'user_id', userId, loginUpdates);
      } catch (e) {
        Logger.log('AuthService login presence update error: ' + e.message);
      }

      var sessionData = this._createSession(user);
      try {
        AuditService.logAction(userId, 'AuthService', 'LOGIN', userId, 'User', 'User login', '', 'SUCCESS', userId);
      } catch (error) {
        Logger.log(error);
      }
      return Utils.buildResponse(true, CONFIG.MESSAGES.LOGIN_SUCCESS, sessionData);
    } catch (e) {
      Logger.log('AuthService.login error: ' + (e && e.message ? e.message : e));
      return this._standardError(CONFIG.MESSAGES.SESSION_CREATE_FAILED);
    }
  }
  ,

  logout: function (sessionToken) {
    try {
      var userId = SessionService.getCurrentUser && SessionService.getCurrentUser(sessionToken);
      if (userId) {
        var updates = {
          'last_logout_timestamp': new Date().toISOString(),
          // 'online_status': 'Offline', maked it comment
          'last_seen': new Date().toISOString(),
          'updated_at': new Date().toISOString()
        };
        DatabaseService.updateRow(CONFIG.SHEETS.USERS, 'user_id', userId, updates);
      }

      var ok = SessionService.destroySession(sessionToken);
      if (ok) return this._standardSuccess(CONFIG.MESSAGES.LOGOUT_SUCCESS);
      return this._standardError(CONFIG.MESSAGES.LOGOUT_FAILED);
    } catch (e) {
      Logger.log('AuthService.logout error: ' + (e && e.message ? e.message : e));
      return this._standardError(CONFIG.MESSAGES.LOGOUT_FAILED);
    }
  },

  authenticate: function (sessionToken) {
    try {
      if (!SessionService.isLoggedIn || !SessionService.isLoggedIn(sessionToken)) {
        return this._standardError(CONFIG.MESSAGES.SESSION_INVALID);
      }
      var userId = SessionService.getCurrentUser && SessionService.getCurrentUser(sessionToken);
      if (!userId) return this._standardError(CONFIG.MESSAGES.USER_NOT_FOUND_SESSION);

      var user = this._getUserById(userId);
      if (!user) return this._standardError(CONFIG.MESSAGES.USER_RECORD_MISSING);

      return Utils.buildResponse(true, CONFIG.MESSAGES.AUTH_SUCCESS, { user: this._getUserSafe(user) });
    } catch (e) {
      Logger.log('AuthService.authenticate error: ' + (e && e.message ? e.message : e));
      return this._standardError(CONFIG.MESSAGES.SESSION_INVALID);
    }
  },

  validateCredentials: function (userId, password) {
    try {
      var user = this._getUserById(userId);
      if (!user) return Utils.buildResponse(false, CONFIG.MESSAGES.INVALID_CREDENTIALS);

      if (this._isAccountLocked(user)) return Utils.buildResponse(false, CONFIG.MESSAGES.ACCOUNT_LOCKED);
      if (!this._verifyPassword(user, password)) return Utils.buildResponse(false, CONFIG.MESSAGES.INVALID_PASSWORD);

      return Utils.buildResponse(true, CONFIG.MESSAGES.VALIDATION_FAILED, { user: this._getUserSafe(user) });
    } catch (e) {
      Logger.log('AuthService.validateCredentials error: ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, CONFIG.MESSAGES.INVALID_CREDENTIALS);
    }
  },

  verifyPassword: function (user, password) {
    try {
      return this._verifyPassword(user, password);
    } catch (e) {
      Logger.log('AuthService.verifyPassword error: ' + (e && e.message ? e.message : e));
      return false;
    }
  },

  hashPassword: function (password, salt) {
    try {
      return this._hashPassword(password, salt);
    } catch (e) {
      Logger.log('AuthService.hashPassword error: ' + (e && e.message ? e.message : e));
      return null;
    }
  },

  changePassword: function (userId, oldPassword, newPassword) {
    try {
      var reqErr = ValidationService.validateRequired(newPassword, 'New Password');
      if (reqErr) return Utils.buildResponse(false, reqErr);

      var lenErr = ValidationService.validateLength(newPassword, CONFIG.SECURITY.MIN_PASSWORD_LENGTH, CONFIG.SECURITY.MAX_PASSWORD_LENGTH, 'Password');
      if (lenErr) return Utils.buildResponse(false, lenErr);

      var user = this._getUserById(userId);
      if (!user) return Utils.buildResponse(false, CONFIG.MESSAGES.USER_NOT_FOUND);

      if (!this._verifyPassword(user, oldPassword)) return Utils.buildResponse(false, CONFIG.MESSAGES.INCORRECT_OLD_PASSWORD);

      var hashCol = CONFIG.COLUMNS.USER_PASSWORD_HASH;
      if (!hashCol) return Utils.buildResponse(false, CONFIG.MESSAGES.PASSWORD_CHANGE_FAILED);

      var saltCol = CONFIG.COLUMNS.USER_SALT;
      var hashed = this._hashPassword(newPassword, saltCol ? user[saltCol] : null);

      var updates = {};
      updates[hashCol] = hashed;

      if (CONFIG.COLUMNS.USER_FIRST_LOGIN) updates[CONFIG.COLUMNS.USER_FIRST_LOGIN] = false;
      if (CONFIG.COLUMNS.USER_FAILED_ATTEMPTS) updates[CONFIG.COLUMNS.USER_FAILED_ATTEMPTS] = 0;
      if (CONFIG.COLUMNS.USER_PASSWORD_LAST_CHANGED) updates[CONFIG.COLUMNS.USER_PASSWORD_LAST_CHANGED] = new Date();
      if (CONFIG.COLUMNS.USER_PASSWORD_RESET_REQUIRED) updates[CONFIG.COLUMNS.USER_PASSWORD_RESET_REQUIRED] = false;

      if (CONFIG.COLUMNS.USER_OTP) updates[CONFIG.COLUMNS.USER_OTP] = null;
      if (CONFIG.COLUMNS.USER_OTP_EXPIRY) updates[CONFIG.COLUMNS.USER_OTP_EXPIRY] = null;
      if (CONFIG.COLUMNS.USER_OTP_ATTEMPTS) updates[CONFIG.COLUMNS.USER_OTP_ATTEMPTS] = 0;

      var ok = DatabaseService.updateRow(CONFIG.SHEETS.USERS, CONFIG.ID_COLUMNS.USERS, userId, updates);
      if (ok) {
        if (typeof SessionService !== 'undefined' && SessionService && typeof SessionService.logoutAllSessions === 'function') {
          SessionService.logoutAllSessions(userId);
        }
        return Utils.buildResponse(true, CONFIG.MESSAGES.PASSWORD_CHANGED);
      }
      return Utils.buildResponse(false, CONFIG.MESSAGES.PASSWORD_CHANGE_FAILED);
    } catch (e) {
      Logger.log('AuthService.changePassword error: ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, CONFIG.MESSAGES.PASSWORD_CHANGE_FAILED);
    }
  },

  forgotPassword: function (userId) {
    try {
      // Backward compatible placeholder: generateOTP.
      return this.generateOTP(userId);
    } catch (e) {
      Logger.log('AuthService.forgotPassword error: ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, CONFIG.MESSAGES.OTP_GENERATION_FAILED);
    }
  },

  generateOTP: function (userId) {
    try {
      var user = this._getUserById(userId);
      if (!user) {
        return Utils.buildResponse(false, CONFIG.MESSAGES.USER_NOT_FOUND);
      }

      var otp = Utils.generateOTP();
      var expiryMs = CONFIG.SECURITY.OTP_EXPIRY_MINUTES
        ? (CONFIG.SECURITY.OTP_EXPIRY_MINUTES * 60000)
        : (CONFIG.SECURITY.OTP_EXPIRY_MS || (10 * 60000));

      var updates = {};

      if (CONFIG.COLUMNS.USER_OTP)
        updates[CONFIG.COLUMNS.USER_OTP] = otp;

      if (CONFIG.COLUMNS.USER_OTP_EXPIRY)
        var expiryDate = new Date(Date.now() + expiryMs);
      updates[CONFIG.COLUMNS.USER_OTP_EXPIRY] = expiryDate;

      if (CONFIG.COLUMNS.USER_OTP_ATTEMPTS)
        updates[CONFIG.COLUMNS.USER_OTP_ATTEMPTS] = 0;

      // ===== DEBUG =====


      var result = DatabaseService.updateRow(
        CONFIG.SHEETS.USERS,
        CONFIG.ID_COLUMNS.USERS,
        userId,
        updates
      );



      var updatedUser = this._getUserById(userId);
      //front end----------
      // ==========================================
      // ADD THIS EMAIL TRIGGER RIGHT BEFORE THE RETURN STATEMENT:
      // ==========================================
      var emailCol = CONFIG.COLUMNS.USER_EMAIL || "Email Address";
      var userEmail = updatedUser[emailCol] || updatedUser["Email"] || updatedUser["Email Address"];


      if (userEmail) {
        var subject = "BVC Event Management - Reset OTP Token Request";
        var body = "Hello,\n\nYour 6-digit password recovery verification token code is: " + otp + "\nThis code will expire in 5 minutes.\n\nIf you did not request this code, please ignore this email securely.";

        try {
          MailApp.sendEmail(userEmail, subject, body);
          Logger.log("OTP Email dispatched successfully to: " + userEmail);
        } catch (emailError) {
          Logger.log("Error sending OTP email: " + emailError.message);
          return Utils.buildResponse(false, "Email Error: " + emailError.message);
        }
      } else {
        Logger.log("Error: User found but email column value was missing/empty.");
        return Utils.buildResponse(false, "Database Error: No email address found for this user.");
      }
      // ==========================================
      // =================
      //front end----------
      return Utils.buildResponse(true, CONFIG.MESSAGES.OTP_GENERATED);

    } catch (e) {
      Logger.log("AuthService.generateOTP error: " + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, CONFIG.MESSAGES.OTP_GENERATION_FAILED);
    }
  },

  verifyOTP: function (userId, otp) {
    try {
      var user = this._getUserById(userId);
      if (!user) {
        return Utils.buildResponse(false, CONFIG.MESSAGES.USER_NOT_FOUND);
      }

      var attemptsCol = CONFIG.COLUMNS.USER_OTP_ATTEMPTS;
      var expiryCol = CONFIG.COLUMNS.USER_OTP_EXPIRY;
      var otpCol = CONFIG.COLUMNS.USER_OTP;

      // Current OTP attempts
      var attempts = attemptsCol ? (parseInt(user[attemptsCol], 10) || 0) : 0;

      if (
        typeof CONFIG.SECURITY.MAX_OTP_ATTEMPTS === "number" &&
        attempts >= CONFIG.SECURITY.MAX_OTP_ATTEMPTS
      ) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.OTP_MAX_ATTEMPTS_EXCEEDED
        );
      }

      // ===========================
      // NEW CODE STARTS HERE
      // Check if an OTP actually exists
      // ===========================
      if (
        otpCol &&
        (!user[otpCol] || String(user[otpCol]).trim() === "")
      ) {
        Logger.log("NO ACTIVE OTP");
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.OTP_INVALID
        );
      }
      // ===========================
      // NEW CODE ENDS HERE
      // ===========================

      // Check OTP expiry
      if (expiryCol && user[expiryCol]) {
        var expiry = new Date(user[expiryCol]);

        if (new Date() > expiry) {
          return Utils.buildResponse(false, CONFIG.MESSAGES.OTP_EXPIRED);
        }
      }

      // Verify OTP (Check both string match and integer match to handle Google Sheets leading-zero removal)
      var storedOtp = String(user[otpCol]).trim();
      var inputOtp = String(otp).trim();

      if (
        otpCol &&
        storedOtp !== inputOtp &&
        parseInt(storedOtp, 10) !== parseInt(inputOtp, 10)
      ) {
        var updates = {};

        if (attemptsCol) {
          updates[attemptsCol] = attempts + 1;
        }

        DatabaseService.updateRow(
          CONFIG.SHEETS.USERS,
          CONFIG.ID_COLUMNS.USERS,
          userId,
          updates
        );

        return Utils.buildResponse(false, CONFIG.MESSAGES.OTP_INVALID);
      }

      // Do NOT clear OTP here. It must remain in the database so it can be verified 
      // again in Step 3 when the user actually submits the new password. 
      // It will be cleared inside resetPassword() after success.

      return Utils.buildResponse(true, CONFIG.MESSAGES.OTP_VERIFIED);

    } catch (e) {
      Logger.log(
        "AuthService.verifyOTP error: " +
        (e && e.message ? e.message : e)
      );

      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.OTP_VERIFICATION_FAILED
      );
    }
  },

  resetPassword: function (userId, otp, newPassword) {
    try {
      var user = this._getUserById(userId);
      if (!user) return Utils.buildResponse(false, CONFIG.MESSAGES.USER_NOT_FOUND);

      var otpVerification = this.verifyOTP(userId, otp);
      if (!otpVerification.success) return otpVerification;

      var reqErr = ValidationService.validateRequired(newPassword, 'New Password');
      if (reqErr) return Utils.buildResponse(false, reqErr);

      var lenErr = ValidationService.validateLength(newPassword, CONFIG.SECURITY.MIN_PASSWORD_LENGTH, CONFIG.SECURITY.MAX_PASSWORD_LENGTH, 'Password');
      if (lenErr) return Utils.buildResponse(false, lenErr);

      var hashCol = CONFIG.COLUMNS.USER_PASSWORD_HASH;
      var saltCol = CONFIG.COLUMNS.USER_SALT;
      var hashed = this._hashPassword(newPassword, saltCol ? user[saltCol] : null);

      var updates = {};
      updates[hashCol] = hashed;
      if (CONFIG.COLUMNS.USER_FIRST_LOGIN) updates[CONFIG.COLUMNS.USER_FIRST_LOGIN] = false;
      if (CONFIG.COLUMNS.USER_FAILED_ATTEMPTS) updates[CONFIG.COLUMNS.USER_FAILED_ATTEMPTS] = 0;
      if (CONFIG.COLUMNS.USER_PASSWORD_LAST_CHANGED) updates[CONFIG.COLUMNS.USER_PASSWORD_LAST_CHANGED] = new Date();
      if (CONFIG.COLUMNS.USER_PASSWORD_RESET_REQUIRED) updates[CONFIG.COLUMNS.USER_PASSWORD_RESET_REQUIRED] = false;

      if (CONFIG.COLUMNS.USER_OTP)
        updates[CONFIG.COLUMNS.USER_OTP] = "";

      if (CONFIG.COLUMNS.USER_OTP_EXPIRY)
        updates[CONFIG.COLUMNS.USER_OTP_EXPIRY] = "";

      if (CONFIG.COLUMNS.USER_OTP_ATTEMPTS)
        updates[CONFIG.COLUMNS.USER_OTP_ATTEMPTS] = 0;

      var ok = DatabaseService.updateRow(CONFIG.SHEETS.USERS, CONFIG.ID_COLUMNS.USERS, userId, updates);
      if (ok) {
        if (typeof SessionService !== 'undefined' && SessionService && typeof SessionService.logoutAllSessions === 'function') {
          SessionService.logoutAllSessions(userId);
        }
        return Utils.buildResponse(true, CONFIG.MESSAGES.PASSWORD_RESET_SUCCESS);
      }
      return Utils.buildResponse(false, CONFIG.MESSAGES.PASSWORD_RESET_FAILED);
    } catch (e) {
      Logger.log('AuthService.resetPassword error: ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, CONFIG.MESSAGES.PASSWORD_RESET_FAILED);
    }
  },

  unlockAccount: function (userId) {
    try {
      var updates = {};
      var lockCol = CONFIG.COLUMNS.USER_ACCOUNT_LOCKED;
      var attemptsCol = CONFIG.COLUMNS.USER_FAILED_ATTEMPTS;
      if (lockCol) updates[lockCol] = "No";
      if (attemptsCol) updates[attemptsCol] = 0;

      var success = DatabaseService.updateRow(CONFIG.SHEETS.USERS, CONFIG.ID_COLUMNS.USERS, userId, updates);
      if (success) {
        return Utils.buildResponse(true, 'Account unlocked successfully');
      }
      return Utils.buildResponse(false, 'Failed to unlock account');
    } catch (e) {
      Logger.log('AuthService.unlockAccount error: ' + e.message);
      return Utils.buildResponse(false, e.message);
    }
  },

  // --------------------
  // Event Assignment Methods
  // --------------------

  getAssignedEvents: function (sessionToken) {
    try {
      var session = SessionService.validateSession(sessionToken);
      if (!session || !session.valid) return Utils.buildResponse(false, 'Invalid session');
      var userId = session.user['User ID'] || session.user.user_id;
      
      var assignmentsSheet = CONFIG.SHEETS.EVENT_ASSIGNMENTS || 'event_assignments';
      var eventsSheet = CONFIG.SHEETS.EVENTS || 'events';
      
      var myAssignments = DatabaseService.findByColumn(assignmentsSheet, CONFIG.COLUMNS.ASSIGNMENT_FACULTY_ID || 'Faculty ID', userId);
      
      if (!myAssignments || myAssignments.length === 0) {
        return Utils.buildResponse(true, 'No events assigned', { events: [] });
      }

      var allEvents = DatabaseService.findAll(eventsSheet);
      var result = [];

      myAssignments.forEach(function(assignment) {
        var evId = assignment[CONFIG.COLUMNS.ASSIGNMENT_EVENT_ID || 'Event ID'];
        var role = assignment[CONFIG.COLUMNS.ASSIGNMENT_ROLE || 'Assignment Role'];
        var eventObj = allEvents.find(function(e) { return (e['Event ID'] || e.event_id) === evId; });
        
        if (eventObj) {
          // Only return Upcoming/Scheduled/Draft events, exclude Completed/Cancelled
          var status = String(eventObj['Event Status'] || eventObj.status || '').toLowerCase();
          if (status !== 'completed' && status !== 'cancelled') {
            result.push({
              eventId: evId,
              eventName: eventObj['Event Name'] || eventObj.event_name || 'Unnamed Event',
              status: eventObj['Event Status'] || eventObj.status,
              assignmentRole: role
            });
          }
        }
      });
      
      return Utils.buildResponse(true, 'Assigned events fetched successfully', { events: result });
    } catch (e) {
      Logger.log('AuthService.getAssignedEvents error: ' + e.message);
      return Utils.buildResponse(false, e.message);
    }
  },

  getAssignmentRole: function (sessionToken, eventId) {
    try {
      var session = SessionService.validateSession(sessionToken);
      if (!session || !session.valid) return Utils.buildResponse(false, 'Invalid session');
      var userId = session.user['User ID'] || session.user.user_id;
      
      var assignmentsSheet = CONFIG.SHEETS.EVENT_ASSIGNMENTS || 'event_assignments';
      var myAssignments = DatabaseService.findByColumn(assignmentsSheet, CONFIG.COLUMNS.ASSIGNMENT_FACULTY_ID || 'Faculty ID', userId);
      
      var match = myAssignments.find(function(a) { return (a[CONFIG.COLUMNS.ASSIGNMENT_EVENT_ID || 'Event ID'] === eventId); });
      if (match) {
        return Utils.buildResponse(true, 'Assignment found', { role: match[CONFIG.COLUMNS.ASSIGNMENT_ROLE || 'Assignment Role'] });
      }
      
      return Utils.buildResponse(false, 'No assignment found for this event');
    } catch (e) {
      Logger.log('AuthService.getAssignmentRole error: ' + e.message);
      return Utils.buildResponse(false, e.message);
    }
  }
};

