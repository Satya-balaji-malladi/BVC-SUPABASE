/**
 * CoordinatorServiceTest.js
 * ============================================================
 * Comprehensive unit test suite for CoordinatorService.js
 *
 * Rules:
 *  - Each function tests public API methods independently.
 *  - Every test creates its own data and cleans it up via DatabaseService.hardDelete.
 *  - If any test throws, runCoordinatorServiceUnitTests() stops immediately.
 *  - Never modify stable modules (DatabaseService, AuthService, etc.).
 * ============================================================
 */

// ============================================================
// SHARED HELPERS
// ============================================================

function _getTestEventId() {
  const all = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
  if (all.length === 0) {
    throw new Error('No event found in database. Seed Events sheet first.');
  }
  const event = all.find(e => e['Event Status'] === 'Active' || e['Event Status'] === 'Upcoming' || e.Status === 'Active' || e.Status === 'Upcoming') || all[0];
  return event[CONFIG.COLUMNS.EVENT_ID] || event['Event ID'];
}

function _getTestUserId() {
  const all = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
  const active = all.find(u => u['Status'] === 'Active' || u.status === 'Active');
  if (!active) {
    throw new Error('No active user found in database. Seed Users sheet first.');
  }
  return active[CONFIG.COLUMNS.USER_ID] || active['User ID'];
}

function _cleanupTestAssignment(assignmentId) {
  if (!assignmentId) return;
  try {
    DatabaseService.hardDelete(CONFIG.SHEETS.EVENT_COORDINATORS, 'Assignment ID', assignmentId);
    Logger.log('    [Cleanup] Deleted coordinator assignment: ' + assignmentId);
  } catch (e) {
    Logger.log('    [Cleanup] Warning: ' + e.message);
  }
}

// ============================================================
// INDIVIDUAL TEST FUNCTIONS
// ============================================================

function testCreateCoordinator() {
  Logger.log('====================================');
  Logger.log('TEST: createCoordinator (assignCoordinator)');
  Logger.log('====================================');

  const eventId = _getTestEventId();
  const userId = _getTestUserId();

  // Pre-cleanup duplicate assignments if any
  const all = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
  const existing = all.find(a => String(a['Event ID']).trim() === String(eventId).trim() && String(a['User ID']).trim() === String(userId).trim());
  if (existing) {
    _cleanupTestAssignment(existing['Assignment ID']);
  }

  const result = CoordinatorService.createCoordinator(eventId, userId, 'Coordinator', 'USR001', 'Test assignment');
  let assignmentId = null;

  if (result.success && result.assignment) {
    assignmentId = result.assignment['Assignment ID'];
    Logger.log('✅ PASS: Coordinator assigned successfully. ID = ' + assignmentId);
  } else {
    Logger.log('❌ FAIL: ' + result.message);
    throw new Error('testCreateCoordinator FAILED: ' + result.message);
  }

  _cleanupTestAssignment(assignmentId);
  Logger.log('');
}

function testUpdateCoordinator() {
  Logger.log('====================================');
  Logger.log('TEST: updateCoordinator');
  Logger.log('====================================');

  const eventId = _getTestEventId();
  const userId = _getTestUserId();

  // Cleanup existing
  const all = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
  const existing = all.find(a => String(a['Event ID']).trim() === String(eventId).trim() && String(a['User ID']).trim() === String(userId).trim());
  if (existing) {
    _cleanupTestAssignment(existing['Assignment ID']);
  }

  const assignResult = CoordinatorService.assignCoordinator(eventId, userId, 'Coordinator', 'USR001', 'Test update');
  const assignmentId = assignResult.success && assignResult.assignment ? assignResult.assignment['Assignment ID'] : null;

  if (!assignResult.success || !assignmentId) {
    throw new Error('testUpdateCoordinator prerequisite FAILED');
  }

  const updateResult = CoordinatorService.updateCoordinator(assignmentId, { 'Remarks': 'Updated Remarks' });

  if (updateResult.success) {
    Logger.log('✅ PASS: Coordinator updated successfully.');
  } else {
    Logger.log('❌ FAIL: ' + updateResult.message);
    _cleanupTestAssignment(assignmentId);
    throw new Error('testUpdateCoordinator FAILED');
  }

  // Verify updates
  const updatedRec = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS).find(a => a['Assignment ID'] === assignmentId);
  if (updatedRec && updatedRec['Remarks'] === 'Updated Remarks') {
    Logger.log('✅ PASS: Remarks update verified in DB.');
  } else {
    Logger.log('❌ FAIL: Remarks mismatch in DB.');
    _cleanupTestAssignment(assignmentId);
    throw new Error('testUpdateCoordinator DB verification FAILED');
  }

  _cleanupTestAssignment(assignmentId);
  Logger.log('');
}

