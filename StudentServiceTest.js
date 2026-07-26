function testCreateStudent() {

  Logger.log("==================================");
  Logger.log("TEST 1 : CREATE STUDENT");
  Logger.log("==================================");

  var student = {};

  student[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = "23A91A0501";
  student[CONFIG.COLUMNS.STUDENT_NAME] = "Balaji";
  student[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "DEP-001"; // Existing Active Department
  student[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
  student[CONFIG.COLUMNS.STUDENT_SECTION] = "A";
  student[CONFIG.COLUMNS.STUDENT_STATUS] = CONFIG.STUDENT_STATUS.ACTIVE;

  Logger.log("===== STUDENT OBJECT BEFORE CREATE =====");
  Logger.log(JSON.stringify(student, null, 2));

  var result = StudentService.createStudent(student, "System");

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);

    if (result.student) {
      Logger.log(JSON.stringify(result.student));
    } else if (result.data && result.data.student) {
      Logger.log(JSON.stringify(result.data.student));
    }

  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 2 : DUPLICATE ROLL NUMBER");
  Logger.log("==================================");

  result = StudentService.createStudent(student, "System");

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 3 : INVALID DEPARTMENT");
  Logger.log("==================================");

  var invalidStudent = {};

  invalidStudent[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = "23A91A0599";
  invalidStudent[CONFIG.COLUMNS.STUDENT_NAME] = "Test Student";
  invalidStudent[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "DEP999";
  invalidStudent[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
  invalidStudent[CONFIG.COLUMNS.STUDENT_SECTION] = "A";
  invalidStudent[CONFIG.COLUMNS.STUDENT_STATUS] = CONFIG.STUDENT_STATUS.ACTIVE;

  result = StudentService.createStudent(invalidStudent, "System");

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 4 : EMPTY STUDENT");
  Logger.log("==================================");

  result = StudentService.createStudent({}, "System");

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 5 : VERIFY STUDENT");
  Logger.log("==================================");

  var record = DatabaseService.findOne(
    CONFIG.SHEETS.STUDENTS,
    CONFIG.COLUMNS.STUDENT_ROLL_NUMBER,
    "23A91A0501"
  );

  if (record) {
    Logger.log("✅ PASS");
    Logger.log(JSON.stringify(record));
  } else {
    Logger.log("❌ FAIL");
    Logger.log("Student not found.");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 6 : BYPASS FOR SPOT DEPARTMENTS");
  Logger.log("==================================");

  var spotStudent = {};
  spotStudent[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = "23A91A0598";
  spotStudent[CONFIG.COLUMNS.STUDENT_NAME] = "Spot Student";
  spotStudent[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "Spot Group";
  spotStudent[CONFIG.COLUMNS.STUDENT_YEAR] = "1";
  spotStudent[CONFIG.COLUMNS.STUDENT_SECTION] = "A";
  spotStudent[CONFIG.COLUMNS.STUDENT_STATUS] = CONFIG.STUDENT_STATUS.ACTIVE;

  var spotResult = StudentService.createStudent(spotStudent, "System");
  if (spotResult.success) {
    Logger.log("✅ PASS (Spot department bypassed validation successfully)");
  } else {
    Logger.log("❌ FAIL (Spot department validation failed: " + spotResult.message + ")");
  }

  // Clean up
  if (spotResult.success) {
    DatabaseService.deleteRow(StudentService._studentsSheet ? StudentService._studentsSheet() : CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.STUDENT_ROLL_NUMBER, "23A91A0598");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("CREATE STUDENT TEST COMPLETED");
  Logger.log("==================================");
}
function debugStudentColumns() {

  Logger.log("===== STUDENT CONFIG =====");

  Logger.log("STUDENT_ID      : " + CONFIG.COLUMNS.STUDENT_ID);
  Logger.log("ROLL_NUMBER     : " + CONFIG.COLUMNS.ROLL_NUMBER);
  Logger.log("STUDENT_NAME    : " + CONFIG.COLUMNS.STUDENT_NAME);
  Logger.log("DEPARTMENT      : " + CONFIG.COLUMNS.DEPARTMENT);
  Logger.log("YEAR            : " + CONFIG.COLUMNS.YEAR);
  Logger.log("SECTION         : " + CONFIG.COLUMNS.SECTION);
  Logger.log("STATUS          : " + CONFIG.COLUMNS.STATUS);

}
function debugStudentHeaders() {

  var sheet = SpreadsheetApp
      .openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.STUDENTS);

  Logger.log(sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0]);

}
function debugStudentConfig() {

  Logger.log("===== STUDENT CONFIG =====");

  Logger.log("STUDENT_ID            : " + CONFIG.COLUMNS.STUDENT_ID);
  Logger.log("STUDENT_ROLL_NUMBER   : " + CONFIG.COLUMNS.STUDENT_ROLL_NUMBER);
  Logger.log("STUDENT_NAME          : " + CONFIG.COLUMNS.STUDENT_NAME);
  Logger.log("STUDENT_DEPARTMENT_ID : " + CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID);
  Logger.log("STUDENT_YEAR          : " + CONFIG.COLUMNS.STUDENT_YEAR);
  Logger.log("STUDENT_SECTION       : " + CONFIG.COLUMNS.STUDENT_SECTION);
  Logger.log("STUDENT_STATUS        : " + CONFIG.COLUMNS.STUDENT_STATUS);

}
function debugRollNumberValidation() {

  Logger.log(_validateRollNumber("23A91A0501"));
  Logger.log(_validateRollNumber("21A91A0502"));
  Logger.log(_validateRollNumber("22MH1A1234"));

}
function debugRollRegex() {

  Logger.log("===== ROLL NUMBER REGEX =====");

  Logger.log(CONFIG.VALIDATION.ROLL_NUMBER);

  Logger.log(
    CONFIG.VALIDATION.ROLL_NUMBER.test("23A91A0501")
  );

}
function testRollRegex() {

  var tests = [
    "23A91A05C1",
    "22A95A1234",
    "21A91A0507",
    "24A91A0101",
    "23A91A501",
    "ABC123",
    "1234567890"
  ];

  tests.forEach(function(roll) {
    Logger.log(
      roll + " => " + CONFIG.VALIDATION.ROLL_NUMBER.test(roll)
    );
  });

}
function debugDepartmentLookup() {

  var result = DepartmentService.getDepartmentById("DEP-001");

  Logger.log("===== RESULT =====");
  Logger.log(JSON.stringify(result, null, 2));

}
function debugStudentColumns() {

  Logger.log("Student ID Column      : " + CONFIG.COLUMNS.STUDENT_ID);

  Logger.log("Roll Number Column     : " + CONFIG.COLUMNS.STUDENT_ROLL_NUMBER);

}
function debugIdColumns() {

  Logger.log("===== ID COLUMNS =====");

  Logger.log("STUDENTS : " + CONFIG.ID_COLUMNS.STUDENTS);

}
function testStudentService() {

  Logger.log("========================================");
  Logger.log("STUDENT SERVICE INTEGRATION TEST");
  Logger.log("========================================");

  var rollNo = "23A91A0501";
  var studentId = null;
  var result;
  var student;

  // =====================================================
  // TEST 1 : GET STUDENT
  // =====================================================

  Logger.log("");
  Logger.log("TEST 1 : GET STUDENT");

  student = StudentService.getStudentByRollNumber(rollNo);

  if (student) {
    Logger.log("✅ PASS");
    Logger.log(JSON.stringify(student));
    studentId = student[CONFIG.COLUMNS.STUDENT_ID];
  } else {
    Logger.log("❌ FAIL");
  }

  // =====================================================
  // TEST 2 : UPDATE STUDENT
  // =====================================================

  Logger.log("");
  Logger.log("TEST 2 : UPDATE STUDENT");

  result = StudentService.updateStudent(
      rollNo,
      {
        [CONFIG.COLUMNS.STUDENT_YEAR]: "4",
        [CONFIG.COLUMNS.STUDENT_SECTION]: "B"
      },
      "System"
  );

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }

  // =====================================================
  // TEST 3 : ACTIVATE STUDENT
  // =====================================================

  Logger.log("");
  Logger.log("TEST 3 : ACTIVATE STUDENT");

  result = StudentService.activateStudent(
      rollNo,
      "System"
  );

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }

  // =====================================================
  // TEST 4 : DEACTIVATE STUDENT
  // =====================================================

  Logger.log("");
  Logger.log("TEST 4 : DEACTIVATE STUDENT");

  result = StudentService.deactivateStudent(
      rollNo,
      "System"
  );

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }

  // =====================================================
  // TEST 5 : GET BY ID
  // =====================================================

  Logger.log("");
  Logger.log("TEST 5 : GET BY ID");

  if (studentId) {

    student = StudentService.getStudentById(studentId);

    if (student) {
      Logger.log("✅ PASS");
      Logger.log(JSON.stringify(student));
    } else {
      Logger.log("❌ FAIL");
    }

  } else {

    Logger.log("⚠ Student ID unavailable");

  }

  // =====================================================
  // TEST 6 : GET ALL
  // =====================================================

  Logger.log("");
  Logger.log("TEST 6 : GET ALL STUDENTS");

  var students = StudentService.getAllStudents();

  if (students && students.length >= 1) {

    Logger.log("✅ PASS");
    Logger.log("Total : " + students.length);

  } else {

    Logger.log("❌ FAIL");

  }

  // =====================================================
  // TEST 7 : PAGINATION
  // =====================================================

  Logger.log("");
  Logger.log("TEST 7 : PAGINATION");

  var page = StudentService.paginateStudents(
      1,
      5
  );

  if (page.items) {

    Logger.log("✅ PASS");
    Logger.log("Total Records : " + page.totalRecords);
    Logger.log("Total Pages   : " + page.totalPages);

  } else {

    Logger.log("❌ FAIL");

  }

  // =====================================================
  // TEST 8 : SORT
  // =====================================================

  Logger.log("");
  Logger.log("TEST 8 : SORT");

  students = StudentService.sortStudents(
      CONFIG.COLUMNS.STUDENT_NAME,
      "asc"
  );

  if (students.length) {

    Logger.log("✅ PASS");

  } else {

    Logger.log("❌ FAIL");

  }

  // =====================================================
  // TEST 9 : DELETE
  // =====================================================

  Logger.log("");
  Logger.log("TEST 9 : DELETE");

  result = StudentService.deleteStudent(
      rollNo,
      "System"
  );

  if (result.success) {

    Logger.log("✅ PASS");
    Logger.log(result.message);

  } else {

    Logger.log("❌ FAIL");
    Logger.log(result.message);

  }

  Logger.log("");
  Logger.log("========================================");
  Logger.log("ALL TESTS COMPLETED");
  Logger.log("========================================");

}
function debugStudentSheet() {

  var students = StudentService.getAllStudents();

  Logger.log(JSON.stringify(students, null, 2));

}
function debugStudentRow() {

  var row = DatabaseService.findOne(
      CONFIG.SHEETS.STUDENTS,
      CONFIG.COLUMNS.STUDENT_ROLL_NUMBER,
      "23A91A0501"
  );

  Logger.log(JSON.stringify(row, null, 2));

}
function debugStudentHeadersExact() {

  var headers = DatabaseService.getHeaderRow(CONFIG.SHEETS.STUDENTS);

  Logger.log("===== HEADERS =====");

  headers.forEach(function(h, i) {
    Logger.log((i + 1) + " -> [" + h + "] Length = " + h.length);
  });

  Logger.log("CONFIG HEADER = [" + CONFIG.COLUMNS.STUDENT_NAME + "]");
  Logger.log("CONFIG LENGTH = " + CONFIG.COLUMNS.STUDENT_NAME.length);

}
function debugCreateStudent() {

  var student = {};

  student[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = "23A91A9999";
  student[CONFIG.COLUMNS.STUDENT_NAME] = "Balaji";
  student[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = "DEP-001";
  student[CONFIG.COLUMNS.STUDENT_YEAR] = "3";
  student[CONFIG.COLUMNS.STUDENT_SECTION] = "A";
  student[CONFIG.COLUMNS.STUDENT_STATUS] = CONFIG.STUDENT_STATUS.ACTIVE;

  Logger.log("===== INPUT OBJECT =====");
  Logger.log(JSON.stringify(student, null, 2));

  var result = StudentService.createStudent(student, "System");

  Logger.log("===== RESULT =====");
  Logger.log(JSON.stringify(result, null, 2));

}

function runStudentServiceUnitTests() {
  Logger.log('--- Running StudentServiceUnitTests ---');
  testStudentService();
  Logger.log('--- StudentServiceUnitTests Completed ---');
}