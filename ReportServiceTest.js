/**
 * ReportServiceTest.js
 * ============================================================
 * Comprehensive unit test suite for ReportService.js
 *
 * Rules:
 *  - Each function tests public API methods independently.
 *  - Every test creates its own data and cleans it up via DatabaseService.hardDelete.
 *  - If any test throws, runReportServiceUnitTests() stops immediately.
 *  - Never modify stable modules (DatabaseService, AuthService, etc.).
 * ============================================================
 */

// ============================================================
// SHARED HELPERS
// ============================================================

function _getTestUserId() {
  const all = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
  const admin = all.find(u => u['Role'] === 'Admin' || u.role === 'Admin');
  if (admin) return admin[CONFIG.COLUMNS.USER_ID] || admin['User ID'];
  const active = all.find(u => u['Status'] === 'Active' || u.status === 'Active');
  if (!active) {
    throw new Error('No active user found in database. Seed Users sheet first.');
  }
  return active[CONFIG.COLUMNS.USER_ID] || active['User ID'];
}

function _getTestStudentRoll() {
  const all = DatabaseService.readAllRows(CONFIG.SHEETS.STUDENTS) || [];
  if (all.length === 0) {
    throw new Error('No student found in database. Seed Students sheet first.');
  }
  return all[0]['Roll Number'] || all[0].roll_number;
}

function _getTestEventId() {
  const all = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
  if (all.length === 0) {
    throw new Error('No event found in database. Seed Events sheet first.');
  }
  return all[0]['Event ID'] || all[0].event_id;
}

function _cleanupTestReport(reportId) {
  if (!reportId) return;
  try {
    DatabaseService.hardDelete(CONFIG.SHEETS.GENERATED_REPORTS, 'Report ID', reportId);
    Logger.log('    [Cleanup] Deleted generated report: ' + reportId);
  } catch (e) {
    Logger.log('    [Cleanup] Warning: ' + e.message);
  }
}

// ============================================================
// INDIVIDUAL TEST FUNCTIONS
// ============================================================

function testGenerateAttendanceReport() {
  Logger.log('====================================');
  Logger.log('TEST: testGenerateAttendanceReport');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const eventId = _getTestEventId();

  // getEventReport simulates attendance reports
  const result = ReportService.getEventReport(userId, { eventId: eventId });

  if (result.success && Array.isArray(result.data)) {
    Logger.log('✅ PASS: Generated event attendance report successfully. Items = ' + result.data.length);
  } else {
    Logger.log('❌ FAIL: ' + result.message);
    throw new Error('testGenerateAttendanceReport FAILED');
  }
  Logger.log('');
}

function testGenerateStudentReport() {
  Logger.log('====================================');
  Logger.log('TEST: testGenerateStudentReport');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const rollNumber = _getTestStudentRoll();

  const result = ReportService.getStudentReport(userId, rollNumber);

  if (result.success && Array.isArray(result.data)) {
    Logger.log('✅ PASS: Generated student report successfully.');
  } else {
    Logger.log('❌ FAIL: ' + result.message);
    throw new Error('testGenerateStudentReport FAILED: ' + result.message);
  }
  Logger.log('');
}

function testGenerateDepartmentReport() {
  Logger.log('====================================');
  Logger.log('TEST: testGenerateDepartmentReport');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const result = ReportService.getDepartmentReport(userId, '');

  if (result.success && Array.isArray(result.data)) {
    Logger.log('✅ PASS: Generated department report successfully.');
  } else {
    Logger.log('❌ FAIL: ' + result.message);
    throw new Error('testGenerateDepartmentReport FAILED');
  }
  Logger.log('');
}

function testGenerateEventReport() {
  Logger.log('====================================');
  Logger.log('TEST: testGenerateEventReport');
  Logger.log('====================================');
  Logger.log('ℹ️ Covered by testGenerateAttendanceReport. Skipping.');
  Logger.log('✅ PASS');
  Logger.log('');
}

function testGenerateCoordinatorReport() {
  Logger.log('====================================');
  Logger.log('TEST: testGenerateCoordinatorReport');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const result = ReportService.getCoordinatorReport(userId);

  if (result.success && Array.isArray(result.data)) {
    Logger.log('✅ PASS: Generated coordinator report successfully.');
  } else {
    Logger.log('❌ FAIL: ' + result.message);
    throw new Error('testGenerateCoordinatorReport FAILED');
  }
  Logger.log('');
}

