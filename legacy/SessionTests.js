/**
 * ==========================================
 * SessionTests.gs
 * ==========================================
 */

var SessionTests = {

  run: function () {

  TestLogger.section("SESSION TESTS");

  var results = [];

  this.testAuthenticateExists();
  results.push("authenticate() exists");

  this.testRestoreSessionExists();
  results.push("restoreSession() exists");

  this.testLogoutExists();
  results.push("logout() exists");

  return results;

},

  testAuthenticateExists: function () {

    TestAssertions.assertTrue(
      typeof authenticate === "function",
      "authenticate() function not found"
    );

    TestLogger.success("authenticate() exists");

  },

  testRestoreSessionExists: function () {

    TestAssertions.assertTrue(
      typeof restoreSession === "function",
      "restoreSession() function not found"
    );

    TestLogger.success("restoreSession() exists");

  },

  testLogoutExists: function () {

    TestAssertions.assertTrue(
      typeof logout === "function",
      "logout() function not found"
    );

    TestLogger.success("logout() exists");

  }

};