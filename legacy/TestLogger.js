/**
 * ==========================================
 * TestLogger.gs
 * ==========================================
 */

var TestLogger = {

  /**
   * Normal log
   */
  log: function (message) {
    Logger.log(message);
  },

  /**
   * Section Heading
   */
  section: function (title) {
    Logger.log("");
    Logger.log("================================");
    Logger.log(title);
    Logger.log("================================");
  },

  /**
   * Test Heading
   */
  test: function (title) {
    Logger.log("");
    Logger.log("================================");
    Logger.log(title);
    Logger.log("================================");
  },

  /**
   * Success
   */
  success: function (message) {
    Logger.log("✅ " + message);
  },

  /**
   * Failure
   */
  fail: function (message) {
    Logger.log("❌ " + message);
  },

  /**
   * Error
   */
  error: function (message) {
    Logger.log("❌ " + message);
  },

  /**
   * Warning
   */
  warning: function (message) {
    Logger.log("⚠️ " + message);
  }

};