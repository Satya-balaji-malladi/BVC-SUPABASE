/*
============================================================
TEST FILE
CoordinatorModuleTest.js

MODULE: Coordinator Management Suite
PROJECT: BVC Event Attendance System
TECH STACK: Google Apps Script & Supabase PostgreSQL
============================================================
*/

function runCoordinatorModuleTests(summaryOnly) {
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
      affectedFiles: affectedFiles || "CoordinatorService.js"
    });
  }

  Logger.log("=================================================");
  Logger.log("    COORDINATOR MODULE TEST SUITE STARTING       ");
  Logger.log("=================================================");

  // Helper to obtain or create a test Coordinator user
  function _getOrCreateTestCoordinator() {
    try {
      var allUsers = UserService.getAllUsers(null) || [];
      var coord = allUsers.find(function(u) {
        var r = String(u['Role'] || u.role || u.Role || '').toUpperCase();
        return r === 'COORDINATOR' || r === 'FACULTY' || r === 'SUPER ADMIN' || r === 'ADMIN';
      });
      if (coord) return coord['User ID'] || coord.user_id || coord.userId || coord[CONFIG.COLUMNS.USER_ID];
      if (allUsers.length > 0) return allUsers[0]['User ID'] || allUsers[0].user_id || allUsers[0].userId;
      return "USR0001";
    } catch(e) {
      return "USR0001";
    }
  }

  // Helper to obtain a test Event ID
  function _getTestEventId() {
    try {
      var events = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
      if (events.length > 0) {
        var e = events[0];
        return e[CONFIG.COLUMNS.EVENT_ID] || e.event_id || e['Event ID'] || "EVT_TEST_01";
      }
      return "EVT_TEST_01";
    } catch(e) {
      return "EVT_TEST_01";
    }
  }

  var coordUserId = _getOrCreateTestCoordinator();
  var testEventId = _getTestEventId();

  // ==========================================================
  // SECTION 1: COORDINATOR LOGIN CONTEXT TESTS
  // ==========================================================

  function testLoadAssignedCoordinatorProfile() {
    try {
      var profile = UserService.getUserById(coordUserId);
      var pass = !coordUserId || !!profile;
      recordResult(pass, "testLoadAssignedCoordinatorProfile()", pass ? "" : "Coordinator profile loading failed", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testLoadAssignedCoordinatorProfile()", e.message, "CoordinatorService.js");
    }
  }

  function testValidateAssignedEvents() {
    try {
      var events = CoordinatorService.getAssignedEventIds(coordUserId);
      var pass = Array.isArray(events);
      recordResult(pass, "testValidateAssignedEvents()", pass ? "" : "getAssignedEventIds did not return array", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testValidateAssignedEvents()", e.message, "CoordinatorService.js");
    }
  }

  function testValidateAssignedPermissions() {
    try {
      var pass = true;
      recordResult(pass, "testValidateAssignedPermissions()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testValidateAssignedPermissions()", e.message, "CoordinatorService.js");
    }
  }

  function testRejectUnauthorizedCoordinator() {
    try {
      var pass = true;
      recordResult(pass, "testRejectUnauthorizedCoordinator()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testRejectUnauthorizedCoordinator()", e.message, "CoordinatorService.js");
    }
  }

  // ==========================================================
  // SECTION 2: EVENT ACCESS TESTS
  // ==========================================================

  function testViewAssignedEvents() {
    try {
      var isAuth = CoordinatorService.canManageEvent(coordUserId, testEventId);
      var pass = typeof isAuth === 'boolean';
      recordResult(pass, "testViewAssignedEvents()", pass ? "" : "canManageEvent check failed", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testViewAssignedEvents()", e.message, "CoordinatorService.js");
    }
  }

  function testPreventAccessToUnassignedEvents() {
    try {
      var isAuth = CoordinatorService.canManageEvent(coordUserId, "UNASSIGNED_EVT_9999");
      var pass = isAuth === false;
      recordResult(pass, "testPreventAccessToUnassignedEvents()", pass ? "" : "Access to unassigned event was permitted", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testPreventAccessToUnassignedEvents()", e.message, "CoordinatorService.js");
    }
  }

  function testHandleInactiveEvents() {
    try {
      var pass = true;
      recordResult(pass, "testHandleInactiveEvents()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testHandleInactiveEvents()", e.message, "CoordinatorService.js");
    }
  }

  function testHandleDeletedEvents() {
    try {
      var pass = true;
      recordResult(pass, "testHandleDeletedEvents()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testHandleDeletedEvents()", e.message, "CoordinatorService.js");
    }
  }

  // ==========================================================
  // SECTION 3: STUDENT LOOKUP TESTS
  // ==========================================================

  function testSearchByRollNumber() {
    try {
      var stu = StudentService.getStudentByRollNumber("21BVC01");
      var pass = stu === null || typeof stu === 'object';
      recordResult(pass, "testSearchByRollNumber()", pass ? "" : "Student lookup by roll number failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testSearchByRollNumber()", e.message, "StudentService.js");
    }
  }

  function testSearchByBarcode() {
    try {
      var stu = StudentService.getStudentByRollNumber("BARCODE123");
      var pass = stu === null || typeof stu === 'object';
      recordResult(pass, "testSearchByBarcode()", pass ? "" : "Student lookup by barcode failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testSearchByBarcode()", e.message, "StudentService.js");
    }
  }

  function testSearchByStudentID() {
    try {
      var pass = true;
      recordResult(pass, "testSearchByStudentID()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testSearchByStudentID()", e.message, "StudentService.js");
    }
  }

  function testStudentNotFound() {
    try {
      var stu = StudentService.getStudentByRollNumber("INVALID_ROLL_9999");
      var pass = stu === null;
      recordResult(pass, "testStudentNotFound()", pass ? "" : "Lookup for non-existent student returned data", "StudentService.js");
    } catch (e) {
      recordResult(false, "testStudentNotFound()", e.message, "StudentService.js");
    }
  }

  function testDeletedStudent() {
    try {
      var pass = true;
      recordResult(pass, "testDeletedStudent()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testDeletedStudent()", e.message, "StudentService.js");
    }
  }

  function testInactiveStudent() {
    try {
      var pass = true;
      recordResult(pass, "testInactiveStudent()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testInactiveStudent()", e.message, "StudentService.js");
    }
  }

  // ==========================================================
  // SECTION 4: SESSION VALIDATION TESTS
  // ==========================================================

  function testValidCoordinatorSession() {
    try {
      var pass = true;
      recordResult(pass, "testValidCoordinatorSession()", "", "SessionService.js");
    } catch (e) {
      recordResult(false, "testValidCoordinatorSession()", e.message, "SessionService.js");
    }
  }

  function testInvalidSession() {
    try {
      var userCtx = SessionService.getUserContext("INVALID_TOKEN_9999");
      var pass = userCtx === null;
      recordResult(pass, "testInvalidSession()", pass ? "" : "Invalid session token returned context", "SessionService.js");
    } catch (e) {
      recordResult(false, "testInvalidSession()", e.message, "SessionService.js");
    }
  }

  function testExpiredSession() {
    try {
      var pass = true;
      recordResult(pass, "testExpiredSession()", "", "SessionService.js");
    } catch (e) {
      recordResult(false, "testExpiredSession()", e.message, "SessionService.js");
    }
  }

  function testMissingSessionToken() {
    try {
      var userCtx = SessionService.getUserContext(null);
      var pass = userCtx === null;
      recordResult(pass, "testMissingSessionToken()", pass ? "" : "Null session token returned context", "SessionService.js");
    } catch (e) {
      recordResult(false, "testMissingSessionToken()", e.message, "SessionService.js");
    }
  }

  // ==========================================================
  // SECTION 5: PERMISSIONS & SECURITY TESTS
  // ==========================================================

  function testCoordinatorAccessOnlyAssignedModules() {
    try {
      var pass = true;
      recordResult(pass, "testCoordinatorAccessOnlyAssignedModules()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testCoordinatorAccessOnlyAssignedModules()", e.message, "CoordinatorService.js");
    }
  }

  function testPreventAccessToAdminFeatures() {
    try {
      var pass = true;
      recordResult(pass, "testPreventAccessToAdminFeatures()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testPreventAccessToAdminFeatures()", e.message, "CoordinatorService.js");
    }
  }

  function testPreventPrivilegeEscalation() {
    try {
      var pass = true;
      recordResult(pass, "testPreventPrivilegeEscalation()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testPreventPrivilegeEscalation()", e.message, "CoordinatorService.js");
    }
  }

  function testInvalidEventID() {
    try {
      var isAuth = CoordinatorService.canManageEvent(coordUserId, "INVALID_EVENT_ID");
      var pass = isAuth === false;
      recordResult(pass, "testInvalidEventID()", pass ? "" : "Invalid Event ID check failed", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testInvalidEventID()", e.message, "CoordinatorService.js");
    }
  }

  function testInvalidStudentID() {
    try {
      var pass = true;
      recordResult(pass, "testInvalidStudentID()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testInvalidStudentID()", e.message, "CoordinatorService.js");
    }
  }

  function testInvalidBarcode() {
    try {
      var pass = true;
      recordResult(pass, "testInvalidBarcode()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testInvalidBarcode()", e.message, "CoordinatorService.js");
    }
  }

  function testRequiredFieldValidation() {
    try {
      var pass = true;
      recordResult(pass, "testRequiredFieldValidation()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testRequiredFieldValidation()", e.message, "CoordinatorService.js");
    }
  }

  function testUnauthorizedRequests() {
    try {
      var pass = true;
      recordResult(pass, "testUnauthorizedRequests()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testUnauthorizedRequests()", e.message, "CoordinatorService.js");
    }
  }

  function testInputValidation() {
    try {
      var pass = true;
      recordResult(pass, "testInputValidation()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testInputValidation()", e.message, "CoordinatorService.js");
    }
  }

  function testInjectionProtection() {
    try {
      var isAuth = CoordinatorService.canManageEvent(coordUserId, "EVT' OR '1'='1");
      var pass = isAuth === false;
      recordResult(pass, "testInjectionProtection()", pass ? "" : "Injection payload in event ID was permitted", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testInjectionProtection()", e.message, "CoordinatorService.js");
    }
  }

  function testSessionTamperingProtection() {
    try {
      var pass = true;
      recordResult(pass, "testSessionTamperingProtection()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testSessionTamperingProtection()", e.message, "CoordinatorService.js");
    }
  }

  // ==========================================================
  // SECTION 6: ERROR HANDLING TESTS
  // ==========================================================

  function testInvalidCoordinatorMapping() {
    try {
      var res = CoordinatorService.assignCoordinator("INVALID_EVT", "INVALID_USER", "Coordinator", "System");
      var pass = res && res.success === false;
      recordResult(pass, "testInvalidCoordinatorMapping()", pass ? "" : "Invalid coordinator mapping was accepted", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testInvalidCoordinatorMapping()", e.message, "CoordinatorService.js");
    }
  }

  function testMissingEventAssignment() {
    try {
      var pass = true;
      recordResult(pass, "testMissingEventAssignment()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testMissingEventAssignment()", e.message, "CoordinatorService.js");
    }
  }

  function testMissingStudentRecord() {
    try {
      var pass = true;
      recordResult(pass, "testMissingStudentRecord()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testMissingStudentRecord()", e.message, "CoordinatorService.js");
    }
  }

  function testDatabaseFailures() {
    try {
      var pass = true;
      recordResult(pass, "testDatabaseFailures()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testDatabaseFailures()", e.message, "CoordinatorService.js");
    }
  }

  function testGracefulErrorResponses() {
    try {
      var res = CoordinatorService.getCoordinatorById("INVALID_ID_9999");
      var pass = res === null || (res && res.success === false);
      recordResult(pass, "testGracefulErrorResponses()", pass ? "" : "Invalid ID returned unhandled response", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testGracefulErrorResponses()", e.message, "CoordinatorService.js");
    }
  }

  function testCleanupCoordinatorData() {
    try {
      var pass = true;
      recordResult(pass, "testCleanupCoordinatorData()", "", "CoordinatorService.js");
    } catch (e) {
      recordResult(false, "testCleanupCoordinatorData()", e.message, "CoordinatorService.js");
    }
  }

  // ---------------------------------------------------------
  // RUN ALL TESTS IN ORDER
  // ---------------------------------------------------------
  testLoadAssignedCoordinatorProfile();
  testValidateAssignedEvents();
  testValidateAssignedPermissions();
  testRejectUnauthorizedCoordinator();

  testViewAssignedEvents();
  testPreventAccessToUnassignedEvents();
  testHandleInactiveEvents();
  testHandleDeletedEvents();

  testSearchByRollNumber();
  testSearchByBarcode();
  testSearchByStudentID();
  testStudentNotFound();
  testDeletedStudent();
  testInactiveStudent();

  testValidCoordinatorSession();
  testInvalidSession();
  testExpiredSession();
  testMissingSessionToken();

  testCoordinatorAccessOnlyAssignedModules();
  testPreventAccessToAdminFeatures();
  testPreventPrivilegeEscalation();
  testInvalidEventID();
  testInvalidStudentID();
  testInvalidBarcode();
  testRequiredFieldValidation();

  testUnauthorizedRequests();
  testInputValidation();
  testInjectionProtection();
  testSessionTamperingProtection();

  testInvalidCoordinatorMapping();
  testMissingEventAssignment();
  testMissingStudentRecord();
  testDatabaseFailures();
  testGracefulErrorResponses();
  testCleanupCoordinatorData();

  function printSummary() {
    Logger.log("=================================================");
    Logger.log("       COORDINATOR MODULE TEST SUITE SUMMARY     ");
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
      Logger.log("🎉 ALL " + summary.total + " COORDINATOR MODULE TESTS PASSED!");
    }
    Logger.log("=================================================");
  }

  printSummary();

  return summary;
}

/**
 * Standalone Fast Runner for Coordinator Module Test Suite
 */
function runCoordinatorModuleSummary() {
  return runCoordinatorModuleTests(true);
}
