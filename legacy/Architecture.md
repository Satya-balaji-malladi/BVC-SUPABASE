# BVC Engineering College Event Attendance Management System

## Software Architecture Blueprint (Version 1.0)

---

# 1. Project Overview

## Project Name

**BVC Engineering College Event Attendance Management System**

## Objective

Develop a web-based event attendance system using Google Apps Script and Google Sheets that enables Super Admin and Coordinators to manage college events and record student attendance using Roll Numbers or Barcode scanning.

---

# 2. Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript
* Bootstrap 5

### Backend

* Google Apps Script

### Database

* Google Sheets

### Development

* VS Code
* Antigravity
* clasp

### Version Control

* Git
* GitHub

---

# 3. User Roles

## Super Admin

Responsibilities

* Login
* Dashboard
* Manage Coordinators
* Manage Events
* View Attendance
* Export Reports
* System Settings

---

## Coordinator

Responsibilities

* Login
* Dashboard
* Select Event
* Scan Student ID
* Mark Attendance
* View Today's Attendance

---

# 4. MVP Features

* Login
* Role Based Access
* Student Database
* Event Database
* Attendance Recording
* Duplicate Attendance Prevention
* Reports
* Export PDF
* Export Excel

---

# 5. Google Sheets Database

## Users

* user_id
* username
* full_name
* email
* password
* role
* status
* created_at

---

## Students

* roll_number
* student_name
* department
* year
* section
* status

---

## Events

* event_id
* event_name
* event_date
* venue
* coordinator_id
* status

---

## Attendance

* attendance_id
* event_id
* roll_number
* attendance_time
* status

---

# 6. System Layers

Frontend (HtmlService)

↓

Api.js (Top-level google.script.run wrappers)

↓

Controller.js (API routing layer)

↓

Google Apps Script Services

↓

Database Service

↓

Google Sheets

Frontend never accesses Google Sheets directly.

---

# 7. Service Architecture

## Api.js

Purpose

Expose top-level wrapper functions for `google.script.run`.

Contains

* Global function wrappers for all Controller methods.

No business logic.

---

## Config.js

Purpose

Store all configuration values.

Contains

* Spreadsheet ID
* Sheet Names
* Roles
* Status
* Project Information

---

## Utils.js

Purpose

Reusable helper functions.

Contains

* Date Helpers
* Validation Helpers
* String Helpers
* Formatting Helpers

No database code.

---

## DatabaseService.js

Purpose

Google Sheets CRUD operations.

Contains

* Open Spreadsheet
* Get Sheet
* Insert
* Update
* Delete
* Read
* Search

No business logic.

---

## IdService.js

Purpose

Generate IDs.

Contains

* User ID
* Event ID
* Attendance ID

Uses DatabaseService.

---

## AuthService.js

Purpose

Authentication.

Contains

* Login
* Logout
* Session Validation

---

## UserService.js

Purpose

Coordinator Management.

Contains

* Add User
* Edit User
* Delete User
* Search User

---

## StudentService.js

Purpose

Student Management.

Contains

* Add Student
* Edit Student
* Delete Student
* Search Student

---

## EventService.js

Purpose

Event Management.

Contains

* Create Event
* Update Event
* Delete Event
* Assign Coordinator

---

## AttendanceService.js

Purpose

Attendance Operations.

Contains

* Mark Attendance
* Duplicate Check
* Attendance History

---

## ReportService.js

Purpose

Reports.

Contains

* Event Report
* Student Report
* PDF Export
* Excel Export

---

# 8. HTML Pages

* index.html
* login.html
* dashboard.html
* superAdmin.html
* coordinator.html
* sidebar.html
* navbar.html
* styles.html
* scripts.html

---

# 9. Data Flow

Login Page

↓

AuthService

↓

DatabaseService

↓

Google Sheets

Attendance

↓

AttendanceService

↓

IdService

↓

DatabaseService

↓

Google Sheets

Reports

↓

ReportService

↓

DatabaseService

↓

Google Sheets

---

# 10. ID Format

User

USR-001

Event

EVT-2026-001

Attendance

ATD-2026-000001

---

# 11. Naming Standards

Variables

camelCase

Functions

verbNoun

Examples

* loginUser()
* createEvent()
* markAttendance()

Constants

UPPER_CASE

Configuration

CONFIG.*

---

# 12. Development Workflow

1. Design
2. Architecture Review
3. Generate Code using Antigravity
4. Code Review
5. Test
6. Bug Fix
7. Commit
8. Next Module

---

# 13. Development Order

Phase 1

* Config
* Utils
* DatabaseService
* IdService

Phase 2

* AuthService

Phase 3

* UserService

Phase 4

* StudentService

Phase 5

* EventService

Phase 6

* AttendanceService

Phase 7

* ReportService

Phase 8

* Frontend UI

Phase 9

* Integration

Phase 10

* Testing

Phase 11

* Deployment

---

# 14. Project Rules

* One File = One Responsibility
* No Duplicate Code
* Use CONFIG everywhere
* Never hardcode Sheet Names
* Never access Google Sheets directly from UI
* Review every AI-generated file before accepting
* Build → Test → Fix → Next

---

# Version

Architecture Blueprint v1.0
