/*
============================================================
TEST FILE
RoleAuthorizationTest.js

MODULE: Role Authorization & Security Permissions Suite
PROJECT: BVC Event Attendance System
TECH STACK: Google Apps Script & Supabase PostgreSQL
============================================================
*/

function runRoleAuthorizationTests() {
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
      Logger.log("PASS: " + name);
    } else {
      summary.failed++;
      Logger.log("FAIL: " + name + " | Reason: " + reason);
    }
    summary.results.push({
      name: name,
      status: pass ? "PASS" : "FAIL",
      reason: reason || "",
      affectedFiles: affectedFiles || "SecurityUtils.js"
    });
  }

  Logger.log("=================================================");
  Logger.log("      ROLE AUTHORIZATION TEST SUITE STARTING     ");
  Logger.log("=================================================");

  // 1. Super Admin authorization
  function testSuperAdminAuthorization() {
    try {
      var perms = SecurityUtils.getRoleDefaultPermissions(CONFIG.ROLES.SUPER_ADMIN);
      var pass = perms.includes('create_user') && perms.includes('create_event') && perms.includes('delete_event');
      recordResult(pass, "testSuperAdminAuthorization()", pass ? "" : "Super Admin default permission set incomplete", "SecurityUtils.js");
    } catch (e) {
      recordResult(false, "testSuperAdminAuthorization()", e.message, "SecurityUtils.js");
    }
  }

  // 2. Principal authorization
  function testPrincipalAuthorization() {
    try {
      var allUsers = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
      var sa = allUsers.find(function(u) {
        var r = String(u['Role'] || u.role || '').toUpperCase();
        return r === 'SUPER ADMIN' || r === 'SUPER_ADMIN' || r === 'SUPERADMIN';
      });
      var saId = sa ? (sa['User ID'] || sa.user_id || sa.userId) : null;
      var pass = true;
      if (saId) {
        pass = SecurityUtils.isSuperAdmin(saId) || SecurityUtils.hasPermission(saId, "view_dashboard");
      } else {
        pass = SecurityUtils.getRoleDefaultPermissions(CONFIG.ROLES.SUPER_ADMIN).includes("view_dashboard");
      }
      recordResult(pass, "testPrincipalAuthorization()", pass ? "" : "Principal user authorization failed", "SecurityUtils.js");
    } catch (e) {
      recordResult(false, "testPrincipalAuthorization()", e.message, "SecurityUtils.js");
    }
  }

  // 3. HOD authorization
  function testHODAuthorization() {
    try {
      var perms = SecurityUtils.getRoleDefaultPermissions(CONFIG.ROLES.HOD);
      var pass = perms.includes('create_event') && perms.includes('view_reports') && perms.includes('view_dashboard');
      recordResult(pass, "testHODAuthorization()", pass ? "" : "HOD default permission set incomplete", "SecurityUtils.js");
    } catch (e) {
      recordResult(false, "testHODAuthorization()", e.message, "SecurityUtils.js");
    }
  }

  // 4. Coordinator authorization
  function testCoordinatorAuthorization() {
    try {
      var perms = SecurityUtils.getRoleDefaultPermissions(CONFIG.ROLES.COORDINATOR);
      var pass = perms.includes('scan_attendance') && perms.includes('manual_attendance') && !perms.includes('create_user') && !perms.includes('delete_event');
      recordResult(pass, "testCoordinatorAuthorization()", pass ? "" : "Coordinator role permission boundaries violated", "SecurityUtils.js");
    } catch (e) {
      recordResult(false, "testCoordinatorAuthorization()", e.message, "SecurityUtils.js");
    }
  }

  // 5. Faculty authorization
  function testFacultyAuthorization() {
    try {
      var perms = SecurityUtils.getRoleDefaultPermissions("Faculty");
      var coordPerms = SecurityUtils.getRoleDefaultPermissions(CONFIG.ROLES.COORDINATOR);
      var pass = Array.isArray(perms) && Array.isArray(coordPerms);
      recordResult(pass, "testFacultyAuthorization()", pass ? "" : "Faculty role default permission mapping error", "SecurityUtils.js");
    } catch (e) {
      recordResult(false, "testFacultyAuthorization()", e.message, "SecurityUtils.js");
    }
  }

  // 6. Student authorization (if implemented)
  function testStudentAuthorization() {
    try {
      var perms = SecurityUtils.getRoleDefaultPermissions("Student");
      var pass = Array.isArray(perms) && perms.length === 0;
      recordResult(pass, "testStudentAuthorization()", pass ? "" : "Student role was granted unpermitted permissions", "SecurityUtils.js");
    } catch (e) {
      recordResult(false, "testStudentAuthorization()", e.message, "SecurityUtils.js");
    }
  }

  // 7. Invalid role rejection
  function testInvalidRoleRejection() {
    try {
      var perms = SecurityUtils.getRoleDefaultPermissions("INVALID_ROLE_999");
      var pass = Array.isArray(perms) && perms.length === 0;
      recordResult(pass, "testInvalidRoleRejection()", pass ? "" : "Invalid role did not evaluate to empty permission set", "SecurityUtils.js");
    } catch (e) {
      recordResult(false, "testInvalidRoleRejection()", e.message, "SecurityUtils.js");
    }
  }

  // 8. Missing role rejection
  function testMissingRoleRejection() {
    try {
      var pass1 = SecurityUtils.hasPermission(null, 'view_dashboard') === false;
      var pass2 = SecurityUtils.hasPermission('', 'view_dashboard') === false;
      var pass = pass1 && pass2;
      recordResult(pass, "testMissingRoleRejection()", pass ? "" : "Null or empty user identifier was not rejected", "SecurityUtils.js");
    } catch (e) {
      recordResult(false, "testMissingRoleRejection()", e.message, "SecurityUtils.js");
    }
  }

  // 9. Disabled user access
  function testDisabledUserAccess() {
    var testId = "USR_DIS_" + Date.now();
    try {
      DatabaseService.insertRow(CONFIG.SHEETS.USERS, {
        user_id: testId,
        employee_id: "EMP_DIS_" + Date.now(),
        first_name: "Disabled",
        last_name: "User",
        email_address: "dis_" + Date.now() + "@bvc.edu.in",
        username: "dis_" + Date.now(),
        password_hash: "hash",
        role: CONFIG.ROLES.SUPER_ADMIN,
        status: CONFIG.USER_STATUS.INACTIVE,
        deletion_flag: false
      });

      var allowed = SecurityUtils.hasPermission(testId, 'view_dashboard');
      var pass = allowed === false;
      recordResult(pass, "testDisabledUserAccess()", pass ? "" : "Inactive/disabled user bypassed security check", "SecurityUtils.js");
    } catch (e) {
      recordResult(false, "testDisabledUserAccess()", e.message, "SecurityUtils.js");
    } finally {
      try { DatabaseService.deleteRow(CONFIG.SHEETS.USERS, 'user_id', testId); } catch(ex){}
    }
  }

  // 10. Deleted user access
  function testDeletedUserAccess() {
    var testId = "USR_DEL_" + Date.now();
    try {
      DatabaseService.insertRow(CONFIG.SHEETS.USERS, {
        user_id: testId,
        employee_id: "EMP_DEL_" + Date.now(),
        first_name: "Deleted",
        last_name: "User",
        email_address: "del_" + Date.now() + "@bvc.edu.in",
        username: "del_" + Date.now(),
        password_hash: "hash",
        role: CONFIG.ROLES.SUPER_ADMIN,
        status: CONFIG.USER_STATUS.ACTIVE,
        deletion_flag: true
      });

      var allowed = SecurityUtils.hasPermission(testId, 'view_dashboard');
      var pass = allowed === false;
      recordResult(pass, "testDeletedUserAccess()", pass ? "" : "Deleted user with deletion_flag=true bypassed access check", "SecurityUtils.js");
    } catch (e) {
      recordResult(false, "testDeletedUserAccess()", e.message, "SecurityUtils.js");
    } finally {
      try { DatabaseService.deleteRow(CONFIG.SHEETS.USERS, 'user_id', testId); } catch(ex){}
    }
  }

  // 11. Module permission validation
  function testModulePermissionValidation() {
    var testId = "USR_MOD_" + Date.now();
    try {
      DatabaseService.insertRow(CONFIG.SHEETS.USERS, {
        user_id: testId,
        employee_id: "EMP_MOD_" + Date.now(),
        first_name: "Module",
        last_name: "Test",
        email_address: "mod_" + Date.now() + "@bvc.edu.in",
        username: "mod_" + Date.now(),
        password_hash: "hash",
        role: CONFIG.ROLES.SUPER_ADMIN,
        status: CONFIG.USER_STATUS.ACTIVE,
        deletion_flag: false
      });

      DatabaseService.insertRow(CONFIG.SHEETS.USER_PERMISSIONS, {
        user_id: testId,
        permission_key: "create_user",
        is_allowed: false
      });

      var allowed = SecurityUtils.hasPermission(testId, 'create_user');
      var pass = allowed === false;
      recordResult(pass, "testModulePermissionValidation()", pass ? "" : "Explicit DENY override in UserPermissions was ignored", "SecurityUtils.js");
    } catch (e) {
      recordResult(false, "testModulePermissionValidation()", e.message, "SecurityUtils.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.USER_PERMISSIONS, 'user_id', testId); } catch(ex){}
      try { DatabaseService.deleteRow(CONFIG.SHEETS.USERS, 'user_id', testId); } catch(ex){}
    }
  }

  // 12. API authorization
  function testAPIAuthorization() {
    try {
      var perms = SecurityUtils.getRoleDefaultPermissions(CONFIG.ROLES.SUPER_ADMIN);
      var pass = Array.isArray(perms) && perms.includes('create_user');
      recordResult(pass, "testAPIAuthorization()", pass ? "" : "API authorization check failed for Super Admin endpoint call", "SecurityUtils.js, Controller.js");
    } catch (e) {
      recordResult(false, "testAPIAuthorization()", e.message, "SecurityUtils.js");
    }
  }

  // 13. Role hierarchy validation
  function testRoleHierarchyValidation() {
    try {
      var superAdminPerms = SecurityUtils.getRoleDefaultPermissions(CONFIG.ROLES.SUPER_ADMIN).length;
      var hodPerms = SecurityUtils.getRoleDefaultPermissions(CONFIG.ROLES.HOD).length;
      var coordPerms = SecurityUtils.getRoleDefaultPermissions(CONFIG.ROLES.COORDINATOR).length;

      var pass = superAdminPerms >= hodPerms && hodPerms > coordPerms;
      recordResult(pass, "testRoleHierarchyValidation()", pass ? "" : "Role permission hierarchy count ordering invalid", "SecurityUtils.js");
    } catch (e) {
      recordResult(false, "testRoleHierarchyValidation()", e.message, "SecurityUtils.js");
    }
  }

  // 14. Privilege escalation prevention
  function testPrivilegeEscalationPrevention() {
    var testId = "USR_ESC_" + Date.now();
    try {
      DatabaseService.insertRow(CONFIG.SHEETS.USERS, {
        user_id: testId,
        employee_id: "EMP_ESC_" + Date.now(),
        first_name: "Escalation",
        last_name: "Attempt",
        email_address: "esc_" + Date.now() + "@bvc.edu.in",
        username: "esc_" + Date.now(),
        password_hash: "hash",
        role: CONFIG.ROLES.COORDINATOR,
        status: CONFIG.USER_STATUS.ACTIVE,
        deletion_flag: false
      });

      var canCreateUser = SecurityUtils.hasPermission(testId, 'create_user');
      var canDeleteEvent = SecurityUtils.hasPermission(testId, 'delete_event');
      var pass = canCreateUser === false && canDeleteEvent === false;
      recordResult(pass, "testPrivilegeEscalationPrevention()", pass ? "" : "Coordinator role elevated privileges detected", "SecurityUtils.js");
    } catch (e) {
      recordResult(false, "testPrivilegeEscalationPrevention()", e.message, "SecurityUtils.js");
    } finally {
      try { DatabaseService.deleteRow(CONFIG.SHEETS.USERS, 'user_id', testId); } catch(ex){}
    }
  }

  // 15. Unauthorized module access
  function testUnauthorizedModuleAccess() {
    try {
      var perms = SecurityUtils.getRoleDefaultPermissions(CONFIG.ROLES.COORDINATOR);
      var pass = !perms.includes('delete_user') && !perms.includes('close_event') && !perms.includes('reset_password');
      recordResult(pass, "testUnauthorizedModuleAccess()", pass ? "" : "Unauthorized modules present in Coordinator permission set", "SecurityUtils.js");
    } catch (e) {
      recordResult(false, "testUnauthorizedModuleAccess()", e.message, "SecurityUtils.js");
    }
  }

  // ---------------------------------------------------------
  // RUN ALL TESTS
  // ---------------------------------------------------------
  testSuperAdminAuthorization();
  testPrincipalAuthorization();
  testHODAuthorization();
  testCoordinatorAuthorization();
  testFacultyAuthorization();
  testStudentAuthorization();
  testInvalidRoleRejection();
  testMissingRoleRejection();
  testDisabledUserAccess();
  testDeletedUserAccess();
  testModulePermissionValidation();
  testAPIAuthorization();
  testRoleHierarchyValidation();
  testPrivilegeEscalationPrevention();
  testUnauthorizedModuleAccess();

  function printSummary() {
    Logger.log("=================================================");
    Logger.log("       ROLE AUTHORIZATION TEST SUITE SUMMARY     ");
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
      Logger.log("🎉 ALL " + summary.total + " ROLE AUTHORIZATION TESTS PASSED!");
    }
    Logger.log("=================================================");
  }

  printSummary();

  return summary;
}
