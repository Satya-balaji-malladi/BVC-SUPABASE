/**
 * Integration Testing module for BVC Engineering College Event Attendance Management System.
 * For development purposes only. DO NOT use in production logic.
 */

/**
 * Tests the login functionality.
 * @param {string} usernameOrEmail 
 * @param {string} password 
 * @returns {object} Result object from AuthService.login.
 */
function testLogin(usernameOrEmail, password) {
  Logger.log('--- Executing testLogin ---');
  const result = AuthService.login({
    usernameOrEmail: usernameOrEmail,
    password: password
  });

  Logger.log('Login Result: ' + (result.success ? 'SUCCESS' : 'FAILED'));
  if (result.success) {
    Logger.log('User: ' + JSON.stringify(result.user));
    Logger.log('Session: ' + JSON.stringify(result.session));
  } else {
    Logger.log('Reason: ' + result.message);
  }
  
  return result;
}

/**
 * Tests the logout functionality.
 * @param {string} sessionToken 
 * @returns {object} Result object from AuthService.logout.
 */
function testLogout(sessionToken) {
  Logger.log('--- Executing testLogout ---');
  const result = AuthService.logout(sessionToken);
  Logger.log('Logout Result: ' + (result.success ? 'SUCCESS' : 'FAILED'));
  if (!result.success) {
    Logger.log('Reason: ' + result.message);
  }
  return result;
}

/**
 * Tests session authentication.
 * @param {string} sessionToken 
 * @returns {object} Result object from AuthService.authenticate.
 */
function testAuthenticate(sessionToken) {
  Logger.log('--- Executing testAuthenticate ---');
  const result = AuthService.authenticate(sessionToken);
  Logger.log('Authenticate Result: ' + (result.success ? 'SUCCESS' : 'FAILED'));
  if (result.success) {
    Logger.log('Authenticated User: ' + JSON.stringify(result.user));
  } else {
    Logger.log('Reason: ' + result.message);
  }
  return result;
}

/**
 * Tests the database connection and sheet access.
 * @returns {boolean} True if all sheets are accessible.
 */
function testDatabaseConnection() {
  Logger.log('--- Executing testDatabaseConnection ---');
  
  let allPassed = true;
  
  const checkSheet = (name, sheetName) => {
    const sheet = DatabaseService.getSheet(sheetName);
    if (sheet) {
      Logger.log(name + ' sheet connection: PASS');
    } else {
      Logger.log(name + ' sheet connection: FAIL');
      allPassed = false;
    }
  };

  try {
    const ss = DatabaseService.getSpreadsheet();
    if (ss) {
      Logger.log('Spreadsheet connection: PASS');
      
      checkSheet('Users', CONFIG.SHEETS.USERS);
      checkSheet('Students', CONFIG.SHEETS.STUDENTS);
      checkSheet('Events', CONFIG.SHEETS.EVENTS);
      checkSheet('Attendance', CONFIG.SHEETS.ATTENDANCE);
      checkSheet('Sessions', CONFIG.SHEETS.SESSIONS);
    } else {
      Logger.log('Spreadsheet connection: FAIL');
      allPassed = false;
    }
  } catch (e) {
    Logger.log('Database connection error: ' + e.message);
    allPassed = false;
  }
  
  return allPassed;
}

/**
 * Master integration test runner.
 * Executes DB connection, Login, Authenticate, and Logout in sequence.
 */
function runIntegrationTest() {
  Logger.log('=================================');
  Logger.log('INTEGRATION TEST STARTED');
  Logger.log('=================================');

  const results = {
    db: 'FAIL',
    login: 'FAIL',
    auth: 'FAIL',
    logout: 'FAIL',
    overall: 'FAIL'
  };

  // Step 1: Database Connection
  const dbPassed = testDatabaseConnection();
  results.db = dbPassed ? 'PASS' : 'FAIL';

  if (dbPassed) {
    // Step 2: Login
    const loginResult = testLogin("admin", "admin123");
    if (loginResult.success && loginResult.session && loginResult.session.session_token) {
      results.login = 'PASS';
      const sessionToken = loginResult.session.session_token;

      // Step 3: Authenticate
      const authResult = testAuthenticate(sessionToken);
      results.auth = authResult.success ? 'PASS' : 'FAIL';

      // Step 4: Logout
      const logoutResult = testLogout(sessionToken);
      results.logout = logoutResult.success ? 'PASS' : 'FAIL';
      
      if (results.auth === 'PASS' && results.logout === 'PASS') {
        results.overall = 'PASS';
      }
    } else {
      Logger.log('Login step failed. Skipping Authenticate and Logout.');
    }
  } else {
    Logger.log('Database connection failed. Skipping remaining tests.');
  }

  Logger.log('=================================');
  Logger.log('Database Connection : ' + results.db);
  Logger.log('Login               : ' + results.login);
  Logger.log('Authentication      : ' + results.auth);
  Logger.log('Logout              : ' + results.logout);
  Logger.log('=================================');
  Logger.log('INTEGRATION TEST ' + results.overall);
  Logger.log('=================================');
}

/**
 * Tests UserService.createUser
 * @returns {object|null} The created user or null if failed.
 */
function testCreateUser() {
  Logger.log('--- Executing testCreateUser ---');
  const ts = new Date().getTime();
  const userData = {
    full_name: 'Test Coordinator',
    username: 'testcoord_' + ts,
    email: 'testcoord_' + ts + '@example.com',
    role: CONFIG.ROLES.COORDINATOR,
    password: 'password123'
  };

  const result = UserService.createUser(userData);
  if (result.success && result.user) {
    Logger.log('Create User: PASS');
    return result.user;
  } else {
    Logger.log('Create User: FAIL - ' + result.message);
    return null;
  }
}

/**
 * Tests UserService.getUserById
 * @param {string} userId 
 * @returns {boolean}
 */
function testGetUser(userId) {
  Logger.log('--- Executing testGetUser ---');
  const user = UserService.getUserById(userId);
  if (user && user.user_id === userId) {
    Logger.log('Get User: PASS');
    return true;
  } else {
    Logger.log('Get User: FAIL');
    return false;
  }
}

/**
 * Tests UserService.getUserByUsername
 * @param {string} username 
 * @returns {boolean}
 */
function testGetUserByUsername(username) {
  Logger.log('--- Executing testGetUserByUsername ---');
  const user = UserService.getUserByUsername(username);
  if (user && user.username === username) {
    Logger.log('Get User By Username: PASS');
    return true;
  } else {
    Logger.log('Get User By Username: FAIL');
    return false;
  }
}

