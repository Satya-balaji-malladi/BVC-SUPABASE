function testLoginSuccess() {

  Logger.log("===== TEST : Login Success =====");

  var result = AuthService.login({
    employeeId: "EMP001",
    password: "Password123"
  });

  Logger.log(JSON.stringify(result));

}function generateTestPasswordHash() {
  Logger.log(Utils.hashString("Password123"));
}
function testAuditSheet() {

  Logger.log("===== AUDIT SHEET TEST =====");

  Logger.log(CONFIG.SHEETS.AUDITLOGS);

  var sheet = DatabaseService.getSheet(CONFIG.SHEETS.AUDITLOGS);

  Logger.log(sheet ? "Sheet Found" : "Sheet Missing");

  var headers = DatabaseService.getHeaderRow(CONFIG.SHEETS.AUDITLOGS);

  Logger.log(JSON.stringify(headers));

}
function debugUserPassword() {

  var user = DatabaseService.findOne(
    CONFIG.SHEETS.USERS,
    CONFIG.COLUMNS.USER_EMPLOYEE_ID,
    "EMP001"
  );

  Logger.log(JSON.stringify(user));

}function testPasswordHash() {

  var password = "Password123";

  Logger.log("Without Salt:");
  Logger.log(AuthService.hashPassword(password, ""));

  Logger.log("With N/A Salt:");
  Logger.log(AuthService.hashPassword(password, "N/A"));

}
function testLogout() {

  Logger.log("===== TEST : Logout =====");

  // Step 1: Login
  var loginResult = AuthService.login({
    employeeId: "EMP001",
    password: "Password123"
  });

  if (!loginResult.success) {
    Logger.log("❌ Login failed");
    Logger.log(JSON.stringify(loginResult));
    return;
  }

  // Step 2: Get session token
  var sessionToken = loginResult.token["Session Token"];

  Logger.log("Session Token:");
  Logger.log(sessionToken);

  // Step 3: Logout
  var result = AuthService.logout(sessionToken);

  Logger.log(JSON.stringify(result));

}
function testLogoutVerification() {

  Logger.log("===== TEST : Logout Verification =====");

  var login = AuthService.login({
    employeeId: "EMP001",
    password: "Password123"
  });

  if (!login.success) {
    Logger.log("Login Failed");
    return;
  }

  var token = login.token["Session Token"];

  AuthService.logout(token);

  var valid = SessionService.validateSession(token);

  Logger.log("Session Valid After Logout:");
  Logger.log(valid);

}
function testChangePasswordSuccess() {

  Logger.log("===== TEST : Change Password Success =====");

  var result = AuthService.changePassword(
    "USRTEST001",
    "Password123",
    "NewPassword123"
  );

  Logger.log(JSON.stringify(result));

}
function testChangePasswordWrongOldPassword() {

  Logger.log("===== TEST : Wrong Old Password =====");

  var result = AuthService.changePassword(
    "USRTEST001",
    "WrongPassword",
    "NewPassword123"
  );

  Logger.log(JSON.stringify(result));

}
function testChangePasswordEmptyNewPassword() {

  Logger.log("===== TEST : Empty New Password =====");

  var result = AuthService.changePassword(
    "USRTEST001",
    "Password123",
    ""
  );

  Logger.log(JSON.stringify(result));

}
function testChangePasswordShortPassword() {

  Logger.log("===== TEST : Short Password =====");

  var result = AuthService.changePassword(
    "USRTEST001",
    "Password123",
    "123"
  );

  Logger.log(JSON.stringify(result));

}
function testLoginWithNewPassword() {

  Logger.log("===== TEST : Login With New Password =====");

  var result = AuthService.login({
    employeeId: "EMP001",
    password: "NewPassword123"
  });

  Logger.log(JSON.stringify(result));

}
function testLoginWithOldPassword() {

  Logger.log("===== TEST : Login With Old Password =====");

  var result = AuthService.login({
    employeeId: "EMP001",
    password: "Password123"
  });

  Logger.log(JSON.stringify(result));

}
function testForgotPassword() {

  Logger.log("===== TEST : Forgot Password =====");

  var result = AuthService.forgotPassword("USRTEST001");

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(JSON.stringify(result));
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }
}
function testVerifyOTP() {

  Logger.log("===== TEST : Verify OTP =====");

  var result = AuthService.verifyOTP(
    "USRTEST001",
    "123456"
  );

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(JSON.stringify(result));
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }
}
function testResetPassword() {

  Logger.log("===== TEST : Reset Password =====");

  var result = AuthService.resetPassword(
    "USRTEST001",
    "123456",
    "ResetPassword123"
  );

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(JSON.stringify(result));
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }
}
function testLoginAfterResetPassword() {

  Logger.log("===== TEST : Login After Reset =====");

  var result = AuthService.login({
    employeeId: "EMP001",
    password: "ResetPassword123"
  });

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(JSON.stringify(result));
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }
}
function testLockAccount() {

  Logger.log("===== TEST : Lock Account =====");

  var result = AuthService.lockAccount("USRTEST001");

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(JSON.stringify(result));
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }
}
function testUnlockAccount() {

  Logger.log("===== TEST : Unlock Account =====");

  var result = AuthService.unlockAccount("USRTEST001");

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(JSON.stringify(result));
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }
}
function testReadOTP() {

  Logger.log("===== TEST : Read OTP =====");

  var user = DatabaseService.findOne(
    CONFIG.SHEETS.USERS,
    CONFIG.COLUMNS.USER_ID,
    "USRTEST001"
  );

  Logger.log("Stored OTP:");
  Logger.log(user[CONFIG.COLUMNS.USER_OTP]);

  Logger.log("Expiry:");
  Logger.log(user[CONFIG.COLUMNS.USER_OTP_EXPIRY]);

}
function testOTPConfig() {

  Logger.log("===== OTP CONFIG =====");

  Logger.log("USER_OTP = " + CONFIG.COLUMNS.USER_OTP);
  Logger.log("USER_OTP_EXPIRY = " + CONFIG.COLUMNS.USER_OTP_EXPIRY);
  Logger.log("USER_OTP_ATTEMPTS = " + CONFIG.COLUMNS.USER_OTP_ATTEMPTS);

}
function testVerifyOTPSuccess() {

  Logger.log("===== TEST : Verify OTP Success =====");

  var result = AuthService.verifyOTP(
    "USRTEST001",
    "223475"   // <-- Use the latest OTP from testForgotPassword()
  );

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(JSON.stringify(result));
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }
}
function testVerifyOTPInvalid() {

  Logger.log("===== TEST : Verify OTP Invalid =====");

  var result = AuthService.verifyOTP(
    "USRTEST001",
    "111111"
  );

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
    Logger.log(JSON.stringify(result));
  }

}
function testReadOTPAfterVerify() {

  var user = DatabaseService.findOne(
    CONFIG.SHEETS.USERS,
    CONFIG.COLUMNS.USER_ID,
    "USRTEST001"
  );

  Logger.log(JSON.stringify(user));

}
function testResetPasswordSuccess() {

  Logger.log("===== TEST : Reset Password Success =====");

  // Step 1: Generate a fresh OTP
  AuthService.forgotPassword("USRTEST001");

  // Step 2: Read the generated OTP
  var user = DatabaseService.findOne(
    CONFIG.SHEETS.USERS,
    CONFIG.COLUMNS.USER_ID,
    "USRTEST001"
  );

  var otp = String(user[CONFIG.COLUMNS.USER_OTP]);

  Logger.log("Using OTP: " + otp);

  // Step 3: Reset the password
  var result = AuthService.resetPassword(
    "USRTEST001",
    otp,
    "NewPassword123"
  );

  Logger.log(JSON.stringify(result));
}
function testLoginAfterReset_NewPassword() {

  Logger.log("===== TEST : Login With New Password =====");

  var result = AuthService.login({
    employeeId: "EMP001",
    password: "NewPassword123"
  });

  Logger.log(JSON.stringify(result));

}
function testLoginAfterReset_OldPassword() {

  Logger.log("===== TEST : Login With Old Password =====");

  var result = AuthService.login({
    employeeId: "EMP001",
    password: "Password123"
  });

  Logger.log(JSON.stringify(result));

}
function testFailedLoginAttempts() {

  Logger.log("===== TEST : Failed Login Attempt =====");

  var result = AuthService.login({
    employeeId: "EMP001",
    password: "WrongPassword123"
  });

  Logger.log(JSON.stringify(result));

}
function testReadFailedAttempts() {

  Logger.log("===== TEST : Failed Login Counter =====");

  var user = DatabaseService.findOne(
    CONFIG.SHEETS.USERS,
    CONFIG.COLUMNS.USER_ID,
    "USRTEST001"
  );

  Logger.log("Failed Login Attempts:");
  Logger.log(user[CONFIG.COLUMNS.USER_FAILED_ATTEMPTS]);

  Logger.log("Account Locked:");
  Logger.log(user[CONFIG.COLUMNS.USER_ACCOUNT_LOCKED]);

}
function testFailedLoginAttempt() {

  Logger.log("===== TEST : Failed Login Attempt =====");

  var result = AuthService.login({
    employeeId: "EMP001",
    password: "WrongPassword123"
  });

  Logger.log(JSON.stringify(result));

}
function testMaxLoginAttempts() {

  Logger.log("===== MAX LOGIN ATTEMPTS =====");
  Logger.log(CONFIG.SECURITY.MAX_LOGIN_ATTEMPTS);

}
function testReadFailedAttempts() {

  Logger.log("===== USER STATUS =====");

  var user = DatabaseService.findOne(
    CONFIG.SHEETS.USERS,
    CONFIG.COLUMNS.USER_ID,
    "USRTEST001"
  );

  Logger.log("Failed Login Attempts: " + user[CONFIG.COLUMNS.USER_FAILED_ATTEMPTS]);
  Logger.log("Account Locked: " + user[CONFIG.COLUMNS.USER_ACCOUNT_LOCKED]);

}
function testLoginLockedAccount() {

  Logger.log("===== TEST : Login Locked Account =====");

  var result = AuthService.login({
    employeeId: "EMP001",
    password: "NewPassword123"
  });

  Logger.log(JSON.stringify(result));

}
function testUnlockAccount() {

  Logger.log("===== TEST : Unlock Account =====");

  var result = AuthService.unlockAccount("USRTEST001");

  if (result.success) {
    Logger.log("✅ PASS");
  } else {
    Logger.log("❌ FAIL");
  }

  Logger.log(JSON.stringify(result));

}
function testReadUnlockedUser() {

  Logger.log("===== USER AFTER UNLOCK =====");

  var user = DatabaseService.findOne(
    CONFIG.SHEETS.USERS,
    CONFIG.COLUMNS.USER_ID,
    "USRTEST001"
  );

  Logger.log("Failed Login Attempts: " + user["Failed Login Attempts"]);
  Logger.log("Account Locked: " + user["Account Locked"]);

}

function runAuthServiceUnitTests() {
  Logger.log('--- Running AuthServiceUnitTests ---');
  testPasswordHash();
  testLogoutVerification();
  testUnlockAccount();
  Logger.log('--- AuthServiceUnitTests Completed ---');
}