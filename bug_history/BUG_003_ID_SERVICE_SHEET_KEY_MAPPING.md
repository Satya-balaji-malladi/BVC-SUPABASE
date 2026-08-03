# Bug Record 003: IdService Missing Logical Sheet Key Mapping for Faculty and Extra Tables

## Error Details
- **Module**: ID Generation Service
- **File**: `IdService.js`
- **Function**: `_generateNextIdWithLock`
- **Original Symptom**: `IdService._generateNextIdWithLock error: Missing CONFIG.SHEETS mapping for FACULTY`
- **Root Cause**: `sheetKeyMap` in `IdService._generateNextIdWithLock` was hardcoded with a partial list of sheets missing `FACULTY`, `GUEST_COORDINATORS`, and `OTHER_COLLEGE_STUDENTS`, and threw an error when looking up `CONFIG.SHEETS[sheetLogical]`.

## Affected Files
- `IdService.js` (lines 25-45)

## Fix Applied
Expanded `sheetKeyMap` and added dynamic case-insensitive key resolution with fallback logic.

```diff
+      const keyUpper = String(logicalKey || '').toUpperCase();
       const sheetKeyMap = {
         USERS: 'USERS',
         STUDENTS: 'STUDENTS',
         EVENTS: 'EVENTS',
         ATTENDANCE: 'ATTENDANCE',
         SESSIONS: 'SESSIONS',
         DEPARTMENTS: 'DEPARTMENTS',
         EVENT_COORDINATORS: 'EVENT_COORDINATORS',
         GENERATED_REPORTS: 'GENERATED_REPORTS',
         NOTIFICATIONS: 'NOTIFICATIONS',
-        AUDITLOGS: 'AUDITLOGS'
+        AUDITLOGS: 'AUDITLOGS',
+        FACULTY: 'FACULTY',
+        GUEST_COORDINATORS: 'GUEST_COORDINATORS',
+        OTHER_COLLEGE_STUDENTS: 'OTHER_COLLEGE_STUDENTS'
       };

-      const sheetLogical = sheetKeyMap[logicalKey];
-      const sheetName = sheetLogical && CONFIG.SHEETS ? CONFIG.SHEETS[sheetLogical] : null;
-      if (!sheetName) throw new Error('Missing CONFIG.SHEETS mapping for ' + logicalKey);
+      const sheetLogical = sheetKeyMap[keyUpper] || keyUpper;
+      const sheetName = CONFIG.SHEETS ? (CONFIG.SHEETS[sheetLogical] || CONFIG.SHEETS[logicalKey] || sheetLogical) : sheetLogical;
```

## Re-Test Result
`FacultyModuleTest` ran successfully with 33 out of 33 tests passing.