/**
 * Tests UserService.updateUser
 * @param {string} userId 
 * @returns {boolean}
 */
function testUpdateUser(userId) {
  Logger.log('--- Executing testUpdateUser ---');
  const newName = 'Updated Coordinator Name';
  const result = UserService.updateUser(userId, { full_name: newName });
  if (result.success && result.user && result.user.full_name === newName) {
    Logger.log('Update User: PASS');
    return true;
  } else {
    Logger.log('Update User: FAIL - ' + result.message);
    return false;
  }
}

/**
 * Tests UserService.deactivateUser
 * @param {string} userId 
 * @returns {boolean}
 */
function testDeactivateUser(userId) {
  Logger.log('--- Executing testDeactivateUser ---');
  const result = UserService.deactivateUser(userId);
  if (result.success && result.user && result.user.status === CONFIG.USER_STATUS.INACTIVE) {
    Logger.log('Deactivate User: PASS');
    return true;
  } else {
    Logger.log('Deactivate User: FAIL - ' + result.message);
    return false;
  }
}

/**
 * Tests UserService.activateUser
 * @param {string} userId 
 * @returns {boolean}
 */
function testActivateUser(userId) {
  Logger.log('--- Executing testActivateUser ---');
  const result = UserService.activateUser(userId);
  if (result.success && result.user && result.user.status === CONFIG.USER_STATUS.ACTIVE) {
    Logger.log('Activate User: PASS');
    return true;
  } else {
    Logger.log('Activate User: FAIL - ' + result.message);
    return false;
  }
}

/**
 * Tests UserService.searchUsers
 * @param {string} keyword 
 * @returns {boolean}
 */
function testSearchUsers(keyword) {
  Logger.log('--- Executing testSearchUsers ---');
  const results = UserService.searchUsers(keyword);
  if (results && results.length > 0) {
    Logger.log('Search Users: PASS');
    return true;
  } else {
    Logger.log('Search Users: FAIL');
    return false;
  }
}

/**
 * Tests UserService.deleteUser
 * @param {string} userId 
 * @returns {boolean}
 */
function testDeleteUser(userId) {
  Logger.log('--- Executing testDeleteUser ---');
  const result = UserService.deleteUser(userId);
  if (result.success) {
    // Verify it no longer exists
    const user = UserService.getUserById(userId);
    if (!user) {
      Logger.log('Delete User: PASS');
      return true;
    }
  }
  Logger.log('Delete User: FAIL - ' + result.message);
  return false;
}

/**
 * Master integration test runner for UserService.
 */
function runUserServiceIntegrationTest() {
  Logger.log('=================================');
  Logger.log('USER SERVICE INTEGRATION TEST STARTED');
  Logger.log('=================================');

  const createdUser = testCreateUser();
  if (!createdUser) {
    Logger.log('Test aborted: Create User failed.');
    Logger.log('=================================');
    return;
  }

  const userId = createdUser.user_id;
  const username = createdUser.username;

  try {
    testGetUser(userId);
    testGetUserByUsername(username);
    testUpdateUser(userId);
    testDeactivateUser(userId);
    testActivateUser(userId);
    testSearchUsers(username);
  } catch (e) {
    Logger.log('An error occurred during testing: ' + e.message);
  } finally {
    Logger.log('--- Cleanup ---');
    testDeleteUser(userId);
    Logger.log('=================================');
    Logger.log('USER SERVICE INTEGRATION TEST COMPLETE');
    Logger.log('=================================');
  }
}

/**
 * Tests StudentService.createStudent
 * @returns {object|null} The created student or null if failed.
 */
function testCreateStudent() {
  Logger.log('--- Executing testCreateStudent ---');
  const ts = new Date().getTime().toString().slice(-6);
  const roll = 'TEST' + ts;
  
  const studentData = {
    roll_number: roll,
    student_name: 'Test Student',
    department: 'CSE',
    year: '3',
    section: 'A',
    status: CONFIG.STUDENT_STATUS ? CONFIG.STUDENT_STATUS.ACTIVE : 'Active'
  };

  const result = StudentService.createStudent(studentData);
  if (result.success && result.student) {
    Logger.log('Create Student: PASS');
    return result.student;
  } else {
    Logger.log('Create Student: FAIL - ' + result.message);
    return null;
  }
}

/**
 * Tests StudentService.getStudentByRollNumber
 * @param {string} rollNumber 
 * @returns {boolean}
 */
function testGetStudent(rollNumber) {
  Logger.log('--- Executing testGetStudent ---');
  const student = StudentService.getStudentByRollNumber(rollNumber);
  const matchedRoll = student && (student.roll_number === rollNumber || student['Roll Number'] === rollNumber || student.rollNumber === rollNumber);
  if (student && matchedRoll) {
    Logger.log('Get Student: PASS');
    return true;
  } else {
    Logger.log('Get Student: FAIL');
    return false;
  }
}

/**
 * Tests StudentService.updateStudent
 * @param {string} rollNumber 
 * @returns {boolean}
 */
function testUpdateStudent(rollNumber) {
  Logger.log('--- Executing testUpdateStudent ---');
  const newName = 'Updated Test Student';
  const result = StudentService.updateStudent(rollNumber, { student_name: newName });
  if (result.success && result.student && result.student.student_name === newName) {
    Logger.log('Update Student: PASS');
    return true;
  } else {
    Logger.log('Update Student: FAIL - ' + result.message);
    return false;
  }
}

/**
 * Tests StudentService.searchStudents
 * @param {string} keyword 
 * @returns {boolean}
 */
function testSearchStudent(keyword) {
  Logger.log('--- Executing testSearchStudent ---');
  const results = StudentService.searchStudents(keyword);
  if (results && results.length > 0) {
    Logger.log('Search Student: PASS');
    return true;
  } else {
    Logger.log('Search Student: FAIL');
    return false;
  }
}

/**
 * Tests StudentService.getStudentsByDepartment
 * @returns {boolean}
 */
function testDepartmentFilter() {
  Logger.log('--- Executing testDepartmentFilter ---');
  const results = StudentService.getStudentsByDepartment('CSE');
  if (Array.isArray(results)) {
    Logger.log('Department Filter: PASS');
    return true;
  } else {
    Logger.log('Department Filter: FAIL');
    return false;
  }
}

/**
 * Tests StudentService.getStudentsByYear
 * @returns {boolean}
 */
function testYearFilter() {
  Logger.log('--- Executing testYearFilter ---');
  const results = StudentService.getStudentsByYear('3');
  if (Array.isArray(results)) {
    Logger.log('Year Filter: PASS');
    return true;
  } else {
    Logger.log('Year Filter: FAIL');
    return false;
  }
}

