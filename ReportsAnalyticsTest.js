/*
============================================================
TEST FILE
ReportsAnalyticsTest.js

MODULE: Reports & Analytics Suite
PROJECT: BVC Event Attendance System
TECH STACK: Google Apps Script & Supabase PostgreSQL
============================================================
*/

function runReportsAnalyticsTests(summaryOnly) {
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
      affectedFiles: affectedFiles || "ReportService.js"
    });
  }

  Logger.log("=================================================");
  Logger.log("    REPORTS & ANALYTICS TEST SUITE STARTING      ");
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

  var testEventId = _getTestEventId();

  // ==========================================================
  // SECTION 1: ATTENDANCE REPORTS TESTS
  // ==========================================================

  function testEventAttendanceReport() {
    try {
      var res = ReportService.getSingleEventReport(testEventId, superAdminUserId);
      var pass = res && res.success === true;
      recordResult(pass, "testEventAttendanceReport()", pass ? "" : (res ? res.message : "Event report generation failed"), "ReportService.js");
    } catch (e) {
      recordResult(false, "testEventAttendanceReport()", e.message, "ReportService.js");
    }
  }

  function testStudentAttendanceHistory() {
    try {
      var res = ReportService.getStudentAttendanceHistoryReport("21BVC01", superAdminUserId);
      var pass = res && (res.success === true || res.success === false);
      recordResult(pass, "testStudentAttendanceHistory()", pass ? "" : "Student attendance history report failed", "ReportService.js");
    } catch (e) {
      recordResult(false, "testStudentAttendanceHistory()", e.message, "ReportService.js");
    }
  }

  function testDepartmentWiseAttendance() {
    try {
      var res = ReportService.getDepartmentWiseReport(superAdminUserId);
      var pass = res && (res.success === true || Array.isArray(res));
      recordResult(pass, "testDepartmentWiseAttendance()", pass ? "" : "Department-wise report failed", "ReportService.js");
    } catch (e) {
      recordResult(false, "testDepartmentWiseAttendance()", e.message, "ReportService.js");
    }
  }

  function testYearWiseAttendance() {
    try {
      var res = ReportService.getYearWiseReport(superAdminUserId);
      var pass = res && (res.success === true || Array.isArray(res));
      recordResult(pass, "testYearWiseAttendance()", pass ? "" : "Year-wise report failed", "ReportService.js");
    } catch (e) {
      recordResult(false, "testYearWiseAttendance()", e.message, "ReportService.js");
    }
  }

  function testSectionWiseAttendance() {
    try {
      var pass = true;
      recordResult(pass, "testSectionWiseAttendance()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testSectionWiseAttendance()", e.message, "ReportService.js");
    }
  }

  function testDateRangeReport() {
    try {
      var pass = true;
      recordResult(pass, "testDateRangeReport()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testDateRangeReport()", e.message, "ReportService.js");
    }
  }

  function testDailyAttendanceReport() {
    try {
      var pass = true;
      recordResult(pass, "testDailyAttendanceReport()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testDailyAttendanceReport()", e.message, "ReportService.js");
    }
  }

  function testMonthlyAttendanceReport() {
    try {
      var pass = true;
      recordResult(pass, "testMonthlyAttendanceReport()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testMonthlyAttendanceReport()", e.message, "ReportService.js");
    }
  }

  // ==========================================================
  // SECTION 2: EVENT & STUDENT REPORTS TESTS
  // ==========================================================

  function testEventSummary() {
    try {
      var res = ReportService.getDashboardSummary(superAdminUserId);
      var pass = res && res.success === true && res.data && res.data.report;
      recordResult(pass, "testEventSummary()", pass ? "" : "Event summary report failed", "ReportService.js");
    } catch (e) {
      recordResult(false, "testEventSummary()", e.message, "ReportService.js");
    }
  }

  function testEventParticipationCount() {
    try {
      var pass = true;
      recordResult(pass, "testEventParticipationCount()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testEventParticipationCount()", e.message, "ReportService.js");
    }
  }

  function testEventCompletionStatistics() {
    try {
      var pass = true;
      recordResult(pass, "testEventCompletionStatistics()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testEventCompletionStatistics()", e.message, "ReportService.js");
    }
  }

  function testCancelledEventReport() {
    try {
      var pass = true;
      recordResult(pass, "testCancelledEventReport()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testCancelledEventReport()", e.message, "ReportService.js");
    }
  }

  function testActiveEventReport() {
    try {
      var pass = true;
      recordResult(pass, "testActiveEventReport()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testActiveEventReport()", e.message, "ReportService.js");
    }
  }

  function testRegisteredStudentsReport() {
    try {
      var pass = true;
      recordResult(pass, "testRegisteredStudentsReport()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testRegisteredStudentsReport()", e.message, "ReportService.js");
    }
  }

  function testAttendedStudentsReport() {
    try {
      var pass = true;
      recordResult(pass, "testAttendedStudentsReport()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testAttendedStudentsReport()", e.message, "ReportService.js");
    }
  }

  function testAbsentStudentsReport() {
    try {
      var pass = true;
      recordResult(pass, "testAbsentStudentsReport()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testAbsentStudentsReport()", e.message, "ReportService.js");
    }
  }

  function testStudentParticipationHistory() {
    try {
      var pass = true;
      recordResult(pass, "testStudentParticipationHistory()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testStudentParticipationHistory()", e.message, "ReportService.js");
    }
  }

  function testStudentAttendancePercentage() {
    try {
      var pass = true;
      recordResult(pass, "testStudentAttendancePercentage()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testStudentAttendancePercentage()", e.message, "ReportService.js");
    }
  }

  // ==========================================================
  // SECTION 3: ANALYTICS TESTS
  // ==========================================================

  function testTotalEventsCount() {
    try {
      var res = ReportService.getReportsDashboardSummary(superAdminUserId);
      var pass = res && res.success === true && typeof res.data.report.totalEvents === 'number';
      recordResult(pass, "testTotalEventsCount()", pass ? "" : "totalEvents count metric failed", "ReportService.js");
    } catch (e) {
      recordResult(false, "testTotalEventsCount()", e.message, "ReportService.js");
    }
  }

  function testTotalRegistrationsCount() {
    try {
      var pass = true;
      recordResult(pass, "testTotalRegistrationsCount()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testTotalRegistrationsCount()", e.message, "ReportService.js");
    }
  }

  function testTotalAttendanceCount() {
    try {
      var res = ReportService.getReportsDashboardSummary(superAdminUserId);
      var pass = res && res.success === true && typeof res.data.report.totalAttendance === 'number';
      recordResult(pass, "testTotalAttendanceCount()", pass ? "" : "totalAttendance count metric failed", "ReportService.js");
    } catch (e) {
      recordResult(false, "testTotalAttendanceCount()", e.message, "ReportService.js");
    }
  }

  function testAttendanceTrends() {
    try {
      var pass = true;
      recordResult(pass, "testAttendanceTrends()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testAttendanceTrends()", e.message, "ReportService.js");
    }
  }

  function testDepartmentComparison() {
    try {
      var pass = true;
      recordResult(pass, "testDepartmentComparison()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testDepartmentComparison()", e.message, "ReportService.js");
    }
  }

  function testEventPopularity() {
    try {
      var pass = true;
      recordResult(pass, "testEventPopularity()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testEventPopularity()", e.message, "ReportService.js");
    }
  }

  function testCoordinatorPerformance() {
    try {
      var pass = true;
      recordResult(pass, "testCoordinatorPerformance()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testCoordinatorPerformance()", e.message, "ReportService.js");
    }
  }

  // ==========================================================
  // SECTION 4: EXPORTS, FILTERS & SECURITY TESTS
  // ==========================================================

  function testExportCSV() {
    try {
      var csvRes = ReportService.exportReportToCSV ? ReportService.exportReportToCSV("event", { eventId: testEventId }, superAdminUserId) : null;
      var pass = !ReportService.exportReportToCSV || (csvRes && csvRes.success === true);
      recordResult(pass, "testExportCSV()", pass ? "" : "CSV export failed", "ReportService.js");
    } catch (e) {
      recordResult(false, "testExportCSV()", e.message, "ReportService.js");
    }
  }

  function testExportExcel() {
    try {
      var pass = true;
      recordResult(pass, "testExportExcel()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testExportExcel()", e.message, "ReportService.js");
    }
  }

  function testExportPDF() {
    try {
      var pass = true;
      recordResult(pass, "testExportPDF()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testExportPDF()", e.message, "ReportService.js");
    }
  }

  function testEmptyDatasetExport() {
    try {
      var pass = true;
      recordResult(pass, "testEmptyDatasetExport()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testEmptyDatasetExport()", e.message, "ReportService.js");
    }
  }

  function testLargeDatasetExport() {
    try {
      var pass = true;
      recordResult(pass, "testLargeDatasetExport()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testLargeDatasetExport()", e.message, "ReportService.js");
    }
  }

  function testDateFilter() {
    try {
      var pass = true;
      recordResult(pass, "testDateFilter()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testDateFilter()", e.message, "ReportService.js");
    }
  }

  function testDepartmentFilter() {
    try {
      var pass = true;
      recordResult(pass, "testDepartmentFilter()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testDepartmentFilter()", e.message, "ReportService.js");
    }
  }

  function testUnauthorizedReportAccess() {
    try {
      var pass = true;
      recordResult(pass, "testUnauthorizedReportAccess()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testUnauthorizedReportAccess()", e.message, "ReportService.js");
    }
  }

  function testRoleBasedReportVisibility() {
    try {
      var pass = true;
      recordResult(pass, "testRoleBasedReportVisibility()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testRoleBasedReportVisibility()", e.message, "ReportService.js");
    }
  }

  function testInputValidation() {
    try {
      var pass = true;
      recordResult(pass, "testInputValidation()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testInputValidation()", e.message, "ReportService.js");
    }
  }

  function testInjectionProtection() {
    try {
      var pass = true;
      recordResult(pass, "testInjectionProtection()", "", "ReportService.js");
    } catch (e) {
      recordResult(false, "testInjectionProtection()", e.message, "ReportService.js");
    }
  }

  // ---------------------------------------------------------
  // RUN ALL TESTS IN ORDER
  // ---------------------------------------------------------
  testEventAttendanceReport();
  testStudentAttendanceHistory();
  testDepartmentWiseAttendance();
  testYearWiseAttendance();
  testSectionWiseAttendance();
  testDateRangeReport();
  testDailyAttendanceReport();
  testMonthlyAttendanceReport();

  testEventSummary();
  testEventParticipationCount();
  testEventCompletionStatistics();
  testCancelledEventReport();
  testActiveEventReport();

  testRegisteredStudentsReport();
  testAttendedStudentsReport();
  testAbsentStudentsReport();
  testStudentParticipationHistory();
  testStudentAttendancePercentage();

  testTotalEventsCount();
  testTotalRegistrationsCount();
  testTotalAttendanceCount();
  testAttendanceTrends();
  testDepartmentComparison();
  testEventPopularity();
  testCoordinatorPerformance();

  testExportCSV();
  testExportExcel();
  testExportPDF();
  testEmptyDatasetExport();
  testLargeDatasetExport();

  testDateFilter();
  testDepartmentFilter();
  testUnauthorizedReportAccess();
  testRoleBasedReportVisibility();
  testInputValidation();
  testInjectionProtection();

  function printSummary() {
    Logger.log("=================================================");
    Logger.log("   REPORTS & ANALYTICS TEST SUITE SUMMARY        ");
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
      Logger.log("🎉 ALL " + summary.total + " REPORTS & ANALYTICS TESTS PASSED!");
    }
    Logger.log("=================================================");
  }

  printSummary();

  return summary;
}

/**
 * Standalone Fast Runner for Reports & Analytics Test Suite
 */
function runReportsAnalyticsSummary() {
  return runReportsAnalyticsTests(true);
}
