-- ==========================================
-- BVC SEED DATA: FACULTY, ADMINS, EVENTS & COORDINATORS
-- ==========================================

-- ==========================================
-- DATA FOR DEPT_CSE
-- ==========================================

-- Inserting 3 Event Admins
INSERT INTO users (user_id, employee_id, first_name, last_name, email_address, username, password_hash, role, department, status) VALUES
('USR_EVT_ADM_1000', 'EMP_ADM_DEPT_CSE_1', 'Admin 1', 'DEPT_CSE', 'admin1.dept_cse@bvc.edu.in', 'admin1_dept_cse', 'dummyhash', 'Faculty', 'DEPT_CSE', 'Active'),
('USR_EVT_ADM_1001', 'EMP_ADM_DEPT_CSE_2', 'Admin 2', 'DEPT_CSE', 'admin2.dept_cse@bvc.edu.in', 'admin2_dept_cse', 'dummyhash', 'Faculty', 'DEPT_CSE', 'Active'),
('USR_EVT_ADM_1002', 'EMP_ADM_DEPT_CSE_3', 'Admin 3', 'DEPT_CSE', 'admin3.dept_cse@bvc.edu.in', 'admin3_dept_cse', 'dummyhash', 'Faculty', 'DEPT_CSE', 'Active');

-- Inserting 10 Faculty Members
INSERT INTO users (user_id, employee_id, first_name, last_name, email_address, username, password_hash, role, department, status) VALUES
('USR_FAC_1003', 'EMP_FAC_DEPT_CSE_1', 'Faculty 1', 'DEPT_CSE', 'faculty1.dept_cse@bvc.edu.in', 'faculty1_dept_cse', 'dummyhash', 'Faculty', 'DEPT_CSE', 'Active'),
('USR_FAC_1004', 'EMP_FAC_DEPT_CSE_2', 'Faculty 2', 'DEPT_CSE', 'faculty2.dept_cse@bvc.edu.in', 'faculty2_dept_cse', 'dummyhash', 'Faculty', 'DEPT_CSE', 'Active'),
('USR_FAC_1005', 'EMP_FAC_DEPT_CSE_3', 'Faculty 3', 'DEPT_CSE', 'faculty3.dept_cse@bvc.edu.in', 'faculty3_dept_cse', 'dummyhash', 'Faculty', 'DEPT_CSE', 'Active'),
('USR_FAC_1006', 'EMP_FAC_DEPT_CSE_4', 'Faculty 4', 'DEPT_CSE', 'faculty4.dept_cse@bvc.edu.in', 'faculty4_dept_cse', 'dummyhash', 'Faculty', 'DEPT_CSE', 'Active'),
('USR_FAC_1007', 'EMP_FAC_DEPT_CSE_5', 'Faculty 5', 'DEPT_CSE', 'faculty5.dept_cse@bvc.edu.in', 'faculty5_dept_cse', 'dummyhash', 'Faculty', 'DEPT_CSE', 'Active'),
('USR_FAC_1008', 'EMP_FAC_DEPT_CSE_6', 'Faculty 6', 'DEPT_CSE', 'faculty6.dept_cse@bvc.edu.in', 'faculty6_dept_cse', 'dummyhash', 'Faculty', 'DEPT_CSE', 'Active'),
('USR_FAC_1009', 'EMP_FAC_DEPT_CSE_7', 'Faculty 7', 'DEPT_CSE', 'faculty7.dept_cse@bvc.edu.in', 'faculty7_dept_cse', 'dummyhash', 'Faculty', 'DEPT_CSE', 'Active'),
('USR_FAC_1010', 'EMP_FAC_DEPT_CSE_8', 'Faculty 8', 'DEPT_CSE', 'faculty8.dept_cse@bvc.edu.in', 'faculty8_dept_cse', 'dummyhash', 'Faculty', 'DEPT_CSE', 'Active'),
('USR_FAC_1011', 'EMP_FAC_DEPT_CSE_9', 'Faculty 9', 'DEPT_CSE', 'faculty9.dept_cse@bvc.edu.in', 'faculty9_dept_cse', 'dummyhash', 'Faculty', 'DEPT_CSE', 'Active'),
('USR_FAC_1012', 'EMP_FAC_DEPT_CSE_10', 'Faculty 10', 'DEPT_CSE', 'faculty10.dept_cse@bvc.edu.in', 'faculty10_dept_cse', 'dummyhash', 'Faculty', 'DEPT_CSE', 'Active');

INSERT INTO faculty (faculty_id, employee_id, user_id, faculty_name, designation, department_id, email) VALUES
('FAC_1000', 'EMP_DEPT_CSE_101', 'USR_FAC_1003', 'Faculty 1 DEPT_CSE', 'Assistant Professor', 'DEPT_CSE', 'faculty1.dept_cse@bvc.edu.in'),
('FAC_1001', 'EMP_DEPT_CSE_102', 'USR_FAC_1004', 'Faculty 2 DEPT_CSE', 'Assistant Professor', 'DEPT_CSE', 'faculty2.dept_cse@bvc.edu.in'),
('FAC_1002', 'EMP_DEPT_CSE_103', 'USR_FAC_1005', 'Faculty 3 DEPT_CSE', 'Assistant Professor', 'DEPT_CSE', 'faculty3.dept_cse@bvc.edu.in'),
('FAC_1003', 'EMP_DEPT_CSE_104', 'USR_FAC_1006', 'Faculty 4 DEPT_CSE', 'Assistant Professor', 'DEPT_CSE', 'faculty4.dept_cse@bvc.edu.in'),
('FAC_1004', 'EMP_DEPT_CSE_105', 'USR_FAC_1007', 'Faculty 5 DEPT_CSE', 'Assistant Professor', 'DEPT_CSE', 'faculty5.dept_cse@bvc.edu.in'),
('FAC_1005', 'EMP_DEPT_CSE_106', 'USR_FAC_1008', 'Faculty 6 DEPT_CSE', 'Assistant Professor', 'DEPT_CSE', 'faculty6.dept_cse@bvc.edu.in'),
('FAC_1006', 'EMP_DEPT_CSE_107', 'USR_FAC_1009', 'Faculty 7 DEPT_CSE', 'Assistant Professor', 'DEPT_CSE', 'faculty7.dept_cse@bvc.edu.in'),
('FAC_1007', 'EMP_DEPT_CSE_108', 'USR_FAC_1010', 'Faculty 8 DEPT_CSE', 'Assistant Professor', 'DEPT_CSE', 'faculty8.dept_cse@bvc.edu.in'),
('FAC_1008', 'EMP_DEPT_CSE_109', 'USR_FAC_1011', 'Faculty 9 DEPT_CSE', 'Assistant Professor', 'DEPT_CSE', 'faculty9.dept_cse@bvc.edu.in'),
('FAC_1009', 'EMP_DEPT_CSE_110', 'USR_FAC_1012', 'Faculty 10 DEPT_CSE', 'Assistant Professor', 'DEPT_CSE', 'faculty10.dept_cse@bvc.edu.in');