function testGenerateSummaryReport() {
  Logger.log('====================================');
  Logger.log('TEST: testGenerateSummaryReport (getDashboardSummary)');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const result = ReportService.getDashboardSummary(userId);

  if (result.success && result.report) {
    Logger.log('✅ PASS: Generated dashboard summary report successfully.');
  } else {
    Logger.log('❌ FAIL: ' + result.message);
    throw new Error('testGenerateSummaryReport FAILED');
  }
  Logger.log('');
}

function testGenerateDailyReport() {
  Logger.log('====================================');
  Logger.log('TEST: testGenerateDailyReport (getDateRangeReport)');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const nowStr = Utils.formatDate(new Date());

  const result = ReportService.getDateRangeReport(userId, nowStr, nowStr);

  if (result.success) {
    Logger.log('✅ PASS: Generated daily range report successfully.');
  } else {
    Logger.log('❌ FAIL: ' + result.message);
    throw new Error('testGenerateDailyReport FAILED');
  }
  Logger.log('');
}

function testGenerateMonthlyReport() {
  Logger.log('====================================');
  Logger.log('TEST: testGenerateMonthlyReport');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const result = ReportService.getMonthlyReport(userId, { month: 7, year: 2026 });

  if (result.success) {
    Logger.log('✅ PASS: Generated monthly report successfully.');
  } else {
    Logger.log('❌ FAIL: ' + result.message);
    throw new Error('testGenerateMonthlyReport FAILED');
  }
  Logger.log('');
}

function testGeneratePDF() {
  Logger.log('====================================');
  Logger.log('TEST: testGeneratePDF');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const eventId = _getTestEventId();

  const result = ReportService.generatePDF(eventId, userId);

  if (result.success) {
    Logger.log('✅ PASS: Simulated PDF generation successfully.');
    _cleanupTestReport(result.reportId);
  } else {
    Logger.log('❌ FAIL: ' + result.message);
    throw new Error('testGeneratePDF FAILED');
  }
  Logger.log('');
}

function testGenerateExcel() {
  Logger.log('====================================');
  Logger.log('TEST: testGenerateExcel');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const eventId = _getTestEventId();

  const result = ReportService.generateExcel(eventId, userId);

  if (result.success) {
    Logger.log('✅ PASS: Simulated Excel generation successfully.');
    _cleanupTestReport(result.reportId);
  } else {
    Logger.log('❌ FAIL: ' + result.message);
    throw new Error('testGenerateExcel FAILED');
  }
  Logger.log('');
}

function testGenerateCSV() {
  Logger.log('====================================');
  Logger.log('TEST: testGenerateCSV');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const eventId = _getTestEventId();

  const result = ReportService.generateCSV(eventId, userId);

  if (result.success) {
    Logger.log('✅ PASS: Simulated CSV generation successfully.');
    _cleanupTestReport(result.reportId);
  } else {
    Logger.log('❌ FAIL: ' + result.message);
    throw new Error('testGenerateCSV FAILED');
  }
  Logger.log('');
}

function testGetReportById() {
  Logger.log('====================================');
  Logger.log('TEST: testGetReportById');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const eventId = _getTestEventId();

  const genResult = ReportService.generatePDF(eventId, userId);
  const reportId = genResult.success ? genResult.reportId : null;

  if (!genResult.success || !reportId) {
    throw new Error('testGetReportById prerequisite FAILED');
  }

  const fetched = ReportService.getReportById(reportId);

  if (fetched && fetched['Report ID'] === reportId) {
    Logger.log('✅ PASS: Fetched report correctly by ID.');
  } else {
    Logger.log('❌ FAIL: Failed to fetch report by ID.');
    _cleanupTestReport(reportId);
    throw new Error('testGetReportById FAILED');
  }

  _cleanupTestReport(reportId);
  Logger.log('');
}

