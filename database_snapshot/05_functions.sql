-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — DATABASE SNAPSHOT (PART 05: FUNCTIONS)
-- Target Database: Supabase PostgreSQL 15+
-- Generated Date: 2026-07-30
-- Description: Stored procedures, utility routines, and trigger handler functions.
-- =============================================================================

-- 1. FUNCTION: UPDATE TIMESTAMPS AUTOMATICALLY
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. FUNCTION: CALCULATE EVENT ATTENDANCE METRICS
CREATE OR REPLACE FUNCTION get_event_attendance_stats(p_event_id VARCHAR)
RETURNS TABLE(
    total_registered INT,
    total_present INT,
    total_absent INT,
    attendance_percentage NUMERIC
) AS $$
DECLARE
    v_registered INT;
    v_present INT;
    v_absent INT;
    v_pct NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_registered FROM event_participants WHERE event_id = p_event_id AND deletion_flag = FALSE;
    SELECT COUNT(*) INTO v_present FROM attendance WHERE event_id = p_event_id AND attendance_status = 'Present' AND deletion_flag = FALSE;
    v_absent := GREATEST(0, v_registered - v_present);
    IF v_registered > 0 THEN
        v_pct := ROUND((v_present::NUMERIC / v_registered::NUMERIC) * 100.0, 2);
    ELSE
        v_pct := 0.00;
    END IF;
    RETURN QUERY SELECT v_registered, v_present, v_absent, v_pct;
END;
$$ LANGUAGE plpgsql;

-- 3. FUNCTION: BATCH MARK ATTENDANCE
CREATE OR REPLACE FUNCTION record_attendance_scan(
    p_attendance_id VARCHAR,
    p_event_id VARCHAR,
    p_roll_number VARCHAR,
    p_user_id VARCHAR,
    p_method VARCHAR,
    p_location VARCHAR DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO attendance (
        attendance_id, event_id, roll_number, user_id, attendance_status,
        attendance_method, date, time, timestamp, location, sync_status, created_at
    ) VALUES (
        p_attendance_id, p_event_id, p_roll_number, p_user_id, 'Present',
        p_method, CURRENT_DATE, CURRENT_TIME, CURRENT_TIMESTAMP, p_location, 'Synced', CURRENT_TIMESTAMP
    )
    ON CONFLICT (attendance_id) DO UPDATE SET
        attendance_status = 'Present',
        timestamp = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP;

    -- Update participant record
    UPDATE event_participants 
    SET attendance_status = 'Present', attendance_timestamp = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE event_id = p_event_id AND roll_number = p_roll_number;
END;
$$ LANGUAGE plpgsql;
