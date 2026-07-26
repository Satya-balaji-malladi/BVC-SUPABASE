/**
 * Api.js
 * 
 * Top-level Google Apps Script global function wrappers.
 * google.script.run can only invoke top-level functions defined in the global scope.
 * This file serves as the single source of truth for the public API surface.
 * Contains no business logic, acting purely as a routing/wrapper layer.
 * 
 * Naming Convention: camelCase
 */

/**
 * Warmup ping — keeps the Apps Script instance alive after login.
 * Called by the frontend immediately after successful authentication.
 * @returns {boolean} Always true
 */
function ping() {
  return true;
}

// ==========================================
// 1. Authentication API
// ==========================================

/**
 * Authenticates user credentials and generates a session.
 * @param {object} credentials - { employeeId, password }
 * @returns {object} Response containing login status and session token.
 */
function login(credentials) {
  try {
    return JSON.parse(JSON.stringify(Controller.Auth.login(credentials) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Terminates the active session associated with the token.
 * @param {string} sessionToken - The token to invalidate.
 * @returns {object} Response containing success status.
 */
function logout(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Auth.logout(sessionToken) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Authenticates an existing session token.
 * @param {string} sessionToken - The token to validate.
 * @returns {object} Response containing validation status and user profile data.
 */
function authenticate(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Auth.authenticate(sessionToken) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Completes the first-time profile completion onboarding details.
 * @param {string} sessionToken - Active session token.
 * @param {object} payload - { phone, alternatePhone, profilePhoto }
 * @returns {object} Response object.
 */
function completeProfile(sessionToken, payload) {
  try {
    return SessionService.authorize(sessionToken, { action: 'completeProfile' }, function(userId) {
      return JSON.parse(JSON.stringify(UserService.completeUserProfile(userId, payload) || {}));
    });
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Heartbeat ping sent by active sessions to keep presence status online.
 * @param {string} sessionToken - Active session token.
 * @returns {object} Response object.
 */
function pingHeartbeat(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(SessionService.pingHeartbeat(sessionToken) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Requests an OTP recovery token for a staff member.
 * @param {string} sessionToken - Prepended token (null before login).
 * @param {string} employeeId - Unique identifier of the staff.
 * @returns {object} Response containing OTP generation status.
 */
function forgotPassword(sessionToken, employeeId) {
  try {
    const cleanEmpId = String(employeeId || "").trim();
    if (!cleanEmpId) {
      return { success: false, message: "Invalid Employee ID format provided." };
    }
    const user = DatabaseService.findOne(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_EMPLOYEE_ID, cleanEmpId);
    if (!user) {
      return { success: false, message: "No registered staff found with Employee ID: " + cleanEmpId };
    }
    const userId = String(user[CONFIG.COLUMNS.USER_ID]).trim();
    
    // Sync email column if alias mismatch exists
    const trueEmailAttr = CONFIG.COLUMNS.USER_EMAIL || "Email Address";
    if (user[trueEmailAttr] && (!user["Email"] || user["Email"] === "")) {
      const emailSyncPatch = {};
      emailSyncPatch["Email"] = String(user[trueEmailAttr]).trim();
      DatabaseService.updateRow(CONFIG.SHEETS.USERS, CONFIG.ID_COLUMNS.USERS, userId, emailSyncPatch);
    }
    return JSON.parse(JSON.stringify(AuthService.generateOTP(userId) || {}));
  } catch (e) {
    return { success: false, message: "API Routing Error: " + e.message };
  }
}

/**
 * Verifies the password reset OTP.
 * @param {string} employeeId - Unique identifier of the staff.
 * @param {string} otp - 6-digit OTP code.
 * @returns {object} Response containing verification status.
 */
function verifyOTP(employeeId, otp) {
  try {
    const cleanEmpId = String(employeeId || "").trim();
    const user = DatabaseService.findOne(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_EMPLOYEE_ID, cleanEmpId);
    if (!user) return { success: false, message: "User not found." };
    const userId = String(user[CONFIG.COLUMNS.USER_ID]).trim();
    return JSON.parse(JSON.stringify(AuthService.verifyOTP(userId, otp) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Resets user password using a verified OTP.
 * @param {string} employeeId - Unique identifier of the staff.
 * @param {string} otp - 6-digit OTP code.
 * @param {string} newPassword - New password to set.
 * @returns {object} Response containing reset status.
 */
function recoverPassword(employeeId, otp, newPassword) {
  try {
    const cleanEmpId = String(employeeId || "").trim();
    const user = DatabaseService.findOne(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_EMPLOYEE_ID, cleanEmpId);
    if (!user) return { success: false, message: "User not found." };
    const userId = String(user[CONFIG.COLUMNS.USER_ID]).trim();
    return JSON.parse(JSON.stringify(AuthService.resetPassword(userId, otp, newPassword) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Completes mandatory first-time login setup (password & details update).
 * @param {string} sessionToken - Active session token.
 * @param {object} setupData - { newPassword, confirmPassword, phone, designation, firstName, lastName }
 * @returns {object} Response object.
 */
function completeFirstTimeSetup(sessionToken, setupData) {
  try {
    return JSON.parse(JSON.stringify(Controller.User.completeFirstTimeSetup(sessionToken, setupData) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ==========================================
// 2. User Management API
// ==========================================

/**
 * Creates a new user.
 * @param {string} sessionToken - Request session token.
 * @param {object} userData - Core user registration payload.
 * @returns {object} Response containing user creation status.
 */
function createUser(sessionToken, userData) {
  try {
    return JSON.parse(JSON.stringify(Controller.User.createUser(sessionToken, userData) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Imports multiple users in bulk.
 * @param {string} sessionToken - Request session token.
 * @param {object[]} usersDataArray - Array of user payloads.
 * @returns {object} Response containing import status.
 */
function importUsers(sessionToken, usersDataArray) {
  try {
    return JSON.parse(JSON.stringify(Controller.User.importUsers(sessionToken, usersDataArray) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Retrieves a user by ID.
 * @param {string} sessionToken - Request session token.
 * @param {string} userId - Target User ID.
 * @returns {object} Target user data object.
 */
function getUserById(sessionToken, userId) {
  try {
    return JSON.parse(JSON.stringify(Controller.User.getUserById(sessionToken, userId) || {}));
  } catch (e) {
    return {};
  }
}

/**
 * Retrieves a user by username.
 * @param {string} sessionToken - Request session token.
 * @param {string} username - Target username.
 * @returns {object} Target user data object.
 */
function getUserByUsername(sessionToken, username) {
  try {
    return JSON.parse(JSON.stringify(Controller.User.getUserByUsername(sessionToken, username) || {}));
  } catch (e) {
    return {};
  }
}

/**
 * Retrieves all registered users.
 * @param {string} sessionToken - Request session token.
 * @returns {object[]} Array of user data objects.
 */
function getAllUsers(sessionToken) {
  try {
    const res = Controller.User.getAllUsers(sessionToken);
    return JSON.parse(JSON.stringify(res || []));
  } catch (e) {
    return [];
  }
}

/**
 * Updates user data.
 * @param {string} sessionToken - Request session token.
 * @param {string} userId - Target User ID.
 * @param {object} userData - Core update payload.
 * @returns {object} Response containing update status.
 */
function updateUser(sessionToken, userId, userData) {
  try {
    return JSON.parse(JSON.stringify(Controller.User.updateUser(sessionToken, userId, userData) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Deactivates or soft-deletes a user.
 * @param {string} sessionToken - Request session token.
 * @param {string} userId - Target User ID.
 * @returns {object} Response containing execution status.
 */
function deleteUser(sessionToken, userId) {
  try {
    return JSON.parse(JSON.stringify(Controller.User.deleteUser(sessionToken, userId) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Resets a user's password to default.
 * @param {string} sessionToken - Request session token.
 * @param {string} userId - Target User ID.
 * @returns {object} Response containing reset status.
 */
function resetPassword(sessionToken, userId) {
  try {
    return JSON.parse(JSON.stringify(Controller.User.resetPassword(sessionToken, userId) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Changes a user's password.
 * @param {string} sessionToken - Request session token.
 * @param {string} userId - Target User ID.
 * @param {string} oldPassword - Current password.
 * @param {string} newPassword - New password to apply.
 * @returns {object} Response containing status.
 */
function changePassword(sessionToken, userId, oldPassword, newPassword) {
  try {
    return JSON.parse(JSON.stringify(Controller.User.changePassword(sessionToken, userId, oldPassword, newPassword) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ==========================================
// 3. Student Management API
// ==========================================

/**
 * Retrieves all registered students.
 * @param {string} sessionToken - Request session token.
 * @returns {object[]} Array of student objects.
 */
function getAllStudents(sessionToken) {
  try {
    const res = Controller.Student.getAllStudents(sessionToken);
    return JSON.parse(JSON.stringify(res || []));
  } catch (e) {
    return [];
  }
}

/**
 * Retrieves a student profile by Roll Number.
 * @param {string} sessionToken - Request session token.
 * @param {string} rollNumber - Target roll number.
 * @returns {object} Student data object.
 */
function getStudentByRollNumber(sessionToken, rollNumber) {
  try {
    return JSON.parse(JSON.stringify(Controller.Student.getStudentByRollNumber(sessionToken, rollNumber) || {}));
  } catch (e) {
    return {};
  }
}

/**
 * Creates a student record.
 * @param {string} sessionToken - Request session token.
 * @param {object} studentData - Student details.
 * @returns {object} Response containing creation status.
 */
function createStudent(sessionToken, studentData) {
  try {
    return JSON.parse(JSON.stringify(Controller.Student.createStudent(sessionToken, studentData) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Updates a student record.
 * @param {string} sessionToken - Request session token.
 * @param {string} rollNumber - Target roll number.
 * @param {object} studentData - Updates data.
 * @returns {object} Response containing update status.
 */
function updateStudent(sessionToken, rollNumber, studentData) {
  try {
    return JSON.parse(JSON.stringify(Controller.Student.updateStudent(sessionToken, rollNumber, studentData) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Soft-deletes a student record.
 * @param {string} sessionToken - Request session token.
 * @param {string} rollNumber - Target roll number.
 * @returns {object} Response containing execution status.
 */
function deleteStudent(sessionToken, rollNumber) {
  try {
    return JSON.parse(JSON.stringify(Controller.Student.deleteStudent(sessionToken, rollNumber) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ==========================================
// 4. Department Management API
// ==========================================

/**
 * Retrieves all active departments.
 * @param {string} sessionToken - Request session token.
 * @returns {object[]} Array of department objects.
 */
function getActiveDepartments(sessionToken) {
  try {
    const res = Controller.Department.getActiveDepartments(sessionToken);
    return JSON.parse(JSON.stringify(res || []));
  } catch (e) {
    return [];
  }
}



/**
 * Runs end-to-end diagnostic test for Department creation flow.
 * @param {string} sessionToken
 * @returns {object} Response object with diagnostic log output.
 */
function runDiagnosticTest(sessionToken) {
  try {
    const logOutput = testDepartmentCreationDiagnostic();
    return { success: true, message: "Diagnostic completed", data: { log: logOutput } };
  } catch (e) {
    return { success: false, message: e.message || String(e) };
  }
}

/**
 * Updates an existing department.
 * @param {string} sessionToken - Request session token.
 * @param {string} departmentId - Target Department ID.
 * @param {object} updateData - Department updates.
 * @returns {object} Response object.
 */
function updateDepartment(sessionToken, departmentId, updateData) {
  try {
    const res = Controller.Department.updateDepartment(sessionToken, departmentId, updateData);
    return JSON.parse(JSON.stringify(res || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Deletes a department.
 * @param {string} sessionToken - Request session token.
 * @param {string} departmentId - Target Department ID.
 * @returns {object} Response object.
 */
function deleteDepartment(sessionToken, departmentId) {
  try {
    const res = Controller.Department.deleteDepartment(sessionToken, departmentId);
    return JSON.parse(JSON.stringify(res || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Retrieves a department by ID.
 * @param {string} sessionToken - Request session token.
 * @param {string} departmentId - Target Department ID.
 * @returns {object} Response object.
 */
function getDepartmentById(sessionToken, departmentId) {
  try {
    const res = Controller.Department.getDepartmentById(sessionToken, departmentId);
    return JSON.parse(JSON.stringify(res || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Retrieves all departments.
 * @param {string} sessionToken - Request session token.
 * @returns {object} Response object.
 */
function getAllDepartments(sessionToken) {
  try {
    const res = Controller.Department.getAllDepartments(sessionToken);
    return JSON.parse(JSON.stringify(res || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}


// ==========================================
// 5. Event Management API
// ==========================================

/**
 * Retrieves an event record by ID.
 * @param {string} sessionToken - Request session token.
 * @param {string} eventId - Target Event ID.
 * @returns {object} Event data object.
 */
function getEventById(sessionToken, eventId) {
  try {
    return JSON.parse(JSON.stringify(Controller.Event.getEventById(sessionToken, eventId) || {}));
  } catch (e) {
    return {};
  }
}

/**
 * Retrieves all events.
 * @param {string} sessionToken - Request session token.
 * @returns {object[]} Array of event data objects.
 */
function getAllEvents(sessionToken) {
  try {
    const res = Controller.Event.getAllEvents(sessionToken);
    return JSON.parse(JSON.stringify(res || []));
  } catch (e) {
    return [];
  }
}

/**
 * Creates a new event.
 * @param {string} sessionToken - Request session token.
 * @param {object} eventData - Event configuration details.
 * @returns {object} Response containing creation status.
 */
function createEvent(sessionToken, eventData) {
  try {
    return JSON.parse(JSON.stringify(Controller.Event.createEvent(sessionToken, eventData) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Updates event configuration details.
 * @param {string} sessionToken - Request session token.
 * @param {string} eventId - Target Event ID.
 * @param {object} eventData - Core updates updates.
 * @returns {object} Response containing update status.
 */
function updateEvent(sessionToken, eventId, eventData) {
  try {
    return JSON.parse(JSON.stringify(Controller.Event.updateEvent(sessionToken, eventId, eventData) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Soft-deletes or cancels an event.
 * @param {string} sessionToken - Request session token.
 * @param {string} eventId - Target Event ID.
 * @returns {object} Response containing execution status.
 */
function deleteEvent(sessionToken, eventId) {
  try {
    return JSON.parse(JSON.stringify(Controller.Event.deleteEvent(sessionToken, eventId) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getEventDetailsWithTimeline(sessionToken, eventId) {
  try {
    const res = Controller.Event.getEventDetailsWithTimeline(sessionToken, eventId);
    return JSON.parse(JSON.stringify(res || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ==========================================
// 6. Attendance API
// ==========================================

function getEventDayAttendance(sessionToken, eventId, dayNumber) {
  try {
    const res = Controller.Attendance.getEventDayAttendance(sessionToken, eventId, dayNumber);
    return JSON.parse(JSON.stringify(res || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Marks attendance for a student.
 * @param {string} sessionToken - Request session token.
 * @param {object} attendanceData - Log payload { eventId, rollNumber, status, method }.
 * @returns {object} Response containing execution status.
 */
function markAttendance(sessionToken, attendanceData) {
  try {
    return JSON.parse(JSON.stringify(Controller.Attendance.markAttendance(sessionToken, attendanceData) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function markAttendanceFast(sessionToken, attendanceData) {
  try {
    return JSON.parse(JSON.stringify(Controller.Attendance.markAttendanceFast(sessionToken, attendanceData) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getQueueStatus(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Attendance.getQueueStatus(sessionToken) || {}));
  } catch (e) {
    return { totalInQueue: 0 };
  }
}

function processQueueBatch(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Attendance.processQueueBatch(sessionToken) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function generatePrintablePdfHtml(sessionToken, title, filters, columns, dataRows, summary) {
  try {
    if (typeof ExportUtils !== 'undefined') {
      return ExportUtils.generatePrintablePdfHtml(title, filters, columns, dataRows, summary);
    }
    return '<html><body>Report Generator Unavailable</body></html>';
  } catch (e) {
    return '<html><body>Error: ' + e.message + '</body></html>';
  }
}

function exportToCsv(sessionToken, columns, dataRows) {
  try {
    if (typeof ExportUtils !== 'undefined') {
      return ExportUtils.exportToCsv(columns, dataRows);
    }
    return '';
  } catch (e) {
    return '';
  }
}

/**
 * Retrieves total attendance scan records for a student.
 * @param {string} sessionToken - Request session token.
 * @param {string} rollNumber - Student Roll Number.
 * @returns {number} Count of registered scans.
 */
function getStudentAttendanceCount(sessionToken, rollNumber) {
  try {
    return JSON.parse(JSON.stringify(Controller.Attendance.getStudentAttendanceCount(sessionToken, rollNumber) || 0));
  } catch (e) {
    return 0;
  }
}

/**
 * Retrieves raw attendance records for a specific event.
 * @param {string} sessionToken - Request session token.
 * @param {string} eventId - Target Event ID.
 * @returns {object[]} Array of attendance objects.
 */
function getAttendanceByEvent(sessionToken, eventId) {
  try {
    const res = Controller.Attendance.getAttendanceByEvent(sessionToken, eventId);
    return JSON.parse(JSON.stringify(res || []));
  } catch (e) {
    return [];
  }
}

/**
 * Deletes an attendance record.
 * @param {string} sessionToken - Request session token.
 * @param {string} attendanceId - Target Attendance ID.
 * @returns {object} Response object.
 */
function deleteAttendance(sessionToken, attendanceId) {
  try {
    return JSON.parse(JSON.stringify(Controller.Attendance.deleteAttendance(sessionToken, attendanceId) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Retrieves an attendance record by ID.
 * @param {string} sessionToken - Request session token.
 * @param {string} attendanceId - Target Attendance ID.
 * @returns {object} Response object.
 */
function getAttendanceById(sessionToken, attendanceId) {
  try {
    return JSON.parse(JSON.stringify(Controller.Attendance.getAttendanceById(sessionToken, attendanceId) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ==========================================
// 7. Participant Registry API
// ==========================================

/**
 * Retrieves all registered event participants with student profiles.
 * @param {string} sessionToken - Request session token.
 * @returns {object[]} Array of participant profiles.
 */
function getAllEnrichedParticipants(sessionToken) {
  try {
    const res = Controller.Participant.getAllEnrichedParticipants(sessionToken);
    if (Array.isArray(res)) return JSON.parse(JSON.stringify(res));
    if (res && res.success === false) return [];
    
    // Extract values if response was converted to key-value map
    const arr = [];
    for (var k in res) {
      if (!isNaN(parseInt(k, 10)) && Object.prototype.hasOwnProperty.call(res, k)) {
        arr.push(res[k]);
      }
    }
    return JSON.parse(JSON.stringify(arr.length > 0 ? arr : (res.data || [])));
  } catch (e) {
    return [];
  }
}

/**
 * Retrieves participants registered for a specific event.
 * @param {string} sessionToken - Request session token.
 * @param {string} eventId - Target Event ID.
 * @returns {object[]} Array of participant objects.
 */
function getEventParticipants(sessionToken, eventId) {
  try {
    const res = Controller.Participant.getEventParticipants(sessionToken, eventId);
    if (res && res.success) {
      return JSON.parse(JSON.stringify(res.data || []));
    }
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * Registers a student for an event.
 * @param {string} sessionToken - Request session token.
 * @param {string} eventId - Target Event ID.
 * @param {string} rollNumber - Student Roll Number.
 * @returns {object} Response containing status.
 */
function addParticipant(sessionToken, eventId, rollNumber) {
  try {
    return JSON.parse(JSON.stringify(Controller.Participant.addParticipant(sessionToken, eventId, rollNumber) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Cancels registration/removes student from event.
 * @param {string} sessionToken - Request session token.
 * @param {string} eventId - Target Event ID.
 * @param {string} rollNumber - Student Roll Number.
 * @returns {object} Response containing status.
 */
function removeParticipant(sessionToken, eventId, rollNumber) {
  try {
    return JSON.parse(JSON.stringify(Controller.Participant.removeParticipant(sessionToken, eventId, rollNumber) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Restores a deleted participant registration.
 * @param {string} sessionToken - Request session token.
 * @param {string} eventId - Target Event ID.
 * @param {string} rollNumber - Student Roll Number.
 * @returns {object} Response containing status.
 */
function restoreParticipant(sessionToken, eventId, rollNumber) {
  try {
    return JSON.parse(JSON.stringify(Controller.Participant.restoreParticipant(sessionToken, eventId, rollNumber) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Checks if a student is eligible to join an event.
 * @param {string} sessionToken - Request session token.
 * @param {string} eventId - Target Event ID.
 * @param {string} rollNumber - Student Roll Number.
 * @returns {object} Response containing status and verification notes.
 */
function checkEligibility(sessionToken, eventId, rollNumber) {
  try {
    return JSON.parse(JSON.stringify(Controller.Participant.checkEligibility(sessionToken, eventId, rollNumber) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Registers multiple students to an event in bulk.
 * @param {string} sessionToken - Request session token.
 * @param {string} eventId - Target Event ID.
 * @param {string[]} rollNumbers - Array of student Roll Numbers.
 * @returns {object} Response containing execution status.
 */
function bulkAddParticipants(sessionToken, eventId, rollNumbers) {
  try {
    return JSON.parse(JSON.stringify(Controller.Participant.bulkAddParticipants(sessionToken, eventId, rollNumbers) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Cancels multiple registrations in bulk.
 * @param {string} sessionToken - Request session token.
 * @param {string} eventId - Target Event ID.
 * @param {string[]} rollNumbers - Array of student Roll Numbers.
 * @returns {object} Response containing status.
 */
function bulkRemoveParticipants(sessionToken, eventId, rollNumbers) {
  try {
    return JSON.parse(JSON.stringify(Controller.Participant.bulkRemoveParticipants(sessionToken, eventId, rollNumbers) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ==========================================
// 8. Coordinator Terminal API
// ==========================================

/**
 * Loads terminal interface context (coordinator user details, assigned events, statistics).
 * @param {string} sessionToken - Coordinator session token.
 * @returns {object} Response containing context records.
 */
function getCoordinatorTerminalData(sessionToken) {
  try {
    const response = Controller.CoordinatorTerminal.getContext(sessionToken);
    return JSON.parse(JSON.stringify(response || {}));
  } catch (error) {
    return Utils.buildResponse(false, "Failed to load coordinator terminal context data: " + error.message);
  }
}

/**
 * Records student attendance via terminal interface.
 * @param {string} sessionToken - Request session token.
 * @param {string} rollNumber - Student Roll Number.
 * @param {string} attendanceMethod - "QR" or "Manual".
 * @returns {object} Response containing execution status.
 */
function markCoordinatorAttendance(sessionToken, rollNumber, attendanceMethod) {
  try {
    return Controller.CoordinatorTerminal.markAttendance(sessionToken, rollNumber, attendanceMethod);
  } catch (error) {
    return Utils.buildResponse(false, "Failed to process terminal attendance entry: " + error.message);
  }
}

/**
 * FAST PATH attendance for Open Events — single sheet.appendRow(), no locks.
 * @param {string} sessionToken - Request session token.
 * @param {string} rollNumber - Student Roll Number.
 * @returns {object} Response containing execution status.
 */
function markCoordinatorAttendanceFast(sessionToken, rollNumber) {
  try {
    return Controller.CoordinatorTerminal.markAttendanceFast(sessionToken, rollNumber);
  } catch (error) {
    return Utils.buildResponse(false, "Fast attendance failed: " + error.message);
  }
}

/**
 * Retrieves live event statistics for coordinator view.
 * @param {string} sessionToken - Request session token.
 * @returns {object} Response containing live counts.
 */
function getCoordinatorStatistics(sessionToken) {
  try {
    return Controller.CoordinatorTerminal.getLiveStatistics(sessionToken);
  } catch (error) {
    return Utils.buildResponse(false, "Failed to compile live terminal statistics: " + error.message);
  }
}

/**
 * Streams recent scans recorded at the terminal.
 * @param {string} sessionToken - Request session token.
 * @returns {object} Response containing recent scan records.
 */
function getCoordinatorRecentScans(sessionToken) {
  try {
    return Controller.CoordinatorTerminal.getRecentScansStream(sessionToken);
  } catch (error) {
    return Utils.buildResponse(false, "Failed to retrieve recent terminal operations stream: " + error.message);
  }
}

/**
 * Queries student database identity for confirmation.
 * @param {string} sessionToken - Request session token.
 * @param {string} rollNumber - Student Roll Number.
 * @returns {object} Response containing student data payload.
 */
function getCoordinatorStudent(sessionToken, rollNumber) {
  try {
    return Controller.CoordinatorTerminal.getStudentProfile(sessionToken, rollNumber);
  } catch (error) {
    return Utils.buildResponse(false, "Failed to query structural student identity bounds: " + error.message);
  }
}

/**
 * Terminates active coordinator terminal session.
 * @param {string} sessionToken - Session token.
 * @returns {object} Response containing status.
 */
function logoutCoordinator(sessionToken) {
  try {
    return Controller.CoordinatorTerminal.terminateSession(sessionToken);
  } catch (error) {
    return Utils.buildResponse(false, "Failed to gracefully clear active terminal session: " + error.message);
  }
}

/**
 * Evaluates active coordinator token status.
 * @param {string} sessionToken - Token.
 * @returns {object} Response containing validation status.
 */
function validateCoordinatorSession(sessionToken) {
  try {
    return Controller.CoordinatorTerminal.validateActiveSession(sessionToken);
  } catch (error) {
    return Utils.buildResponse(false, "Session validation sequence encountered errors: " + error.message);
  }
}

/**
 * Registers a student ad-hoc and logs attendance at the scanner terminal.
 * @param {string} sessionToken - Request session token.
 * @param {string} rollNumber - Student Roll Number.
 * @param {string} name - Student name.
 * @param {string} department - Department ID.
 * @param {number|string} year - Year.
 * @param {string} section - Section.
 * @param {string} college - College name.
 * @returns {object} Response containing status.
 */
function registerSpotStudentAndMark(sessionToken, rollNumber, name, department, year, section, college) {
  try {
    return Controller.CoordinatorTerminal.registerSpotStudentAndMarkAttendance(sessionToken, rollNumber, name, department, year, section, college);
  } catch (error) {
    return Utils.buildResponse(false, "Failed to register spot student and mark attendance: " + error.message);
  }
}

// ==========================================
// 9. Reporting & Analytics API
// ==========================================

/**
 * Compiles dashboard analytics counts and summaries.
 * @param {string} sessionToken - Request session token.
 * @returns {object} Aggregated dashboard statistics.
 */
function getDashboardData(sessionToken) {
  try {
    const userContext = SessionService.getUserContext(sessionToken);
    if (!userContext || !userContext.userId) return { success: false, message: 'Session is invalid or expired.' };
    const userId = userContext.userId;

    const aggregatedData = DashboardService.getAggregatedDashboardData(userId, userContext);
    return JSON.parse(JSON.stringify({
      success: true,
      data: aggregatedData
    }));
  } catch (e) {
    Logger.log("Error in getDashboardData: " + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * Retrieves cross-department attendance list.
 * @param {string} sessionToken - Request session token.
 * @returns {object} Response object.
 */
function getCrossDepartmentAttendance(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Report.getCrossDepartmentAttendance(sessionToken) || {}));
  } catch (error) {
    return Utils.buildResponse(false, "Failed to compile cross-department stats: " + error.message);
  }
}

/**
 * Retrieves high-level analytics configurations.
 * @param {string} sessionToken - Request session token.
 * @returns {object} Analytics overview payload.
 */
function getAnalyticsSummary(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Analytics.getAnalyticsSummary(sessionToken) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Compiles chronological attendance rate trends.
 * @param {string} sessionToken - Request session token.
 * @returns {object} Chronological charts data mapping.
 */
function getTrendData(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Analytics.getTrendData(sessionToken) || {}));
  } catch (e) {
    return {};
  }
}

/**
 * Compiles department-wise attendance statistics.
 * @param {string} sessionToken - Request session token.
 * @returns {object} Department analytics counts.
 */
function getDepartmentData(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Analytics.getDepartmentData(sessionToken) || {}));
  } catch (e) {
    return {};
  }
}

/**
 * Compiles participation details grouped by event.
 * @param {string} sessionToken - Request session token.
 * @returns {object} Eventwise participation values.
 */
function getEventWiseData(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Analytics.getEventWiseData(sessionToken) || {}));
  } catch (e) {
    return {};
  }
}

/**
 * Compiles scan interval pattern logs.
 * @param {string} sessionToken - Request session token.
 * @returns {object} Hourly checkout statistics.
 */
function getCheckInPatterns(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Analytics.getCheckInPatterns(sessionToken) || {}));
  } catch (e) {
    return {};
  }
}

/**
 * Compiles distribution curve metrics.
 * @param {string} sessionToken - Request session token.
 * @returns {object} Distribution values.
 */
function getPerformanceDistribution(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Analytics.getPerformanceDistribution(sessionToken) || {}));
  } catch (e) {
    return {};
  }
}

/**
 * Compiles student records with low participation rates.
 * @param {string} sessionToken - Request session token.
 * @returns {object} Low attendance targets data.
 */
function getDefaulterDistribution(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Analytics.getDefaulterDistribution(sessionToken) || {}));
  } catch (e) {
    return {};
  }
}

/**
 * Compiles coordinator scanning leaderboard statistics.
 * @param {string} sessionToken - Request session token.
 * @returns {object} Leaderboard rankings records.
 */
function getLeaderboard(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Analytics.getLeaderboard(sessionToken) || {}));
  } catch (e) {
    return {};
  }
}

/**
 * Retrieves internal system health and connectivity metrics (Task 12).
 * @param {string} sessionToken - Admin request session token.
 * @returns {object} System health payload.
 */
function getSystemHealth(sessionToken) {
  try {
    const isValid = SessionService.validateSession(sessionToken);
    if (!isValid) return { success: false, message: 'Session is invalid.' };
    return SessionService.authorize(sessionToken, { allowedRoles: [CONFIG.ROLES.SUPER_ADMIN, CONFIG.ROLES.ADMIN] }, function (userId) {
      return SystemMonitoringService.getSystemHealth(userId);
    });
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// Reports PDF/Excel Exports

function _serializeReport(res) {
  try {
    return JSON.parse(JSON.stringify(res || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getReportsDashboardSummary(sessionToken) {
  try {
    return _serializeReport(Controller.Report.getReportsDashboardSummary(sessionToken));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getEventReport(sessionToken, filters) {
  try {
    return _serializeReport(Controller.Report.getEventReport(sessionToken, filters));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getStudentReport(sessionToken, rollNumber) {
  try {
    return _serializeReport(Controller.Report.getStudentReport(sessionToken, rollNumber));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getStudentEventHistory(sessionToken, rollNumber) {
  try {
    return _serializeReport(Controller.Report.getStudentEventHistory(sessionToken, rollNumber));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getDepartmentReport(sessionToken, department) {
  try {
    return _serializeReport(Controller.Report.getDepartmentReport(sessionToken, department));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getDepartmentComparison(sessionToken) {
  try {
    return _serializeReport(Controller.Report.getDepartmentComparison(sessionToken));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getCoordinatorReport(sessionToken, coordinatorId) {
  try {
    return _serializeReport(Controller.Report.getCoordinatorReport(sessionToken, coordinatorId));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getCoordinatorPerformance(sessionToken, coordinatorId) {
  try {
    return _serializeReport(Controller.Report.getCoordinatorPerformance(sessionToken, coordinatorId));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getCollegeRankingReport(sessionToken) {
  try {
    return _serializeReport(Controller.Report.getCollegeRankingReport(sessionToken));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getDepartmentRankingReport(sessionToken) {
  try {
    return _serializeReport(Controller.Report.getDepartmentRankingReport(sessionToken));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getDepartmentBranchRankingReport(sessionToken) {
  try {
    return _serializeReport(Controller.Report.getDepartmentBranchRankingReport(sessionToken));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getDateRangeReport(sessionToken, fromDate, toDate) {
  try {
    return _serializeReport(Controller.Report.getDateRangeReport(sessionToken, fromDate, toDate));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getMonthlyReport(sessionToken, filters) {
  try {
    return _serializeReport(Controller.Report.getMonthlyReport(sessionToken, filters));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getEventTrendReport(sessionToken, filters) {
  try {
    return _serializeReport(Controller.Report.getEventTrendReport(sessionToken, filters));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getYearWiseReport(sessionToken, year) {
  try {
    return _serializeReport(Controller.Report.getYearWiseReport(sessionToken, year));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getAttendanceDefaulters(sessionToken, filters) {
  try {
    return _serializeReport(Controller.Report.getAttendanceDefaulters(sessionToken, filters));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getTopParticipants(sessionToken, filters) {
  try {
    return _serializeReport(Controller.Report.getTopParticipants(sessionToken, filters));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getAbsentStudents(sessionToken, filters) {
  try {
    return _serializeReport(Controller.Report.getAbsentStudents(sessionToken, filters));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getCancelledEvents(sessionToken, filters) {
  try {
    return _serializeReport(Controller.Report.getCancelledEvents(sessionToken, filters));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ==========================================
// 10. Audit Logging API
// ==========================================

/**
 * Retrieves structural audit logs.
 * @param {string} sessionToken - Request session token.
 * @returns {object[]} Array of audit record logs.
 */
function getAuditLogs(sessionToken) {
  try {
    const res = Controller.Audit.getAuditLogs(sessionToken);
    return JSON.parse(JSON.stringify(res || []));
  } catch (e) {
    return [];
  }
}

// ==========================================
// 11. System Configurations Settings API
// ==========================================

/**
 * Retrieves central configurations mapping settings.
 * @param {string} sessionToken - Request session token.
 * @returns {object} Settings parameters list.
 */
function getSettings(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Settings.getSettings(sessionToken) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Updates application settings parameters payload.
 * @param {string} sessionToken - Request session token.
 * @param {object} payload - Key-value options.
 * @returns {object} Response containing execution status.
 */
function saveSettings(sessionToken, payload) {
  try {
    return JSON.parse(JSON.stringify(Controller.Settings.saveSettings(sessionToken, payload) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Flushes all registered transaction entries logs.
 * @param {string} sessionToken - Request session token.
 * @returns {object} Response status.
 */
function clearAttendanceLogs(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Settings.clearAttendanceLogs(sessionToken) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Resets database files schema configurations to default state.
 * @param {string} sessionToken - Request session token.
 * @returns {object} Response status.
 */
function resetSystem(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Settings.resetSystem(sessionToken) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ==========================================
// 12. Diagnostics Interface
// ==========================================

/**
 * Diagnostic validation execution pipeline for coordinator terminal interface status.
 */
function runCoordinatorTerminalDiagnostic() {
  Logger.log("=== RUNNING COORDINATOR TERMINAL DIAGNOSTIC ===");
  try {
    const sessions = DatabaseService.readAllRows("SESSIONS") || [];
    const activeSession = sessions.find(s => { 
      const statusCol = CONFIG.COLUMNS.SESSION_STATUS || 'Session Status';
      return String(s[statusCol]) === 'Active'; 
    });
    
    let token = "";
    if (activeSession) {
      const tokenCol = CONFIG.COLUMNS.SESSION_TOKEN || 'Session Token';
      token = activeSession[tokenCol];
      Logger.log("Found active session token: " + token);
    } else {
      const users = DatabaseService.readAllRows("USERS") || [];
      const coordUser = users.find(u => { 
        const role = u['Role'] || u.role || '';
        return String(role).toUpperCase() === 'COORDINATOR';
      });
      if (!coordUser) {
        Logger.log("❌ No Coordinator user found in USERS sheet.");
        return;
      }
      Logger.log("Found coordinator user: " + coordUser['User ID'] + " (" + coordUser['Username'] + ")");
      
      const assignments = DatabaseService.readAllRows("EVENT_COORDINATORS") || [];
      const hasAssign = assignments.some(a => {
        return String(a['User ID']).toUpperCase() === String(coordUser['User ID']).toUpperCase() && String(a['Assignment Status']) === 'Active';
      });
      if (!hasAssign) {
        Logger.log("Seeding active event assignment for test...");
        const events = DatabaseService.readAllRows("EVENTS") || [];
        if (events.length === 0) {
          Logger.log("❌ No events found to assign.");
          return;
        }
        const eventId = events[0]['Event ID'];
        CoordinatorService.assignCoordinator(eventId, coordUser['User ID'], 'Coordinator', 'System', 'Diagnostic Seed');
      }
      
      Logger.log("Creating active session for diagnostic...");
      const sessionData = AuthService._createSession(coordUser);
      const tokenCol = CONFIG.COLUMNS.SESSION_TOKEN || 'Session Token';
      token = sessionData.token[tokenCol];
      Logger.log("Created test session token: " + token);
    }
    
    Logger.log("Executing getCoordinatorTerminalData(token)...");
    const res = getCoordinatorTerminalData(token);
    Logger.log("Execution finished successfully!");
    Logger.log("Returned response keys: " + JSON.stringify(Object.keys(res)));
    Logger.log("Returned response success: " + res.success);
  } catch (e) {
    Logger.log("❌ CRITICAL ERROR DURING DIAGNOSTIC: " + e.message);
    if (e.stack) Logger.log(e.stack);
  }
  Logger.log("=== DIAGNOSTIC COMPLETE ===");
}

// ==========================================
// 12. Public Event Registration APIs
// ==========================================

/**
 * Fetches event details for public registration.
 * @param {string} eventId
 * @returns {object} Response object.
 */
function getEventDetailsForRegistration(eventId) {
  try {
    return JSON.parse(JSON.stringify(Controller.EventRegistration.getEventDetailsForRegistration(eventId) || {}));
  } catch (e) {
    Logger.log("Error in getEventDetailsForRegistration API: " + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * Looks up student eligibility and pre-fills registration details.
 * @param {string} eventId
 * @param {string} rollNumber
 * @returns {object} Response object.
 */
function getStudentForRegistration(eventId, rollNumber) {
  try {
    return JSON.parse(JSON.stringify(Controller.EventRegistration.getStudentForRegistration(eventId, rollNumber) || {}));
  } catch (e) {
    Logger.log("Error in getStudentForRegistration API: " + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * Submits a public student registration for an event.
 * @param {object} payload - Registration details and custom responses.
 * @returns {object} Response object.
 */
function submitEventRegistration(payload) {
  try {
    return JSON.parse(JSON.stringify(Controller.EventRegistration.submitEventRegistration(payload) || {}));
  } catch (e) {
    Logger.log("Error in submitEventRegistration API: " + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * Restores session from token if valid and returns active user shell html.
 * @param {string} sessionToken - Token.
 * @returns {object} Response object.
 */
function restoreSession(sessionToken) {
  try {
    const userContext = SessionService.getUserContext(sessionToken);
    if (!userContext || !userContext.userId || !userContext.active) {
      return { success: false, message: 'Session invalid or expired.' };
    }
    
    // Check role authorization for the admin dashboard shell
    const allowedRoles = [CONFIG.ROLES.SUPER_ADMIN, CONFIG.ROLES.ADMIN, CONFIG.ROLES.HOD];
    if (!allowedRoles.includes(userContext.role.toUpperCase()) && userContext.role.toUpperCase() !== 'SUPER ADMIN') {
      return { success: false, message: 'Unauthorized role.' };
    }
    
    // Render the dashboard shell HTML
    const shellHtml = HtmlService.createTemplateFromFile('Index').evaluate().getContent();
    
    // Fetch full user object
    const userRecords = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_ID || 'User ID', userContext.userId) || [];
    const fullUser = userRecords.length > 0 ? userRecords[0] : {};
    
    return {
      success: true,
      message: 'Session restored.',
      user: fullUser,
      html: shellHtml
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Marks attendance for an event (standard path).
 */
function markAttendance(attendanceData) {
  try {
    const userId = (attendanceData && (attendanceData.action_by || attendanceData.userId)) || 'Admin';
    return JSON.parse(JSON.stringify(AttendanceService.markAttendance(attendanceData, userId) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Fast Asynchronous attendance marking for instant scanner response (<50ms queue response).
 */
function markAttendanceFast(attendanceData) {
  try {
    const userId = (attendanceData && (attendanceData.action_by || attendanceData.userId)) || 'Admin';
    return JSON.parse(JSON.stringify(AttendanceService.markAttendanceFast(attendanceData, userId) || {}));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getExportTemplates(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Export.getExportTemplates(sessionToken) || []));
  } catch (e) {
    return [];
  }
}

function saveExportTemplate(sessionToken, data) {
  try {
    return JSON.parse(JSON.stringify(Controller.Export.saveExportTemplate(sessionToken, data) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function deleteExportTemplate(sessionToken, templateId) {
  try {
    return JSON.parse(JSON.stringify(Controller.Export.deleteExportTemplate(sessionToken, templateId) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function processCustomExport(sessionToken, config) {
  try {
    return JSON.parse(JSON.stringify(Controller.Export.processCustomExport(sessionToken, config) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getEventTemplates(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Enterprise.getEventTemplates(sessionToken) || []));
  } catch (e) {
    return [];
  }
}

function saveEventTemplate(sessionToken, name, config) {
  try {
    return JSON.parse(JSON.stringify(Controller.Enterprise.saveEventTemplate(sessionToken, name, config) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function cloneEvent(sessionToken, eventId, newName, newDates, newAdminId) {
  try {
    return JSON.parse(JSON.stringify(Controller.Enterprise.cloneEvent(sessionToken, eventId, newName, newDates, newAdminId) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function submitForApproval(sessionToken, eventId) {
  try {
    return JSON.parse(JSON.stringify(Controller.Enterprise.submitForApproval(sessionToken, eventId) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function approveEvent(sessionToken, eventId) {
  try {
    return JSON.parse(JSON.stringify(Controller.Enterprise.approveEvent(sessionToken, eventId) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function submitAttendanceCorrection(sessionToken, attendanceId, requestedStatus, reason) {
  try {
    return JSON.parse(JSON.stringify(Controller.Enterprise.submitAttendanceCorrection(sessionToken, attendanceId, requestedStatus, reason) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getPendingCorrections(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Enterprise.getPendingCorrections(sessionToken) || []));
  } catch (e) {
    return [];
  }
}

function approveCorrection(sessionToken, requestId) {
  try {
    return JSON.parse(JSON.stringify(Controller.Enterprise.approveCorrection(sessionToken, requestId) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function rejectCorrection(sessionToken, requestId) {
  try {
    return JSON.parse(JSON.stringify(Controller.Enterprise.rejectCorrection(sessionToken, requestId) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function runSystemHealthCheck(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.TestCenter.runSystemHealthCheck(sessionToken) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getTestHistory(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.TestCenter.getTestHistory(sessionToken) || []));
  } catch (e) {
    return [];
  }
}

function runCentralSystemTestSuite() {
  try {
    return JSON.parse(JSON.stringify(CentralSystemTestSuite.runAllTests() || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ==========================================
// Department API
// ==========================================
function getAllDepartments(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.Department.getAllDepartments(sessionToken) || []));
  } catch (e) {
    return [];
  }
}

function createDepartment(sessionToken, departmentData) {
  try {
    return JSON.parse(JSON.stringify(Controller.Department.createDepartment(sessionToken, departmentData) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function updateDepartment(sessionToken, departmentId, updates) {
  try {
    return JSON.parse(JSON.stringify(Controller.Department.updateDepartment(sessionToken, departmentId, updates) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function deleteDepartment(sessionToken, departmentId) {
  try {
    return JSON.parse(JSON.stringify(Controller.Department.deleteDepartment(sessionToken, departmentId) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getActiveDepartments(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(DepartmentService.getActiveDepartments() || []));
  } catch (e) {
    return [];
  }
}

// ==========================================
// Coordinator Terminal API Wrappers
// ==========================================
function getCoordinatorContext(sessionToken) {
  try {
    return JSON.parse(JSON.stringify(Controller.CoordinatorTerminal.getContext(sessionToken) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function processParticipant(sessionToken, rollNumber, eventId) {
  try {
    return JSON.parse(JSON.stringify(Controller.CoordinatorTerminal.processParticipant(sessionToken, rollNumber, eventId) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function confirmMarkParticipation(sessionToken, rollNumber, eventId, additionalData) {
  try {
    return JSON.parse(JSON.stringify(Controller.CoordinatorTerminal.confirmMarkParticipation(sessionToken, rollNumber, eventId, additionalData) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function spotRegisterParticipant(sessionToken, rollNumber, eventId, spotData) {
  try {
    return JSON.parse(JSON.stringify(Controller.CoordinatorTerminal.spotRegisterParticipant(sessionToken, rollNumber, eventId, spotData) || { success: false }));
  } catch (e) {
    return { success: false, message: e.message };
  }
}