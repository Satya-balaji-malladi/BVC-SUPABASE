/**
 * SystemMonitoringService.js
 * Centralized internal monitoring service for system health tracking.
 * Gathers lightweight diagnostics, error rates, and resource utilization.
 */
const SystemMonitoringService = {
  
  /**
   * Retrieves active health status counters and performance aggregates.
   * @param {string} userId Admin User ID
   * @return {object} Diagnostic metrics payload
   */
  getSystemHealth: function(userId) {
    const startTime = Date.now();
    try {
      const dbResponseTimeStart = Date.now();
      const sheetsCount = Object.keys(CONFIG.SHEETS).length;
      
      // Fetch settings sheet connectivity check
      const settingsSheet = CONFIG.SHEETS.SETTINGS || 'Settings';
      const isConnected = !!DatabaseService.getSheet(settingsSheet);
      const dbResponseTime = Date.now() - dbResponseTimeStart;

      // Calculate active sessions
      const sessionSheet = CONFIG.SHEETS.SESSIONS || 'Sessions';
      const sessions = DatabaseService.readAllRows(sessionSheet) || [];
      const activeStatus = (CONFIG && CONFIG.SESSION_STATUS && CONFIG.SESSION_STATUS.ACTIVE) ? CONFIG.SESSION_STATUS.ACTIVE : 'Active';
      const activeSessionsCount = sessions.filter(s => String(s['Session Status'] || s.status) === activeStatus).length;

      // Extract error logs count from Audit logs
      const auditSheet = CONFIG.SHEETS.AUDITLOGS || 'AuditLogs';
      let auditLogs = [];
      try {
        auditLogs = DatabaseService.readAllRows(auditSheet) || [];
      } catch (ae) {}
      const errorLogsCount = auditLogs.filter(log => {
        const action = String(log['Action'] || log.action || '').toUpperCase();
        const status = String(log['Status'] || log.status || '').toUpperCase();
        return action.includes('ERROR') || status === 'FAIL' || status === 'ERROR';
      }).length;

      // Check CacheManager connectivity
      let isCacheWorking = false;
      try {
        if (typeof CacheManager !== 'undefined') {
          CacheManager.put('__monitoring_test', 'working', 10);
          isCacheWorking = CacheManager.get('__monitoring_test') === 'working';
        }
      } catch (e) {}

      // Check LockManager state
      let isLockAvailable = false;
      try {
        const lock = LockService.getScriptLock();
        isLockAvailable = !!lock;
      } catch (e) {}

      // Calculate Overall Status tier
      let status = 'HEALTHY';
      if (errorLogsCount > 15 || dbResponseTime > 1800) status = 'WARNING';
      if (!isConnected || !isLockAvailable) status = 'CRITICAL';

      const executionTime = Date.now() - startTime;

      return Utils.buildResponse(true, 'System health report compiled successfully.', {
        health: {
          status: status,
          dbConnected: isConnected,
          dbResponseTimeMs: dbResponseTime,
          sheetsConfigured: sheetsCount,
          activeSessions: activeSessionsCount,
          cacheEnabled: isCacheWorking,
          lockServiceAvailable: isLockAvailable,
          systemErrorCount: errorLogsCount,
          executionTimeMs: executionTime,
          quotaRemaining: this._estimateQuotaRemaining()
        }
      });
    } catch (e) {
      return Utils.buildResponse(false, 'Failed to compile system health diagnostics: ' + e.message);
    }
  },

  _estimateQuotaRemaining: function() {
    try {
      return MailApp.getRemainingDailyQuota();
    } catch(e) {
      return 100;
    }
  }
};
