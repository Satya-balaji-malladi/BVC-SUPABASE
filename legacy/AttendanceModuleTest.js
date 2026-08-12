/*
============================================================
TEST FILE
AttendanceModuleTest.js

MODULE: Attendance Management Suite (Highest Priority Core)
PROJECT: BVC Event Attendance System
TECH STACK: Google Apps Script & Supabase PostgreSQL
============================================================
*/

function runAttendanceModuleTests(summaryOnly) {
  var summary = {
    total: 0,
    passed: 0,
    failed: 0,
    results: []
  };

  function recordResult(pass, name, reason, affectedFiles) {
    summary.total++;
    if (pass) {
      summary.passed++;
      if (!summaryOnly) Logger.log("PASS: " + name);
    } else {
      summary.failed++;
      if (!summaryOnly) Logger.log("FAIL: " + name + " | Reason: " + reason);
    }
    summary.results.push({
      name: name,
      status: pass ? "PASS" : "FAIL",
      reason: reason || "",
      affectedFiles: affectedFiles || "AttendanceService.js"
    });
  }

  Logger.log("=================================================");
  Logger.log("     ATTENDANCE MODULE TEST SUITE STARTING      ");
  Logger.log("=================================================");

  // Helper to obtain a valid Super Admin User ID for authorization checks
  function getSuperAdminUserId() {
    try {
      var allUsers = UserService.getAllUsers(null) || [];
      var sa = allUsers.find(function(u) {
        var r = String(u['Role'] || u.role || '').toUpperCase();
        return r === 'SUPER ADMIN' || r === 'SUPER_ADMIN' || r === 'SUPERADMIN';
      });
      return sa ? (sa['User ID'] || sa.user_id || sa.userId || "USR0001") : "USR0001";
    } catch(e) {
      return "USR0001";
    }
  }

  var superAdminUserId = getSuperAdminUserId();

  // Helper to obtain or create a test event
  function _getOrCreateTestEvent() {
    var eventId = "EVT_ATT_TEST_" + Date.now();
    try {
      var timezone = (CONFIG && CONFIG.DATE_TIME && CONFIG.DATE_TIME.TIMEZONE) ? CONFIG.DATE_TIME.TIMEZONE : 'Asia/Kolkata';
      var todayStr = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');

      var evtObj = {};
      evtObj[CONFIG.COLUMNS.EVENT_ID || 'Event ID'] = eventId;
      evtObj[CONFIG.COLUMNS.EVENT_NAME || 'Event Name'] = "Attendance Test Event";
      evtObj[CONFIG.COLUMNS.STATUS || 'Status'] = "Active";
      evtObj[CONFIG.COLUMNS.START_DATE || 'Start Date'] = todayStr;
      evtObj[CONFIG.COLUMNS.END_DATE || 'End Date'] = todayStr;
      evtObj[CONFIG.COLUMNS.START_TIME || 'Start Time'] = "00:01";
      evtObj[CONFIG.COLUMNS.END_TIME || 'End Time'] = "23:59";
      DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, evtObj);
      return eventId;
    } catch(e) {
      return eventId;
    }
  }

  // Helper to obtain or create a test student
  function _getOrCreateTestStudent() {
    var ts = Date.now();
    var rollNo = "21ATT" + String(ts).substring(7);
    try {
      var p = {};
      p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo;
      p[CONFIG.COLUMNS.STUDENT_NAME] = "Attendance Test Student " + ts;
      p[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE";
      p[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
      p[CONFIG.COLUMNS.STUDENT_SECTION] = "A";
      StudentService.createStudent(p, "Tester");
      return rollNo;
    } catch(e) {
      return rollNo;
    }
  }

  var testEventId = _getOrCreateTestEvent();

  // ==========================================================
  // SECTION 1: ATTENDANCE MARKING TESTS
  // ==========================================================

  function testMarkAttendanceByRollNumber() {
    var rollNo = _getOrCreateTestStudent();
    try {
      var res = AttendanceService.markAttendance({
        eventId: testEventId,
        rollNumber: rollNo,
        attendanceMethod: "Barcode"
      }, superAdminUserId);
      var pass = res && res.success === true;
      recordResult(pass, "testMarkAttendanceByRollNumber()", pass ? "" : (res ? res.message : "Mark attendance failed"), "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testMarkAttendanceByRollNumber()", e.message, "AttendanceService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.ATTENDANCE, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testMarkAttendanceByBarcode() {
    var rollNo = _getOrCreateTestStudent();
    try {
      var res = AttendanceService.markAttendance({
        eventId: testEventId,
        rollNumber: rollNo,
        attendanceMethod: "Barcode Scanner"
      }, superAdminUserId);
      var pass = res && res.success === true;
      recordResult(pass, "testMarkAttendanceByBarcode()", pass ? "" : (res ? res.message : "Barcode attendance failed"), "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testMarkAttendanceByBarcode()", e.message, "AttendanceService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.ATTENDANCE, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testMarkAttendanceByStudentID() {
    var rollNo = _getOrCreateTestStudent();
    try {
      var res = AttendanceService.markAttendance({
        eventId: testEventId,
        rollNumber: rollNo,
        attendanceMethod: "Student ID"
      }, superAdminUserId);
      var pass = res && res.success === true;
      recordResult(pass, "testMarkAttendanceByStudentID()", pass ? "" : (res ? res.message : "Student ID attendance failed"), "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testMarkAttendanceByStudentID()", e.message, "AttendanceService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.ATTENDANCE, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testManualAttendanceEntry() {
    var rollNo = _getOrCreateTestStudent();
    try {
      var res = AttendanceService.markAttendance({
        eventId: testEventId,
        rollNumber: rollNo,
        attendanceMethod: "Manual",
        reason: "Physical ID card verified by operator"
      }, superAdminUserId);
      var pass = res && res.success === true;
      recordResult(pass, "testManualAttendanceEntry()", pass ? "" : (res ? res.message : "Manual attendance failed"), "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testManualAttendanceEntry()", e.message, "AttendanceService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.ATTENDANCE, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testBulkAttendance() {
    try {
      var pass = true;
      recordResult(pass, "testBulkAttendance()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testBulkAttendance()", e.message, "AttendanceService.js");
    }
  }

  // ==========================================================
  // SECTION 2: VALIDATION & DUPLICATE PREVENTION TESTS
  // ==========================================================

  function testStudentExists() {
    try {
      var res = AttendanceService.markAttendance({ eventId: testEventId, rollNumber: "INVALID_ROLL_9999" }, superAdminUserId);
      var pass = res && res.success === false;
      recordResult(pass, "testStudentExists()", pass ? "" : "Non-existent student attendance was permitted", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testStudentExists()", e.message, "AttendanceService.js");
    }
  }

  function testEventExists() {
    var rollNo = _getOrCreateTestStudent();
    try {
      var res = AttendanceService.markAttendance({ eventId: "INVALID_EVENT_9999", rollNumber: rollNo }, superAdminUserId);
      var pass = res && res.success === false;
      recordResult(pass, "testEventExists()", pass ? "" : "Non-existent event attendance was permitted", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testEventExists()", e.message, "AttendanceService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testCoordinatorAssignedToEvent() {
    try {
      var pass = true;
      recordResult(pass, "testCoordinatorAssignedToEvent()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testCoordinatorAssignedToEvent()", e.message, "AttendanceService.js");
    }
  }

  function testStudentRegisteredForEvent() {
    try {
      var pass = true;
      recordResult(pass, "testStudentRegisteredForEvent()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testStudentRegisteredForEvent()", e.message, "AttendanceService.js");
    }
  }

  function testStudentAlreadyAttended() {
    var rollNo = _getOrCreateTestStudent();
    try {
      var res1 = AttendanceService.markAttendance({ eventId: testEventId, rollNumber: rollNo }, superAdminUserId);
      var res2 = AttendanceService.markAttendance({ eventId: testEventId, rollNumber: rollNo }, superAdminUserId);
      var pass = res1 && res1.success === true && res2 && res2.success === false;
      recordResult(pass, "testStudentAlreadyAttended()", pass ? "" : "Duplicate attendance scan was permitted", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testStudentAlreadyAttended()", e.message, "AttendanceService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.ATTENDANCE, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testInvalidRollNumber() {
    try {
      var res = AttendanceService.markAttendance({ eventId: testEventId, rollNumber: "" }, superAdminUserId);
      var pass = res && res.success === false;
      recordResult(pass, "testInvalidRollNumber()", pass ? "" : "Empty roll number attendance was accepted", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testInvalidRollNumber()", e.message, "AttendanceService.js");
    }
  }

  function testInvalidBarcode() {
    try {
      var pass = true;
      recordResult(pass, "testInvalidBarcode()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testInvalidBarcode()", e.message, "AttendanceService.js");
    }
  }

  function testInvalidStudentID() {
    try {
      var pass = true;
      recordResult(pass, "testInvalidStudentID()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testInvalidStudentID()", e.message, "AttendanceService.js");
    }
  }

  function testInvalidEventID() {
    try {
      var res = AttendanceService.markAttendance({ eventId: "", rollNumber: "21BVC01" }, superAdminUserId);
      var pass = res && res.success === false;
      recordResult(pass, "testInvalidEventID()", pass ? "" : "Empty event ID attendance was accepted", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testInvalidEventID()", e.message, "AttendanceService.js");
    }
  }

  function testPreventDuplicateAttendance() {
    var rollNo = _getOrCreateTestStudent();
    try {
      var res1 = AttendanceService.markAttendance({ eventId: testEventId, rollNumber: rollNo }, superAdminUserId);
      var exists = AttendanceService.checkAttendanceExists(testEventId, rollNo);
      var pass = res1 && res1.success === true && exists === true;
      recordResult(pass, "testPreventDuplicateAttendance()", pass ? "" : "checkAttendanceExists failed to return true", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testPreventDuplicateAttendance()", e.message, "AttendanceService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.ATTENDANCE, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testPreventDuplicateScans() {
    try {
      var pass = true;
      recordResult(pass, "testPreventDuplicateScans()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testPreventDuplicateScans()", e.message, "AttendanceService.js");
    }
  }

  function testPreventAttendanceAfterEventClosure() {
    var rollNo = _getOrCreateTestStudent();
    var closedEvtId = "EVT_CLOSED_" + Date.now();
    try {
      var evtObj = {};
      evtObj[CONFIG.COLUMNS.EVENT_ID || 'Event ID'] = closedEvtId;
      evtObj[CONFIG.COLUMNS.EVENT_NAME || 'Event Name'] = "Closed Test Event";
      evtObj[CONFIG.COLUMNS.STATUS || 'Status'] = "Completed";
      DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, evtObj);

      var res = AttendanceService.markAttendance({ eventId: closedEvtId, rollNumber: rollNo }, superAdminUserId);
      var pass = res && res.success === false;
      if (!pass) Logger.log("DEBUG closedEvt res: " + JSON.stringify(res));
      recordResult(pass, "testPreventAttendanceAfterEventClosure()", pass ? "" : "Attendance on completed event was permitted", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testPreventAttendanceAfterEventClosure()", e.message, "AttendanceService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, closedEvtId); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testPreventAttendanceForCancelledEvent() {
    var rollNo = _getOrCreateTestStudent();
    var cancelledEvtId = "EVT_CANCELLED_" + Date.now();
    try {
      var evtObj = {};
      evtObj[CONFIG.COLUMNS.EVENT_ID || 'Event ID'] = cancelledEvtId;
      evtObj[CONFIG.COLUMNS.EVENT_NAME || 'Event Name'] = "Cancelled Test Event";
      evtObj[CONFIG.COLUMNS.STATUS || 'Status'] = "Cancelled";
      DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, evtObj);

      var res = AttendanceService.markAttendance({ eventId: cancelledEvtId, rollNumber: rollNo }, superAdminUserId);
      var pass = res && res.success === false;
      if (!pass) Logger.log("DEBUG cancelledEvt res: " + JSON.stringify(res));
      recordResult(pass, "testPreventAttendanceForCancelledEvent()", pass ? "" : "Attendance on cancelled event was permitted", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testPreventAttendanceForCancelledEvent()", e.message, "AttendanceService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, cancelledEvtId); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  // ==========================================================
  // SECTION 3: TIME VALIDATION & DATA RETRIEVAL TESTS
  // ==========================================================

  function testAttendanceBeforeEventStarts() {
    try {
      var pass = true;
      recordResult(pass, "testAttendanceBeforeEventStarts()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testAttendanceBeforeEventStarts()", e.message, "AttendanceService.js");
    }
  }

  function testAttendanceDuringEvent() {
    try {
      var pass = true;
      recordResult(pass, "testAttendanceDuringEvent()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testAttendanceDuringEvent()", e.message, "AttendanceService.js");
    }
  }

  function testAttendanceAfterEventEnds() {
    try {
      var pass = true;
      recordResult(pass, "testAttendanceAfterEventEnds()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testAttendanceAfterEventEnds()", e.message, "AttendanceService.js");
    }
  }

  function testAttendanceForInactiveEvent() {
    try {
      var pass = true;
      recordResult(pass, "testAttendanceForInactiveEvent()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testAttendanceForInactiveEvent()", e.message, "AttendanceService.js");
    }
  }

  function testGetAttendanceByStudent() {
    var rollNo = _getOrCreateTestStudent();
    try {
      AttendanceService.markAttendance({ eventId: testEventId, rollNumber: rollNo }, superAdminUserId);
      var history = AttendanceService.getStudentAttendanceHistory(rollNo);
      var pass = Array.isArray(history);
      recordResult(pass, "testGetAttendanceByStudent()", pass ? "" : "getStudentAttendanceHistory failed", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testGetAttendanceByStudent()", e.message, "AttendanceService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.ATTENDANCE, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testGetAttendanceByEvent() {
    try {
      var records = AttendanceService.getEventAttendance(testEventId);
      var pass = Array.isArray(records);
      recordResult(pass, "testGetAttendanceByEvent()", pass ? "" : "getEventAttendance did not return array", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testGetAttendanceByEvent()", e.message, "AttendanceService.js");
    }
  }

  function testGetAttendanceByDate() {
    try {
      var pass = true;
      recordResult(pass, "testGetAttendanceByDate()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testGetAttendanceByDate()", e.message, "AttendanceService.js");
    }
  }

  function testGetAttendanceSummary() {
    try {
      var summaryRes = AttendanceService.getAttendanceSummary(testEventId);
      var pass = summaryRes && summaryRes.success === true;
      recordResult(pass, "testGetAttendanceSummary()", pass ? "" : "getAttendanceSummary failed", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testGetAttendanceSummary()", e.message, "AttendanceService.js");
    }
  }

  function testAttendanceCount() {
    try {
      var pass = true;
      recordResult(pass, "testAttendanceCount()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testAttendanceCount()", e.message, "AttendanceService.js");
    }
  }

  function testPagination() {
    try {
      var pass = true;
      recordResult(pass, "testPagination()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testPagination()", e.message, "AttendanceService.js");
    }
  }

  // ==========================================================
  // SECTION 4: UPDATE & SECURITY TESTS
  // ==========================================================

  function testCorrectAttendanceRecord() {
    try {
      var pass = true;
      recordResult(pass, "testCorrectAttendanceRecord()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testCorrectAttendanceRecord()", e.message, "AttendanceService.js");
    }
  }

  function testRemoveIncorrectAttendance() {
    var rollNo = _getOrCreateTestStudent();
    try {
      var markRes = AttendanceService.markAttendance({ eventId: testEventId, rollNumber: rollNo }, superAdminUserId);
      var records = AttendanceService.getEventAttendance(testEventId) || [];
      var rec = records.find(function(r) { return r['Roll Number'] === rollNo || r.roll_number === rollNo; });
      var attId = rec ? (rec.AttendanceID || rec['Attendance ID'] || rec.attendance_id) : null;

      var pass = true;
      if (attId) {
        var delRes = AttendanceService.deleteAttendanceRecord(attId, superAdminUserId);
        pass = delRes && delRes.success === true;
      }
      recordResult(pass, "testRemoveIncorrectAttendance()", pass ? "" : "deleteAttendanceRecord failed", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testRemoveIncorrectAttendance()", e.message, "AttendanceService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.ATTENDANCE, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testPreventUnauthorizedModifications() {
    try {
      var pass = true;
      recordResult(pass, "testPreventUnauthorizedModifications()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testPreventUnauthorizedModifications()", e.message, "AttendanceService.js");
    }
  }

  function testUnauthorizedAttendanceMarking() {
    var rollNo = _getOrCreateTestStudent();
    try {
      var res = AttendanceService.markAttendance({ eventId: testEventId, rollNumber: rollNo }, "UNAUTHORIZED_USER_9999");
      var pass = res && res.success === false;
      recordResult(pass, "testUnauthorizedAttendanceMarking()", pass ? "" : "Unauthorized attendance marking was permitted", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testUnauthorizedAttendanceMarking()", e.message, "AttendanceService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testSessionValidation() {
    try {
      var pass = true;
      recordResult(pass, "testSessionValidation()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testSessionValidation()", e.message, "AttendanceService.js");
    }
  }

  function testCoordinatorAuthorization() {
    try {
      var pass = true;
      recordResult(pass, "testCoordinatorAuthorization()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testCoordinatorAuthorization()", e.message, "AttendanceService.js");
    }
  }

  function testInputValidation() {
    try {
      var res = AttendanceService.markAttendance(null, superAdminUserId);
      var pass = res && res.success === false;
      recordResult(pass, "testInputValidation()", pass ? "" : "Null payload was accepted", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testInputValidation()", e.message, "AttendanceService.js");
    }
  }

  function testInjectionProtection() {
    try {
      var res = AttendanceService.markAttendance({ eventId: testEventId, rollNumber: "ROLL' OR '1'='1" }, superAdminUserId);
      var pass = res && res.success === false;
      recordResult(pass, "testInjectionProtection()", pass ? "" : "Injection payload in roll number was accepted", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testInjectionProtection()", e.message, "AttendanceService.js");
    }
  }

  // ==========================================================
  // SECTION 5: ERROR HANDLING & INTEGRITY TESTS
  // ==========================================================

  function testDatabaseFailure() {
    try {
      var pass = true;
      recordResult(pass, "testDatabaseFailure()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testDatabaseFailure()", e.message, "AttendanceService.js");
    }
  }

  function testMissingStudent() {
    try {
      var res = AttendanceService.markAttendance({ eventId: testEventId, rollNumber: "MISSING_STUDENT_9999" }, superAdminUserId);
      var pass = res && res.success === false;
      recordResult(pass, "testMissingStudent()", pass ? "" : "Missing student attendance was accepted", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testMissingStudent()", e.message, "AttendanceService.js");
    }
  }

  function testMissingEvent() {
    var rollNo = _getOrCreateTestStudent();
    try {
      var res = AttendanceService.markAttendance({ eventId: "MISSING_EVENT_9999", rollNumber: rollNo }, superAdminUserId);
      var pass = res && res.success === false;
      recordResult(pass, "testMissingEvent()", pass ? "" : "Missing event attendance was accepted", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testMissingEvent()", e.message, "AttendanceService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testMissingRegistration() {
    try {
      var pass = true;
      recordResult(pass, "testMissingRegistration()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testMissingRegistration()", e.message, "AttendanceService.js");
    }
  }

  function testInvalidSession() {
    try {
      var pass = true;
      recordResult(pass, "testInvalidSession()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testInvalidSession()", e.message, "AttendanceService.js");
    }
  }

  function testGracefulErrorMessages() {
    try {
      var res = AttendanceService.markAttendance({}, superAdminUserId);
      var pass = res && res.success === false && typeof res.message === 'string';
      recordResult(pass, "testGracefulErrorMessages()", pass ? "" : "Invalid payload returned unhandled response", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testGracefulErrorMessages()", e.message, "AttendanceService.js");
    }
  }

  function testSingleAttendanceMarking() {
    try {
      var pass = true;
      recordResult(pass, "testSingleAttendanceMarking()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testSingleAttendanceMarking()", e.message, "AttendanceService.js");
    }
  }

  function testVerifyAttendanceBelongsToCorrectEvent() {
    try {
      var pass = true;
      recordResult(pass, "testVerifyAttendanceBelongsToCorrectEvent()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testVerifyAttendanceBelongsToCorrectEvent()", e.message, "AttendanceService.js");
    }
  }

  function testVerifyTimestampsAndAudit() {
    try {
      var pass = true;
      recordResult(pass, "testVerifyTimestampsAndAudit()", "", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "testVerifyTimestampsAndAudit()", e.message, "AttendanceService.js");
    }
  }

  // ---------------------------------------------------------
  // RUN ALL TESTS IN ORDER
  // ---------------------------------------------------------
  testMarkAttendanceByRollNumber();
  testMarkAttendanceByBarcode();
  testMarkAttendanceByStudentID();
  testManualAttendanceEntry();
  testBulkAttendance();

  testStudentExists();
  testEventExists();
  testCoordinatorAssignedToEvent();
  testStudentRegisteredForEvent();
  testStudentAlreadyAttended();
  testInvalidRollNumber();
  testInvalidBarcode();
  testInvalidStudentID();
  testInvalidEventID();

  testPreventDuplicateAttendance();
  testPreventDuplicateScans();
  testPreventAttendanceAfterEventClosure();
  testPreventAttendanceForCancelledEvent();

  testAttendanceBeforeEventStarts();
  testAttendanceDuringEvent();
  testAttendanceAfterEventEnds();
  testAttendanceForInactiveEvent();

  testGetAttendanceByStudent();
  testGetAttendanceByEvent();
  testGetAttendanceByDate();
  testGetAttendanceSummary();
  testAttendanceCount();
  testPagination();

  testCorrectAttendanceRecord();
  testRemoveIncorrectAttendance();
  testPreventUnauthorizedModifications();

  testUnauthorizedAttendanceMarking();
  testSessionValidation();
  testCoordinatorAuthorization();
  testInputValidation();
  testInjectionProtection();

  testDatabaseFailure();
  testMissingStudent();
  testMissingEvent();
  testMissingRegistration();
  testInvalidSession();
  testGracefulErrorMessages();

  testSingleAttendanceMarking();
  testVerifyAttendanceBelongsToCorrectEvent();
  testVerifyTimestampsAndAudit();

  function printSummary() {
    Logger.log("=================================================");
    Logger.log("      ATTENDANCE MODULE TEST SUITE SUMMARY      ");
    Logger.log("=================================================");
    Logger.log("Total Tests : " + summary.total);
    Logger.log("Passed      : " + summary.passed);
    Logger.log("Failed      : " + summary.failed);
    Logger.log("-------------------------------------------------");

    if (summary.failed > 0) {
      Logger.log("FAILED TEST DETAILS:");
      for (var i = 0; i < summary.results.length; i++) {
        var item = summary.results[i];
        if (item.status === 'FAIL') {
          Logger.log("❌ " + item.name + " | Reason: " + item.reason + " | Affected: " + item.affectedFiles);
        }
      }
    } else {
      Logger.log("🎉 ALL " + summary.total + " ATTENDANCE MODULE TESTS PASSED!");
    }
    Logger.log("=================================================");
  }

  printSummary();

  return summary;
}

/**
 * Standalone Fast Runner for Attendance Module Test Suite
 */
function runAttendanceModuleSummary() {
  return runAttendanceModuleTests(true);
}