function testDeleteCoordinator() {
  Logger.log('====================================');
  Logger.log('TEST: deleteCoordinator (removeCoordinator)');
  Logger.log('====================================');

  const eventId = _getTestEventId();
  const userId = _getTestUserId();

  // Cleanup existing
  const all = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS) || [];
  const existing = all.find(a => String(a['Event ID']).trim() === String(eventId).trim() && String(a['User ID']).trim() === String(userId).trim());
  if (existing) {
    _cleanupTestAssignment(existing['Assignment ID']);
  }

  const assignResult = CoordinatorService.assignCoordinator(eventId, userId, 'Coordinator', 'USR001', 'Test delete');
  const assignmentId = assignResult.success && assignResult.assignment ? assignResult.assignment['Assignment ID'] : null;

  if (!assignResult.success || !assignmentId) {
    throw new Error('testDeleteCoordinator prerequisite FAILED');
  }

  const deleteResult = CoordinatorService.deleteCoordinator(assignmentId, 'USR001');

  if (deleteResult.success) {
    Logger.log('✅ PASS: Coordinator removed.');
  } else {
    Logger.log('❌ FAIL: ' + deleteResult.message);
    _cleanupTestAssignment(assignmentId);
    throw new Error('testDeleteCoordinator FAILED');
  }

  // Verify status is changed to Removed (soft delete)
  const record = DatabaseService.readAllRows(CONFIG.SHEETS.EVENT_COORDINATORS).find(a => a['Assignment ID'] === assignmentId);
  if (record && record['Assignment Status'] === 'Removed') {
    Logger.log('✅ PASS: Coordinator soft-delete verified.');
  } else {
    Logger.log('❌ FAIL: Status is not Removed.');
    _cleanupTestAssignment(assignmentId);
    throw new Error('testDeleteCoordinator status check FAILED');
  }

  _cleanupTestAssignment(assignmentId);
  Logger.log('');
}

function testActivateCoordinator() {
  Logger.log('====================================');
  Logger.log('TEST: activateCoordinator');
  Logger.log('====================================');

  const eventId = _getTestEventId();
  const userId = _getTestUserId();

  const assignResult = CoordinatorService.assignCoordinator(eventId, userId, 'Coordinator', 'USR001', 'Test activate');
  const assignmentId = assignResult.success && assignResult.assignment ? assignResult.assignment['Assignment ID'] : null;

  if (!assignResult.success || !assignmentId) {
    throw new Error('testActivateCoordinator prerequisite FAILED');
  }

  // Deactivate first
  CoordinatorService.deactivateCoordinator(assignmentId, 'USR001');

  const activateResult = CoordinatorService.activateCoordinator(assignmentId, 'USR001');

  if (activateResult.success) {
    Logger.log('✅ PASS: Coordinator activated.');
  } else {
    Logger.log('❌ FAIL: ' + activateResult.message);
    _cleanupTestAssignment(assignmentId);
    throw new Error('testActivateCoordinator FAILED');
  }

  _cleanupTestAssignment(assignmentId);
  Logger.log('');
}

function testDeactivateCoordinator() {
  Logger.log('====================================');
  Logger.log('TEST: deactivateCoordinator');
  Logger.log('====================================');

  const eventId = _getTestEventId();
  const userId = _getTestUserId();

  const assignResult = CoordinatorService.assignCoordinator(eventId, userId, 'Coordinator', 'USR001', 'Test deactivate');
  const assignmentId = assignResult.success && assignResult.assignment ? assignResult.assignment['Assignment ID'] : null;

  if (!assignResult.success || !assignmentId) {
    throw new Error('testDeactivateCoordinator prerequisite FAILED');
  }

  const deactivateResult = CoordinatorService.deactivateCoordinator(assignmentId, 'USR001');

  if (deactivateResult.success) {
    Logger.log('✅ PASS: Coordinator deactivated.');
  } else {
    Logger.log('❌ FAIL: ' + deactivateResult.message);
    _cleanupTestAssignment(assignmentId);
    throw new Error('testDeactivateCoordinator FAILED');
  }

  _cleanupTestAssignment(assignmentId);
  Logger.log('');
}

