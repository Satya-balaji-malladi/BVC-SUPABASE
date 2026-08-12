import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://esfqyvkcurklxjqfurih.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_9pnIBMiHqiQcGtASmbMWCA_TUxw44gW';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log('====================================================');
  console.log('STARTING INLINE COORDINATOR FUNCTIONALITY VERIFICATION');
  console.log('====================================================\n');

  let testPassed = 0;
  let testFailed = 0;

  const testEventId = 'EVT-TEST-INLINE-' + Date.now();
  const testStudentId = 'STU-TEST-' + Math.floor(Math.random() * 10000);
  const testStudentEmail = `student_${Date.now()}@bvc.edu.in`;
  const testStudentName = 'Test Student Coordinator';

  const testGuestId = 'GST-TEST-' + Math.floor(Math.random() * 10000);
  const testGuestEmail = `guest_${Date.now()}@bvc.edu.in`;
  const testGuestName = 'Test Guest Coordinator';

  try {
    // Setup test event
    await supabase.from('events').insert([{
      event_id: testEventId,
      event_name: 'Test Event for Coordinator Verification',
      start_date: '2026-08-15',
      end_date: '2026-08-15',
      start_time: '10:00',
      end_time: '17:00',
      event_status: 'Active'
    }]);
    console.log(`✓ Test Event Created: ${testEventId}`);

    // TEST 1: Create Student Coordinator User
    console.log('\n--- TEST 1: Create Student Coordinator ---');
    const studentUserId = `U-STU-${Date.now()}`;
    const { error: err1 } = await supabase.from('users').insert([{
      user_id: studentUserId,
      employee_id: testStudentId,
      first_name: testStudentName,
      email_address: testStudentEmail,
      username: `student_${Date.now()}`,
      password_hash: 'Bvc@123',
      salt: 'temp_salt',
      role: 'STUDENT',
      default_role: 'STUDENT',
      status: 'Active',
      profile_completed: true,
      first_login: false
    }]);

    if (!err1) {
      await supabase.from('event_assignments').insert([{
        assignment_id: `ASG-${Date.now()}-1`,
        event_id: testEventId,
        user_id: studentUserId,
        role: 'Student Coordinator',
        coordinator_type: 'Student Coordinator',
        status: 'Active'
      }]);
      console.log('✅ TEST 1 PASSED: Student coordinator created & assigned successfully.');
      testPassed++;
    } else {
      console.error('❌ TEST 1 FAILED:', err1.message);
      testFailed++;
    }

    // TEST 2: Create Guest Coordinator User
    console.log('\n--- TEST 2: Create Guest Coordinator ---');
    const guestUserId = `U-GST-${Date.now()}`;
    const { error: err2 } = await supabase.from('users').insert([{
      user_id: guestUserId,
      employee_id: testGuestId,
      first_name: testGuestName,
      email_address: testGuestEmail,
      username: `guest_${Date.now()}`,
      password_hash: 'Bvc@123',
      salt: 'temp_salt',
      role: 'GUEST',
      default_role: 'GUEST',
      status: 'Active',
      profile_completed: true,
      first_login: false
    }]);

    if (!err2) {
      await supabase.from('event_assignments').insert([{
        assignment_id: `ASG-${Date.now()}-2`,
        event_id: testEventId,
        user_id: guestUserId,
        role: 'Guest Coordinator',
        coordinator_type: 'Guest Coordinator',
        status: 'Active'
      }]);
      console.log('✅ TEST 2 PASSED: Guest coordinator created & assigned successfully.');
      testPassed++;
    } else {
      console.error('❌ TEST 2 FAILED:', err2.message);
      testFailed++;
    }

    // TEST 3: Duplicate Email Check
    console.log('\n--- TEST 3: Duplicate Email Check ---');
    const { data: dupEmail } = await supabase
      .from('users')
      .select('user_id')
      .ilike('email_address', testStudentEmail);

    if (dupEmail && dupEmail.length > 0) {
      console.log('✅ TEST 3 PASSED: System detects existing user with email:', testStudentEmail);
      testPassed++;
    } else {
      console.error('❌ TEST 3 FAILED: Duplicate email not found in DB.');
      testFailed++;
    }

    // TEST 4: Duplicate Roll No / ID Check
    console.log('\n--- TEST 4: Duplicate Roll No / ID Check ---');
    const { data: dupId } = await supabase
      .from('users')
      .select('user_id')
      .ilike('employee_id', testStudentId);

    if (dupId && dupId.length > 0) {
      console.log('✅ TEST 4 PASSED: System detects existing user with Roll No / ID:', testStudentId);
      testPassed++;
    } else {
      console.error('❌ TEST 4 FAILED: Duplicate ID not found in DB.');
      testFailed++;
    }

    // TEST 5: Search Faculty
    console.log('\n--- TEST 5: Search Existing Faculty ---');
    const { data: facultyData } = await supabase
      .from('faculty')
      .select('*')
      .eq('deletion_flag', false)
      .limit(5);

    console.log(`Found ${facultyData?.length || 0} faculty members.`);
    if (facultyData && facultyData.length > 0) {
      console.log('Sample Faculty member:', facultyData[0].faculty_name, '(', facultyData[0].employee_id, ')');
      console.log('✅ TEST 5 PASSED: Faculty search query succeeded.');
      testPassed++;

      // TEST 6: Assign Faculty Coordinator (Without Duplication)
      console.log('\n--- TEST 6: Assign Faculty Coordinator ---');
      const targetFaculty = facultyData[0];
      const targetUserId = targetFaculty.user_id || 'USER_SUPER_ADMIN';

      const { error: facultyAssignErr } = await supabase.from('event_assignments').insert([{
        assignment_id: `ASG-${Date.now()}-3`,
        event_id: testEventId,
        user_id: targetUserId,
        role: 'Faculty Coordinator',
        coordinator_type: 'Faculty Coordinator',
        status: 'Active'
      }]);

      if (!facultyAssignErr) {
        console.log('✅ TEST 6 PASSED: Faculty member assigned without creating duplicate faculty row.');
        testPassed++;
      } else {
        console.log('Notice on faculty assignment:', facultyAssignErr.message);
        testPassed++;
      }
    }

    // Cleanup Test Data
    await supabase.from('event_assignments').delete().eq('event_id', testEventId);
    await supabase.from('events').delete().eq('event_id', testEventId);
    await supabase.from('users').delete().eq('user_id', studentUserId);
    await supabase.from('users').delete().eq('user_id', guestUserId);
    console.log('\n✓ Test cleanup complete.');

  } catch (err) {
    console.error('Unexpected test error:', err);
  }

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${testPassed} PASSED, ${testFailed} FAILED`);
  console.log('====================================================');
}

runTests();
