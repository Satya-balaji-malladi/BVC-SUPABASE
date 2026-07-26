/**
 * AnalyticsServiceTest.js
 * ============================================================
 * Unit tests for AnalyticsService.js
 * ============================================================
 */

function _getAnalyticsTestUserId() {
  const all = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
  const admin = all.find(u => u['Role'] === 'Admin' || u.role === 'Admin');
  if (admin) return admin[CONFIG.COLUMNS.USER_ID] || admin['User ID'];
  const active = all.find(u => u['Status'] === 'Active' || u.status === 'Active');
  if (!active) {
    throw new Error('No active user found in database. Seed Users sheet first.');
  }
  return active[CONFIG.COLUMNS.USER_ID] || active['User ID'];
}

function testGetAnalyticsSummary() {
  Logger.log('====================================');
  Logger.log('TEST: testGetAnalyticsSummary');
  Logger.log('====================================');

  const userId = _getAnalyticsTestUserId();
  const res = AnalyticsService.getAnalyticsSummary(userId);

  if (res.success && res.summary) {
    Logger.log('✅ PASS: Analytics summary retrieved.');
    Logger.log('   Total Events: ' + res.summary.totalEvents);
    Logger.log('   Total Check-ins: ' + res.summary.totalCheckIns);
  } else {
    throw new Error('testGetAnalyticsSummary FAILED: ' + res.message);
  }
  Logger.log('');
}

function testGetTrendData() {
  Logger.log('====================================');
  Logger.log('TEST: testGetTrendData');
  Logger.log('====================================');

  const userId = _getAnalyticsTestUserId();
  const res = AnalyticsService.getTrendData(userId);

  if (res.success && Array.isArray(res.labels)) {
    Logger.log('✅ PASS: Trend data retrieved. Labels size = ' + res.labels.length);
  } else {
    throw new Error('testGetTrendData FAILED: ' + res.message);
  }
  Logger.log('');
}

function testGetDepartmentData() {
  Logger.log('====================================');
  Logger.log('TEST: testGetDepartmentData');
  Logger.log('====================================');

  const userId = _getAnalyticsTestUserId();
  const res = AnalyticsService.getDepartmentData(userId);

  if (res.success && Array.isArray(res.labels)) {
    Logger.log('✅ PASS: Department wise data retrieved.');
  } else {
    throw new Error('testGetDepartmentData FAILED');
  }
  Logger.log('');
}

function testGetEventWiseData() {
  Logger.log('====================================');
  Logger.log('TEST: testGetEventWiseData');
  Logger.log('====================================');

  const userId = _getAnalyticsTestUserId();
  const res = AnalyticsService.getEventWiseData(userId);

  if (res.success && Array.isArray(res.labels)) {
    Logger.log('✅ PASS: Event wise data retrieved.');
  } else {
    throw new Error('testGetEventWiseData FAILED');
  }
  Logger.log('');
}

function testGetCheckInPatterns() {
  Logger.log('====================================');
  Logger.log('TEST: testGetCheckInPatterns');
  Logger.log('====================================');

  const userId = _getAnalyticsTestUserId();
  const res = AnalyticsService.getCheckInPatterns(userId);

  if (res.success && Array.isArray(res.labels)) {
    Logger.log('✅ PASS: Check-in hourly pattern data retrieved.');
  } else {
    throw new Error('testGetCheckInPatterns FAILED');
  }
  Logger.log('');
}

function testGetPerformanceDistribution() {
  Logger.log('====================================');
  Logger.log('TEST: testGetPerformanceDistribution');
  Logger.log('====================================');

  const userId = _getAnalyticsTestUserId();
  const res = AnalyticsService.getPerformanceDistribution(userId);

  if (res.success && Array.isArray(res.labels)) {
    Logger.log('✅ PASS: Performance distribution data retrieved.');
  } else {
    throw new Error('testGetPerformanceDistribution FAILED');
  }
  Logger.log('');
}

function testGetDefaulterDistribution() {
  Logger.log('====================================');
  Logger.log('TEST: testGetDefaulterDistribution');
  Logger.log('====================================');

  const userId = _getAnalyticsTestUserId();
  const res = AnalyticsService.getDefaulterDistribution(userId);

  if (res.success && Array.isArray(res.labels)) {
    Logger.log('✅ PASS: Defaulters distribution data retrieved.');
  } else {
    throw new Error('testGetDefaulterDistribution FAILED');
  }
  Logger.log('');
}

function testGetLeaderboard() {
  Logger.log('====================================');
  Logger.log('TEST: testGetLeaderboard');
  Logger.log('====================================');

  const userId = _getAnalyticsTestUserId();
  const res = AnalyticsService.getLeaderboard(userId);

  if (res.success && Array.isArray(res.leaderboard)) {
    Logger.log('✅ PASS: Leaderboard data retrieved. Rank 1 = ' + (res.leaderboard[0] ? res.leaderboard[0].student_name : 'None'));
  } else {
    throw new Error('testGetLeaderboard FAILED');
  }
  Logger.log('');
}

function runAnalyticsServiceUnitTests() {
  Logger.log('╔══════════════════════════════════════════╗');
  Logger.log('║    ANALYTICS SERVICE UNIT TESTS — START  ║');
  Logger.log('╚══════════════════════════════════════════╝');
  Logger.log('');

  var tests = [
    testGetAnalyticsSummary,
    testGetTrendData,
    testGetDepartmentData,
    testGetEventWiseData,
    testGetCheckInPatterns,
    testGetPerformanceDistribution,
    testGetDefaulterDistribution,
    testGetLeaderboard
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
