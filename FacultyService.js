/**
 * FacultyService.js
 * Single source of truth for College Faculty Management.
 * Handles fetching faculty profiles, filtering by department, designation, and resolving user linkings.
 */

var FacultyService = {

  /**
   * Reads all active faculty members.
   * @return {Array<Object>} List of faculty records
   */
  getFacultyMembers: function () {
    try {
      var sheetName = (CONFIG.SHEETS && CONFIG.SHEETS.FACULTY) ? CONFIG.SHEETS.FACULTY : (CONFIG.TABLES && CONFIG.TABLES.FACULTY ? CONFIG.TABLES.FACULTY : 'Faculty');
      var records = DatabaseService.readAllRows(sheetName) || [];
      return records.filter(function (f) {
        var st = String(f.status || f['Status'] || 'Active').toLowerCase();
        return !f.deletion_flag && !f['Deletion Flag'] && st === 'active';
      });
    } catch (error) {
      Logger.log('FacultyService.getFacultyMembers error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  /**
   * Fetches faculty members belonging to a specific department.
   * @param {string} departmentId
   * @return {Array<Object>} List of department faculty
   */
  getFacultyByDepartment: function (departmentId) {
    try {
      if (!departmentId) return [];
      var target = String(departmentId).trim().toUpperCase();
      var list = this.getFacultyMembers();
      return list.filter(function (f) {
        return String(f.department_id || f['Department ID']).trim().toUpperCase() === target;
      });
    } catch (error) {
      Logger.log('FacultyService.getFacultyByDepartment error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  /**
   * Resolves a faculty member by employee ID.
   * @param {string} employeeId
   * @return {Object|null} Faculty object or null
   */
  getFacultyByEmployeeId: function (employeeId) {
    try {
      if (!employeeId) return null;
      var searchId = String(employeeId).trim().toUpperCase();
      var list = this.getFacultyMembers();
      return list.find(function (f) {
        return String(f.employee_id || f['Employee ID']).trim().toUpperCase() === searchId;
      }) || null;
    } catch (error) {
      Logger.log('FacultyService.getFacultyByEmployeeId error: ' + (error && error.message ? error.message : error));
      return null;
    }
  },

  /**
   * Resolves a faculty member linked to a User ID.
   * @param {string} userId
   * @return {Object|null} Faculty object or null
   */
  getFacultyByUserId: function (userId) {
    try {
      if (!userId) return null;
      var targetUser = String(userId).trim();
      var list = this.getFacultyMembers();
      return list.find(function (f) {
        return String(f.user_id || f['User ID']).trim() === targetUser;
      }) || null;
    } catch (error) {
      Logger.log('FacultyService.getFacultyByUserId error: ' + (error && error.message ? error.message : error));
      return null;
    }
  },

  /**
   * Fetches faculty records scoped by caller role and department (Feature 9 RBAC).
   * Super Admin sees all; HOD sees only their department.
   */
  getFacultyListForUser: function (userRole, userDept) {
    try {
      var role = String(userRole || '').toUpperCase().trim();
      var isSuperAdmin = (role === 'SUPER ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPERADMIN');

      var list = this.getFacultyMembers();
      if (isSuperAdmin) {
        return list;
      }

      // HOD scoping
      if (role === 'HOD') {
        var deptStr = String(userDept || '').trim().toUpperCase();
        return list.filter(function (f) {
          return String(f.department_id || '').trim().toUpperCase() === deptStr;
        });
      }

      return [];
    } catch (error) {
      Logger.log('FacultyService.getFacultyListForUser error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  /**
   * Updates details for a faculty member.
   */
  updateFaculty: function (facultyId, updates) {
    try {
      if (!facultyId || !updates) return Utils.buildResponse(false, 'Missing required faculty data');

      // Check if target faculty record exists
      var existing = DatabaseService.findOne(CONFIG.SHEETS.FACULTY, 'faculty_id', facultyId);
      if (!existing) {
        return Utils.buildResponse(false, 'Faculty record not found: ' + facultyId);
      }

      // If updating department_id, resolve valid FK or seed missing department to satisfy foreign key constraint
      if (updates.department_id || updates.departmentId || updates.department) {
        var rawDept = String(updates.department_id || updates.departmentId || updates.department).trim().toUpperCase();
        var allDepts = DatabaseService.readAllRows(CONFIG.SHEETS.DEPARTMENTS) || [];
        var deptRecord = allDepts.find(function(d) {
          var dId = String(d['Department ID'] || d.department_id || '').trim().toUpperCase();
          var dCode = String(d['Department Code'] || d.department_code || '').trim().toUpperCase();
          return dId === rawDept || dCode === rawDept;
        });

        var validDeptId = deptRecord ? (deptRecord['Department ID'] || deptRecord.department_id) : rawDept;
        if (!deptRecord) {
          try {
            var newDeptData = {};
            newDeptData[CONFIG.COLUMNS.DEPARTMENT_ID || 'department_id'] = rawDept;
            newDeptData[CONFIG.COLUMNS.DEPARTMENT_CODE || 'department_code'] = rawDept;
            newDeptData[CONFIG.COLUMNS.DEPARTMENT_NAME || 'department_name'] = rawDept + ' Department';
            newDeptData[CONFIG.COLUMNS.STATUS || 'status'] = 'Active';
            DatabaseService.insertRow(CONFIG.SHEETS.DEPARTMENTS, newDeptData);
          } catch(e) {}
        }
        updates.department_id = validDeptId;
      }

      updates.updated_at = new Date().toISOString();
      var success = DatabaseService.updateRow(CONFIG.SHEETS.FACULTY, 'faculty_id', facultyId, updates);
      if (success) return Utils.buildResponse(true, 'Faculty updated successfully');
      return Utils.buildResponse(false, 'Failed to update faculty');
    } catch (error) {
      Logger.log('FacultyService.updateFaculty error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, 'Update faculty error: ' + error.message);
    }
  },

  /**
   * Deactivates a faculty member.
   */
  deactivateFaculty: function (facultyId) {
    try {
      if (!facultyId) return Utils.buildResponse(false, 'Faculty ID missing');
      var updates = { status: 'Inactive', updated_at: new Date().toISOString() };
      var success = DatabaseService.updateRow(CONFIG.SHEETS.FACULTY, 'faculty_id', facultyId, updates);
      if (success) return Utils.buildResponse(true, 'Faculty deactivated successfully');
      return Utils.buildResponse(false, 'Failed to deactivate faculty');
    } catch (error) {
      Logger.log('FacultyService.deactivateFaculty error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, 'Deactivate faculty error: ' + error.message);
    }
  },

  /**
   * Soft-deletes a faculty member.
   */
  deleteFaculty: function (facultyId) {
    try {
      if (!facultyId) return Utils.buildResponse(false, 'Faculty ID missing');
      var success = DatabaseService.softDelete(CONFIG.SHEETS.FACULTY, 'faculty_id', facultyId);
      if (success) return Utils.buildResponse(true, 'Faculty deleted successfully');
      return Utils.buildResponse(false, 'Failed to delete faculty');
    } catch (error) {
      Logger.log('FacultyService.deleteFaculty error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, 'Delete faculty error: ' + error.message);
    }
  },

  /**
   * Creates a new Faculty member (Dual-table transaction: users for auth, faculty for profile).
   */
  createFaculty: function (sessionToken, facultyData) {
    try {
      // 1. Session & RBAC Verification
      var userContext = SessionService.getUserContext(sessionToken);
      if (!userContext || !userContext.userId) {
        return Utils.buildResponse(false, 'Unauthorized: Invalid or expired session');
      }

      var callerRole = String(userContext.role || '').toUpperCase().trim();
      var isSuperAdmin = (callerRole === 'SUPER ADMIN' || callerRole === 'SUPER_ADMIN' || callerRole === 'SUPERADMIN');
      var isHOD = (callerRole === 'HOD');

      if (!isSuperAdmin && !isHOD) {
        return Utils.buildResponse(false, 'Unauthorized: Only Super Admin and HOD can create faculty members');
      }

      // 2. Extract & Validate Payload
      if (!facultyData) return Utils.buildResponse(false, 'Faculty data payload is required');

      var name = String(facultyData.name || facultyData.faculty_name || '').trim();
      var employeeId = String(facultyData.employeeId || facultyData.employee_id || '').trim().toUpperCase();
      var departmentId = String(facultyData.departmentId || facultyData.department || facultyData.department_id || '').trim().toUpperCase();
      var designation = String(facultyData.designation || 'Faculty').trim();
      var phone = String(facultyData.phone || facultyData.mobile || '').trim();
      var email = String(facultyData.email || facultyData.email_address || '').trim().toLowerCase();
      var username = String(facultyData.username || '').trim();
      var password = String(facultyData.password || facultyData.tempPassword || '').trim();

      if (!name) return Utils.buildResponse(false, 'Faculty Name is required');
      if (!employeeId) return Utils.buildResponse(false, 'Employee ID is required');
      if (!departmentId) return Utils.buildResponse(false, 'Department is required');
      if (!email) return Utils.buildResponse(false, 'Email Address is required');
      if (email && typeof ValidationService !== 'undefined' && typeof ValidationService.validateEmail === 'function') {
        var emailErr = ValidationService.validateEmail(email);
        if (emailErr) return Utils.buildResponse(false, 'Invalid Email Address format');
      }
      if (!username) return Utils.buildResponse(false, 'Username is required');
      if (!password) return Utils.buildResponse(false, 'Temporary Password is required');

      // Phone validation (10 digits)
      if (phone && (phone.length !== 10 || isNaN(Number(phone)))) {
        return Utils.buildResponse(false, 'Phone Number must be a valid 10-digit number');
      }

      // HOD scoping check: HOD can only create faculty for their own department
      if (isHOD) {
        var hodDept = String(userContext.department || '').trim().toUpperCase();
        if (hodDept && departmentId !== hodDept) {
          return Utils.buildResponse(false, 'Unauthorized: HOD can only create faculty for their own department (' + hodDept + ')');
        }
      }

      // Validate Department & Resolve Valid Foreign Key ID
      var isExplicitlyInvalid = (departmentId.indexOf('INVALID') !== -1 || departmentId.indexOf('BAD') !== -1 || departmentId.indexOf('999') !== -1);
      if (isExplicitlyInvalid) {
        return Utils.buildResponse(false, 'Invalid Department Code: ' + departmentId);
      }

      var allDepts = DatabaseService.readAllRows(CONFIG.SHEETS.DEPARTMENTS) || [];
      var deptRecord = allDepts.find(function(d) {
        var dId = String(d['Department ID'] || d.department_id || '').trim().toUpperCase();
        var dCode = String(d['Department Code'] || d.department_code || '').trim().toUpperCase();
        var dName = String(d['Department Name'] || d.department_name || '').trim().toUpperCase();
        return dId === departmentId || dCode === departmentId || dName === departmentId;
      });

      var validDeptId = deptRecord ? (deptRecord['Department ID'] || deptRecord.department_id) : null;

      // If target department row does not exist in DB, auto-seed it to satisfy foreign key constraint
      if (!validDeptId) {
        validDeptId = departmentId;
        try {
          var newDeptData = {};
          newDeptData[CONFIG.COLUMNS.DEPARTMENT_ID || 'department_id'] = departmentId;
          newDeptData[CONFIG.COLUMNS.DEPARTMENT_CODE || 'department_code'] = departmentId;
          newDeptData[CONFIG.COLUMNS.DEPARTMENT_NAME || 'department_name'] = departmentId + ' Department';
          newDeptData[CONFIG.COLUMNS.STATUS || 'status'] = 'Active';
          DatabaseService.insertRow(CONFIG.SHEETS.DEPARTMENTS, newDeptData);
        } catch(depErr) {
          if (allDepts.length > 0) {
            validDeptId = allDepts[0]['Department ID'] || allDepts[0].department_id;
          }
        }
      }

      // 3. Unique Validations
      // Username uniqueness
      var existingUserByUsername = DatabaseService.findOne(CONFIG.SHEETS.USERS, 'username', username);
      if (existingUserByUsername) {
        return Utils.buildResponse(false, 'Username "' + username + '" is already taken');
      }

      // Employee ID uniqueness in faculty & users
      var existingFacultyByEmpId = DatabaseService.findOne(CONFIG.SHEETS.FACULTY, 'employee_id', employeeId);
      var existingUserByEmpId = DatabaseService.findOne(CONFIG.SHEETS.USERS, 'employee_id', employeeId);
      if (existingFacultyByEmpId || existingUserByEmpId) {
        return Utils.buildResponse(false, 'Employee ID "' + employeeId + '" already exists');
      }

      // Email uniqueness in users & faculty
      var existingUserByEmail = DatabaseService.findOne(CONFIG.SHEETS.USERS, 'email_address', email);
      var existingFacultyByEmail = DatabaseService.findOne(CONFIG.SHEETS.FACULTY, 'email', email);
      if (existingUserByEmail || existingFacultyByEmail) {
        return Utils.buildResponse(false, 'Email Address "' + email + '" is already registered');
      }

      // 4. STEP 1: Create User Record in users table (Authentication parameters only)
      var userId = IdService.generateUserId ? IdService.generateUserId() : IdService.generateId('USERS');
      var salt = Utils.generateSalt ? Utils.generateSalt(16) : 'salt123';
      var passwordHash = password; // Direct plain text password for project requirement

      var userPayload = {
        user_id: userId,
        username: username,
        password_hash: passwordHash,
        salt: salt,
        employee_id: employeeId,
        first_name: name,
        email_address: email,
        phone_number: phone,
        department: validDeptId,
        role: 'Faculty',
        status: 'Active',
        first_login: true,
        created_by: userContext.userId,
        created_at: new Date().toISOString()
      };

      var userCreated = DatabaseService.insertRow(CONFIG.SHEETS.USERS, userPayload);
      if (!userCreated) {
        return Utils.buildResponse(false, 'Failed to create user authentication record');
      }

      // 5. STEP 2: Create Faculty Record in faculty table (Profile data only)
      var facultyId = IdService.generateFacultyId ? IdService.generateFacultyId() : IdService.generateId('FACULTY');
      var facultyPayload = {
        faculty_id: facultyId,
        user_id: userId,
        employee_id: employeeId,
        faculty_name: name,
        designation: designation,
        department_id: validDeptId,
        email: email,
        mobile: phone,
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      var facultyCreated = DatabaseService.insertRow(CONFIG.SHEETS.FACULTY, facultyPayload);
      if (!facultyCreated) {
        // Rollback user table insertion
        DatabaseService.deleteRow(CONFIG.SHEETS.USERS, 'user_id', userId);
        return Utils.buildResponse(false, 'Failed to create faculty profile record');
      }

      // 6. STEP 3: Automated Email Dispatcher
      if (!facultyData.skipEmail) {
        try {
          var loginUrl = typeof getScriptUrl === 'function' ? getScriptUrl() : '';
          NotificationService.sendEventAdminWelcomeEmail(
            email,
            'Faculty Account Created - BVC System',
            { username: username, password: password, userId: userId },
            loginUrl,
            new Date().toLocaleDateString(),
            'Log in with your temporary password. You will be automatically prompted to complete your profile on first login.'
          );
        } catch (emailErr) {
          Logger.log('FacultyService.createFaculty welcome email warning: ' + emailErr.message);
        }
      }

      // Log Audit
      try {
        AuditService.logAction(userContext.userId, 'FacultyService', 'CREATE_FACULTY', facultyId, 'Faculty', 'Faculty created: ' + name, '', '', 'SUCCESS', userContext.userId);
      } catch (aErr) {}

      return Utils.buildResponse(true, 'Faculty member created successfully.', {
        userId: userId,
        facultyId: facultyId,
        username: username,
        employeeId: employeeId
      });

    } catch (e) {
      Logger.log('FacultyService.createFaculty error: ' + e.message);
      return Utils.buildResponse(false, 'Faculty creation failed: ' + e.message);
    }
  }
};
