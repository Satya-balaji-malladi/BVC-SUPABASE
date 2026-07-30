# BVC Engineering College Event Attendance System — Database Documentation

## Overview

This repository snapshot provides a comprehensive, offline-accessible, offline-executable, and completely isolated reconstruction of the PostgreSQL database backing the **BVC Event Attendance System**.

---

## Database Architecture

- **Engine:** PostgreSQL 15+ (Hosted on Supabase Cloud)
- **Primary Schema:** `public`
- **Total Tables:** 24
- **Primary Access Method:** RESTful PostgREST APIs via `@supabase/supabase-js` client in Google Apps Script / Web Interface
- **Authentication:** Custom JWT-based user table session tokens & bcrypt password hashing

---

## Directory & File Layout

| File Name | Description |
|---|---|
| `01_schema.sql` | PostgreSQL extensions setup, teardown scripts, and PostgREST notification reloads |
| `02_tables.sql` | Complete DDL statements (`CREATE TABLE IF NOT EXISTS`) for all 24 entities |
| `03_constraints.sql` | Primary Keys, Foreign Keys, Unique Constraints, and Check Constraints |
| `04_indexes.sql` | B-tree performance indexes for query optimization |
| `05_functions.sql` | Stored procedures, PL/pgSQL utility routines, and statistics generators |
| `06_triggers.sql` | Automatic `updated_at` timestamp triggers |
| `07_views.sql` | Analytical and reporting view models (`v_event_summary`, `v_faculty_details`, etc.) |
| `08_rls_policies.sql` | Supabase Row Level Security policies |
| `09_seed_data.sql` | Core system initial data (Roles, Departments, Super Admin) |
| `10_complete_database.sql` | **Single-file master setup script** combining 01 through 09 |
| `DATABASE_DOCUMENTATION.md` | System architectural overview and execution instructions |
| `DATA_DICTIONARY.md` | Full field-by-field matrix covering all 24 database tables |
| `ER_DIAGRAM.md` | Mermaid Entity-Relationship diagram |
| `DATABASE_VALIDATION.md` | Quality audit report covering type safety, edge cases, and query checks |
| `DATABASE_STATISTICS.md` | Structural metrics and quantitative metrics |
| `QUERY_REFERENCE.md` | Mapping between JavaScript service methods and database tables |
| `TABLE_RELATIONSHIPS.md` | Cardinality registry (1:1, 1:N, M:N) and foreign key specifications |

---

## Execution Guide

To recreate the entire database on a fresh Supabase or PostgreSQL instance:

1. Open your **Supabase SQL Editor** or connect via `psql`.
2. Run `10_complete_database.sql`.
3. Verify that all 24 tables, indexes, and triggers were created successfully.
