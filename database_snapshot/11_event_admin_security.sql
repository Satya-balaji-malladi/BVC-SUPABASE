-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — EVENT ADMIN SECURITY FUNCTIONS
-- Description: Secure RPCs that enforce event-level scoping based on session.
-- =============================================================================

-- Helper function to get authorized event IDs for a given session
CREATE OR REPLACE FUNCTION get_authorized_event_ids(p_token VARCHAR)
RETURNS TABLE(event_id VARCHAR) AS $$
DECLARE
    v_user_id VARCHAR;
    v_role VARCHAR;
BEGIN
    -- 1. Validate session
    SELECT u.user_id, u.role INTO v_user_id, v_role 
    FROM sessions s
    JOIN users u ON s.user_id = u.user_id
    WHERE s.session_token = p_token AND s.session_status = 'Active' AND s.expiry_time >= now();

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- If SuperAdmin, they theoretically have access to all, but these RPCs are meant for Event Admins.
    -- If they want to test as SuperAdmin using these RPCs, we return all events.
    IF v_role = 'Super Admin' THEN
        RETURN QUERY SELECT e.event_id FROM events e WHERE e.deletion_flag = false;
        RETURN;
    END IF;

    -- If Event Admin or Coordinator, return their assigned events
    RETURN QUERY
    SELECT e.event_id FROM events e WHERE e.organizer = v_user_id AND e.deletion_flag = false
    UNION
    SELECT a.event_id FROM event_assignments a WHERE a.user_id = v_user_id AND a.deletion_flag = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. GET EVENTS
CREATE OR REPLACE FUNCTION ea_get_events(p_token VARCHAR)
RETURNS SETOF events AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM events 
    WHERE event_id IN (SELECT * FROM get_authorized_event_ids(p_token))
    AND deletion_flag = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. GET EVENT TEAM (Coordinators)
CREATE OR REPLACE FUNCTION ea_get_team(p_token VARCHAR)
RETURNS TABLE(
    assignment_id VARCHAR,
    event_id VARCHAR,
    user_id VARCHAR,
    role VARCHAR,
    status VARCHAR,
    assigned_at TIMESTAMP WITH TIME ZONE,
    first_name VARCHAR,
    last_name VARCHAR,
    employee_id VARCHAR,
    email_address VARCHAR,
    department VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.assignment_id, a.event_id, a.user_id, a.role, a.status, a.assigned_at,
        u.first_name, u.last_name, u.employee_id, u.email_address, u.department
    FROM event_assignments a
    JOIN users u ON a.user_id = u.user_id
    WHERE a.event_id IN (SELECT * FROM get_authorized_event_ids(p_token))
    AND a.deletion_flag = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. GET PARTICIPANTS
CREATE OR REPLACE FUNCTION ea_get_participants(p_token VARCHAR)
RETURNS TABLE(
    participant_id VARCHAR,
    event_id VARCHAR,
    roll_number VARCHAR,
    registration_status VARCHAR,
    attendance_status VARCHAR,
    registration_timestamp TIMESTAMP WITH TIME ZONE,
    first_name VARCHAR,
    last_name VARCHAR,
    department VARCHAR,
    year VARCHAR,
    section VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ep.participant_id, ep.event_id, ep.roll_number, ep.registration_status, ep.attendance_status, ep.registration_timestamp,
        s.student_name as first_name, ''::VARCHAR as last_name, s.department_id as department, CAST(s.year AS VARCHAR) as year, s.section
    FROM event_participants ep
    JOIN students s ON ep.roll_number = s.roll_number
    WHERE ep.event_id IN (SELECT * FROM get_authorized_event_ids(p_token));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. GET ATTENDANCE
CREATE OR REPLACE FUNCTION ea_get_attendance(p_token VARCHAR)
RETURNS TABLE(
    attendance_id VARCHAR,
    event_id VARCHAR,
    roll_number VARCHAR,
    attendance_status VARCHAR,
    attendance_method VARCHAR,
    "date" DATE,
    "time" TIME,
    "timestamp" TIMESTAMP WITH TIME ZONE,
    location VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    department VARCHAR,
    year VARCHAR,
    section VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.attendance_id, a.event_id, a.roll_number, a.attendance_status, a.attendance_method, a.date, a.time, a.timestamp, a.location,
        s.student_name as first_name, ''::VARCHAR as last_name, s.department_id as department, CAST(s.year AS VARCHAR) as year, s.section
    FROM attendance a
    JOIN students s ON a.roll_number = s.roll_number
    WHERE a.event_id IN (SELECT * FROM get_authorized_event_ids(p_token));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. GET DASHBOARD STATS
CREATE OR REPLACE FUNCTION ea_get_dashboard_stats(p_token VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_events_count INT := 0;
    v_total_participants INT := 0;
    v_total_present INT := 0;
    v_recent_attendance JSON := '[]'::json;
    v_events JSON := '[]'::json;
    v_auth_events VARCHAR[];
BEGIN
    -- Only for authorized events
    SELECT array_agg(event_id) INTO v_auth_events FROM get_authorized_event_ids(p_token);
    
    v_events_count := COALESCE(array_length(v_auth_events, 1), 0);
    
    IF v_events_count = 0 THEN
        RETURN json_build_object(
            'events_count', 0, 'total_participants', 0, 'total_present', 0, 'attendance_percentage', 0,
            'recent_attendance', v_recent_attendance, 'events', v_events
        );
    END IF;

    SELECT COUNT(*) INTO v_total_participants 
    FROM event_participants 
    WHERE event_id = ANY(v_auth_events);

    SELECT COUNT(*) INTO v_total_present 
    FROM attendance 
    WHERE event_id = ANY(v_auth_events) AND attendance_status = 'Present';

    SELECT json_agg(row_to_json(a)) INTO v_recent_attendance
    FROM (
        SELECT att.roll_number, s.student_name as first_name, att.timestamp, att.event_id
        FROM attendance att
        JOIN students s ON att.roll_number = s.roll_number
        WHERE att.event_id = ANY(v_auth_events)
        ORDER BY att.timestamp DESC LIMIT 10
    ) a;

    SELECT json_agg(row_to_json(e)) INTO v_events
    FROM (
        SELECT event_name, event_id, start_date, event_status
        FROM events
        WHERE event_id = ANY(v_auth_events)
    ) e;

    RETURN json_build_object(
        'events_count', v_events_count,
        'total_participants', v_total_participants,
        'total_present', v_total_present,
        'attendance_percentage', CASE WHEN v_total_participants > 0 THEN ROUND((v_total_present::NUMERIC / v_total_participants::NUMERIC) * 100.0, 2) ELSE 0 END,
        'recent_attendance', COALESCE(v_recent_attendance, '[]'::json),
        'events', COALESCE(v_events, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
