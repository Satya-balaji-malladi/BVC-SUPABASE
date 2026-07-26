/**
 * EventServiceTest.js
 * ============================================================
 * Comprehensive unit test suite for EventService.js
 *
 * Rules:
 *  - Each function tests ONE public API method independently.
 *  - Every test creates its own data and cleans it up via hardDelete.
 *  - If any test throws, runEventServiceUnitTests() stops immediately.
 *  - Never modify stable modules (DatabaseService, AuthService, etc.).
 * ============================================================
 */

// ============================================================
// SHARED HELPERS
// ============================================================

/**
 * Returns the User ID of the first active Coordinator found in the Users sheet.
 * Throws if none exist — tests cannot run without a valid coordinator.
 */
function _getTestCoordinatorId() {
  var all = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
  var coordinator = all.find(function(u) {
    return String(u[CONFIG.COLUMNS.STATUS]).trim() === CONFIG.USER_STATUS.ACTIVE &&
           String(u[CONFIG.COLUMNS.ROLE]).trim()   === CONFIG.ROLES.COORDINATOR;
  });
  if (!coordinator) {
    throw new Error("No active Coordinator user found. Seed one in the Users sheet first.");
  }
  return String(coordinator[CONFIG.COLUMNS.USER_ID]).trim();
}

/**
 * Returns a base event payload using the given coordinatorId and optional date offset (+days).
 */
function _buildEventPayload(coordinatorId, dayOffset, overrides) {
  var d = new Date();
  d.setDate(d.getDate() + (dayOffset || 1));
  var ts  = new Date().getTime();
  var base = {
    [CONFIG.COLUMNS.EVENT_NAME]:     'Test Event ' + ts,
    [CONFIG.COLUMNS.START_DATE]:     Utils.formatDate(d),
    [CONFIG.COLUMNS.END_DATE]:       Utils.formatDate(d),
    [CONFIG.COLUMNS.START_TIME]:     '09:00',
    [CONFIG.COLUMNS.END_TIME]:       '17:00',
    [CONFIG.COLUMNS.VENUE]:          'Seminar Hall ' + ts,
    [CONFIG.COLUMNS.COORDINATOR_ID]: coordinatorId,
    [CONFIG.COLUMNS.DEPARTMENTS]:    'CSE',
    [CONFIG.COLUMNS.YEARS]:          '3',
    [CONFIG.COLUMNS.CAPACITY]:       100,
    [CONFIG.COLUMNS.STATUS]:         CONFIG.EVENT_STATUS.UPCOMING,
    [CONFIG.COLUMNS.CREATED_BY]:     'EventServiceTest'
  };
  return Object.assign(base, overrides || {});
}

/**
 * Hard-deletes an event record directly from the sheet (bypasses soft delete).
 * Safe to call even if eventId is null/undefined.
 */
function _deleteTestEvent(eventId) {
  if (!eventId) return;
  try {
    DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eventId);
    Logger.log('    [Cleanup] Deleted event: ' + eventId);
  } catch (e) {
    Logger.log('    [Cleanup] Warning: could not delete event ' + eventId + ' — ' + e.message);
  }
}

// ============================================================
// INDIVIDUAL TEST FUNCTIONS
// ============================================================

function unitTest_createEvent() {
  Logger.log('====================================');
  Logger.log('TEST: createEvent');
  Logger.log('====================================');

  var coordinatorId = _getTestCoordinatorId();
  var payload = _buildEventPayload(coordinatorId, 1);

  var result = EventService.createEvent(payload);

  var eventId = result && result.event ? result.event.event_id : null;

  if (result.success && eventId) {
    Logger.log('✅ PASS: Event created. ID = ' + eventId);
  } else {
    Logger.log('❌ FAIL: ' + (result.message || 'Unknown error'));
    _deleteTestEvent(eventId);
    throw new Error('unitTest_createEvent FAILED: ' + (result.message || ''));
  }

  _deleteTestEvent(eventId);
  Logger.log('');
}

