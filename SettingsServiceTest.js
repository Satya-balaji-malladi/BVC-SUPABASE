/**
 * SettingsServiceTest.js
 * ============================================================
 * Comprehensive unit test suite for SettingsService.js
 *
 * Rules:
 *  - Each function tests public API methods independently.
 *  - Every test creates its own data and cleans it up via DatabaseService.hardDelete.
 *  - If any test throws, runSettingsServiceUnitTests() stops immediately.
 * ============================================================
 */

function _cleanupTestSetting(settingId) {
  if (!settingId) return;
  try {
    DatabaseService.hardDelete(CONFIG.SHEETS.SETTINGS, 'Setting ID', settingId);
    Logger.log('    [Cleanup] Deleted setting ID: ' + settingId);
  } catch (e) {
    Logger.log('    [Cleanup] Warning: ' + e.message);
  }
}

// ============================================================
// INDIVIDUAL TEST FUNCTIONS
// ============================================================

function testCreateSetting() {
  Logger.log('====================================');
  Logger.log('TEST: testCreateSetting');
  Logger.log('====================================');

  // Pre-cleanup if exists
  const existing = SettingsService.getSetting('TEST_KEY_1');
  if (existing) {
    _cleanupTestSetting(existing['Setting ID'] || existing.setting_id);
  }

  const result = SettingsService.createSetting('System', 'TEST_KEY_1', 'TestValue', 'String', 'Description', true, 'Active', 'System');
  let settingId = null;

  if (result.success && result.setting) {
    settingId = result.setting['Setting ID'];
    Logger.log('✅ PASS: Setting created successfully. ID = ' + settingId);
  } else {
    Logger.log('❌ FAIL: ' + result.message);
    throw new Error('testCreateSetting FAILED');
  }

  _cleanupTestSetting(settingId);
  Logger.log('');
}

function testUpdateSetting() {
  Logger.log('====================================');
  Logger.log('TEST: testUpdateSetting');
  Logger.log('====================================');

  const existing = SettingsService.getSetting('TEST_KEY_2');
  if (existing) {
    _cleanupTestSetting(existing['Setting ID'] || existing.setting_id);
  }

  const createRes = SettingsService.createSetting('System', 'TEST_KEY_2', 'InitialValue', 'String', 'Description', true, 'Active', 'System');
  const settingId = createRes.success && createRes.setting ? createRes.setting['Setting ID'] : null;

  if (!createRes.success || !settingId) {
    throw new Error('testUpdateSetting prerequisite FAILED');
  }

  const updateRes = SettingsService.updateSetting(settingId, { Value: 'NewValue' }, 'System');

  if (updateRes.success) {
    Logger.log('✅ PASS: Setting updated successfully.');
  } else {
    Logger.log('❌ FAIL: ' + updateRes.message);
    _cleanupTestSetting(settingId);
    throw new Error('testUpdateSetting FAILED');
  }

  _cleanupTestSetting(settingId);
  Logger.log('');
}

function testDeleteSetting() {
  Logger.log('====================================');
  Logger.log('TEST: testDeleteSetting');
  Logger.log('====================================');

  const existing = SettingsService.getSetting('TEST_KEY_3');
  if (existing) {
    _cleanupTestSetting(existing['Setting ID'] || existing.setting_id);
  }

  const createRes = SettingsService.createSetting('System', 'TEST_KEY_3', 'Val', 'String', 'Description', true, 'Active', 'System');
  const settingId = createRes.success && createRes.setting ? createRes.setting['Setting ID'] : null;

  if (!createRes.success || !settingId) {
    throw new Error('testDeleteSetting prerequisite FAILED');
  }

  const deleteRes = SettingsService.deleteSetting(settingId, 'System');

  if (deleteRes.success) {
    Logger.log('✅ PASS: Setting deleted successfully.');
  } else {
    Logger.log('❌ FAIL: ' + deleteRes.message);
    _cleanupTestSetting(settingId);
    throw new Error('testDeleteSetting FAILED');
  }
  Logger.log('');
}

function testGetSetting() {
  Logger.log('====================================');
  Logger.log('TEST: testGetSetting');
  Logger.log('====================================');

  const existing = SettingsService.getSetting('TEST_KEY_4');
  if (existing) {
    _cleanupTestSetting(existing['Setting ID'] || existing.setting_id);
  }

  const createRes = SettingsService.createSetting('System', 'TEST_KEY_4', 'Val', 'String', 'Desc', true, 'Active', 'System');
  const settingId = createRes.success && createRes.setting ? createRes.setting['Setting ID'] : null;

  const found = SettingsService.getSetting('TEST_KEY_4');

  if (found && found['Key'] === 'TEST_KEY_4') {
    Logger.log('✅ PASS: Setting retrieved successfully by key.');
  } else {
    Logger.log('❌ FAIL: Failed to locate setting by key.');
    _cleanupTestSetting(settingId);
    throw new Error('testGetSetting FAILED');
  }

  _cleanupTestSetting(settingId);
  Logger.log('');
}

function testGetCategory() {
  Logger.log('====================================');
  Logger.log('TEST: testGetCategory');
  Logger.log('====================================');

  const list = SettingsService.getCategory('System');

  if (Array.isArray(list)) {
    Logger.log('✅ PASS: Category listing succeeded. Count = ' + list.length);
  } else {
    Logger.log('❌ FAIL: Result is not an array.');
    throw new Error('testGetCategory FAILED');
  }
  Logger.log('');
}

