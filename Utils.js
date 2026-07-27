/**
 * Production Utils Library (GAS-compatible)
 * - Centralized reusable helpers
 * - CONFIG-driven wherever possible
 * - Backward compatible with existing services
 */

const Utils = {
  // ==========================================
  // FORMATTING HELPERS
  // ==========================================

  /**
   * Pads a number with leading zeros.
   * Backward compatible: internal use only.
   */
  _padNumber: function (number, width) {
    try {
      number = number + '';
      return number.length >= width ? number : new Array(width - number.length + 1).join('0') + number;
    } catch (e) {
      Logger.log('Utils._padNumber error: ' + (e && e.message ? e.message : e));
      return String(number);
    }
  },

  // ==========================================
  // DATE & TIME UTILITIES
  // ==========================================

  getCurrentTimestamp: function () {
    try {
      return new Date().getTime();
    } catch (e) {
      Logger.log('Utils.getCurrentTimestamp error: ' + (e && e.message ? e.message : e));
      return 0;
    }
  },

  getCurrentDate: function () {
    try {
      return new Date();
    } catch (e) {
      Logger.log('Utils.getCurrentDate error: ' + (e && e.message ? e.message : e));
      return new Date(0);
    }
  },

  // Backward compatible alias
  getTime: function () {
    return this.getCurrentTimestamp();
  },

  formatDate: function (dateValue) {
    try {
      if (!dateValue) return '';
      const d = new Date(dateValue);
      if (isNaN(d.getTime())) return '';
      return Utilities.formatDate(d, CONFIG.DATE_TIME.TIMEZONE, CONFIG.DATE_TIME.DATE_ONLY);
    } catch (e) {
      Logger.log('Utils.formatDate error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  formatTimestamp: function (dateValue) {
    // Uses existing CONFIG key to preserve behavior
    try {
      if (!dateValue) return '';
      return Utilities.formatDate(new Date(dateValue), CONFIG.DATE_TIME.TIMEZONE, CONFIG.DATE_TIME.FORMAT);
    } catch (e) {
      Logger.log('Utils.formatTimestamp error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  // Backward compatible alias
  formatDateTime: function (dateValue) {
    return this.formatTimestamp(dateValue);
  },

  formatTime: function (dateValue) {
    try {
      return Utilities.formatDate(new Date(dateValue), CONFIG.DATE_TIME.TIMEZONE, CONFIG.DATE_TIME.TIME_ONLY);
    } catch (e) {
      Logger.log('Utils.formatTime error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  parseDate: function (dateValue) {
    try {
      if (!dateValue) return null;
      const d = new Date(dateValue);
      if (isNaN(d.getTime())) return null;
      return d;
    } catch (e) {
      Logger.log('Utils.parseDate error: ' + (e && e.message ? e.message : e));
      return null;
    }
  },

  isValidDate: function (dateValue) {
    try {
      const d = this.parseDate(dateValue);
      return Boolean(d);
    } catch (e) {
      Logger.log('Utils.isValidDate error: ' + (e && e.message ? e.message : e));
      return false;
    }
  },

  addMinutes: function (date, minutes) {
    try {
      return new Date(date.getTime() + minutes * 60000);
    } catch (e) {
      Logger.log('Utils.addMinutes error: ' + (e && e.message ? e.message : e));
      return null;
    }
  },

  addHours: function (date, hours) {
    try {
      return new Date(date.getTime() + hours * 3600000);
    } catch (e) {
      Logger.log('Utils.addHours error: ' + (e && e.message ? e.message : e));
      return null;
    }
  },

  isExpired: function (expiryDate) {
    try {
      return new Date(expiryDate).getTime() < new Date().getTime();
    } catch (e) {
      Logger.log('Utils.isExpired error: ' + (e && e.message ? e.message : e));
      return false;
    }
  },

  checkEmptyValue: function (value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  },

  sleep: function (milliseconds) {
    try {
      Utilities.sleep(milliseconds);
    } catch (e) {
      Logger.log('Utils.sleep error: ' + (e && e.message ? e.message : e));
    }
  },

  // ==========================================
  // STRING UTILITIES
  // ==========================================

  trimText: function (text) {
    try {
      return typeof text === 'string' ? text.trim() : text;
    } catch (e) {
      Logger.log('Utils.trimText error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  capitalizeWords: function (text) {
    try {
      if (typeof text !== 'string') return text;
      return text.replace(/\b\w/g, function (char) {
        return char.toUpperCase();
      });
    } catch (e) {
      Logger.log('Utils.capitalizeWords error: ' + (e && e.message ? e.message : e));
      return text;
    }
  },

  toUpper: function (text) {
    try {
      return typeof text === 'string' ? text.toUpperCase() : text;
    } catch (e) {
      Logger.log('Utils.toUpper error: ' + (e && e.message ? e.message : e));
      return text;
    }
  },

  toLower: function (text) {
    try {
      return typeof text === 'string' ? text.toLowerCase() : text;
    } catch (e) {
      Logger.log('Utils.toLower error: ' + (e && e.message ? e.message : e));
      return text;
    }
  },

  normalizeWhitespace: function (text) {
    try {
      if (typeof text !== 'string') return text;
      return text.replace(/\s+/g, ' ').trim();
    } catch (e) {
      Logger.log('Utils.normalizeWhitespace error: ' + (e && e.message ? e.message : e));
      return text;
    }
  },

  // Backward compatible alias
  sanitizeInput: function (input) {
    try {
      return typeof input === 'string' ? input.trim().replace(/[<>]/g, '') : input;
    } catch (e) {
      Logger.log('Utils.sanitizeInput error: ' + (e && e.message ? e.message : e));
      return input;
    }
  },

  toTitleCase: function (text) {
    try {
      if (typeof text !== 'string') return text;
      return text
        .toLowerCase()
        .replace(/\b[a-z0-9]/g, function (ch) { return ch.toUpperCase(); });
    } catch (e) {
      Logger.log('Utils.toTitleCase error: ' + (e && e.message ? e.message : e));
      return text;
    }
  },

  checkEmptyValue: function (value) {
    return this.isEmpty(value);
  },

  isEmpty: function (value) {
    try {
      if (value === null || value === undefined) return true;
      if (typeof value === 'string' && value.trim() === '') return true;
      return false;
    } catch (e) {
      Logger.log('Utils.isEmpty error: ' + (e && e.message ? e.message : e));
      return true;
    }
  },

  // ==========================================
  // SECURITY UTILITIES
  // ==========================================

  hashString: function (text) {
    try {
      const safeText = (text === undefined || text === null) ? '' : String(text);
      const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, safeText);
      return bytes.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
    } catch (e) {
      Logger.log('Utils.hashString error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  // Not used in current code, but provided for completeness
  generateSalt: function (length) {
    try {
      const l = Number(length) || 16;
      return Utilities.getUuid().replace(/-/g, '').substring(0, l);
    } catch (e) {
      Logger.log('Utils.generateSalt error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  compareHash: function (rawText, expectedHash) {
    try {
      return this.hashString(rawText) === expectedHash;
    } catch (e) {
      Logger.log('Utils.compareHash error: ' + (e && e.message ? e.message : e));
      return false;
    }
  },

  generateRandomPassword: function (prefix) {
    try {
      const p = prefix || 'BVC';
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      return p + '@' + randomNum;
    } catch (e) {
      Logger.log('Utils.generateRandomPassword error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  generateRandomToken: function (length) {
    try {
      const l = Number(length) || 32;
      const buffer = Utilities.newBlob(Utilities.getRandomBlob(l).getBytes()).getDataAsString();
      return Utilities.base64EncodeWebSafe(buffer).substring(0, l);
    } catch (e) {
      Logger.log('Utils.generateRandomToken error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  generateOTP: function (length) {
    try {
      const len = Number(length) || CONFIG.SECURITY.OTP_LENGTH || 6;
      let otp = '';
      for (let i = 0; i < len; i++) otp += Math.floor(Math.random() * 10);
      return otp;
    } catch (e) {
      Logger.log('Utils.generateOTP error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  maskEmail: function (email) {
    try {
      if (!email) return '';
      const s = String(email).trim();
      const at = s.indexOf('@');
      if (at === -1) return s;
      const name = s.substring(0, at);
      const domain = s.substring(at + 1);
      const masked = name.length <= 2 ? name[0] + '*' : name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
      return masked + '@' + domain;
    } catch (e) {
      Logger.log('Utils.maskEmail error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  maskPhone: function (phone) {
    try {
      if (!phone) return '';
      const s = String(phone).trim();
      if (s.length <= 4) return '*'.repeat(s.length);
      return '*'.repeat(s.length - 4) + s.substring(s.length - 4);
    } catch (e) {
      Logger.log('Utils.maskPhone error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  // Backward compatible alias
  generateUUID: function () {
    try {
      return Utilities.getUuid();
    } catch (e) {
      Logger.log('Utils.generateUUID error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  generateUsername: function (fullName) {
    try {
      return fullName ? String(fullName).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    } catch (e) {
      Logger.log('Utils.generateUsername error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  generateFileName: function (prefix, extension) {
    try {
      const ts = Utilities.formatDate(new Date(), CONFIG.DATE_TIME.TIMEZONE, 'yyyyMMdd_HHmmss');
      return prefix + '_' + ts + '.' + extension;
    } catch (e) {
      Logger.log('Utils.generateFileName error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  // ==========================================
  // RESPONSE UTILITIES
  // ==========================================

  buildResponse: function (success, message, data) {
    Logger.log("ENTER: Utils.buildResponse");
    try {
      const d = data || {};
      var response = { success: Boolean(success), message: message, ...d };
      Logger.log("RETURNING FROM: Utils.buildResponse");
      Logger.log("Returned value:");
      Logger.log(JSON.stringify(response));
      if (response == null) {
        Logger.log("CRITICAL: Returning NULL");
      }
      return response;
    } catch (e) {
      Logger.log('Utils.buildResponse error: ' + (e && e.message ? e.message : e));
      var errorResponse = { success: false, message: CONFIG && CONFIG.MESSAGES ? CONFIG.MESSAGES.ERROR_DEFAULT : 'Error' };
      Logger.log("RETURNING FROM: Utils.buildResponse (Error Catch)");
      Logger.log("Returned value:");
      Logger.log(JSON.stringify(errorResponse));
      return errorResponse;
    }
  },

  buildErrorResponse: function (message, data) {
    try {
      return this.buildResponse(false, message || (CONFIG.MESSAGES ? CONFIG.MESSAGES.ERROR_DEFAULT : 'Error occurred'), data || {});
    } catch (e) {
      Logger.log('Utils.buildErrorResponse error: ' + (e && e.message ? e.message : e));
      return this.buildResponse(false, 'Error occurred', data || {});
    }
  },

  buildSuccessResponse: function (message, data) {
    try {
      return this.buildResponse(true, message || (CONFIG.MESSAGES ? CONFIG.MESSAGES.SUCCESS_DEFAULT : 'Success'), data || {});
    } catch (e) {
      Logger.log('Utils.buildSuccessResponse error: ' + (e && e.message ? e.message : e));
      return this.buildResponse(true, 'Success', data || {});
    }
  },

  // Backward compatible response helpers
  successResponse: function (message, data) {
    return this.buildSuccessResponse(message || 'Success', data || {});
  },
  errorResponse: function (message, data) {
    return this.buildErrorResponse(message || 'Error occurred', data || {});
  },
  validationResponse: function (message) {
    return this.buildResponse(false, message || 'Validation failed');
  },

  // ==========================================
  // VALIDATION HELPERS
  // ==========================================

  isEmail: function (email) {
    try {
      return email ? CONFIG.VALIDATION.EMAIL.test(String(email)) : false;
    } catch (e) {
      Logger.log('Utils.isEmail error: ' + (e && e.message ? e.message : e));
      return false;
    }
  },

  isPhone: function (phone) {
    try {
      return phone ? CONFIG.VALIDATION.PHONE.test(String(phone).trim()) : false;
    } catch (e) {
      Logger.log('Utils.isPhone error: ' + (e && e.message ? e.message : e));
      return false;
    }
  },

  isNumber: function (value) {
    try {
      if (value === null || value === undefined) return false;
      const n = Number(value);
      return !isNaN(n) && isFinite(n);
    } catch (e) {
      Logger.log('Utils.isNumber error: ' + (e && e.message ? e.message : e));
      return false;
    }
  },

  isBoolean: function (value) {
    try {
      return value === true || value === false;
    } catch (e) {
      Logger.log('Utils.isBoolean error: ' + (e && e.message ? e.message : e));
      return false;
    }
  },

  // Backward compatible aliases used by current code
  validateEmail: function (email) { return this.isEmail(email); },
  validateRollNumber: function (rollNumber) {
    try {
      return rollNumber ? CONFIG.VALIDATION.ROLL_NUMBER.test(String(rollNumber)) : false;
    } catch (e) {
      Logger.log('Utils.validateRollNumber error: ' + (e && e.message ? e.message : e));
      return false;
    }
  },
  isValidPhone: function (phone) { return this.isPhone(phone); },
  isValidYear: function (year) {
    try {
      return year ? CONFIG.VALIDATION.YEAR.test(String(year).trim()) : false;
    } catch (e) {
      Logger.log('Utils.isValidYear error: ' + (e && e.message ? e.message : e));
      return false;
    }
  },
  isValidSection: function (section) {
    try {
      return section ? CONFIG.VALIDATION.SECTION.test(String(section).trim()) : false;
    } catch (e) {
      Logger.log('Utils.isValidSection error: ' + (e && e.message ? e.message : e));
      return false;
    }
  },

  // ==========================================
  // OBJECT & ARRAY HELPERS
  // ==========================================

  deepClone: function (obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      Logger.log('Utils.deepClone error: ' + (e && e.message ? e.message : e));
      return null;
    }
  },

  isObject: function (val) {
    try {
      return val !== null && typeof val === 'object' && !Array.isArray(val);
    } catch (e) {
      Logger.log('Utils.isObject error: ' + (e && e.message ? e.message : e));
      return false;
    }
  },

  isArray: function (val) {
    return Array.isArray(val);
  },

  mergeObjects: function (target, source) {
    try {
      return Object.assign(target, source);
    } catch (e) {
      Logger.log('Utils.mergeObjects error: ' + (e && e.message ? e.message : e));
      return target;
    }
  },

  safeParseJSON: function (text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  },
  sanitizeStudent: function (student) {

    return student
      ? JSON.parse(JSON.stringify(student))
      : null;

  },

  safeStringify: function (object) {
    try {
      return JSON.stringify(object);
    } catch (e) {
      return '{}';
    }
  },

  sanitizeUser: function (user) {
    try {
      if (!user) return null;
      const safeUser = this.deepClone(user);
      if (CONFIG && CONFIG.SENSITIVE_FIELDS && Array.isArray(CONFIG.SENSITIVE_FIELDS)) {
        CONFIG.SENSITIVE_FIELDS.forEach(function (field) {
          delete safeUser[field];
        });
      }
      return safeUser;
    } catch (e) {
      Logger.log('Utils.sanitizeUser error: ' + (e && e.message ? e.message : e));
      return null;
    }
  },

  removeEmptyProperties: function (obj) {
    try {
      if (!obj || typeof obj !== 'object') return obj;
      const out = {};
      Object.keys(obj).forEach(function (k) {
        const v = obj[k];
        if (!(v === null || v === undefined || (typeof v === 'string' && v.trim() === ''))) {
          out[k] = v;
        }
      });
      return out;
    } catch (e) {
      Logger.log('Utils.removeEmptyProperties error: ' + (e && e.message ? e.message : e));
      return obj;
    }
  },

  uniqueArray: function (arr) {
    try {
      if (!Array.isArray(arr)) return [];
      const seen = {};
      const out = [];
      arr.forEach(function (v) {
        const key = String(v);
        if (!seen[key]) {
          seen[key] = true;
          out.push(v);
        }
      });
      return out;
    } catch (e) {
      Logger.log('Utils.uniqueArray error: ' + (e && e.message ? e.message : e));
      return [];
    }
  },
  sanitizeDepartment: function (department) {
    try {
      if (!department) return null;
      const safeDepartment = this.deepClone(department);
      const hod = department['HOD Name'] || department.hod_name || '';
      const empId = department['HOD Emp ID'] || department.hod_emp_id || department.hod_employee_id || '';
      const email =
        department['HOD Email'] ||
        department.hod_email ||
        department['Remarks'] ||
        department.remarks ||
        '';

      safeDepartment['HOD Name'] = hod;
      safeDepartment['hod_name'] = hod;
      safeDepartment['HOD Emp ID'] = empId;
      safeDepartment['hod_emp_id'] = empId;
      safeDepartment['hod_employee_id'] = empId;
      safeDepartment['HOD Email'] = email;
      safeDepartment['hod_email'] = email;
      return safeDepartment;
    } catch (e) {
      Logger.log('Utils.sanitizeDepartment error: ' + (e && e.message ? e.message : e));
      return null;
    }
  },

  sanitizeEvent: function (event) {
    try {
      if (!event) return null;
      const safeEvent = this.deepClone(event);

      const mappings = [
        { key: 'eventId', snakeKey: 'event_id', sheetKey: CONFIG.COLUMNS.EVENT_ID },
        { key: 'eventName', snakeKey: 'event_name', sheetKey: CONFIG.COLUMNS.EVENT_NAME },
        { key: 'description', snakeKey: 'description', sheetKey: CONFIG.COLUMNS.DESCRIPTION },
        { key: 'startDate', snakeKey: 'start_date', sheetKey: CONFIG.COLUMNS.START_DATE },
        { key: 'endDate', snakeKey: 'end_date', sheetKey: CONFIG.COLUMNS.END_DATE },
        { key: 'startTime', snakeKey: 'start_time', sheetKey: CONFIG.COLUMNS.START_TIME },
        { key: 'endTime', snakeKey: 'end_time', sheetKey: CONFIG.COLUMNS.END_TIME },
        { key: 'venue', snakeKey: 'venue', sheetKey: CONFIG.COLUMNS.VENUE },
        { key: 'coordinatorId', snakeKey: 'coordinator_id', sheetKey: CONFIG.COLUMNS.COORDINATOR_ID },
        { key: 'departments', snakeKey: 'departments', sheetKey: CONFIG.COLUMNS.DEPARTMENTS },
        { key: 'years', snakeKey: 'years', sheetKey: CONFIG.COLUMNS.YEARS },
        { key: 'capacity', snakeKey: 'capacity', sheetKey: CONFIG.COLUMNS.CAPACITY },
        { key: 'status', snakeKey: 'status', sheetKey: CONFIG.COLUMNS.STATUS }
      ];

      mappings.forEach(m => {
        var val = event[m.sheetKey] !== undefined ? event[m.sheetKey] : (event[m.key] !== undefined ? event[m.key] : event[m.snakeKey]);

        // Handle Event Status sheet mapping fallback
        if (m.key === 'status' && val === undefined) {
          val = event['Event Status'] !== undefined ? event['Event Status'] : event['status'];
        }

        if (val !== undefined) {
          safeEvent[m.key] = val;
          safeEvent[m.snakeKey] = val;
          safeEvent[m.sheetKey] = val;
          if (m.key === 'status') {
            safeEvent['Event Status'] = val;
          }
        }
      });

      // Map Coordinator User ID to Employee ID
      var cId = String(safeEvent.coordinator_id || '').trim();
      if (cId) {
        var users = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
        var matchUser = users.find(u => String(u['User ID'] || u.user_id || '').trim() === cId);
        safeEvent.coordinator_employee_id = matchUser ? String(matchUser['Employee ID'] || matchUser.employee_id || matchUser.employeeId || '').trim() : cId;
      } else {
        safeEvent.coordinator_employee_id = 'N/A';
      }

      return safeEvent;
    } catch (e) {
      Logger.log('Utils.sanitizeEvent error: ' + (e && e.message ? e.message : e));
      return null;
    }
  },

  // ==========================================
  // ID / FORMATTING HELPERS
  // ==========================================

  padNumber: function (number, width) {
    return this._padNumber(number, width);
  },

  formatCurrency: function (amount, currencySymbol) {
    try {
      const sym = currencySymbol || '₹';
      const n = Number(amount);
      if (isNaN(n)) return '';
      return sym + n.toFixed(2);
    } catch (e) {
      Logger.log('Utils.formatCurrency error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  formatPercentage: function (value, decimals) {
    try {
      const d = (decimals === 0) ? 0 : (Number(decimals) || 2);
      const n = Number(value);
      if (isNaN(n)) return '';
      return n.toFixed(d) + '%';
    } catch (e) {
      Logger.log('Utils.formatPercentage error: ' + (e && e.message ? e.message : e));
      return '';
    }
  },

  // ==========================================
  // LOGGING HELPERS
  // ==========================================

  logInfo: function (msg) { Logger.log('[INFO] ' + msg); },
  logWarning: function (msg) { Logger.log('[WARN] ' + msg); },
  logError: function (msg) { Logger.log('[ERROR] ' + msg); }
};

Object.freeze(Utils);