// ─────────────────────────────────────────────────────────────
function unitTest_updateEvent() {
  Logger.log('====================================');
  Logger.log('TEST: updateEvent');
  Logger.log('====================================');

  var coordinatorId = _getTestCoordinatorId();
  var payload = _buildEventPayload(coordinatorId, 1);

  var createResult = EventService.createEvent(payload);
  var eventId = createResult && createResult.event ? createResult.event.event_id : null;

  if (!createResult.success || !eventId) {
    throw new Error('unitTest_updateEvent pre-requisite FAILED: could not create event — ' + createResult.message);
  }

  var updateData = {
    [CONFIG.COLUMNS.VENUE]:      'Main Auditorium',
    [CONFIG.COLUMNS.CAPACITY]:   200,
    [CONFIG.COLUMNS.UPDATED_BY]: 'EventServiceTest'
  };

  var updateResult = EventService.updateEvent(eventId, updateData);

  if (updateResult.success &&
      updateResult.event &&
      updateResult.event.venue === 'Main Auditorium') {
    Logger.log('✅ PASS: Event updated. Venue = ' + updateResult.event.venue);
  } else {
    Logger.log('❌ FAIL: ' + (updateResult.message || 'Fields not matched'));
    _deleteTestEvent(eventId);
    throw new Error('unitTest_updateEvent FAILED: ' + (updateResult.message || ''));
  }

  _deleteTestEvent(eventId);
  Logger.log('');
}

// ─────────────────────────────────────────────────────────────
function unitTest_deleteEvent() {
  Logger.log('====================================');
  Logger.log('TEST: deleteEvent');
  Logger.log('====================================');

  var coordinatorId = _getTestCoordinatorId();
  var payload = _buildEventPayload(coordinatorId, 1);

  var createResult = EventService.createEvent(payload);
  var eventId = createResult && createResult.event ? createResult.event.event_id : null;

  if (!createResult.success || !eventId) {
    throw new Error('unitTest_deleteEvent pre-requisite FAILED: ' + createResult.message);
  }

  var deleteResult = EventService.deleteEvent(eventId, 'EventServiceTest');

  if (!deleteResult.success) {
    Logger.log('❌ FAIL: deleteEvent returned failure — ' + deleteResult.message);
    _deleteTestEvent(eventId);
    throw new Error('unitTest_deleteEvent FAILED: ' + deleteResult.message);
  }

  // Verify soft-delete: getEventById should return null now.
  var fetched = EventService.getEventById(eventId);
  if (fetched === null) {
    Logger.log('✅ PASS: Soft-deleted event is no longer accessible.');
  } else {
    Logger.log('❌ FAIL: Event still returned after soft delete.');
    _deleteTestEvent(eventId);
    throw new Error('unitTest_deleteEvent FAILED: event still accessible after soft delete');
  }

  _deleteTestEvent(eventId);
  Logger.log('');
}

// ─────────────────────────────────────────────────────────────
function unitTest_getEventById() {
  Logger.log('====================================');
  Logger.log('TEST: getEventById');
  Logger.log('====================================');

  var coordinatorId = _getTestCoordinatorId();
  var payload = _buildEventPayload(coordinatorId, 1, {
    [CONFIG.COLUMNS.STATUS]: CONFIG.EVENT_STATUS.ACTIVE
  });

  var createResult = EventService.createEvent(payload);
  var eventId = createResult && createResult.event ? createResult.event.event_id : null;

  if (!createResult.success || !eventId) {
    throw new Error('unitTest_getEventById pre-requisite FAILED: ' + createResult.message);
  }

  var event = EventService.getEventById(eventId);

  if (event && event.event_id === eventId) {
    Logger.log('✅ PASS: getEventById returned correct record. ID = ' + event.event_id);
  } else {
    Logger.log('❌ FAIL: Returned event is null or has wrong ID.');
    _deleteTestEvent(eventId);
    throw new Error('unitTest_getEventById FAILED');
  }

  _deleteTestEvent(eventId);
  Logger.log('');
}

// ─────────────────────────────────────────────────────────────
function unitTest_getAllEvents() {
  Logger.log('====================================');
  Logger.log('TEST: getAllEvents');
  Logger.log('====================================');

  var coordinatorId = _getTestCoordinatorId();
  var payload = _buildEventPayload(coordinatorId, 1, {
    [CONFIG.COLUMNS.STATUS]: CONFIG.EVENT_STATUS.ACTIVE
  });

  var createResult = EventService.createEvent(payload);
  var eventId = createResult && createResult.event ? createResult.event.event_id : null;

  if (!createResult.success || !eventId) {
    throw new Error('unitTest_getAllEvents pre-requisite FAILED: ' + createResult.message);
  }

  var all = EventService.getAllEvents();
  var found = Array.isArray(all) && all.find(function(e) { return e.event_id === eventId; });

  if (found) {
    Logger.log('✅ PASS: getAllEvents includes the newly created event. Total: ' + all.length);
  } else {
    Logger.log('❌ FAIL: Newly created event not found in getAllEvents result.');
    _deleteTestEvent(eventId);
    throw new Error('unitTest_getAllEvents FAILED');
  }

  _deleteTestEvent(eventId);
  Logger.log('');
}

