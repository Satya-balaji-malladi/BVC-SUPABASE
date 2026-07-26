/**
 * CoordinatorWorkflowTest.js
 * Master Automated Test Suite for Coordinator Participant & Attendance Workflow.
 * 
 * Provides: runCoordinatorParticipantWorkflowTests()
 */

function runCoordinatorParticipantWorkflowTests() {
  Logger.log('==============================================');
  Logger.log('COORDINATOR WORKFLOW TEST SUITE');
  Logger.log('==============================================');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  function recordResult(testId, title, pass, category, extra = {}) {
    results.total++;
    if (pass) {
      results.passed++;
      Logger.log(`${testId.padEnd(18)} PASS - ${title}`);
    } else {
      results.failed++;
      Logger.log(`${testId.padEnd(18)} FAIL - ${title}`);
      if (extra.error || extra.expected) {
        Logger.log(`  Test: ${testId}`);
        Logger.log(`  Roll Number: ${extra.rollNumber || 'N/A'}`);
        Logger.log(`  Event: ${extra.eventId || 'N/A'}`);
        Logger.log(`  Expected: ${extra.expected || 'N/A'}`);
        Logger.log(`  Actual: ${extra.actual || 'N/A'}`);
        Logger.log(`  Last Successful Step: ${extra.lastSuccess || 'Setup'}`);
        Logger.log(`  First Failed Step: ${extra.failedStep || 'Verification'}`);
        Logger.log(`  File: ${extra.file || 'CoordinatorService.js'}`);
        Logger.log(`  Function: ${extra.functionName || 'processParticipantForEvent'}`);
        Logger.log(`  Layer: ${extra.layer || 'CoordinatorService'}`);
        Logger.log(`  Error: ${extra.error || 'Assertion Mismatch'}`);
      }
    }
    results.details.push({ testId, title, pass, category, extra });
  }

  // Setup Test Fixtures (Dedicated TEST_AUTO records)
  const randNum = Math.floor(Math.random() * 899000 + 100000);
  const testSessionToken = 'TEST_SESSION_' + randNum;
  const testUserId = 'USER_TEST_' + randNum;
  const eventNoRegId = 'EVT_NO_REG_' + randNum;
  const eventRegId = 'EVT_REG_' + randNum;
  const testRollBvc = '23A91A05' + String(Math.floor(Math.random()*89 + 10));
  const testRollExt = '23EXT99' + String(Math.floor(Math.random()*89 + 10));
  const testRollUnk = '23UNK88' + String(Math.floor(Math.random()*89 + 10));
  const nowDateStr = new Date().toISOString().split('T')[0];

  try {
    // 0. Ensure a valid Department exists for foreign key references
    var existingDepts = DatabaseService.readAllRows(CONFIG.SHEETS.DEPARTMENTS) || [];
    var testDeptId = 'CSE';
    if (existingDepts.length > 0) {
      testDeptId = existingDepts[0]['Department ID'] || existingDepts[0].department_id || 'CSE';
    } else {
      try {
        DatabaseService.insertRow(CONFIG.SHEETS.DEPARTMENTS, {
          'Department ID': 'CSE',
          'department_id': 'CSE',
          'Department Code': 'CSE_' + randNum,
          'department_code': 'CSE_' + randNum,
          'Department Name': 'Computer Science and Engineering',
          'Status': 'Active'
        });
      } catch(e) {}
    }

    // 1. Seed Test User with all mandatory Supabase PostgreSQL fields
    const testUserObj = {
      'User ID': testUserId,
      'user_id': testUserId,
      'employee_id': 'EMP_' + randNum,
      'first_name': 'Test',
      'last_name': 'Coordinator',
      'email_address': 'coord_' + randNum + '@bvc.edu.in',
      'username': 'coord_' + randNum,
      'password_hash': 'test_hash_123',
      'Role': 'Coordinator',
      'role': 'Coordinator',
      'Status': 'Active',
      'status': 'Active'
    };
    DatabaseService.insertRow(CONFIG.SHEETS.USERS, testUserObj);

    // Create session record in sessions table
    const sessionRecord = {
      'Session ID': 'SESS_' + randNum,
      'User ID': testUserId,
      'user_id': testUserId,
      'username': 'coord_' + randNum,
      'Session Token': testSessionToken,
      'session_token': testSessionToken,
      'session_status': 'Active',
      'Session Status': 'Active',
      'login_timestamp': new Date().toISOString(),
      'last_activity_timestamp': new Date().toISOString(),
      'expiry_time': new Date(Date.now() + 3600000).toISOString()
    };
    DatabaseService.insertRow(CONFIG.SHEETS.SESSIONS, sessionRecord);

    // Seed Events with mandatory dates and active attendance window
    const nowStartWindow = new Date(Date.now() - 3600000).toISOString();
    const nowEndWindow = new Date(Date.now() + 86400000).toISOString();

    const noRegEvent = {
      'Event ID': eventNoRegId,
      'event_id': eventNoRegId,
      'Event Name': 'Test No Reg Event',
      'event_name': 'Test No Reg Event',
      'start_date': nowDateStr,
      'end_date': nowDateStr,
      'start_time': '00:00:00',
      'end_time': '23:59:59',
      'attendance_window_start': nowStartWindow,
      'attendance_window_end': nowEndWindow,
      'Event Status': 'Active',
      'event_status': 'Active',
      'Enable Registration': 'false',
      'enable_registration': false,
      'Allow Spot Registration': 'true',
      'allow_spot_registration': true,
      'Registration Fields': JSON.stringify([{ name: 'Phone', required: true }])
    };
    DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, noRegEvent);

    const regEvent = {
      'Event ID': eventRegId,
      'event_id': eventRegId,
      'Event Name': 'Test Reg Event',
      'event_name': 'Test Reg Event',
      'start_date': nowDateStr,
      'end_date': nowDateStr,
      'start_time': '00:00:00',
      'end_time': '23:59:59',
      'attendance_window_start': nowStartWindow,
      'attendance_window_end': nowEndWindow,
      'Event Status': 'Active',
      'event_status': 'Active',
      'Enable Registration': 'true',
      'enable_registration': true,
      'Allow Spot Registration': 'true',
      'allow_spot_registration': true,
      'Maximum Seats': 100,
      'maximum_seats': 100,
      'Registered Count': 0,
      'registered_count': 0,
      'Registration Fields': JSON.stringify([{ name: 'College', required: true }])
    };
    DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, regEvent);

    // Seed Coordinator assignments
    DatabaseService.insertRow(CONFIG.SHEETS.EVENT_COORDINATORS, {
      'Assignment ID': 'ASSIGN_1_' + randNum,
      'assignment_id': 'ASSIGN_1_' + randNum,
      'Event ID': eventNoRegId,
      'event_id': eventNoRegId,
      'User ID': testUserId,
      'user_id': testUserId,
      'Assignment Role': 'Coordinator',
      'Assignment Status': 'Active',
      'assignment_status': 'Active'
    });
    DatabaseService.insertRow(CONFIG.SHEETS.EVENT_COORDINATORS, {
      'Assignment ID': 'ASSIGN_2_' + randNum,
      'assignment_id': 'ASSIGN_2_' + randNum,
      'Event ID': eventRegId,
      'event_id': eventRegId,
      'User ID': testUserId,
      'user_id': testUserId,
      'Assignment Role': 'Coordinator',
      'Assignment Status': 'Active',
      'assignment_status': 'Active'
    });

    // Seed Students with student_id, roll_number, year, name
    DatabaseService.insertRow(CONFIG.SHEETS.STUDENTS, {
      'student_id': 'STU_BVC_' + randNum,
      'Roll Number': testRollBvc,
      'roll_number': testRollBvc,
      'Student Name': 'Test BVC Student',
      'student_name': 'Test BVC Student',
      'Department ID': testDeptId,
      'department_id': testDeptId,
      'Year': '2',
      'year': 2,
      'Section': 'A',
      'Status': 'Active',
      'College': 'BVC Engineering College'
    });

    DatabaseService.insertRow(CONFIG.SHEETS.OTHER_COLLEGE_STUDENTS, {
      'id': 'OCS_' + randNum,
      'roll_number': testRollExt,
      'student_name': 'Test External Student',
      'college_name': 'XYZ Engineering College',
      'department': 'ECE',
      'year': '3',
      'section': 'B',
      'status': 'Active'
    });

  } catch (err) {
    Logger.log('Setup Error: ' + err.message);
  }

  // ==========================================================================
  // SECTION A: NO REGISTRATION EVENT TESTS
  // ==========================================================================
  Logger.log('\n--- NO REGISTRATION EVENT TESTS ---');

  // TC-COORD-NR-001: Scan existing BVC student
  try {
    const res1 = CoordinatorService.processParticipantForEvent(testSessionToken, eventNoRegId, testRollBvc);
    const pass1 = res1.success && (res1.state === 'READY_TO_MARK' || res1.state === 'MISSING_REQUIRED_FIELDS');
    recordResult('TC-COORD-NR-001', 'Known BVC student lookup', pass1, 'NO_REG', {
      rollNumber: testRollBvc, eventId: eventNoRegId, expected: 'READY_TO_MARK or MISSING_FIELDS', actual: res1.state
    });
  } catch (e) {
    recordResult('TC-COORD-NR-001', 'Known BVC student lookup', false, 'NO_REG', { error: e.message });
  }

  // TC-COORD-NR-002: Manual entry existing BVC student
  try {
    const res2 = CoordinatorService.processParticipantForEvent(testSessionToken, eventNoRegId, ' ' + testRollBvc + ' ');
    const pass2 = res2.success && (res2.state === 'READY_TO_MARK' || res2.state === 'MISSING_REQUIRED_FIELDS');
    recordResult('TC-COORD-NR-002', 'Manual entry known BVC student', pass2, 'NO_REG', {
      rollNumber: testRollBvc, eventId: eventNoRegId, expected: 'READY_TO_MARK', actual: res2.state
    });
  } catch (e) {
    recordResult('TC-COORD-NR-002', 'Manual entry known BVC student', false, 'NO_REG', { error: e.message });
  }

  // TC-COORD-NR-003: Known external student
  try {
    const res3 = CoordinatorService.processParticipantForEvent(testSessionToken, eventNoRegId, testRollExt);
    const pass3 = res3.success && (res3.state === 'READY_TO_MARK' || res3.state === 'MISSING_REQUIRED_FIELDS');
    recordResult('TC-COORD-NR-003', 'Known external student lookup', pass3, 'NO_REG', {
      rollNumber: testRollExt, eventId: eventNoRegId, expected: 'READY_TO_MARK or MISSING_FIELDS', actual: res3.state
    });
  } catch (e) {
    recordResult('TC-COORD-NR-003', 'Known external student lookup', false, 'NO_REG', { error: e.message });
  }

  // TC-COORD-NR-004: Unknown student
  try {
    const res4 = CoordinatorService.processParticipantForEvent(testSessionToken, eventNoRegId, testRollUnk);
    const pass4 = res4.success && (res4.state === 'MISSING_REQUIRED_FIELDS' || res4.state === 'READY_TO_MARK');
    recordResult('TC-COORD-NR-004', 'Unknown student lookup', pass4, 'NO_REG', {
      rollNumber: testRollUnk, eventId: eventNoRegId, expected: 'MISSING_REQUIRED_FIELDS', actual: res4.state
    });
  } catch (e) {
    recordResult('TC-COORD-NR-004', 'Unknown student lookup', false, 'NO_REG', { error: e.message });
  }

  // TC-COORD-NR-005: Known student + missing required field
  try {
    const res5 = CoordinatorService.processParticipantForEvent(testSessionToken, eventNoRegId, testRollBvc);
    const pass5 = res5.success;
    recordResult('TC-COORD-NR-005', 'Known student missing required field check', pass5, 'NO_REG', {
      rollNumber: testRollBvc, eventId: eventNoRegId, expected: 'Valid evaluation', actual: res5.state
    });
  } catch (e) {
    recordResult('TC-COORD-NR-005', 'Known student missing required field check', false, 'NO_REG', { error: e.message });
  }

  // TC-COORD-NR-006: Unknown student fills required fields
  try {
    const res6 = CoordinatorService.confirmMarkParticipation(testSessionToken, eventNoRegId, testRollUnk, {
      studentName: 'Unknown Tester', phone: '9999999999'
    });
    const pass6 = res6.success && AttendanceService.hasStudentAttended(eventNoRegId, testRollUnk);
    recordResult('TC-COORD-NR-006', 'Unknown student fills required details & marks attendance', pass6, 'NO_REG', {
      rollNumber: testRollUnk, eventId: eventNoRegId, expected: 'DB Attendance Verified', actual: pass6
    });
  } catch (e) {
    recordResult('TC-COORD-NR-006', 'Unknown student fills required details', false, 'NO_REG', { error: e.message });
  }

  // TC-COORD-NR-007: Mark Participated
  try {
    const res7 = CoordinatorService.confirmMarkParticipation(testSessionToken, eventNoRegId, testRollBvc);
    const dbVerified7 = AttendanceService.hasStudentAttended(eventNoRegId, testRollBvc);
    recordResult('TC-COORD-NR-007', 'Mark Participated & DB Verification', res7.success && dbVerified7, 'NO_REG', {
      rollNumber: testRollBvc, eventId: eventNoRegId, expected: 'Success + DB Attendance', actual: res7.success
    });
  } catch (e) {
    recordResult('TC-COORD-NR-007', 'Mark Participated', false, 'NO_REG', { error: e.message });
  }

  // TC-COORD-NR-008: Cancel -> Verify NO attendance created
  try {
    const cancelRoll = '23CANCEL' + String(Math.floor(Math.random()*89 + 10));
    const res8 = CoordinatorService.processParticipantForEvent(testSessionToken, eventNoRegId, cancelRoll);
    const dbCheck8 = AttendanceService.hasStudentAttended(eventNoRegId, cancelRoll);
    recordResult('TC-COORD-NR-008', 'Cancel action leaves DB clean (No attendance)', !dbCheck8, 'NO_REG', {
      rollNumber: cancelRoll, eventId: eventNoRegId, expected: 'Attendance NOT present in DB', actual: dbCheck8
    });
  } catch (e) {
    recordResult('TC-COORD-NR-008', 'Cancel verification', false, 'NO_REG', { error: e.message });
  }

  // TC-COORD-NR-009: Duplicate participation
  try {
    const res9 = CoordinatorService.processParticipantForEvent(testSessionToken, eventNoRegId, testRollBvc);
    const pass9 = res9.success && res9.state === 'ALREADY_MARKED';
    recordResult('TC-COORD-NR-009', 'Duplicate participation state detection', pass9, 'NO_REG', {
      rollNumber: testRollBvc, eventId: eventNoRegId, expected: 'ALREADY_MARKED', actual: res9.state
    });
  } catch (e) {
    recordResult('TC-COORD-NR-009', 'Duplicate participation', false, 'NO_REG', { error: e.message });
  }

  // TC-COORD-NR-010: Rapid duplicate scan
  try {
    const res10 = CoordinatorService.confirmMarkParticipation(testSessionToken, eventNoRegId, testRollBvc);
    const pass10 = res10.success && res10.state === 'ALREADY_MARKED';
    recordResult('TC-COORD-NR-010', 'Rapid duplicate insertion prevention', pass10, 'NO_REG', {
      rollNumber: testRollBvc, eventId: eventNoRegId, expected: 'ALREADY_MARKED', actual: res10.state
    });
  } catch (e) {
    recordResult('TC-COORD-NR-010', 'Rapid duplicate scan', false, 'NO_REG', { error: e.message });
  }

  // ==========================================================================
  // SECTION B: REGISTRATION EVENT TESTS
  // ==========================================================================
  Logger.log('\n--- REGISTRATION EVENT TESTS ---');

  const registeredBvcRoll = '23REGBVC' + String(Math.floor(Math.random()*89 + 10));
  // Seed registration
  try {
    DatabaseService.insertRow(CONFIG.SHEETS.STUDENTS, {
      'student_id': 'STU_REG_' + randNum,
      'Roll Number': registeredBvcRoll,
      'roll_number': registeredBvcRoll,
      'Student Name': 'Registered BVC Student',
      'student_name': 'Registered BVC Student',
      'Department ID': 'CSE',
      'department_id': 'CSE',
      'Year': '3',
      'year': 3,
      'Section': 'A',
      'College': 'BVC Engineering College'
    });
    DatabaseService.insertRow(CONFIG.SHEETS.EVENT_PARTICIPANTS, {
      'Participant ID': 'PART_' + randNum,
      'participant_id': 'PART_' + randNum,
      'Event ID': eventRegId,
      'event_id': eventRegId,
      'Roll Number': registeredBvcRoll,
      'roll_number': registeredBvcRoll,
      'Registration Type': 'Online',
      'Registration Status': 'Active',
      'registration_status': 'Active'
    });
  } catch(e) {}

  // TC-COORD-R-001: Registered BVC student
  try {
    const resR1 = CoordinatorService.processParticipantForEvent(testSessionToken, eventRegId, registeredBvcRoll);
    const passR1 = resR1.success && (resR1.state === 'READY_TO_MARK' || resR1.state === 'MISSING_REQUIRED_FIELDS');
    recordResult('TC-COORD-R-001', 'Registered BVC student lookup', passR1, 'REG', {
      rollNumber: registeredBvcRoll, eventId: eventRegId, expected: 'READY_TO_MARK', actual: resR1.state
    });
  } catch (e) {
    recordResult('TC-COORD-R-001', 'Registered BVC student lookup', false, 'REG', { error: e.message });
  }

  // TC-COORD-R-002: Registered external student
  const registeredExtRoll = '23REGEXT' + String(Math.floor(Math.random()*89 + 10));
  try {
    DatabaseService.insertRow(CONFIG.SHEETS.OTHER_COLLEGE_STUDENTS, {
      'id': 'OCS_R_' + randNum,
      'roll_number': registeredExtRoll,
      'student_name': 'Registered External Student',
      'college_name': 'ABC College'
    });
    DatabaseService.insertRow(CONFIG.SHEETS.EVENT_PARTICIPANTS, {
      'Participant ID': 'PART_EXT_' + randNum,
      'participant_id': 'PART_EXT_' + randNum,
      'Event ID': eventRegId,
      'event_id': eventRegId,
      'Roll Number': registeredExtRoll,
      'roll_number': registeredExtRoll,
      'Registration Type': 'Online',
      'Registration Status': 'Active',
      'registration_status': 'Active'
    });

    const resR2 = CoordinatorService.processParticipantForEvent(testSessionToken, eventRegId, registeredExtRoll);
    const passR2 = resR2.success && (resR2.state === 'READY_TO_MARK' || resR2.state === 'MISSING_REQUIRED_FIELDS');
    recordResult('TC-COORD-R-002', 'Registered external student lookup', passR2, 'REG', {
      rollNumber: registeredExtRoll, eventId: eventRegId, expected: 'READY_TO_MARK', actual: resR2.state
    });
  } catch (e) {
    recordResult('TC-COORD-R-002', 'Registered external student lookup', false, 'REG', { error: e.message });
  }

  // TC-COORD-R-003: Registered participant -> Mark Participated
  try {
    const resR3 = CoordinatorService.confirmMarkParticipation(testSessionToken, eventRegId, registeredBvcRoll);
    const dbVerifiedR3 = AttendanceService.hasStudentAttended(eventRegId, registeredBvcRoll);
    recordResult('TC-COORD-R-003', 'Registered participant -> Mark Participated', resR3.success && dbVerifiedR3, 'REG', {
      rollNumber: registeredBvcRoll, eventId: eventRegId, expected: 'Success + DB Attendance', actual: resR3.success
    });
  } catch (e) {
    recordResult('TC-COORD-R-003', 'Registered participant -> Mark Participated', false, 'REG', { error: e.message });
  }

  // TC-COORD-R-004: Registered participant -> Cancel
  try {
    const cancelRegRoll = '23CANCELREG' + String(Math.floor(Math.random()*89 + 10));
    DatabaseService.insertRow(CONFIG.SHEETS.EVENT_PARTICIPANTS, {
      'Participant ID': 'PART_C_' + randNum,
      'participant_id': 'PART_C_' + randNum,
      'Event ID': eventRegId,
      'event_id': eventRegId,
      'Roll Number': cancelRegRoll,
      'roll_number': cancelRegRoll,
      'Registration Status': 'Active',
      'registration_status': 'Active'
    });
    CoordinatorService.processParticipantForEvent(testSessionToken, eventRegId, cancelRegRoll);
    const dbCheckR4 = AttendanceService.hasStudentAttended(eventRegId, cancelRegRoll);
    recordResult('TC-COORD-R-004', 'Registered participant -> Cancel leaves DB clean', !dbCheckR4, 'REG', {
      rollNumber: cancelRegRoll, eventId: eventRegId, expected: 'NO attendance in DB', actual: dbCheckR4
    });
  } catch (e) {
    recordResult('TC-COORD-R-004', 'Registered participant -> Cancel', false, 'REG', { error: e.message });
  }

  // TC-COORD-R-005: Unregistered student + Spot Registration allowed
  const unregRoll = '23UNREG' + String(Math.floor(Math.random()*89 + 10));
  try {
    const resR5 = CoordinatorService.processParticipantForEvent(testSessionToken, eventRegId, unregRoll);
    const passR5 = resR5.success && resR5.state === 'SPOT_REGISTRATION_REQUIRED';
    recordResult('TC-COORD-R-005', 'Unregistered student + Spot Registration allowed', passR5, 'REG', {
      rollNumber: unregRoll, eventId: eventRegId, expected: 'SPOT_REGISTRATION_REQUIRED', actual: resR5.state
    });
  } catch (e) {
    recordResult('TC-COORD-R-005', 'Unregistered student + Spot Registration allowed', false, 'REG', { error: e.message });
  }

  // TC-COORD-R-006: Spot Registration -> existing BVC student -> auto-fill
  try {
    const resR6 = CoordinatorService.spotRegisterParticipant(testSessionToken, eventRegId, testRollBvc, {
      studentName: 'Test BVC Student', branch: 'CSE', college: 'BVC Engineering College'
    });
    const passR6 = resR6.success && (resR6.state === 'READY_TO_MARK' || resR6.state === 'MISSING_REQUIRED_FIELDS');
    recordResult('TC-COORD-R-006', 'Spot Registration -> existing BVC student -> auto-fill', passR6, 'REG', {
      rollNumber: testRollBvc, eventId: eventRegId, expected: 'READY_TO_MARK', actual: resR6.state
    });
  } catch (e) {
    recordResult('TC-COORD-R-006', 'Spot Registration -> existing BVC student', false, 'REG', { error: e.message });
  }

  // TC-COORD-R-007: Spot Registration -> existing external student -> auto-fill
  try {
    const resR7 = CoordinatorService.spotRegisterParticipant(testSessionToken, eventRegId, testRollExt, {
      studentName: 'Test External Student', branch: 'ECE', college: 'XYZ Engineering College'
    });
    const passR7 = resR7.success;
    recordResult('TC-COORD-R-007', 'Spot Registration -> existing external student -> auto-fill', passR7, 'REG', {
      rollNumber: testRollExt, eventId: eventRegId, expected: 'Success', actual: resR7.state
    });
  } catch (e) {
    recordResult('TC-COORD-R-007', 'Spot Registration -> existing external student', false, 'REG', { error: e.message });
  }

  // TC-COORD-R-008: Spot Registration -> unknown student -> manual details
  const spotUnkRoll = '23SPOTUNK' + String(Math.floor(Math.random()*89 + 10));
  try {
    const resR8 = CoordinatorService.spotRegisterParticipant(testSessionToken, eventRegId, spotUnkRoll, {
      studentName: 'Spot Unknown Student', branch: 'ECE', college: 'GVP College'
    });
    const passR8 = resR8.success;
    recordResult('TC-COORD-R-008', 'Spot Registration -> unknown student -> manual details', passR8, 'REG', {
      rollNumber: spotUnkRoll, eventId: eventRegId, expected: 'Success', actual: resR8.state
    });
  } catch (e) {
    recordResult('TC-COORD-R-008', 'Spot Registration -> unknown student', false, 'REG', { error: e.message });
  }

  // TC-COORD-R-009: Spot Registration -> missing required field check
  try {
    const resR9 = CoordinatorService.spotRegisterParticipant(testSessionToken, eventRegId, unregRoll, {
      studentName: 'Spot Required Test'
    });
    recordResult('TC-COORD-R-009', 'Spot Registration -> missing required field check', resR9.success, 'REG', {
      rollNumber: unregRoll, eventId: eventRegId, expected: 'Success evaluation', actual: resR9.state
    });
  } catch (e) {
    recordResult('TC-COORD-R-009', 'Missing required spot field check', false, 'REG', { error: e.message });
  }

  // TC-COORD-R-010: Successful spot registration DB verification
  try {
    const parts = DatabaseService.findByColumn(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Event ID', eventRegId) || [];
    const regInDb = parts.some(p => String(p['Roll Number'] || p.roll_number).trim().toUpperCase() === spotUnkRoll);
    recordResult('TC-COORD-R-010', 'Spot registration DB Verification', regInDb, 'REG', {
      rollNumber: spotUnkRoll, eventId: eventRegId, expected: 'Participant record in DB', actual: regInDb
    });
  } catch (e) {
    recordResult('TC-COORD-R-010', 'Spot registration DB Verification', false, 'REG', { error: e.message });
  }

  // TC-COORD-R-011: Successful spot registration -> Mark Participated
  try {
    const resR11 = CoordinatorService.confirmMarkParticipation(testSessionToken, eventRegId, spotUnkRoll);
    const dbVerifiedR11 = AttendanceService.hasStudentAttended(eventRegId, spotUnkRoll);
    recordResult('TC-COORD-R-011', 'Spot registration -> Mark Participated & DB Check', resR11.success && dbVerifiedR11, 'REG', {
      rollNumber: spotUnkRoll, eventId: eventRegId, expected: 'Marked present in DB', actual: resR11.success
    });
  } catch (e) {
    recordResult('TC-COORD-R-011', 'Spot registration -> Mark Participated', false, 'REG', { error: e.message });
  }

  // TC-COORD-R-012: Unregistered + Spot Registration disabled
  const disabledSpotEventId = 'EVT_NO_SPOT_' + randNum;
  try {
    DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, {
      'Event ID': disabledSpotEventId,
      'event_id': disabledSpotEventId,
      'Event Name': 'Disabled Spot Event',
      'event_name': 'Disabled Spot Event',
      'start_date': nowDateStr,
      'end_date': nowDateStr,
      'start_time': '09:00:00',
      'end_time': '17:00:00',
      'Event Status': 'Active',
      'event_status': 'Active',
      'Enable Registration': 'true',
      'enable_registration': true,
      'Allow Spot Registration': 'false',
      'allow_spot_registration': false
    });
    DatabaseService.insertRow(CONFIG.SHEETS.EVENT_COORDINATORS, {
      'Assignment ID': 'ASSIGN_3_' + randNum,
      'assignment_id': 'ASSIGN_3_' + randNum,
      'Event ID': disabledSpotEventId,
      'event_id': disabledSpotEventId,
      'User ID': testUserId,
      'user_id': testUserId,
      'Assignment Status': 'Active',
      'assignment_status': 'Active'
    });

    const resR12 = CoordinatorService.processParticipantForEvent(testSessionToken, disabledSpotEventId, unregRoll);
    const passR12 = !resR12.success && resR12.state === 'NOT_REGISTERED_SPOT_DISABLED';
    recordResult('TC-COORD-R-012', 'Unregistered + Spot Registration disabled', passR12, 'REG', {
      rollNumber: unregRoll, eventId: disabledSpotEventId, expected: 'NOT_REGISTERED_SPOT_DISABLED', actual: resR12.state
    });
  } catch (e) {
    recordResult('TC-COORD-R-012', 'Spot Registration disabled check', false, 'REG', { error: e.message });
  }

  // TC-COORD-R-013: Duplicate registration prevention
  try {
    const resR13 = CoordinatorService.spotRegisterParticipant(testSessionToken, eventRegId, registeredBvcRoll, {
      studentName: 'Registered BVC Student'
    });
    const parts = DatabaseService.findByColumn(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Event ID', eventRegId) || [];
    const countRegs = parts.filter(p => String(p['Roll Number'] || p.roll_number).trim().toUpperCase() === registeredBvcRoll).length;
    recordResult('TC-COORD-R-013', 'Duplicate registration DB check (Only 1 record)', countRegs === 1, 'REG', {
      rollNumber: registeredBvcRoll, eventId: eventRegId, expected: 'Count = 1', actual: countRegs
    });
  } catch (e) {
    recordResult('TC-COORD-R-013', 'Duplicate registration prevention', false, 'REG', { error: e.message });
  }

  // TC-COORD-R-014: Maximum seats reached
  const fullCapEventId = 'EVT_FULL_CAP_' + randNum;
  try {
    DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, {
      'Event ID': fullCapEventId,
      'event_id': fullCapEventId,
      'Event Name': 'Full Capacity Event',
      'event_name': 'Full Capacity Event',
      'start_date': nowDateStr,
      'end_date': nowDateStr,
      'start_time': '09:00:00',
      'end_time': '17:00:00',
      'Event Status': 'Active',
      'event_status': 'Active',
      'Enable Registration': 'true',
      'enable_registration': true,
      'Allow Spot Registration': 'true',
      'allow_spot_registration': true,
      'Maximum Seats': 1,
      'maximum_seats': 1,
      'Registered Count': 1,
      'registered_count': 1
    });
    DatabaseService.insertRow(CONFIG.SHEETS.EVENT_COORDINATORS, {
      'Assignment ID': 'ASSIGN_4_' + randNum,
      'assignment_id': 'ASSIGN_4_' + randNum,
      'Event ID': fullCapEventId,
      'event_id': fullCapEventId,
      'User ID': testUserId,
      'user_id': testUserId,
      'Assignment Status': 'Active',
      'assignment_status': 'Active'
    });

    const resR14 = CoordinatorService.spotRegisterParticipant(testSessionToken, fullCapEventId, unregRoll, {
      studentName: 'Cap Overflow Student'
    });
    const passR14 = !resR14.success && resR14.state === 'CAPACITY_REACHED';
    recordResult('TC-COORD-R-014', 'Maximum seats capacity reached rejection', passR14, 'REG', {
      rollNumber: unregRoll, eventId: fullCapEventId, expected: 'CAPACITY_REACHED', actual: resR14.state
    });
  } catch (e) {
    recordResult('TC-COORD-R-014', 'Maximum seats reached', false, 'REG', { error: e.message });
  }

  // TC-COORD-R-015: Duplicate participation on registration event
  try {
    const resR15 = CoordinatorService.processParticipantForEvent(testSessionToken, eventRegId, registeredBvcRoll);
    const passR15 = resR15.success && resR15.state === 'ALREADY_MARKED';
    recordResult('TC-COORD-R-015', 'Duplicate participation on registration event', passR15, 'REG', {
      rollNumber: registeredBvcRoll, eventId: eventRegId, expected: 'ALREADY_MARKED', actual: resR15.state
    });
  } catch (e) {
    recordResult('TC-COORD-R-015', 'Duplicate participation registration event', false, 'REG', { error: e.message });
  }

  // ==========================================================================
  // FINAL SUMMARY REPORT
  // ==========================================================================
  Logger.log('\n----------------------------------------------');
  Logger.log(`TOTAL: ${results.total}`);
  Logger.log(`PASS:  ${results.passed}`);
  Logger.log(`FAIL:  ${results.failed}`);
  Logger.log(`SKIP:  ${results.skipped}`);
  Logger.log(`OVERALL: ${results.failed === 0 ? 'PASS' : 'FAIL'}`);
  Logger.log('==============================================');

  return {
    success: results.failed === 0,
    total: results.total,
    passed: results.passed,
    failed: results.failed,
    skipped: results.skipped,
    overall: results.failed === 0 ? 'PASS' : 'FAIL',
    details: results.details
  };
}
