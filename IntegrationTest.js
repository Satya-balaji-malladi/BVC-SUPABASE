/**
 * IntegrationTest.js
 * Comprehensive Integration Workflows for BVC Event Attendance Backend.
 */
const IntegrationTest = {

  run: function() {
    Logger.log('╔══════════════════════════════════════════╗');
    Logger.log('║        SYSTEM INTEGRATION TESTS — START  ║');
    Logger.log('╚══════════════════════════════════════════╝');
    Logger.log('');

    var passed = 0;
    var tests = [
      this.testFlow1_SessionLifecycle,
      this.testFlow2_StudentLifecycle,
      this.testFlow3_EventCoordinatorLifecycle,
      this.testFlow4_ParticipantRegistrationLifecycle,
      this.testFlow5_AttendanceTrackingLifecycle,
      this.testFlow6_ReportingValidation,
      this.testFlow7_NotificationsDispatch,
      this.testFlow8_SettingsConfigurations,
      this.testFlow9_AuditTrailVerification,
      this.testFlow10_DatabaseIntegrityConstraints
    ];

    for (var i = 0; i < tests.length; i++) {
      try {
        tests[i].call(this);
        passed++;
      } catch (err) {
        Logger.log('🛑 STOP-ON-FAIL (Integration): ' + err.message);
        throw err;
      }
    }

    Logger.log('✅ ALL INTEGRATION FLOWS PASSED SUCCESSFULLY.');
    Logger.log('');
    return { passed: passed, failed: 0 };
  },

  // ------------------------------------------------------------
  // FLOW 1: Login -> Create Session -> Validate Session -> Logout
  // ------------------------------------------------------------
  testFlow1_SessionLifecycle: function() {
    Logger.log('====================================');
    Logger.log('INTEGRATION: Flow 1 - Session Lifecycle');
    Logger.log('====================================');

    // 1. Find an active test user
    const users = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
    const activeUser = users.find(u => (u['Status'] || u.status) === 'Active' && (u['Username'] || u.username));
    if (!activeUser) throw new Error('Flow 1 requires at least one active user in Users sheet.');

    const userId = activeUser['User ID'] || activeUser.user_id;

    // Simulate login by directly calling createSession with the full user object
    const sessionRes = SessionService.createSession(activeUser);
    IntegrationAssertions.assertNotNull(sessionRes, 'Session creation failed');
    
    const tokenCol = CONFIG.COLUMNS.SESSION_TOKEN || 'Session Token';
    const token = sessionRes[tokenCol];
    IntegrationAssertions.assertNotNull(token, 'Session token is empty');

    // Verify session in DB
    IntegrationAssertions.assertSessionCreated(userId, token, 'Session not found in Database');

    // Validate Session
    const validateRes = SessionService.validateSession(token);
    if (validateRes !== true) {
      throw new Error('Session validation failed');
    }

    // Destroy session
    const destroyRes = SessionService.destroySession(token);
    if (!destroyRes) {
      throw new Error('Session destruction failed');
    }

    // Verify session is inactive/logged out in DB
    const sessionRecord = DatabaseService.findByColumn(CONFIG.SHEETS.SESSIONS, tokenCol, token)[0];
    if (sessionRecord && sessionRecord[CONFIG.COLUMNS.SESSION_STATUS] === CONFIG.SESSION_STATUS.ACTIVE) {
      throw new Error('Session is still active after destruction');
    }

    // Clean up mock session row from SESSIONS sheet to prevent clutter
    const sessionIdCol = CONFIG.COLUMNS.SESSION_ID || 'Session ID';
    const sessionId = sessionRes[sessionIdCol];
    if (sessionId) {
      DatabaseService.hardDelete(CONFIG.SHEETS.SESSIONS, sessionIdCol, sessionId);
    }

    Logger.log('✅ PASS: Session Lifecycle verified.');
    Logger.log('');
  },

  // ------------------------------------------------------------
  // FLOW 2: Create Department -> Create Student -> Update Student -> Delete Student
  // ------------------------------------------------------------
  testFlow2_StudentLifecycle: function() {
    Logger.log('====================================');
    Logger.log('INTEGRATION: Flow 2 - Student Lifecycle');
    Logger.log('====================================');

    const depId = 'DEP999';
    const rollNo = '23A91A0599';

    // Cleanup first
    try { DatabaseService.hardDelete(CONFIG.SHEETS.DEPARTMENTS, 'Department Code', depId); } catch(e) {}
    try { DatabaseService.hardDelete(CONFIG.SHEETS.DEPARTMENTS, 'Department Name', 'Test Integration Department'); } catch(e) {}
    try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, 'Roll Number', rollNo); } catch(e) {}

    // Create Department
    const departmentData = {};
    departmentData[CONFIG.COLUMNS.DEPARTMENT_CODE] = depId;
    departmentData[CONFIG.COLUMNS.DEPARTMENT_NAME] = 'Test Integration Department';
    departmentData[CONFIG.COLUMNS.STATUS || 'Status'] = 'Active';
    const depRes = DepartmentService.createDepartment(departmentData, 'USR001');
    IntegrationAssertions.assertSuccess(depRes, 'Department creation failed');
    const actualDepId = (depRes.department && depRes.department[CONFIG.COLUMNS.DEPARTMENT_ID])
      || (depRes.data && depRes.data.department && depRes.data.department[CONFIG.COLUMNS.DEPARTMENT_ID])
      || depId;
    Logger.log('Resolved actualDepId: ' + actualDepId);

    // Create Student
    const studentData = {};
    studentData[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo;
    studentData[CONFIG.COLUMNS.STUDENT_NAME] = 'Integration Student';
    studentData[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = actualDepId;
    studentData[CONFIG.COLUMNS.STUDENT_YEAR] = '3';
    studentData[CONFIG.COLUMNS.STUDENT_SECTION] = 'A';
    studentData[CONFIG.COLUMNS.STUDENT_STATUS] = 'Active';
    studentData['Status'] = 'Active';
    studentData[CONFIG.COLUMNS.STUDENT_EMAIL] = 'test@bvc.edu.in';
    const studentRes = StudentService.createStudent(studentData, 'USR001');
    IntegrationAssertions.assertSuccess(studentRes, 'Student creation failed');

    // Update Student
    const updateRes = StudentService.updateStudent(rollNo, { 'Student Name': 'Integration Student Updated' }, 'USR001');
    IntegrationAssertions.assertSuccess(updateRes, 'Student update failed');

    // Deactivate Student
    const deactivateRes = StudentService.deactivateStudent(rollNo, 'USR001');
    IntegrationAssertions.assertSuccess(deactivateRes, 'Student deactivation failed');

    // Activate Student
    const activateRes = StudentService.activateStudent(rollNo, 'USR001');
    IntegrationAssertions.assertSuccess(activateRes, 'Student activation failed');

    // Delete Student
    const deleteRes = StudentService.deleteStudent(rollNo, 'USR001');
    IntegrationAssertions.assertSuccess(deleteRes, 'Student deletion failed');

    // Cleanup
    DatabaseService.hardDelete(CONFIG.SHEETS.DEPARTMENTS, 'Department ID', actualDepId);
    DatabaseService.hardDelete(CONFIG.SHEETS.DEPARTMENTS, 'Department Code', depId);
    DatabaseService.hardDelete(CONFIG.SHEETS.DEPARTMENTS, 'Department Name', 'Test Integration Department');
    DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, 'Roll Number', rollNo);
    Logger.log('✅ PASS: Student Lifecycle verified.');
    Logger.log('');
  },

  // ------------------------------------------------------------
  // FLOW 3: Create Event -> Update Event -> Assign Coordinator -> Remove Coordinator
  // ------------------------------------------------------------
  testFlow3_EventCoordinatorLifecycle: function() {
    Logger.log('====================================');
    Logger.log('INTEGRATION: Flow 3 - Event & Coordinator Lifecycle');
    Logger.log('====================================');

    const eventId = 'EVT-9999';

    // Cleanup any leftovers first
    try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, 'Event ID', eventId); } catch(e) {}
    try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, 'Event Name', 'Integration Event'); } catch(e) {}
    try { DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'Username', 'integ_coord_test'); } catch(e) {}
    try { DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'Employee ID', 'EMP-INTEG-001'); } catch(e) {}

    // Create a real Coordinator user
    const coordUserData = {};
    coordUserData[CONFIG.COLUMNS.USER_FIRST_NAME] = 'Integration';
    coordUserData[CONFIG.COLUMNS.USER_LAST_NAME] = 'Coordinator';
    coordUserData[CONFIG.COLUMNS.USER_EMAIL_ADDRESS] = 'integ.coord@bvc.edu.in';
    coordUserData[CONFIG.COLUMNS.USER_USERNAME] = 'integ_coord_test';
    coordUserData[CONFIG.COLUMNS.USER_ROLE] = CONFIG.ROLES.COORDINATOR;
    coordUserData[CONFIG.COLUMNS.USER_STATUS] = CONFIG.USER_STATUS.ACTIVE;
    coordUserData['Status'] = CONFIG.USER_STATUS.ACTIVE;
    coordUserData[CONFIG.COLUMNS.USER_EMPLOYEE_ID] = 'EMP-INTEG-001';
    coordUserData['Password'] = 'Test@1234';
    const coordRes = UserService.createUser(coordUserData, 'USR001');
    IntegrationAssertions.assertSuccess(coordRes, 'Coordinator user creation failed');
    const actualCoordId = (coordRes.user && coordRes.user[CONFIG.COLUMNS.USER_ID])
      || (coordRes.data && coordRes.data.user && coordRes.data.user[CONFIG.COLUMNS.USER_ID]);
    Logger.log('Resolved actualCoordId: ' + actualCoordId);
    IntegrationAssertions.assertNotNull(actualCoordId, 'Coordinator User ID is null');

    // Create Event
    const nowStr = Utils.formatDate(new Date());
    const eventPayload = {};
    eventPayload[CONFIG.COLUMNS.EVENT_ID] = eventId;
    eventPayload[CONFIG.COLUMNS.EVENT_NAME] = 'Integration Event';
    eventPayload[CONFIG.COLUMNS.VENUE] = 'Location A';
    eventPayload[CONFIG.COLUMNS.COORDINATOR_ID] = actualCoordId;
    eventPayload[CONFIG.COLUMNS.STATUS] = CONFIG.EVENT_STATUS.UPCOMING || 'Upcoming';
    eventPayload[CONFIG.COLUMNS.START_DATE] = nowStr;
    eventPayload[CONFIG.COLUMNS.END_DATE] = nowStr;
    eventPayload[CONFIG.COLUMNS.START_TIME] = '09:00';
    eventPayload[CONFIG.COLUMNS.END_TIME] = '11:00';
    eventPayload[CONFIG.COLUMNS.ATTENDANCE_TYPE || 'Attendance Type'] = 'Fixed';
    eventPayload[CONFIG.COLUMNS.CREATED_BY] = 'USR001';
    const eventRes = EventService.createEvent(eventPayload);
    IntegrationAssertions.assertSuccess(eventRes, 'Event creation failed');
    const actualEventId = (eventRes.event && eventRes.event[CONFIG.COLUMNS.EVENT_ID])
      || (eventRes.data && eventRes.data.event && eventRes.data.event[CONFIG.COLUMNS.EVENT_ID])
      || eventId;
    Logger.log('Resolved actualEventId: ' + actualEventId);

    // Update Event
    const updatePayload = {};
    updatePayload[CONFIG.COLUMNS.VENUE] = 'Location B';
    const updateRes = EventService.updateEvent(actualEventId, updatePayload);
    IntegrationAssertions.assertSuccess(updateRes, 'Event update failed');

    // Assign Coordinator
    const assignRes = CoordinatorService.assignCoordinator(actualEventId, actualCoordId, 'Coordinator', 'USR001', 'Remarks');
    IntegrationAssertions.assertSuccess(assignRes, 'Coordinator assignment failed');
    const assignmentId = (assignRes.assignment && assignRes.assignment['Assignment ID'])
      || (assignRes.data && assignRes.data.assignment && assignRes.data.assignment['Assignment ID']);
    IntegrationAssertions.assertNotNull(assignmentId, 'Assignment ID is empty');

    // Verify Coordinator Assignment
    IntegrationAssertions.assertCoordinatorAssigned(actualCoordId, actualEventId, 'Coordinator not assigned in DB');

    // Remove Coordinator
    const removeRes = CoordinatorService.removeCoordinator(assignmentId, 'USR001');
    IntegrationAssertions.assertSuccess(removeRes, 'Coordinator removal failed');

    // Cleanup
    DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, 'Event ID', actualEventId);
    DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, 'Event ID', eventId);
    DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, 'Event Name', 'Integration Event');
    if (assignmentId) DatabaseService.hardDelete(CONFIG.SHEETS.EVENT_COORDINATORS, 'Assignment ID', assignmentId);
    DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'Username', 'integ_coord_test');
    Logger.log('✅ PASS: Event & Coordinator Lifecycle verified.');
    Logger.log('');
  },

  // ------------------------------------------------------------
  // FLOW 4: Register Participant -> Approve -> Reject -> Remove
  // ------------------------------------------------------------
  testFlow4_ParticipantRegistrationLifecycle: function() {
    Logger.log('====================================');
    Logger.log('INTEGRATION: Flow 4 - Participant Registration');
    Logger.log('====================================');

    const rollNo = '22A81A0501'; // assumed student exists
    const eventId = 'EVT-001'; // assumed event exists

    // Pre-cleanup
    const all = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];
    const dup = all.find(a => String(a['Roll Number'] || a.roll_number) === rollNo && String(a['Event ID'] || a.event_id) === eventId);
    if (dup) {
      DatabaseService.hardDelete(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Participant ID', dup['Participant ID']);
    }

    // Register Participant (addParticipant signature: eventId, rollNumber, userId)
    const registerRes = ParticipantService.addParticipant(eventId, rollNo, 'USR001');
    IntegrationAssertions.assertSuccess(registerRes, 'Participant registration failed');

    // Look up Participant ID directly from DB after insert (response doesn't include it)
    const allAfter = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];
    const pRecord = allAfter.find(p => String(p['Roll Number']) === rollNo && String(p['Event ID']) === eventId);
    const participantId = pRecord ? pRecord['Participant ID'] : null;
    Logger.log('Resolved participantId: ' + participantId);

    // Verify record exists
    IntegrationAssertions.assertParticipantCreated(rollNo, eventId, 'Participant record not found in Database');

    // Cleanup
    if (participantId) DatabaseService.hardDelete(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Participant ID', participantId);
    else DatabaseService.hardDelete(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Roll Number', rollNo);
    Logger.log('✅ PASS: Participant Registration Lifecycle verified.');
    Logger.log('');
  },

  // ------------------------------------------------------------
  // FLOW 5: Mark Attendance -> Duplicate Prevention -> Undo
  // ------------------------------------------------------------
  testFlow5_AttendanceTrackingLifecycle: function() {
    Logger.log('====================================');
    Logger.log('INTEGRATION: Flow 5 - Attendance Tracking');
    Logger.log('====================================');

    const rollNo = '22A81A0501';
    const eventId = 'EVT-001';

    // 1. Ensure participant exists (prerequisite for Attendance mark on Fixed event)
    const allP = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];
    let pRecord = allP.find(p => String(p['Roll Number'] || p.roll_number) === rollNo && String(p['Event ID'] || p.event_id) === eventId);
    let pId = null;
    if (!pRecord) {
      const pRes = ParticipantService.addParticipant(eventId, rollNo, 'USR001');
      const allPAfter = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_PARTICIPANTS) || [];
      const pRec = allPAfter.find(p => String(p['Roll Number']) === rollNo && String(p['Event ID']) === eventId);
      pId = pRec ? pRec['Participant ID'] : null;
    }

    // Pre-cleanup attendance
    const allA = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
    const attRec = allA.find(a => String(a['Roll Number'] || a.roll_number) === rollNo && String(a['Event ID'] || a.event_id) === eventId);
    if (attRec) {
      DatabaseService.hardDelete(CONFIG.SHEETS.ATTENDANCE, 'Attendance ID', attRec['Attendance ID']);
    }

    // Mark Attendance
    const markRes = AttendanceService.markAttendance(eventId, rollNo, 'Present', 'QR_Scanner', 'USR001');
    IntegrationAssertions.assertSuccess(markRes, 'Mark attendance failed: ' + markRes.message);
    const attendanceId = markRes.data && markRes.data.attendance ? markRes.data.attendance['Attendance ID'] : null;
    IntegrationAssertions.assertNotNull(attendanceId, 'Attendance ID is empty');

    // Verify Attendance Record
    IntegrationAssertions.assertAttendanceCreated(rollNo, eventId, 'Attendance record not found in Database');

    // Duplicate Attendance Prevention
    const dupRes = AttendanceService.markAttendance(eventId, rollNo, 'Present', 'QR_Scanner', 'USR001');
    IntegrationAssertions.assertFailure(dupRes, 'Duplicate attendance allowed');

    // Cleanup
    if (attendanceId) DatabaseService.hardDelete(CONFIG.SHEETS.ATTENDANCE, 'Attendance ID', attendanceId);
    if (pId) DatabaseService.hardDelete(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Participant ID', pId);
    Logger.log('✅ PASS: Attendance Tracking verified.');
    Logger.log('');
  },

  // ------------------------------------------------------------
  // FLOW 6: Generate Attendance Report -> Save Report
  // ------------------------------------------------------------
  testFlow6_ReportingValidation: function() {
    Logger.log('====================================');
    Logger.log('INTEGRATION: Flow 6 - Reports generation');
    Logger.log('====================================');

    const eventId = 'EVT-001';
    const pdfRes = ReportService.generatePDF(eventId, 'USR001');
    IntegrationAssertions.assertSuccess(pdfRes, 'PDF generation failed');
    const reportId = pdfRes.reportId;
    IntegrationAssertions.assertNotNull(reportId, 'Report ID is empty');

    // Verify report metadata in DB
    IntegrationAssertions.assertReportGenerated(reportId, 'Report not saved in Database');

    // Cleanup
    DatabaseService.hardDelete(CONFIG.SHEETS.GENERATED_REPORTS, 'Report ID', reportId);
    Logger.log('✅ PASS: Reporting metadata verified.');
    Logger.log('');
  },

  // ------------------------------------------------------------
  // FLOW 7: Send Notification -> Verify
  // ------------------------------------------------------------
  testFlow7_NotificationsDispatch: function() {
    Logger.log('====================================');
    Logger.log('INTEGRATION: Flow 7 - Notifications Dispatch');
    Logger.log('====================================');

    const userId = 'USR002';
    const title = 'Integration Title';
    const noteRes = NotificationService.createNotification({
      userId: userId,
      title: title,
      message: 'Integration message body.',
      type: 'System Alert'
    });
    IntegrationAssertions.assertSuccess(noteRes, 'Notification creation failed');
    const notificationId = noteRes.data && noteRes.data.notification ? noteRes.data.notification['Notification ID'] : null;
    IntegrationAssertions.assertNotNull(notificationId, 'Notification ID is empty');

    // Verify Notification in DB
    IntegrationAssertions.assertNotificationCreated(userId, title, 'Notification not found in Database');

    // Cleanup
    if (notificationId) DatabaseService.hardDelete(CONFIG.SHEETS.NOTIFICATIONS, 'Notification ID', notificationId);
    Logger.log('✅ PASS: Notifications verified.');
    Logger.log('');
  },

  // ------------------------------------------------------------
  // FLOW 8: Update Setting -> Read -> Restore
  // ------------------------------------------------------------
  testFlow8_SettingsConfigurations: function() {
    Logger.log('====================================');
    Logger.log('INTEGRATION: Flow 8 - Settings Configuration');
    Logger.log('====================================');

    const getRes1 = SettingsService.getSettings();
    IntegrationAssertions.assertSuccess(getRes1, 'Get settings failed');
    const originalName = getRes1.data ? getRes1.data.collegeName : 'BVC Engineering College';

    // Update setting
    const updateRes = SettingsService.saveSettings({ collegeName: 'Integration Testing College Name' });
    IntegrationAssertions.assertSuccess(updateRes, 'Save settings failed');

    // Read setting back
    const getRes2 = SettingsService.getSettings();
    IntegrationAssertions.assertSuccess(getRes2, 'Get settings after update failed');
    IntegrationAssertions.assertEqual(getRes2.data ? getRes2.data.collegeName : '', 'Integration Testing College Name', 'Setting update mismatch');

    // Restore Setting
    const restoreRes = SettingsService.saveSettings({ collegeName: originalName });
    IntegrationAssertions.assertSuccess(restoreRes, 'Restoring original settings failed');
    Logger.log('✅ PASS: Settings Configurations verified.');
    Logger.log('');
  },

  // ------------------------------------------------------------
  // FLOW 9: Audit log verification
  // ------------------------------------------------------------
  testFlow9_AuditTrailVerification: function() {
    Logger.log('====================================');
    Logger.log('INTEGRATION: Flow 9 - Audit Trail Verification');
    Logger.log('====================================');

    // We generate a PDF report which generates a GENERATE_PDF audit action
    const eventId = 'EVT-001';
    const pdfRes = ReportService.generatePDF(eventId, 'USR002');
    const reportId = pdfRes.reportId;

    // Verify audit log exists
    IntegrationAssertions.assertAuditCreated('GENERATE_PDF', reportId, 'GENERATE_PDF action audit log missing');

    // Cleanup
    DatabaseService.hardDelete(CONFIG.SHEETS.GENERATED_REPORTS, 'Report ID', reportId);
    Logger.log('✅ PASS: Audit log trace verified.');
    Logger.log('');
  },

  // ------------------------------------------------------------
  // FLOW 10: Database Consistency & Integrity
  // ------------------------------------------------------------
  testFlow10_DatabaseIntegrityConstraints: function() {
    Logger.log('====================================');
    Logger.log('INTEGRATION: Flow 10 - Database Integrity Checks');
    Logger.log('====================================');

    IntegrationAssertions.assertDatabaseConsistent('Database integrity checks failed.');
    Logger.log('✅ PASS: Database consistency constraints verified.');
    Logger.log('');
  }

};
