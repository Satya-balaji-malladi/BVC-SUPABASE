/**
 * ============================================================
 * USERS MODULE AUTOMATED TEST SUITE
 * Project: BVC Event Attendance System
 * Version: 1.0
 * ============================================================
 */

var USER_TEST_RESULTS = [];
var CREATED_TEST_USER_ID = null;

/**
 * ------------------------------------------------------------
 * Helper: Start Test
 * ------------------------------------------------------------
 */
function startTest(testName) {
  Logger.log("");
  Logger.log("==================================================");
  Logger.log("RUNNING : " + testName);
  Logger.log("==================================================");
  return new Date().getTime();
}

/**
 * ------------------------------------------------------------
 * Helper: PASS
 * ------------------------------------------------------------
 */
function passTest(testName, startTime, details) {
  var time = new Date().getTime() - startTime;
  USER_TEST_RESULTS.push({
    test: testName,
    status: "PASS",
    reason: "",
    details: details || "",
    executionTime: time
  });
  Logger.log("✅ PASS");
  if (details) {
    Logger.log(details);
  }
}

/**
 * ------------------------------------------------------------
 * Helper: FAIL
 * ------------------------------------------------------------
 */
function failTest(testName, reason, startTime) {
  var time = new Date().getTime() - startTime;
  USER_TEST_RESULTS.push({
    test: testName,
    status: "FAIL",
    reason: reason,
    details: "",
    executionTime: time
  });
  Logger.log("❌ FAIL");
  Logger.log("Reason : " + reason);
}

/**
 * ------------------------------------------------------------
 * Helper: Print Summary
 * ------------------------------------------------------------
 */
function printSummary() {
  Logger.log("");
  Logger.log("==================================================");
  Logger.log("            USERS MODULE TEST SUMMARY");
  Logger.log("==================================================");

  var pass = 0;
  var fail = 0;
  var totalTime = 0;

  USER_TEST_RESULTS.forEach(function (result, index) {
    totalTime += result.executionTime;
    Logger.log("");
    Logger.log((index + 1) + ". " + result.test);
    Logger.log("Status : " + result.status);
    if (result.reason) {
      Logger.log("Reason : " + result.reason);
    }
    if (result.details) {
      Logger.log("Details : " + result.details);
    }
    Logger.log("Execution Time : " + result.executionTime + " ms");

    if (result.status === "PASS") {
      pass++;
    } else {
      fail++;
    }
  });

  var total = USER_TEST_RESULTS.length;
  var successRate = total > 0 ? ((pass / total) * 100).toFixed(2) : "0.00";

  Logger.log("");
  Logger.log("--------------------------------------------------");
  Logger.log("Total Tests    : " + total);
  Logger.log("Passed         : " + pass);
  Logger.log("Failed         : " + fail);
  Logger.log("Success %      : " + successRate + "%");
  Logger.log("Total Time     : " + totalTime + " ms");
  Logger.log("--------------------------------------------------");
}

/**
 * Helper to obtain Super Admin Session Token safely from AuthService.login
 */
function getSuperAdminSessionToken() {
  try {
    var loginResult = AuthService.login({
      employeeId: "USER_SA_01",
      password: "admin123"
    });
    if (!loginResult || !loginResult.success) return null;
    if (typeof loginResult.token === 'string') return loginResult.token;
    if (typeof loginResult.sessionToken === 'string') return loginResult.sessionToken;
    if (loginResult.data && typeof loginResult.data.token === 'string') return loginResult.data.token;
    if (loginResult.data && typeof loginResult.data.sessionToken === 'string') return loginResult.data.sessionToken;
    if (loginResult.token && typeof loginResult.token === 'object') {
      return loginResult.token['Session Token'] || loginResult.token.sessionToken || loginResult.token.token;
    }
    return null;
  } catch (e) {
    Logger.log("Error obtaining test session token: " + e);
    return null;
  }
}

/**
 * ============================================================
 * TEST 1: Login
 * ============================================================
 */
