/**
 * StatusTesting.js
 * Comprehensive test suite for event-driven Active/Inactive status logic.
 */

var StatusTesting = {
  runAllTests: function() {
    Logger.log('=== STARTING STATUS ENGINE TESTS ===');
    var results = { passed: 0, failed: 0, errors: [] };
    
    // Setup Mock Data
    var testStudentRoll = 'TEST_STU_001';
    var testFacultyId = 'TEST_FAC_001';
    var testEventId = 'TEST_EVT_001';
    
    try {
      // Clean up previous runs
      DatabaseService.deleteRow(CONFIG.SHEETS.STUDENTS, 'roll_number', testStudentRoll);
      DatabaseService.deleteRow(CONFIG.SHEETS.USERS, 'user_id', testFacultyId);
      DatabaseService.deleteRow(CONFIG.SHEETS.EVENTS, 'event_id', testEventId);
      DatabaseService.deleteRow(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'roll_number', testStudentRoll);
      DatabaseService.deleteRow(CONFIG.SHEETS.EVENT_ASSIGNMENTS, 'user_id', testFacultyId);
      
      // 1. Create Student -> Should be Inactive
      var studentResp = StudentService.createStudent({ roll_number: testStudentRoll, student_name: 'Test Student' }, 'System');
      var stu = DatabaseService.findOne(CONFIG.SHEETS.STUDENTS, 'roll_number', testStudentRoll);
      this._assert(stu && (stu.status === 'Inactive' || stu.student_status === 'Inactive'), 'New student should be INACTIVE', results);
      
      // 2. Create Faculty -> Should be Inactive
      var facResp = UserService.createUser({ user_id: testFacultyId, role: 'Faculty', first_name: 'Test Fac' }, 'System');
      var fac = DatabaseService.findOne(CONFIG.SHEETS.USERS, 'user_id', testFacultyId);
      this._assert(fac && (fac.status === 'Inactive'), 'New faculty should be INACTIVE', results);
      
      // 3. Create Active Event
      var evtResp = EventService.createEvent({
         event_id: testEventId,
         event_name: 'Test Active Event',
         event_status: 'Active',
         start_date: '2020-01-01',
         end_date: '2099-12-31'
      }, 'System');
      
      // 4. Register Student to Event -> Should be Active
      ParticipantService.registerParticipant(testEventId, testStudentRoll, 'System', 'Student');
      // StatusService.refreshUserStatus should have been triggered
      stu = DatabaseService.findOne(CONFIG.SHEETS.STUDENTS, 'roll_number', testStudentRoll);
      this._assert(stu && (stu.status === 'Active' || stu.student_status === 'Active'), 'Registered student should be ACTIVE', results);
      
      // 5. Assign Faculty to Event -> Should be Active
      CoordinatorService.assignCoordinator(testEventId, testFacultyId, 'Coordinator', 'System');
      fac = DatabaseService.findOne(CONFIG.SHEETS.USERS, 'user_id', testFacultyId);
      this._assert(fac && (fac.status === 'Active'), 'Assigned faculty should be ACTIVE', results);
      
      // 6. Remove Registration -> Student should be Inactive
      ParticipantService.removeParticipant(testEventId, testStudentRoll, 'System');
      stu = DatabaseService.findOne(CONFIG.SHEETS.STUDENTS, 'roll_number', testStudentRoll);
      this._assert(stu && (stu.status === 'Inactive' || stu.student_status === 'Inactive'), 'Removed student should be INACTIVE', results);
      
      // 7. Remove Event -> Faculty should be Inactive (because refreshAllStatuses is called)
      EventService.deleteEvent(testEventId, 'System');
      fac = DatabaseService.findOne(CONFIG.SHEETS.USERS, 'user_id', testFacultyId);
      this._assert(fac && (fac.status === 'Inactive'), 'Faculty should be INACTIVE after event deletion', results);
      
    } catch(e) {
      results.failed++;
      results.errors.push('Exception during tests: ' + e);
    }
    
    // Clean up
    try {
      DatabaseService.deleteRow(CONFIG.SHEETS.STUDENTS, 'roll_number', testStudentRoll);
      DatabaseService.deleteRow(CONFIG.SHEETS.USERS, 'user_id', testFacultyId);
      DatabaseService.deleteRow(CONFIG.SHEETS.EVENTS, 'event_id', testEventId);
      DatabaseService.deleteRow(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'roll_number', testStudentRoll);
      DatabaseService.deleteRow(CONFIG.SHEETS.EVENT_ASSIGNMENTS, 'user_id', testFacultyId);
    } catch(e) {}
    
    Logger.log('=== TEST RESULTS ===');
    Logger.log('Passed: ' + results.passed);
    Logger.log('Failed: ' + results.failed);
    if (results.errors.length > 0) {
       Logger.log('Errors: \n' + results.errors.join('\n'));
    }
    return results;
  },
  
  _assert: function(condition, message, results) {
     if (condition) {
       Logger.log('[PASS] ' + message);
       results.passed++;
     } else {
       Logger.log('[FAIL] ' + message);
       results.failed++;
       results.errors.push(message);
     }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatusTesting;
}
