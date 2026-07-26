/**
 * DepartmentCreationDiagnostic.js
 * Comprehensive diagnostic runner for testing end-to-end Department Creation flow.
 * Run testDepartmentCreationDiagnostic() in Google Apps Script Editor.
 */

function testDepartmentCreationDiagnostic() {
  var report = [];
  report.push("=================================================");
  report.push("🔍 BVC DEPARTMENT CREATION DIAGNOSTIC TEST RUNNER");
  report.push("=================================================\n");

  var overallSuccess = true;
  var timestamp = new Date().getTime();
  var testDeptCode = "DIAG" + String(timestamp).slice(-3);
  var testDeptName = "Diagnostic Dept " + String(timestamp).slice(-3);
  var testHodEmail = "diag.hod." + timestamp + "@bvcgroup.in";
  var testHodEmpId = "EMP" + String(timestamp).slice(-4);

  // STEP 1: Test IdService.generateDepartmentId
  try {
    var generatedId = IdService.generateDepartmentId();
    if (generatedId && generatedId.indexOf("DEP") === 0) {
      report.push("✅ STEP 1 [IdService.js -> generateDepartmentId]: PASSED");
      report.push("   -> Generated Department ID: " + generatedId);
    } else {
      overallSuccess = false;
      report.push("❌ STEP 1 [IdService.js -> generateDepartmentId]: FAILED");
      report.push("   -> Invalid ID generated: " + generatedId);
    }
  } catch (e1) {
    overallSuccess = false;
    report.push("❌ STEP 1 [IdService.js -> generateDepartmentId]: FAILED");
    report.push("   -> Error: " + (e1.message || e1));
  }

  // STEP 2: Test ValidationService.validateDepartment
  var deptPayload = {
    department_name: testDeptName,
    department_code: testDeptCode,
    hod_name: "Dr. Diagnostic HOD",
    hod_emp_id: testHodEmpId,
    hod_email: testHodEmail,
    status: "Active"
  };

  try {
    var valRes = ValidationService.validateDepartment(deptPayload);
    if (valRes && valRes.valid) {
      report.push("✅ STEP 2 [ValidationService.js -> validateDepartment]: PASSED");
    } else {
      overallSuccess = false;
      report.push("❌ STEP 2 [ValidationService.js -> validateDepartment]: FAILED");
      report.push("   -> Errors: " + (valRes ? JSON.stringify(valRes.errors) : "Unknown"));
    }
  } catch (e2) {
    overallSuccess = false;
    report.push("❌ STEP 2 [ValidationService.js -> validateDepartment]: FAILED");
    report.push("   -> Error: " + (e2.message || e2));
  }

  // STEP 3: Test DepartmentService.createDepartment
  var createdDeptId = null;
  try {
    var createRes = DepartmentService.createDepartment(deptPayload, "SuperAdmin_Diagnostic");
    if (createRes && createRes.success) {
      createdDeptId = (createRes.data && createRes.data.department) ? createRes.data.department[CONFIG.COLUMNS.DEPARTMENT_ID] || createRes.data.department.department_id : null;
      report.push("✅ STEP 3 [DepartmentService.js -> createDepartment]: PASSED");
      report.push("   -> Response Message: " + createRes.message);
      report.push("   -> Created Dept ID: " + createdDeptId);
    } else {
      overallSuccess = false;
      report.push("❌ STEP 3 [DepartmentService.js -> createDepartment]: FAILED");
      report.push("   -> Error Message: " + (createRes ? createRes.message : "No response"));
    }
  } catch (e3) {
    overallSuccess = false;
    report.push("❌ STEP 3 [DepartmentService.js -> createDepartment]: FAILED");
    report.push("   -> Exception: " + (e3.message || e3));
  }

  // STEP 4: Test DatabaseService.readAllRows lookup
  if (createdDeptId) {
    try {
      var allDepts = DatabaseService.readAllRows("DEPARTMENTS") || [];
      var found = allDepts.some(function(d) {
        var dId = d[CONFIG.COLUMNS.DEPARTMENT_ID] || d.department_id;
        return String(dId) === String(createdDeptId);
      });

      if (found) {
        report.push("✅ STEP 4 [DatabaseService.js -> readAllRows (Supabase verification)]: PASSED");
        report.push("   -> Department record successfully verified in Supabase!");
      } else {
        overallSuccess = false;
        report.push("❌ STEP 4 [DatabaseService.js -> readAllRows]: FAILED");
        report.push("   -> Created Department ID " + createdDeptId + " not found in Supabase read.");
      }
    } catch (e4) {
      overallSuccess = false;
      report.push("❌ STEP 4 [DatabaseService.js -> readAllRows]: FAILED");
      report.push("   -> Error: " + (e4.message || e4));
    }
  }

  // STEP 5: Test UserService auto-created HOD account
  try {
    var hodUser = UserService.getUserByEmployeeId ? UserService.getUserByEmployeeId(testHodEmpId) : null;
    if (hodUser) {
      report.push("✅ STEP 5 [UserService.js -> createUser (HOD auto-provisioning)]: PASSED");
      report.push("   -> HOD Username: " + (hodUser.username || testHodEmpId.toLowerCase()));
    } else {
      report.push("⚠️ STEP 5 [UserService.js -> getUserByEmployeeId]: SKIPPED / NOT FOUND");
    }
  } catch (e5) {
    report.push("⚠️ STEP 5 [UserService.js]: " + (e5.message || e5));
  }

  report.push("\n=================================================");
  if (overallSuccess) {
    report.push("🎉 OVERALL DIAGNOSTIC TEST: ALL STAGES PASSED!");
  } else {
    report.push("💥 OVERALL DIAGNOSTIC TEST: STAGE FAILED!");
  }
  report.push("=================================================");

  var finalLog = report.join("\n");
  Logger.log(finalLog);
  return finalLog;
}
