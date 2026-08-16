-- ==========================================
-- BVC SEED DATA: REMAINING TABLES
-- ==========================================

-- 1. DEPARTMENT HODS
INSERT INTO department_hods (id, department_id, user_id) VALUES
('HOD_1000', 'DEPT_CSE', 'USR_EVT_ADM_1000'),
('HOD_1001', 'DEPT_AIML', 'USR_EVT_ADM_1003'),
('HOD_1002', 'DEPT_ECE', 'USR_EVT_ADM_1006'),
('HOD_1003', 'DEPT_EEE', 'USR_EVT_ADM_1009'),
('HOD_1004', 'DEPT_MECH', 'USR_EVT_ADM_1012'),
('HOD_1005', 'DEPT_CIVIL', 'USR_EVT_ADM_1015'),
('HOD_1006', 'DEPT_FY', 'USR_EVT_ADM_1018');

-- 2. STUDENTS (Sample 10 Students in CSE Branch)
INSERT INTO students (student_id, roll_number, student_name, email, phone_number, department_id, branch_id, branch_code, current_year, section) VALUES
('STU_22B91A0501', '22B91A0501', 'Student CSE 1', 'student1@bvc.edu.in', '9000000001', 'DEPT_CSE', 'BR_CSE', 'CSE', 3, 'A'),
('STU_22B91A0502', '22B91A0502', 'Student CSE 2', 'student2@bvc.edu.in', '9000000002', 'DEPT_CSE', 'BR_CSE', 'CSE', 3, 'A'),
('STU_22B91A0503', '22B91A0503', 'Student CSE 3', 'student3@bvc.edu.in', '9000000003', 'DEPT_CSE', 'BR_CSE', 'CSE', 3, 'A'),
('STU_22B91A0504', '22B91A0504', 'Student CSE 4', 'student4@bvc.edu.in', '9000000004', 'DEPT_CSE', 'BR_CSE', 'CSE', 3, 'A'),
('STU_22B91A0505', '22B91A0505', 'Student CSE 5', 'student5@bvc.edu.in', '9000000005', 'DEPT_CSE', 'BR_CSE', 'CSE', 3, 'A'),
('STU_22B91A0506', '22B91A0506', 'Student CSE 6', 'student6@bvc.edu.in', '9000000006', 'DEPT_CSE', 'BR_CSE', 'CSE', 3, 'A'),
('STU_22B91A0507', '22B91A0507', 'Student CSE 7', 'student7@bvc.edu.in', '9000000007', 'DEPT_CSE', 'BR_CSE', 'CSE', 3, 'A'),
('STU_22B91A0508', '22B91A0508', 'Student CSE 8', 'student8@bvc.edu.in', '9000000008', 'DEPT_CSE', 'BR_CSE', 'CSE', 3, 'A'),
('STU_22B91A0509', '22B91A0509', 'Student CSE 9', 'student9@bvc.edu.in', '9000000009', 'DEPT_CSE', 'BR_CSE', 'CSE', 3, 'A'),
('STU_22B91A0510', '22B91A0510', 'Student CSE 10', 'student10@bvc.edu.in', '9000000010', 'DEPT_CSE', 'BR_CSE', 'CSE', 3, 'A');

-- 3. OTHER COLLEGE STUDENTS
INSERT INTO other_college_students (id, full_name, roll_number, email, phone_number, college_name, branch, year_of_study) VALUES
('EXT_1001', 'External Student 1', 'EXT001', 'ext1@gmail.com', '9999999901', 'JNTUK', 'CSE', '3rd Year'),
('EXT_1002', 'External Student 2', 'EXT002', 'ext2@gmail.com', '9999999902', 'Aditya', 'ECE', '2nd Year');

-- 4. EVENT TEMPLATES
INSERT INTO event_templates (template_id, template_name, default_config) VALUES
('TPL_1', 'Standard Guest Lecture', '{"attendance_type": "Fixed", "barcode_attendance": true}'),
('TPL_2', 'Tech Fest Open Registration', '{"attendance_type": "Open", "enable_registration": "Yes"}');

