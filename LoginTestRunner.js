/**
 * ===========================================================
 * LoginTestRunner.gs
 * ===========================================================
 * Purpose:
 * Diagnose every step of Coordinator login.
 *
 * SAFE:
 * Does not modify production code.
 * Only reads data except Session Creation test.
 * ===========================================================
 */

var LoginTestRunner = {

  runAllTests: function () {

    Logger.clear();

    Logger.log("======================================");
    Logger.log("LOGIN DIAGNOSTIC START");
    Logger.log("======================================");

    this.testConfig();
    this.testServices();
    this.testDatabase();
    this.testCoordinatorLookup();
    this.testPasswordVerification();
    this.testSessionCreation();
    this.testSessionValidation();

    Logger.log("======================================");
    Logger.log("LOGIN DIAGNOSTIC FINISHED");
    Logger.log("======================================");

  },

  //------------------------------------------------------
  // CONFIG
  //------------------------------------------------------

  testConfig: function () {

    Logger.log("");
    Logger.log("TEST 1 : CONFIG");

    try {

      if (!CONFIG)
        throw new Error("CONFIG not found");

      Logger.log("PASS");

      Logger.log(CONFIG.PROJECT_NAME || "No Project Name");

    } catch (e) {

      Logger.log("FAIL");
      Logger.log(e.message);

    }

  },

  //------------------------------------------------------
  // SERVICES
  //------------------------------------------------------

  testServices: function () {

    Logger.log("");
    Logger.log("TEST 2 : SERVICES");

    var services = [

      "DatabaseService",

      "AuthService",

      "SessionService",

      "ValidationService",

      "Utils",

      "IdService"

    ];

    services.forEach(function (s) {

      try {

        if (typeof this[s] === "undefined")
          throw new Error(s + " Missing");

        Logger.log("PASS : " + s);

      } catch (e) {

        Logger.log("FAIL : " + e.message);

      }

    });

  },

  //------------------------------------------------------
  // DATABASE
  //------------------------------------------------------

  testDatabase: function () {

    Logger.log("");
    Logger.log("TEST 3 : DATABASE");

    try {

      var users = DatabaseService.readAllRows(
        CONFIG.SHEETS.USERS
      );

      Logger.log("PASS");

      Logger.log("Users Found : " + users.length);

    } catch (e) {

      Logger.log("FAIL");

      Logger.log(e.stack);

    }

  },

  //------------------------------------------------------
  // USER LOOKUP
  //------------------------------------------------------

  testCoordinatorLookup: function () {

    Logger.log("");
    Logger.log("TEST 4 : COORDINATOR LOOKUP");

    try {

      var employeeId = "REPLACE_WITH_COORDINATOR_ID";

      var user = DatabaseService.findOne(

        CONFIG.SHEETS.USERS,

        CONFIG.COLUMNS.USER_EMPLOYEE_ID,

        employeeId

      );

      if (!user)
        throw new Error("Coordinator not found");

      this.user = user;

      Logger.log("PASS");

      Logger.log(JSON.stringify(user));

    } catch (e) {

      Logger.log("FAIL");

      Logger.log(e.stack);

    }

  },

  //------------------------------------------------------
  // PASSWORD
  //------------------------------------------------------

  testPasswordVerification: function () {

    Logger.log("");
    Logger.log("TEST 5 : PASSWORD");

    try {

      if (!this.user)
        throw new Error("User missing");

      var ok = AuthService._verifyPassword(

        this.user,

        "REPLACE_WITH_PASSWORD"

      );

      Logger.log("Password Match : " + ok);

    } catch (e) {

      Logger.log("FAIL");

      Logger.log(e.stack);

    }

  },

  //------------------------------------------------------
  // SESSION
  //------------------------------------------------------

  testSessionCreation: function () {

    Logger.log("");
    Logger.log("TEST 6 : SESSION");

    try {

      if (!this.user)
        throw new Error("User missing");

      var session = SessionService.createSession(this.user);

      this.session = session;

      Logger.log("PASS");

      Logger.log(JSON.stringify(session));

    } catch (e) {

      Logger.log("FAIL");

      Logger.log(e.stack);

    }

  },

  //------------------------------------------------------
  // SESSION VALIDATION
  //------------------------------------------------------

  testSessionValidation: function () {

    Logger.log("");
    Logger.log("TEST 7 : SESSION VALIDATION");

    try {

      if (!this.session)
        throw new Error("Session missing");

      var token = this.session[
        CONFIG.COLUMNS.SESSION_TOKEN
      ];

      var valid =
        SessionService.validateSession(token);

      Logger.log("Validation Result");

      Logger.log(JSON.stringify(valid));

    } catch (e) {

      Logger.log("FAIL");

      Logger.log(e.stack);

    }

  }

};
function runLoginDiagnostic() {
  LoginTestRunner.runAllTests();
}