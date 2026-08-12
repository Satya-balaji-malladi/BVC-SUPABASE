/**
 * ==========================================
 * TestHelpers.gs
 * ==========================================
 */

var TestHelpers = {

  isRealDatabaseEnabled: function () {
    return TEST_CONFIG.USE_REAL_DATABASE;
  },

  isIntegrationEnabled: function () {
    return TEST_CONFIG.RUN_INTEGRATION_TESTS;
  },

  isE2EEnabled: function () {
    return TEST_CONFIG.RUN_E2E_TESTS;
  },

  skip: function (reason) {
    Logger.log("⏭️ SKIPPED : " + reason);
    return "Skipped";
  }

};