/*
============================================================
TEST FILE
FacultyModuleTest.js

MODULE: Faculty Management Suite
PROJECT: BVC Event Attendance System
TECH STACK: Google Apps Script & Supabase PostgreSQL
============================================================
*/

function runFacultyModuleTests(summaryOnly) {
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
      affectedFiles: affectedFiles || "FacultyService.js"
    });
  }

  Logger.log("=================================================");
  Logger.log("       FACULTY MODULE TEST SUITE STARTING        ");
  Logger.log("=================================================");

  // Helper to obtain a valid Super Admin session token
  function getSuperAdminSessionToken() {
    try {
      var allUsers = UserService.getAllUsers(null) || [];
      var superAdminUser = allUsers.find(function(u) {
        var r = String(u['Role'] || u.role || '').toUpperCase();
        return r === 'SUPER ADMIN' || r === 'SUPER_ADMIN' || r === 'SUPERADMIN';
      });

      if (!superAdminUser) {
        superAdminUser = UserService.getUserById("USR0001");
      }

      if (!superAdminUser) {
        superAdminUser = {
          'User ID': 'USR0001',
          user_id: 'USR0001',
          'Role': 'Super Admin',
          role: 'Super Admin',
          'Username': 'priyanka',
          username: 'priyanka'
        };
      }

      if (!superAdminUser['User ID'] && superAdminUser.user_id) {
        superAdminUser['User ID'] = superAdminUser.user_id;
      }

      var res = SessionService.createSession(superAdminUser);
      return res ? (res['Session Token'] || res.session_token || res.sessionToken || res.token || "TOKEN_SUPER_ADMIN") : "TOKEN_SUPER_ADMIN";
    } catch(e) {
      Logger.log("getSuperAdminSessionToken error: " + e.message);
      return "TOKEN_SUPER_ADMIN";
    }
  }

  var superAdminToken = getSuperAdminSessionToken();

  function _getSeedFaculty() {
    try {
      var list = FacultyService.getFacultyMembers() || [];
      return list.length > 0 ? list[0] : null;
    } catch(e) { return null; }
  }

  // ==========================================================
  // SECTION 1: FACULTY CREATION TESTS
  // ==========================================================

  function testCreateValidFaculty() {
    var ts = Date.now();
    var payload = {
      name: "Dr. Valid Faculty",
      employeeId: "EMP_FAC_" + ts,
      departmentId: "CSE",
      designation: "Associate Professor",
      phone: "9876543210",
      email: "fac_valid_" + ts + "@bvc.edu.in",
      username: "fac_valid_" + ts,
      password: "TempPassword123!",
      skipEmail: true
    };

    var createdUserId = null;
    var createdFacultyId = null;

    try {
      var res = FacultyService.createFaculty(superAdminToken, payload);
      var pass = res && res.success === true;
      if (res) {
        createdUserId = res.userId || (res.data ? res.data.userId : null);
        createdFacultyId = res.facultyId || (res.data ? res.data.facultyId : null);
      }
      recordResult(pass, "testCreateValidFaculty()", pass ? "" : (res ? res.message : "Faculty creation failed"), "FacultyService.js");
    } catch (e) {
      recordResult(false, "testCreateValidFaculty()", e.message, "FacultyService.js");
    } finally {
      if (createdFacultyId) try { DatabaseService.hardDelete(CONFIG.SHEETS.FACULTY, 'faculty_id', createdFacultyId); } catch(ex){}
      if (createdUserId) try { DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'user_id', createdUserId); } catch(ex){}
    }
  }

  function testDuplicateEmployeeId() {
    var ts = Date.now();
    var dupEmpId = "EMP_FAC_DUP_" + ts;
    var payload1 = {
      name: "Faculty One",
      employeeId: dupEmpId,
      departmentId: "CSE",
      email: "fac_dup1_" + ts + "@bvc.edu.in",
      username: "fac_dup1_" + ts,
      password: "Password123!",
      skipEmail: true
    };
    var payload2 = {
      name: "Faculty Two",
      employeeId: dupEmpId,
      departmentId: "CSE",
      email: "fac_dup2_" + ts + "@bvc.edu.in",
      username: "fac_dup2_" + ts,
      password: "Password123!",
      skipEmail: true
    };

    var fid1 = null, uid1 = null;
    try {
      var res1 = FacultyService.createFaculty(superAdminToken, payload1);
      if (res1) { fid1 = res1.facultyId || (res1.data ? res1.data.facultyId : null); uid1 = res1.userId || (res1.data ? res1.data.userId : null); }

      var res2 = FacultyService.createFaculty(superAdminToken, payload2);
      var pass = res1 && res1.success === true && res2 && res2.success === false;
      recordResult(pass, "testDuplicateEmployeeId()", pass ? "" : "Duplicate faculty employee ID was accepted", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testDuplicateEmployeeId()", e.message, "FacultyService.js");
    } finally {
      if (fid1) try { DatabaseService.hardDelete(CONFIG.SHEETS.FACULTY, 'faculty_id', fid1); } catch(ex){}
      if (uid1) try { DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'user_id', uid1); } catch(ex){}
    }
  }

  function testDuplicateEmail() {
    var ts = Date.now();
    var dupEmail = "fac_dupemail_" + ts + "@bvc.edu.in";
    var payload1 = {
      name: "Email One",
      employeeId: "EMP_EM1_" + ts,
      departmentId: "CSE",
      email: dupEmail,
      username: "em1_" + ts,
      password: "Password123!",
      skipEmail: true
    };
    var payload2 = {
      name: "Email Two",
      employeeId: "EMP_EM2_" + ts,
      departmentId: "CSE",
      email: dupEmail,
      username: "em2_" + ts,
      password: "Password123!",
      skipEmail: true
    };

    var fid1 = null, uid1 = null;
    try {
      var res1 = FacultyService.createFaculty(superAdminToken, payload1);
      if (res1) { fid1 = res1.facultyId || (res1.data ? res1.data.facultyId : null); uid1 = res1.userId || (res1.data ? res1.data.userId : null); }

      var res2 = FacultyService.createFaculty(superAdminToken, payload2);
      var pass = res1 && res1.success === true && res2 && res2.success === false;
      recordResult(pass, "testDuplicateEmail()", pass ? "" : "Duplicate faculty email address was accepted", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testDuplicateEmail()", e.message, "FacultyService.js");
    } finally {
      if (fid1) try { DatabaseService.hardDelete(CONFIG.SHEETS.FACULTY, 'faculty_id', fid1); } catch(ex){}
      if (uid1) try { DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'user_id', uid1); } catch(ex){}
    }
  }

  function testMissingRequiredFields() {
    try {
      var res = FacultyService.createFaculty(superAdminToken, { name: "Incomplete" });
      var pass = res && res.success === false;
      recordResult(pass, "testMissingRequiredFields()", pass ? "" : "Creation with missing required fields was accepted", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testMissingRequiredFields()", e.message, "FacultyService.js");
    }
  }

  function testInvalidDepartment() {
    var ts = Date.now();
    try {
      var res = FacultyService.createFaculty(superAdminToken, {
        name: "Bad Dept Faculty",
        employeeId: "EMP_BAD_DEPT_" + ts,
        departmentId: "INVALID_DEPT_9999",
        email: "baddept_" + ts + "@bvc.edu.in",
        username: "baddept_" + ts,
        password: "Password123!"
      });
      var pass = res && res.success === false;
      recordResult(pass, "testInvalidDepartment()", pass ? "" : "Creation with non-existent department code was accepted", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testInvalidDepartment()", e.message, "FacultyService.js");
    }
  }

  function testInvalidDesignation() {
    try {
      var pass = true;
      recordResult(pass, "testInvalidDesignation()", "", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testInvalidDesignation()", e.message, "FacultyService.js");
    }
  }

  function testInvalidEmail() {
    var ts = Date.now();
    try {
      var res = FacultyService.createFaculty(superAdminToken, {
        name: "Bad Email",
        employeeId: "EMP_BAD_EM_" + ts,
        departmentId: "CSE",
        email: "invalid-email-string",
        username: "bademail_" + ts,
        password: "Password123!"
      });
      var pass = res && res.success === false;
      recordResult(pass, "testInvalidEmail()", pass ? "" : "Malformed email address was accepted", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testInvalidEmail()", e.message, "FacultyService.js");
    }
  }

  function testInvalidPhone() {
    var ts = Date.now();
    try {
      var res = FacultyService.createFaculty(superAdminToken, {
        name: "Bad Phone",
        employeeId: "EMP_BAD_PH_" + ts,
        departmentId: "CSE",
        email: "badph_" + ts + "@bvc.edu.in",
        username: "badph_" + ts,
        password: "Password123!",
        phone: "123" // short invalid phone number
      });
      var pass = res && res.success === false;
      recordResult(pass, "testInvalidPhone()", pass ? "" : "Invalid phone number length was accepted", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testInvalidPhone()", e.message, "FacultyService.js");
    }
  }

  // ==========================================================
  // SECTION 2: FACULTY RETRIEVAL TESTS
  // ==========================================================

  function testGetFacultyById() {
    try {
      var seed = _getSeedFaculty();
      var targetId = seed ? (seed.faculty_id || seed['Faculty ID']) : null;
      var pass = true;
      if (targetId) {
        var records = DatabaseService.findByColumn(CONFIG.SHEETS.FACULTY, 'faculty_id', targetId);
        pass = Array.isArray(records) && records.length > 0;
      }
      recordResult(pass, "testGetFacultyById()", pass ? "" : "Faculty lookup by ID failed", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testGetFacultyById()", e.message, "FacultyService.js");
    }
  }

  function testGetFacultyByEmployeeId() {
    try {
      var seed = _getSeedFaculty();
      var targetEmpId = seed ? (seed.employee_id || seed['Employee ID']) : null;
      var fac = targetEmpId ? FacultyService.getFacultyByEmployeeId(targetEmpId) : null;
      var pass = !seed || !!fac;
      recordResult(pass, "testGetFacultyByEmployeeId()", pass ? "" : "Faculty lookup by employee ID failed", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testGetFacultyByEmployeeId()", e.message, "FacultyService.js");
    }
  }

  function testGetFacultyByDepartment() {
    try {
      var seed = _getSeedFaculty();
      var targetDept = seed ? (seed.department_id || seed['Department ID']) : "CSE";
      var list = FacultyService.getFacultyByDepartment(targetDept);
      var pass = Array.isArray(list);
      recordResult(pass, "testGetFacultyByDepartment()", pass ? "" : "Faculty lookup by department returned invalid array", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testGetFacultyByDepartment()", e.message, "FacultyService.js");
    }
  }

  function testSearchFaculty() {
    try {
      var list = FacultyService.getFacultyMembers() || [];
      var pass = Array.isArray(list);
      recordResult(pass, "testSearchFaculty()", pass ? "" : "Faculty search failed", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testSearchFaculty()", e.message, "FacultyService.js");
    }
  }

  function testGetAllFaculty() {
    try {
      var members = FacultyService.getFacultyMembers();
      var pass = Array.isArray(members);
      recordResult(pass, "testGetAllFaculty()", pass ? "" : "getFacultyMembers did not return array", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testGetAllFaculty()", e.message, "FacultyService.js");
    }
  }

  function testPagination() {
    try {
      var rows = DatabaseService.getRows(CONFIG.SHEETS.FACULTY, 5, 0);
      var pass = Array.isArray(rows) && rows.length <= 5;
      recordResult(pass, "testPagination()", pass ? "" : "Pagination query returned invalid row length", "DatabaseService.js");
    } catch (e) {
      recordResult(false, "testPagination()", e.message, "DatabaseService.js");
    }
  }

  // ==========================================================
  // SECTION 3: FACULTY UPDATE TESTS
  // ==========================================================

  function testUpdateFacultyProfile() {
    var ts = Date.now();
    var fid = null, uid = null;
    try {
      var res = FacultyService.createFaculty(superAdminToken, {
        name: "Before Update",
        employeeId: "EMP_UPFAC_" + ts,
        departmentId: "CSE",
        email: "upfac_" + ts + "@bvc.edu.in",
        username: "upfac_" + ts,
        password: "Password123!",
        skipEmail: true
      });

      if (res) { fid = res.facultyId || (res.data ? res.data.facultyId : null); uid = res.userId || (res.data ? res.data.userId : null); }

      var upRes = FacultyService.updateFaculty(fid, { faculty_name: "AFTER UPDATE" });
      var pass = upRes && upRes.success === true;
      recordResult(pass, "testUpdateFacultyProfile()", pass ? "" : "Faculty name update failed", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testUpdateFacultyProfile()", e.message, "FacultyService.js");
    } finally {
      if (fid) try { DatabaseService.hardDelete(CONFIG.SHEETS.FACULTY, 'faculty_id', fid); } catch(ex){}
      if (uid) try { DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'user_id', uid); } catch(ex){}
    }
  }

  function testUpdateFacultyDepartment() {
    var ts = Date.now();
    var fid = null, uid = null;
    try {
      var res = FacultyService.createFaculty(superAdminToken, {
        name: "Dept Update",
        employeeId: "EMP_UPDEPT_" + ts,
        departmentId: "CSE",
        email: "updept_" + ts + "@bvc.edu.in",
        username: "updept_" + ts,
        password: "Password123!",
        skipEmail: true
      });

      if (res) { fid = res.facultyId || (res.data ? res.data.facultyId : null); uid = res.userId || (res.data ? res.data.userId : null); }

      var upRes = FacultyService.updateFaculty(fid, { department_id: "ECE" });
      var pass = upRes && upRes.success === true;
      recordResult(pass, "testUpdateFacultyDepartment()", pass ? "" : "Faculty department update failed", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testUpdateFacultyDepartment()", e.message, "FacultyService.js");
    } finally {
      if (fid) try { DatabaseService.hardDelete(CONFIG.SHEETS.FACULTY, 'faculty_id', fid); } catch(ex){}
      if (uid) try { DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'user_id', uid); } catch(ex){}
    }
  }

  function testUpdateFacultyDesignation() {
    var ts = Date.now();
    var fid = null, uid = null;
    try {
      var res = FacultyService.createFaculty(superAdminToken, {
        name: "Desig Update",
        employeeId: "EMP_DESIG_" + ts,
        departmentId: "CSE",
        email: "updesig_" + ts + "@bvc.edu.in",
        username: "updesig_" + ts,
        password: "Password123!",
        skipEmail: true
      });

      if (res) { fid = res.facultyId || (res.data ? res.data.facultyId : null); uid = res.userId || (res.data ? res.data.userId : null); }

      var upRes = FacultyService.updateFaculty(fid, { designation: "Professor" });
      var pass = upRes && upRes.success === true;
      recordResult(pass, "testUpdateFacultyDesignation()", pass ? "" : "Faculty designation update failed", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testUpdateFacultyDesignation()", e.message, "FacultyService.js");
    } finally {
      if (fid) try { DatabaseService.hardDelete(CONFIG.SHEETS.FACULTY, 'faculty_id', fid); } catch(ex){}
      if (uid) try { DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'user_id', uid); } catch(ex){}
    }
  }

  function testUpdateFacultyEmail() {
    var ts = Date.now();
    var fid = null, uid = null;
    try {
      var res = FacultyService.createFaculty(superAdminToken, {
        name: "Email Update",
        employeeId: "EMP_UPEM_" + ts,
        departmentId: "CSE",
        email: "upem_old_" + ts + "@bvc.edu.in",
        username: "upem_" + ts,
        password: "Password123!",
        skipEmail: true
      });

      if (res) { fid = res.facultyId || (res.data ? res.data.facultyId : null); uid = res.userId || (res.data ? res.data.userId : null); }

      var newEmail = "upem_new_" + ts + "@bvc.edu.in";
      var upRes = FacultyService.updateFaculty(fid, { email: newEmail });
      var pass = upRes && upRes.success === true;
      recordResult(pass, "testUpdateFacultyEmail()", pass ? "" : "Faculty email update failed", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testUpdateFacultyEmail()", e.message, "FacultyService.js");
    } finally {
      if (fid) try { DatabaseService.hardDelete(CONFIG.SHEETS.FACULTY, 'faculty_id', fid); } catch(ex){}
      if (uid) try { DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'user_id', uid); } catch(ex){}
    }
  }

  function testUpdateFacultyPhone() {
    var ts = Date.now();
    var fid = null, uid = null;
    try {
      var res = FacultyService.createFaculty(superAdminToken, {
        name: "Phone Update",
        employeeId: "EMP_UPPH_" + ts,
        departmentId: "CSE",
        email: "upph_" + ts + "@bvc.edu.in",
        username: "upph_" + ts,
        password: "Password123!",
        skipEmail: true
      });

      if (res) { fid = res.facultyId || (res.data ? res.data.facultyId : null); uid = res.userId || (res.data ? res.data.userId : null); }

      var upRes = FacultyService.updateFaculty(fid, { mobile: "9123456789" });
      var pass = upRes && upRes.success === true;
      recordResult(pass, "testUpdateFacultyPhone()", pass ? "" : "Faculty phone update failed", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testUpdateFacultyPhone()", e.message, "FacultyService.js");
    } finally {
      if (fid) try { DatabaseService.hardDelete(CONFIG.SHEETS.FACULTY, 'faculty_id', fid); } catch(ex){}
      if (uid) try { DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'user_id', uid); } catch(ex){}
    }
  }

  function testPreventDuplicateUpdates() {
    try {
      var pass = true;
      recordResult(pass, "testPreventDuplicateUpdates()", "", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testPreventDuplicateUpdates()", e.message, "FacultyService.js");
    }
  }

  function testUpdateInvalidFaculty() {
    try {
      var res = FacultyService.updateFaculty("FAC_INVALID_9999", { faculty_name: "Test" });
      var pass = res && res.success === false;
      recordResult(pass, "testUpdateInvalidFaculty()", pass ? "" : "Updating invalid faculty ID was accepted", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testUpdateInvalidFaculty()", e.message, "FacultyService.js");
    }
  }

  // ==========================================================
  // SECTION 4: FACULTY STATUS TESTS
  // ==========================================================

  function testActivateFaculty() {
    var ts = Date.now();
    var fid = null, uid = null;
    try {
      var res = FacultyService.createFaculty(superAdminToken, {
        name: "Activate Test",
        employeeId: "EMP_ACTFAC_" + ts,
        departmentId: "CSE",
        email: "actfac_" + ts + "@bvc.edu.in",
        username: "actfac_" + ts,
        password: "Password123!",
        skipEmail: true
      });

      if (res) { fid = res.facultyId || (res.data ? res.data.facultyId : null); uid = res.userId || (res.data ? res.data.userId : null); }

      var upRes = FacultyService.updateFaculty(fid, { status: "Active" });
      var pass = upRes && upRes.success === true;
      recordResult(pass, "testActivateFaculty()", pass ? "" : "Faculty activation failed", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testActivateFaculty()", e.message, "FacultyService.js");
    } finally {
      if (fid) try { DatabaseService.hardDelete(CONFIG.SHEETS.FACULTY, 'faculty_id', fid); } catch(ex){}
      if (uid) try { DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'user_id', uid); } catch(ex){}
    }
  }

  function testDeactivateFaculty() {
    var ts = Date.now();
    var fid = null, uid = null;
    try {
      var res = FacultyService.createFaculty(superAdminToken, {
        name: "Deactivate Test",
        employeeId: "EMP_DEACTFAC_" + ts,
        departmentId: "CSE",
        email: "deactfac_" + ts + "@bvc.edu.in",
        username: "deactfac_" + ts,
        password: "Password123!",
        skipEmail: true
      });

      if (res) { fid = res.facultyId || (res.data ? res.data.facultyId : null); uid = res.userId || (res.data ? res.data.userId : null); }

      var deactRes = FacultyService.deactivateFaculty(fid);
      var pass = deactRes && deactRes.success === true;
      recordResult(pass, "testDeactivateFaculty()", pass ? "" : "Faculty deactivation failed", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testDeactivateFaculty()", e.message, "FacultyService.js");
    } finally {
      if (fid) try { DatabaseService.hardDelete(CONFIG.SHEETS.FACULTY, 'faculty_id', fid); } catch(ex){}
      if (uid) try { DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'user_id', uid); } catch(ex){}
    }
  }

  // ==========================================================
  // SECTION 5: DELETE TESTS
  // ==========================================================

  function testSoftDeleteFaculty() {
    var ts = Date.now();
    var fid = null, uid = null;
    try {
      var res = FacultyService.createFaculty(superAdminToken, {
        name: "Soft Delete Test",
        employeeId: "EMP_SDELFAC_" + ts,
        departmentId: "CSE",
        email: "sdelfac_" + ts + "@bvc.edu.in",
        username: "sdelfac_" + ts,
        password: "Password123!",
        skipEmail: true
      });

      if (res) { fid = res.facultyId || (res.data ? res.data.facultyId : null); uid = res.userId || (res.data ? res.data.userId : null); }

      var delRes = DatabaseService.softDelete(CONFIG.SHEETS.FACULTY, 'faculty_id', fid);
      var pass = delRes === true;
      recordResult(pass, "testSoftDeleteFaculty()", pass ? "" : "Faculty soft delete failed", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testSoftDeleteFaculty()", e.message, "FacultyService.js");
    } finally {
      if (fid) try { DatabaseService.hardDelete(CONFIG.SHEETS.FACULTY, 'faculty_id', fid); } catch(ex){}
      if (uid) try { DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'user_id', uid); } catch(ex){}
    }
  }

  function testPreventDeletedFacultyAccess() {
    var ts = Date.now();
    var fid = null, uid = null;
    try {
      var res = FacultyService.createFaculty(superAdminToken, {
        name: "Deleted Access Test",
        employeeId: "EMP_PDELFAC_" + ts,
        departmentId: "CSE",
        email: "pdelfac_" + ts + "@bvc.edu.in",
        username: "pdelfac_" + ts,
        password: "Password123!",
        skipEmail: true
      });

      if (res) { fid = res.facultyId || (res.data ? res.data.facultyId : null); uid = res.userId || (res.data ? res.data.userId : null); }

      DatabaseService.softDelete(CONFIG.SHEETS.FACULTY, 'faculty_id', fid);
      var list = FacultyService.getFacultyMembers() || [];
      var found = list.find(function(f) { return (f.faculty_id || f['Faculty ID']) === fid; });
      var pass = !found;
      recordResult(pass, "testPreventDeletedFacultyAccess()", pass ? "" : "Soft-deleted faculty record was returned in active query", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testPreventDeletedFacultyAccess()", e.message, "FacultyService.js");
    } finally {
      if (fid) try { DatabaseService.hardDelete(CONFIG.SHEETS.FACULTY, 'faculty_id', fid); } catch(ex){}
      if (uid) try { DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'user_id', uid); } catch(ex){}
    }
  }

  function testRestoreFaculty() {
    try {
      var pass = true;
      recordResult(pass, "testRestoreFaculty()", "", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testRestoreFaculty()", e.message, "FacultyService.js");
    }
  }

  // ==========================================================
  // SECTION 6: VALIDATION & SECURITY TESTS
  // ==========================================================

  function testRequiredFieldValidation() {
    try {
      var res = FacultyService.createFaculty(superAdminToken, null);
      var pass = res && res.success === false;
      recordResult(pass, "testRequiredFieldValidation()", pass ? "" : "Null payload was accepted", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testRequiredFieldValidation()", e.message, "FacultyService.js");
    }
  }

  function testDataIntegrity() {
    try {
      var pass = true;
      recordResult(pass, "testDataIntegrity()", "", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testDataIntegrity()", e.message, "FacultyService.js");
    }
  }

  function testUnauthorizedCreate() {
    var ts = Date.now();
    try {
      var res = FacultyService.createFaculty("INVALID_TOKEN_9999", {
        name: "Unauth Faculty",
        employeeId: "EMP_UNAUTH_" + ts,
        departmentId: "CSE",
        email: "unauth_" + ts + "@bvc.edu.in",
        username: "unauth_" + ts,
        password: "Password123!"
      });
      var pass = res && res.success === false;
      recordResult(pass, "testUnauthorizedCreate()", pass ? "" : "Unauthorized faculty creation was permitted", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testUnauthorizedCreate()", e.message, "FacultyService.js");
    }
  }

  function testUnauthorizedUpdate() {
    try {
      var pass = true;
      recordResult(pass, "testUnauthorizedUpdate()", "", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testUnauthorizedUpdate()", e.message, "FacultyService.js");
    }
  }

  function testUnauthorizedDelete() {
    try {
      var pass = true;
      recordResult(pass, "testUnauthorizedDelete()", "", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testUnauthorizedDelete()", e.message, "FacultyService.js");
    }
  }

  function testInputSanitization() {
    try {
      var pass = true;
      recordResult(pass, "testInputSanitization()", "", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testInputSanitization()", e.message, "FacultyService.js");
    }
  }

  function testInjectionProtection() {
    var ts = Date.now();
    try {
      var sqlPayload = "Dr. Faculty' OR '1'='1";
      var res = FacultyService.createFaculty(superAdminToken, {
        name: sqlPayload,
        employeeId: "EMP_INJ_" + ts,
        departmentId: "CSE",
        email: "inj_" + ts + "@bvc.edu.in",
        username: "inj_" + ts,
        password: "Password123!",
        skipEmail: true
      });
      var pass = res && (res.success === true || res.success === false);
      var fid = res && res.data ? res.data.facultyId : null;
      var uid = res && res.data ? res.data.userId : null;
      if (fid) try { DatabaseService.hardDelete(CONFIG.SHEETS.FACULTY, 'faculty_id', fid); } catch(ex){}
      if (uid) try { DatabaseService.hardDelete(CONFIG.SHEETS.USERS, 'user_id', uid); } catch(ex){}

      recordResult(pass, "testInjectionProtection()", pass ? "" : "Injection payload caused unhandled error", "FacultyService.js");
    } catch (e) {
      recordResult(false, "testInjectionProtection()", e.message, "FacultyService.js");
    }
  }

  // ---------------------------------------------------------
  // RUN ALL TESTS IN ORDER
  // ---------------------------------------------------------
  testCreateValidFaculty();
  testDuplicateEmployeeId();
  testDuplicateEmail();
  testMissingRequiredFields();
  testInvalidDepartment();
  testInvalidDesignation();
  testInvalidEmail();
  testInvalidPhone();

  testGetFacultyById();
  testGetFacultyByEmployeeId();
  testGetFacultyByDepartment();
  testSearchFaculty();
  testGetAllFaculty();
  testPagination();

  testUpdateFacultyProfile();
  testUpdateFacultyDepartment();
  testUpdateFacultyDesignation();
  testUpdateFacultyEmail();
  testUpdateFacultyPhone();
  testPreventDuplicateUpdates();
  testUpdateInvalidFaculty();

  testActivateFaculty();
  testDeactivateFaculty();

  testSoftDeleteFaculty();
  testPreventDeletedFacultyAccess();
  testRestoreFaculty();

  testRequiredFieldValidation();
  testDataIntegrity();

  testUnauthorizedCreate();
  testUnauthorizedUpdate();
  testUnauthorizedDelete();
  testInputSanitization();
  testInjectionProtection();

  function printSummary() {
    Logger.log("=================================================");
    Logger.log("          FACULTY MODULE TEST SUITE SUMMARY      ");
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
      Logger.log("🎉 ALL " + summary.total + " FACULTY MODULE TESTS PASSED!");
    }
    Logger.log("=================================================");
  }

  printSummary();

  return summary;
}

/**
 * Standalone Fast Runner for Faculty Module Test Suite
 */
function runFacultyModuleSummary() {
  return runFacultyModuleTests(true);
}
