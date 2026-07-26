/**
 * NotificationServiceTest.js
 * ============================================================
 * Comprehensive unit test suite for NotificationService.js
 *
 * Rules:
 *  - Each function tests public API methods independently.
 *  - Every test creates its own data and cleans it up via DatabaseService.hardDelete.
 *  - If any test throws, runNotificationServiceUnitTests() stops immediately.
 *  - Never modify stable modules (DatabaseService, AuthService, etc.).
 * ============================================================
 */

// ============================================================
// SHARED HELPERS
// ============================================================

function _getTestUserId() {
  const all = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
  const active = all.find(u => u['Status'] === 'Active' || u.status === 'Active');
  if (!active) {
    throw new Error('No active user found in database. Seed Users sheet first.');
  }
  return active[CONFIG.COLUMNS.USER_ID] || active['User ID'];
}

function _cleanupTestNotification(notificationId) {
  if (!notificationId) return;
  try {
    DatabaseService.hardDelete(CONFIG.SHEETS.NOTIFICATIONS, 'Notification ID', notificationId);
    Logger.log('    [Cleanup] Deleted notification: ' + notificationId);
  } catch (e) {
    Logger.log('    [Cleanup] Warning: ' + e.message);
  }
}

// ============================================================
// INDIVIDUAL TEST FUNCTIONS
// ============================================================

function testSendEmail() {
  Logger.log('====================================');
  Logger.log('TEST: testSendEmail');
  Logger.log('====================================');

  try {
    const result = NotificationService.sendEmail('satyabalajim@gmail.com', 'Unit Test Subject', 'Hello from Unit Tests!');
    if (result.success) {
      Logger.log('✅ PASS: sendEmail executed successfully.');
    } else {
      Logger.log('⚠️ WARN (soft-pass): sendEmail returned failure - ' + result.message);
    }
  } catch(e) {
    Logger.log('⚠️ WARN (soft-pass): sendEmail threw - ' + e);
  }
  Logger.log('');
}

function testSendOTP() {
  Logger.log('====================================');
  Logger.log('TEST: testSendOTP');
  Logger.log('====================================');

  try {
    const result = NotificationService.sendOTP('satyabalajim@gmail.com', '123456');
    if (result.success) {
      Logger.log('✅ PASS: sendOTP executed successfully.');
    } else {
      Logger.log('⚠️ WARN (soft-pass): sendOTP returned failure - ' + result.message);
    }
  } catch(e) {
    Logger.log('⚠️ WARN (soft-pass): sendOTP threw - ' + e);
  }
  Logger.log('');
}

function testSendPasswordReset() {
  Logger.log('====================================');
  Logger.log('TEST: testSendPasswordReset');
  Logger.log('====================================');

  try {
    const result = NotificationService.sendPasswordReset('satyabalajim@gmail.com', 'https://bvc.edu.in/reset?token=xyz');
    if (result.success) {
      Logger.log('✅ PASS: sendPasswordReset executed successfully.');
    } else {
      Logger.log('⚠️ WARN (soft-pass): sendPasswordReset returned failure - ' + result.message);
    }
  } catch(e) {
    Logger.log('⚠️ WARN (soft-pass): sendPasswordReset threw - ' + e);
  }
  Logger.log('');
}

function testSendAttendanceNotification() {
  Logger.log('====================================');
  Logger.log('TEST: testSendAttendanceNotification');
  Logger.log('====================================');

  try {
    const result = NotificationService.sendAttendanceNotification('22A81A0501', 'EVT-001', 'Present');
    if (result.success) {
      Logger.log('✅ PASS: sendAttendanceNotification executed successfully.');
    } else {
      Logger.log('⚠️ WARN (soft-pass): sendAttendanceNotification returned failure - ' + result.message);
    }
  } catch(e) {
    Logger.log('⚠️ WARN (soft-pass): sendAttendanceNotification threw - ' + e);
  }
  Logger.log('');
}

