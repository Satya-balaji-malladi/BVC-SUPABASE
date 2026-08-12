/**
 * ==========================================================
 * ValidationTests.gs
 * ==========================================================
 * Tests validation layer
 */

var ValidationTests = {

  run: function () {

    var results = [];

    TestLogger.section("VALIDATION TESTS");

    results.push(this.testRequiredFieldsExist());
    results.push(this.testEmailValidatorExists());
    results.push(this.testPhoneValidatorExists());
    results.push(this.testPasswordValidatorExists());
    results.push(this.testEmployeeIdValidatorExists());
    results.push(this.testUsernameValidatorExists());
    results.push(this.testRollNumberValidatorExists());
    results.push(this.testDateValidatorExists());
    results.push(this.testEventNameValidatorExists());
    results.push(this.testDepartmentValidatorExists());

    return results;

  },

  //-------------------------------------------------------
  testRequiredFieldsExist: function () {

    TestLogger.test("Required Field Validator");

    TestAssertions.assertTrue(
      typeof Validation !== "undefined",
      "Validation object missing"
    );

    return "Validation object exists";

  },

  //-------------------------------------------------------
  testEmailValidatorExists: function () {

    TestLogger.test("Email Validator");

    TestAssertions.assertTrue(
      typeof Validation.validateEmail === "function",
      "validateEmail() missing"
    );

    return "validateEmail() exists";

  },

  //-------------------------------------------------------
  testPhoneValidatorExists: function () {

    TestLogger.test("Phone Validator");

    TestAssertions.assertTrue(
      typeof Validation.validatePhone === "function",
      "validatePhone() missing"
    );

    return "validatePhone() exists";

  },

  //-------------------------------------------------------
  testPasswordValidatorExists: function () {

    TestLogger.test("Password Validator");

    TestAssertions.assertTrue(
      typeof Validation.validatePassword === "function",
      "validatePassword() missing"
    );

    return "validatePassword() exists";

  },

  //-------------------------------------------------------
  testEmployeeIdValidatorExists: function () {

    TestLogger.test("Employee ID Validator");

    TestAssertions.assertTrue(
      typeof Validation.validateEmployeeId === "function",
      "validateEmployeeId() missing"
    );

    return "validateEmployeeId() exists";

  },

  //-------------------------------------------------------
  testUsernameValidatorExists: function () {

    TestLogger.test("Username Validator");

    TestAssertions.assertTrue(
      typeof Validation.validateUsername === "function",
      "validateUsername() missing"
    );

    return "validateUsername() exists";

  },

  //-------------------------------------------------------
  testRollNumberValidatorExists: function () {

    TestLogger.test("Roll Number Validator");

    TestAssertions.assertTrue(
      typeof Validation.validateRollNumber === "function",
      "validateRollNumber() missing"
    );

    return "validateRollNumber() exists";

  },

  //-------------------------------------------------------
  testDateValidatorExists: function () {

    TestLogger.test("Date Validator");

    TestAssertions.assertTrue(
      typeof Validation.validateDate === "function",
      "validateDate() missing"
    );

    return "validateDate() exists";

  },

  //-------------------------------------------------------
  testEventNameValidatorExists: function () {

    TestLogger.test("Event Name Validator");

    TestAssertions.assertTrue(
      typeof Validation.validateEventName === "function",
      "validateEventName() missing"
    );

    return "validateEventName() exists";

  },

  //-------------------------------------------------------
  testDepartmentValidatorExists: function () {

    TestLogger.test("Department Validator");

    TestAssertions.assertTrue(
      typeof Validation.validateDepartment === "function",
      "validateDepartment() missing"
    );

    return "validateDepartment() exists";

  }

};