# Bug Record 001: Missing USER_SALT Mapping in Config.js

## Error Details
- **Module**: Authentication & Config
- **File**: `Config.js`
- **Function/Area**: `CONFIG.COLUMNS`
- **Original Symptom**: `AuthService._verifyPassword` returned `false` during user login verification tests even with correct credentials.
- **Root Cause**: `CONFIG.COLUMNS.USER_SALT` was not defined in `Config.js`, causing `user[saltCol]` to evaluate to `undefined` in `AuthService._verifyPassword`. Password hashing comparisons used empty salts instead of stored user salts.

## Affected Files
- `Config.js` (lines 74-77)
- `AuthService.js` (lines 55-65)

## Fix Applied
Added `USER_SALT: 'salt'` to `CONFIG.COLUMNS` in `Config.js`.

```diff
     USER_EMAIL_ADDRESS: 'Email Address',
     USER_USERNAME: 'Username',
     USER_PASSWORD_HASH: 'Password Hash',
+    USER_SALT: 'salt',
     USER_ROLE: 'Role',
```

## Re-Test Result
`AuthServiceTest` ran successfully with 30 out of 30 tests passing.