-- 5. EVENT PARTICIPANTS
INSERT INTO event_participants (participant_id, event_id, student_id, participant_type, registration_status) VALUES
('PART_22B91A0501', 'EVT_1000', 'STU_22B91A0501', 'Internal', 'Registered'),
('PART_22B91A0502', 'EVT_1000', 'STU_22B91A0502', 'Internal', 'Registered'),
('PART_22B91A0503', 'EVT_1000', 'STU_22B91A0503', 'Internal', 'Registered'),
('PART_22B91A0504', 'EVT_1000', 'STU_22B91A0504', 'Internal', 'Registered'),
('PART_22B91A0505', 'EVT_1000', 'STU_22B91A0505', 'Internal', 'Registered'),
('PART_22B91A0506', 'EVT_1000', 'STU_22B91A0506', 'Internal', 'Registered'),
('PART_22B91A0507', 'EVT_1000', 'STU_22B91A0507', 'Internal', 'Registered'),
('PART_22B91A0508', 'EVT_1000', 'STU_22B91A0508', 'Internal', 'Registered'),
('PART_22B91A0509', 'EVT_1000', 'STU_22B91A0509', 'Internal', 'Registered'),
('PART_22B91A0510', 'EVT_1000', 'STU_22B91A0510', 'Internal', 'Registered');

-- 6. ATTENDANCE (For EVT_1000)
INSERT INTO attendance (attendance_id, event_id, student_id, status, scan_mode, scanned_by) VALUES
('ATT_22B91A0501', 'EVT_1000', 'STU_22B91A0501', 'Present', 'Barcode', 'USR_EVT_ADM_1000'),
('ATT_22B91A0502', 'EVT_1000', 'STU_22B91A0502', 'Present', 'Barcode', 'USR_EVT_ADM_1000'),
('ATT_22B91A0503', 'EVT_1000', 'STU_22B91A0503', 'Present', 'Barcode', 'USR_EVT_ADM_1000'),
('ATT_22B91A0504', 'EVT_1000', 'STU_22B91A0504', 'Present', 'Barcode', 'USR_EVT_ADM_1000'),
('ATT_22B91A0505', 'EVT_1000', 'STU_22B91A0505', 'Present', 'Barcode', 'USR_EVT_ADM_1000'),
('ATT_22B91A0506', 'EVT_1000', 'STU_22B91A0506', 'Present', 'Barcode', 'USR_EVT_ADM_1000'),
('ATT_22B91A0507', 'EVT_1000', 'STU_22B91A0507', 'Present', 'Barcode', 'USR_EVT_ADM_1000'),
('ATT_22B91A0508', 'EVT_1000', 'STU_22B91A0508', 'Present', 'Barcode', 'USR_EVT_ADM_1000'),
('ATT_22B91A0509', 'EVT_1000', 'STU_22B91A0509', 'Present', 'Barcode', 'USR_EVT_ADM_1000'),
('ATT_22B91A0510', 'EVT_1000', 'STU_22B91A0510', 'Present', 'Barcode', 'USR_EVT_ADM_1000');

-- 7. ABSENT REASONS
INSERT INTO absent_reasons (reason_id, event_id, student_id, reason, status) VALUES
('ABS_1', 'EVT_1001', 'STU_22B91A0501', 'Medical Leave', 'Pending');

-- 8. ANNOUNCEMENTS
INSERT INTO announcements (announcement_id, title, content, target_audience, created_by) VALUES
('ANN_1', 'Welcome to BVC EMS', 'System is now live for all departments.', 'All', 'USER_SUPER_ADMIN'),
('ANN_2', 'CSE Tech Fest', 'Registrations are open for the symposium.', 'DEPT_CSE', 'USR_EVT_ADM_1000');

-- 9. FEEDBACK
INSERT INTO feedback (feedback_id, event_id, user_id, rating, comments) VALUES
('FB_1', 'EVT_1000', 'STU_22B91A0502', 5, 'Great event!');

-- 10. SYSTEM LOGS
INSERT INTO system_logs (log_id, user_id, action, module, description) VALUES
('LOG_1', 'USER_SUPER_ADMIN', 'Database Reset', 'System', 'Truncated tables and reseeded data');