function testGetGeneratedReports() {
  Logger.log('====================================');
  Logger.log('TEST: testGetGeneratedReports');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const result = ReportService.getGeneratedReports(userId);

  if (Array.isArray(result)) {
    Logger.log('✅ PASS: Fetched generated reports list. Count = ' + result.length);
  } else {
    Logger.log('❌ FAIL: Result is not an array.');
    throw new Error('testGetGeneratedReports FAILED');
  }
  Logger.log('');
}

function testDeleteReport() {
  Logger.log('====================================');
  Logger.log('TEST: testDeleteReport');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const eventId = _getTestEventId();

  const genResult = ReportService.generatePDF(eventId, userId);
  const reportId = genResult.success ? genResult.reportId : null;

  if (!genResult.success || !reportId) {
    throw new Error('testDeleteReport prerequisite FAILED');
  }

  const result = ReportService.deleteReport(reportId, userId);

  if (result.success) {
    Logger.log('✅ PASS: Report deleted successfully.');
  } else {
    Logger.log('❌ FAIL: ' + result.message);
    _cleanupTestReport(reportId);
    throw new Error('testDeleteReport FAILED');
  }
  Logger.log('');
}

function testPagination() {
  Logger.log('====================================');
  Logger.log('TEST: testPagination');
  Logger.log('====================================');

  const limit = 5;
  const offset = 0;
  const page = DatabaseService.getRows(CONFIG.SHEETS.GENERATED_REPORTS, limit, offset);

  if (Array.isArray(page) && page.length <= limit) {
    Logger.log('✅ PASS: Paginated read returned correctly. Items = ' + page.length);
  } else {
    Logger.log('❌ FAIL: Paginated read failed.');
    throw new Error('testPagination FAILED');
  }
  Logger.log('');
}

function testSorting() {
  Logger.log('====================================');
  Logger.log('TEST: testSorting');
  Logger.log('====================================');

  const sorted = DatabaseService.sortByColumn(CONFIG.SHEETS.GENERATED_REPORTS, 'Report ID', true);

  if (Array.isArray(sorted)) {
    Logger.log('✅ PASS: Sorting returned correctly. Items = ' + sorted.length);
  } else {
    Logger.log('❌ FAIL: Sort failed.');
    throw new Error('testSorting FAILED');
  }
  Logger.log('');
}

function testEdgeCases() {
  Logger.log('====================================');
  Logger.log('TEST: testEdgeCases');
  Logger.log('====================================');

  const userId = _getTestUserId();

  // --- Edge Case 1: Non-existent Student Report ---
  const result1 = ReportService.getStudentReport(userId, '99A99A9999');
  if (!result1.success && result1.message.includes('not found')) {
    Logger.log('✅ PASS (Edge 1): Correctly rejected report lookup for non-existent student.');
  } else {
    throw new Error('testEdgeCases FAILED: Allowed report for non-existent student');
  }

  Logger.log('');
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================

function runReportServiceUnitTests() {
  Logger.log('╔══════════════════════════════════════════╗');
  Logger.log('║    REPORT SERVICE UNIT TESTS — START     ║');
  Logger.log('╚══════════════════════════════════════════╝');
  Logger.log('');

  var tests = [
    testGenerateAttendanceReport,
    testGenerateStudentReport,
    testGenerateDepartmentReport,
    testGenerateEventReport,
    testGenerateCoordinatorReport,
    testGenerateSummaryReport,
    testGenerateDailyReport,
    testGenerateMonthlyReport,
    testGeneratePDF,
    testGenerateExcel,
    testGenerateCSV,
    testGetReportById,
    testGetGeneratedReports,
    testDeleteReport,
    testPagination,
    testSorting,
    testEdgeCases
  ];

  var passed = 0;

  for (var i = 0; i < tests.length; i++) {
    try {
      tests[i]();
      passed++;
    } catch (err) {
      Logger.log('');
      Logger.log('🛑 STOP-ON-FAIL: ' + err.message);
      Logger.log('   Tests passed before failure: ' + passed);
      Logger.log('   Remaining tests skipped: ' + (tests.length - passed - 1));
      Logger.log('');
      return;
    }
  }

  Logger.log('╔══════════════════════════════════════════╗');
  Logger.log('║   ALL ' + passed + ' TESTS PASSED SUCCESSFULLY!   ║');
  Logger.log('╚══════════════════════════════════════════╝');
}
