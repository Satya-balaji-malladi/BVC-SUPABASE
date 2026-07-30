# Table Relationships & Entity Dependencies

## Relationship Cardinality Registry

### 1. One-to-Many (1:N) Relationships

* **`departments (1)` -> `students (N)`**:
  - FK: `students.department_id` references `departments.department_id`.
  - Rule: `ON DELETE SET NULL`. If a department is deleted, student records remain intact with NULL department reference.

* **`departments (1)` -> `faculty (N)`**:
  - FK: `faculty.department_id` references `departments.department_id`.
  - Rule: `ON DELETE CASCADE`.

* **`users (1)` -> `events (N)`**:
  - FK: `events.organizer` references `users.user_id`.
  - Rule: `ON DELETE SET NULL`.

* **`events (1)` -> `attendance (N)`**:
  - FK: `attendance.event_id` references `events.event_id`.
  - Rule: `ON DELETE CASCADE`.

* **`events (1)` -> `event_participants (N)`**:
  - FK: `event_participants.event_id` references `events.event_id`.
  - Rule: `ON DELETE CASCADE`.

* **`students (1)` -> `attendance (N)`**:
  - FK: `attendance.roll_number` references `students.roll_number`.
  - Rule: `ON DELETE CASCADE`.

* **`users (1)` -> `sessions (N)`**:
  - FK: `sessions.user_id` references `users.user_id`.
  - Rule: `ON DELETE CASCADE`.

* **`users (1)` -> `audit_logs (N)`**:
  - Linked by `audit_logs.user_id`.

* **`users (1)` -> `notifications (N)`**:
  - FK: `notifications.user_id` references `users.user_id`.
  - Rule: `ON DELETE CASCADE`.

---

### 2. Many-to-Many (M:N) Junction Relationships

* **`events` <-> `users` (via `event_assignments`)**:
  - Links events to assigned coordinators and event admins with specific RBAC roles.
  - Foreign Keys: `event_assignments.event_id` -> `events.event_id`, `event_assignments.user_id` -> `users.user_id`.
  - Unique Constraint: `(event_id, user_id, role)`.

* **`departments` <-> `users` (via `department_hods`)**:
  - Links departments to HOD users.
  - Foreign Keys: `department_hods.department_id` -> `departments.department_id`, `department_hods.user_id` -> `users.user_id`.

---

### 3. One-to-One (1:1) Relationships

* **`users (1)` <-> `guest_coordinators (1)`**:
  - Unique foreign key `guest_coordinators.user_id` references `users.user_id`.