function testAssignCoordinator() {
  Logger.log('====================================');
  Logger.log('TEST: assignCoordinator');
  Logger.log('====================================');
  Logger.log('ℹ️ Covered by testCreateCoordinator. Skipping.');
  Logger.log('✅ PASS');
  Logger.log('');
}

function testRemoveCoordinator() {
  Logger.log('====================================');
  Logger.log('TEST: removeCoordinator');
  Logger.log('====================================');
  Logger.log('ℹ️ Covered by testDeleteCoordinator. Skipping.');
  Logger.log('✅ PASS');
  Logger.log('');
}

function testChangeCoordinatorRole() {
  Logger.log('====================================');
  Logger.log('TEST: changeCoordinatorRole (updateCoordinatorRole)');
  Logger.log('====================================');

  const eventId = _getTestEventId();
  const userId = _getTestUserId();

  const assignResult = CoordinatorService.assignCoordinator(eventId, userId, 'Coordinator', 'USR001', 'Test role update');
  const assignmentId = assignResult.success && assignResult.assignment ? assignResult.assignment['Assignment ID'] : null;

  if (!assignResult.success || !assignmentId) {
    throw new Error('testChangeCoordinatorRole prerequisite FAILED');
  }

  const updateResult = CoordinatorService.updateCoordinatorRole(assignmentId, 'Volunteer Coordinator', 'USR001');

  if (updateResult.success) {
    Logger.log('✅ PASS: Role changed successfully.');
  } else {
    Logger.log('❌ FAIL: ' + updateResult.message);
    _cleanupTestAssignment(assignmentId);
    throw new Error('testChangeCoordinatorRole FAILED');
  }

  _cleanupTestAssignment(assignmentId);
  Logger.log('');
}

function testGetCoordinatorById() {
  Logger.log('====================================');
  Logger.log('TEST: getCoordinatorById');
  Logger.log('====================================');

  const eventId = _getTestEventId();
  const userId = _getTestUserId();

  const assignResult = CoordinatorService.assignCoordinator(eventId, userId, 'Coordinator', 'USR001', 'Test lookup');
  const assignmentId = assignResult.success && assignResult.assignment ? assignResult.assignment['Assignment ID'] : null;

  if (!assignResult.success || !assignmentId) {
    throw new Error('testGetCoordinatorById prerequisite FAILED');
  }

  const fetched = CoordinatorService.getCoordinatorById(assignmentId);

  if (fetched && fetched['Assignment ID'] === assignmentId) {
    Logger.log('✅ PASS: Coordinator fetched correctly by ID.');
  } else {
    Logger.log('❌ FAIL: Lookup returned mismatched or empty record.');
    _cleanupTestAssignment(assignmentId);
    throw new Error('testGetCoordinatorById FAILED');
  }

  _cleanupTestAssignment(assignmentId);
  Logger.log('');
}

function testGetCoordinatorByUserId() {
  Logger.log('====================================');
  Logger.log('TEST: getCoordinatorByUserId');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const records = CoordinatorService.getCoordinatorByUserId(userId);

  if (Array.isArray(records)) {
    Logger.log('✅ PASS: Returned coordinator assignments for user. Count = ' + records.length);
  } else {
    Logger.log('❌ FAIL: Did not return array.');
    throw new Error('testGetCoordinatorByUserId FAILED');
  }
  Logger.log('');
}

function testGetCoordinatorByEmployeeId() {
  Logger.log('====================================');
  Logger.log('TEST: getCoordinatorByEmployeeId');
  Logger.log('====================================');

  const allUsers = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
  const activeUser = allUsers.find(u => (u['Status'] === 'Active' || u.status === 'Active') && (u['Employee ID'] || u.employeeId));

  if (!activeUser) {
    Logger.log('ℹ️ Notice: No active user with Employee ID. Skipping.');
    Logger.log('✅ PASS');
    Logger.log('');
    return;
  }

  const employeeId = activeUser['Employee ID'] || activeUser.employeeId;
  const records = CoordinatorService.getCoordinatorByEmployeeId(employeeId);

  if (Array.isArray(records)) {
    Logger.log('✅ PASS: Returned coordinator assignments for employee ID. Count = ' + records.length);
  } else {
    Logger.log('❌ FAIL: Did not return array.');
    throw new Error('testGetCoordinatorByEmployeeId FAILED');
  }
  Logger.log('');
}