/**
 * Tests StudentService.getStudentsBySection
 * @returns {boolean}
 */
function testSectionFilter() {
  Logger.log('--- Executing testSectionFilter ---');
  const results = StudentService.getStudentsBySection('A');
  if (Array.isArray(results)) {
    Logger.log('Section Filter: PASS');
    return true;
  } else {
    Logger.log('Section Filter: FAIL');
    return false;
  }
}

/**
 * Tests StudentService.deleteStudent
 * @param {string} rollNumber 
 * @returns {boolean}
 */
function testDeleteStudent(rollNumber) {
  Logger.log('--- Executing testDeleteStudent ---');
  const result = StudentService.deleteStudent(rollNumber);
  if (result.success) {
    const student = StudentService.getStudentByRollNumber(rollNumber);
    if (!student) {
      Logger.log('Delete Student: PASS');
      return true;
    }
  }
  Logger.log('Delete Student: FAIL - ' + result.message);
  return false;
}

/**
 * Master integration test runner for StudentService.
 */
function runStudentServiceIntegrationTest() {
  Logger.log('=================================');
  Logger.log('STUDENT SERVICE INTEGRATION TEST STARTED');
  Logger.log('=================================');

  const createdStudent = testCreateStudent();
  if (!createdStudent) {
    Logger.log('Test aborted: Create Student failed.');
    Logger.log('=================================');
    return;
  }

  const rollNumber = createdStudent.roll_number;

  try {
    testGetStudent(rollNumber);
    testUpdateStudent(rollNumber);
    testSearchStudent(rollNumber);
    testDepartmentFilter();
    testYearFilter();
    testSectionFilter();
  } catch (e) {
    Logger.log('An error occurred during testing: ' + e.message);
  } finally {
    Logger.log('--- Cleanup ---');
    testDeleteStudent(rollNumber);
    Logger.log('=================================');
    Logger.log('STUDENT SERVICE INTEGRATION TEST COMPLETE');
    Logger.log('=================================');
  }
}

/**
 * Tests EventService.createEvent
 * @returns {object|null} The created event or null if failed.
 */
function testCreateEvent() {
  Logger.log('--- Executing testCreateEvent ---');
  const ts = new Date().getTime();
  const eventName = 'Test Event ' + ts;
  
  // Tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const eventDate = Utils.formatDate(tomorrow);

  const eventData = {
    event_name: eventName,
    event_date: eventDate,
    venue: 'Seminar Hall',
    coordinator_id: 'USR-001',
    status: CONFIG.EVENT_STATUS.UPCOMING
  };

  const result = EventService.createEvent(eventData);
  if (result.success && result.event) {
    Logger.log('Create Event: PASS');
    return result.event;
  } else {
    Logger.log('Create Event: FAIL - ' + result.message);
    return null;
  }
}

/**
 * Tests EventService.getEventById
 * @param {string} eventId 
 * @returns {boolean}
 */
function testGetEvent(eventId) {
  Logger.log('--- Executing testGetEvent ---');
  const event = EventService.getEventById(eventId);
  if (event && event.event_id === eventId) {
    Logger.log('Get Event: PASS');
    return true;
  } else {
    Logger.log('Get Event: FAIL');
    return false;
  }
}

/**
 * Tests EventService.updateEvent
 * @param {string} eventId 
 * @returns {boolean}
 */
function testUpdateEvent(eventId) {
  Logger.log('--- Executing testUpdateEvent ---');
  const result = EventService.updateEvent(eventId, { venue: 'Main Auditorium' });
  // venue is capitalized by service to 'Main Auditorium'
  if (result.success && result.event && result.event.venue === 'Main Auditorium') {
    Logger.log('Update Event: PASS');
    return true;
  } else {
    Logger.log('Update Event: FAIL - ' + result.message);
    return false;
  }
}

/**
 * Tests EventService.searchEvents
 * @param {string} keyword 
 * @returns {boolean}
 */
function testSearchEvent(keyword) {
  Logger.log('--- Executing testSearchEvent ---');
  const results = EventService.searchEvents(keyword);
  if (results && results.length > 0) {
    Logger.log('Search Event: PASS');
    return true;
  } else {
    Logger.log('Search Event: FAIL');
    return false;
  }
}

/**
 * Tests EventService.getEventsByCoordinator
 * @returns {boolean}
 */
function testGetEventsByCoordinator() {
  Logger.log('--- Executing testGetEventsByCoordinator ---');
  const results = EventService.getEventsByCoordinator('USR-001');
  if (Array.isArray(results)) {
    Logger.log('Get Events By Coordinator: PASS');
    return true;
  } else {
    Logger.log('Get Events By Coordinator: FAIL');
    return false;
  }
}

/**
 * Tests EventService.getEventsByStatus
 * @returns {boolean}
 */
function testGetEventsByStatus() {
  Logger.log('--- Executing testGetEventsByStatus ---');
  const results = EventService.getEventsByStatus(CONFIG.EVENT_STATUS.UPCOMING);
  if (Array.isArray(results)) {
    Logger.log('Get Events By Status: PASS');
    return true;
  } else {
    Logger.log('Get Events By Status: FAIL');
    return false;
  }
}

/**
 * Tests EventService.getEventsByDate
 * @param {string} eventDate 
 * @returns {boolean}
 */
function testGetEventsByDate(eventDate) {
  Logger.log('--- Executing testGetEventsByDate ---');
  const results = EventService.getEventsByDate(eventDate);
  if (Array.isArray(results) && results.length > 0) {
    Logger.log('Get Events By Date: PASS');
    return true;
  } else {
    Logger.log('Get Events By Date: FAIL');
    return false;
  }
}

/**
 * Tests EventService.completeEvent
 * @param {string} eventId 
 * @returns {boolean}
 */
function testCompleteEvent(eventId) {
  Logger.log('--- Executing testCompleteEvent ---');
  const result = EventService.completeEvent(eventId);
  if (result.success || result.message === CONFIG.MESSAGES.EVENT_ALREADY_COMPLETED) {
    const event = EventService.getEventById(eventId);
    if (event && event.status === CONFIG.EVENT_STATUS.COMPLETED) {
      Logger.log('Complete Event: PASS');
      return true;
    }
  }
  Logger.log('Complete Event: FAIL - ' + (result ? result.message : 'Unknown'));
  return false;
}

/**
 * Tests EventService.activateEvent
 * @param {string} eventId 
 * @returns {boolean}
 */
