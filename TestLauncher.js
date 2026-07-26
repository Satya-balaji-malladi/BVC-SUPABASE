  function runAllBackendTests() {
    return TestRunner.runAllTests();
  }

  function runAuthenticationTests() {
    return TestRunner.runModule("Authentication");
  }

  function runUserTests() {
    return TestRunner.runModule("Users");
  }

  function runStudentTests() {
    return TestRunner.runModule("Students");
  }

  function runDepartmentTests() {
    return TestRunner.runModule("Departments");
  }

  function runEventTests() {
    return TestRunner.runModule("Events");
  }

  function runParticipantTests() {
    return TestRunner.runModule("Participants");
  }

  function runAttendanceTests() {
    return TestRunner.runModule("Attendance");
  }

  function runReportTests() {
    return TestRunner.runModule("Reports");
  }

  function runNotificationTests() {
    return TestRunner.runModule("Notifications");
  }

  function runAuditTests() {
    return TestRunner.runModule("Audit");
  }

  function runSettingsTests() {
    return TestRunner.runModule("Settings");
  }
  function runDepartmentCreateTest() {
    testCreateDepartment();
  }