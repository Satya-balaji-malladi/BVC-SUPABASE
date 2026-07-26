function testUsersConfig() {

  Logger.log("USER_USERNAME:");
  Logger.log(CONFIG.COLUMNS.USER_USERNAME);

  Logger.log("USER_EMAIL_ADDRESS:");
  Logger.log(CONFIG.COLUMNS.USER_EMAIL_ADDRESS);

  Logger.log("USER_ROLE:");
  Logger.log(CONFIG.COLUMNS.USER_ROLE);

  Logger.log("USER_STATUS:");
  Logger.log(CONFIG.COLUMNS.USER_STATUS);

  Logger.log("USER_PASSWORD_HASH:");
  Logger.log(CONFIG.COLUMNS.USER_PASSWORD_HASH);

}
function testUsernameColumn() {

  Logger.log(UserService._mustUsernameCol());

}
function testPaginateUsers() {

  Logger.log("===== TEST 1 : Page 1 =====");
  Logger.log(UserService.paginateUsers(1, 5));

  Logger.log("===== TEST 2 : Page 2 =====");
  Logger.log(UserService.paginateUsers(2, 5));

  Logger.log("===== TEST 3 : Large Page =====");
  Logger.log(UserService.paginateUsers(1, 100));

  Logger.log("===== TEST 4 : Invalid Page =====");
  Logger.log(UserService.paginateUsers(0, 5));

  Logger.log("===== TEST 5 : Invalid Page Size =====");
  Logger.log(UserService.paginateUsers(1, 0));

}

function testEmailColumn() {

  Logger.log(UserService._mustEmailCol());

}
function testCreateUser() {

  Logger.log("===== TEST : Create User =====");

  var userData = {
    "Employee ID": "EMP200",
    "First Name": "Test",
    "Last Name": "User",
    "Email Address": "testuser200@example.com",
    "Username": "testuser200",
    "Password": "Password123",
    "Role": "Coordinator",
    "Status": "Active"
  };

  var result = UserService.createUser(userData);

  if (result && result.success) {
    Logger.log("✅ PASS");
    Logger.log(JSON.stringify(result));
  } else {
    Logger.log("❌ FAIL");
    Logger.log(JSON.stringify(result));
  }

}
function testGetUserById() {

  Logger.log("===== TEST : Get User By ID =====");

  var result = UserService.getUserById("USR0011");

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(JSON.stringify(result.user));
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }

}
function testUpdateUserSuccess() {

  Logger.log("===== TEST : Update User Success =====");

  var updateData = {};

  updateData[CONFIG.COLUMNS.USER_FIRST_NAME] = "Balaji";
  updateData[CONFIG.COLUMNS.USER_LAST_NAME] = "Testing";
  updateData[CONFIG.COLUMNS.USER_EMAIL_ADDRESS] = "balaji.testing@gmail.com";
  updateData[CONFIG.COLUMNS.USER_ROLE] = "Admin";
  updateData[CONFIG.COLUMNS.USER_STATUS] = "Inactive";

  var result = UserService.updateUser(
    "USR0011",
    updateData
  );

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(JSON.stringify(result.data || result.user || result));
  } else {
    Logger.log("❌ FAIL");
    Logger.log(JSON.stringify(result));
  }

}
function testUpdateUserInvalidId() {

  Logger.log("===== TEST : Update Invalid User =====");

  var updateData = {};

  updateData[CONFIG.COLUMNS.USER_FIRST_NAME] = "Dummy";

  var result = UserService.updateUser(
    "USR999999",
    updateData
  );

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
    Logger.log(JSON.stringify(result));
  }

}
function testCreateSecondUser() {

  Logger.log("===== TEST : Create Second User =====");

  var userData = {
    "Employee ID": "EMP201",
    "First Name": "Second",
    "Last Name": "User",
    "Email Address": "seconduser@gmail.com",
    "Username": "seconduser",
    "Password": "Password123",
    "Role": "Coordinator",
    "Status": "Active"
  };

  var result = UserService.createUser(userData);

  Logger.log(JSON.stringify(result));

}

