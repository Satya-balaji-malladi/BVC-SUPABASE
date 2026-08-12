-- Auth Functions for BVC EMS Supabase Instance

-- 1. Enable pgcrypto extension for secure hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Function to authenticate a user (handles plain-text migration)
CREATE OR REPLACE FUNCTION authenticate_user(p_identifier VARCHAR, p_password VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_user_record RECORD;
    v_response JSON;
BEGIN
    -- Find the user by employee ID or Email
    SELECT * INTO v_user_record FROM users 
    WHERE employee_id = p_identifier OR email_address = p_identifier;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invalid Credentials');
    END IF;

    IF v_user_record.status != 'Active' THEN
        RETURN json_build_object('success', false, 'error', 'Account is disabled or locked.');
    END IF;

    -- Migration Logic: If the stored password matches plain-text, hash it and update!
    -- This ensures we don't break existing users, but securely migrate them on their next login.
    IF v_user_record.password_hash = p_password THEN
        -- Securely hash the password and generate a salt
        UPDATE users 
        SET password_hash = crypt(p_password, gen_salt('bf')),
            salt = 'bcrypt_managed' -- Salt is managed internally by crypt() in pgcrypto
        WHERE user_id = v_user_record.user_id;
        
        -- Re-fetch to get updated record
        SELECT * INTO v_user_record FROM users WHERE user_id = v_user_record.user_id;
    END IF;

    -- Verify the password securely
    IF v_user_record.password_hash = crypt(p_password, v_user_record.password_hash) THEN
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
        -- Track failed attempt here (Implementation omitted for brevity, but you can increment failed_login_attempts)
        RETURN json_build_object('success', false, 'error', 'Invalid Credentials');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Function to create a session token securely
CREATE OR REPLACE FUNCTION create_session(p_user_id VARCHAR, p_ip VARCHAR, p_user_agent TEXT)
RETURNS VARCHAR AS $$
DECLARE
    v_token VARCHAR;
    v_session_id VARCHAR;
BEGIN
    -- Generate a secure random token
    v_token := encode(gen_random_bytes(32), 'hex');
    v_session_id := 'SESS-' || extract(epoch from now())::bigint || '-' || substring(v_token from 1 for 6);

    INSERT INTO sessions (
        session_id, user_id, username, login_timestamp, last_activity_timestamp, 
        expiry_time, session_status, ip_address, user_agent, session_token
    )
    SELECT 
        v_session_id, p_user_id, username, now(), now(), 
        now() + interval '12 hours', 'Active', p_ip, p_user_agent, v_token
    FROM users WHERE user_id = p_user_id;

    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Function to validate a session
CREATE OR REPLACE FUNCTION validate_session_token(p_token VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_session RECORD;
    v_user RECORD;
BEGIN
    SELECT * INTO v_session FROM sessions WHERE session_token = p_token AND session_status = 'Active';

    IF NOT FOUND THEN
        RETURN json_build_object('valid', false, 'error', 'Invalid or expired session');
    END IF;

    IF v_session.expiry_time < now() THEN
        UPDATE sessions SET session_status = 'Expired' WHERE session_token = p_token;
        RETURN json_build_object('valid', false, 'error', 'Session expired');
    END IF;

    -- Update last activity
    UPDATE sessions SET last_activity_timestamp = now() WHERE session_token = p_token;

    -- Fetch user details
    SELECT * INTO v_user FROM users WHERE user_id = v_session.user_id;

    RETURN json_build_object(
        'valid', true,
        'user', json_build_object(
            'id', v_user.user_id,
            'email', v_user.email_address,
            'role', v_user.role,
            'name', trim(v_user.first_name || ' ' || COALESCE(v_user.last_name, '')),
            'department', v_user.department
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Function to request OTP
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

    -- Generate a 6-digit OTP
    v_otp := substring(cast(random() as text) from 3 for 6);
    
    -- In a real production system with an email edge function, this OTP would trigger an email.
    -- For now, we just save it to the DB.
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


-- 6. Function to verify OTP and reset password
CREATE OR REPLACE FUNCTION reset_password_with_otp(p_identifier VARCHAR, p_otp VARCHAR, p_new_password VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
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
            password_last_changed = now()
        WHERE user_id = v_user.user_id;

        -- Invalidate all active sessions for this user (Logout everywhere)
        UPDATE sessions SET session_status = 'Invalidated' WHERE user_id = v_user.user_id AND session_status = 'Active';

        RETURN json_build_object('success', true, 'message', 'Password updated successfully.');
    ELSE
        -- Increment failed attempts
        UPDATE users SET otp_attempts = COALESCE(otp_attempts, 0) + 1 WHERE user_id = v_user.user_id;
        RETURN json_build_object('success', false, 'error', 'Invalid OTP.');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. Logout function
CREATE OR REPLACE FUNCTION invalidate_session(p_token VARCHAR)
RETURNS JSON AS $$
BEGIN
    UPDATE sessions SET session_status = 'Logged Out', logout_timestamp = now() WHERE session_token = p_token;
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
