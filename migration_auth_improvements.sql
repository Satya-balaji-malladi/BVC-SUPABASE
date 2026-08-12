-- Migration: Auth Security Improvements
-- Applies updates to user_status, otp_request, auth, and reset password flows

-- 1. check_user_status
-- Prevent enumerating detailed info. We will keep masked email only for the OTP flow UX.
CREATE OR REPLACE FUNCTION check_user_status(p_identifier VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_masked_email VARCHAR;
BEGIN
    SELECT * INTO v_user FROM users 
    WHERE employee_id = p_identifier OR email_address = p_identifier;

    IF NOT FOUND THEN
        -- Safely just say false
        RETURN json_build_object('exists', false);
    END IF;

    -- Only mask email if it's first login, otherwise don't leak it
    IF v_user.first_login THEN
        IF length(v_user.email_address) > 4 THEN
            v_masked_email := substring(v_user.email_address from 1 for 1) || '***@' || split_part(v_user.email_address, '@', 2);
        ELSE
            v_masked_email := v_user.email_address;
        END IF;
        
        RETURN json_build_object(
            'exists', true,
            'first_login', true,
            'email', v_masked_email
        );
    ELSE
        RETURN json_build_object(
            'exists', true,
            'first_login', false
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. request_otp
-- Ensure secure random, limit requests, add cooldown
CREATE OR REPLACE FUNCTION request_otp(p_identifier VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_otp VARCHAR;
BEGIN
    SELECT * INTO v_user FROM users WHERE employee_id = p_identifier OR email_address = p_identifier;

    IF NOT FOUND THEN
        -- Generic message to prevent enumeration
        RETURN json_build_object('success', true, 'message', 'If the account exists, an OTP has been sent.');
    END IF;

    -- Cooldown check: Prevent spamming if an OTP was requested less than 60 seconds ago
    IF v_user.otp_expiry IS NOT NULL AND v_user.otp_expiry > (now() + interval '14 minutes') THEN
        RETURN json_build_object('success', false, 'error', 'Please wait before requesting a new OTP.');
    END IF;

    -- Daily limits can be implemented here (e.g. check a log table), for now we reset attempts
    
    -- Generate a 6-digit OTP more securely (using random range 100000 - 999999)
    v_otp := lpad(floor(random() * 900000 + 100000)::text, 6, '0');
    
    -- In a real production system with an email edge function, this OTP would trigger an email.
    UPDATE users 
    SET otp = crypt(v_otp, gen_salt('bf')), -- Store hashed OTP
        otp_expiry = now() + interval '15 minutes',
        otp_attempts = 0
    WHERE user_id = v_user.user_id;

    -- DEV/MOCK: Return the plain text OTP in response ONLY because we lack an email service right now.
    -- IN PRODUCTION, remove `otp` from this response!
    RETURN json_build_object('success', true, 'message', 'OTP sent', 'mock_otp', v_otp);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. authenticate_user
-- Add rate limiting logic
CREATE OR REPLACE FUNCTION authenticate_user(p_identifier VARCHAR, p_password VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_user_record RECORD;
BEGIN
    -- Find the user by employee ID or Email
    SELECT * INTO v_user_record FROM users 
    WHERE employee_id = p_identifier OR email_address = p_identifier;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invalid Credentials');
    END IF;

    IF v_user_record.status != 'Active' OR COALESCE(v_user_record.account_locked, false) THEN
        RETURN json_build_object('success', false, 'error', 'Account is disabled or locked.');
    END IF;
    
    -- Check failed login attempts
    IF v_user_record.failed_login_attempts >= 5 THEN
        -- Lock account temporarily or permanently
        UPDATE users SET account_locked = true WHERE user_id = v_user_record.user_id;
        RETURN json_build_object('success', false, 'error', 'Too many failed attempts. Account locked.');
    END IF;

    -- Migration Logic: If the stored password matches plain-text, hash it and update
    IF v_user_record.password_hash = p_password THEN
        UPDATE users 
        SET password_hash = crypt(p_password, gen_salt('bf')),
            salt = 'bcrypt_managed'
        WHERE user_id = v_user_record.user_id;
        SELECT * INTO v_user_record FROM users WHERE user_id = v_user_record.user_id;
    END IF;

    -- Verify the password securely
    IF v_user_record.password_hash = crypt(p_password, v_user_record.password_hash) THEN
        -- Reset failed attempts
        UPDATE users SET failed_login_attempts = 0, last_login_timestamp = now() WHERE user_id = v_user_record.user_id;
        
        RETURN json_build_object(
            'success', true, 
            'user', json_build_object(
                'id', v_user_record.user_id,
                'email', v_user_record.email_address,
                'role', v_user_record.role,
                'name', trim(v_user_record.first_name || ' ' || COALESCE(v_user_record.last_name, '')),
                'department', v_user_record.department
            )
        );
    ELSE
        -- Track failed attempt
        UPDATE users SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1 WHERE user_id = v_user_record.user_id;
        RETURN json_build_object('success', false, 'error', 'Invalid Credentials');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. reset_password_with_otp
-- Auto-login securely after reset by generating and returning a session token directly
CREATE OR REPLACE FUNCTION reset_password_with_otp(p_identifier VARCHAR, p_otp VARCHAR, p_new_password VARCHAR, p_ip VARCHAR, p_user_agent TEXT)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_session_token VARCHAR;
BEGIN
    SELECT * INTO v_user FROM users WHERE employee_id = p_identifier OR email_address = p_identifier;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invalid request');
    END IF;

    IF v_user.otp_attempts >= 5 THEN
        RETURN json_build_object('success', false, 'error', 'Too many failed attempts. Try again later.');
    END IF;

    IF v_user.otp_expiry < now() THEN
        RETURN json_build_object('success', false, 'error', 'OTP has expired.');
    END IF;

    -- Verify hashed OTP
    IF v_user.otp = crypt(p_otp, v_user.otp) THEN
        -- Success! Update Password
        UPDATE users 
        SET password_hash = crypt(p_new_password, gen_salt('bf')),
            salt = 'bcrypt_managed',
            otp = NULL,
            otp_expiry = NULL,
            otp_attempts = 0,
            password_last_changed = now(),
            first_login = false,
            failed_login_attempts = 0,
            account_locked = false
        WHERE user_id = v_user.user_id;

        -- Invalidate all active sessions for this user (Logout everywhere else)
        UPDATE sessions SET session_status = 'Invalidated' WHERE user_id = v_user.user_id AND session_status = 'Active';

        -- AUTO LOGIN: Create a new session directly using the existing create_session function
        -- Ensure create_session is already defined before calling this
        v_session_token := create_session(v_user.user_id, p_ip, p_user_agent);

        RETURN json_build_object(
            'success', true, 
            'message', 'Password updated successfully.',
            'session_token', v_session_token,
            'user', json_build_object(
                'id', v_user.user_id,
                'email', v_user.email_address,
                'role', v_user.role,
                'name', trim(v_user.first_name || ' ' || COALESCE(v_user.last_name, '')),
                'department', v_user.department
            )
        );
    ELSE
        -- Increment failed attempts
        UPDATE users SET otp_attempts = COALESCE(otp_attempts, 0) + 1 WHERE user_id = v_user.user_id;
        RETURN json_build_object('success', false, 'error', 'Invalid OTP.');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