function testUpdateDuplicateUsername() {

  Logger.log("===== TEST : Duplicate Username =====");

  var updateData = {};

  updateData[CONFIG.COLUMNS.USER_USERNAME] = "seconduser";

  var result = UserService.updateUser(
    "USR0011",
    updateData
  );

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
    Logger.log(JSON.stringify(result));
  }

}
function testUpdateDuplicateEmail() {

  Logger.log("===== TEST : Duplicate Email =====");

  var updateData = {};

  updateData[CONFIG.COLUMNS.USER_EMAIL_ADDRESS] =
      "seconduser@gmail.com";

  var result = UserService.updateUser(
      "USR0011",
      updateData
  );

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
    Logger.log(JSON.stringify(result));
  }

}
function testUpdateUserIdProtected() {

  Logger.log("===== TEST : User ID Protected =====");

  var updateData = {};

  updateData[CONFIG.COLUMNS.USER_ID] = "USR9999";
  updateData[CONFIG.COLUMNS.USER_FIRST_NAME] = "Protected Test";

  var result = UserService.updateUser(
    "USR0011",
    updateData
  );

  if (result.success) {

    Logger.log("✅ PASS");

    Logger.log("Returned User ID:");
    Logger.log(result.user[CONFIG.COLUMNS.USER_ID]);

  } else {

    Logger.log("❌ FAIL");
    Logger.log(result.message);

  }

}
function testPasswordHashProtected() {

  Logger.log("===== TEST : Password Hash Protected =====");

  var updateData = {};

  updateData[CONFIG.COLUMNS.USER_PASSWORD_HASH] = "HACKED_HASH";
  updateData[CONFIG.COLUMNS.USER_FIRST_NAME] = "Hash Test";

  var result = UserService.updateUser(
    "USR0011",
    updateData
  );

  if (result.success) {

    Logger.log("✅ PASS");

    var user = DatabaseService.findById(
      CONFIG.SHEETS.USERS,
      CONFIG.ID_COLUMNS.USERS,
      "USR0011"
    );

    Logger.log("Stored Password Hash:");
    Logger.log(user[CONFIG.COLUMNS.USER_PASSWORD_HASH]);

  } else {

    Logger.log("❌ FAIL");
    Logger.log(result.message);

  }

}
function testEmptyUpdate() {

  Logger.log("===== TEST : Empty Update =====");

  var result = UserService.updateUser(
    "USR0011",
    {}
  );

  Logger.log(JSON.stringify(result));

}
function testDeleteUserSuccess() {

  Logger.log("===== TEST : Delete User =====");

  var result = UserService.deleteUser(
    "USR0012",
    "System"
  );

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(JSON.stringify(result));
  } else {
    Logger.log("❌ FAIL");
    Logger.log(JSON.stringify(result));
  }

}
function testDeleteInvalidUser() {

  Logger.log("===== TEST : Delete Invalid User =====");

  var result = UserService.deleteUser(
    "USR999999",
    "System"
  );

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
    Logger.log(JSON.stringify(result));
  }

}
function testActivateUserSuccess() {

  Logger.log("===== TEST : Activate User =====");

  var result = UserService.activateUser(
    "USR0011",
    "System"
  );

  if (result.success) {

    Logger.log("✅ PASS");

    Logger.log("Status:");
    Logger.log(result.user["Status"]);

  } else {

    Logger.log("❌ FAIL");
    Logger.log(result.message);

  }

}
function testActivateInvalidUser() {

  Logger.log("===== TEST : Activate Invalid User =====");

  var result = UserService.activateUser(
    "USR999999",
    "System"
  );

  if (!result.success) {

    Logger.log("✅ PASS");
    Logger.log(result.message);

  } else {

    Logger.log("❌ FAIL");
    Logger.log(JSON.stringify(result));

  }

}
function testDeactivateUser() {

  Logger.log("======================================");
  Logger.log("TEST 1 : Deactivate Existing User");
  Logger.log("======================================");

  var result = UserService.deactivateUser("USR0011", "System");

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
    return;
  }


  Logger.log("");
  Logger.log("======================================");
  Logger.log("TEST 2 : Verify Status");
  Logger.log("======================================");

  var user = DatabaseService.findOne(
    CONFIG.SHEETS.USERS,
    CONFIG.COLUMNS.USER_ID,
    "USR0011"
  );

  if (user && user[CONFIG.COLUMNS.USER_STATUS] === CONFIG.USER_STATUS.INACTIVE) {
    Logger.log("✅ PASS");
    Logger.log("Status : " + user[CONFIG.COLUMNS.USER_STATUS]);
  } else {
    Logger.log("❌ FAIL");
    Logger.log("Status verification failed");
  }


  Logger.log("");
  Logger.log("======================================");
  Logger.log("TEST 3 : Already Inactive User");
  Logger.log("======================================");

  result = UserService.deactivateUser("USR0011", "System");

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }


  Logger.log("");
  Logger.log("======================================");
  Logger.log("TEST 4 : Invalid User");
  Logger.log("======================================");

  result = UserService.deactivateUser("USR999999", "System");

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
    Logger.log("Invalid user should not be deactivated.");
  }


  Logger.log("");
  Logger.log("======================================");
  Logger.log("TEST 5 : Login After Deactivation");
  Logger.log("======================================");

  var login = AuthService.login({
    employeeId: "EMP200",
    password: "YOUR_CURRENT_PASSWORD"
  });

  if (!login.success) {
    Logger.log("✅ PASS");
    Logger.log(login.message);
  } else {
    Logger.log("❌ FAIL");
    Logger.log("Inactive user logged in.");
  }


  Logger.log("");
  Logger.log("======================================");
  Logger.log("DEACTIVATE USER TEST COMPLETED");
  Logger.log("======================================");

}
function testResetPassword() {

  Logger.log("==================================");
  Logger.log("TEST 1 : Reset Password");
  Logger.log("==================================");

  var result = UserService.resetPassword(
    "USR0011",
    "System"
  );

  if (!result.success) {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
    return;
  }

  Logger.log("✅ PASS");
  Logger.log("Temporary Password:");
  Logger.log(result.temporaryPassword);

  var tempPassword = result.temporaryPassword;


  Logger.log("");
  Logger.log("==================================");
  Logger.log("TEST 2 : Login With Temporary Password");
  Logger.log("==================================");

  // Activate user first
  UserService.activateUser("USR0011", "System");

  var login = AuthService.login({
    employeeId: "EMP200",
    password: tempPassword
  });

  if (login.success) {
    Logger.log("✅ PASS");
    Logger.log(login.message);
  } else {
    Logger.log("❌ FAIL");
    Logger.log(login.message);
  }


  Logger.log("");
  Logger.log("==================================");
  Logger.log("TEST 3 : Invalid User");
  Logger.log("==================================");

  result = UserService.resetPassword(
    "USR999999",
    "System"
  );

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }


  Logger.log("");
  Logger.log("==================================");
  Logger.log("TEST COMPLETED");
  Logger.log("==================================");

}
function testUserServiceChangePasswordSuccess() {

  Logger.log("===== TEST : UserService Change Password =====");

  var result = UserService.changePassword(
    "USRTEST001",
    "NewPassword123",
    "NewPassword456",
    "System"
  );

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(JSON.stringify(result));
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }

}
function testUserServiceChangePasswordInvalidUser() {

  Logger.log("===== TEST : Invalid User =====");

  var result = UserService.changePassword(
    "USR999999",
    "123456",
    "abcdef",
    "System"
  );

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }

}
function testUserServiceChangePasswordWrongPassword() {

  Logger.log("===== TEST : Wrong Old Password =====");

  var result = UserService.changePassword(
    "USRTEST001",
    "WrongPassword",
    "Password123",
    "System"
  );

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }

}
function testUpdateProfile() {

  Logger.log("==================================");
  Logger.log("TEST 1 : Update Profile");
  Logger.log("==================================");

var profile = {};

profile[CONFIG.COLUMNS.USER_FIRST_NAME] = "Satya";
profile[CONFIG.COLUMNS.USER_LAST_NAME] = "Balaji";
profile[CONFIG.COLUMNS.USER_PHONE] = "9876543210";
profile[CONFIG.COLUMNS.USER_BIO] = "Backend Developer";
profile[CONFIG.COLUMNS.USER_LANGUAGE] = "English";
profile[CONFIG.COLUMNS.USER_THEME] = "Dark";
profile[CONFIG.COLUMNS.USER_TIMEZONE] = "Asia/Kolkata";
profile[CONFIG.COLUMNS.USER_POPUP_NOTIFICATIONS] = "Enabled";
profile[CONFIG.COLUMNS.USER_NOTIFICATION_SOUND] = "Enabled";
  var result = UserService.updateProfile(
      "USR0011",
      profile,
      "System"
  );

  if(result.success){
      Logger.log("✅ PASS");
      Logger.log(result.message);
  }else{
      Logger.log("❌ FAIL");
      Logger.log(result.message);
  }


  Logger.log("");
  Logger.log("==================================");
  Logger.log("TEST 2 : Invalid User");
  Logger.log("==================================");

  result = UserService.updateProfile(
      "USR999999",
      profile,
      "System"
  );

  if(!result.success){
      Logger.log("✅ PASS");
      Logger.log(result.message);
  }else{
      Logger.log("❌ FAIL");
  }


  Logger.log("");
  Logger.log("==================================");
  Logger.log("TEST 3 : Empty Update");
  Logger.log("==================================");

  result = UserService.updateProfile(
      "USR0011",
      {},
      "System"
  );

  Logger.log(JSON.stringify(result));

}
function testProfileColumns() {

  Logger.log("===== PROFILE COLUMNS =====");

  Logger.log(CONFIG.COLUMNS.USER_PHONE);
  Logger.log(CONFIG.COLUMNS.USER_BIO);
  Logger.log(CONFIG.COLUMNS.USER_PROFILE_PICTURE);
  Logger.log(CONFIG.COLUMNS.USER_LANGUAGE);
  Logger.log(CONFIG.COLUMNS.USER_THEME);
  Logger.log(CONFIG.COLUMNS.USER_TIMEZONE);
  Logger.log(CONFIG.COLUMNS.USER_POPUP_NOTIFICATIONS);
  Logger.log(CONFIG.COLUMNS.USER_NOTIFICATION_SOUND);

}
function testAllColumns() {
  Logger.log(JSON.stringify(CONFIG.COLUMNS, null, 2));
}
function testUpdatePreferences() {

  Logger.log("===== TEST : Update Preferences =====");

  var preferences = {};

  preferences[CONFIG.COLUMNS.USER_THEME] = "Dark";
  preferences[CONFIG.COLUMNS.USER_LANGUAGE] = "Telugu";
  preferences[CONFIG.COLUMNS.USER_TIMEZONE] = "Asia/Kolkata";
  preferences[CONFIG.COLUMNS.USER_POPUP_NOTIFICATIONS] = "Enabled";
  preferences[CONFIG.COLUMNS.USER_NOTIFICATION_SOUND] = "Enabled";

  var result = UserService.updatePreferences(
      "USR0011",
      preferences,
      "System"
  );

  if(result.success){
      Logger.log("✅ PASS");
      Logger.log(result.message);
  }else{
      Logger.log("❌ FAIL");
      Logger.log(result.message);
  }

  Logger.log("===== INVALID USER =====");

  result = UserService.updatePreferences(
      "USR999999",
      preferences,
      "System"
  );

  Logger.log(result);

  Logger.log("===== EMPTY UPDATE =====");

  result = UserService.updatePreferences(
      "USR0011",
      {},
      "System"
  );

  Logger.log(result);

}
function testSortUsers() {

  Logger.log("==================================");
  Logger.log("TEST 1 : Sort By First Name ASC");
  Logger.log("==================================");

  var result = UserService.sortUsers(
      CONFIG.COLUMNS.USER_FIRST_NAME,
      "asc"
  );

  Logger.log(result);

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 2 : Sort By First Name DESC");
  Logger.log("==================================");

  result = UserService.sortUsers(
      CONFIG.COLUMNS.USER_FIRST_NAME,
      "desc"
  );

  Logger.log(result);

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 3 : Sort By Role");
  Logger.log("==================================");

  result = UserService.sortUsers(
      CONFIG.COLUMNS.USER_ROLE,
      "asc"
  );

  Logger.log(result);

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 4 : Invalid Column");
  Logger.log("==================================");

  result = UserService.sortUsers(
      "ABC",
      "asc"
  );

  Logger.log(result);

}

function runUserServiceUnitTests() {
  Logger.log('--- Running UserServiceUnitTests ---');
  testCreateUser();
  testGetUserById();
  testUpdateUserSuccess();
  testDeleteUserSuccess();
  testActivateUserSuccess();
  testDeactivateUser();
  testResetPassword();
  testSortUsers();
  Logger.log('--- UserServiceUnitTests Completed ---');
}