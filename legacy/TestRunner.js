/**
 * ============================================================
 * TestRunner.gs
 * Enterprise Test Runner
 * ============================================================
 */

var TestRunner = (function () {

  /**
   * ============================================================
   * Run Single Test Suite
   * ============================================================
   */
  function runSuite(name, runner) {

    Logger.clear();

    Logger.log("");
    Logger.log("================================================");
    Logger.log("RUNNING : " + name);
    Logger.log("================================================");

    var startTime = new Date().getTime();

    var total = 0;
    var passed = 0;
    var failed = 0;

    try {

      var results = runner.run() || [];

      Logger.log("");
      Logger.log("================================================");
      Logger.log("TEST RESULTS");
      Logger.log("================================================");

      results.forEach(function (result) {

        total++;

        try {

          if (typeof result === "string") {

            passed++;
            Logger.log("✅ " + result);

          } else if (result && result.success === true) {

            passed++;
            Logger.log("✅ " + (result.message || "Passed"));

          } else {

            failed++;

            Logger.log("❌ " + (
              result && result.message
                ? result.message
                : "Unknown Failure"
            ));

            if (result && result.error) {
              Logger.log("   Reason : " + result.error);
            }

          }

        } catch (e) {

          failed++;

          Logger.log("❌ Test Processing Failed");
          Logger.log("   " + e);

        }

      });

    } catch (e) {

      failed++;

      Logger.log("");
      Logger.log("❌ TEST SUITE CRASHED");
      Logger.log(e);

    }

    var endTime = new Date().getTime();

    var duration = endTime - startTime;

    var successRate = total === 0
      ? 0
      : ((passed / total) * 100).toFixed(2);

    Logger.log("");
    Logger.log("================================================");
    Logger.log("SUMMARY");
    Logger.log("================================================");
    Logger.log("TOTAL TESTS : " + total);
    Logger.log("PASSED      : " + passed);
    Logger.log("FAILED      : " + failed);
    Logger.log("SUCCESS %   : " + successRate + "%");
    Logger.log("TIME        : " + duration + " ms");
    Logger.log("================================================");

    return {

      suite: name,

      total: total,

      passed: passed,

      failed: failed,

      successRate: successRate,

      executionTime: duration

    };

  }

  return {

    runAll: function () {

      var report = [];

      report.push(this.auth());
      report.push(this.session());
      report.push(this.authentication());
      report.push(this.login());
      report.push(this.database());
      report.push(this.mockDatabase());
      report.push(this.utils());
      report.push(this.validation());
      report.push(this.userService());

      return report;

    },

    auth: function () {
      return runSuite("AUTH TESTS", AuthTests);
    },

    session: function () {
      return runSuite("SESSION TESTS", SessionTests);
    },

    authentication: function () {
      return runSuite("AUTHENTICATION TESTS", AuthenticationTests);
    },

    login: function () {
      return runSuite("LOGIN TESTS", LoginTests);
    },

    database: function () {
      return runSuite("DATABASE TESTS", DatabaseTests);
    },

    mockDatabase: function () {
      return runSuite(
        "MOCK DATABASE SERVICE TESTS",
        MockDatabaseServiceTests
      );
    },

    utils: function () {
      return runSuite("UTILS TESTS", UtilsTests);
    },

    validation: function () {
      return runSuite("VALIDATION TESTS", ValidationTests);
    },

    userService: function () {
      return runSuite("USER SERVICE TESTS", UserServiceTests);
    }

  };

})();

/**
 * ============================================================
 * GAS Entry Functions
 * ============================================================
 */

function testAuth() {
  return TestRunner.auth();
}

function testSession() {
  return TestRunner.session();
}

function testAuthentication() {
  return TestRunner.authentication();
}

function testLogin() {
  return TestRunner.login();
}

function testDatabase() {
  return TestRunner.database();
}

function testMockDatabase() {
  return TestRunner.mockDatabase();
}

function testUtils() {
  return TestRunner.utils();
}

function testValidation() {
  return TestRunner.validation();
}

function testUserService() {
  return TestRunner.userService();
}

function testAll() {
  return TestRunner.runAll();
}