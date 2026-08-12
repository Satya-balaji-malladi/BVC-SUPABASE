/**
 * UserService.gs
 * Service for handling user management.
 * Responsibilities: CRUD operations for users, activation/deactivation, searching, filtering, sorting, pagination, and profile updates.
 */
const UserService = {

  // ==============================
  // Private helpers
  // ==============================

  _usersSheet: function () {
    return CONFIG.SHEETS && CONFIG.SHEETS.USERS ? CONFIG.SHEETS.USERS : null;
  },

  _mustUsersSheet: function () {
    var s = this._usersSheet();
    if (!s) throw new Error('Users sheet mapping missing in CONFIG.SHEETS.USERS');
    return s;
  },

  _ensureUsersHeaders: function () {
    // Spreadsheet headers are not used in Supabase setup. Returning immediately to bypass Google Sheets.
    return;
  },

  _currentUserNow: function () {
    try {
      return Utils.getCurrentTimestamp();
    } catch (e) {
      Logger.log('UserService._currentUserNow error: ' + (e && e.message ? e.message : e));
      return new Date().getTime();
    }
  },

  _mustUserIdCol: function () {
    var idCol = CONFIG.COLUMNS && CONFIG.COLUMNS.USER_ID;
    if (!idCol) throw new Error('Missing CONFIG.COLUMNS.USER_ID');
    return idCol;
  },

  _mustUsernameCol: function () {
    var col = CONFIG.COLUMNS && CONFIG.COLUMNS.USER_USERNAME;

    if (!col) {
      throw new Error("Missing CONFIG.COLUMNS.USER_USERNAME");
    }

    return col;
  },
  _mustEmailCol: function () {
    var col = CONFIG.COLUMNS && CONFIG.COLUMNS.USER_EMAIL_ADDRESS;

    if (!col) {
      throw new Error("Missing CONFIG.COLUMNS.USER_EMAIL_ADDRESS");
    }

    return col;
  },
  _mustRoleCol: function () {
    var col = CONFIG.COLUMNS && (CONFIG.COLUMNS.ROLE || CONFIG.COLUMNS.USER_ROLE);
    if (!col) throw new Error('Missing CONFIG.COLUMNS.ROLE/USER_ROLE');
    return col;
  },

  _mustStatusCol: function () {
    var col = CONFIG.COLUMNS && (CONFIG.COLUMNS.STATUS || CONFIG.COLUMNS.USER_STATUS);
    if (!col) throw new Error('Missing CONFIG.COLUMNS.STATUS/USER_STATUS');
    return col;
  },

  _getPasswordColumns: function () {
    var hashCol = CONFIG.COLUMNS && CONFIG.COLUMNS.USER_PASSWORD_HASH;
    var saltCol = CONFIG.COLUMNS && (CONFIG.COLUMNS.USER_SALT || CONFIG.COLUMNS.SALT);
    return { hashCol: hashCol, saltCol: saltCol };
  },

  _sanitizeUserSafe: function (user) {
    try {
      if (!user) return null;
      if (Utils && typeof Utils.sanitizeUser === 'function') return Utils.sanitizeUser(user);
      var out = Object.assign({}, user);
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_PASSWORD_HASH) delete out[CONFIG.COLUMNS.USER_PASSWORD_HASH];
      if (CONFIG.COLUMNS && (CONFIG.COLUMNS.USER_SALT || CONFIG.COLUMNS.SALT)) {
        var saltKey = CONFIG.COLUMNS.USER_SALT || CONFIG.COLUMNS.SALT;
        delete out[saltKey];
      }
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_OTP) delete out[CONFIG.COLUMNS.USER_OTP];
      return out;
    } catch (e) {
      Logger.log('UserService._sanitizeUserSafe error: ' + (e && e.message ? e.message : e));
      return null;
    }
  },

  _isEmployeeIdAvailable: function (employeeId) {
    try {
      if (!employeeId || String(employeeId).trim() === '') return true;
      var usersSheet = this._mustUsersSheet();
      var empCol = CONFIG.COLUMNS.USER_EMPLOYEE_ID || 'Employee ID';
      var target = String(employeeId).trim().toUpperCase();

      var rows = DatabaseService.readAllRows(usersSheet) || [];
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (r[CONFIG.COLUMNS.DELETION_FLAG] === true || r[CONFIG.COLUMNS.DELETION_FLAG] === 'true') continue;
        var existing = String(r[empCol] || r['Employee ID'] || r.employee_id || r.employeeId || '').trim().toUpperCase();
        if (existing && existing === target) {
          return false;
        }
      }
      return true;
    } catch (e) {
      Logger.log('UserService._isEmployeeIdAvailable error: ' + (e && e.message ? e.message : e));
      return true;
    }
  },

  _isUsernameAvailable: function (username) {
    try {
      if (!username || String(username).trim() === '') return true;
      var usersSheet = this._mustUsersSheet();
      var usernameCol = CONFIG.COLUMNS.USER_USERNAME || 'Username';
      var target = String(username).trim().toLowerCase();

      var rows = DatabaseService.readAllRows(usersSheet) || [];
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (r[CONFIG.COLUMNS.DELETION_FLAG] === true || r[CONFIG.COLUMNS.DELETION_FLAG] === 'true') continue;
        var existing = String(r[usernameCol] || r['Username'] || r.username || '').trim().toLowerCase();
        if (existing && existing === target) {
          return false;
        }
      }
      return true;
    } catch (e) {
      Logger.log("UserService._isUsernameAvailable error: " + (e && e.message ? e.message : e));
      return true;
    }
  },

  _isEmailAvailable: function (email) {
    try {
      var usersSheet = this._mustUsersSheet();
      var col = CONFIG.COLUMNS && (CONFIG.COLUMNS.EMAIL || CONFIG.COLUMNS.USER_EMAIL);
      if (!col) throw new Error('Missing CONFIG.COLUMNS.EMAIL/USER_EMAIL');
      return !DatabaseService.exists(usersSheet, col, email);
    } catch (e) {
      Logger.log('UserService._isEmailAvailable error: ' + (e && e.message ? e.message : e));
      return false;
    }
  },

  _getUserByIdRecord: function (userId) {
    try {
      var usersSheet = this._mustUsersSheet();
      var idCol = this._mustUserIdCol();
      var records = DatabaseService.findByColumn(usersSheet, idCol, userId, { caseSensitive: true, strict: true });
      return (records && records.length) ? records[0] : null;
    } catch (e) {
      Logger.log('UserService._getUserByIdRecord error: ' + (e && e.message ? e.message : e));
      return null;
    }
  },

  _validateCreateUpdate: function (userData) {
    try {
      var validationResult = ValidationService.validateUser(userData);
      if (!validationResult || !validationResult.valid) {
        var msg = validationResult && validationResult.errors ? validationResult.errors.join(' ') : (CONFIG.MESSAGES && CONFIG.MESSAGES.VALIDATION_FAILED ? CONFIG.MESSAGES.VALIDATION_FAILED : 'Validation failed');
        return { valid: false, message: msg };
      }
      return { valid: true };
    } catch (e) {
      Logger.log('UserService._validateCreateUpdate error: ' + (e && e.message ? e.message : e));
      return { valid: false, message: (CONFIG.MESSAGES && CONFIG.MESSAGES.VALIDATION_FAILED) ? CONFIG.MESSAGES.VALIDATION_FAILED : 'Validation failed' };
    }
  },

  _buildStatusUpdate: function (statusValue) {
    var updates = {};
    var statusCol = CONFIG.COLUMNS && (CONFIG.COLUMNS.STATUS || CONFIG.COLUMNS.USER_STATUS);
    if (statusCol) updates[statusCol] = statusValue;
    if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_AT) updates[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();
    return updates;
  },

  // ==============================
  // Public API (backward compatible signatures)
  // ==============================

  /**
   * Returns the raw user record for a given userId, or null if not found.
   * Used by EventService and other services to validate coordinators.
   */
  getUserById: function (userId) {
    return this._getUserByIdRecord(userId);
  },

  getAllUsers: function (userContext) {
    Logger.log("BACKEND STEP 8a: Entering UserService.getAllUsers");
    try {
      var usersSheet = this._mustUsersSheet();
      var records = DatabaseService.readAllRows(usersSheet) || [];

      var delCol = CONFIG.COLUMNS && CONFIG.COLUMNS.DELETION_FLAG;
      if (delCol) {
        records = records.filter(function (r) { return r[delCol] !== true && r[delCol] !== "true"; });
      }

      var scopedRecords = userContext ? SecurityUtils.applyUserRLS(records, userContext) : records;

      var sanitized = [];
      for (var i = 0; i < scopedRecords.length; i++) {
        var clean = this._sanitizeUserSafe(scopedRecords[i]);
        if (clean) sanitized.push(clean);
      }
      return sanitized;
    } catch (e) {
      Logger.log('UserService.getAllUsers error: ' + (e && e.message ? e.message : e));
      return [];
    }
  },

  createUser: function (userData, callerUserContext) {
    try {
      if (!userData) return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_CREATE_FAILED) ? CONFIG.MESSAGES.USER_CREATE_FAILED : 'User data missing');

      this._ensureUsersHeaders();
      var usersSheet = this._mustUsersSheet();
      var userIdCol = this._mustUserIdCol();
      var usernameCol = this._mustUsernameCol();
      var emailCol = this._mustEmailCol();
      var roleCol = this._mustRoleCol();
      var statusCol = this._mustStatusCol();

      // Normalize keys to sheet headers
      var normalized = {};

      // 1. Employee ID
      var empIdCol = CONFIG.COLUMNS.USER_EMPLOYEE_ID || 'Employee ID';
      normalized[empIdCol] = userData[empIdCol] || userData.employeeId || userData.employee_id || ('EMP' + Math.floor(1000 + Math.random() * 9000));

      // 2. First Name & Last Name
      var firstNameCol = CONFIG.COLUMNS.USER_FIRST_NAME || 'First Name';
      var lastNameCol = CONFIG.COLUMNS.USER_LAST_NAME || 'Last Name';

      var rawFirstName = userData[firstNameCol] || userData.first_name || userData.firstName;
      var rawLastName = userData[lastNameCol] || userData.last_name || userData.lastName;

      if (!rawFirstName) {
        var fullName = userData.full_name || userData.name || '';
        var parts = fullName.trim().split(/\s+/);
        rawFirstName = parts[0] || '';
        rawLastName = rawLastName || parts.slice(1).join(' ') || '';
      }
      normalized[firstNameCol] = (rawFirstName || '').trim().toUpperCase();
      normalized[lastNameCol] = (rawLastName || '').trim().toUpperCase() || 'COORDINATOR';

      // 4. Email Address
      normalized[emailCol] = (
        userData[emailCol] ||
        userData.email ||
        userData.email_address ||
        userData.emailAddress ||
        ''
      ).trim();

      // 3. Username (Email & Username remain independent; auto-generate unique one if missing)
      var rawUsername = (userData[usernameCol] || userData.username || userData.userName || '').trim().toLowerCase();
      if (!rawUsername && normalized[emailCol]) {
        var emailPrefix = normalized[emailCol].split('@')[0].replace(/[^a-zA-Z0-9_\-]/g, '_');
        rawUsername = emailPrefix + '_' + Math.floor(100 + Math.random() * 900);
      }
      normalized[usernameCol] = rawUsername;

      // 5. Role & Status
      // DEFAULT: All new user records start as Inactive.
      // Status is controlled by StatusSyncService (event attendance-based).
      normalized[roleCol] = userData[roleCol] || userData.role || 'Coordinator';
      normalized[statusCol] = userData.status || userData[statusCol] || (CONFIG.USER_STATUS && CONFIG.USER_STATUS.INACTIVE ? CONFIG.USER_STATUS.INACTIVE : 'Inactive');

      // 6. Copy over other keys
      for (var k in userData) {
        if (normalized[k] === undefined) {
          normalized[k] = userData[k];
        }
      }

      userData = normalized;

      var username = userData[usernameCol];
      var email = userData[emailCol];
      var empId = userData[empIdCol];

      if (Utils.checkEmptyValue && Utils.checkEmptyValue(username)) {
        return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USERNAME_REQUIRED) ? CONFIG.MESSAGES.USERNAME_REQUIRED : 'Username is required');
      }
      if (Utils.checkEmptyValue && Utils.checkEmptyValue(email)) {
        return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.EMAIL_REQUIRED) ? CONFIG.MESSAGES.EMAIL_REQUIRED : 'Email is required');
      }

      var userToCreate = Object.assign({}, userData);
      userToCreate.role = userToCreate.role || (CONFIG.ROLES && CONFIG.ROLES.COORDINATOR ? CONFIG.ROLES.COORDINATOR : userToCreate[roleCol]);
      userToCreate.status = userToCreate.status || (CONFIG.USER_STATUS && CONFIG.USER_STATUS.INACTIVE ? CONFIG.USER_STATUS.INACTIVE : 'Inactive');

      // Security Enforcement:
      // Super Admin: can create Admin, HOD, Coordinator, Super Admin
      // Admin / Event Admin: can create Coordinator
      // HOD: can create Coordinator
      if (callerUserContext) {
        if (typeof callerUserContext === 'string') {
          var strCtx = callerUserContext.trim();
          var upperCtx = strCtx.toUpperCase();
          if (upperCtx === 'SYSTEM' || upperCtx === 'SUPER ADMIN' || upperCtx === 'SUPER_ADMIN' || upperCtx === 'ADMIN' || upperCtx === 'SUPERADMIN') {
            callerUserContext = { role: 'Super Admin', isSuperAdmin: true };
          } else {
            var callerUser = this.getUserById(strCtx);
            if (callerUser) {
              callerUserContext = { role: callerUser.role || callerUser['Role'] || 'Super Admin' };
            } else {
              callerUserContext = { role: 'Super Admin', isSuperAdmin: true };
            }
          }
        }
        var requestedRole = String(userData[roleCol] || userData.role || '').trim().toUpperCase();
        var callerRole = String(callerUserContext.role || '').trim().toUpperCase();
        var isCallerSuperAdmin = callerUserContext.isSuperAdmin || callerRole === 'SUPER ADMIN' || callerRole === 'SUPER_ADMIN';
        var isCallerEventAdmin = callerUserContext.isEventAdmin || callerRole === 'EVENT ADMIN' || callerRole === 'EVENT_ADMIN' || callerRole === 'ADMIN';
        var isCallerHOD = callerUserContext.isHOD || callerRole === 'HOD';

        if (isCallerSuperAdmin) {
          // Super Admin has full privilege
        } else if (isCallerEventAdmin || callerUserContext.isAdmin) {
          // Event Admin can create Coordinator accounts
          if (requestedRole !== 'COORDINATOR' && requestedRole !== 'EVENT COORDINATOR') {
            return Utils.buildResponse(false, 'Unauthorized: Event Admins can only create Coordinator accounts.');
          }
        } else if (isCallerHOD) {
          // HOD can create Event Admin and Coordinator accounts for their own department
          if (requestedRole !== 'COORDINATOR' && requestedRole !== 'ADMIN' && requestedRole !== 'EVENT ADMIN' && requestedRole !== 'EVENT_ADMIN' && requestedRole !== 'EVENT COORDINATOR') {
            return Utils.buildResponse(false, 'Unauthorized: HODs can only create Event Admin and Coordinator accounts.');
          }
          // Automatically use loggedInUser.department from session context (never trust untrusted frontend payload alone)
          const callerDept = String(callerUserContext.department || '').trim();
          if (callerDept) {
            userToCreate[CONFIG.COLUMNS.USER_DEPARTMENT || 'Department'] = callerDept;
            userToCreate.department = callerDept;
            userData[CONFIG.COLUMNS.USER_DEPARTMENT || 'Department'] = callerDept;
            userData.department = callerDept;
          } else {
            return Utils.buildResponse(false, 'Unauthorized: Logged in HOD has no department assigned.');
          }
        } else {
          // Coordinator or other roles cannot create users
          return Utils.buildResponse(false, 'Unauthorized: Only Super Admin, HOD, and Event Admin can create user accounts.');
        }
      }

      var validation = this._validateCreateUpdate(userToCreate);
      if (!validation.valid) return Utils.buildResponse(false, validation.message);

      // Duplicate Employee ID MUST NOT be allowed
      if (empId && !this._isEmployeeIdAvailable(empId)) {
        return Utils.buildResponse(false, 'Employee ID already exists');
      }

      // Duplicate Username MUST NOT be allowed
      if (!this._isUsernameAvailable(username)) {
        return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USERNAME_EXISTS) ? CONFIG.MESSAGES.USERNAME_EXISTS : 'Username already exists');
      }

      // Duplicate Email Address MUST NOT be allowed (enforces Supabase users_email_address_key unique constraint cleanly)
      if (email && !this._isEmailAvailable(email)) {
        return Utils.buildResponse(false, 'Email address "' + email + '" is already registered to another account.');
      }

      var userId = IdService.generateUserId();
      var passCols = this._getPasswordColumns();
      if (!passCols.hashCol) throw new Error('Missing CONFIG.COLUMNS.USER_PASSWORD_HASH');

      var rawPassword = userData.password || userData.Password || (Utils.generateRandomPassword ? Utils.generateRandomPassword() : String(new Date().getTime()));
      var salt = "";
      // Commented out hashing as per user request to store in plain text:
      // var hashedPassword = salt ? Utils.hashString(String(salt) + ':' + String(rawPassword).trim()) : Utils.hashString(String(rawPassword).trim());
      var hashedPassword = String(rawPassword).trim();

      var now = this._currentUserNow();

      var newUser = {};
      newUser[userIdCol] = userId;
      // Employee ID
      if (CONFIG.COLUMNS.USER_EMPLOYEE_ID) {
        newUser[CONFIG.COLUMNS.USER_EMPLOYEE_ID] =
          userData[CONFIG.COLUMNS.USER_EMPLOYEE_ID];
      }

      // First Name
      if (CONFIG.COLUMNS.USER_FIRST_NAME) {
        newUser[CONFIG.COLUMNS.USER_FIRST_NAME] =
          userData[CONFIG.COLUMNS.USER_FIRST_NAME];
      }

      // Last Name
      if (CONFIG.COLUMNS.USER_LAST_NAME) {
        newUser[CONFIG.COLUMNS.USER_LAST_NAME] =
          userData[CONFIG.COLUMNS.USER_LAST_NAME];
      }
      newUser[usernameCol] = username;
      newUser[emailCol] = email;
      newUser[roleCol] = userToCreate.role || 'COORDINATOR';
      newUser[statusCol] = (CONFIG.USER_STATUS ? CONFIG.USER_STATUS.INACTIVE : 'Inactive');
      newUser[passCols.hashCol] = hashedPassword;
      if (passCols.saltCol) newUser[passCols.saltCol] = salt || "plain";

      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_FIRST_LOGIN) newUser[CONFIG.COLUMNS.USER_FIRST_LOGIN] = true;
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_PASSWORD_RESET_REQUIRED) newUser[CONFIG.COLUMNS.USER_PASSWORD_RESET_REQUIRED] = true;
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_FAILED_ATTEMPTS) newUser[CONFIG.COLUMNS.USER_FAILED_ATTEMPTS] = 0;
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_ACCOUNT_LOCKED) newUser[CONFIG.COLUMNS.USER_ACCOUNT_LOCKED] = false;
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_PASSWORD_LAST_CHANGED) newUser[CONFIG.COLUMNS.USER_PASSWORD_LAST_CHANGED] = now;
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_PROFILE_COMPLETED) newUser[CONFIG.COLUMNS.USER_PROFILE_COMPLETED] = false;
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_ONLINE_STATUS) newUser[CONFIG.COLUMNS.USER_ONLINE_STATUS] = 'Offline';
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_LAST_SEEN) newUser[CONFIG.COLUMNS.USER_LAST_SEEN] = '';
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_LAST_LOGIN_TS) newUser[CONFIG.COLUMNS.USER_LAST_LOGIN_TS] = '';

      if (CONFIG.COLUMNS && CONFIG.COLUMNS.CREATED_AT) newUser[CONFIG.COLUMNS.CREATED_AT] = now;
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_AT) newUser[CONFIG.COLUMNS.UPDATED_AT] = now;
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.CREATED_BY) newUser[CONFIG.COLUMNS.CREATED_BY] = userData[CONFIG.COLUMNS.CREATED_BY] || userData.createdBy || username;
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_BY) newUser[CONFIG.COLUMNS.UPDATED_BY] = userData[CONFIG.COLUMNS.UPDATED_BY] || userData[CONFIG.COLUMNS.CREATED_BY] || '';

      if (CONFIG.COLUMNS && CONFIG.COLUMNS.DELETION_FLAG) newUser[CONFIG.COLUMNS.DELETION_FLAG] = false;

      // Merge all other custom fields provided in userData (e.g., Department, Designation, Phone Number)
      // that exactly match the sheet headers.
      var rowToInsert = Object.assign({}, userData, newUser);

      var inserted = DatabaseService.insertRow(usersSheet, rowToInsert);
      if (!inserted) {
        return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_CREATE_FAILED) ? CONFIG.MESSAGES.USER_CREATE_FAILED : 'User create failed');
      }

      // Save custom permission overrides if specified in the payload
      var allowedKeys = userData.allowed_permissions || userData.allowedPermissions || [];
      var deniedKeys = userData.denied_permissions || userData.deniedPermissions || [];
      if (allowedKeys.length > 0 || deniedKeys.length > 0) {
        this.saveUserPermissions(userId, allowedKeys, deniedKeys, callerUserContext ? callerUserContext.userId : 'System');
      }

      var resp = Utils.buildResponse(true, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_CREATED) ? CONFIG.MESSAGES.USER_CREATED : 'User created', {
        user: this._sanitizeUserSafe(inserted || newUser),
        userId: userId,
        user_id: userId,
        [CONFIG.COLUMNS.USER_ID || 'User ID']: userId
      });

      // Send Email to the newly created user/coordinator
      try {
        var empIdVal = userData[CONFIG.COLUMNS.USER_EMPLOYEE_ID || 'Employee ID'] || '';
        var subject = "BVC Attendance System - Your New Account Credentials";
        var body = "Hello " + (userData[CONFIG.COLUMNS.USER_FIRST_NAME || 'First Name'] || 'Coordinator') + ",\n\n" +
          "Your staff account has been created successfully in the BVC Event Attendance Management System.\n\n" +
          "Here are your login credentials:\n" +
          "• Employee ID: " + empIdVal + "\n" +
          "• Password: " + rawPassword + "\n\n" +
          "Please log in to the system and change your password upon your first login.\n\n" +
          "Best regards,\nBVC Engineering College Admin Team";

        var shouldSkipEmail = userData.skipEmail || (typeof SKIP_EMAIL !== 'undefined' && SKIP_EMAIL) || (CONFIG && CONFIG.SKIP_EMAIL);
        if (!shouldSkipEmail) {
          if (typeof MailApp !== 'undefined') {
            MailApp.sendEmail(email, subject, body);
            Logger.log("Account details email sent successfully to: " + email);
          } else if (typeof GmailApp !== 'undefined') {
            GmailApp.sendEmail(email, subject, body);
            Logger.log("Account details email sent successfully to: " + email);
          }
        } else {
          Logger.log("[EMAIL BYPASS] Skipping user creation email to: " + email);
        }
      } catch (emailErr) {
        Logger.log("Error sending new user account email: " + emailErr.message);
      }

      try {
        // userId is the entity id; updatedBy/createdBy is best-effort from input.
        AuditService.logAction(
          userId,
          'UserService',
          'CREATE_USER',
          userId,
          'User',
          'User created',
          '',
          'SUCCESS',
          (userData && (userData.updatedBy || userData[CONFIG.COLUMNS && CONFIG.COLUMNS.CREATED_BY ? CONFIG.COLUMNS.CREATED_BY : ''])) || (userData && (userData.createdBy || userData.created_by)) || username
        );
      } catch (error) {
        Logger.log(error);
      }

      return resp;
    } catch (e) {
      Logger.log('UserService.createUser error: ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, 'User create failed: ' + (e && e.message ? e.message : e));
    }
  },

  importUsers: function (usersDataArray) {
    try {
      if (!Array.isArray(usersDataArray) || usersDataArray.length === 0) {
        return Utils.buildResponse(false, 'No valid data to import');
      }

      var usersSheet = this._mustUsersSheet();
      var importedCount = 0;
      var failedCount = 0;
      var errors = [];

      for (var i = 0; i < usersDataArray.length; i++) {
        var uData = usersDataArray[i];

        // Basic required fields check to skip empty rows gracefully
        if (!uData.email || !uData.full_name) {
          failedCount++;
          continue;
        }

        // We leverage the existing createUser logic to ensure validation, ID generation, and hash/salt are handled perfectly.
        var result = this.createUser(uData);
        if (result && result.success) {
          importedCount++;
        } else {
          failedCount++;
          errors.push('Row ' + (i + 1) + ': ' + (result ? result.message : 'Failed'));
        }
      }

      if (importedCount === 0 && failedCount > 0) {
        return Utils.buildResponse(false, 'Import failed. Errors: ' + errors.join(', '));
      }

      return Utils.buildResponse(true, importedCount + ' users imported successfully. ' + (failedCount > 0 ? failedCount + ' failed.' : ''), {
        imported: importedCount,
        failed: failedCount,
        errors: errors
      });
    } catch (e) {
      Logger.log('UserService.importUsers error: ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, 'Bulk import failed');
    }
  },

  updateUser: function (userId, userData, callerUserContext) {
    try {
      var usersSheet = this._mustUsersSheet();
      var idCol = this._mustUserIdCol();

      if (!DatabaseService.exists(usersSheet, idCol, userId)) {
        return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_NOT_FOUND) ? CONFIG.MESSAGES.USER_NOT_FOUND : 'User not found');
      }

      var existing = this._getUserByIdRecord(userId);
      if (!existing) return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_NOT_FOUND) ? CONFIG.MESSAGES.USER_NOT_FOUND : 'User not found');

      if (callerUserContext && callerUserContext.isHOD) {
        const callerDept = String(callerUserContext.department || '').trim().toUpperCase();
        const existingDept = String(existing[CONFIG.COLUMNS.USER_DEPARTMENT] || existing.department || '').trim().toUpperCase();
        if (existingDept !== callerDept) {
          return Utils.buildResponse(false, 'Unauthorized: You can only edit users in your own department.');
        }
        const targetDept = String(userData[CONFIG.COLUMNS.USER_DEPARTMENT] || userData.department || '').trim().toUpperCase();
        if (targetDept && targetDept !== callerDept) {
          return Utils.buildResponse(false, 'Unauthorized: You cannot move users to another department.');
        }
      }

      var usernameCol = this._mustUsernameCol();
      var emailCol = this._mustEmailCol();
      var roleCol = this._mustRoleCol();
      var statusCol = this._mustStatusCol();

      var editableData = Object.assign({}, userData);

      // Explicitly map standard UI keys to backend configuration columns for reliable updating
      // Note: userData.status is ignored because it is now automated via StatusSyncService
      // if (userData.status !== undefined) editableData[statusCol] = userData.status;
      if (userData.role !== undefined) editableData[roleCol] = userData.role;
      if (userData.email !== undefined) editableData[emailCol] = userData.email;
      if (userData.full_name !== undefined && CONFIG.COLUMNS.USER_FIRST_NAME) editableData[CONFIG.COLUMNS.USER_FIRST_NAME] = userData.full_name;
      if (userData.employee_id !== undefined && CONFIG.COLUMNS.USER_EMPLOYEE_ID) editableData[CONFIG.COLUMNS.USER_EMPLOYEE_ID] = userData.employee_id;
      if (userData.department !== undefined && CONFIG.COLUMNS.USER_DEPARTMENT) editableData[CONFIG.COLUMNS.USER_DEPARTMENT] = userData.department;

      // Prevent overwriting identity and sensitive values
      delete editableData[idCol];
      var passCols = this._getPasswordColumns();
      if (passCols.hashCol) delete editableData[passCols.hashCol];
      if (passCols.saltCol) delete editableData[passCols.saltCol];

      // Uniqueness if changed
      if (editableData[usernameCol] !== undefined && editableData[usernameCol] !== existing[usernameCol]) {
        if (!this._isUsernameAvailable(editableData[usernameCol])) {
          return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USERNAME_EXISTS) ? CONFIG.MESSAGES.USERNAME_EXISTS : 'Username already exists');
        }
      }
      if (editableData[emailCol] !== undefined && editableData[emailCol] !== existing[emailCol]) {
        if (!this._isEmailAvailable(editableData[emailCol])) {
          return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.EMAIL_EXISTS) ? CONFIG.MESSAGES.EMAIL_EXISTS : 'Email already exists');
        }
      }

      // Audit
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_AT) editableData[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_BY && userData && userData[CONFIG.COLUMNS.UPDATED_BY] !== undefined) {
        editableData[CONFIG.COLUMNS.UPDATED_BY] = userData[CONFIG.COLUMNS.UPDATED_BY];
      }

      var validationInput = Object.assign({}, existing);
      Object.assign(validationInput, editableData);
      var validation = this._validateCreateUpdate(validationInput);
      if (!validation.valid) return Utils.buildResponse(false, validation.message);

      var updated = DatabaseService.updateRow(usersSheet, idCol, userId, editableData);
      if (!updated) return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_UPDATE_FAILED) ? CONFIG.MESSAGES.USER_UPDATE_FAILED : 'User update failed');

      // Update custom overrides if passed in the update payload
      var allowedKeys = userData.allowed_permissions || userData.allowedPermissions;
      var deniedKeys = userData.denied_permissions || userData.deniedPermissions;
      if (allowedKeys !== undefined || deniedKeys !== undefined) {
        var updatedByUserId = userData[CONFIG.COLUMNS.UPDATED_BY] || 'System';
        this.saveUserPermissions(userId, allowedKeys || [], deniedKeys || [], updatedByUserId);
      }

      var resp = Utils.buildResponse(true, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_UPDATED) ? CONFIG.MESSAGES.USER_UPDATED : 'User updated', { user: this._sanitizeUserSafe(updated) });

      try {
        var auditRemarks = (userData && (userData.updatedBy || userData[CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_BY ? CONFIG.COLUMNS.UPDATED_BY : ''])) || '';
        AuditService.logAction(
          userId,
          'UserService',
          'UPDATE_USER',
          userId,
          'User',
          'User updated',
          '',
          'SUCCESS',
          auditRemarks
        );
      } catch (error) {
        Logger.log(error);
      }

      return resp;
    } catch (e) {
      Logger.log('UserService.updateUser error: ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_UPDATE_FAILED) ? CONFIG.MESSAGES.USER_UPDATE_FAILED : 'User update failed');
    }
  },

  deleteUser: function (userId, updatedBy, callerUserContext) {
    try {
      var usersSheet = this._mustUsersSheet();
      var idCol = this._mustUserIdCol();

      if (!DatabaseService.exists(usersSheet, idCol, userId)) {
        return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_NOT_FOUND) ? CONFIG.MESSAGES.USER_NOT_FOUND : 'User not found');
      }

      if (callerUserContext && callerUserContext.isHOD) {
        var existing = this._getUserByIdRecord(userId);
        if (existing) {
          const callerDept = String(callerUserContext.department || '').trim().toUpperCase();
          const existingDept = String(existing[CONFIG.COLUMNS.USER_DEPARTMENT] || existing.department || '').trim().toUpperCase();
          if (existingDept !== callerDept) {
            return Utils.buildResponse(false, 'Unauthorized: You can only delete users in your own department.');
          }
        }
      }

      // Soft delete via DatabaseService
      var ok = DatabaseService.deleteRow(usersSheet, idCol, userId);
      if (!ok) {
        return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_DELETE_FAILED) ? CONFIG.MESSAGES.USER_DELETE_FAILED : 'User delete failed');
      }

      var resp = Utils.buildResponse(true, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_DELETED) ? CONFIG.MESSAGES.USER_DELETED : 'User deleted');
      try {
        AuditService.logAction(
          userId,
          'UserService',
          'DELETE_USER',
          userId,
          'User',
          'User deleted',
          '',
          'SUCCESS',
          updatedBy || ''
        );
      } catch (error) {
        Logger.log(error);
      }
      return resp;
    } catch (e) {
      Logger.log('UserService.deleteUser error: ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_DELETE_FAILED) ? CONFIG.MESSAGES.USER_DELETE_FAILED : 'User delete failed');
    }
  },

  restoreUser: function (userId, updatedBy, callerUserContext) {
    try {
      var usersSheet = this._mustUsersSheet();
      var idCol = this._mustUserIdCol();

      if (callerUserContext && callerUserContext.isHOD) {
        var existing = this._getUserByIdRecord(userId);
        if (existing) {
          const callerDept = String(callerUserContext.department || '').trim().toUpperCase();
          const existingDept = String(existing[CONFIG.COLUMNS.USER_DEPARTMENT] || existing.department || '').trim().toUpperCase();
          if (existingDept !== callerDept) {
            return Utils.buildResponse(false, 'Unauthorized: You can only restore users in your own department.');
          }
        }
      }

      var delCol = CONFIG.COLUMNS && CONFIG.COLUMNS.DELETION_FLAG ? CONFIG.COLUMNS.DELETION_FLAG : 'deletion_flag';
      var statusCol = CONFIG.COLUMNS && (CONFIG.COLUMNS.STATUS || CONFIG.COLUMNS.USER_STATUS) ? (CONFIG.COLUMNS.STATUS || CONFIG.COLUMNS.USER_STATUS) : 'status';

      var updates = {};
      updates[delCol] = false;
      // Status will be dynamically calculated
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_AT) updates[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_BY && updatedBy !== undefined) updates[CONFIG.COLUMNS.UPDATED_BY] = updatedBy;
      
      var success = DatabaseService.updateRow(CONFIG.SHEETS.USERS, idCol, cleanId, updates);
      if (success) {
         StatusService.refreshUserStatus(cleanId, null, false);
      }

      var updated = DatabaseService.updateRow(usersSheet, idCol, userId, updates);
      if (!updated) return Utils.buildResponse(false, 'Failed to restore user.');

      try {
        AuditService.logAction(
          userId,
          'UserService',
          'RESTORE_USER',
          userId,
          'User',
          'User restored from soft deletion',
          '',
          'SUCCESS',
          updatedBy || ''
        );
      } catch (error) {
        Logger.log(error);
      }

      return Utils.buildResponse(true, 'User restored successfully', { user: this._sanitizeUserSafe(updated) });
    } catch (e) {
      Logger.log('UserService.restoreUser error: ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, 'User restore failed');
    }
  },

  activateUser: function (userId, updatedBy, callerUserContext) {
    try {
      var usersSheet = this._mustUsersSheet();
      var idCol = this._mustUserIdCol();

      if (callerUserContext && callerUserContext.isHOD) {
        var existing = this._getUserByIdRecord(userId);
        if (existing) {
          const callerDept = String(callerUserContext.department || '').trim().toUpperCase();
          const existingDept = String(existing[CONFIG.COLUMNS.USER_DEPARTMENT] || existing.department || '').trim().toUpperCase();
          if (existingDept !== callerDept) {
            return Utils.buildResponse(false, 'Unauthorized: You can only activate users in your own department.');
          }
        }
      }

      var statusCol = CONFIG.COLUMNS && (CONFIG.COLUMNS.STATUS || CONFIG.COLUMNS.USER_STATUS);
      if (!statusCol) throw new Error('Missing CONFIG.COLUMNS.STATUS/USER_STATUS');

      if (!DatabaseService.exists(usersSheet, idCol, userId)) {
        return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_NOT_FOUND) ? CONFIG.MESSAGES.USER_NOT_FOUND : 'User not found');
      }

      var updates = {};
      // Approval no longer guarantees Active status natively; StatusService calculates it.
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_AT) updates[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_BY && updatedBy !== undefined) updates[CONFIG.COLUMNS.UPDATED_BY] = updatedBy;

      var success = DatabaseService.updateRow(CONFIG.SHEETS.USERS, idCol, cleanId, updates);
      if (success) {
         StatusService.refreshUserStatus(cleanId, null, false);
      }
      var updated = DatabaseService.updateRow(usersSheet, idCol, userId, updates);
      if (!updated) return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_ACTIVATE_FAILED) ? CONFIG.MESSAGES.USER_ACTIVATE_FAILED : 'Activation failed');

      return Utils.buildResponse(true, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_ACTIVATED) ? CONFIG.MESSAGES.USER_ACTIVATED : 'User activated', { user: this._sanitizeUserSafe(updated) });
    } catch (e) {
      Logger.log('UserService.activateUser error: ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_ACTIVATE_FAILED) ? CONFIG.MESSAGES.USER_ACTIVATE_FAILED : 'Activation failed');
    }
  },

  deactivateUser: function (userId, updatedBy, callerUserContext) {
    try {
      var usersSheet = this._mustUsersSheet();
      var idCol = this._mustUserIdCol();

      if (callerUserContext && callerUserContext.isHOD) {
        var existing = this._getUserByIdRecord(userId);
        if (existing) {
          const callerDept = String(callerUserContext.department || '').trim().toUpperCase();
          const existingDept = String(existing[CONFIG.COLUMNS.USER_DEPARTMENT] || existing.department || '').trim().toUpperCase();
          if (existingDept !== callerDept) {
            return Utils.buildResponse(false, 'Unauthorized: You can only deactivate users in your own department.');
          }
        }
      }
      var statusCol = CONFIG.COLUMNS && (CONFIG.COLUMNS.STATUS || CONFIG.COLUMNS.USER_STATUS);
      if (!statusCol) throw new Error('Missing CONFIG.COLUMNS.STATUS/USER_STATUS');

      if (!DatabaseService.exists(usersSheet, idCol, userId)) {
        return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_NOT_FOUND) ? CONFIG.MESSAGES.USER_NOT_FOUND : 'User not found');
      }

      var updates = {};
      updates[statusCol] = CONFIG.USER_STATUS && CONFIG.USER_STATUS.INACTIVE ? CONFIG.USER_STATUS.INACTIVE : 'Inactive';
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_AT) updates[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_BY && updatedBy !== undefined) updates[CONFIG.COLUMNS.UPDATED_BY] = updatedBy;

      var updated = DatabaseService.updateRow(usersSheet, idCol, userId, updates);
      if (!updated) return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_DEACTIVATE_FAILED) ? CONFIG.MESSAGES.USER_DEACTIVATE_FAILED : 'Deactivation failed');

      return Utils.buildResponse(true, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_DEACTIVATED) ? CONFIG.MESSAGES.USER_DEACTIVATED : 'User deactivated', { user: this._sanitizeUserSafe(updated) });
    } catch (e) {
      Logger.log('UserService.deactivateUser error: ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_DEACTIVATE_FAILED) ? CONFIG.MESSAGES.USER_DEACTIVATE_FAILED : 'Deactivation failed');
    }
  },

  resetPassword: function (userId, updatedBy, callerUserContext) {
    try {
      var usersSheet = this._mustUsersSheet();
      var idCol = this._mustUserIdCol();

      if (!DatabaseService.exists(usersSheet, idCol, userId)) {
        return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_NOT_FOUND) ? CONFIG.MESSAGES.USER_NOT_FOUND : 'User not found');
      }

      if (callerUserContext && callerUserContext.isHOD) {
        var existing = this._getUserByIdRecord(userId);
        if (existing) {
          const callerDept = String(callerUserContext.department || '').trim().toUpperCase();
          const existingDept = String(existing[CONFIG.COLUMNS.USER_DEPARTMENT] || existing.department || '').trim().toUpperCase();
          if (existingDept !== callerDept) {
            return Utils.buildResponse(false, 'Unauthorized: You can only reset passwords for users in your own department.');
          }
        }
      }

      var passCols = this._getPasswordColumns();
      if (!passCols.hashCol) throw new Error('Missing CONFIG.COLUMNS.USER_PASSWORD_HASH');

      var tempPassword = Utils.generateRandomPassword ? Utils.generateRandomPassword() : String(new Date().getTime());
      var salt = "";
      // Commented out hashing as per user request to store in plain text:
      // var hashedPassword = salt ? Utils.hashString(String(salt) + ':' + String(tempPassword).trim()) : Utils.hashString(String(tempPassword).trim());
      var hashedPassword = String(tempPassword).trim();

      var now = Utils.getCurrentTimestamp();
      var updateData = {};
      updateData[passCols.hashCol] = hashedPassword;
      if (passCols.saltCol) updateData[passCols.saltCol] = salt;

      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_FIRST_LOGIN) updateData[CONFIG.COLUMNS.USER_FIRST_LOGIN] = true;
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_PASSWORD_RESET_REQUIRED) updateData[CONFIG.COLUMNS.USER_PASSWORD_RESET_REQUIRED] = true;
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_FAILED_ATTEMPTS) updateData[CONFIG.COLUMNS.USER_FAILED_ATTEMPTS] = 0;
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_ACCOUNT_LOCKED) updateData[CONFIG.COLUMNS.USER_ACCOUNT_LOCKED] = false;
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_PASSWORD_LAST_CHANGED) updateData[CONFIG.COLUMNS.USER_PASSWORD_LAST_CHANGED] = now;
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_BY && updatedBy !== undefined) updateData[CONFIG.COLUMNS.UPDATED_BY] = updatedBy;
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_AT) updateData[CONFIG.COLUMNS.UPDATED_AT] = now;

      var userRec = DatabaseService.findOne(usersSheet, idCol, userId);
      var userEmail = userRec ? (userRec[CONFIG.COLUMNS.USER_EMAIL_ADDRESS] || userRec['Email Address'] || userRec['Email'] || userRec['email'] || '') : '';
      var userName = userRec ? (userRec['First Name'] || userRec['Name'] || userRec['full_name'] || userId) : userId;

      var success = DatabaseService.updateRow(usersSheet, idCol, userId, updateData);

      if (!success) return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.PASSWORD_RESET_FAILED) ? CONFIG.MESSAGES.PASSWORD_RESET_FAILED : 'Password reset failed');

      if (userEmail) {
        try {
          var userRole = userRec ? (userRec[CONFIG.COLUMNS.USER_ROLE] || userRec['Role'] || '') : '';
          var subject = "BVC Event Attendance System - Password Reset";
          var body = "Hello " + userName + ",\n\n" +
            "Your password for the BVC Event Attendance System has been reset by the Admin.\n\n" +
            "Here are your new login credentials:\n" +
            "Role: " + userRole + "\n" +
            "User ID / Employee ID: " + userId + "\n" +
            "Temporary Password: " + tempPassword + "\n\n" +
            "Please log in and change your password immediately.\n\n" +
            "Regards,\n" +
            "System Administrator";

          MailApp.sendEmail(userEmail, subject, body);
          Logger.log('Password reset email sent successfully to: ' + userEmail);
        } catch (mailErr) {
          Logger.log('Failed to send password reset email: ' + mailErr.message);
        }
      }

      try {
        AuditService.logAction(
          userId,
          "UserService",
          "RESET_PASSWORD",
          userId,
          "User",
          "Password reset",
          "",
          "SUCCESS",
          updatedBy || ""
        );
      } catch (error) {
        Logger.log(error);
      }

      // Important: return only the temporary password, no hashes/salts.
      return Utils.buildResponse(true, (CONFIG.MESSAGES && CONFIG.MESSAGES.PASSWORD_RESET_SUCCESS) ? CONFIG.MESSAGES.PASSWORD_RESET_SUCCESS : 'Password reset success', { temporaryPassword: tempPassword });
    } catch (e) {
      Logger.log('UserService.resetPassword error: ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.PASSWORD_RESET_FAILED) ? CONFIG.MESSAGES.PASSWORD_RESET_FAILED : 'Password reset failed');
    }
  },

  changePassword: function (userId, oldPassword, newPassword, updatedBy) {
    try {
      if (AuthService && typeof AuthService.changePassword === 'function') {
        return AuthService.changePassword(userId, oldPassword, newPassword);
      }

      // If AuthService doesn't exist, do best-effort local update using existing hashing rules.
      var user = this.getUserById(userId);
      if (!user || !user.success || !user.user) {
        return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_NOT_FOUND) ? CONFIG.MESSAGES.USER_NOT_FOUND : 'User not found');
      }

      // Validate newPassword
      var req = ValidationService.validatePassword ? ValidationService.validatePassword(newPassword) : null;
      if (req) return Utils.buildResponse(false, req);

      var passCols = this._getPasswordColumns();
      if (!passCols.hashCol) throw new Error('Missing CONFIG.COLUMNS.USER_PASSWORD_HASH');

      var record = this._getUserByIdRecord(userId);
      if (!record) throw new Error('User record not found');

      var salt = passCols.saltCol ? record[passCols.saltCol] : null;
      // Commented out hashing as per user request to store in plain text:
      // var hashed = salt ? Utils.hashString(String(salt) + ':' + String(newPassword).trim()) : Utils.hashString(String(newPassword).trim());
      var hashed = String(newPassword).trim();

      var updateData = {};
      updateData[passCols.hashCol] = hashed;
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.USER_PASSWORD_LAST_CHANGED) updateData[CONFIG.COLUMNS.USER_PASSWORD_LAST_CHANGED] = Utils.getCurrentTimestamp();
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_AT) updateData[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_BY && updatedBy !== undefined) updateData[CONFIG.COLUMNS.UPDATED_BY] = updatedBy;

      var ok = DatabaseService.updateRow(this._mustUsersSheet(), this._mustUserIdCol(), userId, updateData);
      if (!ok) return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.PASSWORD_CHANGE_FAILED) ? CONFIG.MESSAGES.PASSWORD_CHANGE_FAILED : 'Password change failed');

      return Utils.buildResponse(true, (CONFIG.MESSAGES && CONFIG.MESSAGES.PASSWORD_CHANGED) ? CONFIG.MESSAGES.PASSWORD_CHANGED : 'Password changed');
    } catch (e) {
      Logger.log('UserService.changePassword error: ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.PASSWORD_CHANGE_FAILED) ? CONFIG.MESSAGES.PASSWORD_CHANGE_FAILED : 'Password change failed');
    }
  },

  // ==============================
  // Listing/search/filter/sort/pagination
  // ==============================



  paginateUsers: function (page, pageSize) {
    try {

      page = parseInt(page, 10) || 1;
      pageSize = parseInt(pageSize, 10) || 10;

      if (page < 1) page = 1;
      if (pageSize < 1) pageSize = 10;

      var users = (DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [])
        .filter(function (user) {
          return user[CONFIG.COLUMNS.DELETION_FLAG] !== true &&
            user[CONFIG.COLUMNS.DELETION_FLAG] !== "true";
        });
      var totalRecords = users.length;

      if (totalRecords === 0) {
        return {
          totalRecords: 0,
          currentPage: 1,
          pageSize: pageSize,
          totalPages: 0,
          hasPrevious: false,
          hasNext: false,
          items: []
        };
      }

      var totalPages = Math.ceil(totalRecords / pageSize);

      if (page > totalPages) {
        page = totalPages;
      }

      var start = (page - 1) * pageSize;
      var end = start + pageSize;

      var items = users.slice(start, end).map(function (user) {
        return Utils.sanitizeUser(user);
      });

      return {
        totalRecords: totalRecords,
        currentPage: page,
        pageSize: pageSize,
        totalPages: totalPages,
        hasPrevious: page > 1,
        hasNext: page < totalPages,
        items: items
      };

    } catch (e) {
      Logger.log(
        "UserService.paginateUsers error: " +
        (e && e.message ? e.message : e)
      );

      return {
        totalRecords: 0,
        currentPage: 1,
        pageSize: 10,
        totalPages: 0,
        hasPrevious: false,
        hasNext: false,
        items: []
      };
    }
  },
  sortUsers: function (sortBy, order) {
    try {

      var allowedFields = [
        CONFIG.COLUMNS.USER_FIRST_NAME,
        CONFIG.COLUMNS.USER_LAST_NAME,
        CONFIG.COLUMNS.USER_USERNAME,
        CONFIG.COLUMNS.USER_ROLE,
        CONFIG.COLUMNS.USER_STATUS,
        CONFIG.COLUMNS.CREATED_AT
      ].filter(function (field) {
        return !!field;
      });

      if (allowedFields.indexOf(sortBy) === -1) {
        return Utils.buildResponse(false, "Invalid sort column.");
      }

      order = String(order || "asc").toLowerCase();

      var users = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];

      // Ignore deleted users
      users = users.filter(function (user) {
        return user[CONFIG.COLUMNS.DELETION_FLAG] !== true &&
          user[CONFIG.COLUMNS.DELETION_FLAG] !== "true";
      });

      users.sort(function (a, b) {

        var valA = a[sortBy] || "";
        var valB = b[sortBy] || "";

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) return order === "desc" ? 1 : -1;
        if (valA > valB) return order === "desc" ? -1 : 1;

        return 0;

      });

      return Utils.buildResponse(
        true,
        "Users sorted successfully.",
        {
          users: users.map(function (user) {
            return Utils.sanitizeUser(user);
          })
        }
      );

    } catch (e) {

      Logger.log(
        "UserService.sortUsers error: " +
        (e && e.message ? e.message : e)
      );

      return Utils.buildResponse(
        false,
        "Sorting failed."
      );
    }
  },

  updateProfile: function (userId, profileData, updatedBy) {
    try {
      var usersSheet = this._mustUsersSheet();
      var idCol = this._mustUserIdCol();

      // 1. Verify user existence before attempting any operations
      if (!DatabaseService.exists(usersSheet, idCol, userId)) {
        return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.USER_NOT_FOUND) ? CONFIG.MESSAGES.USER_NOT_FOUND : 'User not found');
      }

      // 2. Validate incoming profile payload

      Logger.log("========== DEBUG PROFILE ==========");

      Logger.log(JSON.stringify(profileData, null, 2));

      if (!profileData || typeof profileData !== 'object' || Array.isArray(profileData)) {

        return Utils.buildResponse(false, 'No profile data to update.');

      }

      // 3. Dynamically collect strictly allowed profile fields from CONFIG.COLUMNS
      var allowedFields = [
        CONFIG.COLUMNS.USER_FIRST_NAME,
        CONFIG.COLUMNS.USER_LAST_NAME,
        CONFIG.COLUMNS.USER_EMAIL_ADDRESS,
        CONFIG.COLUMNS.USER_PHONE,
        CONFIG.COLUMNS.USER_PROFILE_PICTURE,
        CONFIG.COLUMNS.USER_BIO,
        CONFIG.COLUMNS.USER_THEME,
        CONFIG.COLUMNS.USER_LANGUAGE,
        CONFIG.COLUMNS.USER_TIMEZONE,
        CONFIG.COLUMNS.USER_POPUP_NOTIFICATIONS,
        CONFIG.COLUMNS.USER_NOTIFICATION_SOUND
      ].filter(function (field) {
        return !!field;
      });
      var profileKeys = [
        'USER_FIRST_NAME', 'USER_LAST_NAME', 'USER_EMAIL_ADDRESS',
        'USER_PHONE', 'USER_PROFILE_PICTURE', 'USER_BIO',
        'USER_LANGUAGE', 'USER_THEME', 'USER_TIMEZONE',
        'USER_POPUP_NOTIFICATIONS', 'USER_NOTIFICATION_SOUND'
      ];

      for (var i = 0; i < profileKeys.length; i++) {
        var columnMapping = CONFIG.COLUMNS[profileKeys[i]];
        if (columnMapping) {
          allowedFields.push(columnMapping);
        }
      }

      // 4. Extract and filter data using a secure whitelist approach
      Logger.log("===== ALLOWED FIELDS =====");
      Logger.log(JSON.stringify(allowedFields));

      var updateData = {};
      var hasValidUpdates = false;

      /*
       * Map database column names to CONFIG display names.
       */
      var fieldMap = {
        first_name: CONFIG.COLUMNS.USER_FIRST_NAME,
        last_name: CONFIG.COLUMNS.USER_LAST_NAME,
        email_address: CONFIG.COLUMNS.USER_EMAIL_ADDRESS,
        phone_number: CONFIG.COLUMNS.USER_PHONE,
        profile_picture_url: CONFIG.COLUMNS.USER_PROFILE_PICTURE,
        bio_notes: CONFIG.COLUMNS.USER_BIO,
        theme_preference: CONFIG.COLUMNS.USER_THEME,
        language: CONFIG.COLUMNS.USER_LANGUAGE,
        timezone: CONFIG.COLUMNS.USER_TIMEZONE,
        popup_notifications: CONFIG.COLUMNS.USER_POPUP_NOTIFICATIONS,
        notification_sound: CONFIG.COLUMNS.USER_NOTIFICATION_SOUND
      };

      for (var dbField in fieldMap) {

        if (profileData[dbField] !== undefined) {

          var value = profileData[dbField];

          updateData[fieldMap[dbField]] =
            (typeof value === "string")
              ? value.trim()
              : value;

          hasValidUpdates = true;

          Logger.log("Updating: " + fieldMap[dbField] + " = " + value);
        }

      }

      // 5. Fail early if no valid properties are targeted for updates
      if (!hasValidUpdates) {
        return Utils.buildResponse(false, 'No profile data to update.');
      }

      // 6. Enforce systemic metadata fields
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_AT) {
        updateData[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();
      }
      if (CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_BY && updatedBy !== undefined) {
        updateData[CONFIG.COLUMNS.UPDATED_BY] = updatedBy;
      }

      // 7. Write securely to database layer
      var success = DatabaseService.updateRow(usersSheet, idCol, userId, updateData);
      if (!success) {
        return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.PROFILE_UPDATE_FAILED) ? CONFIG.MESSAGES.PROFILE_UPDATE_FAILED : 'Profile update failed');
      }

      // 8. Generate Audit trail log
      try {
        AuditService.logAction(
          userId,
          "UserService",
          "UPDATE_PROFILE",
          userId,
          "User",
          "Profile updated",
          "",
          "SUCCESS",
          updatedBy || ""
        );
      } catch (auditError) {
        // Log audit failure but do not break execution context for the user
        Logger.log('UserService.updateProfile audit logging warning: ' + (auditError && auditError.message ? auditError.message : auditError));
      }

      // 9. Return structured success payload
      return Utils.buildResponse(true, (CONFIG.MESSAGES && CONFIG.MESSAGES.PROFILE_UPDATED) ? CONFIG.MESSAGES.PROFILE_UPDATED : 'Profile updated');

    } catch (e) {
      Logger.log('UserService.updateProfile error: ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.PROFILE_UPDATE_FAILED) ? CONFIG.MESSAGES.PROFILE_UPDATE_FAILED : 'Profile update failed');
    }
  },

  updatePreferences: function (userId, preferences, updatedBy) {
    try {
      var usersSheet = CONFIG.SHEETS.USERS;
      var idCol = CONFIG.COLUMNS.USER_ID;

      // Check user exists
      if (!DatabaseService.exists(usersSheet, idCol, userId)) {
        return Utils.buildResponse(false, CONFIG.MESSAGES.USER_NOT_FOUND);
      }

      // Allowed preference fields
      var allowedFields = [
        CONFIG.COLUMNS.USER_THEME,
        CONFIG.COLUMNS.USER_LANGUAGE,
        CONFIG.COLUMNS.USER_TIMEZONE,
        CONFIG.COLUMNS.USER_POPUP_NOTIFICATIONS,
        CONFIG.COLUMNS.USER_NOTIFICATION_SOUND
      ].filter(function (field) {
        return !!field;
      });

      var updateData = {};

      allowedFields.forEach(function (field) {
        if (preferences && preferences[field] !== undefined) {
          updateData[field] = preferences[field];
        }
      });

      // Nothing to update
      if (Object.keys(updateData).length === 0) {
        return Utils.buildResponse(false, "No preferences to update.");
      }

      // Audit fields
      if (CONFIG.COLUMNS.UPDATED_AT) {
        updateData[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();
      }

      if (CONFIG.COLUMNS.UPDATED_BY) {
        updateData[CONFIG.COLUMNS.UPDATED_BY] = updatedBy || "";
      }

      var success = DatabaseService.updateRow(
        usersSheet,
        idCol,
        userId,
        updateData
      );

      if (!success) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.PREFERENCES_UPDATE_FAILED
        );
      }

      try {
        AuditService.logAction(
          userId,
          "UserService",
          "UPDATE_PREFERENCES",
          userId,
          "User",
          "Preferences updated",
          "",
          "SUCCESS",
          updatedBy || ""
        );
      } catch (auditError) {
        Logger.log(auditError);
      }

      return Utils.buildResponse(
        true,
        CONFIG.MESSAGES.PREFERENCES_UPDATED
      );

    } catch (e) {
      Logger.log(
        "UserService.updatePreferences error: " +
        (e && e.message ? e.message : e)
      );

      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.PREFERENCES_UPDATE_FAILED
      );
    }
  },

  completeUserProfile: function (userId, payload) {
    try {
      if (!userId) return Utils.buildResponse(false, 'User ID is missing');
      if (!payload) return Utils.buildResponse(false, 'Profile data is required');

      var user = this.getUserById(userId);
      if (!user) return Utils.buildResponse(false, 'User record not found');

      var role = String(user[CONFIG.COLUMNS.USER_ROLE] || user.role || '').trim();
      var email = String(payload.email || user[CONFIG.COLUMNS.USER_EMAIL_ADDRESS] || user.email_address || '').trim();
      var name = String(payload.name || payload.fullName || (user.first_name + ' ' + (user.last_name || '')).trim() || user.username || '').trim();
      var phone = String(payload.phone || payload.phoneNumber || user.phone_number || '').trim();
      var department = String(payload.department || user.department || '').trim();

      // Resolve department code to Department ID to satisfy Foreign Key constraints
      var resolvedDeptId = department;
      try {
        var allDepts = DatabaseService.readAllRows(CONFIG.SHEETS.DEPARTMENTS) || [];
        var matchedDept = allDepts.find(function (d) {
          var dCode = String(d['Department Code'] || d.department_code || '').trim().toUpperCase();
          var dId = String(d['Department ID'] || d.department_id || '').trim().toUpperCase();
          var dName = String(d['Department Name'] || d.department_name || '').trim().toUpperCase();
          var cleanDept = String(department).trim().toUpperCase();
          return dCode === cleanDept || dId === cleanDept || dName === cleanDept;
        });
        if (matchedDept) {
          resolvedDeptId = matchedDept['Department ID'] || matchedDept.department_id || department;
        }
      } catch (deptErr) {
        Logger.log("Error resolving department code to ID in completeUserProfile: " + deptErr.message);
      }

      // Store profile in role-specific dedicated tables (normalized)
      if (role === 'Faculty' || role === 'HOD') {
        var facultyId = String(payload.facultyId || payload.employeeId || user.employee_id || IdService.generateId('FACULTY')).trim();
        var empId = String(payload.employeeId || payload.facultyId || user.employee_id || facultyId).trim();
        var designation = String(payload.designation || (role === 'HOD' ? 'Head of Department' : 'Faculty')).trim();

        var existingFac = DatabaseService.findOne(CONFIG.SHEETS.FACULTY, 'user_id', userId);
        var facData = {
          faculty_id: (existingFac && existingFac.faculty_id) ? existingFac.faculty_id : facultyId,
          employee_id: empId,
          user_id: userId,
          faculty_name: name,
          designation: designation,
          department_id: resolvedDeptId,
          email: email,
          mobile: phone,
          // DEFAULT: New faculty profile starts Inactive. StatusService controls promotion to Active.
          status: (CONFIG.USER_STATUS && CONFIG.USER_STATUS.INACTIVE ? CONFIG.USER_STATUS.INACTIVE : 'Inactive'),
          updated_at: new Date().toISOString()
        };
        if (existingFac) {
          DatabaseService.updateRow(CONFIG.SHEETS.FACULTY, 'user_id', userId, facData);
        } else {
          facData.created_at = new Date().toISOString();
          DatabaseService.insertRow(CONFIG.SHEETS.FACULTY, facData);
        }
      } else if (role === 'Student Coordinator' || role === 'StudentCoordinator' || role === 'Student') {
        var rollNumber = String(payload.rollNumber || '').trim().toUpperCase();
        var branch = String(payload.branch || '').trim();

        var existingStu = DatabaseService.findOne(CONFIG.SHEETS.STUDENTS, 'user_id', userId) ||
          (rollNumber ? DatabaseService.findOne(CONFIG.SHEETS.STUDENTS, 'roll_number', rollNumber) : null);
        var stuData = {
          student_id: (existingStu && existingStu.student_id) ? existingStu.student_id : IdService.generateId('STUDENTS'),
          roll_number: rollNumber || (existingStu ? existingStu.roll_number : userId),
          user_id: userId,
          student_name: name,
          email_address: email,
          phone_number: phone,
          department_id: resolvedDeptId,
          section: branch,
          year: payload.year ? Number(payload.year) : 1,
          // DEFAULT: New student profile starts Inactive. StatusService controls promotion to Active.
          student_status: (CONFIG.STUDENT_STATUS && CONFIG.STUDENT_STATUS.INACTIVE ? CONFIG.STUDENT_STATUS.INACTIVE : 'Inactive'),
          last_updated_at: new Date().toISOString()
        };
        if (existingStu) {
          DatabaseService.updateRow(CONFIG.SHEETS.STUDENTS, 'student_id', stuData.student_id, stuData);
        } else {
          stuData.created_at = new Date().toISOString();
          DatabaseService.insertRow(CONFIG.SHEETS.STUDENTS, stuData);
        }
      } else if (role === 'Guest Coordinator' || role === 'GuestCoordinator') {
        var guestId = String(payload.guestId || '').trim();
        var branch = String(payload.branch || '').trim();

        var existingGuest = DatabaseService.findOne(CONFIG.SHEETS.GUEST_COORDINATORS, 'user_id', userId);
        var guestData = {
          id: (existingGuest && existingGuest.id) ? existingGuest.id : IdService.generateId('GUEST_COORDINATORS'),
          user_id: userId,
          name: name,
          guest_id: guestId,
          branch: branch,
          department: department,
          phone_number: phone,
          email: email,
          updated_at: new Date().toISOString()
        };
        if (existingGuest) {
          DatabaseService.updateRow(CONFIG.SHEETS.GUEST_COORDINATORS, 'user_id', userId, guestData);
        } else {
          guestData.created_at = new Date().toISOString();
          DatabaseService.insertRow(CONFIG.SHEETS.GUEST_COORDINATORS, guestData);
        }
      }

      // Update users table with correct Supabase column names (snake_case)
      var sheetName = this._mustUsersSheet();
      Logger.log("========== COMPLETE PROFILE DEBUG ==========");
      Logger.log("This is the UPDATED code");
      var updates = {
        'profile_completed': true,
        'first_login': false,
        'last_login_timestamp': new Date().toISOString(),
        // 'online_status': 'Online',
        'updated_at': new Date().toISOString()
      };
      Logger.log(JSON.stringify(updates, null, 2));

      var success = DatabaseService.updateRow(sheetName, 'user_id', userId, updates);
      if (!success) {
        return Utils.buildResponse(false, 'Failed to save profile changes to database.');
      }

      // Log audit
      try {
        AuditService.logAction(
          userId,
          "UserService",
          "COMPLETE_PROFILE",
          userId,
          "User",
          "User profile onboarding completed for role: " + role,
          "",
          "SUCCESS",
          userId
        );
      } catch (auditError) {
        Logger.log(auditError);
      }

      return Utils.buildResponse(true, 'Profile completed successfully.');
    } catch (e) {
      Logger.log("UserService.completeUserProfile error: " + e.message);
      return Utils.buildResponse(false, 'Profile completion failed: ' + e.message);
    }
  },

  /**
   * Handles mandatory first-time login setup (password change & details update).
   * Sets first_login = false and profile_completed = true.
   */
  completeFirstTimeSetup: function (userId, setupData) {
    try {
      if (!userId) return Utils.buildResponse(false, 'User ID is missing');
      if (!setupData) return Utils.buildResponse(false, 'Setup data is required');

      var newPassword = String(setupData.newPassword || '').trim();
      var confirmPassword = String(setupData.confirmPassword || '').trim();

      if (!newPassword) {
        return Utils.buildResponse(false, 'New password is required');
      }
      if (newPassword.length < 6) {
        return Utils.buildResponse(false, 'New password must be at least 6 characters');
      }
      if (newPassword !== confirmPassword) {
        return Utils.buildResponse(false, 'New password and confirm password do not match');
      }

      var user = this.getUserById(userId);
      if (!user) return Utils.buildResponse(false, 'User record not found');

      var sheetName = this._mustUsersSheet();
      var salt = String(new Date().getTime()); // simple unique salt
      var hash = Utils.hashString ? Utils.hashString(salt + ':' + newPassword) : newPassword;

      var updates = {};
      updates['password_hash'] = hash;
      updates['salt'] = salt;

      if (setupData.phone) {
        updates['phone_number'] = String(setupData.phone).trim();
      }
      if (setupData.designation) {
        updates['title_designation'] = String(setupData.designation).trim();
      }
      if (setupData.firstName) {
        updates['first_name'] = String(setupData.firstName).trim();
      }
      if (setupData.lastName) {
        updates['last_name'] = String(setupData.lastName).trim();
      }

      // Mark first login as complete and profile as completed
      updates['first_login'] = false;
      updates['profile_completed'] = true;
      updates['last_login_timestamp'] = new Date().toISOString();
      updates['updated_at'] = new Date().toISOString();

      var success = DatabaseService.updateRow(sheetName, 'user_id', userId, updates);
      if (!success) {
        return Utils.buildResponse(false, 'Failed to update account setup in database.');
      }

      try {
        AuditService.logAction(userId, 'UserService', 'FIRST_LOGIN_SETUP', userId, 'User', 'First login setup completed', '', 'SUCCESS', userId);
      } catch (auditError) {
        Logger.log(auditError);
      }

      return Utils.buildResponse(true, 'Account setup completed successfully.');
    } catch (e) {
      Logger.log("UserService.completeFirstTimeSetup error: " + e.message);
      return Utils.buildResponse(false, 'Account setup failed: ' + e.message);
    }
  },

  saveUserPermissions: function (userId, allowedKeys, deniedKeys, callerId) {
    try {
      const permissionsSheet = CONFIG.SHEETS.USER_PERMISSIONS;

      // 1. Delete existing overrides for this user
      const existing = DatabaseService.findByColumn(permissionsSheet, 'User ID', userId) || [];
      existing.forEach(r => {
        DatabaseService.deleteRow(permissionsSheet, 'Permission Key', r['Permission Key'] || r.permission_key);
      });

      // 2. Insert new overrides
      const recordsToInsert = [];
      if (Array.isArray(allowedKeys)) {
        allowedKeys.forEach(k => {
          recordsToInsert.push({
            'User ID': userId,
            'Permission Key': k,
            'Is Allowed': 'true',
            'Created By': callerId || 'System'
          });
        });
      }
      if (Array.isArray(deniedKeys)) {
        deniedKeys.forEach(k => {
          recordsToInsert.push({
            'User ID': userId,
            'Permission Key': k,
            'Is Allowed': 'false',
            'Created By': callerId || 'System'
          });
        });
      }

      recordsToInsert.forEach(rec => {
        DatabaseService.insertRow(permissionsSheet, rec);
      });
      return true;
    } catch (e) {
      Logger.log('Error saving user permissions: ' + e.message);
      return false;
    }
  }
};
Object.freeze(UserService);

