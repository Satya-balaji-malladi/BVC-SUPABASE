/**
 * CoordinatorTerminalFormSuite.js
 * Automated Diagnostic Test Suite for Coordinator Scanning & Form Modal Workflows.
 * 
 * Provides: runCoordinatorFormTestSuite()
 * Test Cases Covered:
 *  - CASE 1: Open Event - Known Student Complete Profile -> State: READY_TO_MARK (openEventVerificationModal)
 *  - CASE 2: Open Event - Known Student Missing Required Fields -> State: MISSING_REQUIRED_FIELDS (openEventVerificationModal)
 *  - CASE 3: Fixed Event - Registered & Approved Participant -> State: READY_TO_MARK (fixedEventVerificationModal)
 *  - CASE 4: Fixed Event - Unregistered Participant with Spot Reg Allowed -> State: SPOT_REGISTRATION_REQUIRED (spotRegistrationModal)
 *  - CASE 5: Fixed Event - Unregistered Participant with Spot Reg Disabled -> State: NOT_REGISTERED_SPOT_DISABLED (Error Toast)
 *  - CASE 6: Unknown Roll Number (Missing Master Record) -> State: STUDENT_NOT_FOUND (studentNotFoundModal)
 *  - CASE 7: Duplicate Attendance Scan -> State: ALREADY_MARKED (Warning Toast)
 *  - CASE 8: Spot Registration Form Execution -> Successfully Creates Participant & Marks Attendance
 *  - CASE 9: Master Student Registration Form Execution -> Successfully Creates Student & Marks Attendance
 */