function testActivateEvent(eventId) {
  Logger.log('--- Executing testActivateEvent ---');
  const result = EventService.activateEvent(eventId);
  if (result.success || result.message === CONFIG.MESSAGES.EVENT_ALREADY_UPCOMING) {
    const event = EventService.getEventById(eventId);
    if (event && event.status === CONFIG.EVENT_STATUS.UPCOMING) {
      Logger.log('Activate Event: PASS');
      return true;
    }
  }
  Logger.log('Activate Event: FAIL - ' + (result ? result.message : 'Unknown'));
  return false;
}

/**
 * Tests EventService.deleteEvent
 * @param {string} eventId 
 * @returns {boolean}
 */
function testDeleteEvent(eventId) {
  Logger.log('--- Executing testDeleteEvent ---');
  const result = EventService.deleteEvent(eventId);
  if (result.success) {
    const event = EventService.getEventById(eventId);
    if (!event) {
      Logger.log('Delete Event: PASS');
      return true;
    }
  }
  Logger.log('Delete Event: FAIL - ' + result.message);
  return false;
}

/**
 * Master integration test runner for EventService.
 */
function runEventServiceIntegrationTest() {
  Logger.log('=================================');
  Logger.log('EVENT SERVICE INTEGRATION TEST STARTED');
  Logger.log('=================================');

  const createdEvent = testCreateEvent();
  if (!createdEvent) {
    Logger.log('Test aborted: Create Event failed.');
    Logger.log('=================================');
    return;
  }

  const eventId = createdEvent.event_id;
  const eventName = createdEvent.event_name;
  const eventDate = createdEvent.event_date;

  try {
    testGetEvent(eventId);
    testUpdateEvent(eventId);
    testSearchEvent(eventName);
    testGetEventsByCoordinator();
    testGetEventsByStatus();
    testGetEventsByDate(eventDate);
    testCompleteEvent(eventId);
    testActivateEvent(eventId);
  } catch (e) {
    Logger.log('An error occurred during testing: ' + e.message);
  } finally {
    Logger.log('--- Cleanup ---');
    testDeleteEvent(eventId);
    Logger.log('=================================');
    Logger.log('EVENT SERVICE INTEGRATION TEST COMPLETE');
    Logger.log('=================================');
  }
}

/**
 * Tests AttendanceService.markAttendance
 * @param {string} eventId 
 * @param {string} rollNumber 
 * @returns {object|null} The created attendance object.
 */
function testMarkAttendance(eventId, rollNumber) {
  Logger.log('--- Executing testMarkAttendance ---');
  const result = AttendanceService.markAttendance({
    event_id: eventId,
    roll_number: rollNumber,
    status: CONFIG.ATTENDANCE_STATUS.PRESENT
  });
  
  if (result.success && result.attendance) {
    Logger.log('Mark Attendance: PASS');
    return result.attendance;
  } else {
    Logger.log('Mark Attendance: FAIL - ' + result.message);
    return null;
  }
}

/**
 * Tests duplicate attendance prevention.
 * @param {string} eventId 
 * @param {string} rollNumber 
 * @returns {boolean}
 */
function testDuplicateAttendance(eventId, rollNumber) {
  Logger.log('--- Executing testDuplicateAttendance ---');
  const result = AttendanceService.markAttendance({
    event_id: eventId,
    roll_number: rollNumber,
    status: CONFIG.ATTENDANCE_STATUS.PRESENT
  });
  
  if (!result.success && result.message === CONFIG.MESSAGES.ATTENDANCE_ALREADY_EXISTS) {
    Logger.log('Duplicate Attendance: PASS');
    return true;
  } else {
    Logger.log('Duplicate Attendance: FAIL - Expected ALREADY_EXISTS');
    return false;
  }
}

/**
 * Tests AttendanceService.getAttendanceById
 * @param {string} attendanceId 
 * @returns {boolean}
 */
function testGetAttendance(attendanceId) {
  Logger.log('--- Executing testGetAttendance ---');
  const record = AttendanceService.getAttendanceById(attendanceId);
  if (record && record.attendance_id === attendanceId) {
    Logger.log('Get Attendance: PASS');
    return true;
  } else {
    Logger.log('Get Attendance: FAIL');
    return false;
  }
}

/**
 * Tests AttendanceService.getAttendanceByEvent
 * @param {string} eventId 
 * @returns {boolean}
 */
function testGetAttendanceByEvent(eventId) {
  Logger.log('--- Executing testGetAttendanceByEvent ---');
  const records = AttendanceService.getAttendanceByEvent(eventId);
  if (Array.isArray(records) && records.length > 0) {
    Logger.log('Get Attendance By Event: PASS');
    return true;
  } else {
    Logger.log('Get Attendance By Event: FAIL');
    return false;
  }
}

/**
 * Tests AttendanceService.getAttendanceByStudent
 * @param {string} rollNumber 
 * @returns {boolean}
 */
function testGetAttendanceByStudent(rollNumber) {
  Logger.log('--- Executing testGetAttendanceByStudent ---');
  const records = AttendanceService.getAttendanceByStudent(rollNumber);
  if (Array.isArray(records) && records.length > 0) {
    Logger.log('Get Attendance By Student: PASS');
    return true;
  } else {
    Logger.log('Get Attendance By Student: FAIL');
    return false;
  }
}

/**
 * Tests AttendanceService.getAttendanceByDate
 * @param {string} date 
 * @returns {boolean}
 */
function testGetAttendanceByDate(date) {
  Logger.log('--- Executing testGetAttendanceByDate ---');
  const records = AttendanceService.getAttendanceByDate(date);
  if (Array.isArray(records) && records.length > 0) {
    Logger.log('Get Attendance By Date: PASS');
    return true;
  } else {
    Logger.log('Get Attendance By Date: FAIL');
    return false;
  }
}

/**
 * Tests AttendanceService.getAttendanceByStatus
 * @param {string} status 
 * @returns {boolean}
 */
function testGetAttendanceByStatus(status) {
  Logger.log('--- Executing testGetAttendanceByStatus ---');
  const records = AttendanceService.getAttendanceByStatus(status);
  if (Array.isArray(records) && records.length > 0) {
    Logger.log('Get Attendance By Status: PASS');
    return true;
  } else {
    Logger.log('Get Attendance By Status: FAIL');
    return false;
  }
}

/**
 * Tests AttendanceService.getEventAttendanceCount
 * @param {string} eventId 
 * @returns {boolean}
 */
function testEventAttendanceCount(eventId) {
  Logger.log('--- Executing testEventAttendanceCount ---');
  const counts = AttendanceService.getEventAttendanceCount(eventId);
  if (counts && counts.total !== undefined && counts.present !== undefined && counts.absent !== undefined) {
    Logger.log('Event Attendance Count: PASS');
    return true;
  } else {
    Logger.log('Event Attendance Count: FAIL');
    return false;
  }
}