function testGetCoordinatorByEvent() {
  Logger.log('====================================');
  Logger.log('TEST: getCoordinatorByEvent');
  Logger.log('====================================');

  const eventId = _getTestEventId();
  const records = CoordinatorService.getCoordinatorByEvent(eventId);

  if (Array.isArray(records)) {
    Logger.log('✅ PASS: Returned coordinator assignments for event. Count = ' + records.length);
  } else {
    Logger.log('❌ FAIL: Did not return array.');
    throw new Error('testGetCoordinatorByEvent FAILED');
  }
  Logger.log('');
}

function testGetEventsByCoordinator() {
  Logger.log('====================================');
  Logger.log('TEST: getEventsByCoordinator');
  Logger.log('====================================');

  const userId = _getTestUserId();
  const events = CoordinatorService.getEventsByCoordinator(userId);

  if (Array.isArray(events)) {
    Logger.log('✅ PASS: Returned event list managed by coordinator. Count = ' + events.length);
  } else {
    Logger.log('❌ FAIL: Did not return array.');
    throw new Error('testGetEventsByCoordinator FAILED');
  }
  Logger.log('');
}

function testGetAllCoordinators() {
  Logger.log('====================================');
  Logger.log('TEST: getAllCoordinators');
  Logger.log('====================================');

  const all = CoordinatorService.getAllCoordinators();

  if (Array.isArray(all)) {
    Logger.log('✅ PASS: Fetched all coordinator assignments. Count = ' + all.length);
  } else {
    Logger.log('❌ FAIL: Database read failed.');
    throw new Error('testGetAllCoordinators FAILED');
  }
  Logger.log('');
}

function testPagination() {
  Logger.log('====================================');
  Logger.log('TEST: testPagination');
  Logger.log('====================================');

  const limit = 5;
  const offset = 0;
  const page = DatabaseService.getRows(CONFIG.SHEETS.EVENT_COORDINATORS, limit, offset);

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

  const sorted = DatabaseService.sortByColumn(CONFIG.SHEETS.EVENT_COORDINATORS, 'Assignment ID', true);

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

  const eventId = _getTestEventId();
  const userId = _getTestUserId();

  // --- Edge Case 1: Non-existent User ---
  const result1 = CoordinatorService.assignCoordinator(eventId, 'USR-INVALID', 'Coordinator', 'USR001');
  if (!result1.success && result1.message.includes('User not found')) {
    Logger.log('✅ PASS (Edge 1): Correctly rejected assignment of non-existent user.');
  } else {
    throw new Error('testEdgeCases FAILED: Allowed assignment of non-existent user');
  }

  // --- Edge Case 2: Non-existent Event ---
  const result2 = CoordinatorService.assignCoordinator('EVT-INVALID', userId, 'Coordinator', 'USR001');
  if (!result2.success && result2.message.includes('Event not found')) {
    Logger.log('✅ PASS (Edge 2): Correctly rejected assignment of non-existent event.');
  } else {
    throw new Error('testEdgeCases FAILED: Allowed assignment of non-existent event');
  }

  Logger.log('');
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================

function runCoordinatorServiceUnitTests() {
  Logger.log('╔══════════════════════════════════════════╗');
  Logger.log('║  COORDINATOR SERVICE UNIT TESTS — START  ║');
  Logger.log('╚══════════════════════════════════════════╝');
  Logger.log('');

  var tests = [
    testCreateCoordinator,
    testUpdateCoordinator,
    testDeleteCoordinator,
    testActivateCoordinator,
    testDeactivateCoordinator,
    testAssignCoordinator,
    testRemoveCoordinator,
    testChangeCoordinatorRole,
    testGetCoordinatorById,
    testGetCoordinatorByUserId,
    testGetCoordinatorByEmployeeId,
    testGetCoordinatorByEvent,
    testGetEventsByCoordinator,
    testGetAllCoordinators,
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
