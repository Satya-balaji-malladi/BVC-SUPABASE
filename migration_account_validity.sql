-- Add account validity expiry date to users table
ALTER TABLE users ADD COLUMN account_expires_at TIMESTAMP WITH TIME ZONE;
