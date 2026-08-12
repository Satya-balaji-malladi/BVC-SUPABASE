/**
 * ==========================================================
 * AuthenticationTests.gs
 * ==========================================================
 * Tests complete authentication flow
 */

var AuthenticationTests = {

  run: function () {

    var results = [];

    TestLogger.section("AUTHENTICATION TESTS");

    results.push(this.testLoginExists());
    results.push(this.testAuthenticateExists());
    results.push(this.testLogoutExists());

    results.push(this.testLoginResponseStructure());

    return results;
  },

  /**
   * --------------------------------------------------------
   * login() exists
   * --------------------------------------------------------
   */
  testLoginExists: function () {

    TestLogger.test("Checking login()");

    TestAssertions.assertTrue(
      typeof Controller.Auth.login === "function",
      "Controller.Auth.login() not found"
    );

    return TestResult.fail(
      "Login Exists",
      "AuthService.login() not found",
      e.message
    );
  },

  /**
   * --------------------------------------------------------
   * authenticate() exists
   * --------------------------------------------------------
   */
  testAuthenticateExists: function () {

    TestLogger.test("Checking authenticate()");

    TestAssertions.assertTrue(
      typeof Controller.Auth.authenticate === "function",
      "Controller.Auth.authenticate() not found"
    );

    return "authenticate() exists";
  },

  /**
   * --------------------------------------------------------
   * logout() exists
   * --------------------------------------------------------
   */
  testLogoutExists: function () {

    TestLogger.test("Checking logout()");

    TestAssertions.assertTrue(
      typeof Controller.Auth.logout === "function",
      "Controller.Auth.logout() not found"
    );

    return "logout() exists";
  },

  /**
   * --------------------------------------------------------
   * Verify login() response structure
   * (Does NOT require valid credentials yet)
   * --------------------------------------------------------
   */
  testLoginResponseStructure: function () {

    TestLogger.test("Checking login response");

    var response = Controller.Auth.login({
      usernameOrEmail: "",
      password: ""
    });

    TestAssertions.assertTrue(
      typeof response === "object",
      "login() should return an object"
    );

    TestAssertions.assertTrue(
      response.hasOwnProperty("success"),
      "Missing success property"
    );

    TestAssertions.assertTrue(
      response.hasOwnProperty("message"),
      "Missing message property"
    );

    return "login() response structure OK";
  }

};