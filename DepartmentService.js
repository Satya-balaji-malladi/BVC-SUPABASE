
/**
 * DepartmentService.gs
 * Service for handling department management in BVC Engineering College Event Attendance Management System.
 * Responsibilities: CRUD operations for departments, activation/deactivation, searching, filtering, sorting, pagination, and statistics.
 */
const DepartmentService = {

  _isDepartmentNameAvailable: function (name, excludeId) {
    try {
      const records = this._getDepartments();
      const targetName = String(name).trim().toLowerCase();
      return !records.some(dept => {
        const dName = String(dept[CONFIG.COLUMNS.DEPARTMENT_NAME] || dept.department_name || '').trim().toLowerCase();
        const dId = dept[CONFIG.COLUMNS.DEPARTMENT_ID] || dept.department_id;
        return dName === targetName && String(dId) !== String(excludeId);
      });
    } catch (error) {
      Logger.log('DepartmentService._isDepartmentNameAvailable error: ' + (error && error.message ? error.message : error));
      return false;
    }
  },

  _isDepartmentCodeAvailable: function (code, excludeId) {
    try {
      const records = this._getDepartments();
      const targetCode = String(code).trim().toLowerCase();
      return !records.some(dept => {
        const dCode = String(dept[CONFIG.COLUMNS.DEPARTMENT_CODE] || dept.department_code || '').trim().toLowerCase();
        const dId = dept[CONFIG.COLUMNS.DEPARTMENT_ID] || dept.department_id;
        return dCode === targetCode && String(dId) !== String(excludeId);
      });
    } catch (error) {
      Logger.log('DepartmentService._isDepartmentCodeAvailable error: ' + (error && error.message ? error.message : error));
      return false;
    }
  },

  _departmentExists: function (departmentId) {
    try {
      const records = this._getDepartments();
      return records.some(dept => dept[CONFIG.COLUMNS.DEPARTMENT_ID] === departmentId);
    } catch (error) {
      Logger.log('DepartmentService._departmentExists error: ' + (error && error.message ? error.message : error));
      return false;
    }
  },

  _buildDepartmentObject: function (data, createdBy) {
    const now = Utils.getCurrentTimestamp();
    const name = data[CONFIG.COLUMNS.DEPARTMENT_NAME] || data.department_name || '';
    const code = data[CONFIG.COLUMNS.DEPARTMENT_CODE] || data.department_code || '';
    const hod = data['HOD Name'] || data.hod_name || '';
    const empId = data['HOD Emp ID'] || data.hod_emp_id || data.hod_employee_id || '';
    const email = data['HOD Email'] || data.hod_email || '';
    const status = data[CONFIG.COLUMNS.STATUS] || data.status || CONFIG.DEPARTMENT_STATUS.ACTIVE;
    const deptId = data.department_id || data[CONFIG.COLUMNS.DEPARTMENT_ID] || IdService.generateDepartmentId();

    return {
      [CONFIG.COLUMNS.DEPARTMENT_ID]: deptId,
      'department_id': deptId,
      [CONFIG.COLUMNS.DEPARTMENT_NAME]: name,
      'department_name': name,
      [CONFIG.COLUMNS.DEPARTMENT_CODE]: code,
      'department_code': code,
      'HOD Name': hod,
      'hod_name': hod,
      'HOD Emp ID': empId,
      'hod_employee_id': empId,
      'HOD Email': email,
      'remarks': email,
      [CONFIG.COLUMNS.DESCRIPTION]: data[CONFIG.COLUMNS.DESCRIPTION] || '',
      [CONFIG.COLUMNS.STATUS]: status,
      [CONFIG.COLUMNS.DELETION_FLAG]: false,
      [CONFIG.COLUMNS.CREATED_BY]: createdBy || 'System',
      [CONFIG.COLUMNS.CREATED_AT]: now,
      [CONFIG.COLUMNS.UPDATED_BY]: createdBy || 'System',
      [CONFIG.COLUMNS.UPDATED_AT]: now
    };
  },

  _getDepartments: function () {
    try {
      const records = DatabaseService.readAllRows(CONFIG.SHEETS.DEPARTMENTS) || [];
      return records.filter(dept => !dept[CONFIG.COLUMNS.DELETION_FLAG]);
    } catch (error) {
      Logger.log('DepartmentService._getDepartments error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  departmentInUse: function (departmentId) {
    try {
      const users = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.DEPARTMENT, departmentId)
        .filter(u => u[CONFIG.COLUMNS.STATUS] === CONFIG.USER_STATUS.ACTIVE && !u[CONFIG.COLUMNS.DELETION_FLAG]);
      const students = DatabaseService.findByColumn(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.DEPARTMENT, departmentId)
        .filter(s => s[CONFIG.COLUMNS.STATUS] === CONFIG.STUDENT_STATUS.ACTIVE && !s[CONFIG.COLUMNS.DELETION_FLAG]);
      const events = DatabaseService.findByColumn(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.DEPARTMENT, departmentId)
        .filter(e => e[CONFIG.COLUMNS.STATUS] === CONFIG.EVENT_STATUS.ACTIVE && !e[CONFIG.COLUMNS.DELETION_FLAG]);
      return users.length > 0 || students.length > 0 || events.length > 0;
    } catch (error) {
      Logger.log('DepartmentService.departmentInUse error: ' + (error && error.message ? error.message : error));
      return false;
    }
  },

  createDepartment: function (departmentData, createdBy) {
    try {

      // Check input
      if (!departmentData) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_CREATE_FAILED || "Department data is required."
        );
      }

      // Normalize payload keys for backward compatibility
      var deptName = departmentData[CONFIG.COLUMNS.DEPARTMENT_NAME] || departmentData.department_name || '';
      var deptCode = departmentData[CONFIG.COLUMNS.DEPARTMENT_CODE] || departmentData.department_code || '';
      departmentData[CONFIG.COLUMNS.DEPARTMENT_NAME] = deptName;
      departmentData[CONFIG.COLUMNS.DEPARTMENT_CODE] = deptCode;

      // Validate department data
      var validationResult = ValidationService.validateDepartment(departmentData);

      if (!validationResult || !validationResult.valid) {
        var errors = (validationResult && validationResult.errors)
          ? validationResult.errors
          : ["Validation failed"];

        return Utils.buildResponse(false, errors.join(" "));
      }

      // Soft-Delete Reactivation Check:
      // If a deleted department exists with the same department code, reactivate it instead of failing or throwing primary key conflict 23505!
      const allRecords = DatabaseService.readAllRowsIncludingDeleted(CONFIG.SHEETS.DEPARTMENTS) || [];
      const existingDeleted = allRecords.find(d => {
        const isDel = d[CONFIG.COLUMNS.DELETION_FLAG] === true || d[CONFIG.COLUMNS.DELETION_FLAG] === 'true' || d.deletion_flag === true || d.deletion_flag === 'true';
        const c = String(d[CONFIG.COLUMNS.DEPARTMENT_CODE] || d.department_code || '').trim().toUpperCase();
        return isDel && c === deptCode.trim().toUpperCase();
      });

      if (existingDeleted) {
        const restoreId = existingDeleted[CONFIG.COLUMNS.DEPARTMENT_ID] || existingDeleted.department_id;
        const restoreUpdates = {
          [CONFIG.COLUMNS.DEPARTMENT_NAME]: deptName,
          [CONFIG.COLUMNS.DEPARTMENT_CODE]: deptCode,
          'HOD Name': departmentData['HOD Name'] || departmentData.hod_name || '',
          'hod_name': departmentData['HOD Name'] || departmentData.hod_name || '',
          'HOD Emp ID': departmentData['HOD Emp ID'] || departmentData.hod_emp_id || '',
          'hod_employee_id': departmentData['HOD Emp ID'] || departmentData.hod_emp_id || '',
          'HOD Email': departmentData['HOD Email'] || departmentData.hod_email || '',
          'remarks': departmentData['HOD Email'] || departmentData.hod_email || '',
          [CONFIG.COLUMNS.STATUS]: CONFIG.DEPARTMENT_STATUS.ACTIVE,
          [CONFIG.COLUMNS.DELETION_FLAG]: false,
          [CONFIG.COLUMNS.UPDATED_BY]: createdBy || 'System',
          [CONFIG.COLUMNS.UPDATED_AT]: Utils.getCurrentTimestamp()
        };

        DatabaseService.updateRow(CONFIG.SHEETS.DEPARTMENTS, CONFIG.COLUMNS.DEPARTMENT_ID, restoreId, restoreUpdates);
        Logger.log("Reactivated soft-deleted department with ID: " + restoreId + " (" + deptCode + ")");

        var responseDeptRestored = Object.assign({}, existingDeleted, restoreUpdates);

        // Auto-create or reactivate HOD user if provided
        var hodEmailR = departmentData['HOD Email'] || departmentData.hod_email || '';
        var hodEmpIdR = departmentData['HOD Emp ID'] || departmentData.hod_emp_id || '';
        var hodNameR = departmentData['HOD Name'] || departmentData.hod_name || '';
        var hodCreationMsg = "";
        if (hodEmailR && hodEmpIdR) {
          try {
            // Check if user already exists (active or deleted)
            var allUsers = DatabaseService.readAllRowsIncludingDeleted(CONFIG.SHEETS.USERS) || [];
            var empIdCol = CONFIG.COLUMNS.USER_EMPLOYEE_ID || 'Employee ID';
            var existingHodUser = allUsers.find(function (u) {
              var eid = String(u[empIdCol] || u['Employee ID'] || u.employee_id || '').trim().toUpperCase();
              return eid === String(hodEmpIdR).trim().toUpperCase();
            });

            if (existingHodUser) {
              // User exists — check if soft-deleted and reactivate
              var isUserDeleted = existingHodUser[CONFIG.COLUMNS.DELETION_FLAG] === true || existingHodUser[CONFIG.COLUMNS.DELETION_FLAG] === 'true' || existingHodUser.deletion_flag === true || existingHodUser.deletion_flag === 'true';
              if (isUserDeleted) {
                var userIdToRestore = existingHodUser[CONFIG.COLUMNS.USER_ID] || existingHodUser.user_id;
                DatabaseService.updateRow(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_ID, userIdToRestore, {
                  [CONFIG.COLUMNS.DELETION_FLAG]: false,
                  [CONFIG.COLUMNS.STATUS]: 'Active',
                  [CONFIG.COLUMNS.UPDATED_AT]: Utils.getCurrentTimestamp()
                });
                hodCreationMsg = " HOD User Account (" + hodEmpIdR + ") reactivated.";
                Logger.log("Reactivated soft-deleted HOD user: " + hodEmpIdR);
              } else {
                hodCreationMsg = " HOD User Account (" + hodEmpIdR + ") already exists.";
                Logger.log("HOD user already exists (active): " + hodEmpIdR);
              }
            } else {
              // Create brand new HOD user
              var namePartsR = hodNameR.trim().split(" ");
              var initialPwdR = "BVC@" + String(hodEmpIdR).toUpperCase();
              var hodUserDataR = {
                username: String(hodEmpIdR).toLowerCase(),
                password: initialPwdR,
                email_address: hodEmailR,
                first_name: namePartsR[0] || hodNameR,
                last_name: namePartsR.slice(1).join(" ") || "",
                employee_id: hodEmpIdR,
                role: "HOD",
                department: deptCode,
                title_designation: "Head of Department (" + deptCode + ")",
                status: "Active"
              };
              var adminContextR = (createdBy && typeof createdBy === 'object') ? createdBy : { isSuperAdmin: true, role: 'Super Admin', username: 'SuperAdmin' };
              var createResult = UserService.createUser(hodUserDataR, adminContextR);
              Logger.log("HOD User createUser result: " + JSON.stringify(createResult));
              if (createResult && createResult.success) {
                hodCreationMsg = " HOD User Account (" + hodEmpIdR + ") created with password: " + initialPwdR + ".";
              } else {
                hodCreationMsg = " HOD User creation note: " + (createResult && createResult.message ? createResult.message : "Unknown error");
                Logger.log("HOD User creation failed: " + JSON.stringify(createResult));
              }
            }
          } catch (uErr) {
            hodCreationMsg = " HOD User creation error: " + (uErr.message || uErr);
            Logger.log("HOD Auto-Creation error on restore: " + uErr.message);
          }
        }

        return Utils.buildResponse(
          true,
          "Department (" + deptCode + ") reactivated successfully!" + hodCreationMsg,
          { department: Utils.sanitizeDepartment(responseDeptRestored) }
        );
      }

      // Check Department Name
      if (!this._isDepartmentNameAvailable(deptName)) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_NAME_EXISTS || "Department name already exists."
        );
      }

      // Check Department Code
      if (!this._isDepartmentCodeAvailable(deptCode)) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_CODE_EXISTS || "Department code already exists."
        );
      }

      // Build Department Object with fresh ID
      var freshId = IdService.generateDepartmentId();
      departmentData.department_id = freshId;
      departmentData[CONFIG.COLUMNS.DEPARTMENT_ID] = freshId;

      var newDepartment = this._buildDepartmentObject(
        departmentData,
        createdBy
      );

      // Insert into Database with bounded collision retry for 23505 errors
      var inserted = null;
      var maxRetries = 3;
      var attempt = 0;
      while (attempt < maxRetries) {
        try {
          inserted = DatabaseService.insertRow(
            CONFIG.SHEETS.DEPARTMENTS,
            newDepartment
          );
          break; // Insert succeeded
        } catch (insertErr) {
          var errStr = String(insertErr && insertErr.message ? insertErr.message : insertErr);
          if (errStr.indexOf("23505") !== -1 || errStr.indexOf("duplicate key") !== -1) {
            attempt++;
            if (attempt >= maxRetries) throw insertErr;

            // Regenerate fresh ID guaranteed not in DB by querying full table including soft-deleted rows
            var allDbDepts = DatabaseService.readAllRowsIncludingDeleted(CONFIG.SHEETS.DEPARTMENTS) || [];
            var maxSeq = 0;
            allDbDepts.forEach(d => {
              var existingId = String(d[CONFIG.COLUMNS.DEPARTMENT_ID] || d.department_id || '');
              if (existingId.indexOf('DEP') === 0) {
                var seqNum = parseInt(existingId.substring(3), 10);
                if (!isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum;
              }
            });
            var retryId = 'DEP' + Utils.padNumber(maxSeq + attempt + 1, 3);
            newDepartment[CONFIG.COLUMNS.DEPARTMENT_ID] = retryId;
            newDepartment['department_id'] = retryId;
            Logger.log("DepartmentService 23505 collision detected. Retrying with fresh ID: " + retryId);
          } else {
            throw insertErr;
          }
        }
      }

      if (!inserted) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_CREATE_FAILED
        );
      }

      // Automatically create HOD user account in users table if HOD details are provided
      var hodEmail = departmentData['HOD Email'] || departmentData.hod_email || '';
      var hodEmpId = departmentData['HOD Emp ID'] || departmentData.hod_emp_id || '';
      var hodName = departmentData['HOD Name'] || departmentData.hod_name || '';
      var hodSuccessMsg = "";
      var emailSent = false;

      if (hodEmail && hodEmpId) {
        try {
          // Check if user already exists (active or soft-deleted) using unfiltered query
          var allUsersForHod = DatabaseService.readAllRowsIncludingDeleted(CONFIG.SHEETS.USERS) || [];
          var empIdColHod = CONFIG.COLUMNS.USER_EMPLOYEE_ID || 'Employee ID';
          var existingHodCheck = allUsersForHod.find(function (u) {
            var eid = String(u[empIdColHod] || u['Employee ID'] || u.employee_id || '').trim().toUpperCase();
            return eid === String(hodEmpId).trim().toUpperCase();
          });

          if (existingHodCheck) {
            var isHodDeleted = existingHodCheck[CONFIG.COLUMNS.DELETION_FLAG] === true || existingHodCheck[CONFIG.COLUMNS.DELETION_FLAG] === 'true' || existingHodCheck.deletion_flag === true || existingHodCheck.deletion_flag === 'true';
            if (isHodDeleted) {
              var hodUserId = existingHodCheck[CONFIG.COLUMNS.USER_ID] || existingHodCheck.user_id;
              DatabaseService.updateRow(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_ID, hodUserId, {
                [CONFIG.COLUMNS.DELETION_FLAG]: false,
                [CONFIG.COLUMNS.STATUS]: 'Active',
                [CONFIG.COLUMNS.UPDATED_AT]: Utils.getCurrentTimestamp()
              });
              hodSuccessMsg = " HOD User Account (" + hodEmpId + ") reactivated.";
            } else {
              hodSuccessMsg = " HOD User Account (" + hodEmpId + ") already exists.";
            }
          } else {
            // Create new HOD User Account
            var nameParts = hodName.trim().split(" ");
            var firstName = nameParts[0] || hodName;
            var lastName = nameParts.slice(1).join(" ") || "";
            var initialPassword = "BVC@" + String(hodEmpId).toUpperCase();

            var hodUserData = {
              username: String(hodEmpId).toLowerCase(),
              password: initialPassword,
              email_address: hodEmail,
              first_name: firstName,
              last_name: lastName,
              employee_id: hodEmpId,
              role: "HOD",
              department: deptCode,
              title_designation: "Head of Department (" + deptCode + ")",
              status: "Active"
            };

            var adminContext = (createdBy && typeof createdBy === 'object') ? createdBy : { isSuperAdmin: true, role: 'Super Admin', username: 'SuperAdmin' };
            var hodCreateResult = UserService.createUser(hodUserData, adminContext);
            Logger.log("HOD User createUser result: " + JSON.stringify(hodCreateResult));

            if (hodCreateResult && hodCreateResult.success) {
              hodSuccessMsg = " HOD User Account (" + hodEmpId + ") created with password: " + initialPassword + ".";

              // Send email notification
              try {
                var emailSubject = "BVC Attendance Portal - HOD Account Credentials";
                var emailBody = "Dear " + hodName + ",\n\n" +
                  "Your HOD Account for the " + deptName + " (" + deptCode + ") has been created successfully on the BVC Event Attendance Portal.\n\n" +
                  "LOGIN CREDENTIALS:\n" +
                  "Username / Employee ID: " + hodEmpId + "\n" +
                  "Temporary Password: " + initialPassword + "\n\n" +
                  "Please log in and update your password upon first sign-in.\n\n" +
                  "Regards,\nBVC System Administration";

                if (typeof MailApp !== 'undefined' && MailApp.sendEmail) {
                  MailApp.sendEmail(hodEmail, emailSubject, emailBody);
                  emailSent = true;
                } else if (typeof GmailApp !== 'undefined' && GmailApp.sendEmail) {
                  GmailApp.sendEmail(hodEmail, emailSubject, emailBody);
                  emailSent = true;
                }
              } catch (eMailErr) {
                Logger.log("Failed to send HOD credentials email: " + (eMailErr.message || eMailErr));
              }
              if (emailSent) hodSuccessMsg += " Login credentials emailed to " + hodEmail + ".";
            } else {
              hodSuccessMsg = " HOD User creation note: " + (hodCreateResult && hodCreateResult.message ? hodCreateResult.message : "Unknown error");
              Logger.log("HOD User creation failed: " + JSON.stringify(hodCreateResult));
            }
          }
        } catch (userCreateErr) {
          hodSuccessMsg = " HOD User creation error: " + (userCreateErr.message || userCreateErr);
          Logger.log("HOD User Auto-Creation error: " + userCreateErr.message);
        }
      }

      // Audit Log
      try {
        AuditService.logAction(
          newDepartment[CONFIG.COLUMNS.DEPARTMENT_ID],
          "DepartmentService",
          "CREATE_DEPARTMENT",
          newDepartment[CONFIG.COLUMNS.DEPARTMENT_ID],
          "Department",
          "Department created with HOD: " + hodName,
          "",
          "SUCCESS",
          createdBy || ""
        );
      } catch (auditError) {
        Logger.log(auditError);
      }

      var successMsg = "Department created successfully!" + hodSuccessMsg;

      var responseDept = (inserted && typeof inserted === 'object' && !Array.isArray(inserted)) ? inserted : (Array.isArray(inserted) && inserted.length > 0 ? inserted[0] : newDepartment);
      return Utils.buildResponse(
        true,
        successMsg,
        {
          department: Utils.sanitizeDepartment(responseDept)
        }
      );

    } catch (error) {

      Logger.log(
        "DepartmentService.createDepartment error: " +
        (error && error.message ? error.message : error)
      );

      var errMsg = (error && error.message) ? error.message : String(error);
      return Utils.buildResponse(
        false,
        "Failed to create department: " + errMsg
      );
    }
  },

  getDepartmentById: function (departmentId) {
    Logger.log("[DEBUG] Searching Department ID = " + departmentId);

    var dept = DatabaseService.findOne(
      CONFIG.SHEETS.DEPARTMENTS,
      CONFIG.COLUMNS.DEPARTMENT_ID,
      departmentId
    );

    Logger.log("[DEBUG] Result = " + JSON.stringify(dept));
    Logger.log(
      "[DEBUG] Searching Department ID = " + departmentId
    );

    Logger.log(
      "[DEBUG] Column = " + CONFIG.COLUMNS.DEPARTMENT_ID
    );
    try {

      if (!departmentId) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
        );
      }

      var dept = this._getDepartmentByIdRecord
        ? this._getDepartmentByIdRecord(departmentId)
        : DatabaseService.findOne(
          CONFIG.SHEETS.DEPARTMENTS,
          CONFIG.COLUMNS.DEPARTMENT_ID,
          departmentId
        );

      if (!dept) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
        );
      }

      return Utils.buildResponse(
        true,
        "Department found.",
        {
          department: Utils.sanitizeDepartment(dept)
        }
      );

    } catch (error) {

      Logger.log(
        "DepartmentService.getDepartmentById error: " +
        (error && error.message ? error.message : error)
      );

      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
      );
    }
  },

  getDepartmentByName: function (departmentName) {
    try {

      if (!departmentName || String(departmentName).trim() === "") {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
        );
      }

      var dept = DatabaseService.findOne(
        CONFIG.SHEETS.DEPARTMENTS,
        CONFIG.COLUMNS.DEPARTMENT_NAME,
        departmentName
      );

      if (!dept) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
        );
      }

      return Utils.buildResponse(
        true,
        "Department found.",
        {
          department: Utils.sanitizeDepartment(dept)
        }
      );

    } catch (error) {

      Logger.log(
        "DepartmentService.getDepartmentByName error: " +
        (error && error.message ? error.message : error)
      );

      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
      );
    }
  },

  getAllDepartments: function () {
    try {

      var departments = this._getDepartments() || [];

      var sanitizedDepartments = departments.map(function (dept) {
        return Utils.sanitizeDepartment(dept);
      });

      return Utils.buildResponse(
        true,
        "Departments retrieved successfully.",
        {
          departments: sanitizedDepartments,
          totalRecords: sanitizedDepartments.length
        }
      );

    } catch (error) {

      Logger.log(
        "DepartmentService.getAllDepartments error: " +
        (error && error.message ? error.message : error)
      );

      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.ERROR_DEFAULT || "Failed to retrieve departments."
      );
    }
  },

  getActiveDepartments: function () {
    try {
      return this._getDepartments()
        .filter(dept => dept[CONFIG.COLUMNS.STATUS] === CONFIG.DEPARTMENT_STATUS.ACTIVE)
        .map(dept => Utils.sanitizeDepartment(dept));
    } catch (error) {
      Logger.log("DepartmentService.getActiveDepartments error: " + error.message);
      return [];
    }
  },

  updateDepartment: function (departmentId, updateData, updatedBy) {
    try {

      // Validate input
      if (!departmentId) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
        );
      }

      if (!updateData) {
        return Utils.buildResponse(
          false,
          "No department data to update."
        );
      }

      // Check department exists
      if (!this._departmentExists(departmentId)) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
        );
      }

      // Check duplicate Department Name
      if (
        updateData[CONFIG.COLUMNS.DEPARTMENT_NAME] &&
        !this._isDepartmentNameAvailable(
          updateData[CONFIG.COLUMNS.DEPARTMENT_NAME],
          departmentId
        )
      ) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_NAME_EXISTS
        );
      }

      // Check duplicate Department Code
      if (
        updateData[CONFIG.COLUMNS.DEPARTMENT_CODE] &&
        !this._isDepartmentCodeAvailable(
          updateData[CONFIG.COLUMNS.DEPARTMENT_CODE],
          departmentId
        )
      ) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_CODE_EXISTS
        );
      }

      // Protect fields
      delete updateData[CONFIG.COLUMNS.DEPARTMENT_ID];
      delete updateData[CONFIG.COLUMNS.CREATED_BY];
      delete updateData[CONFIG.COLUMNS.CREATED_AT];
      delete updateData[CONFIG.COLUMNS.DELETION_FLAG];

      // Nothing to update?
      if (Object.keys(updateData).length === 0) {
        return Utils.buildResponse(
          false,
          "No department data to update."
        );
      }

      // Audit fields
      updateData[CONFIG.COLUMNS.UPDATED_BY] = updatedBy || "";
      updateData[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();

      // Update
      var updated = DatabaseService.updateRow(
        CONFIG.SHEETS.DEPARTMENTS,
        CONFIG.COLUMNS.DEPARTMENT_ID,
        departmentId,
        updateData
      );

      if (!updated) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_UPDATE_FAILED
        );
      }

      // Audit Log
      try {
        AuditService.logAction(
          departmentId,
          "DepartmentService",
          "UPDATE_DEPARTMENT",
          departmentId,
          "Department",
          "Department updated",
          "",
          "SUCCESS",
          updatedBy || ""
        );
      } catch (auditError) {
        Logger.log(auditError);
      }

      return Utils.buildResponse(
        true,
        CONFIG.MESSAGES.DEPARTMENT_UPDATED,
        {
          department: Utils.sanitizeDepartment(
            updated === true ? updateData : updated
          )
        }
      );

    } catch (error) {

      Logger.log(
        "DepartmentService.updateDepartment error: " +
        (error && error.message ? error.message : error)
      );

      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_UPDATE_FAILED
      );
    }
  },
  deleteDepartment: function (departmentId, updatedBy) {
    try {

      // Validate Department ID
      if (!departmentId) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
        );
      }

      // Check Department Exists
      if (!this._departmentExists(departmentId)) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
        );
      }

      // Check if Department is in use
      if (this.departmentInUse(departmentId)) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_IN_USE || "Department is in use."
        );
      }

      // Soft Delete
      var deleted = DatabaseService.deleteRow(
        CONFIG.SHEETS.DEPARTMENTS,
        CONFIG.COLUMNS.DEPARTMENT_ID,
        departmentId
      );

      if (!deleted) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_DELETE_FAILED
        );
      }

      // Update audit fields
      try {
        var updateData = {};

        updateData[CONFIG.COLUMNS.UPDATED_BY] = updatedBy || "";
        updateData[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();

        DatabaseService.updateRow(
          CONFIG.SHEETS.DEPARTMENTS,
          CONFIG.COLUMNS.DEPARTMENT_ID,
          departmentId,
          updateData
        );
      } catch (metaError) {
        Logger.log(
          "Metadata update failed: " +
          (metaError && metaError.message
            ? metaError.message
            : metaError)
        );
      }

      // Audit Log
      try {
        AuditService.logAction(
          departmentId,
          "DepartmentService",
          "DELETE_DEPARTMENT",
          departmentId,
          "Department",
          "Department deleted",
          "",
          "SUCCESS",
          updatedBy || ""
        );
      } catch (auditError) {
        Logger.log(auditError);
      }

      return Utils.buildResponse(
        true,
        CONFIG.MESSAGES.DEPARTMENT_DELETED
      );

    } catch (error) {

      Logger.log(
        "DepartmentService.deleteDepartment error: " +
        (error && error.message ? error.message : error)
      );

      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_DELETE_FAILED
      );
    }
  },

  activateDepartment: function (departmentId, updatedBy) {
    try {

      if (!departmentId) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
        );
      }

      if (!this._departmentExists(departmentId)) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
        );
      }

      var dept = this._getDepartmentByIdRecord
        ? this._getDepartmentByIdRecord(departmentId)
        : DatabaseService.findOne(
          CONFIG.SHEETS.DEPARTMENTS,
          CONFIG.COLUMNS.DEPARTMENT_ID,
          departmentId
        );

      if (!dept) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
        );
      }

      if (dept[CONFIG.COLUMNS.STATUS] === CONFIG.DEPARTMENT_STATUS.ACTIVE) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_ALREADY_ACTIVE || "Department is already active."
        );
      }

      var updateData = {};

      updateData[CONFIG.COLUMNS.STATUS] = CONFIG.DEPARTMENT_STATUS.ACTIVE;
      updateData[CONFIG.COLUMNS.UPDATED_BY] = updatedBy || "";
      updateData[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();

      var updated = DatabaseService.updateRow(
        CONFIG.SHEETS.DEPARTMENTS,
        CONFIG.COLUMNS.DEPARTMENT_ID,
        departmentId,
        updateData
      );

      if (!updated) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_ACTIVATE_FAILED
        );
      }

      // Audit Log
      try {
        AuditService.logAction(
          departmentId,
          "DepartmentService",
          "ACTIVATE_DEPARTMENT",
          departmentId,
          "Department",
          "Department activated",
          "",
          "SUCCESS",
          updatedBy || ""
        );
      } catch (auditError) {
        Logger.log(auditError);
      }

      return Utils.buildResponse(
        true,
        CONFIG.MESSAGES.DEPARTMENT_ACTIVATED,
        {
          department: Utils.sanitizeDepartment(
            updated === true ? updateData : updated
          )
        }
      );

    } catch (error) {

      Logger.log(
        "DepartmentService.activateDepartment error: " +
        (error && error.message ? error.message : error)
      );

      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_ACTIVATE_FAILED
      );
    }
  },

  deactivateDepartment: function (departmentId, updatedBy) {
    try {

      if (!departmentId) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
        );
      }

      if (!this._departmentExists(departmentId)) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
        );
      }

      var dept = this._getDepartmentByIdRecord
        ? this._getDepartmentByIdRecord(departmentId)
        : DatabaseService.findOne(
          CONFIG.SHEETS.DEPARTMENTS,
          CONFIG.COLUMNS.DEPARTMENT_ID,
          departmentId
        );

      if (!dept) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
        );
      }

      if (dept[CONFIG.COLUMNS.STATUS] === CONFIG.DEPARTMENT_STATUS.INACTIVE) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_ALREADY_INACTIVE ||
          "Department is already inactive."
        );
      }

      var updateData = {};

      updateData[CONFIG.COLUMNS.STATUS] = CONFIG.DEPARTMENT_STATUS.INACTIVE;
      updateData[CONFIG.COLUMNS.UPDATED_BY] = updatedBy || "";
      updateData[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();

      var updated = DatabaseService.updateRow(
        CONFIG.SHEETS.DEPARTMENTS,
        CONFIG.COLUMNS.DEPARTMENT_ID,
        departmentId,
        updateData
      );

      if (!updated) {
        return Utils.buildResponse(
          false,
          CONFIG.MESSAGES.DEPARTMENT_DEACTIVATE_FAILED
        );
      }

      // Audit Log
      try {
        AuditService.logAction(
          departmentId,
          "DepartmentService",
          "DEACTIVATE_DEPARTMENT",
          departmentId,
          "Department",
          "Department deactivated",
          "",
          "SUCCESS",
          updatedBy || ""
        );
      } catch (auditError) {
        Logger.log(auditError);
      }

      return Utils.buildResponse(
        true,
        CONFIG.MESSAGES.DEPARTMENT_DEACTIVATED,
        {
          department: Utils.sanitizeDepartment(
            updated === true ? updateData : updated
          )
        }
      );

    } catch (error) {

      Logger.log(
        "DepartmentService.deactivateDepartment error: " +
        (error && error.message ? error.message : error)
      );

      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_DEACTIVATE_FAILED
      );
    }
  },
  sortDepartments: function (sortBy, order) {
    try {

      var allowedFields = [
        CONFIG.COLUMNS.DEPARTMENT_NAME,
        CONFIG.COLUMNS.DEPARTMENT_CODE,
        CONFIG.COLUMNS.STATUS,
        CONFIG.COLUMNS.CREATED_AT,
        CONFIG.COLUMNS.UPDATED_AT
      ];

      if (allowedFields.indexOf(sortBy) === -1) {
        return Utils.buildResponse(
          false,
          "Invalid sort column."
        );
      }

      order = (String(order).toLowerCase() === "desc") ? "desc" : "asc";

      var records = this._getDepartments() || [];

      records.sort(function (a, b) {

        var valA = a[sortBy] || "";
        var valB = b[sortBy] || "";

        if (typeof valA === "string") {
          valA = valA.toLowerCase();
        }

        if (typeof valB === "string") {
          valB = valB.toLowerCase();
        }

        if (valA < valB) {
          return order === "asc" ? -1 : 1;
        }

        if (valA > valB) {
          return order === "asc" ? 1 : -1;
        }

        return 0;

      });

      var departments = records.map(function (dept) {
        return Utils.sanitizeDepartment(dept);
      });

      return Utils.buildResponse(
        true,
        "Departments sorted successfully.",
        {
          departments: departments,
          totalRecords: departments.length,
          sortBy: sortBy,
          order: order
        }
      );

    } catch (error) {

      Logger.log(
        "DepartmentService.sortDepartments error: " +
        (error && error.message ? error.message : error)
      );

      return Utils.buildResponse(
        false,
        "Department sorting failed."
      );
    }
  },
  paginateDepartments: function (page, pageSize) {
    try {

      page = parseInt(page, 10);
      pageSize = parseInt(pageSize, 10);

      if (isNaN(page)) {
        page = 1;
      }

      if (isNaN(pageSize)) {
        pageSize = 10;
      }

      if (page < 1 || pageSize < 1) {
        return Utils.buildResponse(
          false,
          "Invalid page or page size."
        );
      }

      var records = this._getDepartments() || [];

      var totalRecords = records.length;
      var totalPages = Math.ceil(totalRecords / pageSize);

      var startIndex = (page - 1) * pageSize;

      var items = records.slice(
        startIndex,
        startIndex + pageSize
      ).map(function (dept) {
        return Utils.sanitizeDepartment(dept);
      });

      return Utils.buildResponse(
        true,
        "Departments retrieved successfully.",
        {
          totalRecords: totalRecords,
          currentPage: page,
          totalPages: totalPages,
          pageSize: pageSize,
          items: items
        }
      );

    } catch (error) {

      Logger.log(
        "DepartmentService.paginateDepartments error: " +
        (error && error.message ? error.message : error)
      );

      return Utils.buildResponse(
        false,
        "Pagination failed."
      );
    }
  },

  countUsers: function (departmentId) {
    try {
      const users = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.DEPARTMENT, departmentId)
        .filter(u => u[CONFIG.COLUMNS.STATUS] === CONFIG.USER_STATUS.ACTIVE && !u[CONFIG.COLUMNS.DELETION_FLAG]);
      return users.length;
    } catch (error) {
      Logger.log("DepartmentService.countUsers error: " + error.message);
      return 0;
    }
  },

  countStudents: function (departmentId) {
    try {
      const students = DatabaseService.findByColumn(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.DEPARTMENT, departmentId)
        .filter(s => s[CONFIG.COLUMNS.STATUS] === CONFIG.STUDENT_STATUS.ACTIVE && !s[CONFIG.COLUMNS.DELETION_FLAG]);
      return students.length;
    } catch (error) {
      Logger.log("DepartmentService.countStudents error: " + error.message);
      return 0;
    }
  },

  countEvents: function (departmentId) {
    try {
      const events = DatabaseService.findByColumn(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.DEPARTMENT, departmentId)
        .filter(e => e[CONFIG.COLUMNS.STATUS] === CONFIG.EVENT_STATUS.ACTIVE && !e[CONFIG.COLUMNS.DELETION_FLAG]);
      return events.length;
    } catch (error) {
      Logger.log("DepartmentService.countEvents error: " + error.message);
      return 0;
    }
  },

  getDepartmentSummary: function (departmentId) {
    try {
      const dept = this.getDepartmentById(departmentId);
      if (!dept) {
        return null;
      }
      return {
        department: dept,
        userCount: this.countUsers(departmentId),
        studentCount: this.countStudents(departmentId),
        eventCount: this.countEvents(departmentId)
      };
    } catch (error) {
      Logger.log("DepartmentService.getDepartmentSummary error: " + error.message);
      return null;
    }
  }
};