/**
 * Tests AttendanceService.getStudentAttendanceCount
 * @param {string} rollNumber 
 * @returns {boolean}
 */
function testStudentAttendanceCount(rollNumber) {
  Logger.log('--- Executing testStudentAttendanceCount ---');
  const count = AttendanceService.getStudentAttendanceCount(rollNumber);
  if (typeof count === 'number' && count > 0) {
    Logger.log('Student Attendance Count: PASS');
    return true;
  } else {
    Logger.log('Student Attendance Count: FAIL');
    return false;
  }
}

/**
 * Tests AttendanceService.getStudentAttendanceSummary
 * @param {string} rollNumber 
 * @returns {boolean}
 */
function testStudentAttendanceSummary(rollNumber) {
  Logger.log('--- Executing testStudentAttendanceSummary ---');
  const summary = AttendanceService.getStudentAttendanceSummary(rollNumber);
  if (summary && summary.totalEvents !== undefined && summary.present !== undefined && summary.absent !== undefined) {
    Logger.log('Student Attendance Summary: PASS');
    return true;
  } else {
    Logger.log('Student Attendance Summary: FAIL');
    return false;
  }
}

/**
 * Tests AttendanceService.getOverallAttendanceStatistics
 * @returns {boolean}
 */
function testOverallAttendanceStatistics() {
  Logger.log('--- Executing testOverallAttendanceStatistics ---');
  const stats = AttendanceService.getOverallAttendanceStatistics();
  if (stats && stats.totalAttendance !== undefined && stats.present !== undefined && stats.absent !== undefined && stats.attendancePercentage !== undefined) {
    Logger.log('Overall Attendance Statistics: PASS');
    return true;
  } else {
    Logger.log('Overall Attendance Statistics: FAIL');
    return false;
  }
}

/**
 * Tests AttendanceService.getAttendanceSummaryByEvent
 * @param {string} eventId 
 * @returns {boolean}
 */
function testAttendanceSummaryByEvent(eventId) {
  Logger.log('--- Executing testAttendanceSummaryByEvent ---');
  const summary = AttendanceService.getAttendanceSummaryByEvent(eventId);
  if (summary && summary.eventId === eventId && summary.eventName !== undefined && summary.total !== undefined && summary.present !== undefined && summary.absent !== undefined) {
    Logger.log('Attendance Summary By Event: PASS');
    return true;
  } else {
    Logger.log('Attendance Summary By Event: FAIL');
    return false;
  }
}

/**
 * Tests AttendanceService.deleteAttendance
 * @param {string} attendanceId 
 * @returns {boolean}
 */
function testDeleteAttendance(attendanceId) {
  Logger.log('--- Executing testDeleteAttendance ---');
  const result = AttendanceService.deleteAttendance(attendanceId);
  if (result.success) {
    const record = AttendanceService.getAttendanceById(attendanceId);
    if (!record) {
      Logger.log('Delete Attendance: PASS');
      return true;
    }
  }
  Logger.log('Delete Attendance: FAIL - ' + result.message);
  return false;
}

/**
 * Master integration test runner for AttendanceService.
 */
function runAttendanceServiceIntegrationTest() {
  Logger.log('=================================');
  Logger.log('ATTENDANCE SERVICE INTEGRATION TEST STARTED');
  Logger.log('=================================');

  // Step 1: Database prerequisites
  const student = testCreateStudent();
  const event = testCreateEvent();

  if (!student || !event) {
    Logger.log('Test aborted: Prerequisites failed to create.');
    if (student) testDeleteStudent(student.roll_number);
    if (event) testDeleteEvent(event.event_id);
    Logger.log('=================================');
    return;
  }

  const rollNumber = student.roll_number;
  const eventId = event.event_id;
  let attendanceId = null;

  try {
    // Step 2: Mark Attendance
    const attendance = testMarkAttendance(eventId, rollNumber);
    if (!attendance) {
      Logger.log('Test aborted: Mark Attendance failed.');
      return;
    }
    
    attendanceId = attendance.attendance_id;
    const today = Utils.formatDate(Utils.getCurrentDate());

    // Steps 3-13
    testDuplicateAttendance(eventId, rollNumber);
    testGetAttendance(attendanceId);
    testGetAttendanceByEvent(eventId);
    testGetAttendanceByStudent(rollNumber);
    testGetAttendanceByDate(today);
    testGetAttendanceByStatus(CONFIG.ATTENDANCE_STATUS.PRESENT);
    testEventAttendanceCount(eventId);
    testStudentAttendanceCount(rollNumber);
    testStudentAttendanceSummary(rollNumber);
    testOverallAttendanceStatistics();
    testAttendanceSummaryByEvent(eventId);

  } catch (e) {
    Logger.log('An error occurred during testing: ' + e.message);
  } finally {
    Logger.log('--- Cleanup ---');
    // Step 14: Delete Attendance
    if (attendanceId) {
      testDeleteAttendance(attendanceId);
    }
    // Cleanup prerequisites
    testDeleteStudent(rollNumber);
    testDeleteEvent(eventId);
    
    Logger.log('=================================');
    Logger.log('ATTENDANCE SERVICE INTEGRATION TEST COMPLETE');
    Logger.log('=================================');
  }
}

/**
 * Tests ReportService.getDashboardSummary
 * @returns {boolean}
 */
function testDashboardSummary() {
  Logger.log('--- Executing testDashboardSummary ---');
  const result = ReportService.getDashboardSummary();
  if (result.success && result.report) {
    const r = result.report;
    if (r.totalStudents !== undefined && r.totalEvents !== undefined && r.totalAttendance !== undefined && 
        r.totalPresent !== undefined && r.totalAbsent !== undefined && r.attendancePercentage !== undefined) {
      Logger.log('Dashboard Summary: PASS');
      return true;
    }
  }
  Logger.log('Dashboard Summary: FAIL - ' + result.message);
  return false;
}

/**
 * Tests ReportService.getEventReport
 * @param {string} eventId 
 * @returns {boolean}
 */
function testEventReport(eventId) {
  Logger.log('--- Executing testEventReport ---');
  const result = ReportService.getEventReport(eventId);
  if (result.success && result.report) {
    const r = result.report;
    if (r.eventId === eventId && r.eventName !== undefined && r.venue !== undefined && 
        r.eventDate !== undefined && r.coordinatorId !== undefined && r.status !== undefined && 
        r.totalAttendance !== undefined && r.present !== undefined && r.absent !== undefined && 
        r.attendancePercentage !== undefined) {
      Logger.log('Event Report: PASS');
      return true;
    }
  }
  Logger.log('Event Report: FAIL - ' + result.message);
  return false;
}

