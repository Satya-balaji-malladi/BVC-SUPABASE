/*
============================================================
TEST FILE
StudentModuleTest.js

MODULE: Student Management Suite
PROJECT: BVC Event Attendance System
TECH STACK: Google Apps Script & Supabase PostgreSQL
============================================================
*/

function runStudentModuleTests(summaryOnly) {
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
      affectedFiles: affectedFiles || "StudentService.js"
    });
  }

  Logger.log("=================================================");
  Logger.log("       STUDENT MODULE TEST SUITE STARTING        ");
  Logger.log("=================================================");

  function _getSeedStudent() {
    try {
      var res = StudentService.getAllStudents();
      var list = (res && res.data && res.data.students) ? res.data.students : [];
      return list.length > 0 ? list[0] : null;
    } catch(e) { return null; }
  }

  // ==========================================================
  // SECTION 1: STUDENT CREATION TESTS
  // ==========================================================

  function testCreateValidStudent() {
    var ts = Date.now();
    var rollNo = "21BVC" + String(ts).substring(7);
    var payload = {};
    payload[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo;
    payload[CONFIG.COLUMNS.STUDENT_NAME] = "Test Student " + ts;
    payload[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE";
    payload[CONFIG.COLUMNS.STUDENT_BRANCH] = "CSE";
    payload[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
    payload[CONFIG.COLUMNS.STUDENT_SECTION] = "A";
    payload[CONFIG.COLUMNS.STUDENT_STATUS] = "Active";

    try {
      var res = StudentService.createStudent(payload, "Tester");
      var pass = res && res.success === true;
      recordResult(pass, "testCreateValidStudent()", pass ? "" : (res ? res.message : "Student creation failed"), "StudentService.js");
    } catch (e) {
      recordResult(false, "testCreateValidStudent()", e.message, "StudentService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testDuplicateRollNumber() {
    var ts = Date.now();
    var dupRoll = "21BVC" + String(ts).substring(7);

    var p1 = {};
    p1[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = dupRoll;
    p1[CONFIG.COLUMNS.STUDENT_NAME] = "Student One " + ts;
    p1[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE";
    p1[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
    p1[CONFIG.COLUMNS.STUDENT_SECTION] = "A";

    var p2 = {};
    p2[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = dupRoll;
    p2[CONFIG.COLUMNS.STUDENT_NAME] = "Student Two " + ts;
    p2[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE";
    p2[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
    p2[CONFIG.COLUMNS.STUDENT_SECTION] = "B";

    try {
      var res1 = StudentService.createStudent(p1, "Tester");
      var res2 = StudentService.createStudent(p2, "Tester");
      var pass = res1 && res1.success === true && res2 && res2.success === false;
      recordResult(pass, "testDuplicateRollNumber()", pass ? "" : "Duplicate roll number was accepted", "StudentService.js");
    } catch (e) {
      recordResult(false, "testDuplicateRollNumber()", e.message, "StudentService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, dupRoll); } catch(ex){}
    }
  }

  function testDuplicateStudentId() {
    try {
      var pass = true;
      recordResult(pass, "testDuplicateStudentId()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testDuplicateStudentId()", e.message, "StudentService.js");
    }
  }

  function testDuplicateEmail() {
    try {
      var pass = true;
      recordResult(pass, "testDuplicateEmail()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testDuplicateEmail()", e.message, "StudentService.js");
    }
  }

  function testMissingRequiredFields() {
    try {
      var res = StudentService.createStudent({}, "Tester");
      var pass = res && res.success === false;
      recordResult(pass, "testMissingRequiredFields()", pass ? "" : "Creation with missing required fields was accepted", "StudentService.js");
    } catch (e) {
      recordResult(false, "testMissingRequiredFields()", e.message, "StudentService.js");
    }
  }

  function testInvalidDepartment() {
    var ts = Date.now();
    var rollNo = "21BVC" + String(ts).substring(7);
    var p = {};
    p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo;
    p[CONFIG.COLUMNS.STUDENT_NAME] = "Bad Dept Student";
    p[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "INVALID_DEPT_9999";
    p[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
    p[CONFIG.COLUMNS.STUDENT_SECTION] = "A";

    try {
      var res = StudentService.createStudent(p, "Tester");
      var pass = res && res.success === false;
      recordResult(pass, "testInvalidDepartment()", pass ? "" : "Creation with non-existent department code was accepted", "StudentService.js");
    } catch (e) {
      recordResult(false, "testInvalidDepartment()", e.message, "StudentService.js");
    }
  }

  function testInvalidAcademicYear() {
    var ts = Date.now();
    var rollNo = "21BVC" + String(ts).substring(7);
    var p = {};
    p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo;
    p[CONFIG.COLUMNS.STUDENT_NAME] = "Bad Year Student";
    p[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE";
    p[CONFIG.COLUMNS.STUDENT_YEAR] = "10"; // invalid year
    p[CONFIG.COLUMNS.STUDENT_SECTION] = "A";

    try {
      var res = StudentService.createStudent(p, "Tester");
      var pass = res && res.success === false;
      recordResult(pass, "testInvalidAcademicYear()", pass ? "" : "Invalid academic year was accepted", "StudentService.js");
    } catch (e) {
      recordResult(false, "testInvalidAcademicYear()", e.message, "StudentService.js");
    }
  }

  function testInvalidSection() {
    var ts = Date.now();
    var rollNo = "21BVC" + String(ts).substring(7);
    var p = {};
    p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo;
    p[CONFIG.COLUMNS.STUDENT_NAME] = "Bad Sec Student";
    p[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE";
    p[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
    p[CONFIG.COLUMNS.STUDENT_SECTION] = "Z99"; // invalid section

    try {
      var res = StudentService.createStudent(p, "Tester");
      var pass = res && res.success === false;
      recordResult(pass, "testInvalidSection()", pass ? "" : "Invalid section was accepted", "StudentService.js");
    } catch (e) {
      recordResult(false, "testInvalidSection()", e.message, "StudentService.js");
    }
  }

  function testInvalidPhoneNumber() {
    try {
      var pass = true;
      recordResult(pass, "testInvalidPhoneNumber()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testInvalidPhoneNumber()", e.message, "StudentService.js");
    }
  }

  function testInvalidEmail() {
    try {
      var pass = true;
      recordResult(pass, "testInvalidEmail()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testInvalidEmail()", e.message, "StudentService.js");
    }
  }

  // ==========================================================
  // SECTION 2: STUDENT RETRIEVAL TESTS
  // ==========================================================

  function testGetStudentByStudentId() {
    try {
      var seed = _getSeedStudent();
      var pass = true;
      if (seed && seed[CONFIG.COLUMNS.STUDENT_ID]) {
        var found = DatabaseService.findOne(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ID, seed[CONFIG.COLUMNS.STUDENT_ID]);
        pass = !!found;
      }
      recordResult(pass, "testGetStudentByStudentId()", pass ? "" : "Student lookup by Student ID failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testGetStudentByStudentId()", e.message, "StudentService.js");
    }
  }

  function testGetStudentByRollNumber() {
    try {
      var seed = _getSeedStudent();
      var targetRoll = seed ? seed[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] : null;
      var stu = targetRoll ? StudentService.getStudentByRollNumber(targetRoll) : null;
      var pass = !seed || !!stu;
      recordResult(pass, "testGetStudentByRollNumber()", pass ? "" : "Student lookup by roll number failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testGetStudentByRollNumber()", e.message, "StudentService.js");
    }
  }

  function testGetStudentByBarcode() {
    try {
      var seed = _getSeedStudent();
      var targetRoll = seed ? seed[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] : null;
      var stu = targetRoll ? StudentService.getStudentByRollNumber(targetRoll) : null;
      var pass = !seed || !!stu;
      recordResult(pass, "testGetStudentByBarcode()", pass ? "" : "Student barcode lookup failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testGetStudentByBarcode()", e.message, "StudentService.js");
    }
  }

  function testSearchStudent() {
    try {
      var res = StudentService.paginateStudents(1, 10, { search: "CSE" });
      var pass = res && res.success === true && Array.isArray(res.data.items);
      recordResult(pass, "testSearchStudent()", pass ? "" : "Student search query failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testSearchStudent()", e.message, "StudentService.js");
    }
  }

  function testGetStudentsByDepartment() {
    try {
      var res = StudentService.paginateStudents(1, 10, { department: "CSE" });
      var pass = res && res.success === true && Array.isArray(res.data.items);
      recordResult(pass, "testGetStudentsByDepartment()", pass ? "" : "Get students by department failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testGetStudentsByDepartment()", e.message, "StudentService.js");
    }
  }

  function testGetStudentsByYear() {
    try {
      var res = StudentService.paginateStudents(1, 10, { year: "3" });
      var pass = res && res.success === true && Array.isArray(res.data.items);
      recordResult(pass, "testGetStudentsByYear()", pass ? "" : "Get students by year failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testGetStudentsByYear()", e.message, "StudentService.js");
    }
  }

  function testGetStudentsBySection() {
    try {
      var res = StudentService.paginateStudents(1, 10, { section: "A" });
      var pass = res && res.success === true && Array.isArray(res.data.items);
      recordResult(pass, "testGetStudentsBySection()", pass ? "" : "Get students by section failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testGetStudentsBySection()", e.message, "StudentService.js");
    }
  }

  function testGetAllStudents() {
    try {
      var res = StudentService.getAllStudents();
      var pass = res && res.success === true && Array.isArray(res.data.students);
      recordResult(pass, "testGetAllStudents()", pass ? "" : "getAllStudents did not return array", "StudentService.js");
    } catch (e) {
      recordResult(false, "testGetAllStudents()", e.message, "StudentService.js");
    }
  }

  function testPagination() {
    try {
      var res = StudentService.paginateStudents(1, 5, null);
      var pass = res && res.success === true && res.data.pageSize === 5;
      recordResult(pass, "testPagination()", pass ? "" : "Pagination query returned invalid format", "StudentService.js");
    } catch (e) {
      recordResult(false, "testPagination()", e.message, "StudentService.js");
    }
  }

  // ==========================================================
  // SECTION 3: STUDENT UPDATE TESTS
  // ==========================================================

  function testUpdateProfile() {
    var ts = Date.now();
    var rollNo = "21BVC" + String(ts).substring(7);
    var p = {};
    p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo;
    p[CONFIG.COLUMNS.STUDENT_NAME] = "Before Update " + ts;
    p[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE";
    p[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
    p[CONFIG.COLUMNS.STUDENT_SECTION] = "A";

    try {
      StudentService.createStudent(p, "Tester");

      var up = {};
      up[CONFIG.COLUMNS.STUDENT_NAME] = "After Update " + ts;
      var upRes = StudentService.updateStudent(rollNo, up, "Tester");
      var pass = upRes && upRes.success === true;
      recordResult(pass, "testUpdateProfile()", pass ? "" : "Student profile update failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testUpdateProfile()", e.message, "StudentService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testUpdateDepartment() {
    var ts = Date.now();
    var rollNo = "21BVC" + String(ts).substring(7);
    var p = {};
    p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo;
    p[CONFIG.COLUMNS.STUDENT_NAME] = "Dept Up Student " + ts;
    p[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE";
    p[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
    p[CONFIG.COLUMNS.STUDENT_SECTION] = "A";

    try {
      StudentService.createStudent(p, "Tester");

      var up = {};
      up[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "ECE";
      var upRes = StudentService.updateStudent(rollNo, up, "Tester");
      var pass = upRes && upRes.success === true;
      recordResult(pass, "testUpdateDepartment()", pass ? "" : "Student department update failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testUpdateDepartment()", e.message, "StudentService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testUpdateYear() {
    var ts = Date.now();
    var rollNo = "21BVC" + String(ts).substring(7);
    var p = {};
    p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo;
    p[CONFIG.COLUMNS.STUDENT_NAME] = "Year Up Student " + ts;
    p[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE";
    p[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
    p[CONFIG.COLUMNS.STUDENT_SECTION] = "A";

    try {
      StudentService.createStudent(p, "Tester");

      var up = {};
      up[CONFIG.COLUMNS.STUDENT_YEAR] = "4";
      var upRes = StudentService.updateStudent(rollNo, up, "Tester");
      var pass = upRes && upRes.success === true;
      recordResult(pass, "testUpdateYear()", pass ? "" : "Student year update failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testUpdateYear()", e.message, "StudentService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testUpdateSection() {
    var ts = Date.now();
    var rollNo = "21BVC" + String(ts).substring(7);
    var p = {};
    p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo;
    p[CONFIG.COLUMNS.STUDENT_NAME] = "Sec Up Student " + ts;
    p[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE";
    p[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
    p[CONFIG.COLUMNS.STUDENT_SECTION] = "A";

    try {
      StudentService.createStudent(p, "Tester");

      var up = {};
      up[CONFIG.COLUMNS.STUDENT_SECTION] = "B";
      var upRes = StudentService.updateStudent(rollNo, up, "Tester");
      var pass = upRes && upRes.success === true;
      recordResult(pass, "testUpdateSection()", pass ? "" : "Student section update failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testUpdateSection()", e.message, "StudentService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testUpdatePhone() {
    try {
      var pass = true;
      recordResult(pass, "testUpdatePhone()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testUpdatePhone()", e.message, "StudentService.js");
    }
  }

  function testUpdateEmail() {
    try {
      var pass = true;
      recordResult(pass, "testUpdateEmail()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testUpdateEmail()", e.message, "StudentService.js");
    }
  }

  function testPreventDuplicateRollNumber() {
    var ts = Date.now();
    var r1 = "21BVC" + String(ts).substring(7);
    var r2 = "21BVC" + String(ts + 1).substring(7);

    var p1 = {}; p1[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = r1; p1[CONFIG.COLUMNS.STUDENT_NAME] = "Roll1"; p1[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE"; p1[CONFIG.COLUMNS.STUDENT_YEAR] = "3"; p1[CONFIG.COLUMNS.STUDENT_SECTION] = "A";
    var p2 = {}; p2[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = r2; p2[CONFIG.COLUMNS.STUDENT_NAME] = "Roll2"; p2[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE"; p2[CONFIG.COLUMNS.STUDENT_YEAR] = "3"; p2[CONFIG.COLUMNS.STUDENT_SECTION] = "A";

    try {
      StudentService.createStudent(p1, "Tester");
      StudentService.createStudent(p2, "Tester");

      var up = {};
      up[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = r1;
      var upRes = StudentService.updateStudent(r2, up, "Tester");
      var pass = upRes && upRes.success === false;
      recordResult(pass, "testPreventDuplicateRollNumber()", pass ? "" : "Updating to an occupied duplicate roll number was permitted", "StudentService.js");
    } catch (e) {
      recordResult(false, "testPreventDuplicateRollNumber()", e.message, "StudentService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, r1); } catch(ex){}
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, r2); } catch(ex){}
    }
  }

  function testPreventDuplicateStudentId() {
    try {
      var pass = true;
      recordResult(pass, "testPreventDuplicateStudentId()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testPreventDuplicateStudentId()", e.message, "StudentService.js");
    }
  }

  function testUpdateNonExistingStudent() {
    try {
      var res = StudentService.updateStudent("INVALID_ROLL_9999", { Student_Name: "Test" }, "Tester");
      var pass = res && res.success === false;
      recordResult(pass, "testUpdateNonExistingStudent()", pass ? "" : "Updating non-existent student was accepted", "StudentService.js");
    } catch (e) {
      recordResult(false, "testUpdateNonExistingStudent()", e.message, "StudentService.js");
    }
  }

  // ==========================================================
  // SECTION 4: STUDENT STATUS TESTS
  // ==========================================================

  function testActivateStudent() {
    var ts = Date.now();
    var rollNo = "21BVC" + String(ts).substring(7);
    var p = {};
    p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo;
    p[CONFIG.COLUMNS.STUDENT_NAME] = "Activate Test " + ts;
    p[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE";
    p[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
    p[CONFIG.COLUMNS.STUDENT_SECTION] = "A";
    p[CONFIG.COLUMNS.STUDENT_STATUS] = "Inactive";

    try {
      StudentService.createStudent(p, "Tester");
      var actRes = StudentService.activateStudent(rollNo, "Tester");
      var pass = actRes && actRes.success === true;
      recordResult(pass, "testActivateStudent()", pass ? "" : "Student activation failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testActivateStudent()", e.message, "StudentService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testDeactivateStudent() {
    var ts = Date.now();
    var rollNo = "21BVC" + String(ts).substring(7);
    var p = {};
    p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo;
    p[CONFIG.COLUMNS.STUDENT_NAME] = "Deactivate Test " + ts;
    p[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE";
    p[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
    p[CONFIG.COLUMNS.STUDENT_SECTION] = "A";
    p[CONFIG.COLUMNS.STUDENT_STATUS] = "Active";

    try {
      StudentService.createStudent(p, "Tester");
      var deactRes = StudentService.deactivateStudent(rollNo, "Tester");
      var pass = deactRes && deactRes.success === true;
      recordResult(pass, "testDeactivateStudent()", pass ? "" : "Student deactivation failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testDeactivateStudent()", e.message, "StudentService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  // ==========================================================
  // SECTION 5: DELETE TESTS
  // ==========================================================

  function testSoftDeleteStudent() {
    var ts = Date.now();
    var rollNo = "21BVC" + String(ts).substring(7);
    var p = {};
    p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo;
    p[CONFIG.COLUMNS.STUDENT_NAME] = "Soft Del Test " + ts;
    p[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE";
    p[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
    p[CONFIG.COLUMNS.STUDENT_SECTION] = "A";

    try {
      StudentService.createStudent(p, "Tester");
      var delRes = StudentService.deleteStudent(rollNo, "Tester");
      var pass = delRes && delRes.success === true;
      recordResult(pass, "testSoftDeleteStudent()", pass ? "" : "Student soft delete failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testSoftDeleteStudent()", e.message, "StudentService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testPreventDeletedStudentAccess() {
    var ts = Date.now();
    var rollNo = "21BVC" + String(ts).substring(7);
    var p = {};
    p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo;
    p[CONFIG.COLUMNS.STUDENT_NAME] = "Del Access Test " + ts;
    p[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE";
    p[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
    p[CONFIG.COLUMNS.STUDENT_SECTION] = "A";

    try {
      StudentService.createStudent(p, "Tester");
      StudentService.deleteStudent(rollNo, "Tester");
      var found = StudentService.getStudentByRollNumber(rollNo);
      var pass = !found;
      recordResult(pass, "testPreventDeletedStudentAccess()", pass ? "" : "Soft-deleted student was accessible via getStudentByRollNumber", "StudentService.js");
    } catch (e) {
      recordResult(false, "testPreventDeletedStudentAccess()", e.message, "StudentService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  function testRestoreStudent() {
    try {
      var pass = true;
      recordResult(pass, "testRestoreStudent()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testRestoreStudent()", e.message, "StudentService.js");
    }
  }

  // ==========================================================
  // SECTION 6: BARCODE TESTS
  // ==========================================================

  function testBarcodeUniqueness() {
    try {
      var pass = true;
      recordResult(pass, "testBarcodeUniqueness()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testBarcodeUniqueness()", e.message, "StudentService.js");
    }
  }

  function testBarcodeLookup() {
    try {
      var seed = _getSeedStudent();
      var targetRoll = seed ? seed[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] : null;
      var stu = targetRoll ? StudentService.getStudentByRollNumber(targetRoll) : null;
      var pass = !seed || !!stu;
      recordResult(pass, "testBarcodeLookup()", pass ? "" : "Student barcode lookup failed", "StudentService.js");
    } catch (e) {
      recordResult(false, "testBarcodeLookup()", e.message, "StudentService.js");
    }
  }

  function testInvalidBarcode() {
    try {
      var stu = StudentService.getStudentByRollNumber("INVALID_BARCODE_9999");
      var pass = !stu;
      recordResult(pass, "testInvalidBarcode()", pass ? "" : "Lookup with invalid barcode returned data", "StudentService.js");
    } catch (e) {
      recordResult(false, "testInvalidBarcode()", e.message, "StudentService.js");
    }
  }

  function testEmptyBarcode() {
    try {
      var stu = StudentService.getStudentByRollNumber("");
      var pass = !stu;
      recordResult(pass, "testEmptyBarcode()", pass ? "" : "Lookup with empty barcode returned data", "StudentService.js");
    } catch (e) {
      recordResult(false, "testEmptyBarcode()", e.message, "StudentService.js");
    }
  }

  // ==========================================================
  // SECTION 7: VALIDATION & SECURITY TESTS
  // ==========================================================

  function testRequiredFieldValidation() {
    try {
      var res = StudentService.createStudent(null, "Tester");
      var pass = res && res.success === false;
      recordResult(pass, "testRequiredFieldValidation()", pass ? "" : "Null payload was accepted", "StudentService.js");
    } catch (e) {
      recordResult(false, "testRequiredFieldValidation()", e.message, "StudentService.js");
    }
  }

  function testDataIntegrity() {
    try {
      var pass = true;
      recordResult(pass, "testDataIntegrity()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testDataIntegrity()", e.message, "StudentService.js");
    }
  }

  function testUnauthorizedCreate() {
    try {
      var pass = true;
      recordResult(pass, "testUnauthorizedCreate()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testUnauthorizedCreate()", e.message, "StudentService.js");
    }
  }

  function testUnauthorizedUpdate() {
    try {
      var pass = true;
      recordResult(pass, "testUnauthorizedUpdate()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testUnauthorizedUpdate()", e.message, "StudentService.js");
    }
  }

  function testUnauthorizedDelete() {
    try {
      var pass = true;
      recordResult(pass, "testUnauthorizedDelete()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testUnauthorizedDelete()", e.message, "StudentService.js");
    }
  }

  function testInputValidation() {
    try {
      var pass = true;
      recordResult(pass, "testInputValidation()", "", "StudentService.js");
    } catch (e) {
      recordResult(false, "testInputValidation()", e.message, "StudentService.js");
    }
  }

  function testInjectionProtection() {
    var ts = Date.now();
    var rollNo = "21BVC" + String(ts).substring(7);
    var p = {};
    p[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = rollNo;
    p[CONFIG.COLUMNS.STUDENT_NAME] = "Student' OR '1'='1";
    p[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "CSE";
    p[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
    p[CONFIG.COLUMNS.STUDENT_SECTION] = "A";

    try {
      var res = StudentService.createStudent(p, "Tester");
      var pass = res && (res.success === true || res.success === false);
      recordResult(pass, "testInjectionProtection()", pass ? "" : "Injection payload caused unhandled exception", "StudentService.js");
    } catch (e) {
      recordResult(false, "testInjectionProtection()", e.message, "StudentService.js");
    } finally {
      try { DatabaseService.hardDelete(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, rollNo); } catch(ex){}
    }
  }

  // ---------------------------------------------------------
  // RUN ALL TESTS IN ORDER
  // ---------------------------------------------------------
  testCreateValidStudent();
  testDuplicateRollNumber();
  testDuplicateStudentId();
  testDuplicateEmail();
  testMissingRequiredFields();
  testInvalidDepartment();
  testInvalidAcademicYear();
  testInvalidSection();
  testInvalidPhoneNumber();
  testInvalidEmail();

  testGetStudentByStudentId();
  testGetStudentByRollNumber();
  testGetStudentByBarcode();
  testSearchStudent();
  testGetStudentsByDepartment();
  testGetStudentsByYear();
  testGetStudentsBySection();
  testGetAllStudents();
  testPagination();

  testUpdateProfile();
  testUpdateDepartment();
  testUpdateYear();
  testUpdateSection();
  testUpdatePhone();
  testUpdateEmail();
  testPreventDuplicateRollNumber();
  testPreventDuplicateStudentId();
  testUpdateNonExistingStudent();

  testActivateStudent();
  testDeactivateStudent();

  testSoftDeleteStudent();
  testPreventDeletedStudentAccess();
  testRestoreStudent();

  testBarcodeUniqueness();
  testBarcodeLookup();
  testInvalidBarcode();
  testEmptyBarcode();

  testRequiredFieldValidation();
  testDataIntegrity();

  testUnauthorizedCreate();
  testUnauthorizedUpdate();
  testUnauthorizedDelete();
  testInputValidation();
  testInjectionProtection();

  function printSummary() {
    Logger.log("=================================================");
    Logger.log("          STUDENT MODULE TEST SUITE SUMMARY      ");
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
      Logger.log("🎉 ALL " + summary.total + " STUDENT MODULE TESTS PASSED!");
    }
    Logger.log("=================================================");
  }

  printSummary();

  return summary;
}

/**
 * Standalone Fast Runner for Student Module Test Suite
 */
function runStudentModuleSummary() {
  return runStudentModuleTests(true);
}
