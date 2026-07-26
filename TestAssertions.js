  /**
 * TestAssertions.js
 * Assertion/helper library for backend integration tests.
 *
 * Only helper functions. Does NOT execute tests or call backend services.
 */

var TestAssertions = (function() {

  // -------------------------
  // Result helpers
  // -------------------------

  function createPassResult(assertion, expected, actual, message) {
    return {
      passed: true,
      assertion: assertion || '',
      expected: expected,
      actual: actual,
      message: message || ''
    };
  }

  function createFailResult(assertion, expected, actual, message) {
    return {
      passed: false,
      assertion: assertion || '',
      expected: expected,
      actual: actual,
      message: message || ''
    };
  }

  function safeToString(v) {
    try {
      if (v === undefined) return 'undefined';
      if (v === null) return 'null';
      if (typeof v === 'string') return v;
      if (v instanceof Date) return v.toISOString();
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    } catch (e) {
      try { return String(v); } catch (e2) { return '[unprintable]'; }
    }
  }

  function formatAssertionMessage(assertion, expected, actual, message) {
    var parts = [];
    if (message) parts.push(String(message));
    parts.push('Assertion=' + assertion);
    parts.push('Expected=' + safeToString(expected));
    parts.push('Actual=' + safeToString(actual));
    return parts.join(' | ');
  }

  function assertEquals(expected, actual) {
    try {
      if (expected === actual) {
        return createPassResult('assertEquals', expected, actual, '');
      }
      return createFailResult('assertEquals', expected, actual, formatAssertionMessage('assertEquals', expected, actual, 'Expected values to be equal'));
    } catch (e) {
      return createFailResult('assertEquals', expected, actual, e && e.message ? e.message : String(e));
    }
  }

  function assertNotEquals(expected, actual) {
    try {
      if (expected !== actual) {
        return createPassResult('assertNotEquals', expected, actual, '');
      }
      return createFailResult('assertNotEquals', expected, actual, formatAssertionMessage('assertNotEquals', expected, actual, 'Expected values to be different'));
    } catch (e) {
      return createFailResult('assertNotEquals', expected, actual, e && e.message ? e.message : String(e));
    }
  }

  function assertTrue(value) {
    return value === true ? createPassResult('assertTrue', true, value, '') : createFailResult('assertTrue', true, value, 'Expected true');
  }

  function assertFalse(value) {
    return value === false ? createPassResult('assertFalse', false, value, '') : createFailResult('assertFalse', false, value, 'Expected false');
  }

  function assertNull(value) {
    return value === null ? createPassResult('assertNull', null, value, '') : createFailResult('assertNull', null, value, 'Expected null');
  }

  function assertNotNull(value) {
    return (value !== null && value !== undefined) ? createPassResult('assertNotNull', '!= null', value, '') : createFailResult('assertNotNull', '!= null', value, 'Expected not null');
  }

  function assertUndefined(value) {
    return value === undefined ? createPassResult('assertUndefined', undefined, value, '') : createFailResult('assertUndefined', undefined, value, 'Expected undefined');
  }

  function assertDefined(value) {
    return value !== undefined ? createPassResult('assertDefined', 'defined', value, '') : createFailResult('assertDefined', 'defined', value, 'Expected defined');
  }

  function assertEmpty(value) {
    try {
      var ok = false;
      if (value === null || value === undefined) ok = true;
      else if (typeof value === 'string') ok = value.length === 0;
      else if (Array.isArray(value)) ok = value.length === 0;
      else if (typeof value === 'object') ok = Object.keys(value).length === 0;
      return ok ? createPassResult('assertEmpty', 'empty', value, '') : createFailResult('assertEmpty', 'empty', value, 'Expected empty');
    } catch (e) {
      return createFailResult('assertEmpty', 'empty', value, e && e.message ? e.message : String(e));
    }
  }

  function assertNotEmpty(value) {
    try {
      var ok = false;
      if (value === null || value === undefined) ok = false;
      else if (typeof value === 'string') ok = value.length > 0;
      else if (Array.isArray(value)) ok = value.length > 0;
      else if (typeof value === 'object') ok = Object.keys(value).length > 0;
      else ok = true;
      return ok ? createPassResult('assertNotEmpty', 'not empty', value, '') : createFailResult('assertNotEmpty', 'not empty', value, 'Expected not empty');
    } catch (e) {
      return createFailResult('assertNotEmpty', 'not empty', value, e && e.message ? e.message : String(e));
    }
  }

  function assertArray(value) {
    return Array.isArray(value) ? createPassResult('assertArray', 'Array', value, '') : createFailResult('assertArray', 'Array', value, 'Expected array');
  }

  function assertObject(value) {
    var ok = value !== null && typeof value === 'object' && !Array.isArray(value);
    return ok ? createPassResult('assertObject', 'Object', value, '') : createFailResult('assertObject', 'Object', value, 'Expected object');
  }

  function assertString(value) {
    return (typeof value === 'string') ? createPassResult('assertString', 'string', value, '') : createFailResult('assertString', 'string', value, 'Expected string');
  }

  function assertNumber(value) {
    var ok = (typeof value === 'number' && !isNaN(value));
    return ok ? createPassResult('assertNumber', 'number', value, '') : createFailResult('assertNumber', 'number', value, 'Expected number');
  }

  function assertBoolean(value) {
    return (typeof value === 'boolean') ? createPassResult('assertBoolean', 'boolean', value, '') : createFailResult('assertBoolean', 'boolean', value, 'Expected boolean');
  }

  function assertDate(value) {
    var ok = value instanceof Date && !isNaN(value.getTime());
    return ok ? createPassResult('assertDate', 'Date', value, '') : createFailResult('assertDate', 'Date', value, 'Expected valid Date');
  }

  function assertContains(container, value) {
    try {
      var ok = false;
      if (typeof container === 'string') ok = container.indexOf(String(value)) !== -1;
      else if (Array.isArray(container)) ok = container.indexOf(value) !== -1;
      else if (container && typeof container === 'object') ok = Object.prototype.hasOwnProperty.call(container, value);
      return ok ? createPassResult('assertContains', value, container, '') : createFailResult('assertContains', value, container, 'Expected container to contain value');
    } catch (e) {
      return createFailResult('assertContains', value, container, e && e.message ? e.message : String(e));
    }
  }

  function assertNotContains(container, value) {
    try {
      var ok = false;
      if (typeof container === 'string') ok = container.indexOf(String(value)) === -1;
      else if (Array.isArray(container)) ok = container.indexOf(value) === -1;
      else if (container && typeof container === 'object') ok = !Object.prototype.hasOwnProperty.call(container, value);
      return ok ? createPassResult('assertNotContains', value, container, '') : createFailResult('assertNotContains', value, container, 'Expected container not to contain value');
    } catch (e) {
      return createFailResult('assertNotContains', value, container, e && e.message ? e.message : String(e));
    }
  }

  function assertGreaterThan(a, b) {
    return (a > b) ? createPassResult('assertGreaterThan', '>' + b, a, '') : createFailResult('assertGreaterThan', '>' + b, a, 'Expected greater than');
  }

  function assertLessThan(a, b) {
    return (a < b) ? createPassResult('assertLessThan', '<' + b, a, '') : createFailResult('assertLessThan', '<' + b, a, 'Expected less than');
  }

  function assertGreaterThanOrEqual(a, b) {
    return (a >= b) ? createPassResult('assertGreaterThanOrEqual', '>=' + b, a, '') : createFailResult('assertGreaterThanOrEqual', '>=' + b, a, 'Expected >=');
  }

  function assertLessThanOrEqual(a, b) {
    return (a <= b) ? createPassResult('assertLessThanOrEqual', '<=' + b, a, '') : createFailResult('assertLessThanOrEqual', '<=' + b, a, 'Expected <=');
  }

  function assertThrows(callback) {
    try {
      var threw = false;
      try { callback && callback(); } catch (e) { threw = true; }
      return threw ? createPassResult('assertThrows', 'throws', true, '') : createFailResult('assertThrows', 'throws', false, 'Expected throw');
    } catch (e) {
      return createFailResult('assertThrows', 'throws', false, e && e.message ? e.message : String(e));
    }
  }

  function assertNoThrow(callback) {
    try {
      try { callback && callback(); } catch (e) { return createFailResult('assertNoThrow', 'no throw', 'threw', 'Expected no throw'); }
      return createPassResult('assertNoThrow', 'no throw', 'no throw', '');
    } catch (e) {
      return createFailResult('assertNoThrow', 'no throw', 'threw', e && e.message ? e.message : String(e));
    }
  }

  function assertResponseSuccess(response) {
    if (!response || typeof response !== 'object') return createFailResult('assertResponseSuccess', true, response, 'Response must be object');
    if (response.success === true) return createPassResult('assertResponseSuccess', true, response.success, '');
    return createFailResult('assertResponseSuccess', true, response.success, 'Expected response.success === true');
  }

  function assertResponseFailure(response) {
    if (!response || typeof response !== 'object') return createFailResult('assertResponseFailure', false, response, 'Response must be object');
    if (response.success === false) return createPassResult('assertResponseFailure', false, response.success, '');
    return createFailResult('assertResponseFailure', false, response.success, 'Expected response.success === false');
  }

  function assertValidId(id) {
    var ok = id !== null && id !== undefined && String(id).trim().length > 0;
    return ok ? createPassResult('assertValidId', 'non-empty', id, '') : createFailResult('assertValidId', 'non-empty', id, 'Invalid id');
  }

  function assertValidEmail(email) {
    var s = (email === null || email === undefined) ? '' : String(email).trim();
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    return ok ? createPassResult('assertValidEmail', 'email', s, '') : createFailResult('assertValidEmail', 'email', s, 'Invalid email');
  }

  function assertValidPhone(phone) {
    var s = (phone === null || phone === undefined) ? '' : String(phone).trim();
    var ok = /^[+]?[-0-9\s]{8,15}$/.test(s);
    return ok ? createPassResult('assertValidPhone', 'phone', s, '') : createFailResult('assertValidPhone', 'phone', s, 'Invalid phone');
  }

  function assertExecutionTime(milliseconds, limit) {
    var ok = (typeof milliseconds === 'number' && !isNaN(milliseconds) && typeof limit === 'number' && !isNaN(limit) && milliseconds <= limit);
    return ok ? createPassResult('assertExecutionTime', '<=' + limit + 'ms', milliseconds, '') : createFailResult('assertExecutionTime', '<=' + limit + 'ms', milliseconds, 'Execution time too high');
  }

  // -------------------------
  // Export
  // -------------------------

  return {
    createPassResult: createPassResult,
    createFailResult: createFailResult,
    formatAssertionMessage: formatAssertionMessage,

    assertEquals: assertEquals,
    assertNotEquals: assertNotEquals,
    assertTrue: assertTrue,
    assertFalse: assertFalse,
    assertNull: assertNull,
    assertNotNull: assertNotNull,
    assertUndefined: assertUndefined,
    assertDefined: assertDefined,
    assertEmpty: assertEmpty,
    assertNotEmpty: assertNotEmpty,
    assertArray: assertArray,
    assertObject: assertObject,
    assertString: assertString,
    assertNumber: assertNumber,
    assertBoolean: assertBoolean,
    assertDate: assertDate,
    assertContains: assertContains,
    assertNotContains: assertNotContains,
    assertGreaterThan: assertGreaterThan,
    assertLessThan: assertLessThan,
    assertGreaterThanOrEqual: assertGreaterThanOrEqual,
    assertLessThanOrEqual: assertLessThanOrEqual,
    assertThrows: assertThrows,
    assertNoThrow: assertNoThrow,
    assertResponseSuccess: assertResponseSuccess,
    assertResponseFailure: assertResponseFailure,
    assertValidId: assertValidId,
    assertValidEmail: assertValidEmail,
    assertValidPhone: assertValidPhone,
    assertExecutionTime: assertExecutionTime
  };

})();

// GAS global exposure
if (typeof globalThis !== 'undefined') {
  globalThis.TestAssertions = TestAssertions;
} else {
  this.TestAssertions = TestAssertions;
}

