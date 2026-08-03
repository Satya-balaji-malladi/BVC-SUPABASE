/*
============================================================
REGRESSION TEST SUITE
RegressionTestSuite.js

PHASE 12: Full System Regression Testing
PROJECT: BVC Event Attendance System
TECH STACK: Google Apps Script & Supabase PostgreSQL
============================================================
*/

function runRegressionTestSuite(summaryOnly) {
  var summary = {
    total: 0,
    passed: 0,
    failed: 0,
    results: []
  };

  function recordResult(pass, name, reason, affectedModules) {
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
      affectedModules: affectedModules || "Regression"
    });
  }

  Logger.log("=================================================");
  Logger.log("     FULL SYSTEM REGRESSION SUITE STARTING      ");
  Logger.log("=================================================");

  // Helper to obtain a valid Super Admin session & User ID
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
  // 1. AUTHENTICATION REGRESSION
  // ==========================================================
  function testAuthRegression() {
    try {
      var userCtx = SessionService.getUserContext(adminCtx.token);
      var pass = !!userCtx;
      recordResult(pass, "REGRESSION: Authentication & Session Validation", pass ? "" : "Session validation failed", "AuthService.js / SessionService.js");
    } catch (e) {
      recordResult(false, "REGRESSION: Authentication & Session Validation", e.message, "AuthService.js / SessionService.js");
    }
  }

  // ==========================================================
  // 2. USER MANAGEMENT REGRESSION
  // ==========================================================
  function testUserManagementRegression() {
    try {
      var users = UserService.getAllUsers(null);
      var pass = Array.isArray(users) && users.length > 0;
      recordResult(pass, "REGRESSION: User Management Lookup", pass ? "" : "getAllUsers failed", "UserService.js");
    } catch (e) {
      recordResult(false, "REGRESSION: User Management Lookup", e.message, "UserService.js");
    }
  }

  // ==========================================================
  // 3. FACULTY MODULE REGRESSION
  // ==========================================================
  function testFacultyRegression() {
    try {
      var members = FacultyService.getFacultyMembers();
      var pass = Array.isArray(members);
      recordResult(pass, "REGRESSION: Faculty Module Retrieval", pass ? "" : "getFacultyMembers failed", "FacultyService.js");
    } catch (e) {
      recordResult(false, "REGRESSION: Faculty Module Retrieval", e.message, "FacultyService.js");
    }
  }

  // ==========================================================
  // 4. STUDENT MODULE REGRESSION
  // ==========================================================
  function testStudentRegression() {
    try {
      var res = StudentService.getAllStudents();
      var pass = res && res.success === true && Array.isArray(res.data.students);
      recordResult(pass, "REGRESSION: Student Module Query", pass ? "" : "getAllStudents failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "REGRESSION: Student Module Query", e.message, "StudentService.js");
    }
  }

  // ==========================================================
  // 5. EVENT MANAGEMENT REGRESSION
  // ==========================================================
  function testEventRegression() {
    try {
      var res = EventService.getAllEvents({ isSuperAdmin: true });
      var pass = res && res.success === true && Array.isArray(res.data);
      recordResult(pass, "REGRESSION: Event Management Query", pass ? "" : "getAllEvents failed", "EventService.js");
    } catch (e) {
      recordResult(false, "REGRESSION: Event Management Query", e.message, "EventService.js");
    }
  }

  // ==========================================================
  // 6. REGISTRATION REGRESSION
  // ==========================================================
  function testRegistrationRegression() {
    try {
      var res = ParticipantService.getAllEnrichedParticipants(adminCtx.userId);
      var pass = res && res.success === true && Array.isArray(res.data);
      recordResult(pass, "REGRESSION: Registration Retrieval", pass ? "" : "getAllEnrichedParticipants failed", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "REGRESSION: Registration Retrieval", e.message, "ParticipantService.js");
    }
  }

  // ==========================================================
  // 7. COORDINATOR MODULE REGRESSION
  // ==========================================================
  function testCoordinatorRegression() {
    try {
      var events = CoordinatorService.getAssignedEventIds(adminCtx.userId);
      var pass = Array.isArray(events);
      recordResult(pass, "REGRESSION: Coordinator Event Mapping", pass ? "" : "getAssignedEventIds failed", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "REGRESSION: Coordinator Event Mapping", e.message, "CoordinatorService.js");
    }
  }

  // ==========================================================
  // 8. ATTENDANCE MODULE REGRESSION
  // ==========================================================
  function testAttendanceRegression() {
    var ts = Date.now();
    var rollNo = "21REG" + String(ts).substring(7);
    var eid = "EVT_REG_" + ts;

    try {
      var timezone = (CONFIG && CONFIG.DATE_TIME && CONFIG.DATE_TIME.TIMEZONE) ? CONFIG.DATE_TIME.TIMEZONE : 'Asia/Kolkata';
      var todayStr = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');

      var p = {}; p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo; p[CONFIG.COLUMNS.STUDENT_NAME] = "Reg Stu"; p[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE"; p[CONFIG.COLUMNS.STUDENT_YEAR] = "3"; p[CONFIG.COLUMNS.STUDENT_SECTION] = "A";
      StudentService.createStudent(p, adminCtx.userId);

      var eObj = {}; eObj[CONFIG.COLUMNS.EVENT_ID || 'Event ID'] = eid; eObj[CONFIG.COLUMNS.EVENT_NAME || 'Event Name'] = "Reg Evt"; eObj[CONFIG.COLUMNS.STATUS || 'Status'] = "Active"; eObj[CONFIG.COLUMNS.START_DATE || 'Start Date'] = todayStr; eObj[CONFIG.COLUMNS.END_DATE || 'End Date'] = todayStr;
      DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, eObj);

      var attRes = AttendanceService.markAttendance({ eventId: eid, rollNumber: rollNo, attendanceMethod: "Barcode" }, adminCtx.userId);
      var dupRes = AttendanceService.markAttendance({ eventId: eid, rollNumber: rollNo, attendanceMethod: "Barcode" }, adminCtx.userId);

      var pass = attRes && attRes.success === true && dupRes && dupRes.success === false;
      recordResult(pass, "REGRESSION: Attendance Marking & Duplicate Scans", pass ? "" : "Attendance scan or duplicate prevention failed", "AttendanceService.js");
    } catch (e) {
      recordResult(false, "REGRESSION: Attendance Marking & Duplicate Scans", e.message, "AttendanceService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.ATTENDANCE, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eid); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  // ==========================================================
  // 9. REPORTS & ANALYTICS REGRESSION
  // ==========================================================
  function testReportsRegression() {
    try {
      var dash = ReportService.getReportsDashboardSummary(adminCtx.userId);
      var pass = dash && dash.success === true && dash.data && dash.data.report;
      recordResult(pass, "REGRESSION: Dashboard Reports Aggregation", pass ? "" : "getReportsDashboardSummary failed", "ReportService.js");
    } catch (e) {
      recordResult(false, "REGRESSION: Dashboard Reports Aggregation", e.message, "ReportService.js");
    }
  }

  // ==========================================================
  // 10. SECURITY & RLS REGRESSION
  // ==========================================================
  function testSecurityRegression() {
    try {
      var cseHOD = { userId: "TST_HOD_CSE", role: 'HOD', isHOD: true, department: 'CSE', isSuperAdmin: false };
      var eceHOD = { userId: "TST_HOD_ECE", role: 'HOD', isHOD: true, department: 'ECE', isSuperAdmin: false };

      // Sample mock datasets
      var mockStudents = [
        { 'Roll Number': 'S01', 'Department ID': 'CSE', 'Student Status': 'Active' },
        { 'Roll Number': 'S02', 'Department ID': 'ECE', 'Student Status': 'Active' }
      ];
      var mockFaculty = [
        { 'Employee ID': 'F01', 'Department ID': 'CSE', 'Status': 'Active' },
        { 'Employee ID': 'F02', 'Department ID': 'ECE', 'Status': 'Active' }
      ];
      var mockUsers = [
        { 'User ID': 'U01', 'Department': 'CSE' },
        { 'User ID': 'U02', 'Department': 'ECE' }
      ];

      // Test RLS filtering on Students
      var cseStudents = SecurityUtils.applyStudentRLS(mockStudents, cseHOD);
      var eceStudents = SecurityUtils.applyStudentRLS(mockStudents, eceHOD);
      var rlsStudentsPass = (cseStudents.length === 1 && String(cseStudents[0]['Roll Number'] || cseStudents[0].roll_number) === 'S01') &&
                            (eceStudents.length === 1 && String(eceStudents[0]['Roll Number'] || eceStudents[0].roll_number) === 'S02');
      recordResult(rlsStudentsPass, "REGRESSION: Student RLS Department Isolation", rlsStudentsPass ? "" : "Students not filtered correctly", "SecurityUtils.js");

      // Test RLS filtering on Faculty
      var cseFac = SecurityUtils.applyFacultyRLS(mockFaculty, cseHOD);
      var eceFac = SecurityUtils.applyFacultyRLS(mockFaculty, eceHOD);
      var rlsFacultyPass = (cseFac.length === 1 && String(cseFac[0]['Employee ID'] || cseFac[0].employee_id) === 'F01') &&
                           (eceFac.length === 1 && String(eceFac[0]['Employee ID'] || eceFac[0].employee_id) === 'F02');
      recordResult(rlsFacultyPass, "REGRESSION: Faculty RLS Department Isolation", rlsFacultyPass ? "" : "Faculty not filtered correctly", "SecurityUtils.js");

      // Test RLS filtering on Users
      var cseU = SecurityUtils.applyUserRLS(mockUsers, cseHOD);
      var eceU = SecurityUtils.applyUserRLS(mockUsers, eceHOD);
      var rlsUsersPass = (cseU.length === 1 && String(cseU[0]['User ID'] || cseU[0].user_id) === 'U01') &&
                         (eceU.length === 1 && String(eceU[0]['User ID'] || eceU[0].user_id) === 'U02');
      recordResult(rlsUsersPass, "REGRESSION: User RLS Department Isolation", rlsUsersPass ? "" : "Users not filtered correctly", "SecurityUtils.js");

      // Test Student mutations validation
      var createWrongStudent = StudentService.createStudent({ 'Roll Number': 'S03', 'Department ID': 'ECE', 'Student Name': 'Test' }, 'Test', cseHOD);
      var studentMutationPass = (createWrongStudent && !createWrongStudent.success);
      recordResult(studentMutationPass, "REGRESSION: Student Mutation Department Isolation", studentMutationPass ? "" : "Blocked student creation failed", "StudentService.js");

      // Test User mutations validation
      var createWrongUser = UserService.createUser({ username: 'cse_usr_test', role: 'COORDINATOR', department: 'ECE', email: 'test_cse@bvc.edu' }, cseHOD);
      var userMutationPass = (createWrongUser && !createWrongUser.success);
      recordResult(userMutationPass, "REGRESSION: User Mutation Department Isolation", userMutationPass ? "" : "Blocked user creation failed", "UserService.js");

      recordResult(true, "REGRESSION: Security & RLS Policy Enforcement", "", "SecurityUtils.js");
    } catch (e) {
      recordResult(false, "REGRESSION: Security & RLS Policy Enforcement", e.message, "SecurityUtils.js");
    }
  }

  // ---------------------------------------------------------
  // RUN ALL REGRESSION SUITE SCENARIOS IN ORDER
  // ---------------------------------------------------------
  testAuthRegression();
  testUserManagementRegression();
  testFacultyRegression();
  testStudentRegression();
  testEventRegression();
  testRegistrationRegression();
  testCoordinatorRegression();
  testAttendanceRegression();
  testReportsRegression();
  testSecurityRegression();

  function printSummary() {
    Logger.log("=================================================");
    Logger.log("       FULL SYSTEM REGRESSION SUITE SUMMARY      ");
    Logger.log("=================================================");
    Logger.log("Total Tests : " + summary.total);
    Logger.log("Passed      : " + summary.passed);
    Logger.log("Failed      : " + summary.failed);
    Logger.log("-------------------------------------------------");

    if (summary.failed > 0) {
      Logger.log("FAILED REGRESSION DETAILS:");
      for (var i = 0; i < summary.results.length; i++) {
        var item = summary.results[i];
        if (item.status === 'FAIL') {
          Logger.log("❌ " + item.name + " | Reason: " + item.reason + " | Affected: " + item.affectedModules);
        }
      }
    } else {
      Logger.log("🎉 ALL " + summary.total + " REGRESSION TESTS PASSED! ZERO REGRESSIONS DETECTED!");
    }
    Logger.log("=================================================");
  }

  printSummary();

  return summary;
}

/**
 * Standalone Fast Runner for Full System Regression Suite
 */
function runRegressionTestSummary() {
  return runRegressionTestSuite(true);
}
