CREATE OR REPLACE FUNCTION request_otp(p_identifier VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_otp VARCHAR;
    v_masked_email VARCHAR;
BEGIN
    SELECT * INTO v_user FROM users WHERE employee_id = p_identifier OR email_address = p_identifier;

    IF NOT FOUND THEN
        -- Generic message to prevent enumeration
        RETURN json_build_object('success', true, 'message', 'If the account exists, an OTP has been sent.');
    END IF;

    -- Mask the email (e.g. a***b@gmail.com)
    IF length(v_user.email_address) > 4 AND position('@' in v_user.email_address) > 0 THEN
        v_masked_email := substring(v_user.email_address from 1 for 2) || '****' || substring(v_user.email_address from position('@' in v_user.email_address));
    ELSE
        v_masked_email := '****';
    END IF;

    -- Generate a 6-digit OTP
    v_otp := substring(cast(random() as text) from 3 for 6);
    
    UPDATE users 
    SET otp = crypt(v_otp, gen_salt('bf')),
        otp_expiry = now() + interval '15 minutes',
        otp_attempts = 0
    WHERE user_id = v_user.user_id;

    RETURN json_build_object('success', true, 'message', 'OTP sent', 'mock_otp', v_otp, 'masked_email', v_masked_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