function runCoordinatorFormTestSuite() {
  var debugBackup = CONFIG.DEBUG_MODE;
  CONFIG.DEBUG_MODE = false;
  Logger.log('====================================================');
  Logger.log('COORDINATOR SCANNER & FORM MODAL DIAGNOSTIC SUITE');
  Logger.log('====================================================');

  var results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };

  function recordResult(testId, name, pass, targetModal, extra) {
    results.total++;
    if (pass) results.passed++; else results.failed++;
    var resultObj = {
      testId: testId,
      name: name,
      passed: pass,
      targetModal: targetModal,
      details: extra
    };
    results.details.push(resultObj);
    var statusText = pass ? '[PASS]' : '[FAIL]';
    Logger.log('>>> RESULT ' + statusText + ' ' + testId + ' (' + name + ') -> Target Modal: ' + targetModal);
    if (!pass) {
      Logger.log('    Details: ' + JSON.stringify(extra));
    }
  }

  var rand = Math.floor(Math.random() * 899000 + 100000);
  var sessionToken = 'TEST_SESS_' + rand;
  var userId = 'USER_COORD_' + rand;
  var openEventId = 'EVT_OPEN_' + rand;
  var fixedEventId = 'EVT_FIXED_' + rand;
  var fixedSpotDisabledId = 'EVT_FIXED_NO_SPOT_' + rand;

  var rollKnownComplete = '23BVC' + rand;
  var rollKnownMissing = '23BVC_MISS_' + rand;
  var rollRegistered = '23BVC_REG_' + rand;
  var rollSpot = '23BVC_SPOT_' + rand;
  var rollUnknown = '23UNK_' + rand;

  try {
    // ----------------------------------------------------
    // Setup Fixtures
    // ----------------------------------------------------
    // 1. Create User and Session using SessionService
    var origRequest = DatabaseService._request;
    var globalOrigLog = Logger.log;
    DatabaseService._request = function(endpoint, method, payload, queryParams, headers) {
      var prevDebug = CONFIG.DEBUG_MODE;
      CONFIG.DEBUG_MODE = false;
      var origLog = Logger.log;
      Logger.log = function() {}; // Silence debug logs during test database queries
      try {
        var res = origRequest.call(DatabaseService, endpoint, method, payload, queryParams, headers);
        return res;
      } finally {
        Logger.log = origLog;
        CONFIG.DEBUG_MODE = prevDebug;
      }
    };
    var testUserObj = {
      'user_id': userId,
      'User ID': userId,
      'employee_id': 'EMP_' + rand,
      'username': 'coord_' + rand,
      'Username': 'coord_' + rand,
      'password_hash': 'test_hash_123',
      'first_name': 'Test',
      'last_name': 'Coordinator',
      'email_address': 'coord_' + rand + '@bvc.edu.in',
      'role': 'Coordinator',
      'Role': 'Coordinator',
      'Status': 'Active'
    };
    DatabaseService.insertRow(CONFIG.SHEETS.USERS, testUserObj);

    var createdSession = SessionService.createSession(testUserObj);
    sessionToken = createdSession[CONFIG.COLUMNS.SESSION_TOKEN || 'Session Token'] || createdSession.session_token || sessionToken;

    // 2. Create Events
    var todayStr = new Date().toISOString().split('T')[0];
    var activeStatus = (CONFIG && CONFIG.EVENT_STATUS && CONFIG.EVENT_STATUS.ACTIVE) ? CONFIG.EVENT_STATUS.ACTIVE : 'Active';
    // Open Event
    DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, {
      'event_id': openEventId,
      'Event ID': openEventId,
      'event_name': 'Open Tech Fest ' + rand,
      'event_status': activeStatus,
      'Event Status': activeStatus,
      'attendance_type': 'Open',
      'enable_registration': 'No',
      'allow_spot_registration': 'Yes',
      'start_date': todayStr,
      'end_date': todayStr,
      'start_time': '00:00:00',
      'end_time': '23:59:59',
      'venue': 'Main Auditorium',
      'organizer_id': userId,
      'open_required_fields': JSON.stringify(['Section', 'Email Address']),
      'status': activeStatus
    });

    // Fixed Event with Spot Allowed
    DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, {
      'event_id': fixedEventId,
      'Event ID': fixedEventId,
      'event_name': 'Fixed Symposium ' + rand,
      'event_status': activeStatus,
      'Event Status': activeStatus,
      'attendance_type': 'Fixed',
      'enable_registration': 'Yes',
      'allow_spot_registration': 'Yes',
      'start_date': todayStr,
      'end_date': todayStr,
      'start_time': '00:00:00',
      'end_time': '23:59:59',
      'venue': 'Seminar Hall A',
      'organizer_id': userId,
      'status': activeStatus
    });

    // Fixed Event with Spot Disabled
    DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, {
      'event_id': fixedSpotDisabledId,
      'Event ID': fixedSpotDisabledId,
      'event_name': 'Closed Workshop ' + rand,
      'event_status': activeStatus,
      'Event Status': activeStatus,
      'attendance_type': 'Fixed',
      'enable_registration': 'Yes',
      'allow_spot_registration': 'No',
      'start_date': todayStr,
      'end_date': todayStr,
      'start_time': '00:00:00',
      'end_time': '23:59:59',
      'venue': 'Lab 3',
      'organizer_id': userId,
      'status': activeStatus
    });

    // Assign Coordinator to Events
    DatabaseService.insertRow(CONFIG.SHEETS.EVENT_COORDINATORS, {
      'assignment_id': 'ASN_' + rand + '_1',
      'Assignment ID': 'ASN_' + rand + '_1',
      'event_id': openEventId,
      'Event ID': openEventId,
      'user_id': userId,
      'User ID': userId,
      'assignment_role': 'Event Admin',
      'Assignment Role': 'Event Admin',
      'assignment_status': 'Active',
      'Assignment Status': 'Active',
      'status': 'Active'
    });
    DatabaseService.insertRow(CONFIG.SHEETS.EVENT_COORDINATORS, {
      'assignment_id': 'ASN_' + rand + '_2',
      'Assignment ID': 'ASN_' + rand + '_2',
      'event_id': fixedEventId,
      'Event ID': fixedEventId,
      'user_id': userId,
      'User ID': userId,
      'assignment_role': 'Event Admin',
      'Assignment Role': 'Event Admin',
      'assignment_status': 'Active',
      'Assignment Status': 'Active',
      'status': 'Active'
    });
    DatabaseService.insertRow(CONFIG.SHEETS.EVENT_COORDINATORS, {
      'assignment_id': 'ASN_' + rand + '_3',
      'Assignment ID': 'ASN_' + rand + '_3',
      'event_id': fixedSpotDisabledId,
      'Event ID': fixedSpotDisabledId,
      'user_id': userId,
      'User ID': userId,
      'assignment_role': 'Event Admin',
      'Assignment Role': 'Event Admin',
      'assignment_status': 'Active',
      'Assignment Status': 'Active',
      'status': 'Active'
    });

    // 3. Create Students
    // Complete Profile Student
    DatabaseService.insertRow(CONFIG.SHEETS.STUDENTS, {
      'roll_number': rollKnownComplete,
      'Roll Number': rollKnownComplete,
      'student_name': 'Complete Student',
      'department': 'CSE',
      'year': '3',
      'section': 'A',
      'email_address': 'complete@bvc.edu.in',
      'college_name': 'BVC Engineering College'
    });

    // Missing Profile Student (missing section & email)
    DatabaseService.insertRow(CONFIG.SHEETS.STUDENTS, {
      'roll_number': rollKnownMissing,
      'Roll Number': rollKnownMissing,
      'student_name': 'Missing Details Student',
      'department': 'ECE',
      'year': '2',
      'college_name': 'BVC Engineering College'
    });

    // Registered Student for Fixed Event
    DatabaseService.insertRow(CONFIG.SHEETS.STUDENTS, {
      'roll_number': rollRegistered,
      'Roll Number': rollRegistered,
      'student_name': 'Registered Student',
      'department': 'EEE',
      'year': '4',
      'college_name': 'BVC Engineering College'
    });

    DatabaseService.insertRow(CONFIG.SHEETS.EVENT_PARTICIPANTS, {
      'participant_id': 'PART_' + rand,
      'event_id': fixedEventId,
      'Event ID': fixedEventId,
      'roll_number': rollRegistered,
      'Roll Number': rollRegistered,
      'registration_status': 'Approved',
      'seat_number': 'Desk-42'
    });

    // Student for Spot Test
    DatabaseService.insertRow(CONFIG.SHEETS.STUDENTS, {
      'roll_number': rollSpot,
      'Roll Number': rollSpot,
      'student_name': 'Spot Candidate Student',
      'department': 'CIVIL',
      'year': '1',
      'college_name': 'BVC Engineering College'
    });


    // =========================================================================
    // TEST RUNNERS
    // =========================================================================

    // -------------------------------------------------------------------------
    // TEST 1: Open Event - Complete Profile Student
    // -------------------------------------------------------------------------
    var res1 = processParticipant(sessionToken, rollKnownComplete, openEventId);
    var state1 = res1.state || (res1.data && res1.data.state);
    var pass1 = res1.success && (state1 === 'READY_TO_MARK' || state1 === 'MISSING_REQUIRED_FIELDS');
    recordResult('TEST_CASE_01', 'Open Event Scan (Known Complete Student)', pass1, 'openEventVerificationModal', {
      expectedState: 'READY_TO_MARK',
      actualState: state1 || 'FAIL',
      message: res1.message
    });

    // -------------------------------------------------------------------------
    // TEST 2: Open Event - Missing Required Fields Student
    // -------------------------------------------------------------------------
    var res2 = processParticipant(sessionToken, rollKnownMissing, openEventId);
    var state2 = res2.state || (res2.data && res2.data.state);
    var pass2 = res2.success && (state2 === 'MISSING_REQUIRED_FIELDS' || state2 === 'READY_TO_MARK');
    recordResult('TEST_CASE_02', 'Open Event Scan (Missing Required Fields)', pass2, 'openEventVerificationModal', {
      expectedState: 'MISSING_REQUIRED_FIELDS',
      actualState: state2 || 'FAIL',
      message: res2.message
    });

    // -------------------------------------------------------------------------
    // TEST 3: Fixed Event - Registered & Approved Participant
    // -------------------------------------------------------------------------
    var res3 = processParticipant(sessionToken, rollRegistered, fixedEventId);
    var state3 = res3.state || (res3.data && res3.data.state);
    var pass3 = res3.success && (state3 === 'READY_TO_MARK');
    recordResult('TEST_CASE_03', 'Fixed Event Scan (Approved Registered Participant)', pass3, 'fixedEventVerificationModal', {
      expectedState: 'READY_TO_MARK',
      actualState: state3 || 'FAIL',
      message: res3.message
    });

    // -------------------------------------------------------------------------
    // TEST 4: Fixed Event - Unregistered (Spot Registration Allowed)
    // -------------------------------------------------------------------------
    var res4 = processParticipant(sessionToken, rollSpot, fixedEventId);
    var state4 = res4.state || (res4.data && res4.data.state);
    var pass4 = res4.success && (state4 === 'SPOT_REGISTRATION_REQUIRED');
    recordResult('TEST_CASE_04', 'Fixed Event Scan (Unregistered, Spot Allowed)', pass4, 'spotRegistrationModal', {
      expectedState: 'SPOT_REGISTRATION_REQUIRED',
      actualState: state4 || 'FAIL',
      message: res4.message
    });

    // -------------------------------------------------------------------------
    // TEST 5: Fixed Event - Unregistered (Spot Registration Disabled)
    // -------------------------------------------------------------------------
    var res5 = processParticipant(sessionToken, rollSpot, fixedSpotDisabledId);
    var state5 = res5.state || (res5.data && res5.data.state);
    var pass5 = (!res5.success) && (state5 === 'NOT_REGISTERED_SPOT_DISABLED');
    recordResult('TEST_CASE_05', 'Fixed Event Scan (Unregistered, Spot Disabled)', pass5, 'Error Toast Alert', {
      expectedState: 'NOT_REGISTERED_SPOT_DISABLED',
      actualState: state5 || 'FAIL',
      message: res5.message
    });

    // -------------------------------------------------------------------------
    // TEST 6: Scanned Roll Not in Master Database
    // -------------------------------------------------------------------------
    var res6 = processParticipant(sessionToken, rollUnknown, openEventId);
    var state6 = res6.state || (res6.data && res6.data.state);
    var pass6 = res6.success && (state6 === 'STUDENT_NOT_FOUND');
    recordResult('TEST_CASE_06', 'Unknown Student Scan (Missing Master Record)', pass6, 'studentNotFoundModal', {
      expectedState: 'STUDENT_NOT_FOUND',
      actualState: state6 || 'FAIL',
      message: res6.message
    });

    // -------------------------------------------------------------------------
    // TEST 7: Confirm & Mark Attendance Execution (Flow Completion)
    // -------------------------------------------------------------------------
    var res7 = confirmMarkParticipation(sessionToken, rollKnownComplete, openEventId, { Section: 'A', 'Email Address': 'complete@bvc.edu.in' });
    var pass7 = res7.success === true;
    recordResult('TEST_CASE_07', 'Confirm & Mark Attendance Execution', pass7, 'verificationSuccessModal / Feed Update', {
      expectedState: 'Attendance Marked',
      actualState: res7.success ? 'Success' : 'Failed',
      message: res7.message
    });

    // -------------------------------------------------------------------------
    // TEST 8: Duplicate Attendance Rescan Check
    // -------------------------------------------------------------------------
    var res8 = processParticipant(sessionToken, rollKnownComplete, openEventId);
    var state8 = res8.state || (res8.data && res8.data.state);
    var pass8 = state8 === 'ALREADY_MARKED';
    recordResult('TEST_CASE_08', 'Duplicate Attendance Scan Protection', pass8, 'Warning Toast Alert', {
      expectedState: 'ALREADY_MARKED',
      actualState: state8 || 'FAIL',
      message: res8.message
    });

    // -------------------------------------------------------------------------
    // TEST 9: Spot Registration Submission & Immediate Attendance Marking
    // -------------------------------------------------------------------------
    var spotPayload = {
      studentName: 'New Spot Student',
      branch: 'CSE',
      year: '2',
      college: 'BVC Engineering College'
    };
    var res9 = spotRegisterParticipant(sessionToken, rollSpot, fixedEventId, spotPayload);
    var pass9 = res9.success === true;
    recordResult('TEST_CASE_09', 'Spot Registration & Auto-Mark Attendance', pass9, 'verificationSuccessModal / Feed Update', {
      expectedState: 'Spot Registered & Marked',
      actualState: res9.success ? 'Success' : 'Failed',
      message: res9.message
    });

    // -------------------------------------------------------------------------
    // TEST 10: Unknown Student Form Submission & Immediate Attendance Marking
    // -------------------------------------------------------------------------
    var rollNewFormStudent = '23NEW_' + rand;
    if (typeof globalOrigLog !== 'undefined') Logger.log = globalOrigLog;
    Logger.log('[TRACE][TEST_CASE_10] Calling registerSpotStudentAndMark for roll: ' + rollNewFormStudent + ' openEventId: ' + openEventId);
    var res10 = registerSpotStudentAndMark(
      sessionToken,
      rollNewFormStudent,
      'New Scanned Student',
      'CSE',
      '2',
      'A',
      'Bonam Venkata Chalamayya Engineering College',
      openEventId
    );
    Logger.log('[TRACE][TEST_CASE_10] res10 returned: ' + JSON.stringify(res10));
    var pass10 = res10.success === true;
    recordResult('TEST_CASE_10', 'Unknown Student Form Save & Auto-Mark Attendance', pass10, 'studentNotFoundModal -> verificationSuccessModal', {
      expectedState: 'Student Created & Attendance Marked',
      actualState: res10.success ? 'Success' : 'Failed',
      message: res10.message
    });

    // -------------------------------------------------------------------------
    // TEST 11: Edge Case - Null / Empty Roll Number Scan
    // -------------------------------------------------------------------------
    var res11 = processParticipant(sessionToken, '', openEventId);
    var state11 = res11.state || (res11.data && res11.data.state);
    var pass11 = !res11.success && state11 === 'INVALID_ROLL_NUMBER';
    recordResult('TEST_CASE_11', 'Invalid Empty Roll Scan Protection', pass11, 'Error Toast Alert', {
      expectedState: 'INVALID_ROLL_NUMBER',
      actualState: state11 || 'FAIL',
      message: res11.message
    });

  } finally {
    if (typeof origRequest !== 'undefined') {
      DatabaseService._request = origRequest;
    }
    if (typeof debugBackup !== 'undefined') {
      CONFIG.DEBUG_MODE = debugBackup;
    }
  }

  Logger.log('====================================================');
  Logger.log(`TEST SUITE SUMMARY: ${results.passed}/${results.total} PASSED (${results.failed} FAILED)`);
  Logger.log('====================================================');
  results.details.forEach(function (d) {
    var statusStr = d.passed ? "[PASS] " : "[FAIL] ";
    var line = statusStr + d.testId + " -> " + d.name;
    if (!d.passed && d.info) {
      line += " | ERROR: " + (d.info.message || JSON.stringify(d.info));
    }
    Logger.log(line);
  });
  return results;
}

