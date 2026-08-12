/**
 * ============================================================
 * TEST CENTER
 * Master Test Runner
 * ============================================================
 */

var TestCenter = (function () {

  function runAllTests() {

    Logger.clear();

    Logger.log("");
    Logger.log("===========================================");
    Logger.log("      BVC EVENT ATTENDANCE SYSTEM");
    Logger.log("             TEST CENTER");
    Logger.log("===========================================");
    Logger.log("");

    var total = 0;
    var passed = 0;
    var failed = 0;

    var suites = [

      {
        name: "AUTH TESTS",
        runner: AuthTests
      },

      {
        name: "SESSION TESTS",
        runner: SessionTests
      },

      {
        name: "AUTHENTICATION TESTS",
        runner: AuthenticationTests
      },

      {
        name: "LOGIN TESTS",
        runner: LoginTests
      },

      /*
      {
        name: "PERMISSION TESTS",
        runner: PermissionTests
      },
      */

      {
        name: "DATABASE TESTS",
        runner: DatabaseTests
      },

      {
        name: "MOCK DATABASE SERVICE TESTS",
        runner: MockDatabaseServiceTests
      },

      {
        name: "UTILS TESTS",
        runner: UtilsTests
      },

      {
        name: "VALIDATION TESTS",
        runner: ValidationTests
      },

      {
        name: "USER SERVICE TESTS",
        runner: UserServiceTests
      }

      // Future Test Suites
      // StudentServiceTests
      // DepartmentServiceTests
      // EventServiceTests
      // AttendanceServiceTests
      // ReportServiceTests
      // DashboardTests

    ];

    suites.forEach(function (suite) {

      Logger.log("");
      Logger.log("---------------------------------------");
      Logger.log(suite.name);
      Logger.log("---------------------------------------");

      try {

        if (!suite.runner || typeof suite.runner.run !== "function") {
          throw new Error("Test suite '" + suite.name + "' is missing run() method.");
        }

        var results = suite.runner.run() || [];

        results.forEach(function (result) {

          total++;
          passed++;

          Logger.log("✅ " + result);

        });

      } catch (e) {

        total++;
        failed++;

        Logger.log("❌ FAILED");
        Logger.log(e.message || e);

      }

    });

    Logger.log("");
    Logger.log("===========================================");
    Logger.log("TOTAL TESTS : " + total);
    Logger.log("PASSED      : " + passed);
    Logger.log("FAILED      : " + failed);
    Logger.log("===========================================");

  }

  return {

    runAllTests: runAllTests

  };

})();

/**
 * ============================================================
 * GAS Entry Function
 * ============================================================
 */

function runAllTests() {

  TestCenter.runAllTests();

}
function runMockDatabaseTests() {
  MockDatabaseServiceTests.run();
}

function runDatabaseTests() {
  DatabaseTests.run();
}

function runUserServiceTests() {
  UserServiceTests.run();
}

function runAuthTests() {
  AuthTests.run();
}

function runSessionTests() {
  SessionTests.run();
}

function runAuthenticationTests() {
  AuthenticationTests.run();
}

function runLoginTests() {
  LoginTests.run();
}

function runUtilsTests() {
  UtilsTests.run();
}

function runValidationTests() {
  ValidationTests.run();
}