// ─────────────────────────────────────────────────────────────
function unitTest_searchEvents() {
  Logger.log('====================================');
  Logger.log('TEST: searchEvents');
  Logger.log('====================================');

  var coordinatorId = _getTestCoordinatorId();
  var ts = new Date().getTime();
  var uniquePhrase = 'SRCH' + ts;

  var payload = _buildEventPayload(coordinatorId, 1, {
    [CONFIG.COLUMNS.EVENT_NAME]: uniquePhrase + ' Event',
    [CONFIG.COLUMNS.VENUE]:      uniquePhrase + ' Hall',
    [CONFIG.COLUMNS.STATUS]:     CONFIG.EVENT_STATUS.ACTIVE
  });

  var createResult = EventService.createEvent(payload);
  var eventId = createResult && createResult.event ? createResult.event.event_id : null;

  if (!createResult.success || !eventId) {
    throw new Error('unitTest_searchEvents pre-requisite FAILED: ' + createResult.message);
  }

  var results = EventService.searchEvents(uniquePhrase);
  var found = Array.isArray(results) && results.find(function(e) { return e.event_id === eventId; });

  if (found) {
    Logger.log('✅ PASS: searchEvents matched unique phrase. Hits: ' + results.length);
  } else {
    Logger.log('❌ FAIL: Search returned no results for phrase: ' + uniquePhrase);
    _deleteTestEvent(eventId);
    throw new Error('unitTest_searchEvents FAILED');
  }

  _deleteTestEvent(eventId);
  Logger.log('');
}

// ─────────────────────────────────────────────────────────────
function unitTest_getEventsByCoordinator() {
  Logger.log('====================================');
  Logger.log('TEST: getEventsByCoordinator');
  Logger.log('====================================');

  var coordinatorId = _getTestCoordinatorId();
  var payload = _buildEventPayload(coordinatorId, 1, {
    [CONFIG.COLUMNS.STATUS]: CONFIG.EVENT_STATUS.ACTIVE
  });

  var createResult = EventService.createEvent(payload);
  var eventId = createResult && createResult.event ? createResult.event.event_id : null;

  if (!createResult.success || !eventId) {
    throw new Error('unitTest_getEventsByCoordinator pre-requisite FAILED: ' + createResult.message);
  }

  var coordEvents = EventService.getEventsByCoordinator(coordinatorId);
  var found = Array.isArray(coordEvents) && coordEvents.find(function(e) { return e.event_id === eventId; });

  if (found) {
    Logger.log('✅ PASS: getEventsByCoordinator returned the event. Total: ' + coordEvents.length);
  } else {
    Logger.log('❌ FAIL: Event not found in getEventsByCoordinator result.');
    _deleteTestEvent(eventId);
    throw new Error('unitTest_getEventsByCoordinator FAILED');
  }

  _deleteTestEvent(eventId);
  Logger.log('');
}

// ─────────────────────────────────────────────────────────────
function unitTest_getEventsByStatus() {
  Logger.log('====================================');
  Logger.log('TEST: getEventsByStatus');
  Logger.log('====================================');

  var coordinatorId = _getTestCoordinatorId();
  // Use DRAFT so this test event is unlikely to clash with real scheduled events.
  var payload = _buildEventPayload(coordinatorId, 1, {
    [CONFIG.COLUMNS.STATUS]: CONFIG.EVENT_STATUS.DRAFT
  });

  var createResult = EventService.createEvent(payload);
  var eventId = createResult && createResult.event ? createResult.event.event_id : null;

  if (!createResult.success || !eventId) {
    throw new Error('unitTest_getEventsByStatus pre-requisite FAILED: ' + createResult.message);
  }

  var statusEvents = EventService.getEventsByStatus(CONFIG.EVENT_STATUS.DRAFT);
  var found = Array.isArray(statusEvents) && statusEvents.find(function(e) { return e.event_id === eventId; });

  if (found) {
    Logger.log('✅ PASS: getEventsByStatus returned the DRAFT event.');
  } else {
    Logger.log('❌ FAIL: Event not found in getEventsByStatus(DRAFT) result.');
    _deleteTestEvent(eventId);
    throw new Error('unitTest_getEventsByStatus FAILED');
  }

  _deleteTestEvent(eventId);
  Logger.log('');
}

