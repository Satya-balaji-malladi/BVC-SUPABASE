# Bug Record 002: Supabase PostgREST 400 Error on Non-Existent Users Table Columns

## Error Details
- **Module**: Database Layer / User Service
- **File**: `DatabaseService.js`
- **Function**: `_mapToDbRecord`
- **Original Symptom**: `Supabase REST Error (400): {"code":"PGRST204","message":"Could not find the 'online_status' column of 'users' in the schema cache"}`
- **Root Cause**: `DatabaseService._tableColumns.users` included `online_status` and `last_seen` columns which were not present in the live Supabase PostgreSQL `users` table schema, causing PostgREST to reject UPDATE/INSERT payloads with a 400 Bad Request error.

## Affected Files
- `DatabaseService.js` (lines 90-95)

## Fix Applied
Added explicit column skipping for `online_status` and `last_seen` when building database record mappings for `users` table.

```diff
       if (validCols && validCols.indexOf(dbKey) === -1) {
+        if (dbTable === 'users' && (dbKey === 'online_status' || dbKey === 'last_seen')) {
+          continue;
+        }
         if (dbTable === 'users' && (dbKey === 'lastlogin' || dbKey === 'last_login')) {
```

## Re-Test Result
`UserManagementTest` and `AuthServiceTest` completed user updates without HTTP 400 PostgREST errors.
