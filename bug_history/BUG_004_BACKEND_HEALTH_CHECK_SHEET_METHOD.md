# Bug Record 004: BackendHealthCheck Invoking Apps Script SpreadsheetApp Method in Supabase Mode

## Error Details
- **Module**: Backend Diagnostics
- **File**: `BackendHealthCheck.js`
- **Function**: `checkSheets`
- **Original Symptom**: `❌ HEALTH CHECK FAILED: Required sheet not found: AI_Analytics_Cache`
- **Root Cause**: `BackendHealthCheck.js` invoked `DatabaseService.getSheet(s)` which relies on Apps Script `SpreadsheetApp.openById(...)`. When running under Supabase PostgreSQL database mode, `SpreadsheetApp` returned `null` for non-spreadsheet tables.

## Affected Files
- `BackendHealthCheck.js` (lines 33-47)

## Fix Applied
Updated `checkSheets` to validate schema availability and header definitions directly via `DatabaseService.getHeaderRow(s)`.

```diff
   checkSheets: function() {
     Logger.log('Checking sheets and header structure...');
     const sheets = Object.values(CONFIG.SHEETS);
     sheets.forEach(s => {
-      const sheet = DatabaseService.getSheet(s);
-      if (!sheet) {
-        throw new Error('Required sheet not found: ' + s);
-      }
       const headers = DatabaseService.getHeaderRow(s);
       if (!headers || headers.length === 0) {
-        throw new Error('Sheet ' + s + ' is missing header columns.');
+        throw new Error('Sheet/Table ' + s + ' is missing header columns.');
       }
     });
   },
```

## Re-Test Result
`BackendHealthCheck.run()` executed cleanly and reported: `✅ ALL HEALTH CHECKS PASSED. { success: true, message: 'All health checks passed.' }`.
