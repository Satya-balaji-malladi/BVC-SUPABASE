/**
 * ==========================================================
 * UserServiceTests.gs
 * ==========================================================
 * Business Logic Tests
 * Zero / Minimal Database Calls
 */

var UserServiceTests = {

  run: function () {

    var results = [];

    TestLogger.section("USER SERVICE TESTS");

    results.push(this.testCreateUserExists());

    results.push(this.testGetUserByIdExists());

    results.push(this.testGetAllUsersExists());

    results.push(this.testUpdateUserExists());

    results.push(this.testDeleteUserExists());

    results.push(this.testRestoreUserExists());

    results.push(this.testActivateUserExists());

    results.push(this.testDeactivateUserExists());

    results.push(this.testResetPasswordExists());

    results.push(this.testChangePasswordExists());

    results.push(this.testUpdateProfileExists());

    // results.push(this.testSearchUsersExists());


    results.push(this.testSanitizeUserExists());

    results.push(this.testValidateFunctionExists());
    results.push(this.testGetUserByIdExists());
    results.push(this.testGetUserByIdReturnsUser());
    return results;

  },

  //---------------------------------------------------------
  // createUser exists
  //---------------------------------------------------------
  //---------------------------------------------------------
  // createUser exists
  //---------------------------------------------------------
  testCreateUserExists: function () {

    TestLogger.test("Checking UserService.createUser()");

    try {

      TestAssertions.assertTrue(
        typeof UserService.createUser === "function",
        "UserService.createUser() not found"
      );

      return TestResult.pass(
        "createUser Exists",
        "UserService.createUser() exists"
      );

    } catch (e) {

      return TestResult.fail(
        "createUser Exists",
        "UserService.createUser() not found",
        e.message
      );

    }

  },

  //---------------------------------------------------------
  // updateUser exists
  //---------------------------------------------------------
  testUpdateUserExists: function () {

    TestLogger.test("Checking UserService.updateUser()");

    TestAssertions.assertTrue(
      typeof UserService.updateUser === "function",
      "UserService.updateUser() not found"
    );

    return "updateUser() exists";
  },

  //---------------------------------------------------------
  // deleteUser exists
  //---------------------------------------------------------
  testDeleteUserExists: function () {

    TestLogger.test("Checking UserService.deleteUser()");

    TestAssertions.assertTrue(
      typeof UserService.deleteUser === "function",
      "UserService.deleteUser() not found"
    );

    return "deleteUser() exists";
  },

  //---------------------------------------------------------
  // restoreUser exists
  //---------------------------------------------------------
  testRestoreUserExists: function () {

    TestLogger.test("Checking UserService.restoreUser()");

    TestAssertions.assertTrue(
      typeof UserService.restoreUser === "function",
      "UserService.restoreUser() not found"
    );

    return "restoreUser() exists";
  },

  //---------------------------------------------------------
  // sanitize exists
  //---------------------------------------------------------
  testSanitizeUserExists: function () {

    TestLogger.test("Checking _sanitizeUserSafe()");

    TestAssertions.assertTrue(
      typeof UserService._sanitizeUserSafe === "function",
      "_sanitizeUserSafe() not found"
    );

    return "_sanitizeUserSafe() exists";
  },

  //---------------------------------------------------------
  // validation exists
  //---------------------------------------------------------
  testValidateFunctionExists: function () {

    TestLogger.test("Checking _validateCreateUpdate()");

    TestAssertions.assertTrue(
      typeof UserService._validateCreateUpdate === "function",
      "_validateCreateUpdate() not found"
    );

    return "_validateCreateUpdate() exists";
  },
  //---------------------------------------------------------
  // getUserById()
  //---------------------------------------------------------
  testGetUserByIdExists: function () {

    TestLogger.test("Checking UserService.getUserById()");

    TestAssertions.assertTrue(
      typeof UserService.getUserById === "function",
      "UserService.getUserById() not found"
    );

    return "getUserById() exists";

  },

  //---------------------------------------------------------
  // getAllUsers()
  //---------------------------------------------------------
  testGetAllUsersExists: function () {

    TestLogger.test("Checking UserService.getAllUsers()");

    TestAssertions.assertTrue(
      typeof UserService.getAllUsers === "function",
      "UserService.getAllUsers() not found"
    );

    return "getAllUsers() exists";

  },

  //---------------------------------------------------------
  // activateUser()
  //---------------------------------------------------------
  testActivateUserExists: function () {

    TestLogger.test("Checking UserService.activateUser()");

    TestAssertions.assertTrue(
      typeof UserService.activateUser === "function",
      "UserService.activateUser() not found"
    );

    return "activateUser() exists";

  },

  //---------------------------------------------------------
  // deactivateUser()
  //---------------------------------------------------------
  testDeactivateUserExists: function () {

    TestLogger.test("Checking UserService.deactivateUser()");

    TestAssertions.assertTrue(
      typeof UserService.deactivateUser === "function",
      "UserService.deactivateUser() not found"
    );

    return "deactivateUser() exists";

  },

  //---------------------------------------------------------
  // resetPassword()
  //---------------------------------------------------------
  testResetPasswordExists: function () {

    TestLogger.test("Checking UserService.resetPassword()");

    TestAssertions.assertTrue(
      typeof UserService.resetPassword === "function",
      "UserService.resetPassword() not found"
    );

    return "resetPassword() exists";

  },

  //---------------------------------------------------------
  // changePassword()
  //---------------------------------------------------------
  testChangePasswordExists: function () {

    TestLogger.test("Checking UserService.changePassword()");

    TestAssertions.assertTrue(
      typeof UserService.changePassword === "function",
      "UserService.changePassword() not found"
    );

    return "changePassword() exists";

  },

  //---------------------------------------------------------
  // updateProfile()
  //---------------------------------------------------------
  testUpdateProfileExists: function () {

    TestLogger.test("Checking UserService.updateProfile()");

    TestAssertions.assertTrue(
      typeof UserService.updateProfile === "function",
      "UserService.updateProfile() not found"
    );

    return "updateProfile() exists";

  },

  //---------------------------------------------------------
  // searchUsers()
  //---------------------------------------------------------
  testSearchUsersExists: function () {

    TestLogger.test("Checking UserService.searchUsers()");

    TestAssertions.assertTrue(
      typeof UserService.searchUsers === "function",
      "UserService.searchUsers() not found"
    );

    return "searchUsers() exists";

  },
  //---------------------------------------------------------
  // getUserById() - Existing User
  //---------------------------------------------------------
  testGetUserByIdReturnsUser: function () {

    TestLogger.test("Testing getUserById() with valid User ID");

    // Change this to a User ID that exists in your database
    var userId = "USER_SA_01";

    var user = UserService.getUserById(userId);

    TestAssertions.assertNotNull(
      user,
      "Existing user should be returned."
    );

    return "getUserById() returns existing user";

  },

};