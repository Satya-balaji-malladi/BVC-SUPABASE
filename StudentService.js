/**
 * StudentService.gs
 * Service for handling student management in BVC Engineering College Event Attendance Management System.
 * Responsibilities: CRUD operations for students, activation/deactivation, filtering, searching, sorting, pagination, statistics, and helpers.
 */
var StudentService = {

  // ==========================================
  // Private Helpers & Normalization
  // ==========================================

  /**
   * Helper to fetch the raw student sheet mapping.
   */
  _studentsSheet: function () {
    return CONFIG.SHEETS && CONFIG.SHEETS.STUDENTS ? CONFIG.SHEETS.STUDENTS : null;
  },

  /**
   * Reads all active students who are not soft-deleted.
   * @return {Array<Object>} List of active raw student records
   */
  _getStudents: function () {
    try {
      var sheet = this._studentsSheet();
      var records = DatabaseService.readAllRows(sheet) || [];
      return records.filter(function (s) {
        return !s[CONFIG.COLUMNS.DELETION_FLAG];
      });
    } catch (error) {
      Logger.log('StudentService._getStudents error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  /**
   * Fetches a raw student record matching a given roll number (ignoring deleted).
   * @param {string} rollNumber
   * @return {Object|null} Raw student record or null
   */
  _getStudent: function (rollNumber) {
    try {
      if (!rollNumber) return null;
      var searchRoll = String(rollNumber).trim().toUpperCase();
      var records = this._getStudents();
      var found = records.find(function (s) {
        return String(s[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] || s.roll_number).trim().toUpperCase() === searchRoll;
      });
      if (found) return found;

      // Check other_college_students table for external students
      var otherRecords = DatabaseService.readAllRows(CONFIG.SHEETS.OTHER_COLLEGE_STUDENTS) || [];
      return otherRecords.find(function (s) {
        return !s.deletion_flag && String(s.roll_number || s['Roll Number']).trim().toUpperCase() === searchRoll;
      }) || null;
    } catch (error) {
      Logger.log('StudentService._getStudent error: ' + (error && error.message ? error.message : error));
      return null;
    }
  },

  /**
   * Checks if a student exists by roll number (ignoring deleted).
   * @param {string} rollNumber
   * @return {boolean} True if exists
   */
  _studentExists: function (rollNumber) {
    try {
      return this._getStudent(rollNumber) !== null;
    } catch (error) {
      Logger.log('StudentService._studentExists error: ' + (error && error.message ? error.message : error));
      return false;
    }
  },

  /**
   * Normalizes incoming student properties safely to match system constraints.
   * @param {Object} data Raw data payload
   * @return {Object} Cleaned, normalized data payload cloned
   */
  _normalizeStudentData: function (data) {
    var out = Object.assign({}, data);
    if (out[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] !== undefined && out[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] !== null) {
      out[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = String(out[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER]).trim().toUpperCase();
    }
    if (out[CONFIG.COLUMNS.STUDENT_NAME] !== undefined && out[CONFIG.COLUMNS.STUDENT_NAME] !== null) {
      out[CONFIG.COLUMNS.STUDENT_NAME] = String(out[CONFIG.COLUMNS.STUDENT_NAME]).trim();
    }
    if (out[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] !== undefined && out[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] !== null) {
      out[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = String(out[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID]).trim().toUpperCase();
    }
    if (out[CONFIG.COLUMNS.STUDENT_BRANCH] !== undefined && out[CONFIG.COLUMNS.STUDENT_BRANCH] !== null) {
      out[CONFIG.COLUMNS.STUDENT_BRANCH] = String(out[CONFIG.COLUMNS.STUDENT_BRANCH]).trim();
    }
    if (out[CONFIG.COLUMNS.STUDENT_YEAR] !== undefined && out[CONFIG.COLUMNS.STUDENT_YEAR] !== null) {
      out[CONFIG.COLUMNS.STUDENT_YEAR] = String(out[CONFIG.COLUMNS.STUDENT_YEAR]).trim();
    }
    if (out[CONFIG.COLUMNS.STUDENT_SECTION] !== undefined && out[CONFIG.COLUMNS.STUDENT_SECTION] !== null) {
      out[CONFIG.COLUMNS.STUDENT_SECTION] = String(out[CONFIG.COLUMNS.STUDENT_SECTION]).trim().toUpperCase();
    }
    if (out[CONFIG.COLUMNS.STUDENT_STATUS] !== undefined && out[CONFIG.COLUMNS.STUDENT_STATUS] !== null) {
      out[CONFIG.COLUMNS.STUDENT_STATUS] = String(out[CONFIG.COLUMNS.STUDENT_STATUS]).trim();
    }
    return out;
  },

  /**
   * Constructs a standard structured student record ready for database entry.
   * @param {Object} normalizedData Pre-cleaned student data
   * @param {string} createdBy Username or Operator Identity
   * @return {Object} Finished model object
   */
  _buildStudentObject: function (normalizedData, createdBy) {
    try {
      var now = Utils.getCurrentTimestamp();
      var obj = {};

      obj[CONFIG.COLUMNS.STUDENT_ID] = IdService && typeof IdService.generateStudentId === 'function' ? IdService.generateStudentId() : 'STU' + now;
      obj[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = normalizedData[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER];
      obj[CONFIG.COLUMNS.STUDENT_NAME] = normalizedData[CONFIG.COLUMNS.STUDENT_NAME];

      var rawDept = normalizedData[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID];
      var resolvedDeptId = rawDept;
      if (rawDept && typeof DepartmentService !== 'undefined' && typeof DepartmentService.getDepartmentById === 'function') {
        var deptRes = DepartmentService.getDepartmentById(rawDept);
        if (deptRes && deptRes.success && deptRes.department) {
          resolvedDeptId = deptRes.department[CONFIG.COLUMNS.DEPARTMENT_ID] || deptRes.department.department_id || rawDept;
        }
      }
      obj[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = resolvedDeptId;
      obj[CONFIG.COLUMNS.STUDENT_BRANCH] = normalizedData[CONFIG.COLUMNS.STUDENT_BRANCH] || '';
      obj[CONFIG.COLUMNS.STUDENT_YEAR] = normalizedData[CONFIG.COLUMNS.STUDENT_YEAR];
      obj[CONFIG.COLUMNS.STUDENT_SECTION] = normalizedData[CONFIG.COLUMNS.STUDENT_SECTION];
      // Status is automatically calculated by StatusSyncService based on event participation.
      obj[CONFIG.COLUMNS.STUDENT_STATUS] = CONFIG.STUDENT_STATUS.INACTIVE;
      if (normalizedData["College"] !== undefined) {
        obj["College"] = normalizedData["College"];
      }
      // Also satisfy 'Status' required field validation in DatabaseService
      if (CONFIG.COLUMNS.STUDENT_STATUS !== 'Status') {
        obj['Status'] = obj[CONFIG.COLUMNS.STUDENT_STATUS];
      }

      obj[CONFIG.COLUMNS.DELETION_FLAG] = false;
      obj[CONFIG.COLUMNS.CREATED_BY] = createdBy || 'System';
      obj[CONFIG.COLUMNS.CREATED_AT] = now;
      obj[CONFIG.COLUMNS.UPDATED_BY] = createdBy || 'System';
      obj[CONFIG.COLUMNS.UPDATED_AT] = now;

      return obj;
    } catch (error) {
      Logger.log('StudentService._buildStudentObject error: ' + (error && error.message ? error.message : error));
      return null;
    }
  },

  /**
   * Securely maps audit logs without interrupting the parent business runtime contexts.
   */
  _logAuditSafe: function (entityId, action, description, operator) {
    try {
      if (typeof AuditService !== 'undefined' && typeof AuditService.logAction === 'function') {
        AuditService.logAction(
          entityId,
          'StudentService',
          action,
          entityId,
          'Student',
          description,
          '',
          'SUCCESS',
          operator || 'System'
        );
      }
    } catch (auditError) {
      Logger.log('StudentService audit logging warning: ' + (auditError && auditError.message ? auditError.message : auditError));
    }
  },

  /**
   * Helper to check department state directly against DepartmentService custom response wrapper.
   */
  _validateDepartmentLinkActive: function (departmentId) {
    Logger.log("[TRACE][_validateDepartmentLinkActive][START] input departmentId: " + departmentId);
    Logger.log("[TRACE][_validateDepartmentLinkActive] CONFIG Department ID Column: " + CONFIG.COLUMNS.DEPARTMENT_ID);
    try {
      if (!DepartmentService) {
        Logger.log("[TRACE][_validateDepartmentLinkActive] DepartmentService undefined, returning true");
        return true;
      }
      if (!departmentId) {
        Logger.log("[TRACE][_validateDepartmentLinkActive] departmentId is falsy, returning false");
        return false;
      }

      // Bypass check for spot registrations
      var cleanId = String(departmentId).trim().toUpperCase();
      if (cleanId === 'SPOT GROUP' || cleanId === 'SPOT' || cleanId === 'OTHERS') {
        Logger.log("[TRACE][_validateDepartmentLinkActive] Bypass cleanId matched: " + cleanId + ", returning true");
        return true;
      }

      var allDepts = DatabaseService.readAllRows(CONFIG.SHEETS.DEPARTMENTS) || [];
      if (allDepts.length === 0) {
        var defaultDepts = [
          { 'Department ID': 'DEPT_CSE', 'Department Code': 'CSE', 'Department Name': 'Computer Science and Engineering', 'Status': 'Active' },
          { 'Department ID': 'DEPT_AIML', 'Department Code': 'CSE-AIML', 'Department Name': 'CSE (AI & ML)', 'Status': 'Active' },
          { 'Department ID': 'DEPT_DS', 'Department Code': 'CSE-DS', 'Department Name': 'CSE (Data Science)', 'Status': 'Active' },
          { 'Department ID': 'DEPT_AIDS', 'Department Code': 'AI&DS', 'Department Name': 'Artificial Intelligence & Data Science', 'Status': 'Active' },
          { 'Department ID': 'DEPT_IT', 'Department Code': 'IT', 'Department Name': 'Information Technology', 'Status': 'Active' },
          { 'Department ID': 'DEPT_ECE', 'Department Code': 'ECE', 'Department Name': 'Electronics and Communication Engineering', 'Status': 'Active' },
          { 'Department ID': 'DEPT_EEE', 'Department Code': 'EEE', 'Department Name': 'Electrical and Electronics Engineering', 'Status': 'Active' },
          { 'Department ID': 'DEPT_ME', 'Department Code': 'ME', 'Department Name': 'Mechanical Engineering', 'Status': 'Active' },
          { 'Department ID': 'DEPT_CIVIL', 'Department Code': 'CIVIL', 'Department Name': 'Civil Engineering', 'Status': 'Active' },
          { 'Department ID': 'DEPT_MBA', 'Department Code': 'MBA', 'Department Name': 'Master of Business Administration', 'Status': 'Active' },
          { 'Department ID': 'DEPT_MCA', 'Department Code': 'MCA', 'Department Name': 'Master of Computer Applications', 'Status': 'Active' }
        ];
        try { DatabaseService.insertRows(CONFIG.SHEETS.DEPARTMENTS, defaultDepts); } catch(se) {}
      }

      // 1. Try finding by ID
      var deptResp = typeof DepartmentService.getDepartmentById === 'function' ? DepartmentService.getDepartmentById(departmentId) : null;
      Logger.log("[TRACE][_validateDepartmentLinkActive] DepartmentService.getDepartmentById response: " + JSON.stringify(deptResp));
      var dept = null;
      if (deptResp) {
        if (deptResp.department) dept = deptResp.department;
        else if (deptResp.data && deptResp.data.department) dept = deptResp.data.department;
        else if (deptResp.success !== false) dept = deptResp;
      }
      // 2. Fallback: search directly by Department ID
      if (!dept && typeof DatabaseService !== 'undefined') {
        var found = DatabaseService.findOne(
          CONFIG.SHEETS.DEPARTMENTS,
          CONFIG.COLUMNS.DEPARTMENT_ID || 'Department ID',
          cleanId
        );
        Logger.log("[TRACE][_validateDepartmentLinkActive] DatabaseService.findOne by Department ID (" + cleanId + "): " + JSON.stringify(found));
        if (found) {
          dept = Utils.sanitizeDepartment
            ? Utils.sanitizeDepartment(found)
            : found;
        }
      }
      // 2. If not found by ID, try finding by Code in sheet directly
      if (!dept && typeof DatabaseService !== 'undefined') {
        const cleanedId = String(departmentId).trim().toUpperCase();
        const found = DatabaseService.findOne(CONFIG.SHEETS.DEPARTMENTS, CONFIG.COLUMNS.DEPARTMENT_CODE || 'Department Code', cleanedId);
        Logger.log("[TRACE][_validateDepartmentLinkActive] DatabaseService.findOne by Department Code (" + cleanedId + "): " + JSON.stringify(found));
        if (found) {
          dept = Utils.sanitizeDepartment ? Utils.sanitizeDepartment(found) : found;
        }
      }

      // 3. If still not found, try finding by Name in sheet directly
      if (!dept && typeof DatabaseService !== 'undefined') {
        const cleanedId = String(departmentId).trim();
        const found = DatabaseService.findOne(CONFIG.SHEETS.DEPARTMENTS, CONFIG.COLUMNS.DEPARTMENT_NAME || 'Department Name', cleanedId);
        Logger.log("[TRACE][_validateDepartmentLinkActive] DatabaseService.findOne by Department Name (" + cleanedId + "): " + JSON.stringify(found));
        if (found) {
          dept = Utils.sanitizeDepartment ? Utils.sanitizeDepartment(found) : found;
        }
      }

      if (!dept) {
        Logger.log('[TRACE][_validateDepartmentLinkActive][END] Department ' + departmentId + ' NOT FOUND anywhere. Returning false.');
        return false;
      }

      var statusField = CONFIG.COLUMNS.STATUS || 'Status';
      var activeStatus = (CONFIG.DEPARTMENT_STATUS && CONFIG.DEPARTMENT_STATUS.ACTIVE) ? CONFIG.DEPARTMENT_STATUS.ACTIVE : 'Active';
      Logger.log('[TRACE][_validateDepartmentLinkActive] Examining department record statusField (' + statusField + '): ' + dept[statusField] + ' vs activeStatus: ' + activeStatus);
      if (dept[statusField] !== activeStatus) {
        Logger.log('[TRACE][_validateDepartmentLinkActive][END] Department ' + departmentId + ' is INACTIVE. Returning false.');
        return false;
      }
      Logger.log('[TRACE][_validateDepartmentLinkActive][END] Department ' + departmentId + ' VALIDATED ACTIVE. Returning true.');
      return true;
    } catch (e) {
      Logger.log('[TRACE][_validateDepartmentLinkActive][ERROR]: ' + e);
      return false;
    }
  },

  // ==========================================
  // Public CRUD Interface Methods
  // ==========================================

  /**
   * Registers a new student to the tracking database.
   */
  createStudent: function (studentData, createdBy, userContext) {
    try {
      Logger.log('[TRACE][createStudent][START] Incoming payload: ' + JSON.stringify(studentData) + ' | createdBy: ' + createdBy);
      var failMsg = CONFIG.MESSAGES.STUDENT_CREATE_FAILED || 'Student create failed';
      if (!studentData) {
        Logger.log('[TRACE][createStudent][EARLY-RETURN] Falsy studentData');
        return Utils.buildResponse(false, failMsg);
      }

      var normalized = this._normalizeStudentData(studentData);
      Logger.log('[TRACE][createStudent] Normalized payload: ' + JSON.stringify(normalized));
      Logger.log('[TRACE][createStudent] Extract departmentId: ' + normalized[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID]);

      if (userContext && userContext.isHOD) {
        const callerDept = String(userContext.department || '').trim().toUpperCase();
        const targetDept = String(normalized[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] || '').trim().toUpperCase();
        if (targetDept !== callerDept) {
          return Utils.buildResponse(false, 'Unauthorized: HODs can only create students in their own department (' + callerDept + ').');
        }
      }

      // Centralized validation on normalized target payload
      var validationResult = ValidationService.validateStudent(normalized);
      Logger.log('[TRACE][createStudent] ValidationService.validateStudent result: ' + JSON.stringify(validationResult));
      if (!validationResult || !validationResult.valid) {
        var errorString = validationResult && validationResult.errors ? validationResult.errors.join(' ') : 'Validation failed';
        Logger.log('[TRACE][createStudent][EARLY-RETURN] ValidationService failed: ' + errorString);
        return Utils.buildResponse(false, errorString);
      }

      // Business Logic Constraint Verifications
      var isDeptActive = this._validateDepartmentLinkActive(normalized[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID]);
      Logger.log('[TRACE][createStudent] _validateDepartmentLinkActive return value: ' + isDeptActive);
      if (!isDeptActive) {
        Logger.log('[TRACE][createStudent][EARLY-RETURN] _validateDepartmentLinkActive returned false');
        return Utils.buildResponse(false, CONFIG.MESSAGES.INVALID_DEPARTMENT || 'Invalid or inactive department specified');
      }

      var exists = this._studentExists(normalized[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER]);
      Logger.log('[TRACE][createStudent] _studentExists return value: ' + exists);
      if (exists) {
        Logger.log('[TRACE][createStudent][EARLY-RETURN] _studentExists returned true');
        return Utils.buildResponse(false, CONFIG.MESSAGES.ROLL_NUMBER_EXISTS || 'Roll number already exists');
      }

      var newStudentObj = this._buildStudentObject(normalized, createdBy);
      Logger.log('[TRACE][createStudent] Built student object: ' + JSON.stringify(newStudentObj));
      if (!newStudentObj) {
        Logger.log('[TRACE][createStudent][EARLY-RETURN] _buildStudentObject returned null');
        return Utils.buildResponse(false, failMsg);
      }

      var success = DatabaseService.insertRow(this._studentsSheet(), newStudentObj);
      Logger.log('[TRACE][createStudent] DatabaseService.insertRow result: ' + success);
      if (success) {
        var cleanedOutput = Utils.sanitizeStudent(newStudentObj);

        this._logAuditSafe(
          newStudentObj[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER],
          'CREATE_STUDENT',
          'Student created successfully',
          createdBy
        );

        if (typeof CacheManager !== 'undefined') {
          CacheManager.remove("student_roll_" + newStudentObj[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER]);
        }

        var finalResp = Utils.buildResponse(true, CONFIG.MESSAGES.STUDENT_CREATED || 'Student created successfully', { student: cleanedOutput });
        Logger.log('[TRACE][createStudent][SUCCESS-RETURN] Final response: ' + JSON.stringify(finalResp));
        return finalResp;
      }
      Logger.log('[TRACE][createStudent][EARLY-RETURN] DatabaseService.insertRow returned false');
      return Utils.buildResponse(false, failMsg);
    } catch (error) {
      Logger.log("[TRACE][createStudent][EXCEPTION]: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, CONFIG.MESSAGES.STUDENT_CREATE_FAILED || 'Student create failed');
    }
  },

  /**
   * Updates an existing student tracking record details.
   */
  updateStudent: function (rollNumber, studentData, updatedBy, userContext) {
    try {
      var failMsg = CONFIG.MESSAGES.STUDENT_UPDATE_FAILED || 'Student update failed';
      if (!rollNumber || !studentData) return Utils.buildResponse(false, failMsg);

      var searchRoll = String(rollNumber).trim().toUpperCase();
      var existing = this._getStudent(searchRoll);
      if (!existing) {
        return Utils.buildResponse(false, CONFIG.MESSAGES.STUDENT_NOT_FOUND || 'Student not found');
      }

      if (userContext && userContext.isHOD) {
        const callerDept = String(userContext.department || '').trim().toUpperCase();
        const existingDept = String(existing[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] || existing.department_id || existing.department || '').trim().toUpperCase();
        if (existingDept !== callerDept) {
          return Utils.buildResponse(false, 'Unauthorized: You can only edit students in your own department.');
        }
      }

      var inputNormalized = this._normalizeStudentData(studentData);

      if (userContext && userContext.isHOD) {
        const callerDept = String(userContext.department || '').trim().toUpperCase();
        const targetDept = String(inputNormalized[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] || '').trim().toUpperCase();
        if (targetDept && targetDept !== callerDept) {
          return Utils.buildResponse(false, 'Unauthorized: You cannot move students to another department.');
        }
      }

      // Prevent mutations to system key mappings or historical tracking data records
      delete inputNormalized[CONFIG.COLUMNS.STUDENT_ID];
      delete inputNormalized[CONFIG.COLUMNS.CREATED_BY];
      delete inputNormalized[CONFIG.COLUMNS.CREATED_AT];
      
      // Status is fully system-managed by StatusSyncService, prevent manual updates
      delete inputNormalized[CONFIG.COLUMNS.STUDENT_STATUS];

      // Merge and evaluate validation parameters on complete finalized state
      var mergedState = Object.assign({}, existing, inputNormalized);
      var validationResult = ValidationService.validateStudent(mergedState);
      if (!validationResult || !validationResult.valid) {
        var errorString = validationResult && validationResult.errors ? validationResult.errors.join(' ') : 'Validation failed';
        return Utils.buildResponse(false, errorString);
      }

      // Verify business constraint mappings if key links are altering
      if (inputNormalized[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] &&
        inputNormalized[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] !== existing[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID]) {
        if (!this._validateDepartmentLinkActive(inputNormalized[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID])) {
          return Utils.buildResponse(false, CONFIG.MESSAGES.INVALID_DEPARTMENT || 'Invalid or inactive department specified');
        }
      }

      if (inputNormalized[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] &&
        inputNormalized[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] !== existing[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER]) {
        if (this._studentExists(inputNormalized[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER])) {
          return Utils.buildResponse(false, CONFIG.MESSAGES.ROLL_NUMBER_EXISTS || 'Roll number already exists');
        }
      }

      // Inject system audit properties
      inputNormalized[CONFIG.COLUMNS.UPDATED_BY] = updatedBy || 'System';
      inputNormalized[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();

      var success = DatabaseService.updateRow(
        this._studentsSheet(),
        CONFIG.COLUMNS.STUDENT_ROLL_NUMBER,
        searchRoll,
        inputNormalized
      );

      if (success) {
        var completeUpdatedObj = Object.assign({}, existing, inputNormalized);
        var cleanedOutput = Utils.sanitizeStudent(completeUpdatedObj);

        this._logAuditSafe(
          searchRoll,
          'UPDATE_STUDENT',
          'Student details updated successfully',
          updatedBy
        );

        if (typeof CacheManager !== 'undefined') {
          CacheManager.remove("student_roll_" + searchRoll);
        }

        return Utils.buildResponse(true, CONFIG.MESSAGES.STUDENT_UPDATED || 'Student updated successfully', { student: cleanedOutput });
      }
      return Utils.buildResponse(false, failMsg);
    } catch (error) {
      Logger.log("StudentService.updateStudent error: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, CONFIG.MESSAGES.STUDENT_UPDATE_FAILED || 'Student update failed');
    }
  },

  /**
   * Triggers a secure soft delete lifecycle flag toggling.
   */
  deleteStudent: function (rollNumber, updatedBy, userContext) {
    try {
      var failMsg = CONFIG.MESSAGES.STUDENT_DELETE_FAILED || 'Student delete failed';
      if (!rollNumber) return Utils.buildResponse(false, failMsg);

      var searchRoll = String(rollNumber).trim().toUpperCase();
      var student = this._getStudent(searchRoll);
      if (!student) {
        return Utils.buildResponse(false, CONFIG.MESSAGES.STUDENT_NOT_FOUND || 'Student not found');
      }

      if (userContext && userContext.isHOD) {
        const callerDept = String(userContext.department || '').trim().toUpperCase();
        const studentDept = String(student[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] || student.department_id || student.department || '').trim().toUpperCase();
        if (studentDept !== callerDept) {
          return Utils.buildResponse(false, 'Unauthorized: You can only delete students in your own department.');
        }
      }

      var success = DatabaseService.deleteRow(this._studentsSheet(), CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, searchRoll);
      if (success) {
        // Enforce audit updates tracking directly to metadata storage row mappings
        try {
          var metadataUpdate = {};
          metadataUpdate[CONFIG.COLUMNS.UPDATED_BY] = updatedBy || 'System';
          metadataUpdate[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();
          DatabaseService.updateRow(this._studentsSheet(), CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, searchRoll, metadataUpdate);
        } catch (metaErr) {
          Logger.log('Non-critical soft-delete metadata assignment warning: ' + metaErr.message);
        }

        if (typeof CacheManager !== 'undefined') {
          CacheManager.remove("student_roll_" + searchRoll);
        }

        this._logAuditSafe(searchRoll, 'DELETE_STUDENT', 'Student soft deleted', updatedBy);
        return Utils.buildResponse(true, CONFIG.MESSAGES.STUDENT_DELETED || 'Student deleted successfully');
      }
      return Utils.buildResponse(false, failMsg);
    } catch (error) {
      Logger.log("StudentService.deleteStudent error: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, CONFIG.MESSAGES.STUDENT_DELETE_FAILED || 'Student delete failed');
    }
  },

  // ==========================================
  // Activation / Deactivation Operations
  // ==========================================

  activateStudent: function (rollNumber, updatedBy) {
    try {
      var failMsg = CONFIG.MESSAGES.STUDENT_ACTIVATE_FAILED || 'Activation failed';
      if (!rollNumber) return Utils.buildResponse(false, failMsg);

      var searchRoll = String(rollNumber).trim().toUpperCase();
      var student = this._getStudent(searchRoll);
      if (!student) {
        return Utils.buildResponse(false, CONFIG.MESSAGES.STUDENT_NOT_FOUND || 'Student not found');
      }
      if (student[CONFIG.COLUMNS.STUDENT_STATUS] === CONFIG.STUDENT_STATUS.ACTIVE) {
        return Utils.buildResponse(false, CONFIG.MESSAGES.STUDENT_ALREADY_ACTIVE || 'Student is already active');
      }

      var updateData = {};
      updateData[CONFIG.COLUMNS.STUDENT_STATUS] = CONFIG.STUDENT_STATUS.ACTIVE;
      updateData[CONFIG.COLUMNS.UPDATED_BY] = updatedBy || 'System';
      updateData[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();

      var success = DatabaseService.updateRow(this._studentsSheet(), CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, searchRoll, updateData);
      if (success) {
        var merged = Object.assign({}, student, updateData);
        this._logAuditSafe(searchRoll, 'ACTIVATE_STUDENT', 'Student profile activated', updatedBy);
        return Utils.buildResponse(true, CONFIG.MESSAGES.STUDENT_ACTIVATED || 'Student activated successfully', { student: Utils.sanitizeStudent(merged) });
      }
      return Utils.buildResponse(false, failMsg);
    } catch (error) {
      Logger.log("StudentService.activateStudent error: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, CONFIG.MESSAGES.STUDENT_ACTIVATE_FAILED || 'Activation failed');
    }
  },

  deactivateStudent: function (rollNumber, updatedBy) {
    try {
      var failMsg = CONFIG.MESSAGES.STUDENT_DEACTIVATE_FAILED || 'Deactivation failed';
      if (!rollNumber) return Utils.buildResponse(false, failMsg);

      var searchRoll = String(rollNumber).trim().toUpperCase();
      var student = this._getStudent(searchRoll);
      if (!student) {
        return Utils.buildResponse(false, CONFIG.MESSAGES.STUDENT_NOT_FOUND || 'Student not found');
      }
      if (student[CONFIG.COLUMNS.STUDENT_STATUS] === CONFIG.STUDENT_STATUS.INACTIVE) {
        return Utils.buildResponse(false, CONFIG.MESSAGES.STUDENT_ALREADY_INACTIVE || 'Student is already inactive');
      }

      var updateData = {};
      updateData[CONFIG.COLUMNS.STUDENT_STATUS] = CONFIG.STUDENT_STATUS.INACTIVE;
      updateData[CONFIG.COLUMNS.UPDATED_BY] = updatedBy || 'System';
      updateData[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();

      var success = DatabaseService.updateRow(this._studentsSheet(), CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, searchRoll, updateData);
      if (success) {
        var merged = Object.assign({}, student, updateData);
        this._logAuditSafe(searchRoll, 'DEACTIVATE_STUDENT', 'Student profile deactivated', updatedBy);
        return Utils.buildResponse(true, CONFIG.MESSAGES.STUDENT_DEACTIVATED || 'Student deactivated successfully', { student: Utils.sanitizeStudent(merged) });
      }
      return Utils.buildResponse(false, failMsg);
    } catch (error) {
      Logger.log("StudentService.deactivateStudent error: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, CONFIG.MESSAGES.STUDENT_DEACTIVATE_FAILED || 'Deactivation failed');
    }
  },

  // ==========================================
  // Read / Query / Fetching Operations
  // ==========================================

  getStudentByRollNumber: function (rollNumber, userContext) {
    try {
      if (!rollNumber) return null;
      const normalizedRoll = String(rollNumber).trim().toUpperCase();
      const cacheKey = "student_roll_" + normalizedRoll;
      if (typeof CacheManager !== 'undefined') {
        const cached = CacheManager.get(cacheKey);
        if (cached) {
          if (userContext) {
            const scoped = SecurityUtils.applyStudentRLS([cached], userContext);
            if (scoped.length === 0) return null;
          }
          return cached;
        }
      }

      var student = this._getStudent(rollNumber);
      const sanitized = student ? Utils.sanitizeStudent(student) : null;
      if (sanitized && userContext) {
        const scoped = SecurityUtils.applyStudentRLS([sanitized], userContext);
        if (scoped.length === 0) return null;
      }

      if (typeof CacheManager !== 'undefined' && sanitized) {
        CacheManager.put(cacheKey, sanitized, 1800);
      }
      return sanitized;
    } catch (error) {
      Logger.log("StudentService.getStudentByRollNumber error: " + (error && error.message ? error.message : error));
      return null;
    }
  },

  getAllStudents: function (userContext) {
    try {
      Logger.log("STUDENTS_MODULE | STEP 3 - Reading Google Sheet | Sheet Name: " + this._studentsSheet());
      var rawStudents = this._getStudents();
      var scopedStudents = userContext ? SecurityUtils.applyStudentRLS(rawStudents, userContext) : rawStudents;

      Logger.log("STUDENTS_MODULE | STEP 4 - Processing data | Records found: " + scopedStudents.length);
      var sanitizedItems = scopedStudents.map(function (s) {
        return Utils.sanitizeStudent(s);
      });
      return Utils.buildResponse(true, 'All students fetched successfully', { students: sanitizedItems });
    } catch (error) {
      Logger.log("StudentService.getAllStudents error: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, 'Error fetching all student records', { students: [] });
    }
  },

  getActiveStudents: function (userContext) {
    try {
      var rawStudents = this._getStudents().filter(function (s) {
        return s[CONFIG.COLUMNS.STUDENT_STATUS] === CONFIG.STUDENT_STATUS.ACTIVE;
      });
      var scopedStudents = userContext ? SecurityUtils.applyStudentRLS(rawStudents, userContext) : rawStudents;
      var sanitizedItems = scopedStudents.map(function (s) {
        return Utils.sanitizeStudent(s);
      });
      return Utils.buildResponse(true, 'Active students fetched successfully', { students: sanitizedItems });
    } catch (error) {
      Logger.log("StudentService.getActiveStudents error: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, 'Error fetching active student records', { students: [] });
    }
  },

  getStudentBasicInfo: function (rollNumber, userContext) {
    try {
      if (!rollNumber) return Utils.buildResponse(false, 'Missing roll number parameter');
      var student = this._getStudent(rollNumber);
      if (!student) {
        return Utils.buildResponse(false, CONFIG.MESSAGES.STUDENT_NOT_FOUND || 'Student not found');
      }

      var sanitized = Utils.sanitizeStudent(student);
      if (userContext) {
        const scoped = SecurityUtils.applyStudentRLS([sanitized], userContext);
        if (scoped.length === 0) {
          return Utils.buildResponse(false, 'Unauthorized: Access to this student record is denied.');
        }
      }

      var basicInfo = {};
      basicInfo[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = student[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER];
      basicInfo[CONFIG.COLUMNS.STUDENT_NAME] = student[CONFIG.COLUMNS.STUDENT_NAME];
      basicInfo[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = student[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID];
      basicInfo[CONFIG.COLUMNS.STUDENT_YEAR] = student[CONFIG.COLUMNS.STUDENT_YEAR];
      basicInfo[CONFIG.COLUMNS.STUDENT_SECTION] = student[CONFIG.COLUMNS.STUDENT_SECTION];
      basicInfo[CONFIG.COLUMNS.STUDENT_STATUS] = student[CONFIG.COLUMNS.STUDENT_STATUS];

      return Utils.buildResponse(true, 'Basic info retrieved successfully', { studentBasicInfo: basicInfo });
    } catch (error) {
      Logger.log("StudentService.getStudentBasicInfo error: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, 'Error fetching basic student info');
    }
  },

  // ==========================================
  // Searching, Sorting & Pagination
  // ==========================================

  sortStudents: function (sortBy, order) {
    try {
      var allowedFields = [
        CONFIG.COLUMNS.STUDENT_NAME,
        CONFIG.COLUMNS.STUDENT_ROLL_NUMBER,
        CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID,
        CONFIG.COLUMNS.STUDENT_YEAR,
        CONFIG.COLUMNS.STUDENT_SECTION,
        CONFIG.COLUMNS.STUDENT_STATUS,
        CONFIG.COLUMNS.CREATED_AT,
        CONFIG.COLUMNS.UPDATED_AT
      ];

      if (!allowedFields.includes(sortBy)) {
        return Utils.buildResponse(false, 'Invalid sorting field selection parameters tracking.', { students: [] });
      }

      var records = this._getStudents();
      records.sort(function (a, b) {
        var valA = String(a[sortBy] || '').toUpperCase();
        var valB = String(b[sortBy] || '').toUpperCase();
        if (order === 'desc') {
          return valA < valB ? 1 : -1;
        }
        return valA > valB ? 1 : -1;
      });

      var sanitizedOutput = records.map(function (s) {
        return Utils.sanitizeStudent(s);
      });
      return Utils.buildResponse(true, 'Students sorted successfully', { students: sanitizedOutput });
    } catch (error) {
      Logger.log("StudentService.sortStudents error: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, 'Error processing student sorting algorithms', { students: [] });
    }
  },

  paginateStudents: function (page, pageSize, filterOptions, userContext) {
    try {
      var intPage = parseInt(page, 10);
      var intPageSize = parseInt(pageSize, 10);

      if (isNaN(intPage) || intPage < 1 || isNaN(intPageSize) || intPageSize <= 0) {
        return Utils.buildResponse(false, 'Invalid pagination constraints provided.', {
          totalRecords: 0,
          currentPage: 1,
          totalPages: 0,
          pageSize: intPageSize || 10,
          items: []
        });
      }

      var records = this._getStudents();
      if (userContext) {
        records = SecurityUtils.applyStudentRLS(records, userContext);
      }

      // Apply Filter Options Dynamically
      if (filterOptions) {
        if (filterOptions.department) {
          var fDept = String(filterOptions.department).trim().toUpperCase();
          records = records.filter(function (s) {
            return String(s[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID]).toUpperCase() === fDept;
          });
        }
        if (filterOptions.year) {
          var fYear = String(filterOptions.year).trim();
          records = records.filter(function (s) {
            return String(s[CONFIG.COLUMNS.STUDENT_YEAR]) === fYear;
          });
        }
        if (filterOptions.section) {
          var fSec = String(filterOptions.section).trim().toUpperCase();
          records = records.filter(function (s) {
            return String(s[CONFIG.COLUMNS.STUDENT_SECTION]).toUpperCase() === fSec;
          });
        }
        if (filterOptions.search) {
          var query = String(filterOptions.search).trim().toUpperCase();
          records = records.filter(function (s) {
            return String(s[CONFIG.COLUMNS.STUDENT_NAME]).toUpperCase().includes(query) ||
              String(s[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER]).toUpperCase().includes(query);
          });
        }
      }

      var totalRecords = records.length;
      var totalPages = Math.ceil(totalRecords / intPageSize);
      var startIndex = (intPage - 1) * intPageSize;

      var items = records.slice(startIndex, startIndex + intPageSize).map(function (s) {
        return Utils.sanitizeStudent(s);
      });

      return Utils.buildResponse(true, 'Paginated students dataset pulled successfully', {
        totalRecords: totalRecords,
        currentPage: intPage,
        totalPages: totalPages,
        pageSize: intPageSize,
        items: items
      });
    } catch (error) {
      Logger.log("StudentService.paginateStudents error: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, 'Pagination structural generation exception.', {
        totalRecords: 0,
        currentPage: 1,
        totalPages: 0,
        pageSize: 10,
        items: []
      });
    }
  },

  // ==========================================
  // Operational Dashboard Summaries
  // ==========================================

  getStudentSummary: function () {
    try {
      var students = this._getStudents();
      var total = students.length;
      var active = students.filter(function (s) { return s[CONFIG.COLUMNS.STUDENT_STATUS] === CONFIG.STUDENT_STATUS.ACTIVE; }).length;
      var inactive = students.filter(function (s) { return s[CONFIG.COLUMNS.STUDENT_STATUS] === CONFIG.STUDENT_STATUS.INACTIVE; }).length;

      var deptCounts = {};
      var yearCounts = {};
      var sectionCounts = {};

      students.forEach(function (s) {
        var dept = s[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] || 'UNKNOWN';
        var year = s[CONFIG.COLUMNS.STUDENT_YEAR] || 'UNKNOWN';
        var section = s[CONFIG.COLUMNS.STUDENT_SECTION] || 'UNKNOWN';

        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        yearCounts[year] = (yearCounts[year] || 0) + 1;
        sectionCounts[section] = (sectionCounts[section] || 0) + 1;
      });

      var summaryPayload = {
        totalStudents: total,
        activeStudents: active,
        inactiveStudents: inactive,
        departmentCounts: deptCounts,
        yearCounts: yearCounts,
        sectionCounts: sectionCounts
      };

      return Utils.buildResponse(true, 'Student analytics summaries extracted successfully', summaryPayload);
    } catch (error) {
      Logger.log("StudentService.getStudentSummary error: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, 'Failed to build analytics summaries');
    }
  },

  // ==========================================
  // Data Exchange Layer Imports/Exports
  // ==========================================

  importStudents: function (dataset, operator) {
    try {
      this._logAuditSafe('BATCH_IMPORT', 'IMPORT_STUDENTS', 'Student data import triggered', operator);
      return Utils.buildResponse(false, CONFIG.MESSAGES.NOT_IMPLEMENTED || 'Feature not implemented');
    } catch (error) {
      Logger.log("StudentService.importStudents error: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, 'Import execution encountered an exception mapping records.');
    }
  },

  exportStudents: function (filterOptions, operator) {
    try {
      this._logAuditSafe('BATCH_EXPORT', 'EXPORT_STUDENTS', 'Student data export triggered', operator);
      return Utils.buildResponse(false, CONFIG.MESSAGES.NOT_IMPLEMENTED || 'Feature not implemented');
    } catch (error) {
      Logger.log("StudentService.exportStudents error: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, 'Export execution encountered an exception compiling files.');
    }
  },

  searchStudents: function (keyword) {
    try {
      if (Utils.checkEmptyValue(keyword)) return [];
      var query = String(keyword).trim().toUpperCase();
      var records = DatabaseService.readAllRows(this._studentsSheet()) || [];
      const active = records.filter(function (s) {
        return !s.deletion_flag && !s['Deletion Flag'];
      });
      const results = active.filter(function (s) {
        return String(s[CONFIG.COLUMNS.STUDENT_NAME] || '').toUpperCase().indexOf(query) !== -1 ||
               String(s[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] || '').toUpperCase().indexOf(query) !== -1;
      });
      return results.map(s => Utils.sanitizeStudent(s));
    } catch (e) {
      Logger.log("StudentService.searchStudents error: " + e.message);
      return [];
    }
  },

  getStudentsByDepartment: function (department) {
    try {
      if (!department) return [];
      var targetDept = String(department).trim().toUpperCase();
      var records = DatabaseService.readAllRows(this._studentsSheet()) || [];
      const active = records.filter(function (s) {
        return !s.deletion_flag && !s['Deletion Flag'];
      });
      const results = active.filter(function (s) {
        return String(s[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] || '').toUpperCase() === targetDept;
      });
      return results.map(s => Utils.sanitizeStudent(s));
    } catch (e) {
      Logger.log("StudentService.getStudentsByDepartment error: " + e.message);
      return [];
    }
  },

  getStudentsByYear: function (year) {
    try {
      if (!year) return [];
      var targetYear = String(year).trim();
      var records = DatabaseService.readAllRows(this._studentsSheet()) || [];
      const active = records.filter(function (s) {
        return !s.deletion_flag && !s['Deletion Flag'];
      });
      const results = active.filter(function (s) {
        return String(s[CONFIG.COLUMNS.STUDENT_YEAR] || '') === targetYear;
      });
      return results.map(s => Utils.sanitizeStudent(s));
    } catch (e) {
      Logger.log("StudentService.getStudentsByYear error: " + e.message);
      return [];
    }
  },

  getStudentsBySection: function (section) {
    try {
      if (!section) return [];
      var targetSec = String(section).trim().toUpperCase();
      var records = DatabaseService.readAllRows(this._studentsSheet()) || [];
      const active = records.filter(function (s) {
        return !s.deletion_flag && !s['Deletion Flag'];
      });
      const results = active.filter(function (s) {
        return String(s[CONFIG.COLUMNS.STUDENT_SECTION] || '').toUpperCase() === targetSec;
      });
      return results.map(s => Utils.sanitizeStudent(s));
    } catch (e) {
      Logger.log("StudentService.getStudentsBySection error: " + e.message);
      return [];
    }
  }
};