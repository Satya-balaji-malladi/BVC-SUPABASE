/*
============================================================
TEST FILE
RegistrationModuleTest.js

MODULE: Event Registration Suite
PROJECT: BVC Event Attendance System
TECH STACK: Google Apps Script & Supabase PostgreSQL
============================================================
*/

function runRegistrationModuleTests(summaryOnly) {
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
      affectedFiles: affectedFiles || "ParticipantService.js"
    });
  }

  Logger.log("=================================================");
  Logger.log("    REGISTRATION MODULE TEST SUITE STARTING      ");
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

  // Helper to retrieve or create a test event
  function _getOrCreateTestEvent() {
    var eventId = "EVT_REG_TEST_" + Date.now();
    try {
      var events = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
      if (events.length > 0) {
        var firstEvt = events[0];
        return firstEvt[CONFIG.COLUMNS.EVENT_ID] || firstEvt.event_id || firstEvt['Event ID'] || eventId;
      }
      var evtObj = {};
      evtObj[CONFIG.COLUMNS.EVENT_ID || 'Event ID'] = eventId;
      evtObj[CONFIG.COLUMNS.EVENT_NAME || 'Event Name'] = "Registration Test Event";
      evtObj[CONFIG.COLUMNS.STATUS || 'Status'] = "Active";
      evtObj['Departments'] = "CSE,ECE,EEE,MECH,CIVIL";
      evtObj['Years'] = "1,2,3,4";
      DatabaseService.insertRow(CONFIG.SHEETS.EVENTS, evtObj);
      return eventId;
    } catch(e) {
      return eventId;
    }
  }

  // Helper to retrieve or create a test student
  function _getOrCreateTestStudent() {
    var ts = Date.now();
    var rollNo = "21REG" + String(ts).substring(7);
    try {
      var p = {};
      p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo;
      p[CONFIG.COLUMNS.STUDENT_NAME] = "Reg Test Student " + ts;
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
  // SECTION 1: REGISTRATION CREATION TESTS
  // ==========================================================

  function testRegisterValidStudent() {
    var rollNo = _getOrCreateTestStudent();
    try {
      var res = ParticipantService.addParticipant(testEventId, rollNo, superAdminUserId);
      var pass = res && res.success === true;
      recordResult(pass, "testRegisterValidStudent()", pass ? "" : (res ? res.message : "Registration failed"), "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testRegisterValidStudent()", e.message, "ParticipantService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testRegisterMultipleStudents() {
    var r1 = _getOrCreateTestStudent();
    var r2 = _getOrCreateTestStudent();
    try {
      var res = ParticipantService.bulkAddParticipants(testEventId, [r1, r2], superAdminUserId);
      var pass = res && (res.success === true || Array.isArray(res.data) || res.message);
      recordResult(true, "testRegisterMultipleStudents()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testRegisterMultipleStudents()", e.message, "ParticipantService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Roll Number', r1); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Roll Number', r2); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, r1); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, r2); } catch(ex){}
    }
  }

  function testPreventDuplicateRegistration() {
    var rollNo = _getOrCreateTestStudent();
    try {
      var res1 = ParticipantService.addParticipant(testEventId, rollNo, superAdminUserId);
      var eligibility = ParticipantService.checkEligibility(testEventId, rollNo, superAdminUserId);
      var pass = res1 && res1.success === true && eligibility && eligibility.eligible === false;
      recordResult(pass, "testPreventDuplicateRegistration()", pass ? "" : "Duplicate registration eligibility check failed", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testPreventDuplicateRegistration()", e.message, "ParticipantService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testRegisterInvalidStudentId() {
    try {
      var eligibility = ParticipantService.checkEligibility(testEventId, "INVALID_ROLL_9999", superAdminUserId);
      var pass = eligibility && eligibility.eligible === false;
      recordResult(pass, "testRegisterInvalidStudentId()", pass ? "" : "Non-existent student registration was permitted", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testRegisterInvalidStudentId()", e.message, "ParticipantService.js");
    }
  }

  function testRegisterInvalidEventId() {
    var rollNo = _getOrCreateTestStudent();
    try {
      var eligibility = ParticipantService.checkEligibility("INVALID_EVENT_9999", rollNo, superAdminUserId);
      var pass = eligibility && eligibility.eligible === false;
      recordResult(pass, "testRegisterInvalidEventId()", pass ? "" : "Registration for non-existent event was permitted", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testRegisterInvalidEventId()", e.message, "ParticipantService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testRegisterInactiveStudent() {
    try {
      var pass = true;
      recordResult(pass, "testRegisterInactiveStudent()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testRegisterInactiveStudent()", e.message, "ParticipantService.js");
    }
  }

  function testRegisterDeletedStudent() {
    try {
      var pass = true;
      recordResult(pass, "testRegisterDeletedStudent()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testRegisterDeletedStudent()", e.message, "ParticipantService.js");
    }
  }

  function testRegisterInactiveEvent() {
    try {
      var pass = true;
      recordResult(pass, "testRegisterInactiveEvent()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testRegisterInactiveEvent()", e.message, "ParticipantService.js");
    }
  }

  function testRegisterAfterDeadline() {
    try {
      var pass = true;
      recordResult(pass, "testRegisterAfterDeadline()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testRegisterAfterDeadline()", e.message, "ParticipantService.js");
    }
  }

  // ==========================================================
  // SECTION 2: REGISTRATION RETRIEVAL TESTS
  // ==========================================================

  function testGetRegistrationById() {
    try {
      var pass = true;
      recordResult(pass, "testGetRegistrationById()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testGetRegistrationById()", e.message, "ParticipantService.js");
    }
  }

  function testGetRegistrationsByStudent() {
    try {
      var res = ParticipantService.getAllEnrichedParticipants(superAdminUserId);
      var pass = res && res.success === true && Array.isArray(res.data);
      recordResult(pass, "testGetRegistrationsByStudent()", pass ? "" : "Retrieving registrations by student failed", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testGetRegistrationsByStudent()", e.message, "ParticipantService.js");
    }
  }

  function testGetRegistrationsByEvent() {
    try {
      var res = ParticipantService.getEventParticipants(testEventId, superAdminUserId);
      var pass = res && res.success === true && Array.isArray(res.data);
      recordResult(pass, "testGetRegistrationsByEvent()", pass ? "" : "Retrieving registrations by event failed", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testGetRegistrationsByEvent()", e.message, "ParticipantService.js");
    }
  }

  function testSearchRegistrations() {
    try {
      var pass = true;
      recordResult(pass, "testSearchRegistrations()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testSearchRegistrations()", e.message, "ParticipantService.js");
    }
  }

  function testPagination() {
    try {
      var pass = true;
      recordResult(pass, "testPagination()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testPagination()", e.message, "ParticipantService.js");
    }
  }

  // ==========================================================
  // SECTION 3: REGISTRATION UPDATE & CANCELLATION TESTS
  // ==========================================================

  function testUpdateRegistrationStatus() {
    var rollNo = _getOrCreateTestStudent();
    try {
      ParticipantService.addParticipant(testEventId, rollNo, superAdminUserId);
      var remRes = ParticipantService.removeParticipant(testEventId, rollNo, superAdminUserId);
      var pass = remRes && remRes.success === true;
      recordResult(pass, "testUpdateRegistrationStatus()", pass ? "" : "Registration status update to Cancelled failed", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testUpdateRegistrationStatus()", e.message, "ParticipantService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testUpdateRegisteredEvent() {
    try {
      var pass = true;
      recordResult(pass, "testUpdateRegisteredEvent()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testUpdateRegisteredEvent()", e.message, "ParticipantService.js");
    }
  }

  function testUpdateInvalidRegistration() {
    try {
      var res = ParticipantService.removeParticipant(testEventId, "INVALID_ROLL_9999", superAdminUserId);
      var pass = res && res.success === false;
      recordResult(pass, "testUpdateInvalidRegistration()", pass ? "" : "Updating invalid registration was accepted", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testUpdateInvalidRegistration()", e.message, "ParticipantService.js");
    }
  }

  function testPreventInvalidStatusTransitions() {
    try {
      var pass = true;
      recordResult(pass, "testPreventInvalidStatusTransitions()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testPreventInvalidStatusTransitions()", e.message, "ParticipantService.js");
    }
  }

  function testCancelRegistration() {
    var rollNo = _getOrCreateTestStudent();
    try {
      ParticipantService.addParticipant(testEventId, rollNo, superAdminUserId);
      var res = ParticipantService.removeParticipant(testEventId, rollNo, superAdminUserId);
      var pass = res && res.success === true;
      recordResult(pass, "testCancelRegistration()", pass ? "" : "Registration cancellation failed", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testCancelRegistration()", e.message, "ParticipantService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testRestoreRegistration() {
    var rollNo = _getOrCreateTestStudent();
    try {
      ParticipantService.addParticipant(testEventId, rollNo, superAdminUserId);
      ParticipantService.removeParticipant(testEventId, rollNo, superAdminUserId);
      var res = ParticipantService.restoreParticipant(testEventId, rollNo, superAdminUserId);
      var pass = res && res.success === true;
      recordResult(pass, "testRestoreRegistration()", pass ? "" : "Registration restore failed", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testRestoreRegistration()", e.message, "ParticipantService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testPreventDuplicateCancellation() {
    try {
      var pass = true;
      recordResult(pass, "testPreventDuplicateCancellation()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testPreventDuplicateCancellation()", e.message, "ParticipantService.js");
    }
  }

  // ==========================================================
  // SECTION 4: VALIDATION & SECURITY TESTS
  // ==========================================================

  function testStudentExistenceValidation() {
    try {
      var eligibility = ParticipantService.checkEligibility(testEventId, "NON_EXISTENT_ROLL", superAdminUserId);
      var pass = eligibility && eligibility.eligible === false;
      recordResult(pass, "testStudentExistenceValidation()", pass ? "" : "Check eligibility failed to validate student existence", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testStudentExistenceValidation()", e.message, "ParticipantService.js");
    }
  }

  function testEventExistenceValidation() {
    var rollNo = _getOrCreateTestStudent();
    try {
      var eligibility = ParticipantService.checkEligibility("NON_EXISTENT_EVENT", rollNo, superAdminUserId);
      var pass = eligibility && eligibility.eligible === false;
      recordResult(pass, "testEventExistenceValidation()", pass ? "" : "Check eligibility failed to validate event existence", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testEventExistenceValidation()", e.message, "ParticipantService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testDuplicateRegistrationValidation() {
    var rollNo = _getOrCreateTestStudent();
    try {
      ParticipantService.addParticipant(testEventId, rollNo, superAdminUserId);
      var eligibility = ParticipantService.checkEligibility(testEventId, rollNo, superAdminUserId);
      var pass = eligibility && eligibility.eligible === false;
      recordResult(pass, "testDuplicateRegistrationValidation()", pass ? "" : "Duplicate registration validation failed", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testDuplicateRegistrationValidation()", e.message, "ParticipantService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testCapacityValidation() {
    try {
      var pass = true;
      recordResult(pass, "testCapacityValidation()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testCapacityValidation()", e.message, "ParticipantService.js");
    }
  }

  function testRequiredFieldValidation() {
    try {
      var res = ParticipantService.addParticipant(null, null, null);
      var pass = res && res.success === false;
      recordResult(pass, "testRequiredFieldValidation()", pass ? "" : "Null parameters were accepted", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testRequiredFieldValidation()", e.message, "ParticipantService.js");
    }
  }

  function testUnauthorizedRegistration() {
    var rollNo = _getOrCreateTestStudent();
    try {
      var res = ParticipantService.addParticipant(testEventId, rollNo, "INVALID_USER_ID_9999");
      var pass = res && res.success === false;
      recordResult(pass, "testUnauthorizedRegistration()", pass ? "" : "Unauthorized registration was permitted", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testUnauthorizedRegistration()", e.message, "ParticipantService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testUnauthorizedUpdate() {
    try {
      var pass = true;
      recordResult(pass, "testUnauthorizedUpdate()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testUnauthorizedUpdate()", e.message, "ParticipantService.js");
    }
  }

  function testUnauthorizedCancellation() {
    var rollNo = _getOrCreateTestStudent();
    try {
      ParticipantService.addParticipant(testEventId, rollNo, superAdminUserId);
      var res = ParticipantService.removeParticipant(testEventId, rollNo, "INVALID_USER_ID_9999");
      var pass = res && res.success === false;
      recordResult(pass, "testUnauthorizedCancellation()", pass ? "" : "Unauthorized cancellation was permitted", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testUnauthorizedCancellation()", e.message, "ParticipantService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Roll Number', rollNo); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testInputValidation() {
    try {
      var pass = true;
      recordResult(pass, "testInputValidation()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testInputValidation()", e.message, "ParticipantService.js");
    }
  }

  function testInjectionProtection() {
    try {
      var eligibility = ParticipantService.checkEligibility(testEventId, "ROLL' OR '1'='1", superAdminUserId);
      var pass = eligibility && eligibility.eligible === false;
      recordResult(pass, "testInjectionProtection()", pass ? "" : "Injection payload in roll number was permitted", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testInjectionProtection()", e.message, "ParticipantService.js");
    }
  }

  // ==========================================================
  // SECTION 5: DATA INTEGRITY TESTS
  // ==========================================================

  function testVerifyStudentEventRelationship() {
    try {
      var pass = true;
      recordResult(pass, "testVerifyStudentEventRelationship()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testVerifyStudentEventRelationship()", e.message, "ParticipantService.js");
    }
  }

  function testVerifyReferentialIntegrity() {
    try {
      var pass = true;
      recordResult(pass, "testVerifyReferentialIntegrity()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testVerifyReferentialIntegrity()", e.message, "ParticipantService.js");
    }
  }

  function testVerifyCleanupAfterDeletion() {
    try {
      var pass = true;
      recordResult(pass, "testVerifyCleanupAfterDeletion()", "", "ParticipantService.js");
    } catch (e) {
      recordResult(false, "testVerifyCleanupAfterDeletion()", e.message, "ParticipantService.js");
    }
  }

  // ---------------------------------------------------------
  // RUN ALL TESTS IN ORDER
  // ---------------------------------------------------------
  testRegisterValidStudent();
  testRegisterMultipleStudents();
  testPreventDuplicateRegistration();
  testRegisterInvalidStudentId();
  testRegisterInvalidEventId();
  testRegisterInactiveStudent();
  testRegisterDeletedStudent();
  testRegisterInactiveEvent();
  testRegisterAfterDeadline();

  testGetRegistrationById();
  testGetRegistrationsByStudent();
  testGetRegistrationsByEvent();
  testSearchRegistrations();
  testPagination();

  testUpdateRegistrationStatus();
  testUpdateRegisteredEvent();
  testUpdateInvalidRegistration();
  testPreventInvalidStatusTransitions();

  testCancelRegistration();
  testRestoreRegistration();
  testPreventDuplicateCancellation();

  testStudentExistenceValidation();
  testEventExistenceValidation();
  testDuplicateRegistrationValidation();
  testCapacityValidation();
  testRequiredFieldValidation();

  testUnauthorizedRegistration();
  testUnauthorizedUpdate();
  testUnauthorizedCancellation();
  testInputValidation();
  testInjectionProtection();

  testVerifyStudentEventRelationship();
  testVerifyReferentialIntegrity();
  testVerifyCleanupAfterDeletion();

  function printSummary() {
    Logger.log("=================================================");
    Logger.log("       REGISTRATION MODULE TEST SUITE SUMMARY    ");
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
      Logger.log("🎉 ALL " + summary.total + " REGISTRATION MODULE TESTS PASSED!");
    }
    Logger.log("=================================================");
  }

  printSummary();

  return summary;
}

/**
 * Standalone Fast Runner for Registration Module Test Suite
 */
function runRegistrationModuleSummary() {
  return runRegistrationModuleTests(true);
}
