-- migration_v7_hod_reports.sql
-- Secure backend RPCs for HOD reporting

-- 1. Helper function to get HOD department securely from a session token
CREATE OR REPLACE FUNCTION get_hod_dept_from_token(p_token UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_user_id UUID;
    v_role VARCHAR;
    v_department VARCHAR;
BEGIN
    -- Verify session
    SELECT user_id INTO v_user_id
    FROM sessions
    WHERE session_token = p_token AND expires_at > NOW();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired session';
    END IF;

    -- Verify user is HOD and get department
    SELECT role, department INTO v_role, v_department
    FROM users
    WHERE user_id = v_user_id AND status = 'Active';

    IF v_role != 'HOD' AND v_role != 'Department Admin' THEN
        RAISE EXCEPTION 'Unauthorized: User is not an HOD';
    END IF;

    IF v_department IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: HOD has no assigned department';
    END IF;

    RETURN v_department;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. HOD Dashboard Summary
CREATE OR REPLACE FUNCTION get_hod_dashboard_summary(p_token UUID)
RETURNS JSON AS $$
DECLARE
    v_dept VARCHAR;
    v_total_students INT;
    v_total_events INT;
    v_active_events INT;
    v_total_participation INT;
BEGIN
    v_dept := get_hod_dept_from_token(p_token);

    -- Total Students in Dept
    SELECT COUNT(*) INTO v_total_students
    FROM students
    WHERE (department = v_dept OR department_id = v_dept);

    -- Total Events for Dept (events string contains dept code)
    SELECT COUNT(*) INTO v_total_events
    FROM events
    WHERE departments ILIKE '%' || v_dept || '%';

    -- Active Events for Dept
    SELECT COUNT(*) INTO v_active_events
    FROM events
    WHERE departments ILIKE '%' || v_dept || '%' AND (status = 'Active' OR event_status = 'Active');

    -- Total Participation
    SELECT COUNT(*) INTO v_total_participation
    FROM event_participants ep
    JOIN students s ON ep.roll_number = s.roll_number
    WHERE (s.department = v_dept OR s.department_id = v_dept) AND ep.attendance_status = 'Present';

    RETURN json_build_object(
        'department', v_dept,
        'total_students', v_total_students,
        'total_events', v_total_events,
        'active_events', v_active_events,
        'total_participation', v_total_participation
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. HOD Student Report
CREATE OR REPLACE FUNCTION get_hod_student_report(p_token UUID)
RETURNS TABLE (
    roll_number VARCHAR,
    student_name VARCHAR,
    year VARCHAR,
    section VARCHAR,
    events_participated BIGINT
) AS $$
DECLARE
    v_dept VARCHAR;
BEGIN
    v_dept := get_hod_dept_from_token(p_token);

    RETURN QUERY
    SELECT 
        s.roll_number,
        s.student_name,
        s.year,
        s.section,
        COUNT(ep.id) AS events_participated
    FROM students s
    LEFT JOIN event_participants ep ON s.roll_number = ep.roll_number AND ep.attendance_status = 'Present'
    WHERE (s.department = v_dept OR s.department_id = v_dept)
    GROUP BY s.roll_number, s.student_name, s.year, s.section
    ORDER BY events_participated DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. HOD Event Report
CREATE OR REPLACE FUNCTION get_hod_event_report(p_token UUID)
RETURNS TABLE (
    event_id VARCHAR,
    event_name VARCHAR,
    start_date TIMESTAMP,
    status VARCHAR,
    total_attendees BIGINT
) AS $$
DECLARE
    v_dept VARCHAR;
BEGIN
    v_dept := get_hod_dept_from_token(p_token);

    RETURN QUERY
    SELECT 
        e.event_id,
        e.event_name,
        e.start_date,
        COALESCE(e.status, e.event_status),
        COUNT(ep.id) AS total_attendees
    FROM events e
    LEFT JOIN event_participants ep ON e.event_id = ep.event_id AND ep.attendance_status = 'Present'
    -- Ensure we only count students from this HOD's department
    LEFT JOIN students s ON ep.roll_number = s.roll_number AND (s.department = v_dept OR s.department_id = v_dept)
    WHERE e.departments ILIKE '%' || v_dept || '%'
    GROUP BY e.event_id, e.event_name, e.start_date, COALESCE(e.status, e.event_status)
    ORDER BY e.start_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
