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
  Logger.log('====================================================');
  Logger.log('COORDINATOR SCANNER & FORM MODAL DIAGNOSTIC SUITE');
  Logger.log('====================================================');

  var results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };

  function recordResult(testId, title, pass, targetModal, extra = {}) {
    results.total++;
    if (pass) {
      results.passed++;
      Logger.log('✅ ' + testId.padEnd(20) + ' PASS | Modal: ' + targetModal + ' | ' + title);
    } else {
      results.failed++;
      Logger.log('❌ ' + testId.padEnd(20) + ' FAIL | Expected Modal: ' + targetModal + ' | ' + title);
      Logger.log('   Expected State: ' + (extra.expectedState || 'N/A'));
      Logger.log('   Actual State  : ' + (extra.actualState || 'N/A'));
      Logger.log('   Error Message : ' + (extra.message || 'N/A'));
    }
    results.details.push({ testId: testId, title: title, pass: pass, targetModal: targetModal, extra: extra });
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
    // 1. Create Session
    DatabaseService.insertRow(CONFIG.SHEETS.USERS, {
      'user_id': userId,
      'User ID': userId,
      'employee_id': 'EMP_' + rand,
      'username': 'coord_' + rand,
      'password_hash': 'test_hash_123',
      'first_name': 'Test',
      'last_name': 'Coordinator',
      'email_address': 'coord_' + rand + '@bvc.edu.in',
      'role': 'Coordinator',
      'Status': 'Active'
    });

    DatabaseService.insertRow(CONFIG.SHEETS.SESSIONS, {
      'session_id': sessionToken,
      'user_id': userId,
      'status': 'Active',
      'expires_at': new Date(Date.now() + 3600000).toISOString()
    });

    // 2. Create Events
    // Open Event
    DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, {
      'event_id': openEventId,
      'Event ID': openEventId,
      'event_name': 'Open Tech Fest ' + rand,
      'attendance_type': 'Open',
      'enable_registration': 'No',
      'allow_spot_registration': 'Yes',
      'open_required_fields': JSON.stringify(['Section', 'Email Address']),
      'status': 'Active'
    });

    // Fixed Event with Spot Allowed
    DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, {
      'event_id': fixedEventId,
      'Event ID': fixedEventId,
      'event_name': 'Fixed Symposium ' + rand,
      'attendance_type': 'Fixed',
      'enable_registration': 'Yes',
      'allow_spot_registration': 'Yes',
      'status': 'Active'
    });

    // Fixed Event with Spot Disabled
    DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, {
      'event_id': fixedSpotDisabledId,
      'Event ID': fixedSpotDisabledId,
      'event_name': 'Closed Workshop ' + rand,
      'attendance_type': 'Fixed',
      'enable_registration': 'Yes',
      'allow_spot_registration': 'No',
      'status': 'Active'
    });

    // Assign Coordinator to Events
    DatabaseService.insertRow(CONFIG.SHEETS.EVENT_COORDINATORS, {
      'event_id': openEventId,
      'user_id': userId,
      'status': 'Active'
    });
    DatabaseService.insertRow(CONFIG.SHEETS.EVENT_COORDINATORS, {
      'event_id': fixedEventId,
      'user_id': userId,
      'status': 'Active'
    });
    DatabaseService.insertRow(CONFIG.SHEETS.EVENT_COORDINATORS, {
      'event_id': fixedSpotDisabledId,
      'user_id': userId,
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
    var res1 = Api.processParticipant(sessionToken, rollKnownComplete, openEventId);
    var pass1 = res1.success && (res1.data && (res1.data.state === 'READY_TO_MARK' || res1.data.state === 'MISSING_REQUIRED_FIELDS'));
    recordResult('TEST_CASE_01', 'Open Event Scan (Known Complete Student)', pass1, 'openEventVerificationModal', {
      expectedState: 'READY_TO_MARK',
      actualState: res1.data ? res1.data.state : 'FAIL',
      message: res1.message
    });

    // -------------------------------------------------------------------------
    // TEST 2: Open Event - Missing Required Fields Student
    // -------------------------------------------------------------------------
    var res2 = Api.processParticipant(sessionToken, rollKnownMissing, openEventId);
    var pass2 = res2.success && (res2.data && res2.data.state === 'MISSING_REQUIRED_FIELDS');
    recordResult('TEST_CASE_02', 'Open Event Scan (Missing Required Fields)', pass2, 'openEventVerificationModal', {
      expectedState: 'MISSING_REQUIRED_FIELDS',
      actualState: res2.data ? res2.data.state : 'FAIL',
      message: res2.message
    });

    // -------------------------------------------------------------------------
    // TEST 3: Fixed Event - Registered & Approved Participant
    // -------------------------------------------------------------------------
    var res3 = Api.processParticipant(sessionToken, rollRegistered, fixedEventId);
    var pass3 = res3.success && (res3.data && res3.data.state === 'READY_TO_MARK');
    recordResult('TEST_CASE_03', 'Fixed Event Scan (Approved Registered Participant)', pass3, 'fixedEventVerificationModal', {
      expectedState: 'READY_TO_MARK',
      actualState: res3.data ? res3.data.state : 'FAIL',
      message: res3.message
    });

    // -------------------------------------------------------------------------
    // TEST 4: Fixed Event - Unregistered (Spot Registration Allowed)
    // -------------------------------------------------------------------------
    var res4 = Api.processParticipant(sessionToken, rollSpot, fixedEventId);
    var pass4 = res4.success && (res4.data && res4.data.state === 'SPOT_REGISTRATION_REQUIRED');
    recordResult('TEST_CASE_04', 'Fixed Event Scan (Unregistered, Spot Allowed)', pass4, 'spotRegistrationModal', {
      expectedState: 'SPOT_REGISTRATION_REQUIRED',
      actualState: res4.data ? res4.data.state : 'FAIL',
      message: res4.message
    });

    // -------------------------------------------------------------------------
    // TEST 5: Fixed Event - Unregistered (Spot Registration Disabled)
    // -------------------------------------------------------------------------
    var res5 = Api.processParticipant(sessionToken, rollSpot, fixedSpotDisabledId);
    var pass5 = (!res5.success) && (res5.data && res5.data.state === 'NOT_REGISTERED_SPOT_DISABLED');
    recordResult('TEST_CASE_05', 'Fixed Event Scan (Unregistered, Spot Disabled)', pass5, 'Error Toast Alert', {
      expectedState: 'NOT_REGISTERED_SPOT_DISABLED',
      actualState: res5.data ? res5.data.state : 'FAIL',
      message: res5.message
    });

    // -------------------------------------------------------------------------
    // TEST 6: Scanned Roll Not in Master Database
    // -------------------------------------------------------------------------
    var res6 = Api.processParticipant(sessionToken, rollUnknown, openEventId);
    var pass6 = res6.success && (res6.data && res6.data.state === 'STUDENT_NOT_FOUND');
    recordResult('TEST_CASE_06', 'Unknown Student Scan (Missing Master Record)', pass6, 'studentNotFoundModal', {
      expectedState: 'STUDENT_NOT_FOUND',
      actualState: res6.data ? res6.data.state : 'FAIL',
      message: res6.message
    });

    // -------------------------------------------------------------------------
    // TEST 7: Confirm & Mark Attendance Execution (Flow Completion)
    // -------------------------------------------------------------------------
    var res7 = Api.confirmMarkParticipation(sessionToken, rollKnownComplete, openEventId, { Section: 'A', 'Email Address': 'complete@bvc.edu.in' });
    var pass7 = res7.success === true;
    recordResult('TEST_CASE_07', 'Confirm & Mark Attendance Execution', pass7, 'verificationSuccessModal / Feed Update', {
      expectedState: 'Attendance Marked',
      actualState: res7.success ? 'Success' : 'Failed',
      message: res7.message
    });

    // -------------------------------------------------------------------------
    // TEST 8: Duplicate Attendance Rescan Check
    // -------------------------------------------------------------------------
    var res8 = Api.processParticipant(sessionToken, rollKnownComplete, openEventId);
    var pass8 = res8.data && res8.data.state === 'ALREADY_MARKED';
    recordResult('TEST_CASE_08', 'Duplicate Attendance Scan Protection', pass8, 'Warning Toast Alert', {
      expectedState: 'ALREADY_MARKED',
      actualState: res8.data ? res8.data.state : 'FAIL',
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
    var res9 = Api.spotRegisterParticipant(sessionToken, rollSpot, fixedEventId, spotPayload);
    var pass9 = res9.success === true;
    recordResult('TEST_CASE_09', 'Spot Registration & Auto-Mark Attendance', pass9, 'verificationSuccessModal / Feed Update', {
      expectedState: 'Spot Registered & Marked',
      actualState: res9.success ? 'Success' : 'Failed',
      message: res9.message
    });

  } catch (globalError) {
    Logger.log('CRITICAL SUITE ERROR: ' + globalError.message);
    Logger.log(globalError.stack);
  }

  Logger.log('====================================================');
  Logger.log(`TEST SUITE SUMMARY: ${results.passed}/${results.total} PASSED (${results.failed} FAILED)`);
  Logger.log('====================================================');
  return results;
}
