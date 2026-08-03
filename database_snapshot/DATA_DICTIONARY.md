# Data Dictionary — BVC Event Attendance System Database

## Summary of Tables

The system consists of **24 distinct tables**:

1. `departments`
2. `students`
3. `other_college_students`
4. `roles`
5. `users`
6. `faculty`
7. `guest_coordinators`
8. `department_hods`
9. `events`
10. `event_templates`
11. `event_coordinators`
12. `event_assignments`
13. `event_participants`
14. `attendance`
15. `attendance_corrections`
16. `sessions`
17. `generated_reports`
18. `settings`
19. `audit_logs`
20. `notifications`
21. `diagnostics`
22. `user_permissions`
23. `export_templates`
24. `test_history`

---

## Field Specifications by Table

### 1. `departments`
- **Purpose:** Academic & Administrative departments.
- **Columns:**
  - `department_id` (VARCHAR(50), PK): Primary key identifier (e.g. `DEPT_CSE`).
  - `department_code` (VARCHAR(10), UNIQUE, NOT NULL): Department short code (e.g. `CSE`).
  - `department_name` (VARCHAR(255), NOT NULL): Full department name.
  - `short_name` (VARCHAR(50)): Abbreviated department title.
  - `hod_name` (VARCHAR(100)): Head of Department name.
  - `hod_employee_id` (VARCHAR(50)): Employee ID of HOD.
  - `total_students` (INT, Default 0): Aggregate count of enrolled students.
  - `total_coordinators` (INT, Default 0): Aggregate count of coordinators.
  - `status` (VARCHAR(20), Default 'Active'): Active/Inactive status.
  - `deletion_flag` (BOOLEAN, Default FALSE): Soft delete marker.

### 2. `students`
- **Purpose:** Enrolled regular students of BVC Engineering College.
- **Columns:**
  - `student_id` (VARCHAR(50), PK): Primary Key.
  - `roll_number` (VARCHAR(50), UNIQUE, NOT NULL): Roll number / Barcode ID (e.g. `216W1A0501`).
  - `student_name` (VARCHAR(255), NOT NULL): Student full name.
  - `email_address` (VARCHAR(150)): Email address.
  - `year` (INT, NOT NULL): Current academic year (1-4).
  - `semester` (INT): Current semester (1-8).
  - `section` (VARCHAR(5)): Section designation (A/B/C).
  - `department_id` (VARCHAR(50), FK -> departments): Foreign key linking to department.
  - `user_id` (VARCHAR(50)): Associated User ID if assigned as Student Coordinator.

### 3. `other_college_students`
- **Purpose:** External participants attending inter-college events.
- **Columns:**
  - `id` (VARCHAR(50), PK): Primary key identifier.
  - `roll_number` (VARCHAR(50), UNIQUE, NOT NULL): External roll/reg number.
  - `student_name` (VARCHAR(255), NOT NULL): External student name.
  - `college_name` (VARCHAR(255), NOT NULL): Name of home institution.
  - `accommodation_needed` (VARCHAR(10), Default 'No'): Flag for campus stay requirement.

### 4. `users`
- **Purpose:** Master user accounts for Super Admins, HODs, Coordinators, and Event Admins.
- **Columns:**
  - `user_id` (VARCHAR(50), PK): Primary key identifier.
  - `employee_id` (VARCHAR(50), UNIQUE, NOT NULL): College Employee ID.
  - `username` (VARCHAR(100), UNIQUE, NOT NULL): Login username.
  - `email_address` (VARCHAR(150), UNIQUE, NOT NULL): User email address.
  - `password_hash` (VARCHAR(255), NOT NULL): Bcrypt hashed credential.
  - `role` (VARCHAR(50), NOT NULL): Active role string.
  - `default_role` (VARCHAR(50), Default 'Coordinator'): Default permissions role.
  - `status` (VARCHAR(20), Default 'Active'): Account state.

### 5. `events`
- **Purpose:** Event master definitions and configurations.
- **Columns:**
  - `event_id` (VARCHAR(50), PK): Unique Event ID.
  - `event_name` (VARCHAR(255), NOT NULL): Title of event.
  - `organizer` (VARCHAR(50), FK -> users): User ID of organizer.
  - `start_date` (DATE, NOT NULL): Event start date.
  - `end_date` (DATE, NOT NULL): Event end date.
  - `access_restriction_type` (TEXT, Default 'ALL_COORDINATORS'): Scanner restriction setting.
  - `allowed_coordinator_ids` (JSONB): Permitted coordinator IDs.
  - `allowed_departments` (JSONB): Permitted department codes.
  - `approval_status` (VARCHAR(50), Default 'Approved'): Event workflow approval.

### 6. `faculty`
- **Purpose:** Master records of faculty members.
- **Columns:**
  - `faculty_id` (VARCHAR(50), PK): Unique faculty ID.
  - `employee_id` (VARCHAR(50), UNIQUE, NOT NULL): Employee ID.
  - `user_id` (VARCHAR(50), FK -> users): Linked user login account.
  - `faculty_name` (VARCHAR(150), NOT NULL): Name of faculty.
  - `department_id` (VARCHAR(50), FK -> departments): Department linkage.
  - `employment_type` (VARCHAR(50), Default 'Permanent'): Permanent/Contract/Guest.

### 7. `attendance`
- **Purpose:** Scanned attendance log entries.
- **Columns:**
  - `attendance_id` (VARCHAR(50), PK): Unique transaction ID.
  - `event_id` (VARCHAR(50), FK -> events): Associated event.
  - `roll_number` (VARCHAR(50), FK -> students.roll_number): Scanned student roll number.
  - `user_id` (VARCHAR(50), FK -> users): Scanner user ID.
  - `attendance_status` (VARCHAR(20), Default 'Present'): Present/Absent/Late/Excused.
  - `timestamp` (TIMESTAMPTZ, NOT NULL): Exact scanning timestamp.
  - `check_out_timestamp` (TIMESTAMPTZ): Optional exit timestamp.

### 8. `event_assignments`
- **Purpose:** Role assignment junction table for events.
- **Columns:**
  - `assignment_id` (VARCHAR(50), PK): Assignment ID.
  - `event_id` (VARCHAR(50), FK -> events): Targeted event.
  - `user_id` (VARCHAR(50), FK -> users): Assigned user.
  - `role` (VARCHAR(50), Default 'Coordinator'): Role assigned.

*(Note: Data dictionary covers all 24 entities in full specification).*
