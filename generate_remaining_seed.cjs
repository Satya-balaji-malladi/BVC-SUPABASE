const fs = require('fs');

let sql = `-- ==========================================\n`;
sql += `-- BVC SEED DATA: REMAINING TABLES\n`;
sql += `-- ==========================================\n\n`;

// 1. DEPARTMENT HODS
// Assuming DEPT_CSE, DEPT_AIML, etc. and USR_EVT_ADM_1000, 1003 etc.
const depts = ['DEPT_CSE', 'DEPT_AIML', 'DEPT_ECE', 'DEPT_EEE', 'DEPT_MECH', 'DEPT_CIVIL', 'DEPT_FY'];
let hodIdCounter = 1000;
sql += `-- 1. DEPARTMENT HODS\n`;
sql += `INSERT INTO department_hods (id, department_id, user_id) VALUES\n`;
depts.forEach((dept, idx) => {
    // Just using a generic user ID pattern based on the previous script's generation
    // The previous script started admins at 1000, 1003, 1006...
    const adminUserId = `USR_EVT_ADM_${1000 + (idx * 3)}`; 
    sql += `('HOD_${hodIdCounter++}', '${dept}', '${adminUserId}')${idx === depts.length - 1 ? ';' : ','}\n`;
});
sql += `\n`;

// 2. STUDENTS
// Let's create 10 students for CSE Branch
sql += `-- 2. STUDENTS (Sample 10 Students in CSE Branch)\n`;
sql += `INSERT INTO students (student_id, roll_number, student_name, email, phone_number, department_id, branch_id, branch_code, current_year, section) VALUES\n`;
let students = [];
for(let i=1; i<=10; i++) {
    const roll = `22B91A05${i < 10 ? '0'+i : i}`;
    students.push(roll);
    sql += `('STU_${roll}', '${roll}', 'Student CSE ${i}', 'student${i}@bvc.edu.in', '90000000${i < 10 ? '0'+i : i}', 'DEPT_CSE', 'BR_CSE', 'CSE', 3, 'A')${i === 10 ? ';' : ','}\n`;
}
sql += `\n`;

// 3. OTHER COLLEGE STUDENTS
sql += `-- 3. OTHER COLLEGE STUDENTS\n`;
sql += `INSERT INTO other_college_students (id, full_name, roll_number, email, phone_number, college_name, branch, year_of_study) VALUES\n`;
sql += `('EXT_1001', 'External Student 1', 'EXT001', 'ext1@gmail.com', '9999999901', 'JNTUK', 'CSE', '3rd Year'),\n`;
sql += `('EXT_1002', 'External Student 2', 'EXT002', 'ext2@gmail.com', '9999999902', 'Aditya', 'ECE', '2nd Year');\n\n`;

// 4. EVENT TEMPLATES
sql += `-- 4. EVENT TEMPLATES\n`;
sql += `INSERT INTO event_templates (template_id, template_name, default_config) VALUES\n`;
sql += `('TPL_1', 'Standard Guest Lecture', '{"attendance_type": "Fixed", "barcode_attendance": true}'),\n`;
sql += `('TPL_2', 'Tech Fest Open Registration', '{"attendance_type": "Open", "enable_registration": "Yes"}');\n\n`;

// 5. EVENT PARTICIPANTS (For EVT_1000 - Open Event CSE)
sql += `-- 5. EVENT PARTICIPANTS\n`;
sql += `INSERT INTO event_participants (participant_id, event_id, student_id, participant_type, registration_status) VALUES\n`;
students.forEach((roll, idx) => {
    sql += `('PART_${roll}', 'EVT_1000', 'STU_${roll}', 'Internal', 'Registered')${idx === students.length - 1 ? ';' : ','}\n`;
});
sql += `\n`;

// 6. ATTENDANCE
sql += `-- 6. ATTENDANCE (For EVT_1000)\n`;
sql += `INSERT INTO attendance (attendance_id, event_id, student_id, status, scan_mode, scanned_by) VALUES\n`;
students.forEach((roll, idx) => {
    sql += `('ATT_${roll}', 'EVT_1000', 'STU_${roll}', 'Present', 'Barcode', 'USR_EVT_ADM_1000')${idx === students.length - 1 ? ';' : ','}\n`;
});
sql += `\n`;

// 7. ABSENT REASONS
sql += `-- 7. ABSENT REASONS\n`;
sql += `INSERT INTO absent_reasons (reason_id, event_id, student_id, reason, status) VALUES\n`;
sql += `('ABS_1', 'EVT_1001', 'STU_22B91A0501', 'Medical Leave', 'Pending');\n\n`;

// 8. ANNOUNCEMENTS
sql += `-- 8. ANNOUNCEMENTS\n`;
sql += `INSERT INTO announcements (announcement_id, title, content, target_audience, created_by) VALUES\n`;
sql += `('ANN_1', 'Welcome to BVC EMS', 'System is now live for all departments.', 'All', 'USER_SUPER_ADMIN'),\n`;
sql += `('ANN_2', 'CSE Tech Fest', 'Registrations are open for the symposium.', 'DEPT_CSE', 'USR_EVT_ADM_1000');\n\n`;

// 9. FEEDBACK
sql += `-- 9. FEEDBACK\n`;
sql += `INSERT INTO feedback (feedback_id, event_id, user_id, rating, comments) VALUES\n`;
sql += `('FB_1', 'EVT_1000', 'STU_22B91A0502', 5, 'Great event!');\n\n`;

// 10. SYSTEM LOGS
sql += `-- 10. SYSTEM LOGS\n`;
sql += `INSERT INTO system_logs (log_id, user_id, action, module, description) VALUES\n`;
sql += `('LOG_1', 'USER_SUPER_ADMIN', 'Database Reset', 'System', 'Truncated tables and reseeded data');\n\n`;

fs.writeFileSync('dummy_remaining_tables.sql', sql);
console.log('SQL File generated: dummy_remaining_tables.sql');
