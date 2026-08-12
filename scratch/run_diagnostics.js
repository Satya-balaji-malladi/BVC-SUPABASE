const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const vm = require('vm');

function syncFetch(urlStr, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = options.headers || {};
  const payload = options.payload || '';

  const headerArgs = Object.keys(headers).map(h => `-H "${h}: ${headers[h].replace(/"/g, '\\"')}"`).join(' ');
  let dataArg = '';
  if (payload) {
    const tmpFile = path.join(__dirname, 'tmp_payload_' + Math.random().toString(36).substring(7) + '.json');
    fs.writeFileSync(tmpFile, payload, 'utf8');
    dataArg = `--data-binary "@${tmpFile.replace(/\\/g, '/')}"`;
  }

  const cmd = `curl -s -w "\\n%{http_code}" -X ${method} ${headerArgs} ${dataArg} "${urlStr}"`;
  try {
    const rawOutput = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    if (payload) {
      const match = dataArg.match(/@"(.*)"/);
      if (match && fs.existsSync(match[1])) {
        try { fs.unlinkSync(match[1]); } catch(e){}
      }
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

  UrlFetchApp: { fetch: syncFetch },
  Utilities: {
    computeDigest: function(algo, value) {
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(value).digest();
      return Array.from(hash).map(b => b > 127 ? b - 256 : b);
    },
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    base64Encode: (bytes) => Buffer.from(bytes.map(b => b < 0 ? b + 256 : b)).toString('base64'),
    base64Decode: (str) => Array.from(Buffer.from(str, 'base64')),
    formatDate: (date) => new Date(date).toISOString(),
    sleep: (ms) => { const start = Date.now(); while (Date.now() - start < ms) {} },
    getUuid: () => require('crypto').randomUUID()
  },
  LockService: {
    getScriptLock: () => ({ tryLock: () => true, releaseLock: () => true, waitLock: () => true }),
    getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => true, waitLock: () => true })
  },
  CacheService: {
    getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {}, removeAll: () => {} }),
    getUserCache: () => ({ get: () => null, put: () => {}, remove: () => {} }),
    getDocumentCache: () => ({ get: () => null, put: () => {}, remove: () => {} })
  },
  PropertiesService: {
    getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {}, deleteProperty: () => {}, getProperties: () => ({}) }),
    getUserProperties: () => ({ getProperty: () => null, setProperty: () => {} })
  },
  Session: {
    getActiveUser: () => ({ getEmail: () => 'admin@bvc.edu.in' }),
    getEffectiveUser: () => ({ getEmail: () => 'admin@bvc.edu.in' })
  }
};

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
  'IntegrationAssertions.js',
  'BackendHealthCheck.js',
  'SystemHealthChecker.js',
  'DepartmentCreationDiagnostic.js'
];

const rootDir = path.resolve(__dirname, '..');
filesToLoad.forEach(f => {
  const filePath = path.join(rootDir, f);
  if (fs.existsSync(filePath)) {
    let code = fs.readFileSync(filePath, 'utf8');
    try {
      vm.runInContext(code, context, { filename: f });
    } catch (e) {
      console.error(`❌ Error loading ${f}:`, e.message);
    }
  }
});

console.log('--- RUNNING DIAGNOSTICS ---');

console.log('\n1. BackendHealthCheck:');
try {
  const bhRes = vm.runInContext('BackendHealthCheck.run()', context);
  console.log('Result:', bhRes);
} catch(e) {
  console.error('BackendHealthCheck error:', e.message);
}

console.log('\n2. SystemHealthChecker:');
try {
  const shRes = vm.runInContext('typeof SystemHealthChecker !== "undefined" && SystemHealthChecker.run ? SystemHealthChecker.run() : "SystemHealthChecker function not found"', context);
  console.log('Result:', shRes);
} catch(e) {
  console.error('SystemHealthChecker error:', e.message);
}

console.log('\n3. DepartmentCreationDiagnostic:');
try {
  const dcRes = vm.runInContext('typeof runDepartmentDiagnostic === "function" ? runDepartmentDiagnostic() : "runDepartmentDiagnostic not found"', context);
  console.log('Result:', dcRes);
} catch(e) {
  console.error('DepartmentCreationDiagnostic error:', e.message);
}
