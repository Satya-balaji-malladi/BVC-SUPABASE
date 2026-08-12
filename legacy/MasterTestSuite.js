/*
============================================================
MASTER TEST SUITE ORCHESTRATOR
MasterTestSuite.js

PROJECT: BVC Event Attendance System
TECH STACK: Google Apps Script & Supabase PostgreSQL

DESCRIPTION:
Unified entry point that orchestrates execution across all
13 automated test suites in strict sequential order.
============================================================
*/

/**
 * Main Entry Point for Running All Test Suites
 * @param {Object|string} options Optional configuration or filter string (e.g. "All", "Attendance", "Student")
 */
function runMasterTestSuite(options) {
  var startTime = Date.now();

  // Enforce global email bypass for test execution
  if (typeof CONFIG !== 'undefined') CONFIG.SKIP_EMAIL = true;

  var opts = {
    filter: "ALL",
    stopOnFirstFailure: false,
    verbose: false,
    retryFailedOnce: false
  };

  if (typeof options === 'string') {
    opts.filter = options.trim().toUpperCase();
  } else if (options && typeof options === 'object') {
    if (options.filter) opts.filter = String(options.filter).trim().toUpperCase();
    if (options.stopOnFirstFailure !== undefined) opts.stopOnFirstFailure = !!options.stopOnFirstFailure;
    if (options.verbose !== undefined) opts.verbose = !!options.verbose;
    if (options.retryFailedOnce !== undefined) opts.retryFailedOnce = !!options.retryFailedOnce;
  }

  Logger.log("=================================================");
  Logger.log("     BVC SYSTEM MASTER TEST SUITE RUNNER         ");
  Logger.log("=================================================");
  Logger.log("Mode            : " + (opts.filter === "ALL" ? "Full System Audit" : "Filtered [" + opts.filter + "]"));
  Logger.log("Stop On Fail    : " + opts.stopOnFirstFailure);
  Logger.log("Retry Failed    : " + opts.retryFailedOnce);
  Logger.log("=================================================");

  // Registry of all 13 Test Suites in strict execution order
  var suites = [
    { id: "AUTH", name: "1. Authentication", fn: function() { return typeof runAuthServiceTests === 'function' ? runAuthServiceTests(true) : null; } },
    { id: "ROLE", name: "2. Role Authorization", fn: function() { return typeof runRoleAuthorizationTests === 'function' ? runRoleAuthorizationTests(true) : null; } },
    { id: "USER", name: "3. User Management", fn: function() { return typeof runUserManagementTests === 'function' ? runUserManagementTests(true) : null; } },
    { id: "FACULTY", name: "4. Faculty Module", fn: function() { return typeof runFacultyModuleTests === 'function' ? runFacultyModuleTests(true) : null; } },
    { id: "STUDENT", name: "5. Student Module", fn: function() { return typeof runStudentModuleTests === 'function' ? runStudentModuleTests(true) : null; } },
    { id: "REGISTRATION", name: "6. Registration Module", fn: function() { return typeof runRegistrationModuleTests === 'function' ? runRegistrationModuleTests(true) : null; } },
    { id: "EVENT", name: "7. Event Management", fn: function() { return typeof runEventManagementTests === 'function' ? runEventManagementTests(true) : null; } },
    { id: "COORDINATOR", name: "8. Coordinator Module", fn: function() { return typeof runCoordinatorModuleTests === 'function' ? runCoordinatorModuleTests(true) : null; } },
    { id: "ATTENDANCE", name: "9. Attendance Module", fn: function() { return typeof runAttendanceModuleTests === 'function' ? runAttendanceModuleTests(true) : null; } },
    { id: "REPORTS", name: "10. Reports & Analytics", fn: function() { return typeof runReportsAnalyticsTests === 'function' ? runReportsAnalyticsTests(true) : null; } },
    { id: "INTEGRATION", name: "11. Integration Testing", fn: function() { return typeof runIntegrationTestSuite === 'function' ? runIntegrationTestSuite(true) : null; } },
    { id: "REGRESSION", name: "12. Regression Testing", fn: function() { return typeof runRegressionTestSuite === 'function' ? runRegressionTestSuite(true) : null; } },
    { id: "E2E", name: "13. End-to-End Testing", fn: function() { return typeof runEndToEndTestSuite === 'function' ? runEndToEndTestSuite(true) : null; } }
  ];

  var suiteStats = {
    executed: 0,
    passed: 0,
    failed: 0,
    details: []
  };

  var caseStats = {
    total: 0,
    passed: 0,
    failed: 0
  };

  var allFailedCases = [];

  for (var i = 0; i < suites.length; i++) {
    var suite = suites[i];

    // Filter check
    if (opts.filter !== "ALL" && suite.id.indexOf(opts.filter) === -1 && suite.name.toUpperCase().indexOf(opts.filter) === -1) {
      continue;
    }

    var sStartTime = Date.now();
    Logger.log("\n▶ Running Suite: " + suite.name + "...");

    var res = null;
    try {
      res = suite.fn();
    } catch (err) {
      Logger.log("❌ Exception during suite execution: " + err.message);
      if (opts.retryFailedOnce) {
        Logger.log("🔄 Retrying suite " + suite.name + " once...");
        try { res = suite.fn(); } catch(re) { res = null; }
      }
    }

    var sDuration = ((Date.now() - sStartTime) / 1000).toFixed(2);
    suiteStats.executed++;

    var sPassed = false;
    var sTotalCases = 0;
    var sPassedCases = 0;
    var sFailedCases = 0;

    if (res && typeof res === 'object') {
      sTotalCases = res.total || 0;
      sPassedCases = res.passed || 0;
      sFailedCases = res.failed || 0;
      sPassed = (sFailedCases === 0 && sTotalCases > 0);

      // Collect specific failed test cases for detailed final summary
      if (Array.isArray(res.results)) {
        res.results.forEach(function(item) {
          if (item && item.status === 'FAIL') {
            allFailedCases.push({
              suiteName: suite.name,
              name: item.name,
              reason: item.reason || "Test failed",
              affectedFiles: item.affectedFiles || item.owningModules || item.responsibleLayers || "N/A"
            });
          }
        });
      }
    }

    // Retry logic if failed and retry enabled
    if (!sPassed && opts.retryFailedOnce && (!res || res.failed > 0)) {
      Logger.log("🔄 Retrying suite " + suite.name + " once...");
      var rStartTime = Date.now();
      try {
        res = suite.fn();
        if (res && typeof res === 'object') {
          sTotalCases = res.total || 0;
          sPassedCases = res.passed || 0;
          sFailedCases = res.failed || 0;
          sPassed = (sFailedCases === 0 && sTotalCases > 0);
        }
      } catch(re) {}
      sDuration = ((Date.now() - rStartTime) / 1000).toFixed(2);
    }

    caseStats.total += sTotalCases;
    caseStats.passed += sPassedCases;
    caseStats.failed += sFailedCases;

    if (sPassed) {
      suiteStats.passed++;
      Logger.log("✅ " + suite.name + " PASSED (" + sPassedCases + "/" + sTotalCases + " cases in " + sDuration + "s)");
    } else {
      suiteStats.failed++;
      Logger.log("❌ " + suite.name + " FAILED (" + sFailedCases + " failures in " + sDuration + "s)");
    }

    suiteStats.details.push({
      name: suite.name,
      passed: sPassed,
      duration: sDuration,
      totalCases: sTotalCases,
      failedCases: sFailedCases
    });

    if (!sPassed && opts.stopOnFirstFailure) {
      Logger.log("⛔ Stopping execution early on first failure as configured.");
      break;
    }
  }

  var totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print Master Summary Output
  Logger.log("\n=================================================");
  Logger.log("MASTER TEST SUMMARY");
  Logger.log("=================================================\n");
  Logger.log("Execution Time : " + totalTime + " sec\n");
  Logger.log("Suites Executed : " + suiteStats.executed);
  Logger.log("Suites Passed   : " + suiteStats.passed);
  Logger.log("Suites Failed   : " + suiteStats.failed + "\n");
  Logger.log("Test Cases Total : " + caseStats.total);
  Logger.log("Test Cases Passed: " + caseStats.passed);
  Logger.log("Test Cases Failed: " + caseStats.failed + "\n");

  var overallStatus = "✅ PASS";
  if (suiteStats.failed > 0) {
    if (suiteStats.passed > 0) {
      overallStatus = "⚠️ PARTIAL PASS";
    } else {
      overallStatus = "❌ FAIL";
    }
  }

  Logger.log("Overall Status :\n");
  Logger.log(overallStatus);
  Logger.log("\n=================================================");

  // Detailed Failure Breakdown Report (If any test cases failed)
  if (allFailedCases.length > 0) {
    Logger.log("\n=================================================");
    Logger.log("      FAILED TEST CASES DETAILS & LOCATIONS      ");
    Logger.log("=================================================");
    allFailedCases.forEach(function(item, idx) {
      Logger.log((idx + 1) + ". ❌ [" + item.suiteName + "] -> " + item.name);
      Logger.log("   Reason   : " + item.reason);
      Logger.log("   Location : " + item.affectedFiles);
      Logger.log("-------------------------------------------------");
    });
    Logger.log("=================================================");
  } else {
    Logger.log("\n🎉 ZERO FAILED TEST CASES! ALL TESTS PASSED CLEANLY!");
  }

  return {
    executionTimeSeconds: totalTime,
    suitesExecuted: suiteStats.executed,
    suitesPassed: suiteStats.passed,
    suitesFailed: suiteStats.failed,
    testCasesTotal: caseStats.total,
    testCasesPassed: caseStats.passed,
    testCasesFailed: caseStats.failed,
    failedDetails: allFailedCases,
    overallStatus: overallStatus
  };
}