/**
 * Tests ReportService.getStudentReport
 * @param {string} rollNumber 
 * @returns {boolean}
 */
function testStudentReport(rollNumber) {
  Logger.log('--- Executing testStudentReport ---');
  const result = ReportService.getStudentReport(rollNumber);
  if (result.success && result.report) {
    const r = result.report;
    if (r.rollNumber === rollNumber && r.studentName !== undefined && r.department !== undefined && 
        r.year !== undefined && r.section !== undefined && r.status !== undefined && 
        r.totalEvents !== undefined && r.present !== undefined && r.absent !== undefined && 
        r.attendancePercentage !== undefined) {
      Logger.log('Student Report: PASS');
      return true;
    }
  }
  Logger.log('Student Report: FAIL - ' + result.message);
  return false;
}

/**
 * Tests ReportService.getDepartmentReport
 * @returns {boolean}
 */
function testDepartmentReport() {
  Logger.log('--- Executing testDepartmentReport ---');
  const result = ReportService.getDepartmentReport('CSE');
  if (result.success && result.report) {
    const r = result.report;
    if (r.department === 'CSE' && r.totalStudents !== undefined && r.totalAttendance !== undefined && 
        r.present !== undefined && r.absent !== undefined && r.attendancePercentage !== undefined) {
      Logger.log('Department Report: PASS');
      return true;
    }
  }
  Logger.log('Department Report: FAIL - ' + result.message);
  return false;
}

/**
 * Tests ReportService.getYearWiseReport
 * @param {string|number} year
 * @returns {boolean}
 */
function testYearWiseReport(year) {
  Logger.log('--- Executing testYearWiseReport ---');
  const result = ReportService.getYearWiseReport(year);
  if (result.success && result.report) {
    const r = result.report;
    if (r.year === String(year) && r.totalStudents !== undefined && r.totalAttendance !== undefined && 
        r.present !== undefined && r.absent !== undefined && r.attendancePercentage !== undefined) {
      Logger.log('Year Wise Report: PASS');
      return true;
    }
  }
  Logger.log('Year Wise Report: FAIL - ' + result.message);
  return false;
}

/**
 * Tests ReportService.getSectionReport
 * @returns {boolean}
 */
function testSectionReport() {
  Logger.log('--- Executing testSectionReport ---');
  const result = ReportService.getSectionReport('A');
  if (result.success && result.report) {
    const r = result.report;
    if (r.section === 'A' && r.totalStudents !== undefined && r.totalAttendance !== undefined && 
        r.present !== undefined && r.absent !== undefined && r.attendancePercentage !== undefined) {
      Logger.log('Section Report: PASS');
      return true;
    }
  }
  Logger.log('Section Report: FAIL - ' + result.message);
  return false;
}

/**
 * Tests ReportService.getDateWiseReport
 * @returns {boolean}
 */
function testDateWiseReport() {
  Logger.log('--- Executing testDateWiseReport ---');
  const today = Utils.formatDate(Utils.getCurrentDate());
  const result = ReportService.getDateWiseReport(today);
  if (result.success && result.report) {
    const r = result.report;
    if (r.date === today && r.totalAttendance !== undefined && r.present !== undefined && 
        r.absent !== undefined && r.attendancePercentage !== undefined) {
      Logger.log('Date Wise Report: PASS');
      return true;
    }
  }
  Logger.log('Date Wise Report: FAIL - ' + result.message);
  return false;
}

/**
 * Tests ReportService.getOverallAttendanceReport
 * @returns {boolean}
 */
function testOverallAttendanceReport() {
  Logger.log('--- Executing testOverallAttendanceReport ---');
  const result = ReportService.getOverallAttendanceReport();
  if (result.success && result.report) {
    const r = result.report;
    if (r.totalStudents !== undefined && r.totalEvents !== undefined && 
        r.totalAttendance !== undefined && r.attendancePercentage !== undefined) {
      Logger.log('Overall Attendance Report: PASS');
      return true;
    }
  }
  Logger.log('Overall Attendance Report: FAIL - ' + result.message);
  return false;
}

/**
 * Tests ReportService.getCoordinatorReport
 * @returns {boolean}
 */
function testCoordinatorReport() {
  Logger.log('--- Executing testCoordinatorReport ---');
  const result = ReportService.getCoordinatorReport('USR-001');
  if (result.success && result.report) {
    const r = result.report;
    if (r.coordinatorId === 'USR-001' && r.coordinatorName !== undefined && 
        r.totalEvents !== undefined && r.totalAttendance !== undefined && 
        r.present !== undefined && r.absent !== undefined && r.attendancePercentage !== undefined) {
      Logger.log('Coordinator Report: PASS');
      return true;
    }
  }
  Logger.log('Coordinator Report: FAIL - ' + result.message);
  return false;
}

/**
 * Master integration test runner for ReportService.
 */
function runReportServiceIntegrationTest() {
  Logger.log('=================================');
  Logger.log('REPORT SERVICE INTEGRATION TEST STARTED');
  Logger.log('=================================');

  // Step 1 & 2: Database prerequisites
  const student = testCreateStudent();
  const event = testCreateEvent();

  if (!student || !event) {
    Logger.log('Test aborted: Prerequisites failed to create.');
    if (student) testDeleteStudent(student.roll_number);
    if (event) testDeleteEvent(event.event_id);
    Logger.log('=================================');
    return;
  }

  const rollNumber = student.roll_number;
  const eventId = event.event_id;
  let attendanceId = null;

  try {
    // Step 3: Mark Attendance
    const attendance = testMarkAttendance(eventId, rollNumber);
    if (!attendance) {
      Logger.log('Test aborted: Mark Attendance failed.');
      return;
    }
    attendanceId = attendance.attendance_id;

    // Steps 4-12
    testDashboardSummary();
    testEventReport(eventId);
    testStudentReport(rollNumber);
    testDepartmentReport();
    testYearWiseReport(student.year);
    testSectionReport();
    testDateWiseReport();
    testOverallAttendanceReport();
    testCoordinatorReport();

  } catch (e) {
    Logger.log('An error occurred during testing: ' + e.message);
  } finally {
    Logger.log('--- Cleanup ---');
    // Step 13: Cleanup
    if (attendanceId) {
      testDeleteAttendance(attendanceId);
    }
    testDeleteEvent(eventId);
    testDeleteStudent(rollNumber);
    
    Logger.log('=================================');
    Logger.log('REPORT SERVICE INTEGRATION TEST COMPLETE');
    Logger.log('=================================');
  }
}

