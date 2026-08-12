/**
 * ==========================================================
 * TEST_MockDatabaseService.gs
 * ==========================================================
 * Tests MockDatabaseService
 * ==========================================================
 */

var MockDatabaseServiceTests = {

    run: function () {

        var results = [];

        TestLogger.section("MOCK DATABASE SERVICE TESTS");

        results.push(this.testReset());
        results.push(this.testReadAllRows());
        results.push(this.testFindOne());
        results.push(this.testExists());
        results.push(this.testInsertRow());
        results.push(this.testUpdateRow());
        results.push(this.testDeleteRow());
        results.push(this.testClear());

        return results;

    },

    /**
     * ----------------------------------------------------------
     * reset()
     * ----------------------------------------------------------
     */
    testReset: function () {

        TestLogger.test("Testing reset()");

        MockDatabaseService.reset();

        var users = MockDatabaseService.readAllRows("users");

        TestAssertions.assertEquals(
            3,
            users.length,
            "reset() should restore initial data"
        );

        return "reset()";

    },

    /**
     * ----------------------------------------------------------
     * readAllRows()
     * ----------------------------------------------------------
     */
    testReadAllRows: function () {

        TestLogger.test("Testing readAllRows()");

        MockDatabaseService.reset();

        var users = MockDatabaseService.readAllRows("users");

        TestAssertions.assertTrue(
            Array.isArray(users),
            "Should return an array"
        );

        TestAssertions.assertTrue(
            users.length > 0,
            "Should return users"
        );

        return "readAllRows()";

    },

    /**
     * ----------------------------------------------------------
     * findOne()
     * ----------------------------------------------------------
     */
    testFindOne: function () {

        TestLogger.test("Testing findOne()");

        MockDatabaseService.reset();

        var user = MockDatabaseService.findOne(
            "users",
            "username",
            "principal"
        );

        TestAssertions.assertNotNull(
            user,
            "principal should exist"
        );

        TestAssertions.assertEquals(
            "SUPER_ADMIN",
            user.role,
            "Wrong role"
        );

        return "findOne()";

    },

    /**
     * ----------------------------------------------------------
     * exists()
     * ----------------------------------------------------------
     */
    testExists: function () {

        TestLogger.test("Testing exists()");

        MockDatabaseService.reset();

        TestAssertions.assertTrue(

            MockDatabaseService.exists(
                "users",
                "username",
                "principal"
            ),

            "principal should exist"

        );

        return "exists()";

    },

    /**
     * ----------------------------------------------------------
     * insertRow()
     * ----------------------------------------------------------
     */
    testInsertRow: function () {

        TestLogger.test("Testing insertRow()");

        MockDatabaseService.reset();

        MockDatabaseService.insertRow("users", {

            userId: "USER_TEST",

            employeeId: "USER_TEST",

            username: "test",

            role: "COORDINATOR",

            status: "Active",

            deletionFlag: false

        });

        var users = MockDatabaseService.readAllRows("users");

        TestAssertions.assertEquals(

            4,

            users.length,

            "Insert failed"

        );

        return "insertRow()";

    },

    /**
     * ----------------------------------------------------------
     * updateRow()
     * ----------------------------------------------------------
     */
    testUpdateRow: function () {

        TestLogger.test("Testing updateRow()");

        MockDatabaseService.reset();

        MockDatabaseService.updateRow(

            "users",

            "userId",

            "USER_SA_01",

            {

                status: "Inactive"

            }

        );

        var user = MockDatabaseService.findOne(

            "users",

            "userId",

            "USER_SA_01"

        );

        TestAssertions.assertEquals(

            "Inactive",

            user.status,

            "Update failed"

        );

        return "updateRow()";

    },

    /**
     * ----------------------------------------------------------
     * deleteRow()
     * ----------------------------------------------------------
     */
    testDeleteRow: function () {

        TestLogger.test("Testing deleteRow()");

        MockDatabaseService.reset();

        MockDatabaseService.deleteRow(

            "users",

            "userId",

            "USER_SA_01"

        );

        var users = MockDatabaseService.readAllRows("users");

        TestAssertions.assertEquals(

            2,

            users.length,

            "Delete failed"

        );

        return "deleteRow()";

    },

    /**
     * ----------------------------------------------------------
     * clear()
     * ----------------------------------------------------------
     */
    testClear: function () {

        TestLogger.test("Testing clear()");

        MockDatabaseService.reset();

        MockDatabaseService.clear();

        var users = MockDatabaseService.readAllRows("users");

        TestAssertions.assertEquals(

            0,

            users.length,

            "clear() failed"

        );

        return "clear()";

    }

};