/**
 * Convenient shorthand runners for Google Apps Script Editor dropdown menu
 */
function runAllTests() {
  return runMasterTestSuite("ALL");
}

function runFastAudit() {
  return runMasterTestSuite({ filter: "ALL", stopOnFirstFailure: true });
}

function runAuthTestsOnly() {
  return typeof runAuthServiceTests === 'function' ? runAuthServiceTests(false) : runMasterTestSuite("AUTH");
}

function runRoleTestsOnly() {
  return typeof runRoleAuthorizationTests === 'function' ? runRoleAuthorizationTests(false) : runMasterTestSuite("ROLE");
}

function runUserTestsOnly() {
  return typeof runUserManagementTests === 'function' ? runUserManagementTests(false) : runMasterTestSuite("USER");
}

function runFacultyTestsOnly() {
  return typeof runFacultyModuleTests === 'function' ? runFacultyModuleTests(false) : runMasterTestSuite("FACULTY");
}

function runStudentTestsOnly() {
  return typeof runStudentModuleTests === 'function' ? runStudentModuleTests(false) : runMasterTestSuite("STUDENT");
}

function runRegistrationTestsOnly() {
  return typeof runRegistrationModuleTests === 'function' ? runRegistrationModuleTests(false) : runMasterTestSuite("REGISTRATION");
}

function runEventTestsOnly() {
  return typeof runEventManagementTests === 'function' ? runEventManagementTests(false) : runMasterTestSuite("EVENT");
}

function runCoordinatorTestsOnly() {
  return typeof runCoordinatorModuleTests === 'function' ? runCoordinatorModuleTests(false) : runMasterTestSuite("COORDINATOR");
}

function runAttendanceTestsOnly() {
  return typeof runAttendanceModuleTests === 'function' ? runAttendanceModuleTests(false) : runMasterTestSuite("ATTENDANCE");
}

function runReportsTestsOnly() {
  return typeof runReportsAnalyticsTests === 'function' ? runReportsAnalyticsTests(false) : runMasterTestSuite("REPORTS");
}

function runIntegrationTestsOnly() {
  return typeof runIntegrationTestSuite === 'function' ? runIntegrationTestSuite(false) : runMasterTestSuite("INTEGRATION");
}

function runRegressionTestsOnly() {
  return typeof runRegressionTestSuite === 'function' ? runRegressionTestSuite(false) : runMasterTestSuite("REGRESSION");
}

function runE2ETestsOnly() {
  return typeof runEndToEndTestSuite === 'function' ? runEndToEndTestSuite(false) : runMasterTestSuite("E2E");
}