-- Inserting 5 Events (Mix of Open, Fixed, 1-Day, Multi-Day, Registration Fields)
INSERT INTO events (event_id, event_name, description, location, organizer, start_date, end_date, start_time, end_time, attendance_type, enable_registration, registration_fields, departments, event_status, allowed_coordinator_ids) VALUES
('EVT_1000', 'DEPT_CSE Tech Symposium (Open, 1-Day)', 'Dummy description for DEPT_CSE Tech Symposium (Open, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1000', '2026-08-20', '2026-08-20', '09:00:00', '16:00:00', 'Open', 'No', '[]', 'DEPT_CSE', 'Published', '["USR_EVT_ADM_1000","USR_EVT_ADM_1001"]'),
('EVT_1001', 'DEPT_CSE Guest Lecture (Fixed, 1-Day)', 'Dummy description for DEPT_CSE Guest Lecture (Fixed, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1000', '2026-08-25', '2026-08-25', '09:00:00', '16:00:00', 'Fixed', 'No', '[]', 'DEPT_CSE', 'Published', '["USR_EVT_ADM_1000","USR_EVT_ADM_1001"]'),
('EVT_1002', 'DEPT_CSE Hackathon (Open, 3-Days)', 'Dummy description for DEPT_CSE Hackathon (Open, 3-Days)', 'Main Auditorium', 'USR_EVT_ADM_1000', '2026-08-30', '2026-09-01', '09:00:00', '16:00:00', 'Open', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_CSE', 'Published', '["USR_EVT_ADM_1000","USR_EVT_ADM_1001"]'),
('EVT_1003', 'DEPT_CSE Workshop (Fixed, 2-Days)', 'Dummy description for DEPT_CSE Workshop (Fixed, 2-Days)', 'Main Auditorium', 'USR_EVT_ADM_1000', '2026-09-04', '2026-09-05', '09:00:00', '16:00:00', 'Fixed', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_CSE', 'Published', '["USR_EVT_ADM_1000","USR_EVT_ADM_1001"]'),
('EVT_1004', 'DEPT_CSE Cultural Fest (Open, 1-Day)', 'Dummy description for DEPT_CSE Cultural Fest (Open, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1000', '2026-09-09', '2026-09-09', '09:00:00', '16:00:00', 'Open', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_CSE', 'Published', '["USR_EVT_ADM_1000","USR_EVT_ADM_1001"]');

-- Assigning 3 Coordinators for each event
INSERT INTO event_coordinators (assignment_id, event_id, user_id, assignment_role) VALUES
('ASG_1000', 'EVT_1000', 'USR_FAC_1003', 'Event Coordinator'),
('ASG_1001', 'EVT_1000', 'USR_FAC_1004', 'Event Coordinator'),
('ASG_1002', 'EVT_1000', 'USR_FAC_1005', 'Event Coordinator'),
('ASG_1003', 'EVT_1001', 'USR_FAC_1003', 'Event Coordinator'),
('ASG_1004', 'EVT_1001', 'USR_FAC_1004', 'Event Coordinator'),
('ASG_1005', 'EVT_1001', 'USR_FAC_1005', 'Event Coordinator'),
('ASG_1006', 'EVT_1002', 'USR_FAC_1003', 'Event Coordinator'),
('ASG_1007', 'EVT_1002', 'USR_FAC_1004', 'Event Coordinator'),
('ASG_1008', 'EVT_1002', 'USR_FAC_1005', 'Event Coordinator'),
('ASG_1009', 'EVT_1003', 'USR_FAC_1003', 'Event Coordinator'),
('ASG_1010', 'EVT_1003', 'USR_FAC_1004', 'Event Coordinator'),
('ASG_1011', 'EVT_1003', 'USR_FAC_1005', 'Event Coordinator'),
('ASG_1012', 'EVT_1004', 'USR_FAC_1003', 'Event Coordinator'),
('ASG_1013', 'EVT_1004', 'USR_FAC_1004', 'Event Coordinator'),
('ASG_1014', 'EVT_1004', 'USR_FAC_1005', 'Event Coordinator');

-- ==========================================
-- DATA FOR DEPT_AIML
-- ==========================================

-- Inserting 3 Event Admins
INSERT INTO users (user_id, employee_id, first_name, last_name, email_address, username, password_hash, role, department, status) VALUES
('USR_EVT_ADM_1013', 'EMP_ADM_DEPT_AIML_1', 'Admin 1', 'DEPT_AIML', 'admin1.dept_aiml@bvc.edu.in', 'admin1_dept_aiml', 'dummyhash', 'Faculty', 'DEPT_AIML', 'Active'),
('USR_EVT_ADM_1014', 'EMP_ADM_DEPT_AIML_2', 'Admin 2', 'DEPT_AIML', 'admin2.dept_aiml@bvc.edu.in', 'admin2_dept_aiml', 'dummyhash', 'Faculty', 'DEPT_AIML', 'Active'),
('USR_EVT_ADM_1015', 'EMP_ADM_DEPT_AIML_3', 'Admin 3', 'DEPT_AIML', 'admin3.dept_aiml@bvc.edu.in', 'admin3_dept_aiml', 'dummyhash', 'Faculty', 'DEPT_AIML', 'Active');

-- Inserting 10 Faculty Members
INSERT INTO users (user_id, employee_id, first_name, last_name, email_address, username, password_hash, role, department, status) VALUES
('USR_FAC_1016', 'EMP_FAC_DEPT_AIML_1', 'Faculty 1', 'DEPT_AIML', 'faculty1.dept_aiml@bvc.edu.in', 'faculty1_dept_aiml', 'dummyhash', 'Faculty', 'DEPT_AIML', 'Active'),
('USR_FAC_1017', 'EMP_FAC_DEPT_AIML_2', 'Faculty 2', 'DEPT_AIML', 'faculty2.dept_aiml@bvc.edu.in', 'faculty2_dept_aiml', 'dummyhash', 'Faculty', 'DEPT_AIML', 'Active'),
('USR_FAC_1018', 'EMP_FAC_DEPT_AIML_3', 'Faculty 3', 'DEPT_AIML', 'faculty3.dept_aiml@bvc.edu.in', 'faculty3_dept_aiml', 'dummyhash', 'Faculty', 'DEPT_AIML', 'Active'),
('USR_FAC_1019', 'EMP_FAC_DEPT_AIML_4', 'Faculty 4', 'DEPT_AIML', 'faculty4.dept_aiml@bvc.edu.in', 'faculty4_dept_aiml', 'dummyhash', 'Faculty', 'DEPT_AIML', 'Active'),
('USR_FAC_1020', 'EMP_FAC_DEPT_AIML_5', 'Faculty 5', 'DEPT_AIML', 'faculty5.dept_aiml@bvc.edu.in', 'faculty5_dept_aiml', 'dummyhash', 'Faculty', 'DEPT_AIML', 'Active'),
('USR_FAC_1021', 'EMP_FAC_DEPT_AIML_6', 'Faculty 6', 'DEPT_AIML', 'faculty6.dept_aiml@bvc.edu.in', 'faculty6_dept_aiml', 'dummyhash', 'Faculty', 'DEPT_AIML', 'Active'),
('USR_FAC_1022', 'EMP_FAC_DEPT_AIML_7', 'Faculty 7', 'DEPT_AIML', 'faculty7.dept_aiml@bvc.edu.in', 'faculty7_dept_aiml', 'dummyhash', 'Faculty', 'DEPT_AIML', 'Active'),
('USR_FAC_1023', 'EMP_FAC_DEPT_AIML_8', 'Faculty 8', 'DEPT_AIML', 'faculty8.dept_aiml@bvc.edu.in', 'faculty8_dept_aiml', 'dummyhash', 'Faculty', 'DEPT_AIML', 'Active'),
('USR_FAC_1024', 'EMP_FAC_DEPT_AIML_9', 'Faculty 9', 'DEPT_AIML', 'faculty9.dept_aiml@bvc.edu.in', 'faculty9_dept_aiml', 'dummyhash', 'Faculty', 'DEPT_AIML', 'Active'),
('USR_FAC_1025', 'EMP_FAC_DEPT_AIML_10', 'Faculty 10', 'DEPT_AIML', 'faculty10.dept_aiml@bvc.edu.in', 'faculty10_dept_aiml', 'dummyhash', 'Faculty', 'DEPT_AIML', 'Active');

INSERT INTO faculty (faculty_id, employee_id, user_id, faculty_name, designation, department_id, email) VALUES
('FAC_1010', 'EMP_DEPT_AIML_101', 'USR_FAC_1016', 'Faculty 1 DEPT_AIML', 'Assistant Professor', 'DEPT_AIML', 'faculty1.dept_aiml@bvc.edu.in'),
('FAC_1011', 'EMP_DEPT_AIML_102', 'USR_FAC_1017', 'Faculty 2 DEPT_AIML', 'Assistant Professor', 'DEPT_AIML', 'faculty2.dept_aiml@bvc.edu.in'),
('FAC_1012', 'EMP_DEPT_AIML_103', 'USR_FAC_1018', 'Faculty 3 DEPT_AIML', 'Assistant Professor', 'DEPT_AIML', 'faculty3.dept_aiml@bvc.edu.in'),
('FAC_1013', 'EMP_DEPT_AIML_104', 'USR_FAC_1019', 'Faculty 4 DEPT_AIML', 'Assistant Professor', 'DEPT_AIML', 'faculty4.dept_aiml@bvc.edu.in'),
('FAC_1014', 'EMP_DEPT_AIML_105', 'USR_FAC_1020', 'Faculty 5 DEPT_AIML', 'Assistant Professor', 'DEPT_AIML', 'faculty5.dept_aiml@bvc.edu.in'),
('FAC_1015', 'EMP_DEPT_AIML_106', 'USR_FAC_1021', 'Faculty 6 DEPT_AIML', 'Assistant Professor', 'DEPT_AIML', 'faculty6.dept_aiml@bvc.edu.in'),
('FAC_1016', 'EMP_DEPT_AIML_107', 'USR_FAC_1022', 'Faculty 7 DEPT_AIML', 'Assistant Professor', 'DEPT_AIML', 'faculty7.dept_aiml@bvc.edu.in'),
('FAC_1017', 'EMP_DEPT_AIML_108', 'USR_FAC_1023', 'Faculty 8 DEPT_AIML', 'Assistant Professor', 'DEPT_AIML', 'faculty8.dept_aiml@bvc.edu.in'),
('FAC_1018', 'EMP_DEPT_AIML_109', 'USR_FAC_1024', 'Faculty 9 DEPT_AIML', 'Assistant Professor', 'DEPT_AIML', 'faculty9.dept_aiml@bvc.edu.in'),
('FAC_1019', 'EMP_DEPT_AIML_110', 'USR_FAC_1025', 'Faculty 10 DEPT_AIML', 'Assistant Professor', 'DEPT_AIML', 'faculty10.dept_aiml@bvc.edu.in');

-- Inserting 5 Events (Mix of Open, Fixed, 1-Day, Multi-Day, Registration Fields)
INSERT INTO events (event_id, event_name, description, location, organizer, start_date, end_date, start_time, end_time, attendance_type, enable_registration, registration_fields, departments, event_status, allowed_coordinator_ids) VALUES
('EVT_1005', 'DEPT_AIML Tech Symposium (Open, 1-Day)', 'Dummy description for DEPT_AIML Tech Symposium (Open, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1013', '2026-08-20', '2026-08-20', '09:00:00', '16:00:00', 'Open', 'No', '[]', 'DEPT_AIML', 'Published', '["USR_EVT_ADM_1013","USR_EVT_ADM_1014"]'),
('EVT_1006', 'DEPT_AIML Guest Lecture (Fixed, 1-Day)', 'Dummy description for DEPT_AIML Guest Lecture (Fixed, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1013', '2026-08-25', '2026-08-25', '09:00:00', '16:00:00', 'Fixed', 'No', '[]', 'DEPT_AIML', 'Published', '["USR_EVT_ADM_1013","USR_EVT_ADM_1014"]'),
('EVT_1007', 'DEPT_AIML Hackathon (Open, 3-Days)', 'Dummy description for DEPT_AIML Hackathon (Open, 3-Days)', 'Main Auditorium', 'USR_EVT_ADM_1013', '2026-08-30', '2026-09-01', '09:00:00', '16:00:00', 'Open', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_AIML', 'Published', '["USR_EVT_ADM_1013","USR_EVT_ADM_1014"]'),
('EVT_1008', 'DEPT_AIML Workshop (Fixed, 2-Days)', 'Dummy description for DEPT_AIML Workshop (Fixed, 2-Days)', 'Main Auditorium', 'USR_EVT_ADM_1013', '2026-09-04', '2026-09-05', '09:00:00', '16:00:00', 'Fixed', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_AIML', 'Published', '["USR_EVT_ADM_1013","USR_EVT_ADM_1014"]'),
('EVT_1009', 'DEPT_AIML Cultural Fest (Open, 1-Day)', 'Dummy description for DEPT_AIML Cultural Fest (Open, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1013', '2026-09-09', '2026-09-09', '09:00:00', '16:00:00', 'Open', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_AIML', 'Published', '["USR_EVT_ADM_1013","USR_EVT_ADM_1014"]');

-- Assigning 3 Coordinators for each event
INSERT INTO event_coordinators (assignment_id, event_id, user_id, assignment_role) VALUES
('ASG_1015', 'EVT_1005', 'USR_FAC_1016', 'Event Coordinator'),
('ASG_1016', 'EVT_1005', 'USR_FAC_1017', 'Event Coordinator'),
('ASG_1017', 'EVT_1005', 'USR_FAC_1018', 'Event Coordinator'),
('ASG_1018', 'EVT_1006', 'USR_FAC_1016', 'Event Coordinator'),
('ASG_1019', 'EVT_1006', 'USR_FAC_1017', 'Event Coordinator'),
('ASG_1020', 'EVT_1006', 'USR_FAC_1018', 'Event Coordinator'),
('ASG_1021', 'EVT_1007', 'USR_FAC_1016', 'Event Coordinator'),
('ASG_1022', 'EVT_1007', 'USR_FAC_1017', 'Event Coordinator'),
('ASG_1023', 'EVT_1007', 'USR_FAC_1018', 'Event Coordinator'),
('ASG_1024', 'EVT_1008', 'USR_FAC_1016', 'Event Coordinator'),
('ASG_1025', 'EVT_1008', 'USR_FAC_1017', 'Event Coordinator'),
('ASG_1026', 'EVT_1008', 'USR_FAC_1018', 'Event Coordinator'),
('ASG_1027', 'EVT_1009', 'USR_FAC_1016', 'Event Coordinator'),
('ASG_1028', 'EVT_1009', 'USR_FAC_1017', 'Event Coordinator'),
('ASG_1029', 'EVT_1009', 'USR_FAC_1018', 'Event Coordinator');

-- ==========================================
-- DATA FOR DEPT_ECE
-- ==========================================

-- Inserting 3 Event Admins
INSERT INTO users (user_id, employee_id, first_name, last_name, email_address, username, password_hash, role, department, status) VALUES
('USR_EVT_ADM_1026', 'EMP_ADM_DEPT_ECE_1', 'Admin 1', 'DEPT_ECE', 'admin1.dept_ece@bvc.edu.in', 'admin1_dept_ece', 'dummyhash', 'Faculty', 'DEPT_ECE', 'Active'),
('USR_EVT_ADM_1027', 'EMP_ADM_DEPT_ECE_2', 'Admin 2', 'DEPT_ECE', 'admin2.dept_ece@bvc.edu.in', 'admin2_dept_ece', 'dummyhash', 'Faculty', 'DEPT_ECE', 'Active'),
('USR_EVT_ADM_1028', 'EMP_ADM_DEPT_ECE_3', 'Admin 3', 'DEPT_ECE', 'admin3.dept_ece@bvc.edu.in', 'admin3_dept_ece', 'dummyhash', 'Faculty', 'DEPT_ECE', 'Active');

-- Inserting 10 Faculty Members
INSERT INTO users (user_id, employee_id, first_name, last_name, email_address, username, password_hash, role, department, status) VALUES
('USR_FAC_1029', 'EMP_FAC_DEPT_ECE_1', 'Faculty 1', 'DEPT_ECE', 'faculty1.dept_ece@bvc.edu.in', 'faculty1_dept_ece', 'dummyhash', 'Faculty', 'DEPT_ECE', 'Active'),
('USR_FAC_1030', 'EMP_FAC_DEPT_ECE_2', 'Faculty 2', 'DEPT_ECE', 'faculty2.dept_ece@bvc.edu.in', 'faculty2_dept_ece', 'dummyhash', 'Faculty', 'DEPT_ECE', 'Active'),
('USR_FAC_1031', 'EMP_FAC_DEPT_ECE_3', 'Faculty 3', 'DEPT_ECE', 'faculty3.dept_ece@bvc.edu.in', 'faculty3_dept_ece', 'dummyhash', 'Faculty', 'DEPT_ECE', 'Active'),
('USR_FAC_1032', 'EMP_FAC_DEPT_ECE_4', 'Faculty 4', 'DEPT_ECE', 'faculty4.dept_ece@bvc.edu.in', 'faculty4_dept_ece', 'dummyhash', 'Faculty', 'DEPT_ECE', 'Active'),
('USR_FAC_1033', 'EMP_FAC_DEPT_ECE_5', 'Faculty 5', 'DEPT_ECE', 'faculty5.dept_ece@bvc.edu.in', 'faculty5_dept_ece', 'dummyhash', 'Faculty', 'DEPT_ECE', 'Active'),
('USR_FAC_1034', 'EMP_FAC_DEPT_ECE_6', 'Faculty 6', 'DEPT_ECE', 'faculty6.dept_ece@bvc.edu.in', 'faculty6_dept_ece', 'dummyhash', 'Faculty', 'DEPT_ECE', 'Active'),
('USR_FAC_1035', 'EMP_FAC_DEPT_ECE_7', 'Faculty 7', 'DEPT_ECE', 'faculty7.dept_ece@bvc.edu.in', 'faculty7_dept_ece', 'dummyhash', 'Faculty', 'DEPT_ECE', 'Active'),
('USR_FAC_1036', 'EMP_FAC_DEPT_ECE_8', 'Faculty 8', 'DEPT_ECE', 'faculty8.dept_ece@bvc.edu.in', 'faculty8_dept_ece', 'dummyhash', 'Faculty', 'DEPT_ECE', 'Active'),
('USR_FAC_1037', 'EMP_FAC_DEPT_ECE_9', 'Faculty 9', 'DEPT_ECE', 'faculty9.dept_ece@bvc.edu.in', 'faculty9_dept_ece', 'dummyhash', 'Faculty', 'DEPT_ECE', 'Active'),
('USR_FAC_1038', 'EMP_FAC_DEPT_ECE_10', 'Faculty 10', 'DEPT_ECE', 'faculty10.dept_ece@bvc.edu.in', 'faculty10_dept_ece', 'dummyhash', 'Faculty', 'DEPT_ECE', 'Active');

INSERT INTO faculty (faculty_id, employee_id, user_id, faculty_name, designation, department_id, email) VALUES
('FAC_1020', 'EMP_DEPT_ECE_101', 'USR_FAC_1029', 'Faculty 1 DEPT_ECE', 'Assistant Professor', 'DEPT_ECE', 'faculty1.dept_ece@bvc.edu.in'),
('FAC_1021', 'EMP_DEPT_ECE_102', 'USR_FAC_1030', 'Faculty 2 DEPT_ECE', 'Assistant Professor', 'DEPT_ECE', 'faculty2.dept_ece@bvc.edu.in'),
('FAC_1022', 'EMP_DEPT_ECE_103', 'USR_FAC_1031', 'Faculty 3 DEPT_ECE', 'Assistant Professor', 'DEPT_ECE', 'faculty3.dept_ece@bvc.edu.in'),
('FAC_1023', 'EMP_DEPT_ECE_104', 'USR_FAC_1032', 'Faculty 4 DEPT_ECE', 'Assistant Professor', 'DEPT_ECE', 'faculty4.dept_ece@bvc.edu.in'),
('FAC_1024', 'EMP_DEPT_ECE_105', 'USR_FAC_1033', 'Faculty 5 DEPT_ECE', 'Assistant Professor', 'DEPT_ECE', 'faculty5.dept_ece@bvc.edu.in'),
('FAC_1025', 'EMP_DEPT_ECE_106', 'USR_FAC_1034', 'Faculty 6 DEPT_ECE', 'Assistant Professor', 'DEPT_ECE', 'faculty6.dept_ece@bvc.edu.in'),
('FAC_1026', 'EMP_DEPT_ECE_107', 'USR_FAC_1035', 'Faculty 7 DEPT_ECE', 'Assistant Professor', 'DEPT_ECE', 'faculty7.dept_ece@bvc.edu.in'),
('FAC_1027', 'EMP_DEPT_ECE_108', 'USR_FAC_1036', 'Faculty 8 DEPT_ECE', 'Assistant Professor', 'DEPT_ECE', 'faculty8.dept_ece@bvc.edu.in'),
('FAC_1028', 'EMP_DEPT_ECE_109', 'USR_FAC_1037', 'Faculty 9 DEPT_ECE', 'Assistant Professor', 'DEPT_ECE', 'faculty9.dept_ece@bvc.edu.in'),
('FAC_1029', 'EMP_DEPT_ECE_110', 'USR_FAC_1038', 'Faculty 10 DEPT_ECE', 'Assistant Professor', 'DEPT_ECE', 'faculty10.dept_ece@bvc.edu.in');

-- Inserting 5 Events (Mix of Open, Fixed, 1-Day, Multi-Day, Registration Fields)
INSERT INTO events (event_id, event_name, description, location, organizer, start_date, end_date, start_time, end_time, attendance_type, enable_registration, registration_fields, departments, event_status, allowed_coordinator_ids) VALUES
('EVT_1010', 'DEPT_ECE Tech Symposium (Open, 1-Day)', 'Dummy description for DEPT_ECE Tech Symposium (Open, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1026', '2026-08-20', '2026-08-20', '09:00:00', '16:00:00', 'Open', 'No', '[]', 'DEPT_ECE', 'Published', '["USR_EVT_ADM_1026","USR_EVT_ADM_1027"]'),
('EVT_1011', 'DEPT_ECE Guest Lecture (Fixed, 1-Day)', 'Dummy description for DEPT_ECE Guest Lecture (Fixed, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1026', '2026-08-25', '2026-08-25', '09:00:00', '16:00:00', 'Fixed', 'No', '[]', 'DEPT_ECE', 'Published', '["USR_EVT_ADM_1026","USR_EVT_ADM_1027"]'),
('EVT_1012', 'DEPT_ECE Hackathon (Open, 3-Days)', 'Dummy description for DEPT_ECE Hackathon (Open, 3-Days)', 'Main Auditorium', 'USR_EVT_ADM_1026', '2026-08-30', '2026-09-01', '09:00:00', '16:00:00', 'Open', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_ECE', 'Published', '["USR_EVT_ADM_1026","USR_EVT_ADM_1027"]'),
('EVT_1013', 'DEPT_ECE Workshop (Fixed, 2-Days)', 'Dummy description for DEPT_ECE Workshop (Fixed, 2-Days)', 'Main Auditorium', 'USR_EVT_ADM_1026', '2026-09-04', '2026-09-05', '09:00:00', '16:00:00', 'Fixed', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_ECE', 'Published', '["USR_EVT_ADM_1026","USR_EVT_ADM_1027"]'),
('EVT_1014', 'DEPT_ECE Cultural Fest (Open, 1-Day)', 'Dummy description for DEPT_ECE Cultural Fest (Open, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1026', '2026-09-09', '2026-09-09', '09:00:00', '16:00:00', 'Open', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_ECE', 'Published', '["USR_EVT_ADM_1026","USR_EVT_ADM_1027"]');

-- Assigning 3 Coordinators for each event
INSERT INTO event_coordinators (assignment_id, event_id, user_id, assignment_role) VALUES
('ASG_1030', 'EVT_1010', 'USR_FAC_1029', 'Event Coordinator'),
('ASG_1031', 'EVT_1010', 'USR_FAC_1030', 'Event Coordinator'),
('ASG_1032', 'EVT_1010', 'USR_FAC_1031', 'Event Coordinator'),
('ASG_1033', 'EVT_1011', 'USR_FAC_1029', 'Event Coordinator'),
('ASG_1034', 'EVT_1011', 'USR_FAC_1030', 'Event Coordinator'),
('ASG_1035', 'EVT_1011', 'USR_FAC_1031', 'Event Coordinator'),
('ASG_1036', 'EVT_1012', 'USR_FAC_1029', 'Event Coordinator'),
('ASG_1037', 'EVT_1012', 'USR_FAC_1030', 'Event Coordinator'),
('ASG_1038', 'EVT_1012', 'USR_FAC_1031', 'Event Coordinator'),
('ASG_1039', 'EVT_1013', 'USR_FAC_1029', 'Event Coordinator'),
('ASG_1040', 'EVT_1013', 'USR_FAC_1030', 'Event Coordinator'),
('ASG_1041', 'EVT_1013', 'USR_FAC_1031', 'Event Coordinator'),
('ASG_1042', 'EVT_1014', 'USR_FAC_1029', 'Event Coordinator'),
('ASG_1043', 'EVT_1014', 'USR_FAC_1030', 'Event Coordinator'),
('ASG_1044', 'EVT_1014', 'USR_FAC_1031', 'Event Coordinator');

-- ==========================================
-- DATA FOR DEPT_EEE
-- ==========================================

-- Inserting 3 Event Admins
INSERT INTO users (user_id, employee_id, first_name, last_name, email_address, username, password_hash, role, department, status) VALUES
('USR_EVT_ADM_1039', 'EMP_ADM_DEPT_EEE_1', 'Admin 1', 'DEPT_EEE', 'admin1.dept_eee@bvc.edu.in', 'admin1_dept_eee', 'dummyhash', 'Faculty', 'DEPT_EEE', 'Active'),
('USR_EVT_ADM_1040', 'EMP_ADM_DEPT_EEE_2', 'Admin 2', 'DEPT_EEE', 'admin2.dept_eee@bvc.edu.in', 'admin2_dept_eee', 'dummyhash', 'Faculty', 'DEPT_EEE', 'Active'),
('USR_EVT_ADM_1041', 'EMP_ADM_DEPT_EEE_3', 'Admin 3', 'DEPT_EEE', 'admin3.dept_eee@bvc.edu.in', 'admin3_dept_eee', 'dummyhash', 'Faculty', 'DEPT_EEE', 'Active');

-- Inserting 10 Faculty Members
INSERT INTO users (user_id, employee_id, first_name, last_name, email_address, username, password_hash, role, department, status) VALUES
('USR_FAC_1042', 'EMP_FAC_DEPT_EEE_1', 'Faculty 1', 'DEPT_EEE', 'faculty1.dept_eee@bvc.edu.in', 'faculty1_dept_eee', 'dummyhash', 'Faculty', 'DEPT_EEE', 'Active'),
('USR_FAC_1043', 'EMP_FAC_DEPT_EEE_2', 'Faculty 2', 'DEPT_EEE', 'faculty2.dept_eee@bvc.edu.in', 'faculty2_dept_eee', 'dummyhash', 'Faculty', 'DEPT_EEE', 'Active'),
('USR_FAC_1044', 'EMP_FAC_DEPT_EEE_3', 'Faculty 3', 'DEPT_EEE', 'faculty3.dept_eee@bvc.edu.in', 'faculty3_dept_eee', 'dummyhash', 'Faculty', 'DEPT_EEE', 'Active'),
('USR_FAC_1045', 'EMP_FAC_DEPT_EEE_4', 'Faculty 4', 'DEPT_EEE', 'faculty4.dept_eee@bvc.edu.in', 'faculty4_dept_eee', 'dummyhash', 'Faculty', 'DEPT_EEE', 'Active'),
('USR_FAC_1046', 'EMP_FAC_DEPT_EEE_5', 'Faculty 5', 'DEPT_EEE', 'faculty5.dept_eee@bvc.edu.in', 'faculty5_dept_eee', 'dummyhash', 'Faculty', 'DEPT_EEE', 'Active'),
('USR_FAC_1047', 'EMP_FAC_DEPT_EEE_6', 'Faculty 6', 'DEPT_EEE', 'faculty6.dept_eee@bvc.edu.in', 'faculty6_dept_eee', 'dummyhash', 'Faculty', 'DEPT_EEE', 'Active'),
('USR_FAC_1048', 'EMP_FAC_DEPT_EEE_7', 'Faculty 7', 'DEPT_EEE', 'faculty7.dept_eee@bvc.edu.in', 'faculty7_dept_eee', 'dummyhash', 'Faculty', 'DEPT_EEE', 'Active'),
('USR_FAC_1049', 'EMP_FAC_DEPT_EEE_8', 'Faculty 8', 'DEPT_EEE', 'faculty8.dept_eee@bvc.edu.in', 'faculty8_dept_eee', 'dummyhash', 'Faculty', 'DEPT_EEE', 'Active'),
('USR_FAC_1050', 'EMP_FAC_DEPT_EEE_9', 'Faculty 9', 'DEPT_EEE', 'faculty9.dept_eee@bvc.edu.in', 'faculty9_dept_eee', 'dummyhash', 'Faculty', 'DEPT_EEE', 'Active'),
('USR_FAC_1051', 'EMP_FAC_DEPT_EEE_10', 'Faculty 10', 'DEPT_EEE', 'faculty10.dept_eee@bvc.edu.in', 'faculty10_dept_eee', 'dummyhash', 'Faculty', 'DEPT_EEE', 'Active');

INSERT INTO faculty (faculty_id, employee_id, user_id, faculty_name, designation, department_id, email) VALUES
('FAC_1030', 'EMP_DEPT_EEE_101', 'USR_FAC_1042', 'Faculty 1 DEPT_EEE', 'Assistant Professor', 'DEPT_EEE', 'faculty1.dept_eee@bvc.edu.in'),
('FAC_1031', 'EMP_DEPT_EEE_102', 'USR_FAC_1043', 'Faculty 2 DEPT_EEE', 'Assistant Professor', 'DEPT_EEE', 'faculty2.dept_eee@bvc.edu.in'),
('FAC_1032', 'EMP_DEPT_EEE_103', 'USR_FAC_1044', 'Faculty 3 DEPT_EEE', 'Assistant Professor', 'DEPT_EEE', 'faculty3.dept_eee@bvc.edu.in'),
('FAC_1033', 'EMP_DEPT_EEE_104', 'USR_FAC_1045', 'Faculty 4 DEPT_EEE', 'Assistant Professor', 'DEPT_EEE', 'faculty4.dept_eee@bvc.edu.in'),
('FAC_1034', 'EMP_DEPT_EEE_105', 'USR_FAC_1046', 'Faculty 5 DEPT_EEE', 'Assistant Professor', 'DEPT_EEE', 'faculty5.dept_eee@bvc.edu.in'),
('FAC_1035', 'EMP_DEPT_EEE_106', 'USR_FAC_1047', 'Faculty 6 DEPT_EEE', 'Assistant Professor', 'DEPT_EEE', 'faculty6.dept_eee@bvc.edu.in'),
('FAC_1036', 'EMP_DEPT_EEE_107', 'USR_FAC_1048', 'Faculty 7 DEPT_EEE', 'Assistant Professor', 'DEPT_EEE', 'faculty7.dept_eee@bvc.edu.in'),
('FAC_1037', 'EMP_DEPT_EEE_108', 'USR_FAC_1049', 'Faculty 8 DEPT_EEE', 'Assistant Professor', 'DEPT_EEE', 'faculty8.dept_eee@bvc.edu.in'),
('FAC_1038', 'EMP_DEPT_EEE_109', 'USR_FAC_1050', 'Faculty 9 DEPT_EEE', 'Assistant Professor', 'DEPT_EEE', 'faculty9.dept_eee@bvc.edu.in'),
('FAC_1039', 'EMP_DEPT_EEE_110', 'USR_FAC_1051', 'Faculty 10 DEPT_EEE', 'Assistant Professor', 'DEPT_EEE', 'faculty10.dept_eee@bvc.edu.in');

-- Inserting 5 Events (Mix of Open, Fixed, 1-Day, Multi-Day, Registration Fields)
INSERT INTO events (event_id, event_name, description, location, organizer, start_date, end_date, start_time, end_time, attendance_type, enable_registration, registration_fields, departments, event_status, allowed_coordinator_ids) VALUES
('EVT_1015', 'DEPT_EEE Tech Symposium (Open, 1-Day)', 'Dummy description for DEPT_EEE Tech Symposium (Open, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1039', '2026-08-20', '2026-08-20', '09:00:00', '16:00:00', 'Open', 'No', '[]', 'DEPT_EEE', 'Published', '["USR_EVT_ADM_1039","USR_EVT_ADM_1040"]'),
('EVT_1016', 'DEPT_EEE Guest Lecture (Fixed, 1-Day)', 'Dummy description for DEPT_EEE Guest Lecture (Fixed, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1039', '2026-08-25', '2026-08-25', '09:00:00', '16:00:00', 'Fixed', 'No', '[]', 'DEPT_EEE', 'Published', '["USR_EVT_ADM_1039","USR_EVT_ADM_1040"]'),
('EVT_1017', 'DEPT_EEE Hackathon (Open, 3-Days)', 'Dummy description for DEPT_EEE Hackathon (Open, 3-Days)', 'Main Auditorium', 'USR_EVT_ADM_1039', '2026-08-30', '2026-09-01', '09:00:00', '16:00:00', 'Open', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_EEE', 'Published', '["USR_EVT_ADM_1039","USR_EVT_ADM_1040"]'),
('EVT_1018', 'DEPT_EEE Workshop (Fixed, 2-Days)', 'Dummy description for DEPT_EEE Workshop (Fixed, 2-Days)', 'Main Auditorium', 'USR_EVT_ADM_1039', '2026-09-04', '2026-09-05', '09:00:00', '16:00:00', 'Fixed', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_EEE', 'Published', '["USR_EVT_ADM_1039","USR_EVT_ADM_1040"]'),
('EVT_1019', 'DEPT_EEE Cultural Fest (Open, 1-Day)', 'Dummy description for DEPT_EEE Cultural Fest (Open, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1039', '2026-09-09', '2026-09-09', '09:00:00', '16:00:00', 'Open', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_EEE', 'Published', '["USR_EVT_ADM_1039","USR_EVT_ADM_1040"]');

-- Assigning 3 Coordinators for each event
INSERT INTO event_coordinators (assignment_id, event_id, user_id, assignment_role) VALUES
('ASG_1045', 'EVT_1015', 'USR_FAC_1042', 'Event Coordinator'),
('ASG_1046', 'EVT_1015', 'USR_FAC_1043', 'Event Coordinator'),
('ASG_1047', 'EVT_1015', 'USR_FAC_1044', 'Event Coordinator'),
('ASG_1048', 'EVT_1016', 'USR_FAC_1042', 'Event Coordinator'),
('ASG_1049', 'EVT_1016', 'USR_FAC_1043', 'Event Coordinator'),
('ASG_1050', 'EVT_1016', 'USR_FAC_1044', 'Event Coordinator'),
('ASG_1051', 'EVT_1017', 'USR_FAC_1042', 'Event Coordinator'),
('ASG_1052', 'EVT_1017', 'USR_FAC_1043', 'Event Coordinator'),
('ASG_1053', 'EVT_1017', 'USR_FAC_1044', 'Event Coordinator'),
('ASG_1054', 'EVT_1018', 'USR_FAC_1042', 'Event Coordinator'),
('ASG_1055', 'EVT_1018', 'USR_FAC_1043', 'Event Coordinator'),
('ASG_1056', 'EVT_1018', 'USR_FAC_1044', 'Event Coordinator'),
('ASG_1057', 'EVT_1019', 'USR_FAC_1042', 'Event Coordinator'),
('ASG_1058', 'EVT_1019', 'USR_FAC_1043', 'Event Coordinator'),
('ASG_1059', 'EVT_1019', 'USR_FAC_1044', 'Event Coordinator');

-- ==========================================
-- DATA FOR DEPT_MECH
-- ==========================================

-- Inserting 3 Event Admins
INSERT INTO users (user_id, employee_id, first_name, last_name, email_address, username, password_hash, role, department, status) VALUES
('USR_EVT_ADM_1052', 'EMP_ADM_DEPT_MECH_1', 'Admin 1', 'DEPT_MECH', 'admin1.dept_mech@bvc.edu.in', 'admin1_dept_mech', 'dummyhash', 'Faculty', 'DEPT_MECH', 'Active'),
('USR_EVT_ADM_1053', 'EMP_ADM_DEPT_MECH_2', 'Admin 2', 'DEPT_MECH', 'admin2.dept_mech@bvc.edu.in', 'admin2_dept_mech', 'dummyhash', 'Faculty', 'DEPT_MECH', 'Active'),
('USR_EVT_ADM_1054', 'EMP_ADM_DEPT_MECH_3', 'Admin 3', 'DEPT_MECH', 'admin3.dept_mech@bvc.edu.in', 'admin3_dept_mech', 'dummyhash', 'Faculty', 'DEPT_MECH', 'Active');

-- Inserting 10 Faculty Members
INSERT INTO users (user_id, employee_id, first_name, last_name, email_address, username, password_hash, role, department, status) VALUES
('USR_FAC_1055', 'EMP_FAC_DEPT_MECH_1', 'Faculty 1', 'DEPT_MECH', 'faculty1.dept_mech@bvc.edu.in', 'faculty1_dept_mech', 'dummyhash', 'Faculty', 'DEPT_MECH', 'Active'),
('USR_FAC_1056', 'EMP_FAC_DEPT_MECH_2', 'Faculty 2', 'DEPT_MECH', 'faculty2.dept_mech@bvc.edu.in', 'faculty2_dept_mech', 'dummyhash', 'Faculty', 'DEPT_MECH', 'Active'),
('USR_FAC_1057', 'EMP_FAC_DEPT_MECH_3', 'Faculty 3', 'DEPT_MECH', 'faculty3.dept_mech@bvc.edu.in', 'faculty3_dept_mech', 'dummyhash', 'Faculty', 'DEPT_MECH', 'Active'),
('USR_FAC_1058', 'EMP_FAC_DEPT_MECH_4', 'Faculty 4', 'DEPT_MECH', 'faculty4.dept_mech@bvc.edu.in', 'faculty4_dept_mech', 'dummyhash', 'Faculty', 'DEPT_MECH', 'Active'),
('USR_FAC_1059', 'EMP_FAC_DEPT_MECH_5', 'Faculty 5', 'DEPT_MECH', 'faculty5.dept_mech@bvc.edu.in', 'faculty5_dept_mech', 'dummyhash', 'Faculty', 'DEPT_MECH', 'Active'),
('USR_FAC_1060', 'EMP_FAC_DEPT_MECH_6', 'Faculty 6', 'DEPT_MECH', 'faculty6.dept_mech@bvc.edu.in', 'faculty6_dept_mech', 'dummyhash', 'Faculty', 'DEPT_MECH', 'Active'),
('USR_FAC_1061', 'EMP_FAC_DEPT_MECH_7', 'Faculty 7', 'DEPT_MECH', 'faculty7.dept_mech@bvc.edu.in', 'faculty7_dept_mech', 'dummyhash', 'Faculty', 'DEPT_MECH', 'Active'),
('USR_FAC_1062', 'EMP_FAC_DEPT_MECH_8', 'Faculty 8', 'DEPT_MECH', 'faculty8.dept_mech@bvc.edu.in', 'faculty8_dept_mech', 'dummyhash', 'Faculty', 'DEPT_MECH', 'Active'),
('USR_FAC_1063', 'EMP_FAC_DEPT_MECH_9', 'Faculty 9', 'DEPT_MECH', 'faculty9.dept_mech@bvc.edu.in', 'faculty9_dept_mech', 'dummyhash', 'Faculty', 'DEPT_MECH', 'Active'),
('USR_FAC_1064', 'EMP_FAC_DEPT_MECH_10', 'Faculty 10', 'DEPT_MECH', 'faculty10.dept_mech@bvc.edu.in', 'faculty10_dept_mech', 'dummyhash', 'Faculty', 'DEPT_MECH', 'Active');

INSERT INTO faculty (faculty_id, employee_id, user_id, faculty_name, designation, department_id, email) VALUES
('FAC_1040', 'EMP_DEPT_MECH_101', 'USR_FAC_1055', 'Faculty 1 DEPT_MECH', 'Assistant Professor', 'DEPT_MECH', 'faculty1.dept_mech@bvc.edu.in'),
('FAC_1041', 'EMP_DEPT_MECH_102', 'USR_FAC_1056', 'Faculty 2 DEPT_MECH', 'Assistant Professor', 'DEPT_MECH', 'faculty2.dept_mech@bvc.edu.in'),
('FAC_1042', 'EMP_DEPT_MECH_103', 'USR_FAC_1057', 'Faculty 3 DEPT_MECH', 'Assistant Professor', 'DEPT_MECH', 'faculty3.dept_mech@bvc.edu.in'),
('FAC_1043', 'EMP_DEPT_MECH_104', 'USR_FAC_1058', 'Faculty 4 DEPT_MECH', 'Assistant Professor', 'DEPT_MECH', 'faculty4.dept_mech@bvc.edu.in'),
('FAC_1044', 'EMP_DEPT_MECH_105', 'USR_FAC_1059', 'Faculty 5 DEPT_MECH', 'Assistant Professor', 'DEPT_MECH', 'faculty5.dept_mech@bvc.edu.in'),
('FAC_1045', 'EMP_DEPT_MECH_106', 'USR_FAC_1060', 'Faculty 6 DEPT_MECH', 'Assistant Professor', 'DEPT_MECH', 'faculty6.dept_mech@bvc.edu.in'),
('FAC_1046', 'EMP_DEPT_MECH_107', 'USR_FAC_1061', 'Faculty 7 DEPT_MECH', 'Assistant Professor', 'DEPT_MECH', 'faculty7.dept_mech@bvc.edu.in'),
('FAC_1047', 'EMP_DEPT_MECH_108', 'USR_FAC_1062', 'Faculty 8 DEPT_MECH', 'Assistant Professor', 'DEPT_MECH', 'faculty8.dept_mech@bvc.edu.in'),
('FAC_1048', 'EMP_DEPT_MECH_109', 'USR_FAC_1063', 'Faculty 9 DEPT_MECH', 'Assistant Professor', 'DEPT_MECH', 'faculty9.dept_mech@bvc.edu.in'),
('FAC_1049', 'EMP_DEPT_MECH_110', 'USR_FAC_1064', 'Faculty 10 DEPT_MECH', 'Assistant Professor', 'DEPT_MECH', 'faculty10.dept_mech@bvc.edu.in');

-- Inserting 5 Events (Mix of Open, Fixed, 1-Day, Multi-Day, Registration Fields)
INSERT INTO events (event_id, event_name, description, location, organizer, start_date, end_date, start_time, end_time, attendance_type, enable_registration, registration_fields, departments, event_status, allowed_coordinator_ids) VALUES
('EVT_1020', 'DEPT_MECH Tech Symposium (Open, 1-Day)', 'Dummy description for DEPT_MECH Tech Symposium (Open, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1052', '2026-08-20', '2026-08-20', '09:00:00', '16:00:00', 'Open', 'No', '[]', 'DEPT_MECH', 'Published', '["USR_EVT_ADM_1052","USR_EVT_ADM_1053"]'),
('EVT_1021', 'DEPT_MECH Guest Lecture (Fixed, 1-Day)', 'Dummy description for DEPT_MECH Guest Lecture (Fixed, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1052', '2026-08-25', '2026-08-25', '09:00:00', '16:00:00', 'Fixed', 'No', '[]', 'DEPT_MECH', 'Published', '["USR_EVT_ADM_1052","USR_EVT_ADM_1053"]'),
('EVT_1022', 'DEPT_MECH Hackathon (Open, 3-Days)', 'Dummy description for DEPT_MECH Hackathon (Open, 3-Days)', 'Main Auditorium', 'USR_EVT_ADM_1052', '2026-08-30', '2026-09-01', '09:00:00', '16:00:00', 'Open', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_MECH', 'Published', '["USR_EVT_ADM_1052","USR_EVT_ADM_1053"]'),
('EVT_1023', 'DEPT_MECH Workshop (Fixed, 2-Days)', 'Dummy description for DEPT_MECH Workshop (Fixed, 2-Days)', 'Main Auditorium', 'USR_EVT_ADM_1052', '2026-09-04', '2026-09-05', '09:00:00', '16:00:00', 'Fixed', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_MECH', 'Published', '["USR_EVT_ADM_1052","USR_EVT_ADM_1053"]'),
('EVT_1024', 'DEPT_MECH Cultural Fest (Open, 1-Day)', 'Dummy description for DEPT_MECH Cultural Fest (Open, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1052', '2026-09-09', '2026-09-09', '09:00:00', '16:00:00', 'Open', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_MECH', 'Published', '["USR_EVT_ADM_1052","USR_EVT_ADM_1053"]');

-- Assigning 3 Coordinators for each event
INSERT INTO event_coordinators (assignment_id, event_id, user_id, assignment_role) VALUES
('ASG_1060', 'EVT_1020', 'USR_FAC_1055', 'Event Coordinator'),
('ASG_1061', 'EVT_1020', 'USR_FAC_1056', 'Event Coordinator'),
('ASG_1062', 'EVT_1020', 'USR_FAC_1057', 'Event Coordinator'),
('ASG_1063', 'EVT_1021', 'USR_FAC_1055', 'Event Coordinator'),
('ASG_1064', 'EVT_1021', 'USR_FAC_1056', 'Event Coordinator'),
('ASG_1065', 'EVT_1021', 'USR_FAC_1057', 'Event Coordinator'),
('ASG_1066', 'EVT_1022', 'USR_FAC_1055', 'Event Coordinator'),
('ASG_1067', 'EVT_1022', 'USR_FAC_1056', 'Event Coordinator'),
('ASG_1068', 'EVT_1022', 'USR_FAC_1057', 'Event Coordinator'),
('ASG_1069', 'EVT_1023', 'USR_FAC_1055', 'Event Coordinator'),
('ASG_1070', 'EVT_1023', 'USR_FAC_1056', 'Event Coordinator'),
('ASG_1071', 'EVT_1023', 'USR_FAC_1057', 'Event Coordinator'),
('ASG_1072', 'EVT_1024', 'USR_FAC_1055', 'Event Coordinator'),
('ASG_1073', 'EVT_1024', 'USR_FAC_1056', 'Event Coordinator'),
('ASG_1074', 'EVT_1024', 'USR_FAC_1057', 'Event Coordinator');

-- ==========================================
-- DATA FOR DEPT_CIVIL
-- ==========================================

-- Inserting 3 Event Admins
INSERT INTO users (user_id, employee_id, first_name, last_name, email_address, username, password_hash, role, department, status) VALUES
('USR_EVT_ADM_1065', 'EMP_ADM_DEPT_CIVIL_1', 'Admin 1', 'DEPT_CIVIL', 'admin1.dept_civil@bvc.edu.in', 'admin1_dept_civil', 'dummyhash', 'Faculty', 'DEPT_CIVIL', 'Active'),
('USR_EVT_ADM_1066', 'EMP_ADM_DEPT_CIVIL_2', 'Admin 2', 'DEPT_CIVIL', 'admin2.dept_civil@bvc.edu.in', 'admin2_dept_civil', 'dummyhash', 'Faculty', 'DEPT_CIVIL', 'Active'),
('USR_EVT_ADM_1067', 'EMP_ADM_DEPT_CIVIL_3', 'Admin 3', 'DEPT_CIVIL', 'admin3.dept_civil@bvc.edu.in', 'admin3_dept_civil', 'dummyhash', 'Faculty', 'DEPT_CIVIL', 'Active');

-- Inserting 10 Faculty Members
INSERT INTO users (user_id, employee_id, first_name, last_name, email_address, username, password_hash, role, department, status) VALUES
('USR_FAC_1068', 'EMP_FAC_DEPT_CIVIL_1', 'Faculty 1', 'DEPT_CIVIL', 'faculty1.dept_civil@bvc.edu.in', 'faculty1_dept_civil', 'dummyhash', 'Faculty', 'DEPT_CIVIL', 'Active'),
('USR_FAC_1069', 'EMP_FAC_DEPT_CIVIL_2', 'Faculty 2', 'DEPT_CIVIL', 'faculty2.dept_civil@bvc.edu.in', 'faculty2_dept_civil', 'dummyhash', 'Faculty', 'DEPT_CIVIL', 'Active'),
('USR_FAC_1070', 'EMP_FAC_DEPT_CIVIL_3', 'Faculty 3', 'DEPT_CIVIL', 'faculty3.dept_civil@bvc.edu.in', 'faculty3_dept_civil', 'dummyhash', 'Faculty', 'DEPT_CIVIL', 'Active'),
('USR_FAC_1071', 'EMP_FAC_DEPT_CIVIL_4', 'Faculty 4', 'DEPT_CIVIL', 'faculty4.dept_civil@bvc.edu.in', 'faculty4_dept_civil', 'dummyhash', 'Faculty', 'DEPT_CIVIL', 'Active'),
('USR_FAC_1072', 'EMP_FAC_DEPT_CIVIL_5', 'Faculty 5', 'DEPT_CIVIL', 'faculty5.dept_civil@bvc.edu.in', 'faculty5_dept_civil', 'dummyhash', 'Faculty', 'DEPT_CIVIL', 'Active'),
('USR_FAC_1073', 'EMP_FAC_DEPT_CIVIL_6', 'Faculty 6', 'DEPT_CIVIL', 'faculty6.dept_civil@bvc.edu.in', 'faculty6_dept_civil', 'dummyhash', 'Faculty', 'DEPT_CIVIL', 'Active'),
('USR_FAC_1074', 'EMP_FAC_DEPT_CIVIL_7', 'Faculty 7', 'DEPT_CIVIL', 'faculty7.dept_civil@bvc.edu.in', 'faculty7_dept_civil', 'dummyhash', 'Faculty', 'DEPT_CIVIL', 'Active'),
('USR_FAC_1075', 'EMP_FAC_DEPT_CIVIL_8', 'Faculty 8', 'DEPT_CIVIL', 'faculty8.dept_civil@bvc.edu.in', 'faculty8_dept_civil', 'dummyhash', 'Faculty', 'DEPT_CIVIL', 'Active'),
('USR_FAC_1076', 'EMP_FAC_DEPT_CIVIL_9', 'Faculty 9', 'DEPT_CIVIL', 'faculty9.dept_civil@bvc.edu.in', 'faculty9_dept_civil', 'dummyhash', 'Faculty', 'DEPT_CIVIL', 'Active'),
('USR_FAC_1077', 'EMP_FAC_DEPT_CIVIL_10', 'Faculty 10', 'DEPT_CIVIL', 'faculty10.dept_civil@bvc.edu.in', 'faculty10_dept_civil', 'dummyhash', 'Faculty', 'DEPT_CIVIL', 'Active');

INSERT INTO faculty (faculty_id, employee_id, user_id, faculty_name, designation, department_id, email) VALUES
('FAC_1050', 'EMP_DEPT_CIVIL_101', 'USR_FAC_1068', 'Faculty 1 DEPT_CIVIL', 'Assistant Professor', 'DEPT_CIVIL', 'faculty1.dept_civil@bvc.edu.in'),
('FAC_1051', 'EMP_DEPT_CIVIL_102', 'USR_FAC_1069', 'Faculty 2 DEPT_CIVIL', 'Assistant Professor', 'DEPT_CIVIL', 'faculty2.dept_civil@bvc.edu.in'),
('FAC_1052', 'EMP_DEPT_CIVIL_103', 'USR_FAC_1070', 'Faculty 3 DEPT_CIVIL', 'Assistant Professor', 'DEPT_CIVIL', 'faculty3.dept_civil@bvc.edu.in'),
('FAC_1053', 'EMP_DEPT_CIVIL_104', 'USR_FAC_1071', 'Faculty 4 DEPT_CIVIL', 'Assistant Professor', 'DEPT_CIVIL', 'faculty4.dept_civil@bvc.edu.in'),
('FAC_1054', 'EMP_DEPT_CIVIL_105', 'USR_FAC_1072', 'Faculty 5 DEPT_CIVIL', 'Assistant Professor', 'DEPT_CIVIL', 'faculty5.dept_civil@bvc.edu.in'),
('FAC_1055', 'EMP_DEPT_CIVIL_106', 'USR_FAC_1073', 'Faculty 6 DEPT_CIVIL', 'Assistant Professor', 'DEPT_CIVIL', 'faculty6.dept_civil@bvc.edu.in'),
('FAC_1056', 'EMP_DEPT_CIVIL_107', 'USR_FAC_1074', 'Faculty 7 DEPT_CIVIL', 'Assistant Professor', 'DEPT_CIVIL', 'faculty7.dept_civil@bvc.edu.in'),
('FAC_1057', 'EMP_DEPT_CIVIL_108', 'USR_FAC_1075', 'Faculty 8 DEPT_CIVIL', 'Assistant Professor', 'DEPT_CIVIL', 'faculty8.dept_civil@bvc.edu.in'),
('FAC_1058', 'EMP_DEPT_CIVIL_109', 'USR_FAC_1076', 'Faculty 9 DEPT_CIVIL', 'Assistant Professor', 'DEPT_CIVIL', 'faculty9.dept_civil@bvc.edu.in'),
('FAC_1059', 'EMP_DEPT_CIVIL_110', 'USR_FAC_1077', 'Faculty 10 DEPT_CIVIL', 'Assistant Professor', 'DEPT_CIVIL', 'faculty10.dept_civil@bvc.edu.in');

-- Inserting 5 Events (Mix of Open, Fixed, 1-Day, Multi-Day, Registration Fields)
INSERT INTO events (event_id, event_name, description, location, organizer, start_date, end_date, start_time, end_time, attendance_type, enable_registration, registration_fields, departments, event_status, allowed_coordinator_ids) VALUES
('EVT_1025', 'DEPT_CIVIL Tech Symposium (Open, 1-Day)', 'Dummy description for DEPT_CIVIL Tech Symposium (Open, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1065', '2026-08-20', '2026-08-20', '09:00:00', '16:00:00', 'Open', 'No', '[]', 'DEPT_CIVIL', 'Published', '["USR_EVT_ADM_1065","USR_EVT_ADM_1066"]'),
('EVT_1026', 'DEPT_CIVIL Guest Lecture (Fixed, 1-Day)', 'Dummy description for DEPT_CIVIL Guest Lecture (Fixed, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1065', '2026-08-25', '2026-08-25', '09:00:00', '16:00:00', 'Fixed', 'No', '[]', 'DEPT_CIVIL', 'Published', '["USR_EVT_ADM_1065","USR_EVT_ADM_1066"]'),
('EVT_1027', 'DEPT_CIVIL Hackathon (Open, 3-Days)', 'Dummy description for DEPT_CIVIL Hackathon (Open, 3-Days)', 'Main Auditorium', 'USR_EVT_ADM_1065', '2026-08-30', '2026-09-01', '09:00:00', '16:00:00', 'Open', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_CIVIL', 'Published', '["USR_EVT_ADM_1065","USR_EVT_ADM_1066"]'),
('EVT_1028', 'DEPT_CIVIL Workshop (Fixed, 2-Days)', 'Dummy description for DEPT_CIVIL Workshop (Fixed, 2-Days)', 'Main Auditorium', 'USR_EVT_ADM_1065', '2026-09-04', '2026-09-05', '09:00:00', '16:00:00', 'Fixed', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_CIVIL', 'Published', '["USR_EVT_ADM_1065","USR_EVT_ADM_1066"]'),
('EVT_1029', 'DEPT_CIVIL Cultural Fest (Open, 1-Day)', 'Dummy description for DEPT_CIVIL Cultural Fest (Open, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1065', '2026-09-09', '2026-09-09', '09:00:00', '16:00:00', 'Open', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_CIVIL', 'Published', '["USR_EVT_ADM_1065","USR_EVT_ADM_1066"]');

-- Assigning 3 Coordinators for each event
INSERT INTO event_coordinators (assignment_id, event_id, user_id, assignment_role) VALUES
('ASG_1075', 'EVT_1025', 'USR_FAC_1068', 'Event Coordinator'),
('ASG_1076', 'EVT_1025', 'USR_FAC_1069', 'Event Coordinator'),
('ASG_1077', 'EVT_1025', 'USR_FAC_1070', 'Event Coordinator'),
('ASG_1078', 'EVT_1026', 'USR_FAC_1068', 'Event Coordinator'),
('ASG_1079', 'EVT_1026', 'USR_FAC_1069', 'Event Coordinator'),
('ASG_1080', 'EVT_1026', 'USR_FAC_1070', 'Event Coordinator'),
('ASG_1081', 'EVT_1027', 'USR_FAC_1068', 'Event Coordinator'),
('ASG_1082', 'EVT_1027', 'USR_FAC_1069', 'Event Coordinator'),
('ASG_1083', 'EVT_1027', 'USR_FAC_1070', 'Event Coordinator'),
('ASG_1084', 'EVT_1028', 'USR_FAC_1068', 'Event Coordinator'),
('ASG_1085', 'EVT_1028', 'USR_FAC_1069', 'Event Coordinator'),
('ASG_1086', 'EVT_1028', 'USR_FAC_1070', 'Event Coordinator'),
('ASG_1087', 'EVT_1029', 'USR_FAC_1068', 'Event Coordinator'),
('ASG_1088', 'EVT_1029', 'USR_FAC_1069', 'Event Coordinator'),
('ASG_1089', 'EVT_1029', 'USR_FAC_1070', 'Event Coordinator');

-- ==========================================
-- DATA FOR DEPT_FY
-- ==========================================

-- Inserting 3 Event Admins
INSERT INTO users (user_id, employee_id, first_name, last_name, email_address, username, password_hash, role, department, status) VALUES
('USR_EVT_ADM_1078', 'EMP_ADM_DEPT_FY_1', 'Admin 1', 'DEPT_FY', 'admin1.dept_fy@bvc.edu.in', 'admin1_dept_fy', 'dummyhash', 'Faculty', 'DEPT_FY', 'Active'),
('USR_EVT_ADM_1079', 'EMP_ADM_DEPT_FY_2', 'Admin 2', 'DEPT_FY', 'admin2.dept_fy@bvc.edu.in', 'admin2_dept_fy', 'dummyhash', 'Faculty', 'DEPT_FY', 'Active'),
('USR_EVT_ADM_1080', 'EMP_ADM_DEPT_FY_3', 'Admin 3', 'DEPT_FY', 'admin3.dept_fy@bvc.edu.in', 'admin3_dept_fy', 'dummyhash', 'Faculty', 'DEPT_FY', 'Active');

-- Inserting 10 Faculty Members
INSERT INTO users (user_id, employee_id, first_name, last_name, email_address, username, password_hash, role, department, status) VALUES
('USR_FAC_1081', 'EMP_FAC_DEPT_FY_1', 'Faculty 1', 'DEPT_FY', 'faculty1.dept_fy@bvc.edu.in', 'faculty1_dept_fy', 'dummyhash', 'Faculty', 'DEPT_FY', 'Active'),
('USR_FAC_1082', 'EMP_FAC_DEPT_FY_2', 'Faculty 2', 'DEPT_FY', 'faculty2.dept_fy@bvc.edu.in', 'faculty2_dept_fy', 'dummyhash', 'Faculty', 'DEPT_FY', 'Active'),
('USR_FAC_1083', 'EMP_FAC_DEPT_FY_3', 'Faculty 3', 'DEPT_FY', 'faculty3.dept_fy@bvc.edu.in', 'faculty3_dept_fy', 'dummyhash', 'Faculty', 'DEPT_FY', 'Active'),
('USR_FAC_1084', 'EMP_FAC_DEPT_FY_4', 'Faculty 4', 'DEPT_FY', 'faculty4.dept_fy@bvc.edu.in', 'faculty4_dept_fy', 'dummyhash', 'Faculty', 'DEPT_FY', 'Active'),
('USR_FAC_1085', 'EMP_FAC_DEPT_FY_5', 'Faculty 5', 'DEPT_FY', 'faculty5.dept_fy@bvc.edu.in', 'faculty5_dept_fy', 'dummyhash', 'Faculty', 'DEPT_FY', 'Active'),
('USR_FAC_1086', 'EMP_FAC_DEPT_FY_6', 'Faculty 6', 'DEPT_FY', 'faculty6.dept_fy@bvc.edu.in', 'faculty6_dept_fy', 'dummyhash', 'Faculty', 'DEPT_FY', 'Active'),
('USR_FAC_1087', 'EMP_FAC_DEPT_FY_7', 'Faculty 7', 'DEPT_FY', 'faculty7.dept_fy@bvc.edu.in', 'faculty7_dept_fy', 'dummyhash', 'Faculty', 'DEPT_FY', 'Active'),
('USR_FAC_1088', 'EMP_FAC_DEPT_FY_8', 'Faculty 8', 'DEPT_FY', 'faculty8.dept_fy@bvc.edu.in', 'faculty8_dept_fy', 'dummyhash', 'Faculty', 'DEPT_FY', 'Active'),
('USR_FAC_1089', 'EMP_FAC_DEPT_FY_9', 'Faculty 9', 'DEPT_FY', 'faculty9.dept_fy@bvc.edu.in', 'faculty9_dept_fy', 'dummyhash', 'Faculty', 'DEPT_FY', 'Active'),
('USR_FAC_1090', 'EMP_FAC_DEPT_FY_10', 'Faculty 10', 'DEPT_FY', 'faculty10.dept_fy@bvc.edu.in', 'faculty10_dept_fy', 'dummyhash', 'Faculty', 'DEPT_FY', 'Active');

INSERT INTO faculty (faculty_id, employee_id, user_id, faculty_name, designation, department_id, email) VALUES
('FAC_1060', 'EMP_DEPT_FY_101', 'USR_FAC_1081', 'Faculty 1 DEPT_FY', 'Assistant Professor', 'DEPT_FY', 'faculty1.dept_fy@bvc.edu.in'),
('FAC_1061', 'EMP_DEPT_FY_102', 'USR_FAC_1082', 'Faculty 2 DEPT_FY', 'Assistant Professor', 'DEPT_FY', 'faculty2.dept_fy@bvc.edu.in'),
('FAC_1062', 'EMP_DEPT_FY_103', 'USR_FAC_1083', 'Faculty 3 DEPT_FY', 'Assistant Professor', 'DEPT_FY', 'faculty3.dept_fy@bvc.edu.in'),
('FAC_1063', 'EMP_DEPT_FY_104', 'USR_FAC_1084', 'Faculty 4 DEPT_FY', 'Assistant Professor', 'DEPT_FY', 'faculty4.dept_fy@bvc.edu.in'),
('FAC_1064', 'EMP_DEPT_FY_105', 'USR_FAC_1085', 'Faculty 5 DEPT_FY', 'Assistant Professor', 'DEPT_FY', 'faculty5.dept_fy@bvc.edu.in'),
('FAC_1065', 'EMP_DEPT_FY_106', 'USR_FAC_1086', 'Faculty 6 DEPT_FY', 'Assistant Professor', 'DEPT_FY', 'faculty6.dept_fy@bvc.edu.in'),
('FAC_1066', 'EMP_DEPT_FY_107', 'USR_FAC_1087', 'Faculty 7 DEPT_FY', 'Assistant Professor', 'DEPT_FY', 'faculty7.dept_fy@bvc.edu.in'),
('FAC_1067', 'EMP_DEPT_FY_108', 'USR_FAC_1088', 'Faculty 8 DEPT_FY', 'Assistant Professor', 'DEPT_FY', 'faculty8.dept_fy@bvc.edu.in'),
('FAC_1068', 'EMP_DEPT_FY_109', 'USR_FAC_1089', 'Faculty 9 DEPT_FY', 'Assistant Professor', 'DEPT_FY', 'faculty9.dept_fy@bvc.edu.in'),
('FAC_1069', 'EMP_DEPT_FY_110', 'USR_FAC_1090', 'Faculty 10 DEPT_FY', 'Assistant Professor', 'DEPT_FY', 'faculty10.dept_fy@bvc.edu.in');

-- Inserting 5 Events (Mix of Open, Fixed, 1-Day, Multi-Day, Registration Fields)
INSERT INTO events (event_id, event_name, description, location, organizer, start_date, end_date, start_time, end_time, attendance_type, enable_registration, registration_fields, departments, event_status, allowed_coordinator_ids) VALUES
('EVT_1030', 'DEPT_FY Tech Symposium (Open, 1-Day)', 'Dummy description for DEPT_FY Tech Symposium (Open, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1078', '2026-08-20', '2026-08-20', '09:00:00', '16:00:00', 'Open', 'No', '[]', 'DEPT_FY', 'Published', '["USR_EVT_ADM_1078","USR_EVT_ADM_1079"]'),
('EVT_1031', 'DEPT_FY Guest Lecture (Fixed, 1-Day)', 'Dummy description for DEPT_FY Guest Lecture (Fixed, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1078', '2026-08-25', '2026-08-25', '09:00:00', '16:00:00', 'Fixed', 'No', '[]', 'DEPT_FY', 'Published', '["USR_EVT_ADM_1078","USR_EVT_ADM_1079"]'),
('EVT_1032', 'DEPT_FY Hackathon (Open, 3-Days)', 'Dummy description for DEPT_FY Hackathon (Open, 3-Days)', 'Main Auditorium', 'USR_EVT_ADM_1078', '2026-08-30', '2026-09-01', '09:00:00', '16:00:00', 'Open', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_FY', 'Published', '["USR_EVT_ADM_1078","USR_EVT_ADM_1079"]'),
('EVT_1033', 'DEPT_FY Workshop (Fixed, 2-Days)', 'Dummy description for DEPT_FY Workshop (Fixed, 2-Days)', 'Main Auditorium', 'USR_EVT_ADM_1078', '2026-09-04', '2026-09-05', '09:00:00', '16:00:00', 'Fixed', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_FY', 'Published', '["USR_EVT_ADM_1078","USR_EVT_ADM_1079"]'),
('EVT_1034', 'DEPT_FY Cultural Fest (Open, 1-Day)', 'Dummy description for DEPT_FY Cultural Fest (Open, 1-Day)', 'Main Auditorium', 'USR_EVT_ADM_1078', '2026-09-09', '2026-09-09', '09:00:00', '16:00:00', 'Open', 'Yes', '[{"field_name":"Phone Number","required":true},{"field_name":"T-Shirt Size","required":false},{"field_name":"Why do you want to join?","required":true}]', 'DEPT_FY', 'Published', '["USR_EVT_ADM_1078","USR_EVT_ADM_1079"]');

-- Assigning 3 Coordinators for each event
INSERT INTO event_coordinators (assignment_id, event_id, user_id, assignment_role) VALUES
('ASG_1090', 'EVT_1030', 'USR_FAC_1081', 'Event Coordinator'),
('ASG_1091', 'EVT_1030', 'USR_FAC_1082', 'Event Coordinator'),
('ASG_1092', 'EVT_1030', 'USR_FAC_1083', 'Event Coordinator'),
('ASG_1093', 'EVT_1031', 'USR_FAC_1081', 'Event Coordinator'),
('ASG_1094', 'EVT_1031', 'USR_FAC_1082', 'Event Coordinator'),
('ASG_1095', 'EVT_1031', 'USR_FAC_1083', 'Event Coordinator'),
('ASG_1096', 'EVT_1032', 'USR_FAC_1081', 'Event Coordinator'),
('ASG_1097', 'EVT_1032', 'USR_FAC_1082', 'Event Coordinator'),
('ASG_1098', 'EVT_1032', 'USR_FAC_1083', 'Event Coordinator'),
('ASG_1099', 'EVT_1033', 'USR_FAC_1081', 'Event Coordinator'),
('ASG_1100', 'EVT_1033', 'USR_FAC_1082', 'Event Coordinator'),
('ASG_1101', 'EVT_1033', 'USR_FAC_1083', 'Event Coordinator'),
('ASG_1102', 'EVT_1034', 'USR_FAC_1081', 'Event Coordinator'),
('ASG_1103', 'EVT_1034', 'USR_FAC_1082', 'Event Coordinator'),
('ASG_1104', 'EVT_1034', 'USR_FAC_1083', 'Event Coordinator');

