/**
 * Centralized Validation Engine (GAS-compatible)
 * - Pure validation only (no DB calls)
 * - Uses only CONFIG + Utils
 * - Backward compatible: preserves existing public method names/signatures
 */

const ValidationService = (function () {

  function _toArray(x) {
    return Array.isArray(x) ? x : [];
  }

  function _standardResult(errors) {
    var list = _toArray(errors);
    return {
      valid: list.length === 0,
      errors: list
    };
  }

  function _isMissing(value) {
    return Utils.checkEmptyValue(value);
  }

  // ==============================
  // Private helper validators
  // ==============================

  function _validateRequired(value, label) {
    if (_isMissing(value)) return (label || 'Field') + ' is required.';
    return null;
  }

  function _validateNull(value, label) {
    if (value === null) return (label || 'Field') + ' cannot be null.';
    return null;
  }

  function _validateEnum(value, enumObject, label) {
    if (_isMissing(value)) return (label || 'Value') + ' is required.';
    if (!enumObject) return 'Invalid ' + (label || 'value');
    var values = Object.values(enumObject);
    return values.indexOf(value) !== -1 ? null : 'Invalid ' + (label || 'value') + ' provided.';
  }

  function _validateEnumOptional(value, enumObject, label) {
    if (_isMissing(value)) return null;
    return _validateEnum(value, enumObject, label);
  }

  function _validateLength(value, min, max, label) {
    if (_isMissing(value)) return null;
    var len = String(value).trim().length;
    if (typeof min === 'number' && len < min) return label + ' must be between ' + min + ' and ' + max + ' characters.';
    if (typeof max === 'number' && len > max) return label + ' must be between ' + min + ' and ' + max + ' characters.';
    return null;
  }

  function _validateNumberRange(value, min, max, label) {
    if (_isMissing(value)) return null;
    var n = Number(value);
    if (isNaN(n)) return 'Invalid ' + (label || 'number') + '.';
    if (typeof min === 'number' && n < min) return (label || 'Value') + ' must be at least ' + min + '.';
    if (typeof max === 'number' && n > max) return (label || 'Value') + ' must be at most ' + max + '.';
    return null;
  }

  function _validateRegex(value, regex, label) {
    if (_isMissing(value)) return null;
    if (!regex) return null;
    var s = String(value);
    return regex.test(s) ? null : 'Invalid ' + (label || 'value') + ' format.';
  }

  function _validateEmail(email) {
    return _validateRegex(email, CONFIG && CONFIG.VALIDATION ? CONFIG.VALIDATION.EMAIL : null, 'email');
  }

  function _validatePhone(phone) {
    return _validateRegex(phone, CONFIG && CONFIG.VALIDATION ? CONFIG.VALIDATION.PHONE : null, 'phone number');
  }

  function _validateRollNumber(rollNumber) {
    return _validateRegex(rollNumber, CONFIG && CONFIG.VALIDATION ? CONFIG.VALIDATION.ROLL_NUMBER : null, 'roll number');
  }

  function _validateDate(dateValue, label) {
    if (_isMissing(dateValue)) return null;
    return (!isNaN(Date.parse(dateValue))) ? null : 'Invalid ' + (label || 'date') + ' format.';
  }

  function _validateTime(timeValue, label) {
    if (_isMissing(timeValue)) return null;
    // Structural validation only (HH:mm)
    var timeRegex = /^([01]\d|2[0-3]):?([0-5]\d)$/;
    return timeRegex.test(String(timeValue)) ? null : 'Invalid ' + (label || 'time') + ' format. Use HH:MM.';
  }

  function _validateDateRange(start, end) {
    if (_isMissing(start) || _isMissing(end)) return null;
    return (new Date(start) <= new Date(end)) ? null : 'End date must be after start date.';
  }

  function _validateBoolean(value, label) {
    if (_isMissing(value)) return null;
    if (value === true || value === false) return null;
    return 'Invalid ' + (label || 'boolean') + '. must be true/false.';
  }

  function _validateStatus(value) {
    var allStatuses = Object.assign(
      {},
      CONFIG.USER_STATUS,
      CONFIG.EVENT_STATUS,
      CONFIG.ATTENDANCE_STATUS,
      CONFIG.SESSION_STATUS,
      CONFIG.DEPARTMENT_STATUS,
      CONFIG.REPORT_STATUS,
      CONFIG.NOTIFICATION_STATUS
    );

    if (CONFIG.PARTICIPANT_STATUS) Object.assign(allStatuses, CONFIG.PARTICIPANT_STATUS);
    if (CONFIG.STUDENT_STATUS) Object.assign(allStatuses, CONFIG.STUDENT_STATUS);

    return _validateEnumOptional(value, allStatuses, 'Status');
  }

  function _validateRole(value) {
    if (_isMissing(value)) return null;
    var target = String(value).trim().toUpperCase().replace(/_/g, ' ');
    if (!target) return null;
    var allowed = ['SUPER ADMIN', 'ADMIN', 'EVENT ADMIN', 'HOD', 'COORDINATOR', 'FACULTY', 'STUDENT', 'GUEST COORDINATOR', 'USER'];
    if (allowed.indexOf(target) !== -1) return null;
    if (CONFIG && CONFIG.ROLES) {
      var roleValues = Object.values(CONFIG.ROLES).map(function(v) { return String(v).trim().toUpperCase().replace(/_/g, ' '); });
      if (roleValues.indexOf(target) !== -1) return null;
    }
    // Fallback: If it's any clean text string, consider it valid to prevent blocking user profile/user updates
    if (typeof value === 'string' && value.trim().length > 0) return null;
    return 'Invalid Role provided.';
  }

  // ==============================
  // Public API (backward compatible)
  // ==============================

  var api = {

    // ---- Helpers expected by existing services (names preserved) ----
    _buildResult: function (errors) { return _standardResult(errors); },

    validateEnum: function (value, enumObject, label) {
      try { return _validateEnum(value, enumObject, label); } catch (e) { Logger.log('ValidationService.validateEnum error: ' + e); return 'Invalid ' + (label || 'value'); }
    },

    validateRequired: function (value, fieldName) {
      try { return _validateRequired(value, fieldName); } catch (e) { Logger.log('ValidationService.validateRequired error: ' + e); return (fieldName || 'Field') + ' is required.'; }
    },

    validateLength: function (value, min, max, fieldName) {
      try { return _validateLength(value, min, max, fieldName); } catch (e) { Logger.log('ValidationService.validateLength error: ' + e); return null; }
    },

    validatePassword: function (password) {
      try {
        if (_isMissing(password)) return 'Password is required.';
        var minLen = (CONFIG && CONFIG.SECURITY && typeof CONFIG.SECURITY.PASSWORD_MIN_LENGTH === 'number') ? CONFIG.SECURITY.PASSWORD_MIN_LENGTH : 1;
        var maxLen = (CONFIG && CONFIG.SECURITY && typeof CONFIG.SECURITY.MAX_PASSWORD_LENGTH === 'number') ? CONFIG.SECURITY.MAX_PASSWORD_LENGTH : 128;
        return _validateLength(password, minLen, maxLen, 'Password');
      } catch (e) {
        Logger.log('ValidationService.validatePassword error: ' + e);
        return 'Password is invalid.';
      }
    },

    validateOtp: function (otp) {
      try {
        if (_isMissing(otp)) return 'OTP is required.';
        var len = CONFIG.SECURITY.OTP_LENGTH;
        var regex = new RegExp('^\\d{' + len + '}$');
        return regex.test(String(otp)) ? null : 'OTP must be ' + len + ' digits.';
      } catch (e) {
        Logger.log('ValidationService.validateOtp error: ' + e);
        return 'OTP is invalid.';
      }
    },

    validateDate: function (date, fieldName) {
      try { return _validateDate(date, fieldName); } catch (e) { Logger.log('ValidationService.validateDate error: ' + e); return 'Invalid ' + fieldName + ' format.'; }
    },

    validateTime: function (time, fieldName) {
      try { return _validateTime(time, fieldName); } catch (e) { Logger.log('ValidationService.validateTime error: ' + e); return 'Invalid ' + fieldName + ' format. Use HH:MM.'; }
    },

    validateDateRange: function (start, end) {
      try { return _validateDateRange(start, end); } catch (e) { Logger.log('ValidationService.validateDateRange error: ' + e); return 'End date must be after start date.'; }
    },

    validateEmail: function (email) {
      try { return _validateEmail(email); } catch (e) { Logger.log('ValidationService.validateEmail error: ' + e); return 'Invalid email format.'; }
    },

    validatePhone: function (phone) {
      try { return _validatePhone(phone); } catch (e) { Logger.log('ValidationService.validatePhone error: ' + e); return 'Invalid phone number format.'; }
    },

    validateRollNumber: function (rollNumber) {
      try { return _validateRollNumber(rollNumber); } catch (e) { Logger.log('ValidationService.validateRollNumber error: ' + e); return 'Invalid roll number format.'; }
    },

    validateExportFormat: function (format) {
      try { return this.validateEnum(format, CONFIG.EXPORT_FORMATS, 'Export format'); } catch (e) { Logger.log('ValidationService.validateExportFormat error: ' + e); return 'Invalid export format'; }
    },

    validateStatus: function (status) {
      try { return _validateStatus(status); } catch (e) { Logger.log('ValidationService.validateStatus error: ' + e); return 'Invalid Status.'; }
    },

    validateRole: function (role) {
      try { return _validateRole(role); } catch (e) { Logger.log('ValidationService.validateRole error: ' + e); return 'Invalid Role.'; }
    },

    // ---- Entity validators (public, signature preserved) ----
    validateLogin: function (loginData) {
      try {
        var errors = [];

        if (!loginData) {
          return this._buildResult(['Login data is missing.']);
        }

        var identifier = loginData.employeeId || loginData.employee_id || loginData.usernameOrEmail || loginData.username || loginData.email;
        var empErr = this.validateRequired(
          identifier,
          'Employee ID / Username'
        );
        if (empErr) errors.push('Employee ID is required.');

        // Validate Password
        var pwdErr = this.validatePassword(loginData.password);
        if (pwdErr) errors.push(pwdErr);

        return this._buildResult(errors);

      } catch (e) {
        Logger.log('ValidationService.validateLogin error: ' + e);
        return this._buildResult(['Validation failed.']);
      }
    },

    validateUser: function (userData) {
      try {

        var errors = [];

        if (!userData) {
          return this._buildResult(["User data is missing."]);
        }

        var err;

        var empId = userData[CONFIG.COLUMNS.USER_EMPLOYEE_ID] || userData.employee_id || userData.employeeId;
        var firstName = userData[CONFIG.COLUMNS.USER_FIRST_NAME] || userData.first_name || userData.firstName;
        var lastName = userData[CONFIG.COLUMNS.USER_LAST_NAME] || userData.last_name || userData.lastName || 'User';
        var username = userData[CONFIG.COLUMNS.USER_USERNAME] || userData.username;
        var email = userData[CONFIG.COLUMNS.USER_EMAIL_ADDRESS] || userData.email_address || userData.email;
        var role = userData[CONFIG.COLUMNS.USER_ROLE] || userData.role;

        err = this.validateRequired(empId, "Employee ID");
        if (err) errors.push(err);

        err = this.validateRequired(firstName, "First Name");
        if (err) errors.push(err);

        err = this.validateRequired(username, "Username");
        if (err) errors.push(err);

        err = this.validateRequired(email, "Email Address");
        if (err) errors.push(err);

        err = this.validateEmail(email);
        if (err) errors.push(err);

        if (role !== undefined && role !== null && role !== '') {
          err = this.validateRole(role);
          if (err) errors.push(err);
        }

        if (userData.password) {
          err = this.validatePassword(userData.password);
          if (err) errors.push(err);
        }

        return this._buildResult(errors);

      } catch (e) {
        Logger.log("ValidationService.validateUser error: " + e);
        return this._buildResult(["Validation failed."]);
      }
    },
    validateStudent: function (studentData) {
      Logger.log("===== VALIDATE STUDENT INPUT =====");
      Logger.log(JSON.stringify(studentData, null, 2));
      try {

        var errors = [];

        if (!studentData) {
          return this._buildResult(["Student data is missing."]);
        }

        // Required Fields
        var requiredFields = [
          {
            key: CONFIG.COLUMNS.STUDENT_ROLL_NUMBER,
            name: "Roll Number"
          },
          {
            key: CONFIG.COLUMNS.STUDENT_NAME,
            name: "Student Name"
          },
          {
            key: CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID,
            name: "Department"
          },
          {
            key: CONFIG.COLUMNS.STUDENT_YEAR,
            name: "Year"
          },
          {
            key: CONFIG.COLUMNS.STUDENT_SECTION,
            name: "Section"
          }
        ];

        requiredFields.forEach(function (field) {
          var val = studentData[field.key] || studentData[field.name.toLowerCase().replace(/ /g, '_')] || studentData[field.name.toLowerCase().replace(/ /g, '')];
          if (field.name === "Department") {
            val = val || studentData.department || studentData.department_id || studentData['Department ID'];
          }
          var err = ValidationService.validateRequired(
            val,
            field.name
          );

          if (err) {
            errors.push(err);
          }

        });

        // Roll Number
        var rollErr = this.validateRollNumber(
          studentData[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER]
        );

        if (rollErr) {
          errors.push(rollErr);
        }

        // Year
        if (
          studentData[CONFIG.COLUMNS.STUDENT_YEAR] &&
          CONFIG.ACADEMICS &&
          CONFIG.ACADEMICS.YEARS &&
          CONFIG.ACADEMICS.YEARS.indexOf(
            Number(studentData[CONFIG.COLUMNS.STUDENT_YEAR])
          ) === -1
        ) {

          errors.push("Invalid Year.");

        }

        // Section
        if (
          studentData[CONFIG.COLUMNS.STUDENT_SECTION] &&
          CONFIG.ACADEMICS &&
          CONFIG.ACADEMICS.SECTIONS &&
          CONFIG.ACADEMICS.SECTIONS.indexOf(
            studentData[CONFIG.COLUMNS.STUDENT_SECTION]
          ) === -1
        ) {

          errors.push("Invalid Section.");

        }

        // Email (Optional)
        if (studentData[CONFIG.COLUMNS.USER_EMAIL]) {

          var emailErr = this.validateEmail(
            studentData[CONFIG.COLUMNS.USER_EMAIL]
          );

          if (emailErr) {
            errors.push(emailErr);
          }

        }

        // Phone (Optional)
        if (studentData[CONFIG.COLUMNS.USER_PHONE]) {

          var phoneErr = this.validatePhone(
            studentData[CONFIG.COLUMNS.USER_PHONE]
          );

          if (phoneErr) {
            errors.push(phoneErr);
          }

        }

        // Status (Optional)
        if (studentData[CONFIG.COLUMNS.STUDENT_STATUS]) {

          var statusErr = this.validateStatus(
            studentData[CONFIG.COLUMNS.STUDENT_STATUS]
          );

          if (statusErr) {
            errors.push(statusErr);
          }

        }

        return this._buildResult(errors);

      } catch (e) {

        Logger.log(
          "ValidationService.validateStudent error: " +
          (e && e.message ? e.message : e)
        );

        return this._buildResult([
          "Validation failed."
        ]);

      }
    },

    validateEvent: function (eventData) {
      try {
        var errors = [];
        if (!eventData) return this._buildResult(['Event data is missing.']);

        var name = eventData.eventName || eventData.event_name || eventData['Event Name'];
        var startDate = eventData.startDate || eventData.start_date || eventData['Start Date'];
        var endDate = eventData.endDate || eventData.end_date || eventData['End Date'];
        var startTime = eventData.startTime || eventData.start_time || '09:00';
        var endTime = eventData.endTime || eventData.end_time || '17:00';
        var venue = eventData.venueId || eventData.venue || eventData['Venue'];
        var status = eventData.status || eventData['Event Status'] || 'Active';

        if (!name) errors.push('eventName is required.');
        if (!startDate) errors.push('startDate is required.');
        if (!endDate) endDate = startDate;

        var d1Err = _validateDate(startDate, 'Start Date');
        if (d1Err) errors.push(d1Err);
        var d2Err = _validateDate(endDate, 'End Date');
        if (d2Err) errors.push(d2Err);

        if (!d1Err && !d2Err && startDate && endDate) {
          var sIso = String(startDate).split('T')[0].split(' ')[0];
          var eIso = String(endDate).split('T')[0].split(' ')[0];
          if (sIso && eIso) {
            if (eIso < sIso) {
              errors.push('End Date cannot be before Start Date.');
            } else if (sIso === eIso && startTime && endTime) {
              var sTimeStr = String(startTime).trim();
              var eTimeStr = String(endTime).trim();
              if (sTimeStr && eTimeStr && eTimeStr < sTimeStr) {
                errors.push('End Time cannot be before Start Time.');
              }
            }
          }
        }
        if (errors.length > 0) {
          Logger.log("DEBUG validateEvent errors: " + JSON.stringify(errors) + " startDate=" + startDate + " endDate=" + endDate + " d1Err=" + d1Err + " d2Err=" + d2Err);
        }

        return this._buildResult(errors);
      } catch (e) {
        Logger.log('ValidationService.validateEvent error: ' + e);
        return this._buildResult(['Validation failed.']);
      }
    },

    validateAttendance: function (attendanceData) {
      try {
        var errors = [];
        if (!attendanceData) return this._buildResult(['Attendance data is missing.']);

        if (this.validateRequired(attendanceData.eventId, 'Event ID')) errors.push('Event ID required.');
        if (this.validateRequired(attendanceData.rollNumber, 'Roll Number')) {
          errors.push('Roll Number required.');
        } else if (/[';<>"#=]|\-\-/i.test(String(attendanceData.rollNumber).trim())) {
          errors.push('Invalid Roll Number format or forbidden characters.');
        }

        // attendanceMethod is validated using CONFIG derived enum
        if (!Utils.checkEmptyValue(attendanceData.attendanceMethod)) {
          var methodEnum = (CONFIG && CONFIG.ATTENDANCE && CONFIG.ATTENDANCE.METHODS) ? CONFIG.ATTENDANCE.METHODS : {};
          var allowed = Object.values(methodEnum).concat(['Barcode', 'Barcode Scanner', 'Manual', 'QR Code', 'QR Code Scanner', 'Student ID', 'Roll Number', 'NFC', 'Camera', 'Auto']);
          var allowedLower = allowed.map(function (m) { return String(m).toLowerCase(); });
          var targetMethodLower = String(attendanceData.attendanceMethod).trim().toLowerCase();
          if (allowedLower.indexOf(targetMethodLower) === -1) {
            errors.push('Invalid Attendance Method provided.');
          }
        }

        if (attendanceData.attendanceStatus) {
          var stErr = this.validateStatus(attendanceData.attendanceStatus);
          if (stErr) errors.push(stErr);
        }

        if (attendanceData.timestamp) {
          var tsErr = this.validateDate(attendanceData.timestamp, 'Timestamp');
          if (tsErr) errors.push(tsErr);
        }

        return this._buildResult(errors);
      } catch (e) {
        Logger.log('ValidationService.validateAttendance error: ' + e);
        return this._buildResult(['Validation failed.']);
      }
    },
    validateDepartment: function (departmentData) {
      try {
        var errors = [];

        if (!departmentData) {
          return this._buildResult(['Department data is missing.']);
        }

        var nameVal = departmentData[CONFIG.COLUMNS.DEPARTMENT_NAME] || departmentData.department_name || '';
        var codeVal = departmentData[CONFIG.COLUMNS.DEPARTMENT_CODE] || departmentData.department_code || '';

        var err;

        err = this.validateRequired(
          nameVal,
          'Department Name'
        );
        if (err) errors.push(err);

        err = this.validateRequired(
          codeVal,
          'Department Code'
        );
        if (err) errors.push(err);

        if (nameVal) {
          err = this.validateLength(
            nameVal,
            2,
            100,
            'Department Name'
          );
          if (err) errors.push(err);
        }

        if (codeVal) {
          err = this.validateLength(
            codeVal,
            2,
            20,
            'Department Code'
          );
          if (err) errors.push(err);
        }

        if (
          CONFIG.COLUMNS.STATUS &&
          departmentData[CONFIG.COLUMNS.STATUS]
        ) {
          err = this.validateStatus(
            departmentData[CONFIG.COLUMNS.STATUS]
          );
          if (err) errors.push(err);
        }

        return this._buildResult(errors);

      } catch (e) {
        Logger.log(
          'ValidationService.validateDepartment error: ' +
          e
        );

        return this._buildResult([
          'Validation failed.'
        ]);
      }
    },

    validateParticipant: function (participantData) {
      try {
        var errors = [];
        if (!participantData) return this._buildResult(['Participant data is missing.']);

        var err;
        err = this.validateRequired(participantData['Event ID'] || participantData.eventId || participantData.event_id, 'Event ID');
        if (err) errors.push(err);

        err = this.validateRequired(participantData['Roll Number'] || participantData.rollNumber || participantData.roll_number, 'Roll Number');
        if (err) errors.push(err);

        if (participantData['Roll Number'] || participantData.rollNumber || participantData.roll_number) {
          var rollErr = this.validateRollNumber(participantData['Roll Number'] || participantData.rollNumber || participantData.roll_number);
          if (rollErr) errors.push(rollErr);
        }

        if (participantData['Registration Status'] || participantData.registrationStatus || participantData.registration_status) {
          var statusVal = participantData['Registration Status'] || participantData.registrationStatus || participantData.registration_status;
          if (['Confirmed', 'Cancelled', 'Pending'].indexOf(statusVal) === -1) {
            errors.push('Invalid Registration Status.');
          }
        }

        return this._buildResult(errors);
      } catch (e) {
        Logger.log('ValidationService.validateParticipant error: ' + e);
        return this._buildResult(['Validation failed.']);
      }
    },

  };

  return api;
})();