/**
 * Master integration test runner for the Controller layer.
 */
function runControllerIntegrationTest() {
  Logger.log('=================================');
  Logger.log('CONTROLLER INTEGRATION TEST STARTED');
  Logger.log('=================================');

  const ts = new Date().getTime();
  
  let sessionToken = null;
  let userId = null;
  const username = 'ctrl_user_' + ts;
  
  let rollNumber = 'CTRL' + ts.toString().slice(-6);
  let eventId = null;
  let attendanceId = null;

  const logResult = (name, result, expectedCondition) => {
    let success = false;
    if (typeof expectedCondition === 'function') {
      success = expectedCondition(result);
    } else if (result && result.success !== undefined) {
      success = result.success === expectedCondition;
    } else if (result) {
      success = true;
    }

    if (success) {
      Logger.log(name + ' : PASS');
    } else {
      const msg = result && result.message ? result.message : 'Condition not met';
      Logger.log(name + ' : FAIL - ' + msg);
    }
    return success;
  };

  try {
    // ------------------------------------------
    // 1. Authentication Controller
    // ------------------------------------------
    Logger.log('--- 1. Authentication Controller ---');
    
    // Using admin to login initially if possible or just standard test user
    // We assume an admin exists for testing:
    const loginResult = Controller.Auth.login({ usernameOrEmail: 'admin', password: 'admin123' });
    if (logResult('Test Login', loginResult, true)) {
      sessionToken = loginResult.session.session_token;
    }

    if (sessionToken) {
      const authResult = Controller.Auth.authenticate(sessionToken);
      logResult('Test Authenticate', authResult, true);
    } else {
      Logger.log('Skipping Authenticate: No Session Token');
    }

    // ------------------------------------------
    // 2. User Controller
    // ------------------------------------------
    Logger.log('--- 2. User Controller ---');
    
    const createUserResult = Controller.User.createUser({
      full_name: 'Ctrl Test User',
      username: username,
      email: username + '@example.com',
      role: 'Coordinator',
      password: 'password123'
    });
    
    if (logResult('Create User', createUserResult, true)) {
      userId = createUserResult.user.user_id;
    }

    if (userId) {
      const getUser = Controller.User.getUserById(userId);
      logResult('Get User', getUser, (r) => r && r.user_id === userId);

      const getUserByUsername = Controller.User.getUserByUsername(username);
      logResult('Get User By Username', getUserByUsername, (r) => r && r.username === username);

      const updateUser = Controller.User.updateUser(userId, { full_name: 'Updated Ctrl User' });
      logResult('Update User', updateUser, true);

      const deactivateUser = Controller.User.deactivateUser(userId);
      logResult('Deactivate User', deactivateUser, true);

      const activateUser = Controller.User.activateUser(userId);
      logResult('Activate User', activateUser, true);

      const searchUser = Controller.User.searchUsers(username);
      logResult('Search User', searchUser, (r) => Array.isArray(r) && r.length > 0);

      const allUsers = Controller.User.getAllUsers();
      logResult('Get All Users', allUsers, (r) => Array.isArray(r));
    } else {
      Logger.log('Skipping User tests: Create User failed');
    }

    // ------------------------------------------
    // 3. Student Controller
    // ------------------------------------------
    Logger.log('--- 3. Student Controller ---');

    const createStudentResult = Controller.Student.createStudent({
      roll_number: rollNumber,
      student_name: 'Ctrl Student',
      department: 'CSE',
      year: '3',
      section: 'A',
      status: 'Active'
    });
    
    logResult('Create Student', createStudentResult, true);

    const getStudent = Controller.Student.getStudentByRollNumber(rollNumber);
    logResult('Get Student', getStudent, (r) => r && r.roll_number === rollNumber);

    const updateStudent = Controller.Student.updateStudent(rollNumber, { student_name: 'Updated Ctrl Student' });
    logResult('Update Student', updateStudent, true);

    const searchStudent = Controller.Student.searchStudents(rollNumber);
    logResult('Search Student', searchStudent, (r) => Array.isArray(r) && r.length > 0);

    const deptFilter = Controller.Student.getStudentsByDepartment('CSE');
    logResult('Department Filter', deptFilter, (r) => Array.isArray(r));

    const yearFilter = Controller.Student.getStudentsByYear('3');
    logResult('Year Filter', yearFilter, (r) => Array.isArray(r));

    const sectionFilter = Controller.Student.getStudentsBySection('A');
    logResult('Section Filter', sectionFilter, (r) => Array.isArray(r));

    const allStudents = Controller.Student.getAllStudents();
    logResult('Get All Students', allStudents, (r) => Array.isArray(r));

    // ------------------------------------------
    // 4. Event Controller
    // ------------------------------------------
    Logger.log('--- 4. Event Controller ---');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const eventDate = Utils.formatDate(tomorrow);

    const createEventResult = Controller.Event.createEvent({
      event_name: 'Ctrl Event ' + ts,
      event_date: eventDate,
      venue: 'Ctrl Hall',
      coordinator_id: userId || 'USR-001',
      status: 'Upcoming'
    });

    if (logResult('Create Event', createEventResult, true)) {
      eventId = createEventResult.event.event_id;
    }

    if (eventId) {
      const getEvent = Controller.Event.getEventById(eventId);
      logResult('Get Event', getEvent, (r) => r && r.event_id === eventId);

      const updateEvent = Controller.Event.updateEvent(eventId, { venue: 'Updated Hall' });
      logResult('Update Event', updateEvent, true);

      const searchEvent = Controller.Event.searchEvents('Ctrl Event');
      logResult('Search Event', searchEvent, (r) => Array.isArray(r) && r.length > 0);

      const evCoord = Controller.Event.getEventsByCoordinator(userId || 'USR-001');
      logResult('Get Events By Coordinator', evCoord, (r) => Array.isArray(r));

      const evStatus = Controller.Event.getEventsByStatus('Upcoming');
      logResult('Get Events By Status', evStatus, (r) => Array.isArray(r));

      const evDate = Controller.Event.getEventsByDate(eventDate);
      logResult('Get Events By Date', evDate, (r) => Array.isArray(r));

      const completeEv = Controller.Event.completeEvent(eventId);
      logResult('Complete Event', completeEv, true);

      const activateEv = Controller.Event.activateEvent(eventId);
      logResult('Activate Event', activateEv, true);
    } else {
      Logger.log('Skipping Event tests: Create Event failed');
    }

    // ------------------------------------------
    // 5. Attendance Controller
    // ------------------------------------------
    Logger.log('--- 5. Attendance Controller ---');

    if (eventId && rollNumber) {
      const markAtt = Controller.Attendance.markAttendance({
        event_id: eventId,
        roll_number: rollNumber,
        status: 'Present'
      });

      if (logResult('Mark Attendance', markAtt, true)) {
        attendanceId = markAtt.attendance.attendance_id;
      }

      const dupAtt = Controller.Attendance.markAttendance({
        event_id: eventId,
        roll_number: rollNumber,
        status: 'Present'
      });
      logResult('Duplicate Attendance', dupAtt, false);

      if (attendanceId) {
        const getAtt = Controller.Attendance.getAttendanceById(attendanceId);
        logResult('Get Attendance', getAtt, (r) => r && r.attendance_id === attendanceId);
      }

      const attByEv = Controller.Attendance.getAttendanceByEvent(eventId);
      logResult('Get Attendance By Event', attByEv, (r) => Array.isArray(r));

      const attByStu = Controller.Attendance.getAttendanceByStudent(rollNumber);
      logResult('Get Attendance By Student', attByStu, (r) => Array.isArray(r));

      const todayStr = Utils.formatDate(Utils.getCurrentDate());
      const attByDate = Controller.Attendance.getAttendanceByDate(todayStr);
      logResult('Get Attendance By Date', attByDate, (r) => Array.isArray(r));

      const attByStatus = Controller.Attendance.getAttendanceByStatus('Present');
      logResult('Get Attendance By Status', attByStatus, (r) => Array.isArray(r));

      const evCount = Controller.Attendance.getEventAttendanceCount(eventId);
      logResult('Event Attendance Count', evCount, (r) => r && r.total !== undefined);

      const stuCount = Controller.Attendance.getStudentAttendanceCount(rollNumber);
      logResult('Student Attendance Count', stuCount, (r) => typeof r === 'number');

      const stuSumm = Controller.Attendance.getStudentAttendanceSummary(rollNumber);
      logResult('Student Attendance Summary', stuSumm, (r) => r && r.totalEvents !== undefined);

      const overallStat = Controller.Attendance.getOverallAttendanceStatistics();
      logResult('Overall Attendance Statistics', overallStat, (r) => r && r.totalAttendance !== undefined);

      const summByEv = Controller.Attendance.getAttendanceSummaryByEvent(eventId);
      logResult('Attendance Summary By Event', summByEv, (r) => r && r.eventId === eventId);
    } else {
      Logger.log('Skipping Attendance tests: Event or Student missing');
    }

    // ------------------------------------------
    // 6. Report Controller
    // ------------------------------------------
    Logger.log('--- 6. Report Controller ---');

    const dashSumm = Controller.Report.getDashboardSummary();
    logResult('Dashboard Summary', dashSumm, true);

    if (eventId) {
      const evRep = Controller.Report.getEventReport(eventId);
      logResult('Event Report', evRep, true);
    }

    if (rollNumber) {
      const stuRep = Controller.Report.getStudentReport(rollNumber);
      logResult('Student Report', stuRep, true);
      
      const yrRep = Controller.Report.getYearWiseReport('3');
      logResult('Year Wise Report', yrRep, true);
    }

    const deptRep = Controller.Report.getDepartmentReport('CSE');
    logResult('Department Report', deptRep, true);

    const secRep = Controller.Report.getSectionReport('A');
    logResult('Section Report', secRep, true);

    const todayStr = Utils.formatDate(Utils.getCurrentDate());
    const dateRep = Controller.Report.getDateWiseReport(todayStr);
    logResult('Date Wise Report', dateRep, true);

    const overallRep = Controller.Report.getOverallAttendanceReport();
    logResult('Overall Attendance Report', overallRep, true);

    if (userId) {
      const coordRep = Controller.Report.getCoordinatorReport(userId);
      logResult('Coordinator Report', coordRep, true);
    }

    // ------------------------------------------
    // 7. Logout
    // ------------------------------------------
    Logger.log('--- 7. Logout ---');
    if (sessionToken) {
      const logoutRes = Controller.Auth.logout(sessionToken);
      logResult('Logout', logoutRes, true);
    } else {
      Logger.log('Skipping Logout: No Session Token');
    }

  } catch (error) {
    Logger.log('An error occurred during Controller test execution: ' + error.message);
  } finally {
    Logger.log('--- Cleanup ---');
    if (attendanceId) Controller.Attendance.deleteAttendance(attendanceId);
    if (eventId) Controller.Event.deleteEvent(eventId);
    if (rollNumber) Controller.Student.deleteStudent(rollNumber);
    if (userId) Controller.User.deleteUser(userId);

    Logger.log('=================================');
    Logger.log('CONTROLLER INTEGRATION TEST COMPLETE');
    Logger.log('=================================');
  }
}

