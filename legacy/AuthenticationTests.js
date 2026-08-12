var AuthenticationTests = {

  run: function () {

    TestLogger.section("AUTHENTICATION UNIT TESTS");

    this.testControllerExists();
    this.testAuthServiceExists();
    this.testLoginExists();
    this.testAuthenticateExists();
    this.testLogoutExists();
    this.testRestoreSessionExists();

  },

  testControllerExists: function () {
    TestAssertions.assertTrue(
      typeof Controller === "object",
      "Controller missing"
    );
  },

  testAuthServiceExists: function () {
    TestAssertions.assertTrue(
      typeof AuthService === "object",
      "AuthService missing"
    );
  },

  testLoginExists: function () {
    TestAssertions.assertTrue(
      typeof Controller.Auth.login === "function",
      "login() missing"
    );
  },

  testAuthenticateExists: function () {
    TestAssertions.assertTrue(
      typeof Controller.Auth.authenticate === "function",
      "authenticate() missing"
    );
  },

  testLogoutExists: function () {
    TestAssertions.assertTrue(
      typeof Controller.Auth.logout === "function",
      "logout() missing"
    );
  },

  testRestoreSessionExists: function () {
    TestAssertions.assertTrue(
      typeof Controller.Auth.restoreSession === "function",
      "restoreSession() missing"
    );
  }

};