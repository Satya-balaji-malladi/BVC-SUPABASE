-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — WIPE ALL DATA EXCEPT SUPER ADMINS
-- =============================================================================

-- 1. Truncate existing data tables safely if present
DO $$ 
BEGIN
    IF to_regclass('public.attendance') IS NOT NULL THEN TRUNCATE TABLE attendance CASCADE; END IF;
    IF to_regclass('public.event_participants') IS NOT NULL THEN TRUNCATE TABLE event_participants CASCADE; END IF;
    IF to_regclass('public.event_assignments') IS NOT NULL THEN TRUNCATE TABLE event_assignments CASCADE; END IF;
    IF to_regclass('public.department_hods') IS NOT NULL THEN TRUNCATE TABLE department_hods CASCADE; END IF;
    IF to_regclass('public.audit_logs') IS NOT NULL THEN TRUNCATE TABLE audit_logs CASCADE; END IF;
    IF to_regclass('public.notifications') IS NOT NULL THEN TRUNCATE TABLE notifications CASCADE; END IF;
    IF to_regclass('public.students') IS NOT NULL THEN TRUNCATE TABLE students CASCADE; END IF;
    IF to_regclass('public.events') IS NOT NULL THEN TRUNCATE TABLE events CASCADE; END IF;
END $$;

-- 2. Delete non-Super Admin accounts safely from master users table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'default_role') THEN
        DELETE FROM users WHERE LOWER(COALESCE(role, '')) NOT IN ('superadmin', 'super admin', 'super_admin') 
                            AND LOWER(COALESCE(default_role, '')) NOT IN ('superadmin', 'super admin', 'super_admin');
    ELSE
        DELETE FROM users WHERE LOWER(COALESCE(role, '')) NOT IN ('superadmin', 'super admin', 'super_admin');
    END IF;
END $$;

-- 3. Delete non-system departments (keep existing ones intact)
-- ON CONFLICT clauses in seed script will auto-update or insert missing ones.

SELECT 'Database successfully wiped! Super Admin accounts preserved.' AS status;
