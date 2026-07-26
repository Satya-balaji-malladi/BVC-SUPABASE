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
  
  tests.forEach(function(testFn) {
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