// ─────────────────────────────────────────────────────────────
function unitTest_getEventsByDate() {
  Logger.log('====================================');
  Logger.log('TEST: getEventsByDate');
  Logger.log('====================================');

  var coordinatorId = _getTestCoordinatorId();
  // Use dayOffset=5 to pick a date unlikely to conflict with existing data.
  var d = new Date();
  d.setDate(d.getDate() + 5);
  var targetDate = Utils.formatDate(d);

  var payload = _buildEventPayload(coordinatorId, 5, {
    [CONFIG.COLUMNS.STATUS]: CONFIG.EVENT_STATUS.UPCOMING
  });

  var createResult = EventService.createEvent(payload);
  var eventId = createResult && createResult.event ? createResult.event.event_id : null;

  if (!createResult.success || !eventId) {
    throw new Error('unitTest_getEventsByDate pre-requisite FAILED: ' + createResult.message);
  }

  var dateEvents = EventService.getEventsByDate(targetDate);
  var found = Array.isArray(dateEvents) && dateEvents.find(function(e) { return e.event_id === eventId; });

  if (found) {
    Logger.log('✅ PASS: getEventsByDate returned the event for date: ' + targetDate);
  } else {
    Logger.log('❌ FAIL: Event not found in getEventsByDate result for date: ' + targetDate);
    _deleteTestEvent(eventId);
    throw new Error('unitTest_getEventsByDate FAILED');
  }

  _deleteTestEvent(eventId);
  Logger.log('');
}

// ─────────────────────────────────────────────────────────────
function unitTest_filterEvents() {
  Logger.log('====================================');
  Logger.log('TEST: filterEvents');
  Logger.log('====================================');

  var coordinatorId = _getTestCoordinatorId();
  var ts = new Date().getTime();
  var uniqueVenue = 'FilterHall' + ts;

  var payload = _buildEventPayload(coordinatorId, 1, {
    [CONFIG.COLUMNS.VENUE]:  uniqueVenue,
    [CONFIG.COLUMNS.STATUS]: CONFIG.EVENT_STATUS.ACTIVE
  });

  var createResult = EventService.createEvent(payload);
  var eventId = createResult && createResult.event ? createResult.event.event_id : null;

  if (!createResult.success || !eventId) {
    throw new Error('unitTest_filterEvents pre-requisite FAILED: ' + createResult.message);
  }

  var filters = {};
  filters[CONFIG.COLUMNS.STATUS] = CONFIG.EVENT_STATUS.ACTIVE;
  filters[CONFIG.COLUMNS.COORDINATOR_ID] = coordinatorId;

  var filtered = EventService.filterEvents(filters);
  var found = Array.isArray(filtered) && filtered.find(function(e) { return e.event_id === eventId; });

  if (found) {
    Logger.log('✅ PASS: filterEvents with status+coordinator returned the event. Matches: ' + filtered.length);
  } else {
    Logger.log('❌ FAIL: filterEvents did not return the expected event.');
    _deleteTestEvent(eventId);
    throw new Error('unitTest_filterEvents FAILED');
  }

  _deleteTestEvent(eventId);
  Logger.log('');
}

// ─────────────────────────────────────────────────────────────
function unitTest_sortEvents() {
  Logger.log('====================================');
  Logger.log('TEST: sortEvents');
  Logger.log('====================================');

  // sortEvents does not require a test record — it operates on existing data.
  var sorted = EventService.sortEvents(CONFIG.COLUMNS.START_DATE, 'asc');

  if (Array.isArray(sorted)) {
    Logger.log('✅ PASS: sortEvents returned an array. Count: ' + sorted.length);
  } else {
    Logger.log('❌ FAIL: sortEvents did not return an array.');
    throw new Error('unitTest_sortEvents FAILED');
  }

  // Verify ordering is correct (ascending) if we have 2+ items.
  if (sorted.length >= 2) {
    var a = sorted[0][CONFIG.COLUMNS.START_DATE] || '';
    var b = sorted[1][CONFIG.COLUMNS.START_DATE] || '';
    if (String(a) > String(b)) {
      Logger.log('❌ FAIL: Sort order incorrect (asc) — first item is later than second.');
      throw new Error('unitTest_sortEvents FAILED: ordering incorrect');
    }
    Logger.log('✅ PASS: Ascending sort order verified.');
  }

  Logger.log('');
}

