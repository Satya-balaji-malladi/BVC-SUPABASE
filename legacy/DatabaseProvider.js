/**
 * ==========================================================
 * DatabaseProvider.gs
 * ==========================================================
 */

var DatabaseProvider = {

  get: function () {

    if (TEST_CONFIG.USE_REAL_DATABASE) {
      return DatabaseService;
    }

    return MockDatabaseService;

  }

};