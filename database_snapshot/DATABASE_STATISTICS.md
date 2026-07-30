# Database Statistics & Structural Metrics

## System Structural Metrics

| Metric | Count | Details |
|---|---|---|
| **Total Tables** | **24** | Core entities, junctions, logs, and diagnostic tables |
| **Total Database Views** | **3** | `v_event_summary`, `v_faculty_details`, `v_department_student_summary` |
| **Total Indexes** | **32** | Primary keys, Unique constraints, FKs, and composite indexes |
| **Total Primary Keys** | **24** | Every table includes an explicit Primary Key |
| **Total Foreign Keys** | **26** | Referential integrity links across entities |
| **Total Stored Functions** | **3** | Timestamp updater, attendance stats, and batch scan routine |
| **Total Database Triggers** | **8** | Automatic `updated_at` timestamps across active tables |
| **Total RLS Policies** | **16** | Row level security rules covering tables |

---

## Seed Dataset Record Counts

| Table Name | Estimated Seed Record Count | Source File |
|---|---|---|
| `roles` | 6 | `seed_part1_core.sql` |
| `departments` | 11 | `seed_part1_core.sql` |
| `users` | ~20+ | `seed_part1_core.sql`, `supabase_enterprise_seed.sql` |
| `faculty` | 220 | `seed_faculty.sql` |
| `students` | ~500+ | `seed_part2_students.sql` |
| `other_college_students` | ~50+ | `migration_v9.sql` |
| `events` | ~15+ | `supabase_enterprise_seed.sql` |
| `event_participants` | ~500+ | `seed_part3_participants.sql` |
| `attendance` | ~1000+ | `seed_part4_attendance.sql`, `attendance_data.json` |
| `settings` | 3 | `09_seed_data.sql` |