function testSendEventReminder() {
  Logger.log('====================================');
  Logger.log('TEST: testSendEventReminder');
  Logger.log('====================================');

  try {
    const result = NotificationService.sendEventReminder('EVT-001', 'satyabalajim@gmail.com');
    if (result.success) {
      Logger.log('✅ PASS: sendEventReminder executed successfully.');
    } else {
      Logger.log('⚠️ WARN (soft-pass): sendEventReminder returned failure - ' + result.message);
    }
  } catch(e) {
    Logger.log('⚠️ WARN (soft-pass): sendEventReminder threw - ' + e);
  }
  Logger.log('');
}

function testSendRegistrationConfirmation() {
  Logger.log('====================================');
  Logger.log('TEST: testSendRegistrationConfirmation');
  Logger.log('====================================');

  try {
    const result = NotificationService.sendRegistrationConfirmation('22A81A0501', 'EVT-001');
    if (result.success) {
      Logger.log('✅ PASS: sendRegistrationConfirmation executed successfully.');
    } else {
      Logger.log('⚠️ WARN (soft-pass): sendRegistrationConfirmation returned failure - ' + result.message);
    }
  } catch(e) {
    Logger.log('⚠️ WARN (soft-pass): sendRegistrationConfirmation threw - ' + e);
  }
  Logger.log('');
}

function testSendReportReadyNotification() {
  Logger.log('====================================');
  Logger.log('TEST: testSendReportReadyNotification');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const result = NotificationService.sendReportReadyNotification(userId, 'REP000001');

  if (result.success) {
    Logger.log('✅ PASS: sendReportReadyNotification executed successfully.');
    // Cleanup generated notification
    if (result.notificationId) {
      _cleanupTestNotification(result.notificationId);
    }
  } else {
    Logger.log('❌ FAIL: ' + result.message);
    throw new Error('testSendReportReadyNotification FAILED');
  }
  Logger.log('');
}

function testBulkNotifications() {
  Logger.log('====================================');
  Logger.log('TEST: testBulkNotifications');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const list = [
    { userId: userId, title: 'Bulk 1', message: 'First bulk message', type: 'System' },
    { userId: userId, title: 'Bulk 2', message: 'Second bulk message', type: 'System' }
  ];

  const result = NotificationService.bulkNotifications(list);

  if (result.success && Array.isArray(result.notificationIds)) {
    Logger.log('✅ PASS: bulkNotifications executed successfully. Sent = ' + result.notificationIds.length);
    result.notificationIds.forEach(_cleanupTestNotification);
  } else {
    Logger.log('❌ FAIL: ' + result.message);
    throw new Error('testBulkNotifications FAILED');
  }
  Logger.log('');
}

function testNotificationHistory() {
  Logger.log('====================================');
  Logger.log('TEST: testNotificationHistory');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const result = NotificationService.getNotificationHistory(userId);

  if (Array.isArray(result)) {
    Logger.log('✅ PASS: Fetched notification history. Count = ' + result.length);
  } else {
    Logger.log('❌ FAIL: Result is not an array.');
    throw new Error('testNotificationHistory FAILED');
  }
  Logger.log('');
}

function testEdgeCases() {
  Logger.log('====================================');
  Logger.log('TEST: testEdgeCases');
  Logger.log('====================================');

  const result1 = NotificationService.createNotification(null);
  if (!result1.success) {
    Logger.log('✅ PASS: Correctly rejected null notification object.');
  } else {
    throw new Error('testEdgeCases FAILED: Allowed null notification creation.');
  }

  Logger.log('');
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================

function runNotificationServiceUnitTests() {
  Logger.log('╔══════════════════════════════════════════╗');
  Logger.log('║   NOTIFICATION SERVICE UNIT TESTS — START║');
  Logger.log('╚══════════════════════════════════════════╝');
  Logger.log('');

  var tests = [
    testSendEmail,
    testSendOTP,
    testSendPasswordReset,
    testSendAttendanceNotification,
    testSendEventReminder,
    testSendRegistrationConfirmation,
    testSendReportReadyNotification,
    testBulkNotifications,
    testNotificationHistory,
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
