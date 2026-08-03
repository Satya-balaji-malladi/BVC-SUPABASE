-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — DATABASE SNAPSHOT (PART 07: VIEWS)
-- Target Database: Supabase PostgreSQL 15+
-- Generated Date: 2026-07-30
-- Description: Analytical & reporting views for system-wide insights.
-- =============================================================================

-- 1. VIEW: EVENT SUMMARY DETAILS
CREATE OR REPLACE VIEW v_event_summary AS
SELECT 
    e.event_id,
    e.event_name,
    e.event_category,
    e.start_date,
    e.end_date,
    e.event_status,
    e.approval_status,
    u.first_name || ' ' || COALESCE(u.last_name, '') AS organizer_name,
    e.registered_count,
    COUNT(DISTINCT a.attendance_id) AS total_attended
FROM events e
LEFT JOIN users u ON e.organizer = u.user_id
LEFT JOIN attendance a ON e.event_id = a.event_id AND a.attendance_status = 'Present' AND a.deletion_flag = FALSE
WHERE e.deletion_flag = FALSE
GROUP BY e.event_id, e.event_name, e.event_category, e.start_date, e.end_date, e.event_status, e.approval_status, u.first_name, u.last_name, e.registered_count;

-- 2. VIEW: FACULTY MASTER DETAILS WITH DEPARTMENTS
CREATE OR REPLACE VIEW v_faculty_details AS
SELECT 
    f.faculty_id,
    f.employee_id,
    f.faculty_name,
    f.designation,
    d.department_code,
    d.department_name,
    f.email,
    f.mobile,
    f.joining_date,
    f.employment_type,
    f.status
FROM faculty f
JOIN departments d ON f.department_id = d.department_id
WHERE f.deletion_flag = FALSE;

-- 3. VIEW: STUDENT ENROLLMENT SUMMARY BY DEPARTMENT
CREATE OR REPLACE VIEW v_department_student_summary AS
SELECT 
    d.department_id,
    d.department_code,
    d.department_name,
    COUNT(s.student_id) AS active_students
FROM departments d
LEFT JOIN students s ON d.department_id = s.department_id AND s.deletion_flag = FALSE
WHERE d.deletion_flag = FALSE
GROUP BY d.department_id, d.department_code, d.department_name;
