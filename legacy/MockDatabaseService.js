/**
 * ==========================================================
 * MockDatabaseService.gs
 * ==========================================================
 * Mock Database Service
 * Used for Unit Testing
 * Zero Supabase Calls
 * ==========================================================
 */

var MockDatabaseService = (function () {

  /**
   * ==========================================================
   * Initial Mock Data
   * ==========================================================
   */
  var INITIAL_DATA = {

    users: [

      {
        userId: "USER_SA_01",
        employeeId: "USER_SA_01",
        username: "principal",
        password: "admin123",
        role: "SUPER_ADMIN",
        status: "Active",
        deletionFlag: false,
        firstName: "Malladi",
        lastName: "Ramana"
      },

      {
        userId: "USER_HOD_19",
        employeeId: "USER_HOD_19",
        username: "hod_19",
        password: "hod123",
        role: "HOD",
        status: "Active",
        deletionFlag: false,
        firstName: "Priyanka",
        lastName: "Sattama"
      },

      {
        userId: "USER_STAFF_10",
        employeeId: "USER_STAFF_10",
        username: "staff_10",
        password: "staff123",
        role: "EVENT_ADMIN",
        status: "Active",
        deletionFlag: false,
        firstName: "Priyanka",
        lastName: "Rao"
      }

    ],

    students: [],
    departments: [],
    events: [],
    attendance: [],
    sessions: []

  };

  /**
   * ==========================================================
   * Runtime Database
   * ==========================================================
   */
  var DATABASE = {};

  /**
   * ==========================================================
   * Private Helpers
   * ==========================================================
   */

  function _clone(data) {

    return JSON.parse(JSON.stringify(data));

  }

  function _validateTable(table) {

    if (!table)
      throw new Error("Table name is required.");

    table = String(table).toLowerCase();

    if (!DATABASE.hasOwnProperty(table))
      throw new Error("Mock table not found : " + table);

    return table;

  }

  function _getTable(table) {

    return DATABASE[_validateTable(table)];

  }

  function _findIndex(table, column, value) {

    table = _getTable(table);

    for (var i = 0; i < table.length; i++) {

      if (table[i][column] == value)
        return i;

    }

    return -1;

  }

  /**
   * ==========================================================
   * Reset Database
   * ==========================================================
   */

  function reset() {

    DATABASE = _clone(INITIAL_DATA);

  }

  /**
   * ==========================================================
   * Clear Database
   * ==========================================================
   */

  function clear() {

    Object.keys(DATABASE).forEach(function (table) {

      DATABASE[table] = [];

    });

  }

  /**
   * ==========================================================
   * Read All Rows
   * ==========================================================
   */

  function readAllRows(table) {

    table = _getTable(table);

    return table.filter(function (row) {

      return row.deletionFlag !== true;

    }).map(_clone);

  }

  /**
   * ==========================================================
   * Read Including Deleted
   * ==========================================================
   */

  function readAllRowsIncludingDeleted(table) {

    return _clone(_getTable(table));

  }

  /**
   * ==========================================================
   * Find One
   * ==========================================================
   */

  function findOne(table, column, value) {

    table = _getTable(table);

    for (var i = 0; i < table.length; i++) {

      if (table[i][column] == value)
        return _clone(table[i]);

    }

    return undefined;

  }

  /**
   * ==========================================================
   * Exists
   * ==========================================================
   */

  function exists(table, column, value) {

    return findOne(table, column, value) !== undefined;

  }

  /**
   * ==========================================================
   * Initialize Database
   * ==========================================================
   */

  reset();

  /**
   * ==========================================================
   * Public API
   * ==========================================================
   */

  return {

    readAllRows: readAllRows,

    readAllRowsIncludingDeleted: readAllRowsIncludingDeleted,

    findOne: findOne,

    exists: exists,

    insertRow: insertRow,

    updateRow: updateRow,

    deleteRow: deleteRow,

    clearCache: clearCache,

    reset: reset,

    clear: clear

  };

})();


/**
 * ==========================================================
 * Insert Row
 * ==========================================================
 */

function insertRow(table, row) {

  table = _getTable(table);

  if (!row || typeof row !== "object")
    throw new Error("Invalid row.");

  table.push(_clone(row));

  return true;

}

/**
 * ==========================================================
 * Update Row
 * ==========================================================
 */

function updateRow(table, column, value, updates) {

  if (!updates || typeof updates !== "object")
    return false;

  var tableData = _getTable(table);

  var index = _findIndex(table, column, value);

  if (index === -1)
    return false;

  Object.keys(updates).forEach(function (key) {

    tableData[index][key] = updates[key];

  });

  return true;

}

/**
 * ==========================================================
 * Delete Row
 * (Soft Delete)
 * ==========================================================
 */

function deleteRow(table, column, value) {

  var tableData = _getTable(table);

  var index = _findIndex(table, column, value);

  if (index === -1)
    return false;

  tableData[index].deletionFlag = true;

  return true;

}

/**
 * ==========================================================
 * Clear Cache
 * Compatibility Only
 * ==========================================================
 */

function clearCache() {

  // Mock database has no cache.
  return true;

}