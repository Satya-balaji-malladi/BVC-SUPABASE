/**
 * ===========================================
 * TestAssertions.gs
 * Enterprise Assertion Library
 * ===========================================
 */

var TestAssertions = (function () {

  function success(message) {
    return {
      success: true,
      message: message || "Passed"
    };
  }

  function failure(expected, actual, message) {
    return {
      success: false,
      expected: expected,
      actual: actual,
      message: message || "Assertion Failed"
    };
  }

  return {

    equals: function (expected, actual, message) {

      if (expected === actual)
        return success(message);

      return failure(expected, actual, message);

    },

    notEquals: function (expected, actual, message) {

      if (expected !== actual)
        return success(message);

      return failure(expected, actual, message);

    },

    true: function (value, message) {

      if (value === true)
        return success(message);

      return failure(true, value, message);

    },

    false: function (value, message) {

      if (value === false)
        return success(message);

      return failure(false, value, message);

    },

    null: function (value, message) {

      if (value === null)
        return success(message);

      return failure(null, value, message);

    },

    notNull: function (value, message) {

      if (value !== null && value !== undefined)
        return success(message);

      return failure("Not Null", value, message);

    },

    empty: function (value, message) {

      if (
        value === "" ||
        value === null ||
        value === undefined ||
        (Array.isArray(value) && value.length === 0)
      ) {
        return success(message);
      }

      return failure("Empty", value, message);

    },

    notEmpty: function (value, message) {

      if (
        value !== "" &&
        value !== null &&
        value !== undefined &&
        (!Array.isArray(value) || value.length > 0)
      ) {
        return success(message);
      }

      return failure("Not Empty", value, message);

    },

    contains: function (collection, item, message) {

      if (!collection)
        return failure(item, collection, message);

      if (collection.indexOf(item) !== -1)
        return success(message);

      return failure(item, collection, message);

    },

    greaterThan: function (a, b, message) {

      if (a > b)
        return success(message);

      return failure(">" + b, a, message);

    },

    lessThan: function (a, b, message) {

      if (a < b)
        return success(message);

      return failure("<" + b, a, message);

    },

    /* =======================================================
     * Compatibility Assertion Methods
     * ======================================================= */

    assertEquals: function (expected, actual, message) {

      var result = this.equals(expected, actual, message);

      if (!result.success) {
        throw new Error(
          (message || "Assertion Failed") +
          "\nExpected : " + expected +
          "\nActual   : " + actual
        );
      }

    },

    assertNotEquals: function (expected, actual, message) {

      var result = this.notEquals(expected, actual, message);

      if (!result.success)
        throw new Error(message || "Assertion Failed");

    },

    assertTrue: function (value, message) {

      var result = this.true(value, message);

      if (!result.success)
        throw new Error(message || "Assertion Failed");

    },

    assertFalse: function (value, message) {

      var result = this.false(value, message);

      if (!result.success)
        throw new Error(message || "Assertion Failed");

    },

    assertNull: function (value, message) {

      var result = this.null(value, message);

      if (!result.success)
        throw new Error(message || "Assertion Failed");

    },

    assertNotNull: function (value, message) {

      var result = this.notNull(value, message);

      if (!result.success)
        throw new Error(message || "Assertion Failed");

    },

    assertEmpty: function (value, message) {

      var result = this.empty(value, message);

      if (!result.success)
        throw new Error(message || "Assertion Failed");

    },

    assertNotEmpty: function (value, message) {

      var result = this.notEmpty(value, message);

      if (!result.success)
        throw new Error(message || "Assertion Failed");

    }

  };

})();