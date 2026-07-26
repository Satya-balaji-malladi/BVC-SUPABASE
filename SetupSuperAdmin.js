/**
 * SetupSuperAdmin.js
 * Utility function to seed or create the initial Super Admin account in Google Apps Script.
 * Run this function directly from the Apps Script Editor.
 */
function createSuperAdminAccount() {
  Logger.log("=== Creating Initial Super Admin Account ===");

  var superAdminData = {
    "Employee ID": "EMP0001",
    "First Name": "Super",
    "Last Name": "Admin",
    "Email Address": "satyabalajim1@gmail.com",
    "Username": "superadmin",
    "Password": "SuperAdminPassword123!",
    "Role": "Super Admin",
    "Status": "Active"
  };

  try {
    var result = UserService.createUser(superAdminData);
    Logger.log("Super Admin Creation Result: " + JSON.stringify(result));

    if (result && result.success) {
      Logger.log("✅ Super Admin Account Created Successfully!");
      Logger.log("Username: superadmin");
      Logger.log("Password: SuperAdminPassword123!");
    } else {
      Logger.log("❌ Failed to create Super Admin: " + (result ? result.message : "Unknown Error"));
    }
    return result;
  } catch (e) {
    Logger.log("EXCEPTION in createSuperAdminAccount: " + e.message + "\nStack: " + e.stack);
    return { success: false, message: e.message };
  }
}

/**
 * Deletes all database records across child and parent tables, keeping only the superadmin user.
 */
function cleanupDatabaseForManualTesting() {
  Logger.log("=== STARTING DATABASE CLEANUP FOR MANUAL TESTING ===");
  
  const tablesToClearAll = [
    'attendance',
    'event_participants',
    'event_coordinators',
    'notifications',
    'audit_logs',
    'sessions',
    'attendance_corrections',
    'export_templates',
    'test_history',
    'events',
    'departments'
  ];
  
  tablesToClearAll.forEach(table => {
    try {
      // In PostgREST, delete requests require a query filter to delete records
      DatabaseService._request(table, 'DELETE', null, 'deletion_flag=in.(true,false)');
      Logger.log("✅ Cleared table: " + table);
    } catch(e) {
      try {
        DatabaseService._request(table, 'DELETE', null, 'created_at=not.is.null');
        Logger.log("✅ Cleared table: " + table);
      } catch(e2) {
        Logger.log("⚠️ Could not clear table " + table + ": " + e2.message);
      }
    }
  });

  // Delete all users except the superadmin account
  try {
    DatabaseService._request('users', 'DELETE', null, 'username=neq.superadmin');
    Logger.log("✅ Cleared users table (kept only 'superadmin')");
  } catch(e) {
    Logger.log("⚠️ Failed to clear users table: " + e.message);
  }
  
  Logger.log("=== DATABASE CLEANUP COMPLETED ===");
}
