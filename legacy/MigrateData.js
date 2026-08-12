/**
 * MigrateData.js
 * Run this function in the Google Apps Script editor to ensure the EventAssignments sheet exists with correct headers.
 */
function runDataMigration() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET.ID);
    const sheetName = CONFIG.SHEETS.EVENT_ASSIGNMENTS || 'event_assignments';
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log("Creating new sheet: " + sheetName);
      sheet = ss.insertSheet(sheetName);
    }

    const headers = [
      CONFIG.COLUMNS.ASSIGNMENT_ID || 'Assignment ID',
      CONFIG.COLUMNS.ASSIGNMENT_EVENT_ID || 'Event ID',
      CONFIG.COLUMNS.ASSIGNMENT_FACULTY_ID || 'Faculty ID',
      CONFIG.COLUMNS.ASSIGNMENT_ROLE || 'Assignment Role',
      CONFIG.COLUMNS.ASSIGNED_BY || 'Assigned By',
      CONFIG.COLUMNS.ASSIGNED_AT || 'Assigned At'
    ];

    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    
    // Only write headers if row 1 is empty or doesn't match
    if (!currentHeaders[0] || currentHeaders[0] === '') {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      Logger.log("Headers initialized in " + sheetName);
    } else {
      Logger.log("Headers already exist in " + sheetName);
    }

    Logger.log("Data Migration Complete.");
  } catch (error) {
    Logger.log("Migration Error: " + error.message);
  }
}