// ─────────────────────────────────────────────────────────────
function unitTest_paginateEvents() {
  Logger.log('====================================');
  Logger.log('TEST: paginateEvents');
  Logger.log('====================================');

  var page     = 1;
  var pageSize = 5;

  var result = EventService.paginateEvents(page, pageSize);

  if (result &&
      typeof result.totalRecords === 'number' &&
      typeof result.totalPages   === 'number' &&
      Array.isArray(result.items) &&
      result.items.length <= pageSize) {
    Logger.log('✅ PASS: paginateEvents returned valid structure. TotalRecords: ' + result.totalRecords + ', Items on page: ' + result.items.length);
  } else {
    Logger.log('❌ FAIL: paginateEvents returned invalid structure.');
    throw new Error('unitTest_paginateEvents FAILED');
  }

  // Edge: invalid page (page=0) must return empty gracefully.
  var bad = EventService.paginateEvents(0, 10);
  if (bad && bad.items !== undefined && Array.isArray(bad.items) && bad.items.length === 0) {
    Logger.log('✅ PASS: paginateEvents(0, 10) handled invalid page gracefully.');
  } else {
    Logger.log('❌ FAIL: paginateEvents(0, 10) did not return empty items for invalid page.');
    throw new Error('unitTest_paginateEvents edge-case FAILED');
  }

  Logger.log('');
}

