/**
 * TestFeatures.gs
 * Automated feature-level testing suite.
 */

function runAllFeatureTests() {
  const results = [];

  const tests = [
    testTotalUsers,
    testTotalStudents,
    testActiveStudents,
    testTotalEvents,
    testActiveEvents,
    testUpcomingEvents,
    testParticipants,
    testAttendanceToday,
    testRecentEvents,
    testAllStudents
  ];

  Logger.log("=========================================");
  Logger.log("STARTING FEATURE AUTOMATED TESTS");
  Logger.log("=========================================");

  tests.forEach(function (testFn) {
    try {
      const res = testFn();
      results.push(res);
      Logger.log("[TEST] " + res.featureName + ": " + res.recordsReturned + " | STATUS: " + res.status + " | TIME: " + res.executionTimeMs + "ms" + (res.errorMessage ? " | ERROR: " + res.errorMessage : ""));
    } catch (e) {
      results.push({
        featureName: testFn.name,
        status: "FAIL",
        executionTimeMs: 0,
        recordsReturned: 0,
        errorMessage: e.message
      });
      Logger.log("[TEST] " + testFn.name + " | STATUS: FAIL | ERROR: " + e.message);
    }
  });

  Logger.log("=========================================");
  Logger.log("FINISHED FEATURE AUTOMATED TESTS");
  Logger.log("=========================================");

  return results;
}

function testTotalUsers() {
  const start = new Date().getTime();
  try {
    const count = DashboardService.getTotalUsersCount();
    const end = new Date().getTime();
    return {
      featureName: "Total Users Count",
      status: "PASS",
      executionTimeMs: end - start,
      recordsReturned: count,
      errorMessage: ""
    };
  } catch (e) {
    const end = new Date().getTime();
    return {
      featureName: "Total Users Count",
      status: "FAIL",
      executionTimeMs: end - start,
      recordsReturned: 0,
      errorMessage: e.message
    };
  }
}

function testTotalStudents() {
  const start = new Date().getTime();
  try {
    const count = DashboardService.getTotalStudentsCount();
    const end = new Date().getTime();
    return {
      featureName: "Total Students Count",
      status: "PASS",
      executionTimeMs: end - start,
      recordsReturned: count,
      errorMessage: ""
    };
  } catch (e) {
    const end = new Date().getTime();
    return {
      featureName: "Total Students Count",
      status: "FAIL",
      executionTimeMs: end - start,
      recordsReturned: 0,
      errorMessage: e.message
    };
  }
}

function testTotalEvents() {
  const start = new Date().getTime();
  try {
    const count = DashboardService.getTotalEventsCount();
    const end = new Date().getTime();
    return {
      featureName: "Total Events Count",
      status: "PASS",
      executionTimeMs: end - start,
      recordsReturned: count,
      errorMessage: ""
    };
  } catch (e) {
    const end = new Date().getTime();
    return {
      featureName: "Total Events Count",
      status: "FAIL",
      executionTimeMs: end - start,
      recordsReturned: 0,
      errorMessage: e.message
    };
  }
}

function testActiveEvents() {
  const start = new Date().getTime();
  try {
    const count = DashboardService.getActiveEventsCount();
    const end = new Date().getTime();
    return {
      featureName: "Active Events Count",
      status: "PASS",
      executionTimeMs: end - start,
      recordsReturned: count,
      errorMessage: ""
    };
  } catch (e) {
    const end = new Date().getTime();
    return {
      featureName: "Active Events Count",
      status: "FAIL",
      executionTimeMs: end - start,
      recordsReturned: 0,
      errorMessage: e.message
    };
  }
}

function testUpcomingEvents() {
  const start = new Date().getTime();
  try {
    const count = DashboardService.getUpcomingEventsCount();
    const end = new Date().getTime();
    return {
      featureName: "Upcoming Events Count",
      status: "PASS",
      executionTimeMs: end - start,
      recordsReturned: count,
      errorMessage: ""
    };
  } catch (e) {
    const end = new Date().getTime();
    return {
      featureName: "Upcoming Events Count",
      status: "FAIL",
      executionTimeMs: end - start,
      recordsReturned: 0,
      errorMessage: e.message
    };
  }
}

function testParticipants() {
  const start = new Date().getTime();
  try {
    const count = DashboardService.getTotalCoordinatorsCount();
    const end = new Date().getTime();
    return {
      featureName: "Total Participants / Coordinators",
      status: "PASS",
      executionTimeMs: end - start,
      recordsReturned: count,
      errorMessage: ""
    };
  } catch (e) {
    const end = new Date().getTime();
    return {
      featureName: "Total Participants / Coordinators",
      status: "FAIL",
      executionTimeMs: end - start,
      recordsReturned: 0,
      errorMessage: e.message
    };
  }
}

function testAttendanceToday() {
  const start = new Date().getTime();
  try {
    const count = DashboardService.getAttendanceTodayCount("System");
    const end = new Date().getTime();
    return {
      featureName: "Today's Attendance Count",
      status: "PASS",
      executionTimeMs: end - start,
      recordsReturned: count,
      errorMessage: ""
    };
  } catch (e) {
    const end = new Date().getTime();
    return {
      featureName: "Today's Attendance Count",
      status: "FAIL",
      executionTimeMs: end - start,
      recordsReturned: 0,
      errorMessage: e.message
    };
  }
}

function testRecentEvents() {
  const start = new Date().getTime();
  try {
    const activities = DashboardService.getRecentActivities();
    const end = new Date().getTime();
    return {
      featureName: "Recent Audit Activities",
      status: "PASS",
      executionTimeMs: end - start,
      recordsReturned: activities.length,
      errorMessage: ""
    };
  } catch (e) {
    const end = new Date().getTime();
    return {
      featureName: "Recent Audit Activities",
      status: "FAIL",
      executionTimeMs: end - start,
      recordsReturned: 0,
      errorMessage: e.message
    };
  }
}

