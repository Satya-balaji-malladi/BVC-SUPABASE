/**
 * MigrateRoles.js
 * Run this function in the Google Apps Script editor to update the existing users spreadsheet.
 * It maps old roles to the strict 4 system roles: SUPER_ADMIN, HOD, FACULTY, COORDINATOR.
 * EVENT_ADMIN is no longer a system role and will be migrated to FACULTY.
 */
function runRoleMigration() {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET.ID).getSheetByName(CONFIG.SHEETS.USERS);
    if (!sheet) {
      Logger.log("Users sheet not found.");
      return;
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const roleColIndex = headers.indexOf(CONFIG.COLUMNS.ROLE || 'Role');
    
    if (roleColIndex === -1) {
      Logger.log("Role column not found in Users sheet.");
      return;
    }

    let updatedCount = 0;

    for (let i = 1; i < data.length; i++) {
      let rawRole = data[i][roleColIndex];
      let clean = String(rawRole).toUpperCase().replace(/[\s_]+/g, '');
      let newRole = 'FACULTY'; // default

      if (clean === 'SUPERADMIN' || clean === 'DEVELOPER' || clean === 'SUPER_ADMIN') {
        newRole = 'SUPER_ADMIN';
      } else if (clean === 'HOD' || clean === 'ADMIN' || clean === 'TESTER') {
        newRole = 'HOD';
      } else if (clean === 'EVENTADMIN' || clean === 'FACULTY' || clean === 'EVENTMANAGER' || clean === 'EVENT_ADMIN' || clean === 'STAFF') {
        newRole = 'FACULTY';
      } else if (clean === 'COORDINATOR' || clean === 'USER' || clean === 'MONITOR' || clean === 'STUDENT' || clean === 'GUESTCOORDINATOR') {
        newRole = 'COORDINATOR';
      }

      if (rawRole !== newRole) {
        // +1 for 0-index array, +1 for spreadsheet row number starting at 1
        sheet.getRange(i + 1, roleColIndex + 1).setValue(newRole);
        updatedCount++;
      }
    }

    Logger.log("Role Migration Complete. Users updated: " + updatedCount);
  } catch (error) {
    Logger.log("Migration Error: " + error.message);
  }
}