// ─────────────────────────────────────────────────────────────
function unitTest_edgeCases() {
  Logger.log('====================================');
  Logger.log('TEST: Edge Cases');
  Logger.log('====================================');

  // --- Edge 1: Invalid coordinator ---
  var coordinatorId = _getTestCoordinatorId();
  var d = new Date(); d.setDate(d.getDate() + 1);
  var ts = new Date().getTime();

  var invalidPayload = {
    [CONFIG.COLUMNS.EVENT_NAME]:     'EdgeCase Event ' + ts,
    [CONFIG.COLUMNS.START_DATE]:     Utils.formatDate(d),
    [CONFIG.COLUMNS.END_DATE]:       Utils.formatDate(d),
    [CONFIG.COLUMNS.START_TIME]:     '10:00',
    [CONFIG.COLUMNS.END_TIME]:       '12:00',
    [CONFIG.COLUMNS.VENUE]:          'EdgeHall',
    [CONFIG.COLUMNS.COORDINATOR_ID]: 'NON_EXISTENT_USR_' + ts,
    [CONFIG.COLUMNS.STATUS]:         CONFIG.EVENT_STATUS.DRAFT,
    [CONFIG.COLUMNS.CREATED_BY]:     'EventServiceTest'
  };

  var r1 = EventService.createEvent(invalidPayload);
  if (!r1.success) {
    Logger.log('✅ PASS (Edge 1): Correctly rejected event with invalid coordinator.');
  } else {
    if (r1.event) _deleteTestEvent(r1.event.event_id);
    throw new Error('unitTest_edgeCases FAILED: Invalid coordinator was accepted');
  }

  // --- Edge 2: Duplicate prevention ---
  var uniqueVenue = 'DupHall' + ts;
  var dupPayload = _buildEventPayload(coordinatorId, 2, {
    [CONFIG.COLUMNS.VENUE]:  uniqueVenue,
    [CONFIG.COLUMNS.STATUS]: CONFIG.EVENT_STATUS.UPCOMING
  });

  var create1 = EventService.createEvent(dupPayload);
  var eventId1 = create1 && create1.event ? create1.event.event_id : null;

  if (!create1.success || !eventId1) {
    throw new Error('unitTest_edgeCases (Edge 2 setup) FAILED: ' + create1.message);
  }

  var create2 = EventService.createEvent(dupPayload); // exact same payload
  if (!create2.success) {
    Logger.log('✅ PASS (Edge 2): Correctly blocked exact duplicate event creation.');
  } else {
    if (create2.event) _deleteTestEvent(create2.event.event_id);
    _deleteTestEvent(eventId1);
    throw new Error('unitTest_edgeCases FAILED: Duplicate event was allowed');
  }

  _deleteTestEvent(eventId1);

  // --- Edge 3: getEventById with non-existent ID ---
  var r3 = EventService.getEventById('EVT-9999-9999');
  if (r3 === null) {
    Logger.log('✅ PASS (Edge 3): getEventById returned null for non-existent ID.');
  } else {
    throw new Error('unitTest_edgeCases FAILED: getEventById should return null for missing ID');
  }

  // --- Edge 4: updateEvent with non-existent ID ---
  var r4 = EventService.updateEvent('EVT-9999-9999', { [CONFIG.COLUMNS.VENUE]: 'Any' });
  if (!r4.success) {
    Logger.log('✅ PASS (Edge 4): updateEvent correctly returned failure for non-existent ID.');
  } else {
    throw new Error('unitTest_edgeCases FAILED: updateEvent should fail for non-existent ID');
  }

  Logger.log('');
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================

function unitTest_eventRegistrationSettings() {
  Logger.log('====================================');
  Logger.log('TEST: eventRegistrationSettings');
  Logger.log('====================================');

  var coordinatorId = _getTestCoordinatorId();
  
  // 1. Test creation with registration settings
  var payload = _buildEventPayload(coordinatorId, 1, {
    [CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION]: 'Yes',
    [CONFIG.COLUMNS.EVENT_REGISTRATION_OPEN]: '2026-07-22T08:00',
    [CONFIG.COLUMNS.EVENT_REGISTRATION_CLOSE]: '2026-07-25T18:00',
    [CONFIG.COLUMNS.EVENT_MAXIMUM_SEATS]: 50,
    [CONFIG.COLUMNS.EVENT_ALLOW_SPOT_REGISTRATION]: 'Yes',
    [CONFIG.COLUMNS.EVENT_REGISTRATION_FIELDS]: JSON.stringify([{name: 'T-Shirt Size', type: 'text', required: true}]),
    [CONFIG.COLUMNS.EVENT_TERMS_AND_CONDITIONS]: 'Follow the rules.'
  });

  var result = EventService.createEvent(payload);
  var eventId = result && result.event ? result.event.event_id : null;

  if (!result.success || !eventId) {
    throw new Error('Failed to create event with registration settings: ' + result.message);
  }

  var createdEvent = EventService.getEventById(eventId);
  
  // Verify columns are stored correctly
  if (createdEvent[CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION] !== 'Yes') {
    _deleteTestEvent(eventId);
    throw new Error('Enable Registration setting not saved');
  }
  if (parseInt(createdEvent[CONFIG.COLUMNS.EVENT_MAXIMUM_SEATS], 10) !== 50) {
    _deleteTestEvent(eventId);
    throw new Error('Maximum Seats setting not saved');
  }
  if (!createdEvent[CONFIG.COLUMNS.EVENT_REGISTRATION_URL]) {
    _deleteTestEvent(eventId);
    throw new Error('Registration URL was not automatically generated');
  }
  
  Logger.log('✅ PASS: Event created with registration settings and unique URL generated: ' + createdEvent[CONFIG.COLUMNS.EVENT_REGISTRATION_URL]);

  // 2. Try to update registration settings when close date has passed (mock close date in past)
  // Temporarily update event directly in sheet to simulate past close date
  DatabaseService.updateRow(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eventId, {
    [CONFIG.COLUMNS.EVENT_REGISTRATION_CLOSE]: '2026-07-20T08:00'
  });

  // Now attempt to update registration setting through EventService
  var updateResult = EventService.updateEvent(eventId, {
    [CONFIG.COLUMNS.EVENT_MAXIMUM_SEATS]: 60
  }, coordinatorId); // Updater coordinator

  if (updateResult.success) {
    _deleteTestEvent(eventId);
    throw new Error('FAIL: Update succeeded even though registration is closed.');
  }
  
  Logger.log('✅ PASS: Prohibited updating registration settings when registration is closed: ' + updateResult.message);

  // Clean up
  _deleteTestEvent(eventId);
  Logger.log('');
}

/**
 * Runs all EventService unit tests sequentially.
 * Stops immediately on the first failure (stop-on-fail rule).
 *
 * Run this function from the Google Apps Script editor.
 */
function runEventServiceUnitTests() {
  Logger.log('╔══════════════════════════════════════════╗');
  Logger.log('║   EVENT SERVICE UNIT TESTS — STARTING    ║');
  Logger.log('╚══════════════════════════════════════════╝');
  Logger.log('');

  var tests = [
    unitTest_createEvent,
    unitTest_updateEvent,
    unitTest_deleteEvent,
    unitTest_getEventById,
    unitTest_getAllEvents,
    unitTest_eventRegistrationSettings,
    unitTest_searchEvents,
    unitTest_getEventsByCoordinator,
    unitTest_getEventsByStatus,
    unitTest_getEventsByDate,
    unitTest_filterEvents,
    unitTest_sortEvents,
    unitTest_paginateEvents,
    unitTest_edgeCases
  ];

  var passed = 0;
  var failed = 0;

  for (var i = 0; i < tests.length; i++) {
    try {
      tests[i]();
      passed++;
    } catch (err) {
      failed++;
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