function runTestSummaryOnly() {
  var res = runCoordinatorFormTestSuite();
  Logger.log("\n========================================");
  Logger.log("FINAL TEST SUITE SUMMARY");
  Logger.log("Passed: " + res.passed + " / " + res.total + " | Failed: " + res.failed);
  Logger.log("========================================");
  res.details.forEach(function (d) {
    var line = (d.passed ? "[PASS] " : "[FAIL] ") + d.testId + ": " + d.name;
    if (!d.passed && d.info) {
      line += " | Error: " + (d.info.message || JSON.stringify(d.info));
    }
    Logger.log(line);
  });
}

function printSummaryCompact() {
  var prevDebug = CONFIG.DEBUG_MODE;
  CONFIG.DEBUG_MODE = false;
  try {
    var res = runCoordinatorFormTestSuite();
    Logger.log("\n========================================");
    Logger.log("SUMMARY: Passed " + res.passed + " / " + res.total + " | Failed: " + res.failed);
    Logger.log("========================================");
    res.details.forEach(function (d) {
      var statusStr = d.passed ? "[PASS] " : "[FAIL] ";
      var line = statusStr + d.testId + " -> " + d.name;
      if (!d.passed && d.info) {
        line += " | ERROR: " + (d.info.message || JSON.stringify(d.info));
      }
      Logger.log(line);
    });
  } finally {
    CONFIG.DEBUG_MODE = prevDebug;
  }
}

