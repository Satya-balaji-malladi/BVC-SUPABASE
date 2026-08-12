-- Migration: V5 - Check User Status RPC

-- Function to check if a user exists and if it's their first login
CREATE OR REPLACE FUNCTION check_user_status(p_identifier VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_masked_email VARCHAR;
BEGIN
    SELECT * INTO v_user FROM users 
    WHERE employee_id = p_identifier OR email_address = p_identifier;

    IF NOT FOUND THEN
        RETURN json_build_object('exists', false);
    END IF;

    -- Mask the email for security (e.g., j***@bvc.edu.in)
    IF length(v_user.email_address) > 4 THEN
        v_masked_email := substring(v_user.email_address from 1 for 1) || '***@' || split_part(v_user.email_address, '@', 2);
    ELSE
        v_masked_email := v_user.email_address;
    END IF;

    RETURN json_build_object(
        'exists', true,
        'first_login', COALESCE(v_user.first_login, false),
        'email', v_masked_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
