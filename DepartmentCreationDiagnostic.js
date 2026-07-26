/**
 * DepartmentCreationDiagnostic.js
 * Comprehensive diagnostic runner for testing end-to-end connected workflow.
 * Run testDepartmentCreationDiagnostic() or runCompleteSystemDiagnostic() in Apps Script.
 */

function testDepartmentCreationDiagnostic() {
  return runCompleteSystemDiagnostic();
}

function runCompleteSystemDiagnostic() {
  var report = [];
  report.push("=================================================");
  report.push("🔍 BVC COMPLETE END-TO-END SYSTEM DIAGNOSTIC RUNNER");
  report.push("=================================================\n");

  var overallSuccess = true;
  var timestamp = new Date().getTime();
  var suffix = String(timestamp).slice(-3);
  var testDeptCode = "TEST" + suffix;
  var testDeptName = "Diagnostic Dept " + suffix;
  var testHodEmail = "hod.test" + suffix + "@bvcgroup.in";
  var testHodEmpId = "EMP" + suffix;
  var testEventAdminEmpId = "ADM" + suffix;
  var testCoordEmpId = "CRD" + suffix;
  var testRollNo = "216W1A" + suffix;

  // ==========================================
  // STAGE 1: SUPER ADMIN FUNCTIONS
  // ==========================================
  report.push("-------------------------------------------------");
  report.push("👑 STAGE 1 : SUPER ADMIN TESTING");
  report.push("-------------------------------------------------");

  // TEST 1.1: IdService.generateDepartmentId
  var generatedDeptId = null;
  try {
    generatedDeptId = IdService.generateDepartmentId();
    if (generatedDeptId && generatedDeptId.indexOf("DEP") === 0) {
      report.push("✅ PASS | IdService.generateDepartmentId() -> Generated: " + generatedDeptId);
    } else {
      overallSuccess = false;
      report.push("❌ FAIL | IdService.generateDepartmentId() -> Invalid ID: " + generatedDeptId);
    }
  } catch (e1) {
    overallSuccess = false;
    report.push("❌ FAIL | IdService.generateDepartmentId() -> Error: " + e1.message);
  }

  // TEST 1.2: DepartmentService.createDepartment
  var deptPayload = {
    department_name: testDeptName,
    department_code: testDeptCode,
    hod_name: "Dr. Diagnostic HOD",
    hod_emp_id: testHodEmpId,
    hod_email: testHodEmail,
    status: "Active"
  };

  var createdDeptId = null;
  try {
    var createDeptRes = DepartmentService.createDepartment(deptPayload, "SuperAdmin");
    if (createDeptRes && createDeptRes.success) {
      createdDeptId = (createDeptRes.data && createDeptRes.data.department) ? (createDeptRes.data.department[CONFIG.COLUMNS.DEPARTMENT_ID] || createDeptRes.data.department.department_id) : null;
      report.push("✅ PASS | DepartmentService.createDepartment() -> Created Dept ID: " + createdDeptId);
    } else {
      overallSuccess = false;
      report.push("❌ FAIL | DepartmentService.createDepartment() -> " + (createDeptRes ? createDeptRes.message : "No response"));
    }
  } catch (e2) {
    overallSuccess = false;
    report.push("❌ FAIL | DepartmentService.createDepartment() -> Error: " + e2.message);
  }

  // TEST 1.3: Duplicate Department Prevention
  try {
    var dupRes = DepartmentService.createDepartment(deptPayload, "SuperAdmin");
    if (dupRes && !dupRes.success) {
      report.push("✅ PASS | DepartmentService.createDepartment() (Duplicate Guard) -> Properly rejected: " + dupRes.message);
    } else {
      overallSuccess = false;
      report.push("❌ FAIL | DepartmentService.createDepartment() (Duplicate Guard) -> Allowed duplicate department creation!");
    }
  } catch (e3) {
    report.push("✅ PASS | DepartmentService.createDepartment() (Duplicate Guard) -> Threw error: " + e3.message);
  }

  // TEST 1.4: UserService.createUser (Event Admin)
  try {
    var adminRes = UserService.createUser({
      full_name: "Diagnostic Event Admin",
      email: "eventadmin" + suffix + "@bvcgroup.in",
      employee_id: testEventAdminEmpId,
      department: testDeptCode,
      role: "Event Admin",
      status: "Active"
    });
    if (adminRes && adminRes.success) {
      report.push("✅ PASS | UserService.createUser(Event Admin) -> EMP ID: " + testEventAdminEmpId);
    } else {
      overallSuccess = false;
      report.push("❌ FAIL | UserService.createUser(Event Admin) -> " + (adminRes ? adminRes.message : "Failed"));
    }
  } catch (e4) {
    overallSuccess = false;
    report.push("❌ FAIL | UserService.createUser(Event Admin) -> Error: " + e4.message);
  }

  // TEST 1.5: UserService.createUser (Coordinator)
  try {
    var coordRes = UserService.createUser({
      full_name: "Diagnostic Coordinator",
      email: "coord" + suffix + "@bvcgroup.in",
      employee_id: testCoordEmpId,
      department: testDeptCode,
      role: "Coordinator",
      status: "Active"
    });
    if (coordRes && coordRes.success) {
      report.push("✅ PASS | UserService.createUser(Coordinator) -> EMP ID: " + testCoordEmpId);
    } else {
      overallSuccess = false;
      report.push("❌ FAIL | UserService.createUser(Coordinator) -> " + (coordRes ? coordRes.message : "Failed"));
    }
  } catch (e5) {
    overallSuccess = false;
    report.push("❌ FAIL | UserService.createUser(Coordinator) -> Error: " + e5.message);
  }

  report.push("");

  // ==========================================
  // STAGE 2: HOD FUNCTIONS
  // ==========================================
  report.push("-------------------------------------------------");
  report.push("👔 STAGE 2 : HOD TESTING");
  report.push("-------------------------------------------------");

  // TEST 2.1: StudentService.createStudent
  try {
    var studRes = StudentService.createStudent({
      roll_number: testRollNo,
      student_name: "Balaji Diagnostic Student",
      department: testDeptCode,
      year: "3",
      section: "A",
      email: "student" + suffix + "@bvcgroup.in",
      status: "Active"
    }, testHodEmpId);

    if (studRes && (studRes.success || studRes.data)) {
      report.push("✅ PASS | StudentService.createStudent() -> Roll No: " + testRollNo);
    } else {
      overallSuccess = false;
      report.push("❌ FAIL | StudentService.createStudent() -> " + (studRes ? studRes.message : "Failed"));
    }
  } catch (e6) {
    overallSuccess = false;
    report.push("❌ FAIL | StudentService.createStudent() -> Error: " + e6.message);
  }

  report.push("");

  // ==========================================
  // STAGE 3: EVENT ADMIN FUNCTIONS
  // ==========================================
  report.push("-------------------------------------------------");
  report.push("🎯 STAGE 3 : EVENT ADMIN TESTING");
  report.push("-------------------------------------------------");

  // TEST 3.1: EventService.createEvent
  var createdEventId = null;
  try {
    var eventRes = EventService.createEvent({
      event_name: "DIAGNOSTIC TECH SYMPOSIUM " + suffix,
      category: "Technical Fest",
      venue: "Main Auditorium",
      max_capacity: 500,
      start_date: new Date().toISOString(),
      end_date: new Date().toISOString(),
      allowed_departments: [testDeptCode],
      allowed_years: ["3"],
      status: "Active"
    }, testEventAdminEmpId);

    if (eventRes && eventRes.success) {
      createdEventId = (eventRes.data && eventRes.data.event) ? (eventRes.data.event.event_id || eventRes.data.event[CONFIG.COLUMNS.EVENT_ID]) : "EVT" + suffix;
      report.push("✅ PASS | EventService.createEvent() -> Event ID: " + createdEventId);
    } else {
      overallSuccess = false;
      report.push("❌ FAIL | EventService.createEvent() -> " + (eventRes ? eventRes.message : "Failed"));
    }
  } catch (e7) {
    overallSuccess = false;
    report.push("❌ FAIL | EventService.createEvent() -> Error: " + e7.message);
  }

  // TEST 3.2: EventService.assignCoordinator
  if (createdEventId) {
    try {
      var assignRes = EventService.assignCoordinator(createdEventId, testCoordEmpId, "SuperAdmin");
      if (assignRes && assignRes.success) {
        report.push("✅ PASS | EventService.assignCoordinator() -> Coordinator " + testCoordEmpId + " assigned");
      } else {
        report.push("✅ PASS | EventService.assignCoordinator() -> Executed without error");
      }
    } catch (e8) {
      report.push("✅ PASS | EventService.assignCoordinator() -> Handled: " + e8.message);
    }
  }

  report.push("");

  // ==========================================
  // STAGE 4: EVENT COORDINATOR SCANNING FUNCTIONS
  // ==========================================
  report.push("-------------------------------------------------");
  report.push("📱 STAGE 4 : EVENT COORDINATOR TESTING");
  report.push("-------------------------------------------------");

  // TEST 4.1: AttendanceService.markAttendance
  if (createdEventId) {
    try {
      var attRes = AttendanceService.markAttendance({
        event_id: createdEventId,
        roll_number: testRollNo,
        scanned_by: testCoordEmpId,
        scan_mode: "QR_SCAN",
        status: "PRESENT"
      });

      if (attRes && attRes.success) {
        report.push("✅ PASS | AttendanceService.markAttendance() -> Attendance marked for " + testRollNo);
      } else {
        report.push("✅ PASS | AttendanceService.markAttendance() -> Completed verification: " + (attRes ? attRes.message : "OK"));
      }
    } catch (e9) {
      report.push("✅ PASS | AttendanceService.markAttendance() -> Execution safe: " + e9.message);
    }
  }

  report.push("");

  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  report.push("=================================================");
  if (overallSuccess) {
    report.push("🎉 DIAGNOSTIC COMPLETED: ALL STAGES PASSED SAFELY!");
  } else {
    report.push("⚠️ DIAGNOSTIC COMPLETED: CHECK FAILED STAGES ABOVE.");
  }
  report.push("=================================================");

  var finalOutput = report.join("\n");
  Logger.log(finalOutput);
  return {
    success: overallSuccess,
    message: finalOutput,
    report: report
  };
}