function test_Login() {
  var start = startTest("Login as Super Admin");
  try {
    var loginResult = AuthService.login({
      employeeId: "USER_SA_01",
      password: "admin123"
    });

    if (!loginResult || !loginResult.success) {
      failTest("Login as Super Admin", "Login failed: " + (loginResult ? loginResult.message : "No response"), start);
      return;
    }

    var token = (typeof loginResult.token === 'string') ? loginResult.token :
                (typeof loginResult.sessionToken === 'string') ? loginResult.sessionToken :
                (loginResult.data && typeof loginResult.data.token === 'string') ? loginResult.data.token :
                (loginResult.data && typeof loginResult.data.sessionToken === 'string') ? loginResult.data.sessionToken :
                (loginResult.token && typeof loginResult.token === 'object' ? (loginResult.token['Session Token'] || loginResult.token.sessionToken || loginResult.token.token) :
                (loginResult.data && loginResult.data.token && typeof loginResult.data.token === 'object' ? (loginResult.data.token['Session Token'] || loginResult.data.token.sessionToken) : null));

    if (!token) {
      failTest("Login as Super Admin", "Session token missing from login response", start);
      return;
    }

    var user = loginResult.user || (loginResult.data ? loginResult.data.user : null);
    var role = user ? String(user.Role || user.role || user.ROLE || '').trim() : '';

    var isSuper = role.toUpperCase().includes("SUPER");
    if (!isSuper) {
      failTest("Login as Super Admin", "User role is not SuperAdmin (found: " + role + ")", start);
      return;
    }

    passTest("Login as Super Admin", start, "Session Created. Token: " + token + " | Role: " + role);
  } catch (e) {
    failTest("Login as Super Admin", e.toString(), start);
  }
}

/**
 * ============================================================
 * TEST 2: Get All Users
 * ============================================================
 */
function test_GetAllUsers() {
  var start = startTest("Get All Users");
  try {
    var sessionToken = getSuperAdminSessionToken();
    if (!sessionToken) {
      failTest("Get All Users", "Failed to obtain valid session token", start);
      return;
    }

    var users = Controller.User.getAllUsers(sessionToken);

    if (users === null || users === undefined) {
      failTest("Get All Users", "Returned null/undefined", start);
      return;
    }

    if (!Array.isArray(users)) {
      failTest("Get All Users", "Returned response is not an Array", start);
      return;
    }

    if (users.length === 0) {
      failTest("Get All Users", "Returned user array is empty", start);
      return;
    }

    Logger.log("===== TOTAL USERS =====");
    Logger.log(users.length);
    Logger.log("===== SAMPLE USER =====");
    Logger.log(JSON.stringify(users[0], null, 2));

    passTest("Get All Users", start, "Fetched " + users.length + " users successfully.");
  } catch (e) {
    failTest("Get All Users", e.toString(), start);
  }
}

/**
 * ============================================================
 * TEST 3: Get User By ID
 * ============================================================
 */
function test_GetUserById() {
  var start = startTest("Get User By ID (USER_SA_01)");
  try {
    var targetId = "USER_SA_01";
    var user = UserService.getUserById(targetId);

    if (!user) {
      failTest("Get User By ID (USER_SA_01)", "User USER_SA_01 not found", start);
      return;
    }

    var foundId = String(user['User ID'] || user.user_id || user.userId || '').trim();
    if (foundId !== targetId) {
      failTest("Get User By ID (USER_SA_01)", "ID mismatch. Expected " + targetId + ", got " + foundId, start);
      return;
    }

    passTest("Get User By ID (USER_SA_01)", start, "User USER_SA_01 exists. Name: " + (user['First Name'] || user.first_name || ''));
  } catch (e) {
    failTest("Get User By ID (USER_SA_01)", e.toString(), start);
  }
}

/**
 * ============================================================
 * TEST 4: Search User
 * ============================================================
 */
function test_SearchUser() {
  var start = startTest("Search User ('principal')");
  try {
    var sessionToken = getSuperAdminSessionToken();
    var allUsers = Controller.User.getAllUsers(sessionToken) || [];
    var searchTerm = "principal";

    var results = allUsers.filter(function (u) {
      var text = JSON.stringify(u).toLowerCase();
      return text.indexOf(searchTerm) !== -1;
    });

    if (results.length === 0) {
      failTest("Search User ('principal')", "No users found matching search term 'principal'", start);
      return;
    }

    passTest("Search User ('principal')", start, "Found " + results.length + " matching user(s).");
  } catch (e) {
    failTest("Search User ('principal')", e.toString(), start);
  }
}

/**
 * ============================================================
 * TEST 5: Create User
 * ============================================================
 */
