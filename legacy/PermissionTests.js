/**
 * ==========================================================
 * PermissionTests.gs
 * ==========================================================
 * Tests Role Permission Manager
 */

/*var PermissionTests = {

  run: function () {

    var results = [];

    TestLogger.section("PERMISSION TESTS");

    results.push(this.testPermissionManagerExists());
    results.push(this.testNormalizeRole());
    results.push(this.testGetPermissions());
    results.push(this.testHasPermission());
    results.push(this.testSuperAdminPermissions());
    results.push(this.testHodPermissions());
    results.push(this.testCoordinatorPermissions());
    results.push(this.testEventAdminPermissions());

    return results;
  },

  //-------------------------------------------------------
  // PermissionManager Exists
  //-------------------------------------------------------

  testPermissionManagerExists: function () {

    TestLogger.test("Checking PermissionManager");

    TestAssertions.assertTrue(
      typeof PermissionManager !== "undefined",
      "PermissionManager not found"
    );

    return "PermissionManager exists";
  },

  //-------------------------------------------------------
  // normalizeRole()
  //-------------------------------------------------------

  testNormalizeRole: function () {

    TestLogger.test("Checking normalizeRole()");

    TestAssertions.assertEquals(
      "SUPER_ADMIN",
      PermissionManager.normalizeRole("SuperAdmin")
    );

    TestAssertions.assertEquals(
      "HOD",
      PermissionManager.normalizeRole("HOD")
    );

    TestAssertions.assertEquals(
      "EVENT_ADMIN",
      PermissionManager.normalizeRole("Event Admin")
    );

    TestAssertions.assertEquals(
      "COORDINATOR",
      PermissionManager.normalizeRole("Coordinator")
    );

    return "normalizeRole() OK";
  },

  //-------------------------------------------------------
  // getPermissions()
  //-------------------------------------------------------

  testGetPermissions: function () {

    TestLogger.test("Checking getPermissions()");

    var permissions =
      PermissionManager.getPermissions("SUPER_ADMIN");

    TestAssertions.assertTrue(
      permissions.length > 0,
      "No permissions returned"
    );

    return "getPermissions() OK";
  },

  //-------------------------------------------------------
  // hasPermission()
  //-------------------------------------------------------

  testHasPermission: function () {

    TestLogger.test("Checking hasPermission()");

    TestAssertions.assertTrue(
      PermissionManager.hasPermission(
        "dashboard",
        "SUPER_ADMIN"
      ),
      "Dashboard should be allowed"
    );

    TestAssertions.assertFalse(
      PermissionManager.hasPermission(
        "monitoring",
        "HOD"
      ),
      "Monitoring should NOT be allowed"
    );

    return "hasPermission() OK";
  },

  //-------------------------------------------------------
  // SUPER ADMIN
  //-------------------------------------------------------

  testSuperAdminPermissions: function () {

    TestLogger.test("SUPER ADMIN Permissions");

    TestAssertions.assertTrue(
      PermissionManager.hasPermission(
        "users",
        "SUPER_ADMIN"
      )
    );

    TestAssertions.assertTrue(
      PermissionManager.hasPermission(
        "settings",
        "SUPER_ADMIN"
      )
    );

    return "SUPER_ADMIN permissions OK";
  },

  //-------------------------------------------------------
  // HOD
  //-------------------------------------------------------

  testHodPermissions: function () {

    TestLogger.test("HOD Permissions");

    TestAssertions.assertTrue(
      PermissionManager.hasPermission(
        "students",
        "HOD"
      )
    );

    TestAssertions.assertFalse(
      PermissionManager.hasPermission(
        "monitoring",
        "HOD"
      )
    );

    return "HOD permissions OK";
  },

  //-------------------------------------------------------
  // COORDINATOR
  //-------------------------------------------------------

  testCoordinatorPermissions: function () {

    TestLogger.test("Coordinator Permissions");

    TestAssertions.assertTrue(
      PermissionManager.hasPermission(
        "attendance",
        "COORDINATOR"
      )
    );

    TestAssertions.assertFalse(
      PermissionManager.hasPermission(
        "users",
        "COORDINATOR"
      )
    );

    return "COORDINATOR permissions OK";
  },

  //-------------------------------------------------------
  // EVENT ADMIN
  //-------------------------------------------------------

  testEventAdminPermissions: function () {

    TestLogger.test("Event Admin Permissions");

    TestAssertions.assertTrue(
      PermissionManager.hasPermission(
        "participants",
        "EVENT_ADMIN"
      )
    );

    TestAssertions.assertFalse(
      PermissionManager.hasPermission(
        "users",
        "EVENT_ADMIN"
      )
    );

    return "EVENT_ADMIN permissions OK";
  }

};
*/