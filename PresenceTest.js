/**
 * PresenceTest.js
 * ============================================================
 * Comprehensive unit test suite for First Login Profile Completion
 * and User Presence (Online/Offline) tracking system.
 * ============================================================
 */

function runPresenceUnitTests() {
  Logger.log('╔══════════════════════════════════════════╗');
  Logger.log('║   PRESENCE SERVICE UNIT TESTS — STARTING ║');
  Logger.log('╚══════════════════════════════════════════╝');
  Logger.log('');

  var tests = [
    testPresence_userCreation,
    testPresence_profileCompletion,
    testPresence_loginLogoutUpdates,
    testPresence_sweepPresence
  ];

  var passed = 0;
  var failed = 0;

  for (var i = 0; i < tests.length; i++) {
    try {
      tests[i]();
      passed++;
    } catch (err) {
      failed++;
      Logger.log('🛑 STOP-ON-FAIL: ' + err.message);
      Logger.log('   Tests passed before failure: ' + passed);
      return;
    }
  }

  Logger.log('╔══════════════════════════════════════════╗');
  Logger.log('║   ALL ' + passed + ' TESTS PASSED SUCCESSFULLY!   ║');
  Logger.log('╚══════════════════════════════════════════╝');
}

function _deletePresenceTestUser(userId) {
  if (!userId) return;
  try {
    DatabaseService.hardDelete(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_ID, userId);
    Logger.log('    [Cleanup] Deleted test user: ' + userId);
  } catch(e) {
    Logger.log('    [Cleanup] Warning: could not delete user ' + userId);
  }
}

function testPresence_userCreation() {
  Logger.log('====================================');
  Logger.log('TEST: User Creation Defaults');
  Logger.log('====================================');

  // 1. Create user with minimum fields (Name, Email, Role, Department)
  var uData = {
    first_name: 'Test',
    last_name: 'PresenceUser',
    email: 'presence_test@bvc.edu.in',
    role: 'Coordinator',
    department: 'CSE'
  };

  var res = UserService.createUser(uData);
  var user = res && res.data && res.data.user ? res.data.user : null;
  var userId = user ? user.user_id : null;

  if (!res.success || !userId) {
    throw new Error('Failed to create user with minimal fields: ' + res.message);
  }

  // Reload raw user from sheet to verify headers
  var rawUser = UserService.getUserById(userId);

  if (!rawUser) {
    _deletePresenceTestUser(userId);
    throw new Error('Could not retrieve created user from database.');
  }

  // Assertions
  if (!rawUser[CONFIG.COLUMNS.USER_EMPLOYEE_ID]) {
    _deletePresenceTestUser(userId);
    throw new Error('Employee ID was not automatically generated.');
  }

  if (!rawUser[CONFIG.COLUMNS.USER_USERNAME]) {
    _deletePresenceTestUser(userId);
    throw new Error('Username was not automatically generated.');
  }

  if (rawUser[CONFIG.COLUMNS.USER_PROFILE_COMPLETED] !== false && rawUser[CONFIG.COLUMNS.USER_PROFILE_COMPLETED] !== 'false') {
    _deletePresenceTestUser(userId);
    throw new Error('ProfileCompleted should default to false.');
  }

  if (rawUser[CONFIG.COLUMNS.USER_ONLINE_STATUS] !== 'Offline') {
    _deletePresenceTestUser(userId);
    throw new Error('OnlineStatus should default to Offline.');
  }

  Logger.log('✅ PASS: User creation defaulted correctly (ProfileCompleted = false, OnlineStatus = Offline, auto-generated username & Employee ID)');
  _deletePresenceTestUser(userId);
  Logger.log('');
}

function testPresence_profileCompletion() {
  Logger.log('====================================');
  Logger.log('TEST: Profile Onboarding Completion');
  Logger.log('====================================');

  var uData = {
    first_name: 'Test',
    last_name: 'OnboardUser',
    email: 'onboard_test@bvc.edu.in',
    role: 'Coordinator',
    department: 'CSE'
  };

  var res = UserService.createUser(uData);
  var userId = res && res.data && res.data.user ? res.data.user.user_id : null;

  if (!res.success || !userId) {
    throw new Error('Failed to create user: ' + res.message);
  }

  // 1. Invalid submission (missing or bad phone format)
  var badRes = UserService.completeUserProfile(userId, { phone: '12345' });
  if (badRes.success) {
    _deletePresenceTestUser(userId);
    throw new Error('Allowed saving profile completion with invalid phone length.');
  }

  // 2. Successful submission
  var goodRes = UserService.completeUserProfile(userId, {
    phone: '9876543210',
    alternatePhone: '9123456789',
    profilePhoto: 'https://example.com/photo.png'
  });

  if (!goodRes.success) {
    _deletePresenceTestUser(userId);
    throw new Error('Failed to save profile completion: ' + goodRes.message);
  }

  // Reload user
  var rawUser = UserService.getUserById(userId);

  if (rawUser[CONFIG.COLUMNS.USER_PROFILE_COMPLETED] !== true && rawUser[CONFIG.COLUMNS.USER_PROFILE_COMPLETED] !== 'true') {
    _deletePresenceTestUser(userId);
    throw new Error('ProfileCompleted was not toggled to true.');
  }

  if (rawUser[CONFIG.COLUMNS.USER_PHONE] !== '9876543210') {
    _deletePresenceTestUser(userId);
    throw new Error('Phone was not updated to 9876543210.');
  }

  if (rawUser[CONFIG.COLUMNS.USER_ALT_PHONE] !== '9123456789') {
    _deletePresenceTestUser(userId);
    throw new Error('Alternate phone was not updated.');
  }

  Logger.log('✅ PASS: Profile onboarding successfully validated constraints and updated status to true.');
  _deletePresenceTestUser(userId);
  Logger.log('');
}

