/**
 * ============================================================
 * SUPER ADMIN DASHBOARD TESTING FRAMEWORK
 * Version : 1.0
 * ============================================================
 */

var DASHBOARD_TEST_RESULTS = [];

/**
 * ------------------------------------------------------------
 * Start Test
 * ------------------------------------------------------------
 */
function startDashboardTest(testName) {

    Logger.log("");
    Logger.log("==================================================");
    Logger.log("RUNNING : " + testName);
    Logger.log("==================================================");

    return new Date().getTime();

}

/**
 * ------------------------------------------------------------
 * PASS
 * ------------------------------------------------------------
 */
function passDashboardTest(testName, startTime, details) {

    var time = new Date().getTime() - startTime;

    DASHBOARD_TEST_RESULTS.push({

        test: testName,

        status: "PASS",

        reason: "",

        details: details || "",

        executionTime: time

    });

    Logger.log("✅ PASS");

    if (details) {

        Logger.log(details);

    }

}

/**
 * ------------------------------------------------------------
 * FAIL
 * ------------------------------------------------------------
 */
function failDashboardTest(testName, reason, startTime) {

    var time = new Date().getTime() - startTime;

    DASHBOARD_TEST_RESULTS.push({

        test: testName,

        status: "FAIL",

        reason: reason,

        details: "",

        executionTime: time

    });

    Logger.log("❌ FAIL");

    Logger.log(reason);

}

/**
 * ------------------------------------------------------------
 * PRINT SUMMARY
 * ------------------------------------------------------------
 */
function printDashboardSummary() {

    Logger.log("");
    Logger.log("==================================================");
    Logger.log("        SUPER ADMIN DASHBOARD TEST SUMMARY");
    Logger.log("==================================================");

    var pass = 0;
    var fail = 0;

    DASHBOARD_TEST_RESULTS.forEach(function (result, index) {

        Logger.log("");

        Logger.log((index + 1) + ". " + result.test);

        Logger.log("Status : " + result.status);

        if (result.reason) {

            Logger.log("Reason : " + result.reason);

        }

        if (result.details) {

            Logger.log("Details : " + result.details);

        }

        Logger.log("Execution Time : " + result.executionTime + " ms");

        if (result.status === "PASS") {

            pass++;

        } else {

            fail++;

        }

    });

    Logger.log("");

    Logger.log("--------------------------------------------------");

    Logger.log("Total Tests : " + DASHBOARD_TEST_RESULTS.length);

    Logger.log("Passed      : " + pass);

    Logger.log("Failed      : " + fail);

    Logger.log("Success %   : " +
        ((pass / DASHBOARD_TEST_RESULTS.length) * 100).toFixed(2) + "%");

    Logger.log("--------------------------------------------------");

}
/**
 * ============================================================
 * TEST 1 : SESSION
 * ============================================================
 */

function test_Session() {

    var start = startDashboardTest("Super Admin Session");

    try {

        var sessionToken = localStorage.getItem("sessionToken");

        if (!sessionToken) {

            failDashboardTest(
                "Super Admin Session",
                "Session token not found.",
                start
            );

            return;

        }

        passDashboardTest(
            "Super Admin Session",
            start,
            "Session Token : " + sessionToken
        );

    } catch (e) {

        failDashboardTest(
            "Super Admin Session",
            e.toString(),
            start
        );

    }

}
function test_GetDashboardData() {

    var start = startDashboardTest("Get Dashboard Data");

    try {

        var userContext = {

            userId: "USER_SA_01",

            role: "SuperAdmin",

            isSuperAdmin: true

        };

        var dashboard =
            DashboardService.getAggregatedDashboardData(
                "USER_SA_01",
                userContext
            );

        if (dashboard) {

            passDashboardTest(
                "Get Dashboard Data",
                start,
                "Dashboard Loaded"
            );

        } else {

            failDashboardTest(
                "Get Dashboard Data",
                "Dashboard returned null",
                start
            );

        }

    } catch (e) {

        failDashboardTest(
            "Get Dashboard Data",
            e.toString(),
            start
        );

    }

}

/**
 * ============================================================
 * RUN ALL TESTS
 * ============================================================
 */

function runSuperAdminDashboardTests() {

    Logger.clear();

    DASHBOARD_TEST_RESULTS = [];

    Logger.log("");
    Logger.log("##################################################");
    Logger.log("SUPER ADMIN DASHBOARD AUTOMATED TEST SUITE");
    Logger.log("##################################################");

    /**
     * PART 2
     */

    test_Session();

    test_UserContext();

    test_DashboardAPI();

    /**
     * PART 3
     */

    test_TotalEventAdmins();

    test_ActiveEvents();

    test_TotalDepartments();

    test_CompletedEvents();

    test_TodaysAttendance();

    test_TopEventToday();

    /**
     * SUMMARY
     */

    printDashboardSummary();

}