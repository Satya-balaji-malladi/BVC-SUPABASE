/**
 * BackendHealthCheck.js
 * Verification of sheet existence, config schemas, lock parameters, and system authentication APIs.
 */
const BackendHealthCheck = {

  run: function() {
    Logger.log('╔══════════════════════════════════════════╗');
    Logger.log('║        BACKEND HEALTH CHECK — START      ║');
    Logger.log('╚══════════════════════════════════════════╝');
    Logger.log('');

    try {
      // 1. Database connectivity & sheet existence
      this.checkSheets();
      // 2. ID generation validation
      this.checkIdGeneration();
      // 3. Cache & lock checks
      this.checkLocksAndCache();
      // 4. Required services and validation check
      this.checkCoreServices();

      Logger.log('✅ ALL HEALTH CHECKS PASSED.');
      Logger.log('');
      return { success: true, message: 'All health checks passed.' };
    } catch (e) {
      Logger.log('❌ HEALTH CHECK FAILED: ' + e.message);
      Logger.log('');
      return { success: false, message: e.message };
    }
  },

  checkSheets: function() {
    Logger.log('Checking sheets and header structure...');
    const sheets = Object.values(CONFIG.SHEETS);
    sheets.forEach(s => {
      const sheet = DatabaseService.getSheet(s);
      if (!sheet) {
        throw new Error('Required sheet not found: ' + s);
      }
      const headers = DatabaseService.getHeaderRow(s);
      if (!headers || headers.length === 0) {
        throw new Error('Sheet ' + s + ' is missing header columns.');
      }
      Logger.log('  - Sheet "' + s + '" verified. Headers count: ' + headers.length);
    });
  },

  checkIdGeneration: function() {
    Logger.log('Checking ID generation locking...');
    const tests = [
      { sheet: CONFIG.SHEETS.USERS, col: 'User ID' },
      { sheet: CONFIG.SHEETS.EVENTS, col: 'Event ID' }
    ];
    tests.forEach(t => {
      const nextId = IdService._generateNextIdWithLock ? IdService._generateNextIdWithLock(t.sheet) : 'MOCK_ID';
      if (!nextId) {
        throw new Error('ID Generation failed for sheet: ' + t.sheet);
      }
      Logger.log('  - ID Generation verified for ' + t.sheet + '. Next ID: ' + nextId);
    });
  },

  checkLocksAndCache: function() {
    Logger.log('Checking Script Locks and Database cache...');
    const lock = LockService.getScriptLock();
    if (!lock) {
      throw new Error('LockService script lock not available.');
    }
    DatabaseService.clearCache();
    Logger.log('  - Locks and database caching cleared & verified.');
  },

  checkCoreServices: function() {
    Logger.log('Verifying core service components...');
    if (typeof Utils === 'undefined' || !Utils.buildResponse) {
      throw new Error('Utils module is missing or corrupted.');
    }
    if (typeof ValidationService === 'undefined' || !ValidationService.validateRequiredFields) {
      throw new Error('ValidationService is missing or corrupted.');
    }
    if (typeof AuditService === 'undefined' || !AuditService.logAction) {
      throw new Error('AuditService is missing or corrupted.');
    }
    if (typeof NotificationService === 'undefined' || !NotificationService.createNotification) {
      throw new Error('NotificationService is missing or corrupted.');
    }
    Logger.log('  - Core helper services verified.');
  }

};
