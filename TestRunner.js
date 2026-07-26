/**
 * TestRunner.js
 * Automated test suite coordinator and Official Production Deployment Gate.
 */
const TestRunner = {
  
  runAllTests: function() {
    const startTime = Date.now();
    TestHelpers.resetCounts();

    const sequence = [
      { name: 'Authentication', fn: testAuthentication },
      { name: 'RBAC', fn: testRBAC },
      { name: 'Configuration', fn: testConfiguration },
      { name: 'Database', fn: testDatabase },
      { name: 'Users', fn: testUsers },
      { name: 'Students', fn: testStudents },
      { name: 'Departments', fn: testDepartments },
      { name: 'Events', fn: testEvents },
      { name: 'Participants', fn: testParticipants },
      { name: 'Attendance', fn: testAttendance },
      { name: 'Dashboard', fn: testDashboard },
      { name: 'Reports', fn: testReports },
      { name: 'Analytics', fn: testAnalytics },
      { name: 'Cache', fn: testCache },
      { name: 'LockService', fn: testLockService },
      { name: 'Monitoring', fn: testMonitoring },
      { name: 'Logging', fn: testLogging },
      { name: 'Backup', fn: testBackup },
      { name: 'RowLevelSecurity', fn: testRowLevelSecurity },
      { name: 'EventTimeline', fn: testEventTimelineAndDayAttendance },
      { name: 'AttendanceQueueAndExport', fn: testAttendanceQueueAndExportUtils },
      { name: 'UserCreationBusinessRules', fn: testUserCreationBusinessRules },
      { name: 'CustomColumnExport', fn: testCustomColumnExport },
      { name: 'SecurityPenetration', fn: function() { const r = SecurityPenetrationTest.run(); if (!r.success) throw new Error('SecurityPenetrationTest failed'); } },
      { name: 'LoadAndPerformance', fn: function() { const r = LoadTestRunner.run(); if (!r.success) throw new Error('LoadTestRunner failed'); } }
    ];

    const results = {};
    sequence.forEach(s => {
      results[s.name] = 'NOT_RUN';
    });

    let failedTest = null;
    let failedError = null;

    for (let i = 0; i < sequence.length; i++) {
      const step = sequence[i];
      try {
        step.fn();
        results[step.name] = 'PASS';
      } catch (e) {
        results[step.name] = 'FAIL';
        failedTest = step;
        failedError = e;
        for (let j = i + 1; j < sequence.length; j++) {
          results[sequence[j].name] = 'SKIPPED';
        }
        break;
      }
    }

    const elapsedMs = Date.now() - startTime;
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(elapsedSec / 60);
    const seconds = elapsedSec % 60;
    const timeStr = minutes + " Minutes " + seconds + " Seconds (" + elapsedMs + "ms)";

    this.printProductionReport(sequence.length, results, timeStr, failedTest, failedError);

    if (failedTest) {
      return { success: false, error: failedError };
    } else {
      return { success: true };
    }
  },

  printProductionReport: function(totalModules, results, timeStr, failedTest, failedError) {
    var passedModules = 0;
    var failedModules = 0;
    var skippedModules = 0;

    Object.keys(results).forEach(k => {
      if (results[k] === 'PASS') passedModules++;
      else if (results[k] === 'FAIL') failedModules++;
      else if (results[k] === 'SKIPPED') skippedModules++;
    });

    var totalAsserts = TestHelpers._passCount + TestHelpers._failCount;

    Logger.log('=========================================');
    Logger.log('📋 BVC EVENT ATTENDANCE SYSTEM');
    Logger.log('Production Test Report');
    Logger.log('=========================================');
    Logger.log('');
    Logger.log('📦 Total Modules Tested: ' + totalModules);
    Logger.log('🧪 Total Assertions Checked: ' + totalAsserts);
    Logger.log('✅ Passed Assertions: ' + TestHelpers._passCount);
    Logger.log('❌ Failed Assertions: ' + TestHelpers._failCount);
    Logger.log('⚠️ Skipped Modules: ' + skippedModules);
    Logger.log('⏱ Total Execution Time: ' + timeStr);
    Logger.log('');
    Logger.log('-----------------------------------------');

    Object.keys(results).forEach(k => {
      var icon = results[k] === 'PASS' ? '✅ PASS' : (results[k] === 'FAIL' ? '❌ FAIL' : '⚠️ SKIPPED');
      Logger.log(k.padEnd(25) + " " + icon);
    });

    Logger.log('-----------------------------------------');

    if (failedTest || TestHelpers._failCount > 0) {
      Logger.log('❌ Failed Test IDs: ' + (TestHelpers._failedIds.join(', ') || failedTest.name));
      Logger.log('');
      Logger.log('=========================================');
      Logger.log('🚫 Production Ready: NO');
      Logger.log('Reason: Critical assertions failed. Fix issues and rerun suite.');
      Logger.log('=========================================');
      if (failedError) {
        Logger.log('Failure Detail: ' + (failedError.message || failedError));
      }
    } else {
      Logger.log('');
      Logger.log('=========================================');
      Logger.log('🟢 Production Ready: YES');
      Logger.log('All functional, security, performance, and role-based tests passed.');
      Logger.log('=========================================');
    }
  }
};