function testPresence_loginLogoutUpdates() {
  Logger.log('====================================');
  Logger.log('TEST: Login and Logout Presence Updates');
  Logger.log('====================================');

  var uData = {
    first_name: 'Test',
    last_name: 'AuthPresence',
    email: 'auth_presence@bvc.edu.in',
    role: 'Coordinator',
    department: 'CSE'
  };

  var res = UserService.createUser(uData);
  var user = res && res.data && res.data.user ? res.data.user : null;
  var userId = user ? user.user_id : null;
  var empId = user ? user.employee_id : null;

  if (!res.success || !userId) {
    throw new Error('Failed to create user: ' + res.message);
  }

  // Retrieve raw password hash since we store in plaintext
  var rawPassUser = DatabaseService.findOne(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_ID, userId);
  var rawPassword = rawPassUser[CONFIG.COLUMNS.USER_PASSWORD_HASH];

  // 1. Simulate login
  var loginRes = AuthService.login({ employeeId: empId, password: rawPassword });
  if (!loginRes.success) {
    _deletePresenceTestUser(userId);
    throw new Error('Login failed: ' + loginRes.message);
  }

  var updatedUser = UserService.getUserById(userId);
  if (updatedUser[CONFIG.COLUMNS.USER_ONLINE_STATUS] !== 'Online') {
    _deletePresenceTestUser(userId);
    throw new Error('OnlineStatus was not set to Online on login.');
  }
  if (!updatedUser[CONFIG.COLUMNS.USER_LAST_LOGIN_TS]) {
    _deletePresenceTestUser(userId);
    throw new Error('LastLogin timestamp was not populated.');
  }

  // 2. Simulate logout
  var token = loginRes.data.token;
  var logoutRes = AuthService.logout(token);
  if (!logoutRes.success) {
    _deletePresenceTestUser(userId);
    throw new Error('Logout failed: ' + logoutRes.message);
  }

  var loggedOutUser = UserService.getUserById(userId);
  if (loggedOutUser[CONFIG.COLUMNS.USER_ONLINE_STATUS] !== 'Offline') {
    _deletePresenceTestUser(userId);
    throw new Error('OnlineStatus was not set to Offline on logout.');
  }
  if (!loggedOutUser[CONFIG.COLUMNS.USER_LAST_SEEN]) {
    _deletePresenceTestUser(userId);
    throw new Error('LastSeen timestamp was not populated on logout.');
  }

  Logger.log('✅ PASS: Login and Logout presence updates successfully tracked.');
  _deletePresenceTestUser(userId);
  Logger.log('');
}

function testPresence_sweepPresence() {
  Logger.log('====================================');
  Logger.log('TEST: Inactivity Presence Sweep');
  Logger.log('====================================');

  var uData = {
    first_name: 'Test',
    last_name: 'SweepUser',
    email: 'sweep_test@bvc.edu.in',
    role: 'Coordinator',
    department: 'CSE'
  };

  var res = UserService.createUser(uData);
  var user = res && res.data && res.data.user ? res.data.user : null;
  var userId = user ? user.user_id : null;
  var empId = user ? user.employee_id : null;

  if (!res.success || !userId) {
    throw new Error('Failed to create user: ' + res.message);
  }

  // Retrieve raw password hash since we store in plaintext
  var rawPassUser = DatabaseService.findOne(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.USER_ID, userId);
  var rawPassword = rawPassUser[CONFIG.COLUMNS.USER_PASSWORD_HASH];

  // 1. Login to go Online
  var loginRes = AuthService.login({ employeeId: empId, password: rawPassword });
  var token = loginRes.data.token;

  var onlineUser = UserService.getUserById(userId);
  if (onlineUser[CONFIG.COLUMNS.USER_ONLINE_STATUS] !== 'Online') {
    _deletePresenceTestUser(userId);
    throw new Error('User did not go online.');
  }

  // 2. Manipulate session last activity to 5 minutes ago in the sheet directly to simulate inactivity
  var fiveMinsAgo = new Date(new Date().getTime() - 300000); // 5 mins ago
  var lastActivityCol = CONFIG.COLUMNS.SESSION_LAST_ACTIVITY_TIMESTAMP || 'Last Activity Timestamp';
  DatabaseService.updateRow(CONFIG.SHEETS.SESSIONS, CONFIG.COLUMNS.SESSION_TOKEN || 'Session Token', token, {
    [lastActivityCol]: fiveMinsAgo
  });

  // 3. Trigger presence sweep
  SessionService.sweepPresence();

  // 4. Verify user was swept offline
  var sweptUser = UserService.getUserById(userId);
  if (sweptUser[CONFIG.COLUMNS.USER_ONLINE_STATUS] !== 'Offline') {
    _deletePresenceTestUser(userId);
    throw new Error('Sweep did not mark inactive user as Offline.');
  }

  if (!sweptUser[CONFIG.COLUMNS.USER_LAST_SEEN]) {
    _deletePresenceTestUser(userId);
    throw new Error('Sweep did not set LastSeen timestamp.');
  }

  Logger.log('✅ PASS: Inactivity sweep successfully detected expired session and set OnlineStatus = Offline.');
  _deletePresenceTestUser(userId);
  Logger.log('');
}