function testEnableSetting() {
  Logger.log('====================================');
  Logger.log('TEST: testEnableSetting');
  Logger.log('====================================');

  const existing = SettingsService.getSetting('TEST_KEY_5');
  if (existing) {
    _cleanupTestSetting(existing['Setting ID'] || existing.setting_id);
  }

  const createRes = SettingsService.createSetting('System', 'TEST_KEY_5', 'Val', 'String', 'Desc', true, 'Inactive', 'System');
  const settingId = createRes.success && createRes.setting ? createRes.setting['Setting ID'] : null;

  const enableRes = SettingsService.enableSetting(settingId, 'System');

  if (enableRes.success) {
    Logger.log('✅ PASS: Setting enabled (status changed to Active).');
  } else {
    Logger.log('❌ FAIL: ' + enableRes.message);
    _cleanupTestSetting(settingId);
    throw new Error('testEnableSetting FAILED');
  }

  _cleanupTestSetting(settingId);
  Logger.log('');
}

function testDisableSetting() {
  Logger.log('====================================');
  Logger.log('TEST: testDisableSetting');
  Logger.log('====================================');

  const existing = SettingsService.getSetting('TEST_KEY_6');
  if (existing) {
    _cleanupTestSetting(existing['Setting ID'] || existing.setting_id);
  }

  const createRes = SettingsService.createSetting('System', 'TEST_KEY_6', 'Val', 'String', 'Desc', true, 'Active', 'System');
  const settingId = createRes.success && createRes.setting ? createRes.setting['Setting ID'] : null;

  const disableRes = SettingsService.disableSetting(settingId, 'System');

  if (disableRes.success) {
    Logger.log('✅ PASS: Setting disabled (status changed to Inactive).');
  } else {
    Logger.log('❌ FAIL: ' + disableRes.message);
    _cleanupTestSetting(settingId);
    throw new Error('testDisableSetting FAILED');
  }

  _cleanupTestSetting(settingId);
  Logger.log('');
}

function testSystemSettings() {
  Logger.log('====================================');
  Logger.log('TEST: testSystemSettings');
  Logger.log('====================================');

  const result = SettingsService.getSystemSettings();
  if (Array.isArray(result)) {
    Logger.log('✅ PASS: getSystemSettings succeeded.');
  } else {
    throw new Error('testSystemSettings FAILED');
  }
  Logger.log('');
}

function testAttendanceSettings() {
  Logger.log('====================================');
  Logger.log('TEST: testAttendanceSettings');
  Logger.log('====================================');

  const result = SettingsService.getAttendanceSettings();
  if (Array.isArray(result)) {
    Logger.log('✅ PASS: getAttendanceSettings succeeded.');
  } else {
    throw new Error('testAttendanceSettings FAILED');
  }
  Logger.log('');
}

function testNotificationSettings() {
  Logger.log('====================================');
  Logger.log('TEST: testNotificationSettings');
  Logger.log('====================================');

  const result = SettingsService.getNotificationSettings();
  if (Array.isArray(result)) {
    Logger.log('✅ PASS: getNotificationSettings succeeded.');
  } else {
    throw new Error('testNotificationSettings FAILED');
  }
  Logger.log('');
}

function testEmailSettings() {
  Logger.log('====================================');
  Logger.log('TEST: testEmailSettings');
  Logger.log('====================================');

  const result = SettingsService.getEmailSettings();
  if (Array.isArray(result)) {
    Logger.log('✅ PASS: getEmailSettings succeeded.');
  } else {
    throw new Error('testEmailSettings FAILED');
  }
  Logger.log('');
}

function testSecuritySettings() {
  Logger.log('====================================');
  Logger.log('TEST: testSecuritySettings');
  Logger.log('====================================');

  const result = SettingsService.getSecuritySettings();
  if (Array.isArray(result)) {
    Logger.log('✅ PASS: getSecuritySettings succeeded.');
  } else {
    throw new Error('testSecuritySettings FAILED');
  }
  Logger.log('');
}

function testEdgeCases() {
  Logger.log('====================================');
  Logger.log('TEST: testEdgeCases');
  Logger.log('====================================');

  const result = SettingsService.createSetting('', '', '');
  if (!result.success) {
    Logger.log('✅ PASS: Correctly rejected setting creation with missing keys.');
  } else {
    throw new Error('testEdgeCases FAILED');
  }
  Logger.log('');
}

function testMaintenanceAuthorization() {
  Logger.log('====================================');
  Logger.log('TEST: testMaintenanceAuthorization');
  Logger.log('====================================');

  const allUsers = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
  const coord = allUsers.find(u => u['Role'] === 'Coordinator' || u.role === 'Coordinator');
  
  if (coord) {
    const userId = coord['User ID'] || coord.user_id;
    const clearRes = SettingsService.clearAttendanceLogs(userId);
    const resetRes = SettingsService.resetSystem(userId);

    if (!clearRes.success && clearRes.message.includes('Unauthorized') &&
        !resetRes.success && resetRes.message.includes('Unauthorized')) {
      Logger.log('✅ PASS: Correctly blocked unauthorized coordinator from clear & reset.');
    } else {
      throw new Error('testMaintenanceAuthorization FAILED: Allowed coordinator access');
    }
  } else {
    Logger.log('⚠️ SKIPPED: No coordinator user available to test validation block.');
  }
  Logger.log('');
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================

function runSettingsServiceUnitTests() {
  Logger.log('╔══════════════════════════════════════════╗');
  Logger.log('║    SETTINGS SERVICE UNIT TESTS — START   ║');
  Logger.log('╚══════════════════════════════════════════╝');
  Logger.log('');

  var tests = [
    testCreateSetting,
    testUpdateSetting,
    testDeleteSetting,
    testGetSetting,
    testGetCategory,
    testEnableSetting,
    testDisableSetting,
    testSystemSettings,
    testAttendanceSettings,
    testNotificationSettings,
    testEmailSettings,
    testSecuritySettings,
    testEdgeCases,
    testMaintenanceAuthorization
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
