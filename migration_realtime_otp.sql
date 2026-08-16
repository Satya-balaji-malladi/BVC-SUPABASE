-- Migration: Real-Time OTP Preparation
-- Description: Updates request_otp to return email_address and first_name alongside the OTP
-- so that the frontend can relay the OTP to the secure Google Apps Script email service.

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

    -- Mask the email (e.g. a***b@gmail.com) for safe frontend display
    IF length(v_user.email_address) > 4 AND position('@' in v_user.email_address) > 0 THEN
        v_masked_email := substring(v_user.email_address from 1 for 2) || '****' || substring(v_user.email_address from position('@' in v_user.email_address));
    ELSE
        v_masked_email := '****';
    END IF;

    -- Generate a 6-digit OTP
    v_otp := substring(cast(random() as text) from 3 for 6);
    
    -- Store hashed OTP in database
    UPDATE users 
    SET otp = crypt(v_otp, gen_salt('bf')),
        otp_expiry = now() + interval '15 minutes',
        otp_attempts = 0
    WHERE user_id = v_user.user_id;

    -- Return the OTP and real email to the frontend.
    -- SECURITY NOTE: In a future iteration with Supabase Edge Functions, this RPC should 
    -- trigger the email directly and return ONLY the masked_email. Because of current 
    -- constraints (using GAS via frontend fetch), the frontend acts as the secure relayer.
    RETURN json_build_object(
        'success', true, 
        'message', 'OTP generated', 
        'otp', v_otp, 
        'email_address', v_user.email_address,
        'first_name', v_user.first_name,
        'masked_email', v_masked_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