/**
 * Diagnostic test for the Event Coordinator endpoints.
 * @param {string} sessionToken 
 */
function testCoordinatorTerminalEndpoints(sessionToken) {
  Logger.log('=================================');
  Logger.log('START: testCoordinatorTerminalEndpoints');
  Logger.log('Session Token: ' + sessionToken);
  Logger.log('=================================');
  
  try {
    Logger.log('1. Checking getCoordinatorTerminalData...');
    const result = getCoordinatorTerminalData(sessionToken);
    Logger.log('Result Success: ' + result.success);
    Logger.log('Result Message: ' + result.message);
    if (result.success && result.data) {
      Logger.log('Coordinator User ID: ' + (result.data.user ? result.data.user['User ID'] : 'N/A'));
      Logger.log('Assigned Event Name: ' + (result.data.event ? result.data.event['Event Name'] : 'N/A'));
      Logger.log('Statistics: ' + JSON.stringify(result.data.statistics));
      Logger.log('Recent Scans count: ' + (result.data.recentScans ? result.data.recentScans.length : 0));
    }
    
    Logger.log('2. Running getLiveStatistics...');
    const liveStats = Controller.CoordinatorTerminal.getLiveStatistics(sessionToken);
    Logger.log('Live Stats result: ' + JSON.stringify(liveStats));
    
    Logger.log('3. Running getRecentScansStream...');
    const scansStream = Controller.CoordinatorTerminal.getRecentScansStream(sessionToken);
    Logger.log('Recent Scans Stream result success: ' + scansStream.success);
    
    Logger.log('END: testCoordinatorTerminalEndpoints');
    Logger.log('=================================');
    return result;
  } catch (e) {
    Logger.log('Error during coordinator endpoint test: ' + e.message);
    Logger.log(e.stack);
    Logger.log('=================================');
    return { success: false, message: e.message };
  }
}
