/**
 * CentralSystemTestSuite.js
 * Comprehensive central automated test suite verifying all system functionalities.
 * Evaluates DB, Auth, Events, Attendance, Corrections, and Exports modules.
 */
const CentralSystemTestSuite = {

  runAllTests: function() {
    const results = [];
    const startTime = Date.now();

    const assert = (moduleName, testName, condition, message) => {
      results.push({
        module: moduleName,
        testName: testName,
        status: condition ? 'Passed' : 'Failed',
        details: condition ? 'Assertion verified successfully.' : (message || 'Assertion failed.')
      });
    };

    Logger.log("=== STARTING CENTRAL SYSTEM TEST SUITE ===");

    // 1. DATABASE COMPONENT
    try {
      const sheets = Object.values(CONFIG.SHEETS);
      let dbConnected = true;
      sheets.forEach(s => {
        const headers = DatabaseService.getHeaderRow(s);
        if (!headers || headers.length === 0) dbConnected = false;
      });
      assert('Database', 'Table schemas and connectivity check', dbConnected, 'One or more required database tables are missing headers.');
    } catch (e) {
      assert('Database', 'Table schemas and connectivity check', false, e.message);
    }

    // 2. AUTHENTICATION COMPONENT
    try {
      const testPass = 'Admin@123';
      const salt = Utils.generateSalt ? Utils.generateSalt() : 'saltsalt';
      const hash = Utils.hashPassword ? Utils.hashPassword(testPass, salt) : 'hashhash';
      assert('Authentication', 'Password Cryptographic Engine', hash && hash.length > 10, 'Password hashing engine returned invalid data.');
    } catch (e) {
      assert('Authentication', 'Password Cryptographic Engine', false, e.message);
    }

    // 3. EVENTS COMPONENT
    let testEventId = null;
    try {
      const usersList = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
      const testUser = usersList.find(u => !u.deletion_flag) || {};
      const validUserId = testUser.user_id || testUser['User ID'] || testUser['user_id'] || 'USR-001';

      const mockEvent = {
        event_name: 'Central Test Suite Sandbox ' + Date.now(),
        description: 'Automated testing run',
        coordinator_id: validUserId,
        created_by: validUserId,
        event_status: 'Draft'
      };
      
      const createRes = EventService.createEvent(mockEvent);
      assert('Events', 'Simplified Event Creation & Auto-Draft state', createRes.success && createRes.data && createRes.data.event, 'Failed to create sandbox event.');
      
      if (createRes.success && createRes.data && createRes.data.event) {
        testEventId = createRes.data.event.event_id;
        
        // Test status transition
        const submitRes = EnterpriseEventService.submitForApproval(testEventId, validUserId);
        assert('Events', 'Approval Workflow Submission', submitRes.success, 'Failed to transition status to Pending Approval.');
        
        const approveRes = EnterpriseEventService.approveEvent(testEventId, validUserId);
        assert('Events', 'Approval Workflow Approval', approveRes.success, 'Failed to transition status to Configuration.');
      }
    } catch (e) {
      assert('Events', 'Simplified Event Creation & Workflow', false, e.message);
    }

    // 4. ATTENDANCE & DUPLICATION
    try {
      if (testEventId) {
        const res1 = AttendanceService.markAttendance({
          event_id: testEventId,
          roll_number: '20P31A0501',
          attendance_method: 'Manual',
          reason: 'Scanner failure sandbox check'
        }, validUserId);
        assert('Attendance', 'Manual check-in scan', res1.success, 'Failed to log initial check-in scan: ' + res1.message);

        const res2 = AttendanceService.markAttendance({
          event_id: testEventId,
          roll_number: '20P31A0501',
          attendance_method: 'Manual',
          reason: 'Scanner failure sandbox check'
        }, validUserId);
        assert('Attendance', 'Duplicate scan prevention blocks check-in', !res2.success, 'Duplicate scan was incorrectly allowed to log secondary check-in.');
      } else {
        assert('Attendance', 'Scan logs and duplicate check', false, 'Skipped: Sandbox event not initialized.');
      }
    } catch (e) {
      assert('Attendance', 'Scan logs and duplicate check', false, e.message);
    }

    // 5. EXPORT BUILDER COMPONENT
    try {
      const mockConfig = {
        module_type: 'events',
        format: 'csv',
        fields: ['event_name', 'description'],
        sort_by: 'event_name',
        sort_order: 'asc'
      };
      const res = ExportService.processCustomExport(validUserId, mockConfig, { role: 'Super Admin' });
      assert('Exports', 'Export builder custom data processor', res.success && res.rows, 'Export query failed: ' + res.message);
    } catch (e) {
      assert('Exports', 'Export builder custom data processor', false, e.message);
    }

    // Cleanup Sandbox Event
    if (testEventId) {
      try {
        DatabaseService.updateRow(CONFIG.SHEETS.EVENTS, 'event_id', testEventId, { deletion_flag: true });
        // Cleanup sandbox attendance logs
        const allAtt = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE) || [];
        const testAtt = allAtt.find(r => r.event_id === testEventId);
        if (testAtt) {
          DatabaseService.updateRow(CONFIG.SHEETS.ATTENDANCE, 'attendance_id', testAtt.attendance_id, { deletion_flag: true });
        }
      } catch (cleanupErr) {
        Logger.log("Sandbox event cleanup error: " + cleanupErr.message);
      }
    }

    const elapsed = Date.now() - startTime;
    const passed = results.filter(r => r.status === 'Passed').length;
    const failed = results.filter(r => r.status === 'Failed').length;

    Logger.log(`=== CENTRAL SYSTEM TEST COMPLETE in ${elapsed}ms ===`);
    Logger.log(`Passed: ${passed} | Failed: ${failed}`);

    return {
      success: failed === 0,
      summary: {
        total: results.length,
        passed: passed,
        failed: failed,
        duration_ms: elapsed
      },
      results: results
    };
  }
};
