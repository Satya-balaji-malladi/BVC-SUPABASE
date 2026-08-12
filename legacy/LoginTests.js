var LoginTests = {

  run: function () {

    var results = [];

    results.push(this.testValidSuperAdminLogin());
    results.push(this.testWrongPassword());
    results.push(this.testWrongEmployeeId());
    results.push(this.testEmptyEmployeeId());
    results.push(this.testEmptyPassword());

    return results;

  },

  testValidSuperAdminLogin: function () {

    TestLogger.section("Valid Super Admin Login");

    var res = AuthService.login({
      employeeId: "USER_SA_01",
      password: "admin123"
    });

    TestAssertions.assertTrue(res.success === true,
      "Super Admin login failed");

    TestAssertions.assertTrue(res.data.user != null,
      "User object missing");

    TestAssertions.assertTrue(res.data.token != null,
      "Token missing");

    return "Valid Super Admin Login";

  },

  testWrongPassword: function () {

    TestLogger.section("Wrong Password");

    var res = AuthService.login({
      employeeId: "USER_SA_01",
      password: "wrongpassword"
    });

    TestAssertions.assertTrue(res.success === false,
      "Wrong password accepted");

    return "Wrong Password";

  },

  testWrongEmployeeId: function () {

    TestLogger.section("Wrong Employee ID");

    var res = AuthService.login({
      employeeId: "INVALID_USER",
      password: "admin123"
    });

    TestAssertions.assertTrue(res.success === false,
      "Invalid employee accepted");

    return "Wrong Employee ID";

  },

  testEmptyEmployeeId: function () {

    TestLogger.section("Empty Employee ID");

    var res = AuthService.login({
      employeeId: "",
      password: "admin123"
    });

    TestAssertions.assertTrue(res.success === false,
      "Empty employee id accepted");

    return "Empty Employee ID";

  },

  testEmptyPassword: function () {

    TestLogger.section("Empty Password");

    var res = AuthService.login({
      employeeId: "USER_SA_01",
      password: ""
    });

    TestAssertions.assertTrue(res.success === false,
      "Empty password accepted");

    return "Empty Password";

  }

};