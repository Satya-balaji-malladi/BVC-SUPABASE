-- Migration: V7 - Scanner RPC
-- Highly optimized RPC for Event Admin Scanner

CREATE OR REPLACE FUNCTION record_event_attendance(
    p_event_id VARCHAR,
    p_roll_number VARCHAR,
    p_attendance_date DATE,
    p_attendance_method VARCHAR,
    p_token VARCHAR
)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_is_authorized BOOLEAN;
    v_student RECORD;
    v_event RECORD;
    v_reg RECORD;
    v_attendance_id VARCHAR;
    v_participant_id VARCHAR;
    v_now TIMESTAMP WITH TIME ZONE := CURRENT_TIMESTAMP;
BEGIN
    -- 1. Verify User and Authorization
    v_user := verify_session(p_token);
    IF v_user IS NULL THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Invalid session');
    END IF;

    -- Check if user is authorized for this event
    SELECT EXISTS (
        SELECT 1 FROM get_authorized_event_ids(p_token) WHERE event_id = p_event_id
    ) INTO v_is_authorized;
    
    IF NOT v_is_authorized THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Not authorized for this event');
    END IF;

    -- 2. Fetch Event Data
    SELECT * INTO v_event FROM events WHERE event_id = p_event_id;
    IF NOT FOUND THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Event not found');
    END IF;

    -- 3. Find Student
    SELECT * INTO v_student FROM students WHERE roll_number ILIKE p_roll_number;
    IF NOT FOUND THEN
        SELECT roll_number, student_name, department AS department_id, college_name AS college, year
        INTO v_student
        FROM other_college_students WHERE roll_number ILIKE p_roll_number;
        
        IF NOT FOUND THEN
            RETURN json_build_object('status', 'NOT_FOUND', 'message', 'Student not found in database');
        END IF;
    END IF;

    -- Normalize roll number
    p_roll_number := UPPER(v_student.roll_number);

    -- 4. Check Event Registration (if enabled)
    IF v_event.enable_registration = 'Yes' OR v_event.enable_registration = 'true' THEN
        SELECT * INTO v_reg FROM event_participants WHERE event_id = p_event_id AND roll_number ILIKE p_roll_number;
        IF NOT FOUND THEN
            RETURN json_build_object(
                'status', 'NOT_REGISTERED', 
                'message', 'Student is not registered for this event',
                'student', json_build_object(
                    'roll_number', v_student.roll_number,
                    'student_name', v_student.student_name,
                    'department', v_student.department_id,
                    'year', v_student.year
                )
            );
        END IF;
    END IF;

    -- 5. Duplicate Check
    SELECT attendance_id INTO v_attendance_id FROM attendance 
    WHERE event_id = p_event_id 
      AND roll_number ILIKE p_roll_number 
      AND date = p_attendance_date;
      
    IF FOUND THEN
        RETURN json_build_object(
            'status', 'DUPLICATE', 
            'message', 'Attendance already marked',
            'student', json_build_object(
                'roll_number', v_student.roll_number,
                'student_name', v_student.student_name,
                'department', v_student.department_id,
                'year', v_student.year
            )
        );
    END IF;

    -- 6. Insert Records
    v_participant_id := p_event_id || '_' || p_roll_number;
    
    INSERT INTO event_participants (participant_id, event_id, roll_number, registration_status)
    VALUES (v_participant_id, p_event_id, p_roll_number, 'Active')
    ON CONFLICT (participant_id) DO NOTHING;

    INSERT INTO attendance (
        attendance_id, event_id, roll_number, user_id, attendance_status, 
        timestamp, date, time, attendance_method
    ) VALUES (
        'ATT_' || (extract(epoch from v_now) * 1000)::bigint || '_' || p_roll_number,
        p_event_id, p_roll_number, v_user.user_id, 'Present',
        v_now, p_attendance_date, v_now::time, p_attendance_method
    );

    -- 7. Return Success
    RETURN json_build_object(
        'status', 'SUCCESS',
        'message', 'Attendance marked successfully',
        'timestamp', v_now,
        'student', json_build_object(
            'roll_number', v_student.roll_number,
            'student_name', v_student.student_name,
            'department', v_student.department_id,
            'year', v_student.year
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
