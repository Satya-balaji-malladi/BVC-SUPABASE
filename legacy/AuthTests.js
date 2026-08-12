/**
 * ==========================================================
 * AuthTests.gs
 * Authentication Test Suite
 * ==========================================================
 */

var AuthTests = (function () {

  function run() {

    var results = [];

    results.push(testLoginFunctionExists());
    results.push(testAuthenticateExists());
    results.push(testLogoutExists());
    results.push(testRestoreSessionExists());

    return results;
  }

  /**
   * ------------------------------------
   * login()
   * ------------------------------------
   */

  function testLoginFunctionExists() {

    TestLogger.section("Checking login()");

    TestAssertions.assertTrue(
      typeof login === "function",
      "login() function exists"
    );

    return "login() OK";
  }

  /**
   * ------------------------------------
   * authenticate()
   * ------------------------------------
   */

  function testAuthenticateExists() {

    TestLogger.section("Checking authenticate()");

    TestAssertions.assertTrue(
      typeof authenticate === "function",
      "authenticate() exists"
    );

    return "authenticate() OK";
  }

  /**
   * ------------------------------------
   * logout()
   * ------------------------------------
   */

  function testLogoutExists() {

    TestLogger.section("Checking logout()");

    TestAssertions.assertTrue(
      typeof logout === "function",
      "logout() exists"
    );

    return "logout() OK";
  }

  /**
   * ------------------------------------
   * restoreSession()
   * ------------------------------------
   */

  function testRestoreSessionExists() {

    TestLogger.section("Checking restoreSession()");

    TestAssertions.assertTrue(
      typeof restoreSession === "function",
      "restoreSession() exists"
    );

    return "restoreSession() OK";
  }

  return {

    run: run

  };

})();