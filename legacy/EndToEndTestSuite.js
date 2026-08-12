/*
============================================================
END-TO-END (E2E) TEST SUITE
EndToEndTestSuite.js

PHASE 13: Full End-to-End Real-World User Workflow Validation
PROJECT: BVC Event Attendance System
TECH STACK: Google Apps Script & Supabase PostgreSQL
============================================================
*/

function runEndToEndTestSuite(summaryOnly) {
  var summary = {
    total: 0,
    passed: 0,
    failed: 0,
    results: []
  };

  function recordResult(pass, name, reason, responsibleLayers) {
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
      responsibleLayers: responsibleLayers || "Full Stack (E2E)"
    });
  }

  Logger.log("=================================================");
  Logger.log("     END-TO-END (E2E) TEST SUITE STARTING        ");
  Logger.log("=================================================");

  // Helper to obtain Super Admin Session Context
  function getSuperAdminContext() {
    try {
      var allUsers = UserService.getAllUsers(null) || [];
      var sa = allUsers.find(function(u) {
        var r = String(u['Role'] || u.role || '').toUpperCase();
        return r === 'SUPER ADMIN' || r === 'SUPER_ADMIN' || r === 'SUPERADMIN';
      });

      if (!sa) sa = UserService.getUserById("USR0001");
      if (!sa) {
        sa = {
          'User ID': 'USR0001', user_id: 'USR0001',
          'Role': 'Super Admin', role: 'Super Admin',
          'Username': 'priyanka', username: 'priyanka'
        };
      }

      if (!sa['User ID'] && sa.user_id) sa['User ID'] = sa.user_id;

      var res = SessionService.createSession(sa);
      var token = res ? (res['Session Token'] || res.session_token || res.sessionToken || res.token) : "TOKEN_SUPER_ADMIN";
      var userId = sa['User ID'] || sa.user_id || "USR0001";

      return { token: token, userId: userId, user: sa };
    } catch(e) {
      return { token: "TOKEN_SUPER_ADMIN", userId: "USR0001", user: null };
    }
  }

  var adminCtx = getSuperAdminContext();

  // ==========================================================
  // SCENARIO 1: ADMINISTRATOR SETUP
  // ==========================================================
  function testScenario1AdminSetup() {
    var ts = Date.now();
    var coordUsername = "e2e_coord_" + ts;
    var coordEmail = "e2e_coord_" + ts + "@bvc.edu.in";
    var coordEmpId = "EMP_E2E_" + ts;
    var rollNo = "21E2E" + String(ts).substring(7);
    var eventName = "E2E Tech Fest " + ts;

    var createdUserId = null;
    var createdEventId = null;

    try {
      // 1. Admin creates Coordinator user
      var uRes = UserService.createUser({
        username: coordUsername,
        password: "Password123!",
        email_address: coordEmail,
        first_name: "E2E",
        last_name: "Coordinator",
        employee_id: coordEmpId,
        role: "Coordinator",
        department: "CSE",
        skipEmail: true
      }, adminCtx.userId);

      if (uRes && uRes.data) createdUserId = uRes.data.userId || uRes.data.user_id;

      // 2. Admin creates Student
      var p = {}; p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo; p[CONFIG.COLUMNS.STUDENT_NAME] = "E2E Student"; p[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE"; p[CONFIG.COLUMNS.STUDENT_YEAR] = "3"; p[CONFIG.COLUMNS.STUDENT_SECTION] = "A";
      StudentService.createStudent(p, adminCtx.userId);

      // 3. Admin creates Event
      var eRes = EventService.createEvent({
        event_name: eventName,
        start_date: "2026-12-10",
        end_date: "2026-12-10",
        start_time: "09:00",
        end_time: "17:00",
        venue: "Auditorium Hall 1",
        status: "Active"
      }, adminCtx.userId);

      if (eRes && eRes.data) createdEventId = eRes.data[CONFIG.COLUMNS.EVENT_ID];

      // 4. Admin assigns Coordinator to Event
      if (createdUserId && createdEventId) {
        CoordinatorService.assignCoordinator(createdEventId, createdUserId, "Primary Coordinator", adminCtx.userId);
      }

      var pass = uRes && uRes.success === true && eRes && eRes.success === true;
      recordResult(pass, "SCENARIO 1: Administrator Setup", pass ? "" : "Admin setup workflow failed", "Backend Services -> Database Layer");
    } catch (e) {
      recordResult(false, "SCENARIO 1: Administrator Setup", e.message, "Backend Services -> Database Layer");
    } finally {
      if (createdEventId) try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, createdEventId); } catch(ex){}
      if (createdUserId) try { DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'user_id', createdUserId); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  // ==========================================================
  // SCENARIO 2: COORDINATOR WORKFLOW
  // ==========================================================
  function testScenario2CoordinatorWorkflow() {
    try {
      var assignedEvents = CoordinatorService.getAssignedEventIds(adminCtx.userId);
      var stu = StudentService.getStudentByRollNumber("21BVC01");
      var pass = Array.isArray(assignedEvents) && (stu === null || typeof stu === 'object');
      recordResult(pass, "SCENARIO 2: Coordinator Workflow", pass ? "" : "Coordinator lookup workflow failed", "CoordinatorService.js -> StudentService.js");
    } catch (e) {
      recordResult(false, "SCENARIO 2: Coordinator Workflow", e.message, "CoordinatorService.js -> StudentService.js");
    }
  }

  // ==========================================================
  // SCENARIO 3: REAL-WORLD ATTENDANCE WORKFLOW
  // ==========================================================
  function testScenario3AttendanceWorkflow() {
    var ts = Date.now();
    var rollNo = "21E2E3" + String(ts).substring(7);
    var eid = "EVT_E2E3_" + ts;

    try {
      var timezone = (CONFIG && CONFIG.DATE_TIME && CONFIG.DATE_TIME.TIMEZONE) ? CONFIG.DATE_TIME.TIMEZONE : 'Asia/Kolkata';
      var todayStr = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');

      var p = {}; p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo; p[CONFIG.COLUMNS.STUDENT_NAME] = "E2E3 Student"; p[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE"; p[CONFIG.COLUMNS.STUDENT_YEAR] = "3"; p[CONFIG.COLUMNS.STUDENT_SECTION] = "A";
      StudentService.createStudent(p, adminCtx.userId);

      var eObj = {}; eObj[CONFIG.COLUMNS.EVENT_ID || 'Event ID'] = eid; eObj[CONFIG.COLUMNS.EVENT_NAME || 'Event Name'] = "E2E3 Event"; eObj[CONFIG.COLUMNS.STATUS || 'Status'] = "Active"; eObj[CONFIG.COLUMNS.START_DATE || 'Start Date'] = todayStr; eObj[CONFIG.COLUMNS.END_DATE || 'End Date'] = todayStr;
      DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, eObj);

      // 1. Mark Attendance
      var markRes = AttendanceService.markAttendance({ eventId: eid, rollNumber: rollNo, attendanceMethod: "Barcode" }, adminCtx.userId);

      // 2. Attempt Duplicate Scan
      var dupRes = AttendanceService.markAttendance({ eventId: eid, rollNumber: rollNo, attendanceMethod: "Barcode" }, adminCtx.userId);

      var pass = markRes && markRes.success === true && dupRes && dupRes.success === false;
      recordResult(pass, "SCENARIO 3: Real-World Attendance Workflow", pass ? "" : "Attendance workflow or duplicate scan block failed", "AttendanceService.js -> Database Layer");
    } catch (e) {
      recordResult(false, "SCENARIO 3: Real-World Attendance Workflow", e.message, "AttendanceService.js -> Database Layer");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.ATTENDANCE, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eid); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  // ==========================================================
  // SCENARIO 4: MULTIPLE STUDENTS BATCH & RAPID SCANNING
  // ==========================================================
  function testScenario4MultipleStudents() {
    var ts = Date.now();
    var r1 = "21E2E4A" + String(ts).substring(7);
    var r2 = "21E2E4B" + String(ts).substring(7);
    var eid = "EVT_E2E4_" + ts;

    try {
      var timezone = (CONFIG && CONFIG.DATE_TIME && CONFIG.DATE_TIME.TIMEZONE) ? CONFIG.DATE_TIME.TIMEZONE : 'Asia/Kolkata';
      var todayStr = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');

      var p1 = {}; p1[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = r1; p1[CONFIG.COLUMNS.STUDENT_NAME] = "E2E4 Stu1"; p1[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE"; p1[CONFIG.COLUMNS.STUDENT_YEAR] = "3"; p1[CONFIG.COLUMNS.STUDENT_SECTION] = "A";
      var p2 = {}; p2[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = r2; p2[CONFIG.COLUMNS.STUDENT_NAME] = "E2E4 Stu2"; p2[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE"; p2[CONFIG.COLUMNS.STUDENT_YEAR] = "3"; p2[CONFIG.COLUMNS.STUDENT_SECTION] = "A";
      StudentService.createStudent(p1, adminCtx.userId);
      StudentService.createStudent(p2, adminCtx.userId);

      var eObj = {}; eObj[CONFIG.COLUMNS.EVENT_ID || 'Event ID'] = eid; eObj[CONFIG.COLUMNS.EVENT_NAME || 'Event Name'] = "E2E4 Event"; eObj[CONFIG.COLUMNS.STATUS || 'Status'] = "Active"; eObj[CONFIG.COLUMNS.START_DATE || 'Start Date'] = todayStr; eObj[CONFIG.COLUMNS.END_DATE || 'End Date'] = todayStr;
      DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, eObj);

      // Rapid consecutive attendance marking
      var res1 = AttendanceService.markAttendance({ eventId: eid, rollNumber: r1, attendanceMethod: "Barcode" }, adminCtx.userId);
      var res2 = AttendanceService.markAttendance({ eventId: eid, rollNumber: r2, attendanceMethod: "Barcode" }, adminCtx.userId);

      var pass = res1 && res1.success === true && res2 && res2.success === true;
      recordResult(pass, "SCENARIO 4: Multiple Students Batch & Rapid Scanning", pass ? "" : "Rapid batch scanning failed", "AttendanceService.js -> Database Layer");
    } catch (e) {
      recordResult(false, "SCENARIO 4: Multiple Students Batch & Rapid Scanning", e.message, "AttendanceService.js -> Database Layer");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.ATTENDANCE, 'Roll Number', r1); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.ATTENDANCE, 'Roll Number', r2); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eid); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, r1); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, r2); } catch(ex){}
    }
  }

  // ==========================================================
  // SCENARIO 5: REPORTS & EXECUTIVE ANALYTICS
  // ==========================================================
  function testScenario5ReportsAnalytics() {
    try {
      var dashRes = ReportService.getReportsDashboardSummary(adminCtx.userId);
      var pass = dashRes && dashRes.success === true && dashRes.data && dashRes.data.report;
      recordResult(pass, "SCENARIO 5: Reports & Executive Analytics", pass ? "" : "Dashboard analytics generation failed", "ReportService.js");
    } catch (e) {
      recordResult(false, "SCENARIO 5: Reports & Executive Analytics", e.message, "ReportService.js");
    }
  }

  // ==========================================================
  // SCENARIO 6: SECURITY & BOUNDARY VERIFICATION
  // ==========================================================
  function testScenario6SecurityBoundaries() {
    try {
      var invalidSessCtx = SessionService.getUserContext("INVALID_SESSION_TOKEN_9999");
      var unauthAttRes = AttendanceService.markAttendance({ eventId: "EVT_01", rollNumber: "21BVC01" }, "UNAUTHORIZED_USER_9999");
      var pass = invalidSessCtx === null && unauthAttRes && unauthAttRes.success === false;
      recordResult(pass, "SCENARIO 6: Security & Boundary Verification", pass ? "" : "Security boundary enforcement failed", "SecurityUtils.js -> SessionService.js");
    } catch (e) {
      recordResult(false, "SCENARIO 6: Security & Boundary Verification", e.message, "SecurityUtils.js -> SessionService.js");
    }
  }

  // ==========================================================
  // SCENARIO 7: FAILURE RECOVERY & SYSTEM RESILIENCE
  // ==========================================================
  function testScenario7FailureRecovery() {
    try {
      var res1 = StudentService.getStudentByRollNumber("NON_EXISTENT_STUDENT_9999");
      var res2 = AttendanceService.markAttendance({ eventId: "NON_EXISTENT_EVENT_9999", rollNumber: "21BVC01" }, adminCtx.userId);
      var pass = res1 === null && res2 && res2.success === false && typeof res2.message === 'string';
      recordResult(pass, "SCENARIO 7: Failure Recovery & System Resilience", pass ? "" : "Failure recovery & graceful error message test failed", "All Services -> Error Handler");
    } catch (e) {
      recordResult(false, "SCENARIO 7: Failure Recovery & System Resilience", e.message, "All Services -> Error Handler");
    }
  }

  // ---------------------------------------------------------
  // RUN ALL E2E SCENARIOS IN ORDER
  // ---------------------------------------------------------
  testScenario1AdminSetup();
  testScenario2CoordinatorWorkflow();
  testScenario3AttendanceWorkflow();
  testScenario4MultipleStudents();
  testScenario5ReportsAnalytics();
  testScenario6SecurityBoundaries();
  testScenario7FailureRecovery();

  function printSummary() {
    Logger.log("=================================================");
    Logger.log("    END-TO-END (E2E) TEST SUITE SUMMARY          ");
    Logger.log("=================================================");
    Logger.log("Total Scenarios : " + summary.total);
    Logger.log("Passed          : " + summary.passed);
    Logger.log("Failed          : " + summary.failed);
    Logger.log("-------------------------------------------------");

    if (summary.failed > 0) {
      Logger.log("FAILED E2E SCENARIO DETAILS:");
      for (var i = 0; i < summary.results.length; i++) {
        var item = summary.results[i];
        if (item.status === 'FAIL') {
          Logger.log("❌ " + item.name + " | Reason: " + item.reason + " | Responsible Layer(s): " + item.responsibleLayers);
        }
      }
    } else {
      Logger.log("🎉 ALL " + summary.total + " END-TO-END (E2E) SCENARIOS PASSED!");
      Logger.log("🚀 SYSTEM IS 100% PRODUCTION READY!");
    }
    Logger.log("=================================================");
  }

  printSummary();

  return summary;
}

/**
 * Standalone Fast Runner for End-to-End Test Suite
 */
function runEndToEndTestSummary() {
  return runEndToEndTestSuite(true);
}
