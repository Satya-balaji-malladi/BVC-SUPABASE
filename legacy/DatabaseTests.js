/**
 * ==========================================================
 * DatabaseTests.gs
 * ==========================================================
 * Tests DatabaseService
 * READ ONLY
 */

var DatabaseTests = {

  run: function () {

    var results = [];

    TestLogger.section("DATABASE TESTS");

    results.push(this.testDatabaseServiceExists());

    results.push(this.testUsersTable());

    results.push(this.testEventsTable());

    results.push(this.testDepartmentsTable());

    results.push(this.testFindOne());

    return results;
  },

  /**
   * -------------------------------------------------------
   * DatabaseService Exists
   * -------------------------------------------------------
   */
  testDatabaseServiceExists: function () {

    TestLogger.test("Checking DatabaseService");

    TestAssertions.assertTrue(
      typeof DatabaseService !== "undefined",
      "DatabaseService not found"
    );

    return "DatabaseService exists";
  },

  /**
   * -------------------------------------------------------
   * USERS TABLE
   * -------------------------------------------------------
   */
  testUsersTable: function () {

    TestLogger.test("Reading USERS table");

    var users = DatabaseService.readAllRows(CONFIG.SHEETS.USERS);

    TestAssertions.assertTrue(
      Array.isArray(users),
      "Users should return array"
    );

    return "Users table OK (" + users.length + " rows)";
  },

  /**
   * -------------------------------------------------------
   * EVENTS TABLE
   * -------------------------------------------------------
   */
  testEventsTable: function () {

    TestLogger.test("Reading EVENTS table");

    var events = DatabaseService.readAllRows(CONFIG.SHEETS.EVENTS);

    TestAssertions.assertTrue(
      Array.isArray(events),
      "Events should return array"
    );

    return "Events table OK (" + events.length + " rows)";
  },

  /**
   * -------------------------------------------------------
   * DEPARTMENTS TABLE
   * -------------------------------------------------------
   */
  testDepartmentsTable: function () {

    TestLogger.test("Reading DEPARTMENTS table");

    var departments = DatabaseService.readAllRows(CONFIG.SHEETS.DEPARTMENTS);

    TestAssertions.assertTrue(
      Array.isArray(departments),
      "Departments should return array"
    );

    return "Departments table OK (" + departments.length + " rows)";
  },

  /**
   * -------------------------------------------------------
   * FIND ONE USER
   * -------------------------------------------------------
   */
  testFindOne: function () {

    TestLogger.test("Testing findOne()");

    var user = DatabaseService.findOne(
      CONFIG.SHEETS.USERS,
      CONFIG.COLUMNS.USER_USERNAME,
      "principal"
    );

    TestAssertions.assertTrue(
      user !== undefined,
      "principal user not found"
    );

    return "findOne() OK";
  }

};