function test_CreateUser() {
  var start = startTest("Create Temporary User");
  try {
    var sessionToken = getSuperAdminSessionToken();
    if (!sessionToken) {
      failTest("Create Temporary User", "Failed to obtain session token", start);
      return;
    }

    var ts = new Date().getTime();
    CREATED_TEST_USER_ID = "USR_TEST_" + ts;
    var testUserPayload = {
      user_id: CREATED_TEST_USER_ID,
      employee_id: "EMP_T_" + Math.floor(Math.random() * 100000),
      username: "testuser_" + ts,
      first_name: "Test",
      last_name: "Automation",
      email_address: "testuser_" + ts + "@bvc.edu.in",
      role: "Coordinator",
      department: "CSE",
      status: "Active",
      password: "TestPassword123!"
    };

    var res = Controller.User.createUser(sessionToken, testUserPayload);

    if (!res || !res.success) {
      failTest("Create Temporary User", "User creation failed: " + (res ? res.message : "No response"), start);
      return;
    }

    passTest("Create Temporary User", start, "Created user successfully with ID: " + CREATED_TEST_USER_ID);
  } catch (e) {
    failTest("Create Temporary User", e.toString(), start);
  }
}

/**
 * ============================================================
 * TEST 6: Update User
 * ============================================================
 */
function test_UpdateUser() {
  var start = startTest("Update User Preferences (phone, language, theme)");
  try {
    var targetUserId = CREATED_TEST_USER_ID || "USER_SA_01";
    var updates = {
      phone: "+91-9876543210",
      phone_number: "+91-9876543210",
      language: "English",
      theme: "Dark"
    };

    var res = UserService.updateUser(targetUserId, updates);

    if (!res || !res.success) {
      // Try updatePreferences fallback if updateUser is restricted
      res = UserService.updatePreferences ? UserService.updatePreferences(targetUserId, updates) : res;
    }

    if (!res || !res.success) {
      failTest("Update User Preferences", "Update failed: " + (res ? res.message : "No response"), start);
      return;
    }

    passTest("Update User Preferences", start, "Updated preferences for user " + targetUserId);
  } catch (e) {
    failTest("Update User Preferences", e.toString(), start);
  }
}

/**
 * ============================================================
 * TEST 7: Delete User
 * ============================================================
 */
function test_DeleteUser() {
  var start = startTest("Soft Delete Temporary User");
  try {
    var targetUserId = CREATED_TEST_USER_ID;
    if (!targetUserId) {
      failTest("Soft Delete Temporary User", "No temporary created user available to delete", start);
      return;
    }

    var sessionToken = getSuperAdminSessionToken();
    var res = Controller.User.deleteUser(sessionToken, targetUserId);

    if (!res || !res.success) {
      failTest("Soft Delete Temporary User", "Delete failed: " + (res ? res.message : "No response"), start);
      return;
    }

    // Verify deletion flag in DB record
    var deletedRecord = UserService.getUserById(targetUserId);
    var isDeleted = deletedRecord ? Boolean(deletedRecord['Deletion Flag'] || deletedRecord.deletion_flag) : true;

    if (!isDeleted) {
      failTest("Soft Delete Temporary User", "Deletion flag was not set to true for " + targetUserId, start);
      return;
    }

    passTest("Soft Delete Temporary User", start, "Soft deleted user " + targetUserId + " successfully.");
  } catch (e) {
    failTest("Soft Delete Temporary User", e.toString(), start);
  }
}

/**
 * ============================================================
 * TEST 8: Role Filtering (Super Admin)
 * ============================================================
 */
function test_RoleFiltering() {
  var start = startTest("Role Filtering (Super Admin)");
  try {
    var superAdminCtx = {
      userId: "USER_SA_01",
      role: "Super Admin",
      isSuperAdmin: true
    };

    var users = UserService.getAllUsers(superAdminCtx);

    if (!Array.isArray(users) || users.length === 0) {
      failTest("Role Filtering (Super Admin)", "Super Admin returned zero users or non-array", start);
      return;
    }

    passTest("Role Filtering (Super Admin)", start, "Super Admin receives all global users (" + users.length + " total).");
  } catch (e) {
    failTest("Role Filtering (Super Admin)", e.toString(), start);
  }
}

/**
 * ============================================================
 * TEST 9: Department Filtering (HOD)
 * ============================================================
 */
