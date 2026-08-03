# Query Reference — JavaScript Service Mapping Matrix

This document maps the application's **JavaScript Database Layer (20 Service Files)** to the underlying PostgreSQL tables and RPC functions.

---

## Service File to Table Access Matrix

| Service File | Primary Tables Accessed | Operations Performed |
|---|---|---|
| `DatabaseService.js` | All Tables | Core Supabase REST client wrapper, generic CRUD, bulk insert/update, RPC invocation |
| `AnalyticsService.js` | `attendance`, `events`, `event_participants`, `departments` | Aggregates, counts, analytics queries, department participation metrics |
| `AttendanceService.js` | `attendance`, `event_participants`, `events`, `students` | Live barcode scan recording, undo attendance, duplicate check, attendance report fetching |
| `AttendanceQueueService.js` | `attendance` | Offline queue batching, chunked background sync to database |
| `AttendanceCorrectionService.js` | `attendance_corrections`, `attendance` | Correction request creation, approval/rejection workflows |
| `AuditService.js` | `audit_logs` | Audit trail creation, system operation logging, security event tracking |
| `AuthService.js` | `users`, `sessions`, `user_permissions` | Credential validation, password hash check, OTP generation, token creation, session logging |
| `CoordinatorService.js` | `event_assignments`, `users`, `guest_coordinators` | Coordinator role assignment, guest coordinator registration, permissions check |
| `DepartmentService.js` | `departments`, `faculty`, `students` | Department creation, HOD assignment, metrics updates |
| `EventService.js` | `events`, `event_templates`, `event_assignments` | Event creation, draft save, registration toggle, approval status update |
| `EnterpriseEventService.js` | `events`, `event_templates` | Advanced event configuration, template instantiation |
| `EventAdminService.js` | `events`, `event_assignments`, `users` | Event admin access controls, assignment overrides |
| `FacultyService.js` | `faculty`, `departments`, `users` | Faculty directory CRUD, HOD link, CSV batch import |
| `NotificationService.js` | `notifications`, `users` | Notification dispatch, read status updates |
| `ParticipantService.js` | `event_participants`, `students`, `other_college_students` | Event registration, spot registration, registration approval, certificate issuance |
| `ReportService.js` | `generated_reports`, `events`, `attendance` | Report generation logging, PDF/Excel metadata recording |
| `SessionService.js` | `sessions`, `users` | Session token validation, expiry update, logout timestamp update |
| `SettingsService.js` | `settings` | System settings key-value retrieval, setting updates |
| `StudentService.js` | `students`, `other_college_students`, `departments` | Student master record CRUD, batch student imports, roll number lookups |
| `UserService.js` | `users`, `user_permissions`, `roles` | User account lifecycle management, role assignment, password reset |

---

## Frequently Used RPCs & Aggregate Queries

1. **Barcode Scan Insertion & Participant Status Sync:**
   - Executed via `DatabaseService.js` -> `record_attendance_scan(...)` or direct Supabase `upsert()` on `attendance`.
2. **Event Attendance Percentage Calculator:**
   - Executed via `get_event_attendance_stats(p_event_id)`.
3. **Session Token Validation:**
   - Executed on every authenticated API request via `sessions` table query filtering `session_token = token AND session_status = 'Active' AND expiry_time > NOW()`.
