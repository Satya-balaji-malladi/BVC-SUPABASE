/**
 * ==========================================
 * TESTING FRAMEWORK
 * ==========================================
 */

var TEST_RESULTS = [];

function startTest(testName) {

  Logger.log("");
  Logger.log("========================================");
  Logger.log("RUNNING : " + testName);
  Logger.log("========================================");

  return new Date().getTime();
}
function test_UpdateProfile() {

  var start = startTest("Update Super Admin Profile");

  try {

    var profileData = {

      first_name: "Dr. D.S.V.",
      last_name: "Ramana",
      phone_number: "9999999999",
      bio_notes: "Testing Profile Update",
      language: "en-IN",
      theme_preference: "Dark"

    };

    Logger.log("===== PROFILE DATA =====");
    Logger.log(JSON.stringify(profileData, null, 2));

    var result = UserService.updateProfile(

      "USER_SA_01",
      profileData,
      "USER_SA_01"

    );

    Logger.log("===== RESULT =====");
    Logger.log(JSON.stringify(result, null, 2));

    if (result.success) {

      passTest("Update Super Admin Profile", start);

    } else {

      failTest(
        "Update Super Admin Profile",
        result.message,
        start
      );

    }

  } catch (e) {

    failTest(
      "Update Super Admin Profile",
      e.toString(),
      start
    );

  }

}

function passTest(testName, startTime) {

  var time = new Date().getTime() - startTime;

  TEST_RESULTS.push({
    name: testName,
    status: "PASS",
    reason: "",
    time: time
  });

  Logger.log("✅ PASS");
}

function failTest(testName, reason, startTime) {

  var time = new Date().getTime() - startTime;

  TEST_RESULTS.push({
    name: testName,
    status: "FAIL",
    reason: reason,
    time: time
  });

  Logger.log("❌ FAIL");
  Logger.log(reason);
}

function printSummary() {

  Logger.log("");
  Logger.log("========================================");
  Logger.log("           TEST SUMMARY");
  Logger.log("========================================");

  var pass = 0;
  var fail = 0;

  TEST_RESULTS.forEach(function (test, index) {

    Logger.log("");

    Logger.log((index + 1) + ". " + test.name);

    Logger.log("Status : " + test.status);

    if (test.reason) {

      Logger.log("Reason : " + test.reason);

    }

    Logger.log("Time : " + test.time + " ms");

    if (test.status === "PASS")
      pass++;
    else
      fail++;

  });

  Logger.log("");

  Logger.log("----------------------------------------");

  Logger.log("Total Tests : " + TEST_RESULTS.length);

  Logger.log("Passed      : " + pass);

  Logger.log("Failed      : " + fail);

  Logger.log("Success %   : " + ((pass / TEST_RESULTS.length) * 100).toFixed(2) + "%");

  Logger.log("----------------------------------------");

}
function test_GetUser() {

  var start = startTest("Get Super Admin");

  try {

    var user = UserService.getUserById("USER_SA_01");

    if (!user) {

      failTest("Get Super Admin", "User Not Found", start);

      return;

    }

    passTest("Get Super Admin", start);

  }

  catch (e) {

    failTest("Get Super Admin", e.toString(), start);

  }

}
function test_Login() {

  var start = startTest("Super Admin Login");

  try {

    var result = AuthService.login({

      employeeId: "USER_SA_01",

      password: "admin123"

    });
    if (result.success) {

      passTest("Super Admin Login", start);

    } else {

      failTest(
        "Super Admin Login",
        result.message,
        start
      );

    }

  }

  catch (e) {

    failTest(
      "Super Admin Login",
      e.toString(),
      start
    );

  }

}
function test_VerifyProfile() {

  var start = startTest("Verify Updated Profile");

  try {

    var user = UserService.getUserById("USER_SA_01");

    Logger.log("===== DATABASE DATA =====");
    Logger.log(JSON.stringify(user, null, 2));

    if (!user) {

      failTest(
        "Verify Updated Profile",
        "User not found",
        start
      );

      return;

    }

    var failed = [];

    if (user["First Name"] !== "Dr. D.S.V.")
      failed.push("First Name");

    if (user["Last Name"] !== "Ramana")
      failed.push("Last Name");

    if (user["Phone Number"] !== "9999999999")
      failed.push("Phone Number");

    if (user["Theme Preference"] !== "Dark")
      failed.push("Theme Preference");

    if (user["Bio/Notes"] !== "Testing Profile Update")
      failed.push("Bio/Notes");

    if (failed.length > 0) {

      failTest(
        "Verify Updated Profile",
        "Mismatch : " + failed.join(", "),
        start
      );

      return;

    }

    passTest(
      "Verify Updated Profile",
      start
    );

  }

  catch (e) {

    failTest(
      "Verify Updated Profile",
      e.toString(),
      start
    );

  }

}
function test_CompleteProfile() {

  var start = startTest("Complete Profile");

  try {

    var payload = {

      name: "Dr. D.S.V. Ramana",

      phone: "9999999999",

      email: "principal@bvc.edu.in",

      department: "ADMIN"

    };

    Logger.log("===== COMPLETE PROFILE PAYLOAD =====");
    Logger.log(JSON.stringify(payload, null, 2));

    var result = UserService.completeUserProfile(
      "USER_SA_01",
      payload
    );

    Logger.log("===== COMPLETE PROFILE RESULT =====");
    Logger.log(JSON.stringify(result, null, 2));

    if (result.success) {

      passTest("Complete Profile", start);

    } else {

      failTest(
        "Complete Profile",
        result.message,
        start
      );

    }

  } catch (e) {

    failTest(
      "Complete Profile",
      e.toString(),
      start
    );

  }

}
function runSuperAdminTests() {

  Logger.clear();

  TEST_RESULTS = [];

  Logger.log("");
  Logger.log("#############################################");
  Logger.log("SUPER ADMIN AUTOMATED TEST SUITE");
  Logger.log("#############################################");

  test_GetUser();

  test_Login();

  test_UpdateProfile();

  test_VerifyProfile();

  test_CompleteProfile();

  printSummary();
}