function testAllStudents() {
  const start = new Date().getTime();
  try {
    const res = StudentService.getAllStudents();
    const count = (res && res.success && res.students) ? res.students.length : 0;
    const end = new Date().getTime();
    return {
      featureName: "Load All Students",
      status: res.success ? "PASS" : "FAIL",
      executionTimeMs: end - start,
      recordsReturned: count,
      errorMessage: res.success ? "" : res.message
    };
  } catch (e) {
    const end = new Date().getTime();
    return {
      featureName: "Load All Students",
      status: "FAIL",
      executionTimeMs: end - start,
      recordsReturned: 0,
      errorMessage: e.message
    };
  }
}

function testActiveStudents() {
  const start = new Date().getTime();
  try {
    const res = StudentService.getActiveStudents();
    const count = (res && res.success && res.students) ? res.students.length : 0;
    const end = new Date().getTime();
    return {
      featureName: "Active Students Count",
      status: res.success ? "PASS" : "FAIL",
      executionTimeMs: end - start,
      recordsReturned: count,
      errorMessage: res.success ? "" : res.message
    };
  } catch (e) {
    const end = new Date().getTime();
    return {
      featureName: "Active Students Count",
      status: "FAIL",
      executionTimeMs: end - start,
      recordsReturned: 0,
      errorMessage: e.message
    };
  }
}
function testEventCreateAdminConfiguration() {
  Logger.log("========== CREATE ADMIN CONFIG TEST ==========");

  try {
    // Test role logic used while creating inline user
    var testCases = [
      { role: "HOD", expected: "Event Admin" },
      { role: "SUPER ADMIN", expected: "Event Admin" },
      { role: "ADMIN", expected: "Coordinator" },
      { role: "EVENT ADMIN", expected: "Coordinator" },
      { role: "EVENT_ADMIN", expected: "Coordinator" }
    ];

    var allPassed = true;

    testCases.forEach(function (test) {
      var currentUserRole = test.role;

      var inlineRole =
        (
          currentUserRole === "ADMIN" ||
          currentUserRole === "EVENT ADMIN" ||
          currentUserRole === "EVENT_ADMIN"
        )
          ? "Coordinator"
          : "Event Admin";

      var passed = inlineRole === test.expected;

      Logger.log(
        (passed ? "✅ PASS" : "❌ FAIL") +
        " | Current Role: " + test.role +
        " | Creates: " + inlineRole +
        " | Expected: " + test.expected
      );

      if (!passed) {
        allPassed = false;
      }
    });

    Logger.log("--------------------------------------");

    // Verify required HTML/JS files can be loaded
    try {
      var eventsHtml =
        HtmlService.createTemplateFromFile("Events")
          .evaluate()
          .getContent();

      if (eventsHtml.indexOf("btnCreateAdminInline") !== -1) {
        Logger.log("✅ PASS | Create Admin button exists");
      } else {
        Logger.log("❌ FAIL | Create Admin button not found");
        allPassed = false;
      }

      if (eventsHtml.indexOf("new-coordinator-fields") !== -1) {
        Logger.log("✅ PASS | Inline admin form exists");
      } else {
        Logger.log("❌ FAIL | Inline admin form not found");
        allPassed = false;
      }

    } catch (e) {
      Logger.log("❌ FAIL | Events.html test error: " + e.message);
      allPassed = false;
    }

    Logger.log("======================================");

    if (allPassed) {
      Logger.log("🎉 SUCCESSFULLY WORKING");
      Logger.log("Create Admin configuration test PASSED.");
    } else {
      Logger.log("❌ CREATE ADMIN CONFIGURATION HAS ERRORS");
    }

    Logger.log("========== TEST COMPLETE ==========");

  } catch (error) {
    Logger.log("❌ TEST CRASHED");
    Logger.log(error.message);
  }
}
function testEventStatusEvaluationExact() {
  Logger.log('========== EVENT STATUS EXACT DIAGNOSTIC ==========');

  var rows = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS) || [];

  var testEvents = rows.filter(function (row) {
    var id = String(
      row['Event ID'] ||
      row.event_id ||
      ''
    );

    return id.indexOf('EVT_NO_REG_') === 0 ||
      id.indexOf('EVT_REG_') === 0;
  });

  Logger.log('Test events found: ' + testEvents.length);

  testEvents.forEach(function (row) {
    var eventId = row['Event ID'] || row.event_id;

    Logger.log('------------------------------------');
    Logger.log('EVENT ID: ' + eventId);

    Logger.log('RAW DB ROW:');
    Logger.log(JSON.stringify(row));

    Logger.log('RAW start_date = ' +
      (row['Start Date'] || row.start_date));

    Logger.log('RAW start_time = ' +
      (row['Start Time'] || row.start_time));

    Logger.log('RAW end_date = ' +
      (row['End Date'] || row.end_date));

    Logger.log('RAW end_time = ' +
      (row['End Time'] || row.end_time));

    Logger.log('RAW status = ' +
      (row['Event Status'] || row.event_status || row.status));

    var evaluated = EventService.getEventById(eventId);

    Logger.log('AFTER EventService.getEventById():');
    Logger.log(JSON.stringify(evaluated));

    Logger.log('FINAL STATUS = ' +
      (
        evaluated &&
        (
          evaluated['Event Status'] ||
          evaluated.event_status ||
          evaluated.status
        )
      )
    );
  });

  Logger.log('========== DIAGNOSTIC COMPLETE ==========');
}