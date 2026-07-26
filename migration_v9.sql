-- Migration v9: Create other_college_students table and update schema references

CREATE TABLE IF NOT EXISTS other_college_students (
    id VARCHAR(50) PRIMARY KEY,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    college_name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    year VARCHAR(20),
    section VARCHAR(20),
    email_address VARCHAR(150),
    phone_number VARCHAR(20),
    gender VARCHAR(10),
    city VARCHAR(100),
    state VARCHAR(100),
    emergency_contact VARCHAR(20),
    accommodation_needed VARCHAR(10) DEFAULT 'No',
    food_preference VARCHAR(20),
    id_proof_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Active',
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'System',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE other_college_students IS 'Database table storing student details for non-BVC / external college participants.';
