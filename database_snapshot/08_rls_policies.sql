-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — DATABASE SNAPSHOT (PART 08: RLS POLICIES)
-- Target Database: Supabase PostgreSQL 15+
-- Generated Date: 2026-07-30
-- Description: Supabase Row Level Security (RLS) policies for table security.
-- =============================================================================

-- ENABLE RLS ON ALL CORE TABLES
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE other_college_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_coordinators ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_history ENABLE ROW LEVEL SECURITY;

-- 1. PUBLIC READ ACCESS FOR GENERAL ANONYMOUS / AUTHENTICATED USERS (READ-ONLY LOOKUPS)
CREATE POLICY "Allow public read access on departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Allow public read access on settings" ON settings FOR SELECT USING (true);

-- 2. SERVICE ROLE / ADMIN ALL ACCESS POLICY (DEFAULT FALLBACK FOR SERVICE KEY & ANON API SETUP)
CREATE POLICY "Allow full access for authenticated service roles on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow full access for authenticated service roles on students" ON students FOR ALL USING (true);
CREATE POLICY "Allow full access for authenticated service roles on other_students" ON other_college_students FOR ALL USING (true);
CREATE POLICY "Allow full access for authenticated service roles on faculty" ON faculty FOR ALL USING (true);
CREATE POLICY "Allow full access for authenticated service roles on events" ON events FOR ALL USING (true);
CREATE POLICY "Allow full access for authenticated service roles on event_assignments" ON event_assignments FOR ALL USING (true);
CREATE POLICY "Allow full access for authenticated service roles on event_participants" ON event_participants FOR ALL USING (true);
CREATE POLICY "Allow full access for authenticated service roles on attendance" ON attendance FOR ALL USING (true);
CREATE POLICY "Allow full access for authenticated service roles on attendance_corrections" ON attendance_corrections FOR ALL USING (true);
CREATE POLICY "Allow full access for authenticated service roles on audit_logs" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow full access for authenticated service roles on notifications" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow full access for authenticated service roles on sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow full access for authenticated service roles on export_templates" ON export_templates FOR ALL USING (true);
CREATE POLICY "Allow full access for authenticated service roles on test_history" ON test_history FOR ALL USING (true);