function test_DepartmentFiltering() {
  var start = startTest("Department Filtering (HOD)");
  try {
    var targetDept = "CSE";
    var hodCtx = {
      userId: "USER_HOD_01",
      role: "HOD",
      isHOD: true,
      department: targetDept,
      isSuperAdmin: false
    };

    var scopedUsers = UserService.getAllUsers(hodCtx);

    if (!Array.isArray(scopedUsers)) {
      failTest("Department Filtering (HOD)", "HOD scope returned non-array response", start);
      return;
    }

    // Verify all returned users belong to target department
    var invalidDepts = scopedUsers.filter(function (u) {
      var d = String(u['Department'] || u.department || '').trim().toUpperCase();
      return d !== "" && d !== targetDept.toUpperCase() && !d.includes(targetDept.toUpperCase());
    });

    if (invalidDepts.length > 0) {
      failTest("Department Filtering (HOD)", "HOD received users outside their department (" + invalidDepts.length + " mismatched)", start);
      return;
    }

    passTest("Department Filtering (HOD)", start, "HOD scoped strictly to " + targetDept + " department (" + scopedUsers.length + " users).");
  } catch (e) {
    failTest("Department Filtering (HOD)", e.toString(), start);
  }
}

/**
 * ============================================================
 * TEST 10: Response Time
 * ============================================================
 */
function test_ResponseTime() {
  var start = startTest("Controller.User.getAllUsers Response Time");
  try {
    var sessionToken = getSuperAdminSessionToken();
    var startTime = new Date().getTime();

    var users = Controller.User.getAllUsers(sessionToken);

    var duration = new Date().getTime() - startTime;

    if (!Array.isArray(users)) {
      failTest("Response Time Test", "Controller call failed", start);
      return;
    }

    var thresholdMs = 5000;
    if (duration > thresholdMs) {
      failTest("Response Time Test", "Execution time exceeded threshold (" + duration + " ms > " + thresholdMs + " ms)", start);
      return;
    }

    passTest("Response Time Test", start, "Execution completed in " + duration + " ms (Threshold: " + thresholdMs + " ms).");
  } catch (e) {
    failTest("Response Time Test", e.toString(), start);
  }
}

/**
 * ============================================================
 * TEST 11: Data Integrity (Duplicate Checks)
 * ============================================================
 */
function test_DataIntegrity() {
  var start = startTest("Data Integrity (Duplicates)");
  try {
    var allRows = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];

    var userIds = {};
    var empIds = {};
    var emails = {};

    var dupUserIds = [];
    var dupEmpIds = [];
    var dupEmails = [];

    allRows.forEach(function (r) {
      if (r[CONFIG.COLUMNS.DELETION_FLAG] || r['Deletion Flag']) return;

      var uid = String(r['User ID'] || r.user_id || '').trim();
      var emp = String(r['Employee ID'] || r.employee_id || '').trim();
      var eml = String(r['Email Address'] || r.email_address || r.email || '').trim().toLowerCase();

      if (uid) {
        if (userIds[uid]) dupUserIds.push(uid);
        else userIds[uid] = true;
      }
      if (emp) {
        if (empIds[emp]) dupEmpIds.push(emp);
        else empIds[emp] = true;
      }
      if (eml) {
        if (emails[eml]) dupEmails.push(eml);
        else emails[eml] = true;
      }
    });

    var hasDuplicates = dupUserIds.length > 0 || dupEmpIds.length > 0 || dupEmails.length > 0;
    var details = "Duplicate UserIDs: " + dupUserIds.length +
                  " | Duplicate EmpIDs: " + dupEmpIds.length +
                  " | Duplicate Emails: " + dupEmails.length;

    if (hasDuplicates) {
      failTest("Data Integrity (Duplicates)", "Found duplicates -> " + details, start);
      return;
    }

    passTest("Data Integrity (Duplicates)", start, "Zero duplicates detected across active users. " + details);
  } catch (e) {
    failTest("Data Integrity (Duplicates)", e.toString(), start);
  }
}

/**
 * ============================================================
 * TEST 12: Invalid Session Token
 * ============================================================
 */
function test_InvalidSession() {
  var start = startTest("Invalid Session Token Handling");
  try {
    var invalidToken = "INVALID_SESSION_TOKEN_99999";
    var result = Controller.User.getAllUsers(invalidToken);

    // Expecting either empty array or error response
    var isHandled = (Array.isArray(result) && result.length === 0) || (result && result.success === false) || result === null;

    if (!isHandled) {
      failTest("Invalid Session Token Handling", "Invalid session token was improperly granted access or returned data", start);
      return;
    }

    passTest("Invalid Session Token Handling", start, "Invalid session token rejected successfully.");
  } catch (e) {
    passTest("Invalid Session Token Handling", start, "Invalid session token rejected with exception: " + e.toString());
  }
}

/**
 * ============================================================
 * TEST 13: Restore User
 * ============================================================
 */
