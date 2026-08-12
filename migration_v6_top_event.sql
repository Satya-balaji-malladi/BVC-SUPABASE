-- migration_v6_top_event.sql
-- Creates an RPC to securely and accurately calculate the top active event.

CREATE OR REPLACE FUNCTION get_top_event_today()
RETURNS JSON AS $$
DECLARE
    v_event_name VARCHAR;
    v_attendee_count INT;
BEGIN
    SELECT e.event_name, COUNT(ep.id) as att_count
    INTO v_event_name, v_attendee_count
    FROM events e
    LEFT JOIN event_participants ep ON e.event_id = ep.event_id AND ep.attendance_status = 'Present'
    WHERE (e.status = 'Active' OR e.event_status = 'Active')
    GROUP BY e.event_id, e.event_name
    ORDER BY att_count DESC, e.event_name ASC
    LIMIT 1;

    IF v_event_name IS NULL THEN
        RETURN json_build_object('event_name', 'No events today', 'attendee_count', 0);
    ELSE
        RETURN json_build_object('event_name', v_event_name, 'attendee_count', v_attendee_count);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
