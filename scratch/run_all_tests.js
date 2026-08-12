const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const vm = require('vm');

// Synchronous HTTP request fallback using curl
function syncFetch(urlStr, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = options.headers || {};
  const payload = options.payload || '';

  const headerArgs = Object.keys(headers).map(h => `-H "${h}: ${headers[h].replace(/"/g, '\\"')}"`).join(' ');
  let dataArg = '';
  let tmpFilePath = null;
  if (payload) {
    tmpFilePath = path.join(__dirname, 'tmp_payload_' + Math.random().toString(36).substring(7) + '.json');
    fs.writeFileSync(tmpFilePath, payload, 'utf8');
    activeTmpFiles.add(tmpFilePath);
    dataArg = `--data-binary "@${tmpFilePath.replace(/\\/g, '/')}"`;
  }

  const cmd = `curl -s -w "\\n%{http_code}" -X ${method} ${headerArgs} ${dataArg} "${urlStr}"`;
  try {
    const rawOutput = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    if (tmpFilePath) {
      try { fs.unlinkSync(tmpFilePath); activeTmpFiles.delete(tmpFilePath); } catch(e){}
    }

    const lines = rawOutput.trim().split('\n');
    const statusCode = parseInt(lines.pop().trim(), 10) || 200;
    const body = lines.join('\n');
    return {
      getResponseCode: () => statusCode,
      getContentText: () => body,
      getHeaders: () => ({})
    };
  } catch (err) {
    return {
      getResponseCode: () => 500,
      getContentText: () => JSON.stringify({ error: err.message }),
      getHeaders: () => ({})
    };
  }
}

// Track active tmp files for cleanup
const activeTmpFiles = new Set();

// Cleanup any remaining tmp files on process exit
process.on('exit', () => {
  for (const f of activeTmpFiles) {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch(e){}
  }
});
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

// Setup Context Sandbox
const logs = [];
const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Date: Date,
  Math: Math,
  JSON: JSON,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  isFinite: isFinite,
  encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Array: Array,
  Object: Object,
  RegExp: RegExp,
  Error: Error,
  TypeError: TypeError,
  RangeError: RangeError,
  SyntaxError: SyntaxError,

  Logger: {
    log: function(...args) {
      const str = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      logs.push(str);
      console.log(str);
    },
    getLog: function() {
      return logs.join('\n');
    },
    clear: function() {
      logs.length = 0;
    }
  },

  UrlFetchApp: {
    fetch: syncFetch
  },

  Utilities: {
    computeDigest: function(algo, value) {
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(value).digest();
      return Array.from(hash).map(b => b > 127 ? b - 256 : b);
    },
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    base64Encode: function(bytes) {
      const buf = Buffer.from(bytes.map(b => b < 0 ? b + 256 : b));
      return buf.toString('base64');
    },
    base64Decode: function(str) {
      return Array.from(Buffer.from(str, 'base64'));
    },
    formatDate: function(date, tz, format) {
      return new Date(date).toISOString();
    },
    sleep: function(ms) {
      const start = Date.now();
      while (Date.now() - start < ms) {}
    },
    getUuid: function() {
      const crypto = require('crypto');
      return crypto.randomUUID();
    }
  },

  LockService: {
    getScriptLock: () => ({
      tryLock: () => true,
      releaseLock: () => true,
      waitLock: () => true
    }),
    getDocumentLock: () => ({
      tryLock: () => true,
      releaseLock: () => true,
      waitLock: () => true
    })
  },

  CacheService: {
    getScriptCache: () => ({
      get: () => null,
      put: () => {},
      remove: () => {},
      removeAll: () => {}
    }),
    getUserCache: () => ({ get: () => null, put: () => {}, remove: () => {} }),
    getDocumentCache: () => ({ get: () => null, put: () => {}, remove: () => {} })
  },

  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: () => null,
      setProperty: () => {},
      deleteProperty: () => {},
      getProperties: () => ({})
    }),
    getUserProperties: () => ({ getProperty: () => null, setProperty: () => {} })
  },

  Session: {
    getActiveUser: () => ({ getEmail: () => 'admin@bvc.edu.in' }),
    getEffectiveUser: () => ({ getEmail: () => 'admin@bvc.edu.in' })
  }
};

// Make sandbox circular for global reference if needed
sandbox.global = sandbox;
sandbox.globalThis = sandbox;

const context = vm.createContext(sandbox);

const filesToLoad = [
  'Config.js',
  'Utils.js',
  'SecurityUtils.js',
  'IdService.js',
  'DatabaseService.js',
  'CacheManager.js',
  'LockManager.js',
  'AuditService.js',
  'ValidationService.js',
  'NotificationService.js',
  'SessionService.js',
  'AuthService.js',
  'UserService.js',
  'DepartmentService.js',
  'StudentService.js',
  'FacultyService.js',
  'EnterpriseEventService.js',
  'EventAdminService.js',
  'EventService.js',
  'ParticipantService.js',
  'CoordinatorService.js',
  'AttendanceQueueService.js',
  'AttendanceCorrectionService.js',
  'AttendanceService.js',
  'ReportService.js',
  'AnalyticsService.js',
  'DashboardService.js',
  'ExportService.js',
  'ExportUtils.js',
  'SettingsService.js',
  'SystemMonitoringService.js',
  'Controller.js',
  'Api.js',

  // Diagnostics
  'IntegrationAssertions.js',
  'BackendHealthCheck.js',
  'SystemHealthChecker.js',
  'DepartmentCreationDiagnostic.js',

  // Test suites
  'AuthServiceTest.js',
  'RoleAuthorizationTest.js',
  'UserManagementTest.js',
  'FacultyModuleTest.js',
  'StudentModuleTest.js',
  'RegistrationModuleTest.js',
  'EventManagementTest.js',
  'CoordinatorModuleTest.js',
  'CoordinatorTerminalFormSuite.js',
  'AttendanceModuleTest.js',
  'ReportsAnalyticsTest.js',
  'IntegrationTestSuite.js',
  'RegressionTestSuite.js',
  'EndToEndTestSuite.js',
  'MasterTestSuite.js'
];

const rootDir = path.resolve(__dirname, '..');
filesToLoad.forEach(f => {
  const filePath = path.join(rootDir, f);
  if (fs.existsSync(filePath)) {
    let code = fs.readFileSync(filePath, 'utf8');
    // Replace const/let at root level with var so they become context properties
    // Or strip const/let declarations
    try {
      vm.runInContext(code, context, { filename: f });
      console.log(`✓ Loaded: ${f}`);
    } catch (e) {
      console.error(`❌ Error loading ${f}:`, e.message);
    }
  } else {
    console.warn(`File not found: ${f}`);
  }
});

// Run Master Test Suite inside context
try {
  const result = vm.runInContext('runMasterTestSuite()', context);
  const logContent = sandbox.Logger.getLog();
  const testLogsDir = path.join(rootDir, 'test_logs');
  if (!fs.existsSync(testLogsDir)) fs.mkdirSync(testLogsDir, { recursive: true });
  fs.writeFileSync(path.join(testLogsDir, 'master_test_run.log'), logContent, 'utf8');
  console.log('\n✓ Saved full master test run log to test_logs/master_test_run.log');
} catch (err) {
  console.error('MasterTestSuite execution error:', err.message);
}
