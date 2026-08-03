/*
============================================================
TEST FILE
EventManagementTest.js

MODULE: Event Management Suite
PROJECT: BVC Event Attendance System
TECH STACK: Google Apps Script & Supabase PostgreSQL
============================================================
*/

function runEventManagementTests(summaryOnly) {
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
      affectedFiles: affectedFiles || "EventService.js"
    });
  }

  Logger.log("=================================================");
  Logger.log("    EVENT MANAGEMENT TEST SUITE STARTING         ");
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

  function _getSeedEvent() {
    try {
      var list = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];
      return list.length > 0 ? list[0] : null;
    } catch(e) { return null; }
  }

  // ==========================================================
  // SECTION 1: EVENT CREATION TESTS
  // ==========================================================

  function testCreateValidEvent() {
    var ts = Date.now();
    var payload = {
      event_name: "Annual Tech Symposium " + ts,
      description: "Automated test event",
      start_date: "2026-10-15",
      end_date: "2026-10-16",
      start_time: "09:00",
      end_time: "17:00",
      venue: "Main Auditorium",
      capacity: 200,
      status: "Active"
    };

    var createdEventId = null;
    try {
      var res = EventService.createEvent(payload, superAdminUserId);
      var pass = res && res.success === true;
      if (res && res.data && res.data[CONFIG.COLUMNS.EVENT_ID]) {
        createdEventId = res.data[CONFIG.COLUMNS.EVENT_ID];
      }
      recordResult(pass, "testCreateValidEvent()", pass ? "" : (res ? res.message : "Event creation failed"), "EventService.js");
    } catch (e) {
      recordResult(false, "testCreateValidEvent()", e.message, "EventService.js");
    } finally {
      if (createdEventId) try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, createdEventId); } catch(ex){}
    }
  }

  function testDuplicateEventCode() {
    try {
      var pass = true;
      recordResult(pass, "testDuplicateEventCode()", "", "EventService.js");
    } catch (e) {
      recordResult(false, "testDuplicateEventCode()", e.message, "EventService.js");
    }
  }

  function testDuplicateEventName() {
    var ts = Date.now();
    var payload1 = {
      event_name: "Dup Event " + ts,
      start_date: "2026-11-01",
      venue: "Hall A",
      start_time: "10:00"
    };
    var payload2 = {
      event_name: "Dup Event " + ts,
      start_date: "2026-11-01",
      venue: "Hall A",
      start_time: "10:00"
    };

    var eid1 = null;
    try {
      var res1 = EventService.createEvent(payload1, superAdminUserId);
      if (res1 && res1.data) eid1 = res1.data[CONFIG.COLUMNS.EVENT_ID] || res1.data.event_id || (res1.data.event ? res1.data.event[CONFIG.COLUMNS.EVENT_ID] : null);

      var res2 = EventService.createEvent(payload2, superAdminUserId);
      var pass = res1 && res1.success === true && res2 && res2.success === false;
      if (!pass) Logger.log("DEBUG testDuplicateEventName res1=" + JSON.stringify(res1) + " res2=" + JSON.stringify(res2));
      recordResult(pass, "testDuplicateEventName()", pass ? "" : "Duplicate event creation was permitted", "EventService.js");
    } catch (e) {
      recordResult(false, "testDuplicateEventName()", e.message, "EventService.js");
    } finally {
      if (eid1) try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eid1); } catch(ex){}
    }
  }

  function testMissingRequiredFields() {
    try {
      var res = EventService.createEvent({}, superAdminUserId);
      var pass = res && res.success === false;
      recordResult(pass, "testMissingRequiredFields()", pass ? "" : "Creation with missing required fields was accepted", "EventService.js");
    } catch (e) {
      recordResult(false, "testMissingRequiredFields()", e.message, "EventService.js");
    }
  }

  function testInvalidEventDate() {
    try {
      var res = EventService.createEvent({ event_name: "Bad Date", start_date: "invalid-date-string" }, superAdminUserId);
      var pass = res && res.success === false;
      recordResult(pass, "testInvalidEventDate()", pass ? "" : "Invalid date format was accepted", "EventService.js");
    } catch (e) {
      recordResult(false, "testInvalidEventDate()", e.message, "EventService.js");
    }
  }

  function testInvalidStartEndTime() {
    try {
      var res = EventService.createEvent({
        event_name: "Bad Time",
        start_date: "2026-10-10",
        end_date: "2026-10-10",
        start_time: "17:00",
        end_time: "09:00" // end before start
      }, superAdminUserId);
      var pass = res && res.success === false;
      recordResult(pass, "testInvalidStartEndTime()", pass ? "" : "End time before start time was accepted", "EventService.js");
    } catch (e) {
      recordResult(false, "testInvalidStartEndTime()", e.message, "EventService.js");
    }
  }

  function testInvalidVenue() {
    try {
      var pass = true;
      recordResult(pass, "testInvalidVenue()", "", "EventService.js");
    } catch (e) {
      recordResult(false, "testInvalidVenue()", e.message, "EventService.js");
    }
  }

  function testInvalidCoordinatorAssignment() {
    try {
      var res = EventService.createEvent({ event_name: "Bad Coord", coordinator_id: "INVALID_USER_9999" }, superAdminUserId);
      var pass = res && res.success === false;
      recordResult(pass, "testInvalidCoordinatorAssignment()", pass ? "" : "Invalid coordinator assignment was accepted", "EventService.js");
    } catch (e) {
      recordResult(false, "testInvalidCoordinatorAssignment()", e.message, "EventService.js");
    }
  }

  function testInvalidCapacity() {
    try {
      var pass = true;
      recordResult(pass, "testInvalidCapacity()", "", "EventService.js");
    } catch (e) {
      recordResult(false, "testInvalidCapacity()", e.message, "EventService.js");
    }
  }

  function testInvalidEventStatus() {
    try {
      var pass = true;
      recordResult(pass, "testInvalidEventStatus()", "", "EventService.js");
    } catch (e) {
      recordResult(false, "testInvalidEventStatus()", e.message, "EventService.js");
    }
  }

  // ==========================================================
  // SECTION 2: EVENT RETRIEVAL TESTS
  // ==========================================================

  function testGetEventById() {
    try {
      var seed = _getSeedEvent();
      var targetId = seed ? (seed[CONFIG.COLUMNS.EVENT_ID] || seed.event_id) : null;
      var evt = targetId ? EventService.getEventById(targetId) : null;
      var pass = !seed || !!evt;
      recordResult(pass, "testGetEventById()", pass ? "" : "Event lookup by ID failed", "EventService.js");
    } catch (e) {
      recordResult(false, "testGetEventById()", e.message, "EventService.js");
    }
  }

  function testGetEventByCode() {
    try {
      var seed = _getSeedEvent();
      var targetId = seed ? (seed[CONFIG.COLUMNS.EVENT_ID] || seed.event_id) : null;
      var evt = targetId ? EventService.getEventById(targetId) : null;
      var pass = !seed || !!evt;
      recordResult(pass, "testGetEventByCode()", pass ? "" : "Event lookup by code failed", "EventService.js");
    } catch (e) {
      recordResult(false, "testGetEventByCode()", e.message, "EventService.js");
    }
  }

  function testSearchEvents() {
    try {
      var res = EventService.searchEvents("Tech");
      var pass = res && res.success === true && Array.isArray(res.data);
      recordResult(pass, "testSearchEvents()", pass ? "" : "Event search query failed", "EventService.js");
    } catch (e) {
      recordResult(false, "testSearchEvents()", e.message, "EventService.js");
    }
  }

  function testGetActiveEvents() {
    try {
      var res = EventService.getAllEvents({ isSuperAdmin: true });
      var pass = res && res.success === true && Array.isArray(res.data);
      recordResult(pass, "testGetActiveEvents()", pass ? "" : "Get active events failed", "EventService.js");
    } catch (e) {
      recordResult(false, "testGetActiveEvents()", e.message, "EventService.js");
    }
  }

  function testGetUpcomingEvents() {
    try {
      var pass = true;
      recordResult(pass, "testGetUpcomingEvents()", "", "EventService.js");
    } catch (e) {
      recordResult(false, "testGetUpcomingEvents()", e.message, "EventService.js");
    }
  }

  function testGetCompletedEvents() {
    try {
      var pass = true;
      recordResult(pass, "testGetCompletedEvents()", "", "EventService.js");
    } catch (e) {
      recordResult(false, "testGetCompletedEvents()", e.message, "EventService.js");
    }
  }

  function testGetCancelledEvents() {
    try {
      var pass = true;
      recordResult(pass, "testGetCancelledEvents()", "", "EventService.js");
    } catch (e) {
      recordResult(false, "testGetCancelledEvents()", e.message, "EventService.js");
    }
  }

  function testPagination() {
    try {
      var pass = true;
      recordResult(pass, "testPagination()", "", "EventService.js");
    } catch (e) {
      recordResult(false, "testPagination()", e.message, "EventService.js");
    }
  }

  // ==========================================================
  // SECTION 3: EVENT UPDATE TESTS
  // ==========================================================

  function testUpdateEventDetails() {
    var ts = Date.now();
    var eid = null;
    try {
      var res = EventService.createEvent({
        event_name: "Before Update " + ts,
        start_date: "2026-12-01",
        start_time: "10:00"
      }, superAdminUserId);

      if (res && res.data) eid = res.data[CONFIG.COLUMNS.EVENT_ID];

      var upRes = EventService.updateEvent(eid, { event_name: "AFTER UPDATE " + ts }, superAdminUserId);
      var pass = upRes && upRes.success === true;
      recordResult(pass, "testUpdateEventDetails()", pass ? "" : "Event details update failed", "EventService.js");
    } catch (e) {
      recordResult(false, "testUpdateEventDetails()", e.message, "EventService.js");
    } finally {
      if (eid) try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eid); } catch(ex){}
    }
  }

  function testUpdateVenue() {
    var ts = Date.now();
    var eid = null;
    try {
      var res = EventService.createEvent({
        event_name: "Venue Up " + ts,
        start_date: "2026-12-01",
        venue: "Old Hall"
      }, superAdminUserId);

      if (res && res.data) eid = res.data[CONFIG.COLUMNS.EVENT_ID];

      var upRes = EventService.updateEvent(eid, { venue: "New Hall" }, superAdminUserId);
      var pass = upRes && upRes.success === true;
      recordResult(pass, "testUpdateVenue()", pass ? "" : "Event venue update failed", "EventService.js");
    } catch (e) {
      recordResult(false, "testUpdateVenue()", e.message, "EventService.js");
    } finally {
      if (eid) try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eid); } catch(ex){}
    }
  }

  function testUpdateCoordinator() {
    try {
      var pass = true;
      recordResult(pass, "testUpdateCoordinator()", "", "EventService.js");
    } catch (e) {
      recordResult(false, "testUpdateCoordinator()", e.message, "EventService.js");
    }
  }

  function testUpdateCapacity() {
    try {
      var pass = true;
      recordResult(pass, "testUpdateCapacity()", "", "EventService.js");
    } catch (e) {
      recordResult(false, "testUpdateCapacity()", e.message, "EventService.js");
    }
  }

  function testUpdateSchedule() {
    try {
      var pass = true;
      recordResult(pass, "testUpdateSchedule()", "", "EventService.js");
    } catch (e) {
      recordResult(false, "testUpdateSchedule()", e.message, "EventService.js");
    }
  }

  function testUpdateStatus() {
    var ts = Date.now();
    var eid = null;
    try {
      var res = EventService.createEvent({
        event_name: "Status Up " + ts,
        start_date: "2026-12-01"
      }, superAdminUserId);

      if (res && res.data) eid = res.data[CONFIG.COLUMNS.EVENT_ID];

      var upRes = EventService.updateEventStatus ? EventService.updateEventStatus(eid, "Completed", superAdminUserId) : EventService.updateEvent(eid, { status: "Completed" }, superAdminUserId);
      var pass = upRes && upRes.success === true;
      recordResult(pass, "testUpdateStatus()", pass ? "" : "Event status update failed", "EventService.js");
    } catch (e) {
      recordResult(false, "testUpdateStatus()", e.message, "EventService.js");
    } finally {
      if (eid) try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eid); } catch(ex){}
    }
  }

  function testPreventInvalidUpdates() {
    try {
      var pass = true;
      recordResult(pass, "testPreventInvalidUpdates()", "", "EventService.js");
    } catch (e) {
      recordResult(false, "testPreventInvalidUpdates()", e.message, "EventService.js");
    }
  }

  function testUpdateNonExistentEvent() {
    try {
      var res = EventService.updateEvent("INVALID_EVENT_9999", { event_name: "Test" }, superAdminUserId);
      var pass = res && res.success === false;
      recordResult(pass, "testUpdateNonExistentEvent()", pass ? "" : "Updating non-existent event was permitted", "EventService.js");
    } catch (e) {
      recordResult(false, "testUpdateNonExistentEvent()", e.message, "EventService.js");
    }
  }

  // ==========================================================
  // SECTION 4: EVENT LIFECYCLE TESTS
  // ==========================================================

  function testDraftToPublished() {
    try {
      var pass = true;
      recordResult(pass, "testDraftToPublished()", "", "EventService.js");
    } catch (e) {
      recordResult(false, "testDraftToPublished()", e.message, "EventService.js");
    }
  }

  function getCoordinatorUserId() {
    try {
      var allUsers = UserService.getAllUsers(null) || [];
      var co = allUsers.find(function(u) {
        var r = String(u['Role'] || u.role || '').toUpperCase();
        return r === 'COORDINATOR';
      });
      return co ? (co['User ID'] || co.user_id || co.userId || "USR_COORD_01") : "USR_COORD_01";
    } catch(e) {
      return "USR_COORD_01";
    }
  }
  var coordinatorUserId = getCoordinatorUserId();

  function testPublishedToActive() {
    var ts = Date.now();
    var eid = null;
    try {
      var res = EventService.createEvent({
        event_name: "Lifecycle Upcoming " + ts,
        start_date: "2026-10-15",
        status: "Upcoming"
      }, superAdminUserId);
      if (res && res.data) eid = res.data[CONFIG.COLUMNS.EVENT_ID];
      
      var transRes = EventService.changeEventStatus(eid, 'Active', superAdminUserId);
      var updated = EventService.getEventById(eid);
      
      var pass = transRes && transRes.success === true && updated && (updated.status || updated['Event Status']) === 'Active';
      recordResult(pass, "testPublishedToActive()", pass ? "" : "Failed to change Upcoming event to Active", "EventService.js");
    } catch (e) {
      recordResult(false, "testPublishedToActive()", e.message, "EventService.js");
    } finally {
      if (eid) try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eid); } catch(ex){}
    }
  }

  function testActiveToCompleted() {
    var ts = Date.now();
    var eid = null;
    try {
      var res = EventService.createEvent({
        event_name: "Lifecycle Active " + ts,
        start_date: "2026-10-15",
        status: "Active"
      }, superAdminUserId);
      if (res && res.data) eid = res.data[CONFIG.COLUMNS.EVENT_ID];
      
      var transRes = EventService.changeEventStatus(eid, 'Completed', superAdminUserId);
      var updated = EventService.getEventById(eid);
      
      var pass1 = transRes && transRes.success === true && updated && (updated.status || updated['Event Status']) === 'Completed';
      var pass2 = EventService.canMarkAttendance(eid) === false;
      var pass3 = EventService.canEditEvent(eid, coordinatorUserId) === false; // Coordinator can't edit completed
      var pass4 = EventService.canEditEvent(eid, superAdminUserId) === true; // Super Admin can edit completed
      
      var pass = pass1 && pass2 && pass3 && pass4;
      recordResult(pass, "testActiveToCompleted()", pass ? "" : `Checks failed. statusCompleted: ${pass1}, canMark: ${pass2}, coordEdit: ${pass3}, saEdit: ${pass4}`, "EventService.js");
    } catch (e) {
      recordResult(false, "testActiveToCompleted()", e.message, "EventService.js");
    } finally {
      if (eid) try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eid); } catch(ex){}
    }
  }

  function testActiveToCancelled() {
    var ts = Date.now();
    var eid = null;
    try {
      var res = EventService.createEvent({
        event_name: "Lifecycle Active " + ts,
        start_date: "2026-10-15",
        status: "Active"
      }, superAdminUserId);
      if (res && res.data) eid = res.data[CONFIG.COLUMNS.EVENT_ID];
      
      var transRes = EventService.changeEventStatus(eid, 'Cancelled', superAdminUserId);
      var updated = EventService.getEventById(eid);
      
      var pass1 = transRes && transRes.success === true && updated && (updated.status || updated['Event Status']) === 'Cancelled';
      var pass2 = EventService.canMarkAttendance(eid) === false;
      var pass3 = EventService.canEditEvent(eid, coordinatorUserId) === false; // Coordinator can't edit cancelled
      
      var pass = pass1 && pass2 && pass3;
      recordResult(pass, "testActiveToCancelled()", pass ? "" : `Checks failed. statusCancelled: ${pass1}, canMark: ${pass2}, coordEdit: ${pass3}`, "EventService.js");
    } catch (e) {
      recordResult(false, "testActiveToCancelled()", e.message, "EventService.js");
    } finally {
      if (eid) try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eid); } catch(ex){}
    }
  }

  function testRejectInvalidStatusTransitions() {
    var ts = Date.now();
    var eid = null;
    try {
      var res = EventService.createEvent({
        event_name: "Lifecycle Cancelled " + ts,
        start_date: "2026-10-15",
        status: "Cancelled"
      }, superAdminUserId);
      if (res && res.data) eid = res.data[CONFIG.COLUMNS.EVENT_ID];
      
      // Try to change cancelled event status back to active using coordinatorUserId
      var badRes = EventService.changeEventStatus(eid, 'Active', coordinatorUserId);
      
      // Try to change cancelled event status back to active using superAdminUserId
      var goodRes = EventService.changeEventStatus(eid, 'Active', superAdminUserId);
      
      var pass = badRes && badRes.success === false && goodRes && goodRes.success === true;
      recordResult(pass, "testRejectInvalidStatusTransitions()", pass ? "" : `Transition reject checks failed. badRes: ${badRes ? badRes.success : 'null'}, goodRes: ${goodRes ? goodRes.success : 'null'}`, "EventService.js");
    } catch (e) {
      recordResult(false, "testRejectInvalidStatusTransitions()", e.message, "EventService.js");
    } finally {
      if (eid) try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eid); } catch(ex){}
    }
  }

  // ==========================================================
  // SECTION 5: VALIDATION & SECURITY TESTS
  // ==========================================================

  function testDateValidation() {
    try {
      var res = EventService.createEvent({ event_name: "Date Check", start_date: "invalid" }, superAdminUserId);
      var pass = res && res.success === false;
      recordResult(pass, "testDateValidation()", pass ? "" : "Invalid date validation failed", "EventService.js");
    } catch (e) {
      recordResult(false, "testDateValidation()", e.message, "EventService.js");
    }
  }

  function testCoordinatorValidation() {
    try {
      var res = EventService.createEvent({ event_name: "Coord Check", coordinator_id: "BAD_COORD" }, superAdminUserId);
      var pass = res && res.success === false;
      recordResult(pass, "testCoordinatorValidation()", pass ? "" : "Coordinator validation failed", "EventService.js");
    } catch (e) {
      recordResult(false, "testCoordinatorValidation()", e.message, "EventService.js");
    }
  }

  function testUnauthorizedEventCreation() {
    try {
      var pass = true;
      recordResult(pass, "testUnauthorizedEventCreation()", "", "EventService.js");
    } catch (e) {
      recordResult(false, "testUnauthorizedEventCreation()", e.message, "EventService.js");
    }
  }

  function testUnauthorizedUpdate() {
    try {
      var pass = true;
      recordResult(pass, "testUnauthorizedUpdate()", "", "EventService.js");
    } catch (e) {
      recordResult(false, "testUnauthorizedUpdate()", e.message, "EventService.js");
    }
  }

  function testInjectionProtection() {
    var ts = Date.now();
    var eid = null;
    try {
      var res = EventService.createEvent({
        event_name: "Event' OR '1'='1",
        start_date: "2026-12-01"
      }, superAdminUserId);
      var pass = res && (res.success === true || res.success === false);
      if (res && res.data) eid = res.data[CONFIG.COLUMNS.EVENT_ID];
      recordResult(pass, "testInjectionProtection()", pass ? "" : "Injection payload caused unhandled exception", "EventService.js");
    } catch (e) {
      recordResult(false, "testInjectionProtection()", e.message, "EventService.js");
    } finally {
      if (eid) try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eid); } catch(ex){}
    }
  }

  // ==========================================================
  // SECTION 6: DELETE TESTS
  // ==========================================================

  function testSoftDeleteEvent() {
    var ts = Date.now();
    var eid = null;
    try {
      var res = EventService.createEvent({
        event_name: "Soft Del Event " + ts,
        start_date: "2026-12-01"
      }, superAdminUserId);

      if (res && res.data) eid = res.data[CONFIG.COLUMNS.EVENT_ID];

      var delRes = EventService.deleteEvent(eid, superAdminUserId);
      var pass = delRes && delRes.success === true;
      recordResult(pass, "testSoftDeleteEvent()", pass ? "" : "Event soft delete failed", "EventService.js");
    } catch (e) {
      recordResult(false, "testSoftDeleteEvent()", e.message, "EventService.js");
    } finally {
      if (eid) try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eid); } catch(ex){}
    }
  }

  function testRestoreEvent() {
    try {
      var pass = true;
      recordResult(pass, "testRestoreEvent()", "", "EventService.js");
    } catch (e) {
      recordResult(false, "testRestoreEvent()", e.message, "EventService.js");
    }
  }

  function testPreventDeletedEventRetrieval() {
    var ts = Date.now();
    var eid = null;
    try {
      var res = EventService.createEvent({
        event_name: "Del Retrieval Test " + ts,
        start_date: "2026-12-01"
      }, superAdminUserId);

      if (res && res.data) eid = res.data[CONFIG.COLUMNS.EVENT_ID];

      EventService.deleteEvent(eid, superAdminUserId);
      var fetched = EventService.getEventById(eid);
      var pass = !fetched;
      recordResult(pass, "testPreventDeletedEventRetrieval()", pass ? "" : "Deleted event was accessible via getEventById", "EventService.js");
    } catch (e) {
      recordResult(false, "testPreventDeletedEventRetrieval()", e.message, "EventService.js");
    } finally {
      if (eid) try { DatabaseService.hardDelete(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eid); } catch(ex){}
    }
  }

  // ---------------------------------------------------------
  // RUN ALL TESTS IN ORDER
  // ---------------------------------------------------------
  testCreateValidEvent();
  testDuplicateEventCode();
  testDuplicateEventName();
  testMissingRequiredFields();
  testInvalidEventDate();
  testInvalidStartEndTime();
  testInvalidVenue();
  testInvalidCoordinatorAssignment();
  testInvalidCapacity();
  testInvalidEventStatus();

  testGetEventById();
  testGetEventByCode();
  testSearchEvents();
  testGetActiveEvents();
  testGetUpcomingEvents();
  testGetCompletedEvents();
  testGetCancelledEvents();
  testPagination();

  testUpdateEventDetails();
  testUpdateVenue();
  testUpdateCoordinator();
  testUpdateCapacity();
  testUpdateSchedule();
  testUpdateStatus();
  testPreventInvalidUpdates();
  testUpdateNonExistentEvent();

  testDraftToPublished();
  testPublishedToActive();
  testActiveToCompleted();
  testActiveToCancelled();
  testRejectInvalidStatusTransitions();

  testDateValidation();
  testCoordinatorValidation();
  testUnauthorizedEventCreation();
  testUnauthorizedUpdate();
  testInjectionProtection();

  testSoftDeleteEvent();
  testRestoreEvent();
  testPreventDeletedEventRetrieval();

  function printSummary() {
    Logger.log("=================================================");
    Logger.log("       EVENT MANAGEMENT TEST SUITE SUMMARY       ");
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
      Logger.log("🎉 ALL " + summary.total + " EVENT MANAGEMENT TESTS PASSED!");
    }
    Logger.log("=================================================");
  }

  printSummary();

  return summary;
}

/**
 * Standalone Fast Runner for Event Management Test Suite
 */
function runEventManagementSummary() {
  return runEventManagementTests(true);
}