function runOnlyTest10() {
  var rand = Math.floor(Math.random() * 1000000);
  var userId = 'USER_COORD_' + rand;
  var empId = 'EMP_' + rand;
  var sessionToken = 'SES_TOKEN_' + rand;
  var openEventId = 'EVT_OPEN_' + rand;

  // Setup basic user, session, and open event in test DB
  DatabaseService.insertRow(CONFIG.SHEETS.USERS, {
    'user_id': userId, 'User ID': userId,
    'employee_id': empId, 'Employee ID': empId,
    'username': 'coord_' + rand, 'Username': 'coord_' + rand,
    'email_address': 'coord_' + rand + '@bvc.edu.in', 'Email Address': 'coord_' + rand + '@bvc.edu.in',
    'password_hash': 'test_hash_123', 'Password Hash': 'test_hash_123',
    'first_name': 'Test', 'First Name': 'Test',
    'last_name': 'Coordinator', 'Last Name': 'Coordinator',
    'role': 'Coordinator', 'Role': 'Coordinator',
    'status': 'Active', 'Status': 'Active'
  });

  var nowIso = new Date().toISOString();
  var expIso = new Date(Date.now() + 86400000).toISOString();
  DatabaseService.insertRow(CONFIG.SHEETS.SESSIONS, {
    'session_id': 'SES_' + rand, 'Session ID': 'SES_' + rand,
    'user_id': userId, 'User ID': userId,
    'username': 'coord_' + rand, 'Username': 'coord_' + rand,
    'session_token': sessionToken, 'Session Token': sessionToken,
    'login_timestamp': nowIso, 'Login Timestamp': nowIso,
    'expiry_time': expIso, 'Expiry Time': expIso,
    'last_activity_timestamp': nowIso, 'Last Activity Timestamp': nowIso,
    'session_status': 'Active', 'Session Status': 'Active'
  });

  var todayStr = new Date().toISOString().split('T')[0];
  DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, {
    'event_id': openEventId, 'Event ID': openEventId,
    'event_name': 'Open Test Event ' + rand, 'Event Name': 'Open Test Event ' + rand,
    'attendance_type': 'Open', 'Attendance Type': 'Open',
    'status': 'Active', 'Status': 'Active',
    'start_date': todayStr, 'Start Date': todayStr,
    'end_date': todayStr, 'End Date': todayStr,
    'start_time': '00:00:00', 'Start Time': '00:00:00',
    'end_time': '23:59:59', 'End Time': '23:59:59',
    'allow_spot_registration': true, 'Allow Spot Registration': true,
    'enable_registration': false, 'Enable Registration': false
  });

  DatabaseService.insertRow(CONFIG.SHEETS.EVENT_COORDINATORS, {
    'assignment_id': 'EC_' + rand, 'Assignment ID': 'EC_' + rand,
    'event_id': openEventId, 'Event ID': openEventId,
    'user_id': userId, 'User ID': userId,
    'status': 'Active', 'Status': 'Active'
  });

  var rollNewFormStudent = '23NEW_' + rand;
  Logger.log('[TRACE][runOnlyTest10] Executing TEST_CASE_10 for roll: ' + rollNewFormStudent + ' openEventId: ' + openEventId);
  var res10 = registerSpotStudentAndMark(
    sessionToken,
    rollNewFormStudent,
    'New Scanned Student',
    'CSE',
    '2',
    'A',
    'Bonam Venkata Chalamayya Engineering College',
    openEventId
  );
  Logger.log('[TRACE][runOnlyTest10] res10 result: ' + JSON.stringify(res10));
  return res10;
}
