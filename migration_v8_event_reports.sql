-- migration_v8_event_reports.sql
-- Secure backend RPCs for Event Admin and Coordinator reporting

-- 1. Helper: Get single authorized event ID for a given token and requested event_id
CREATE OR REPLACE FUNCTION verify_event_authorization(p_token UUID, p_event_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_role VARCHAR;
    v_department VARCHAR;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- Verify session
    SELECT user_id INTO v_user_id
    FROM sessions
    WHERE session_token = p_token AND expires_at > NOW();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired session';
    END IF;

    SELECT role, department INTO v_role, v_department
    FROM users
    WHERE user_id = v_user_id;

    -- Global roles always have access
    IF v_role IN ('Super Admin', 'SuperAdmin') THEN
        RETURN TRUE;
    END IF;

    -- Event Admin: created the event, or is organizer, or event targets their department
    IF v_role IN ('Event Admin', 'EventAdmin') THEN
        SELECT EXISTS (
            SELECT 1 FROM events 
            WHERE event_id = p_event_id 
            AND (
                created_by = v_user_id OR 
                organizer = (SELECT first_name FROM users WHERE user_id = v_user_id) OR
                departments ILIKE '%' || v_department || '%'
            )
        ) INTO v_is_authorized;
        
        IF v_is_authorized THEN RETURN TRUE; END IF;
    END IF;

    -- Coordinator / Faculty: Must be explicitly assigned
    SELECT EXISTS (
        SELECT 1 FROM event_assignments
        WHERE event_id = p_event_id 
        AND user_id = v_user_id 
        AND status = 'Active' 
        AND deletion_flag = false
    ) INTO v_is_authorized;

    RETURN v_is_authorized;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Securely get Participants for an Event
CREATE OR REPLACE FUNCTION get_secure_event_participants(p_token UUID, p_event_id VARCHAR)
RETURNS TABLE (
    roll_number VARCHAR,
    student_name VARCHAR,
    department VARCHAR,
    year VARCHAR,
    section VARCHAR,
    registration_status VARCHAR,
    attendance_status VARCHAR
) AS $$
BEGIN
    IF NOT verify_event_authorization(p_token, p_event_id) THEN
        RAISE EXCEPTION 'Unauthorized to access this event';
    END IF;

    RETURN QUERY
    SELECT 
        ep.roll_number,
        s.student_name,
        COALESCE(s.department_id, s.department),
        s.year,
        s.section,
        ep.registration_status,
        ep.attendance_status
    FROM event_participants ep
    LEFT JOIN students s ON ep.roll_number = s.roll_number
    WHERE ep.event_id = p_event_id AND ep.deletion_flag = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Securely get Attendance logs for an Event
CREATE OR REPLACE FUNCTION get_secure_event_attendance(p_token UUID, p_event_id VARCHAR)
RETURNS TABLE (
    roll_number VARCHAR,
    student_name VARCHAR,
    attendance_status VARCHAR,
    "timestamp" TIMESTAMPTZ,
    scanned_by VARCHAR
) AS $$
BEGIN
    IF NOT verify_event_authorization(p_token, p_event_id) THEN
        RAISE EXCEPTION 'Unauthorized to access this event';
    END IF;

    RETURN QUERY
    SELECT 
        a.roll_number,
        s.student_name,
        a.attendance_status,
        a.timestamp,
        u.first_name AS scanned_by
    FROM attendance a
    LEFT JOIN students s ON a.roll_number = s.roll_number
    LEFT JOIN users u ON a.scanned_by_id = u.user_id
    WHERE a.event_id = p_event_id AND a.deletion_flag = false
    ORDER BY a.timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