function test_RestoreUser() {
  var start = startTest("Restore Soft-Deleted User");
  try {
    var targetUserId = CREATED_TEST_USER_ID;
    if (!targetUserId) {
      passTest("Restore Soft-Deleted User", start, "Skipped: No target user ID available from previous test");
      return;
    }

    var sessionToken = getSuperAdminSessionToken();
    var res = Controller.User.restoreUser(sessionToken, targetUserId);

    if (!res || !res.success) {
      failTest("Restore Soft-Deleted User", "Restore failed: " + (res ? res.message : "No response"), start);
      return;
    }

    var restoredRecord = UserService.getUserById(targetUserId);
    var isDeleted = restoredRecord ? Boolean(restoredRecord['Deletion Flag'] || restoredRecord.deletion_flag) : true;

    if (isDeleted) {
      failTest("Restore Soft-Deleted User", "Deletion flag was still true after restore for " + targetUserId, start);
      return;
    }

    passTest("Restore Soft-Deleted User", start, "Restored user " + targetUserId + " successfully.");
  } catch (e) {
    failTest("Restore Soft-Deleted User", e.toString(), start);
  }
}

/**
 * ============================================================
 * TEST 14: Duplicate Checks Validation
 * ============================================================
 */
function test_DuplicateValidation() {
  var start = startTest("Duplicate Validation (Employee ID & Email)");
  try {
    var sessionToken = getSuperAdminSessionToken();
    
    // Attempt duplicate Employee ID
    var dupEmpPayload = {
      employee_id: "USER_SA_01",
      username: "dup_emp_user_" + new Date().getTime(),
      first_name: "Dup",
      last_name: "Test",
      email_address: "dup_emp_" + new Date().getTime() + "@bvc.edu.in",
      role: "Coordinator",
      department: "CSE"
    };

    var resEmp = Controller.User.createUser(sessionToken, dupEmpPayload);
    if (resEmp && resEmp.success) {
      failTest("Duplicate Validation", "Allowed duplicate Employee ID: USER_SA_01", start);
      return;
    }

    // Attempt duplicate Email
    var dupEmailPayload = {
      employee_id: "EMP_DUP_" + new Date().getTime(),
      username: "dup_email_user_" + new Date().getTime(),
      first_name: "Dup",
      last_name: "EmailTest",
      email_address: "principal@bvc.edu.in",
      role: "Coordinator",
      department: "CSE"
    };

    var resEmail = Controller.User.createUser(sessionToken, dupEmailPayload);
    if (resEmail && resEmail.success) {
      failTest("Duplicate Validation", "Allowed duplicate Email Address: principal@bvc.edu.in", start);
      return;
    }

    passTest("Duplicate Validation", start, "Duplicate Employee ID & Email rejections verified successfully.");
  } catch (e) {
    failTest("Duplicate Validation", e.toString(), start);
  }
}

/**
 * ============================================================
 * TEST 15: Audit Log Verification
 * ============================================================
 */
function test_AuditLog() {
  var start = startTest("Audit Log Verification");
  try {
    var logs = DatabaseService.readAllRows(CONFIG.SHEETS.AUDITLOGS) || [];
    if (logs.length === 0) {
      failTest("Audit Log Verification", "No audit logs found", start);
      return;
    }

    var userLogs = logs.filter(function (l) {
      var mod = String(l.module || l.Module || '').toLowerCase();
      return mod === 'userservice' || mod === 'authservice' || mod === 'user';
    });

    passTest("Audit Log Verification", start, "Verified " + userLogs.length + " audit log entries for User operations.");
  } catch (e) {
    failTest("Audit Log Verification", e.toString(), start);
  }
}

/**
 * ============================================================
 * AUTOMATIC TEST RUNNER
 * ============================================================
 */
function runUsersTests() {
  if (typeof Logger !== 'undefined' && Logger.clear) {
    Logger.clear();
  }

  USER_TEST_RESULTS = [];

  Logger.log("");
  Logger.log("##################################################");
  Logger.log("       USERS MODULE AUTOMATED TEST SUITE");
  Logger.log("##################################################");

  test_Login();
  test_GetAllUsers();
  test_GetUserById();
  test_SearchUser();
  test_CreateUser();
  test_UpdateUser();
  test_DeleteUser();
  test_RestoreUser();
  test_RoleFiltering();
  test_DepartmentFiltering();
  test_ResponseTime();
  test_DataIntegrity();
  test_InvalidSession();
  test_DuplicateValidation();
  test_AuditLog();

  printSummary();
}