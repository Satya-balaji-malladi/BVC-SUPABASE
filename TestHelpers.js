/**
 * TestHelpers.js
 * Centralized assertion library, test ID logger, and diagnostic formatter for the automated test framework.
 */
const TestHelpers = {
  _logs: [],
  _passCount: 0,
  _failCount: 0,
  _failedIds: [],

  resetCounts: function() {
    this._logs = [];
    this._passCount = 0;
    this._failCount = 0;
    this._failedIds = [];
  },

  logPass: function(testId, description) {
    this._passCount++;
    var msg = "✅ " + testId + " " + (description || "Test") + " Passed Successfully";
    Logger.log(msg);
    this._logs.push({ testId: testId, description: description, status: 'PASS' });
  },

  logFail: function(testId, description, error) {
    this._failCount++;
    if (testId && !this._failedIds.includes(testId)) {
      this._failedIds.push(testId);
    }
    var reason = error && error.message ? error.message : String(error);
    var msg = "❌ " + testId + " " + (description || "Test") + " Failed\n" +
              "Reason: " + reason + "\n" +
              "Expected: " + JSON.stringify(error ? error.expected : true) + "\n" +
              "Actual: " + JSON.stringify(error ? error.actual : false) + "\n" +
              "Root Cause: " + (error ? (error.suggestedCause || 'Assertion Mismatch') : 'Execution Error') + "\n" +
              "Suggested Fix: " + (error ? (error.suggestedFix || 'Review parameters & schema') : 'Check stack trace');
    Logger.log(msg);
    this._logs.push({ testId: testId, description: description, status: 'FAIL', error: error });
  },

  /**
   * Asserts that two values are strictly equal.
   */
  assertEquals: function(expected, actual, message, moduleName, functionName, testId) {
    testId = testId || (moduleName ? moduleName.substring(0,4).toUpperCase() + '-001' : 'TEST-001');
    if (expected !== actual) {
      var failure = this.buildFailure(moduleName, functionName, message, expected, actual, testId);
      this.logFail(testId, message, failure);
      throw failure;
    } else {
      this.logPass(testId, message);
    }
  },

  /**
   * Alias for assertEquals
   */
  assertEqual: function(expected, actual, message, moduleName, functionName, testId) {
    this.assertEquals(expected, actual, message, moduleName, functionName, testId);
  },

  /**
   * Asserts that a condition is true.
   */
  assertTrue: function(condition, message, moduleName, functionName, testId) {
    testId = testId || (moduleName ? moduleName.substring(0,4).toUpperCase() + '-001' : 'TEST-001');
    if (!condition) {
      var failure = this.buildFailure(moduleName, functionName, message, true, false, testId);
      this.logFail(testId, message, failure);
      throw failure;
    } else {
      this.logPass(testId, message);
    }
  },

  /**
   * Asserts that a value is null or undefined.
   */
  assertNull: function(value, message, moduleName, functionName, testId) {
    testId = testId || (moduleName ? moduleName.substring(0,4).toUpperCase() + '-001' : 'TEST-001');
    if (value !== null && value !== undefined) {
      var failure = this.buildFailure(moduleName, functionName, message, null, value, testId);
      this.logFail(testId, message, failure);
      throw failure;
    } else {
      this.logPass(testId, message);
    }
  },

  /**
   * Builds a structured error exception containing full failure diagnostics.
   */
  buildFailure: function(moduleName, functionName, reason, expected, actual, testId) {
    const error = new Error(reason);
    error.isAssertionFailure = true;
    error.testId = testId || 'TEST-001';
    error.moduleName = moduleName || 'Unknown';
    error.functionName = functionName || 'Unknown';
    error.expected = expected;
    error.actual = actual;
    error.severity = 'Critical';
    error.fileName = 'TestCases.js';
    error.suggestedCause = 'Incorrect parameter values or data scoping mismatch.';
    error.suggestedFix = 'Verify configuration sheets, headers, and RBAC rules.';
    return error;
  },

  logStart: function(testName) {
    this._logs.push({
      testName: testName,
      start: Date.now(),
      status: 'RUNNING'
    });
  },

  logEnd: function(testName, status, error) {
    const log = this._logs.find(l => l.testName === testName && l.status === 'RUNNING');
    if (log) {
      log.end = Date.now();
      log.duration = log.end - log.start;
      log.status = status;
      if (error) {
        log.error = error.message;
      }
    }
  }
};
