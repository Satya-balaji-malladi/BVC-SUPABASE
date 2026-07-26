# BVC Engineering College Event Attendance Management System
## Database Schema Reference Manual (Version 2.0.1)

This document serves as the single source of truth and permanent knowledge base for the database architecture of the **BVC Engineering College Event Attendance Management System**. It is designed to guide future debugging, manual testing, security audits, and code reviews. 

All services and developers must consult this document before reviewing or altering any service in this system.

---

## 1. Project Overview

### Purpose
The database stores and manages the data necessary to record student attendance at college events using barcode scanning or manual entry. It handles student profiles, academic departments, event scheduling, coordinator assignments, participant rosters, user sessions, system settings, notifications, and security audit logs.

### Database Engine
The system uses **Google Sheets** as its primary database. 
* Each worksheet (tab) in the workbook represents a single **Logical Table**.
* Columns in the sheet represent **Fields**, where row 1 contains exact header string texts mapping to fields.
* Rows in the sheet represent **Records**.
* Row insertion and cell updates are persistent CRUD operations.

### Data Access Contract
To prevent race conditions, spreadsheet corruption, and security bypasses:
1. **No direct sheet access**: Client-side (frontend) components must never access Google Sheets directly.
2. **Database Service Gatekeeper**: All backend services must communicate with the spreadsheet exclusively via [DatabaseService.js](file:///c:/Users/DELL/Desktop/BVC-Event-Attendance-System/DatabaseService.js).
3. **Transaction Locking**: Write operations (`insertRows`, `updateRow`, etc.) utilize the Apps Script `LockService.getScriptLock()` with a 10-second timeout to handle concurrency safely.
4. **Active Filtering**: The database service uses a soft-deletion pattern utilizing a `Deletion Flag` column. Active queries default to filtering out soft-deleted records.

---

## 2. Database Architecture

### Table Catalog
The database consists of the following 12 sheets:

| Sheet Name / CONFIG Key | Logical Entity Name | Description |
| :--- | :--- | :--- |
| `Students` | Students | Stores student profiles, academic progress, and enrollment details. |
| `Users` | Users | Stores internal system users (Super Admins, Coordinators) and authentication configs. |
| `EventCoordinators` | EventCoordinators | Maps and associates coordinators (Users) to specific events. |
| `Notifications` | Notifications | Holds user-facing popup notifications (Schema is currently pending/empty). |
| `GeneratedReports` | GeneratedReports | Tracks generated event reports (PDF, Excel, CSV) and download frequencies. |
| `EventParticipants` | EventParticipants | Tracks registrations, attendance statuses, and certifications for students. |
| `Sessions` | Sessions | Stores active tokens, device details, and expiration timestamps for logins. |
| `Attendance` | Attendance | Records barcode or manual scans indicating presence at an event. |
| `Events` | Events | Contains details of scheduled events, capacities, locations, and status. |
| `Departments` | Departments | Represents college departments (e.g. CSE, ECE) hosting events. |
| `Settings` | Settings | Key-value store containing global configurations and options. |
| `AuditLogs` | AuditLogs | Stores security log details of actions, changes, modules, and execution times. |

### Relationship Diagram
The relationships between tables are structured hierarchically below:

```text
Departments
      │
      ├──────── Students
      │
      ├──────── Users
      │
      └──────── Events

Events
      │
      ├──────── Attendance
      │
      ├──────── EventParticipants
      │
      └──────── EventCoordinators

Users
      │
      ├──────── Sessions
      ├──────── AuditLogs
      └──────── Notifications
```

---

## 3. Table Definitions & Complete Schema

This section defines every table's purpose, keys, related tables, expected sizing, data types, nullability, and associated business rules.

---

### Table: Departments

* **Purpose**: Stores the academic departments at BVC Engineering College.
* **Primary Key**: `Department ID` (Format: `DEP` followed by 3 digits, e.g., `DEP001`).
* **Expected Record Count**: 8 - 20 records (representing academic departments like CSE, ECE, Mechanical, etc.).
* **Related Tables**: `Students` (one-to-many), `Users` (one-to-many), `Events` (one-to-many).

#### Schema Columns

| Column Header Text | Data Type | Nullable | Description / Business Rules |
| :--- | :--- | :--- | :--- |
| **Department ID** | String | No | Primary Key. System generated (e.g., `DEP001`). |
| **Department Code** | String | No | Unique code (e.g., `CSE`, `ECE`). Regex validation: `/^[A-Z]{2,4}[0-9]{0,3}[A-Za-z\-]*$/`. |
| **Department Name** | String | No | Full name of the department (e.g., `Computer Science and Engineering`). |
| **Short Name** | String | Yes | Abbreviated name (e.g., `CSE`). |
| **HOD Name** | String | Yes | Name of the Head of Department. |
| **HOD Employee ID** | String | Yes | Employee ID of the HOD. |
| **Total Students** | Integer | Yes | Roll-up count. Set to 0 on creation. Updated dynamically. |
| **Total Coordinators**| Integer | Yes | Roll-up count. Set to 0 on creation. Updated dynamically. |
| **Total Events Hosted**| Integer | Yes | Roll-up count. Set to 0 on creation. Updated dynamically. |
| **Total Participants** | Integer | Yes | Roll-up count. Set to 0 on creation. Updated dynamically. |
| **Status** | String | No | Active or Inactive (`Active` / `Inactive`). |
| **Created By** | String | Yes | Author user/identifier. |
| **Created At** | Timestamp | Yes | ISO 8601 string when record was created. |
| **Updated By** | String | Yes | Last updater user/identifier. |
| **Updated At** | Timestamp | Yes | ISO 8601 string of last update. |
| **Remarks** | String | Yes | Context notes. |
| **Deletion Flag** | Boolean | No | Soft-delete flag (`true` / `false`). |

---

### Table: Students

* **Purpose**: Stores profiles of college students enrolled in academic programs.
* **Primary Key**: `Student ID` (System generated prefix `STU` + 5 digits) is the internal PK. However, `Roll Number` acts as the unique business identifier used in foreign key relationships.
* **Expected Record Count**: 2,000 - 6,000 active students.
* **Related Tables**: `Departments` (Foreign Key: `Department ID`), `Attendance` (Roll Number referenced in logs), `EventParticipants` (Roll Number referenced in registrations).

#### Schema Columns

| Column Header Text | Data Type | Nullable | Description / Business Rules |
| :--- | :--- | :--- | :--- |
| **Roll Number** | String | No | Unique Business Key. Regex validation: `/^[0-9]{2}A9[15][A-Za-z][0-9A-Za-z]{4}$/` (e.g., `22A91A0501`). |
| **Student Name** | String | No | Full name of the student. |
| **Email Address** | String | Yes | College email. Regex validation: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. |
| **Year** | Integer | No | Year of study (`1`, `2`, `3`, `4`). Regex validation: `/^[1-4]$/`. |
| **Semester** | Integer | Yes | Semester number (`1` or `2`). |
| **Section** | String | No | Class section (`A`, `B`, `C`). Regex validation: `/^[A-C]$/`. |
| **Gender** | String | Yes | `Male` or `Female`. |
| **Student Status** | String | No | Status (`Active` / `Inactive`). Default is `Active`. |
| **Phone Number** | String | Yes | 10-digit mobile number. Regex validation: `/^[0-9]{10}$/`. |
| **Department ID** | String | No | Foreign Key pointing to `Departments.Department ID`. |
| **Guardian Name** | String | Yes | Parent or guardian's full name. |
| **Date of Birth** | Date | Yes | DOB format `yyyy-MM-dd`. |
| **Enrollment Date** | Date | Yes | Admission date format `yyyy-MM-dd`. |
| **Last Updated At** | Timestamp | Yes | ISO 8601 string of last update. |
| **Notes** | String | Yes | Supplementary student comments. |
| **College** | String | Yes | Student's institution name (e.g., Bonam Venkata Chalamayya Engineering College). |

---

### Table: Users

* **Purpose**: Contains internal system users including administrators and faculty coordinators.
* **Primary Key**: `User ID` (Format: `USR` followed by 4 digits, e.g., `USR0001`).
* **Expected Record Count**: 20 - 100 entries.
* **Related Tables**: `EventCoordinators` (User ID references), `Sessions` (User ID references), `AuditLogs` (User ID references), `Notifications` (User ID references).

#### Schema Columns

| Column Header Text | Data Type | Nullable | Description / Business Rules |
| :--- | :--- | :--- | :--- |
| **User ID** | String | No | Primary Key. System generated (e.g., `USR0001`). |
| **Employee ID** | String | No | Unique institution ID (e.g., `EMP1001`). |
| **First Name** | String | No | User's first name. |
| **Last Name** | String | No | User's last name. |
| **Email Address** | String | No | Unique contact email. |
| **Phone Number** | String | Yes | 10-digit mobile number. |
| **Department** | String | Yes | Division code (e.g., `CSE`, `ECE`). |
| **Title/Designation** | String | Yes | Academic designation (e.g., `Assistant Professor`). |
| **Username** | String | No | Unique login username. Regex validation: `/^[a-zA-Z0-9_\-]{3,32}$/`. |
| **Password Hash** | String | No | SHA-256 hashed password. |
| **Salt** | String | No | Hashing salt. |
| **Authentication Provider**| String | Yes | Authentication protocol (`Local` by default). |
| **First Login** | Boolean | No | Forces password reset on first login (`true` / `false`). |
| **Role** | String | No | Role designation (`Admin` or `Coordinator`). |
| **Status** | String | No | Active or Inactive (`Active` / `Inactive`). |
| **Profile Picture URL** | String | Yes | URL path to profile photo. |
| **Failed Login Attempts**| Integer | No | Counter of sequential failed logins. Default 0. Locks at 15. |
| **Account Locked** | Boolean | No | Account lock status (`true` / `false`). |
| **Last Login Timestamp** | Timestamp | Yes | ISO 8601 timestamp of last login. |
| **Last Logout Timestamp**| Timestamp | Yes | ISO 8601 timestamp of last logout. |
| **Password Reset Required**| Boolean | No | Force password change status (`true` / `false`). |
| **Password Last Changed**| Timestamp | Yes | ISO 8601 timestamp of last password alteration. |
| **Password Expiry Date** | Timestamp | Yes | ISO 8601 date when password expires. |
| **Two-Factor Enabled** | Boolean | No | 2FA state (`true` / `false`). |
| **Two-Factor Secret** | String | Yes | 2FA secret key. |
| **OTP** | String | Yes | Dynamic OTP code. |
| **OTP Expiry** | Timestamp | Yes | ISO 8601 timestamp of OTP expiration. |
| **OTP Attempts** | Integer | No | Counter of OTP attempts. Locked after 10. |
| **Popup Notifications** | Boolean | No | User UI flag (`true` / `false`). |
| **Notification Sound** | Boolean | No | User audio preference (`true` / `false`). |
| **Theme Preference** | String | No | UI preference (e.g., `Default`, `Dark`). |
| **Language** | String | No | Language locality code (default `en-IN`). |
| **Timezone** | String | No | Clock timezone setting (default `Asia/Kolkata`). |
| **Bio/Notes** | String | Yes | Short text biography. |
| **Created By** | String | Yes | Creator identifier. |
| **Created At** | Timestamp | Yes | ISO 8601 timestamp of creation. |
| **Updated By** | String | Yes | Updater identifier. |
| **Updated At** | Timestamp | Yes | ISO 8601 timestamp of last edit. |
| **Deletion Flag** | Boolean | No | Soft-delete flag (`true` / `false`). |

---

### Table: Events

* **Purpose**: Stores details of events hosted on campus.
* **Primary Key**: `Event ID` (Format: `EVT-YYYY-XXXX` where `YYYY` is year and `XXXX` is a 4-digit sequence, e.g., `EVT-2026-0001`).
* **Expected Record Count**: 50 - 200 events annually.
* **Related Tables**: `Departments` (Foreign Key: `Organizer`), `EventCoordinators` (referenced by Event ID), `Attendance` (referenced by Event ID), `EventParticipants` (referenced by Event ID), `GeneratedReports` (referenced by Event ID).

#### Schema Columns

| Column Header Text | Data Type | Nullable | Description / Business Rules |
| :--- | :--- | :--- | :--- |
| **Event ID** | String | No | Primary Key. System generated (e.g., `EVT-2026-0001`). |
| **Event Name** | String | No | Name of the event. |
| **Description** | String | Yes | Descriptive text about target activities. |
| **Location** | String | Yes | Venue room or arena (e.g. `Seminar Hall 1`). |
| **Event Category** | String | Yes | Category classification (e.g. `Technical`, `Seminar`). |
| **Organizer** | String | No | Foreign Key pointing to `Departments.Department ID`. |
| **Start Date** | Date | No | Format `yyyy-MM-dd`. Must be $\le$ End Date. |
| **End Date** | Date | No | Format `yyyy-MM-dd`. Must be $\ge$ Start Date. |
| **Start Time** | Time | No | Format `HH:mm:ss`. Must be before End Time on same day. |
| **End Time** | Time | No | Format `HH:mm:ss`. Must be after Start Time on same day. |
| **Attendance Type** | String | Yes | Attendance policy schema (e.g., `Single Scan`, `Double Scan`). |
| **Barcode Attendance** | Boolean | No | Is barcode scanner allowed? (`true` / `false`). |
| **Manual Attendance** | Boolean | No | Is manual register listing allowed? (`true` / `false`). |
| **Capacity** | Integer | Yes | Maximum allowed headcount. |
| **Registered Count** | Integer | No | Running counter of registered participants. |
| **Event Status** | String | No | `Draft`, `Upcoming`, `Active`, `Stopped`, `Completed`, `Cancelled`. |
| **Report Generated** | Boolean | No | Has report finalized? (`true` / `false`). |
| **Report Date** | Date | Yes | Date report was triggered. |
| **Remarks** | String | Yes | Closure remarks or audit notes. |
| **Created At** | Timestamp | Yes | ISO 8601 creation date/time. |
| **Updated At** | Timestamp | Yes | ISO 8601 update date/time. |
| **Last Attendance Sync** | Timestamp | Yes | Last time local cache sync ran. |
| **Notes** | String | Yes | Additional event planning comments. |

---

### Table: EventCoordinators

* **Purpose**: Maps faculty/student coordinators to the events they are authorized to manage.
* **Primary Key**: `Assignment ID` (Format: `ASN` + 5 digits, e.g. `ASN00001`).
* **Expected Record Count**: 100 - 500 records.
* **Related Tables**: `Events` (Foreign Key: `Event ID`), `Users` (Foreign Key: `User ID`).

#### Schema Columns

| Column Header Text | Data Type | Nullable | Description / Business Rules |
| :--- | :--- | :--- | :--- |
| **Assignment ID** | String | No | Primary Key. System generated (e.g., `ASN00001`). |
| **Event ID** | String | No | Foreign Key pointing to `Events.Event ID`. |
| **User ID** | String | No | Foreign Key pointing to `Users.User ID`. |
| **Assignment Role** | String | Yes | Coordinator duty (e.g., `Lead Coordinator`, `Assistant`). |
| **Assignment Status** | String | Yes | Coordinator status (`Active` / `Inactive`). |
| **Assigned By** | String | Yes | Admin User ID who designated the assignment. |
| **Assigned Date** | Date | Yes | Format `yyyy-MM-dd`. |
| **Updated By** | String | Yes | User ID of editor. |
| **Updated Date** | Date | Yes | Format `yyyy-MM-dd`. |
| **Remarks** | String | Yes | Coordinator-specific remarks. |

---

### Table: EventParticipants

* **Purpose**: Records registrations and statuses of students participating in specific events.
* **Primary Key**: `Participant ID` (Format: `ASN` + 5 digits / sequential).
* **Expected Record Count**: 1,000 - 10,000 records.
* **Related Tables**: `Events` (Foreign Key: `Event ID`), `Students` (Foreign Key: `Roll Number`).

#### Schema Columns

| Column Header Text | Data Type | Nullable | Description / Business Rules |
| :--- | :--- | :--- | :--- |
| **Participant ID** | String | No | Primary Key. System generated (e.g., `ASN00004`). |
| **Event ID** | String | No | Foreign Key pointing to `Events.Event ID`. |
| **Roll Number** | String | No | Foreign Key pointing to `Students.Roll Number`. |
| **Registration Type** | String | Yes | Registration channel (e.g., `Self`, `Invited`). |
| **Registration Status**| String | Yes | Registration state (e.g., `Active`, `Cancelled`). |
| **Attendance Status** | String | Yes | Presence state (`Present`, `Absent`). |
| **Approval Status** | String | Yes | Registration approval (`Approved`, `Pending`, `Rejected`). |
| **Approved By** | String | Yes | User ID of approver. |
| **Registration Date** | Date | Yes | Date registered `yyyy-MM-dd`. |
| **Registration Time** | Time | Yes | Time registered `HH:mm:ss`. |
| **Registration Timestamp**| Timestamp | Yes | Complete ISO 8601 registration timestamp. |
| **Attendance Timestamp**| Timestamp | Yes | ISO 8601 timestamp when student checked in. |
| **Certificate Issued** | Boolean | No | Certificate status (`true` / `false`). |
| **Certificate ID** | String | Yes | Generated certification serial ID. |
| **Created At** | Timestamp | Yes | ISO 8601 timestamp. |
| **Updated At** | Timestamp | Yes | ISO 8601 timestamp. |
| **Created By** | String | Yes | Creator User ID. |
| **Deletion Flag** | Boolean | No | Soft-delete flag (`true` / `false`). |
| **Last Action** | String | Yes | Logging string of last action (e.g., `Scanned`). |
| **Remarks** | String | Yes | Custom registration remarks. |
| **Last Sync Timestamp** | Timestamp | Yes | External cache synchronization time. |

---

### Table: Attendance

* **Purpose**: Records individual attendance scan details.
* **Primary Key**: `Attendance ID` (Format: `ATT-YYYY-XXXXXX` where `YYYY` is year, `XXXXXX` is a 6-digit sequence, e.g. `ATT-2026-000001`).
* **Expected Record Count**: 10,000 - 50,000 logs.
* **Related Tables**: `Events` (Foreign Key: `Event ID`), `Students` (Foreign Key: `Roll Number`), `Users` (Foreign Key: `User ID` of the scanner).

#### Schema Columns

| Column Header Text | Data Type | Nullable | Description / Business Rules |
| :--- | :--- | :--- | :--- |
| **Attendance ID** | String | No | Primary Key. System generated (e.g., `ATT-2026-000001`). |
| **Event ID** | String | No | Foreign Key pointing to `Events.Event ID`. |
| **Roll Number** | String | No | Foreign Key pointing to `Students.Roll Number`. |
| **User ID** | String | No | Coordinator/Admin User ID marking check-in. |
| **Attendance Status** | String | No | Check-in status (`Present` / `Absent`). |
| **Attendance Method** | String | No | Capture format (`Barcode` / `Manual`). |
| **Date** | Date | No | Local check-in date `yyyy-MM-dd`. |
| **Time** | Time | No | Local check-in time `HH:mm:ss`. |
| **Timestamp** | Timestamp | No | ISO 8601 time tracking marker. |
| **Is Undo** | Boolean | No | Has action been reversed (`true` / `false`). |
| **Undo Reason** | String | Yes | Explanation for undo action. |
| **Undo Timestamp** | Timestamp | Yes | Time when reversal was authorized. |
| **Correction Requested**| Boolean | No | Has correction ticket been submitted (`true` / `false`). |
| **Correction Status** | String | Yes | Correction status (e.g., `Pending`, `Approved`). |
| **Correction Reason** | String | Yes | Reason for correction request. |
| **Correction Handled By**| String | Yes | User ID who processed the correction. |
| **Location** | String | Yes | Physical site details / Coordinates. |
| **Remarks** | String | Yes | Miscellaneous audit logs. |
| **Created At** | Timestamp | Yes | ISO 8601 timestamp. |
| **Updated At** | Timestamp | Yes | ISO 8601 timestamp. |
| **Sync Status** | String | Yes | External hardware synchronizing state. |

---

### Table: Sessions

* **Purpose**: Tracks user login sessions, API tokens, and client details.
* **Primary Key**: `Session ID` (Format: `SES` + 6 digits, e.g. `SES000001`).
* **Expected Record Count**: 1,000 - 5,000 historical records.
* **Related Tables**: `Users` (Foreign Key: `User ID`).

#### Schema Columns

| Column Header Text | Data Type | Nullable | Description / Business Rules |
| :--- | :--- | :--- | :--- |
| **Session ID** | String | No | Primary Key. System generated (e.g., `SES000001`). |
| **User ID** | String | No | Foreign Key pointing to `Users.User ID`. |
| **Username** | String | No | User's login name. |
| **Login Timestamp** | Timestamp | No | Session start time. |
| **Last Activity Timestamp**| Timestamp | No | Last user interaction time. |
| **Expiry Time** | Timestamp | No | Calculated expiration time. Default is login time + 480 mins. |
| **Logout Timestamp** | Timestamp | Yes | Session termination timestamp. |
| **Session Status** | String | No | `Active`, `Expired`, `Logged Out`. |
| **IP Address** | String | Yes | Client device IP. |
| **User Agent** | String | Yes | Browser User Agent string. |
| **Device Type** | String | Yes | Device classification (e.g., `Desktop`, `Mobile`). |
| **OS** | String | Yes | Client operating system. |
| **Browser** | String | Yes | Client browser. |
| **Location** | String | Yes | Geolocation details. |
| **Login Method** | String | Yes | Authentication channel (`Local`). |
| **Session Token** | String | No | Unique authorization token hash. |
| **Created By** | String | Yes | Creator identifier. |
| **Created At** | Timestamp | Yes | ISO 8601 creation timestamp. |
| **Updated By** | String | Yes | Updater identifier. |
| **Updated At** | Timestamp | Yes | ISO 8601 update timestamp. |
| **Deletion Flag** | Boolean | No | Soft-delete flag (`true` / `false`). |
| **Remarks** | String | Yes | Additional logs or audit context. |

---

### Table: GeneratedReports

* **Purpose**: Tracks compiled event attendance sheets and exports.
* **Primary Key**: `Report ID` (Format: `RPT` + 6 digits, e.g. `RPT000001`).
* **Expected Record Count**: 100 - 1,000 entries.
* **Related Tables**: `Events` (Foreign Key: `Event ID`), `Users` (Foreign Key: `Generated By User ID`).

#### Schema Columns

| Column Header Text | Data Type | Nullable | Description / Business Rules |
| :--- | :--- | :--- | :--- |
| **Report ID** | String | No | Primary Key. System generated (e.g., `RPT000001`). |
| **Event ID** | String | No | Foreign Key pointing to `Events.Event ID`. |
| **Generated By User ID**| String | No | Foreign Key pointing to `Users.User ID`. |
| **Report Name** | String | No | Name of file / report. |
| **Report Type** | String | Yes | Report category (e.g., `Attendance`). |
| **Generated Date** | Date | No | Format `yyyy-MM-dd`. |
| **Generated Time** | Time | Yes | Format `HH:mm:ss`. |
| **Generated Timestamp** | Timestamp | Yes | ISO 8601 creation stamp. |
| **Report Status** | String | No | Status (`Pending`, `Generated`, `Failed`). |
| **PDF Available** | Boolean | No | Is PDF format generated? (`true` / `false`). |
| **Excel Available** | Boolean | No | Is Excel format generated? (`true` / `false`). |
| **CSV Available** | Boolean | No | Is CSV format generated? (`true` / `false`). |
| **Print Available** | Boolean | No | Is hard-copy printer layout ready? (`true` / `false`). |
| **Total Downloads** | Integer | No | Download counter. Default is 0. |
| **Last Downloaded By** | String | Yes | User ID of downloader. |
| **Last Downloaded Date**| Date | Yes | Format `yyyy-MM-dd`. |
| **File Path** | String | Yes | Link/Identifier to target storage file in Drive. |
| **Remarks** | String | Yes | Generation notes. |

---

### Table: Settings

* **Purpose**: Global key-value configurations.
* **Primary Key**: `Setting ID` (Prefix `SET` + 3 digits, e.g. `SET001`).
* **Expected Record Count**: 10 - 50 records.
* **Related Tables**: None.

#### Schema Columns

| Column Header Text | Data Type | Nullable | Description / Business Rules |
| :--- | :--- | :--- | :--- |
| **Setting ID** | String | No | Primary Key. System generated (e.g., `SET001`). |
| **Category** | String | No | Section categorization (e.g. `System`, `Security`). |
| **Key** | String | No | Unique identification key (e.g., `COLLEGE_NAME`). |
| **Value** | String | No | Stored configuration setting value. |
| **Data Type** | String | No | Target value variable type (`String`, `Integer`, `Boolean`). |
| **Description** | String | Yes | Description of what the configuration controls. |
| **Editable** | Boolean | No | Can it be modified by admins? (`true` / `false`). |
| **Status** | String | No | Setting status (`Active` / `Inactive`). |
| **Created By** | String | Yes | Creator User ID. |
| **Created At** | Timestamp | Yes | ISO 8601 creation stamp. |
| **Updated By** | String | Yes | Updater User ID. |
| **Updated At** | Timestamp | Yes | ISO 8601 update stamp. |
| **Notes** | String | Yes | Administrative notes. |

---

### Table: AuditLogs

* **Purpose**: Records administrative operations and system exceptions.
* **Primary Key**: `Log ID` (Format: `LOG` + 6 digits, e.g. `LOG000001`).
* **Expected Record Count**: 10,000 - 100,000 logs.
* **Related Tables**: `Users` (Foreign Key: `User ID`).

#### Schema Columns

| Column Header Text | Data Type | Nullable | Description / Business Rules |
| :--- | :--- | :--- | :--- |
| **Log ID** | String | No | Primary Key. System generated (e.g., `LOG000001`). |
| **User ID** | String | No | Foreign Key pointing to `Users.User ID` of executor. |
| **Employee ID** | String | Yes | Copied user Employee ID. |
| **Username** | String | No | Copied user login handle. |
| **Module** | String | No | Active file/service module (e.g., `StudentService`). |
| **Action** | String | No | Event description (e.g., `CREATE_STUDENT`, `LOGIN`). |
| **Record ID** | String | Yes | Impacted primary key reference (e.g., `STU00001`). |
| **Record Type** | String | Yes | Impacted logical entity type (e.g., `Student`). |
| **Description** | String | No | Descriptive summary of action. |
| **Old Value** | String | Yes | JSON text representation of fields prior to modification. |
| **New Value** | String | Yes | JSON text representation of fields after modification. |
| **Status** | String | No | Result of transaction execution (`SUCCESS` or `FAILED`). |
| **IP Address** | String | Yes | IP of executing system. |
| **Device** | String | Yes | Executing hardware device. |
| **Browser** | String | Yes | Client browser identifier. |
| **Location** | String | Yes | Location details. |
| **Session ID** | String | Yes | Target login session key. |
| **Session Token** | String | Yes | Session token. |
| **Error Message** | String | Yes | Trapped logic script stack trace / message. |
| **Execution Time (ms)**| Integer | Yes | Milliseconds elapsed during service run. |
| **Created By** | String | Yes | Creator User ID (default `System`). |
| **Created At** | Timestamp | Yes | ISO 8601 timestamp. |
| **Updated By** | String | Yes | Updater User ID. |
| **Updated At** | Timestamp | Yes | ISO 8601 timestamp. |
| **Deletion Flag** | Boolean | No | Soft-delete flag (`true` / `false`). |
| **Remarks** | String | Yes | Security auditing notes. |

---

### Table: Notifications

* **Purpose**: Stores push notifications and user alert histories.
* **Primary Key**: `Notification ID` (Format: `NOT` + 6 digits, e.g., `NOT000001`).
* **Expected Record Count**: 0 - 5,000 logs.
* **Related Tables**: `Users` (Foreign Key: `User ID`).

#### Schema Columns

| Column Header Text | Data Type | Nullable | Description / Business Rules |
| :--- | :--- | :--- | :--- |
| **Notification ID** | String | No | Primary Key. System generated (e.g., `NOT000001`). |
| **User ID** | String | No | Foreign Key pointing to `Users.User ID`. |
| **Title** | String | No | Short title/subject of the notification. |
| **Message** | String | No | Detailed content of the notification. |
| **Notification Type** | String | Yes | Classification type (e.g. `Info`, `Warning`, `Alert`). |
| **Status** | String | No | Notification read status (e.g. `Read`, `Unread`). |
| **Created At** | Timestamp | Yes | ISO 8601 creation timestamp. |
| **Updated At** | Timestamp | Yes | ISO 8601 update timestamp. |
| **Deletion Flag** | Boolean | No | Soft-delete flag (`true` / `false`). |

---

### Table: Diagnostics

* **Purpose**: Stores system operational diagnostic logs and debugging execution messages.
* **Note**: This sheet contains diagnostic logs and system execution messages rather than a standard structured tabular row format. It holds arbitrary system error traces, memory diagnostics, performance metrics, and connectivity health statuses.

---

## 4. Relationships & Referential Integrity

The database relies on logic-enforced relationships. As Google Sheets lacks database-level foreign key constraints, these references must be validated by service code before commit.

### Foreign Key Mappings

1. **`Students.Department ID` $\rightarrow$ `Departments.Department ID`**
   * **Rule**: Students cannot be assigned to non-existent departments. `StudentService.createStudent` verifies that the department ID exists and is `Active` in the `Departments` table.

2. **`Attendance.Roll Number` $\rightarrow$ `Students.Roll Number`**
   * **Rule**: Check-ins are only logged for registered students. `AttendanceService` checks student eligibility by looking up the roll number in the `Students` table.

3. **`Attendance.Event ID` $\rightarrow$ `Events.Event ID`**
   * **Rule**: Attendance must be marked against a valid event. `AttendanceService` validates the event's existence and active state.

4. **`EventParticipants.Roll Number` $\rightarrow$ `Students.Roll Number`**
   * **Rule**: A student must exist in the database to be registered for an event.

5. **`EventParticipants.Event ID` $\rightarrow$ `Events.Event ID`**
   * **Rule**: Registrations are tied to valid event records.

6. **`EventCoordinators.User ID` $\rightarrow$ `Users.User ID`**
   * **Rule**: Only users with the role of `Coordinator` or `Admin` can be assigned as event coordinators.

7. **`EventCoordinators.Event ID` $\rightarrow$ `Events.Event ID`**
   * **Rule**: Assigns coordinators to valid events.

8. **`Sessions.User ID` $\rightarrow$ `Users.User ID`**
   * **Rule**: Sessions are tied to valid users. When validating a session, `SessionService` ensures the user is still `Active`.

9. **`AuditLogs.User ID` $\rightarrow$ `Users.User ID`**
   * **Rule**: Logs administrative operations against the executing user's ID.

10. **`GeneratedReports.Event ID` $\rightarrow$ `Events.Event ID`**
    * **Rule**: Reports are associated with a valid event.

---

## 5. Naming Conventions

To maintain consistency across sheets, services, and tests:

### ID Formats
System IDs are generated dynamically by [IdService.js](file:///c:/Users/DELL/Desktop/BVC-Event-Attendance-System/IdService.js) using prefixes and digit padding:

* **Users**: `USR0001` (Prefix: `USR`, Digits: 4)
* **Departments**: `DEP001` (Prefix: `DEP`, Digits: 3)
* **Students**: `STU00001` (Prefix: `STU`, Digits: 5)
* **Sessions**: `SES000001` (Prefix: `SES`, Digits: 6)
* **GeneratedReports**: `RPT000001` (Prefix: `RPT`, Digits: 6)
* **AuditLogs**: `LOG000001` (Prefix: `LOG`, Digits: 6)
* **Notifications**: `NOT000001` (Prefix: `NOT`, Digits: 6)
* **EventCoordinators (Assignments)**: `ASN00001` (Prefix: `ASN`, Digits: 5)
* **Events**: `EVT-YYYY-XXXX` (Dynamic prefix with current year, e.g. `EVT-2026-0001`, Digits: 4)
* **Attendance**: `ATT-YYYY-XXXXXX` (Dynamic prefix with current year, e.g. `ATT-2026-000001`, Digits: 6)

### Status Values
Status values are strictly case-sensitive strings:
* **User Status**: `Active`, `Inactive`
* **Department Status**: `Active`, `Inactive`
* **Student Status**: `Active`, `Inactive`
* **Session Status**: `Active`, `Expired`, `Logged Out`
* **Attendance Status**: `Present`, `Absent`
* **Event Status**: `Draft`, `Upcoming`, `Active`, `Stopped`, `Completed`, `Cancelled`
* **Report Status**: `Pending`, `Generated`, `Failed`
* **Notification Status**: `Read`, `Unread`

### Date & Time Formatting
All temporal columns write string patterns relative to timezone `Asia/Kolkata` (defined in `CONFIG.DATE_TIME`):
* **Date format**: `yyyy-MM-dd` (e.g., `2026-07-07`)
* **Time format**: `HH:mm:ss` (e.g., `19:32:48`)
* **Timestamp format**: ISO 8601 string (e.g., `2026-07-07T14:02:53Z` or `2026-07-07 19:32:48` for database fields).

### Boolean Values
Write explicit JSON booleans `true` or `false` (in raw cells, written as strings uppercase/lowercase, parsed as booleans by `DatabaseService` mapping functions).

### Code Naming Conventions
* **Variables / Sheet Columns Keys**: camelCase for runtime variables; column mappings use `UPPER_CASE` in config pointing to column header names (e.g., `CONFIG.COLUMNS.STUDENT_ROLL_NUMBER = "Roll Number"`).
* **Functions**: camelCase verbNoun (e.g., `loginUser()`, `createEvent()`).
* **Constants**: UPPER_CASE (e.g., `CONFIG.APP.NAME`).

---

## 6. Data Integrity & Business Rules

### Uniqueness Constraints
1. **Roll Number**: Must be globally unique in `Students`.
2. **User Employee ID**: Must be unique in `Users`.
3. **Username**: Must be unique in `Users`.
4. **Email Address**: Must be unique in `Users`.
5. **Department Code / Name**: Must be unique in `Departments`.
6. **Session Token**: Must be unique in `Sessions`.
7. **Attendance Scan**: Combined key of `Event ID` + `Roll Number` + `Is Undo = false` must be unique to prevent duplicate check-ins.

### Soft-Delete Pattern
* Records are never hard-deleted from `Students`, `Users`, `Departments`, `Sessions`, and `AuditLogs` by normal actions.
* When deleted, the `Deletion Flag` column is set to `true`.
* `DatabaseService.findOne` and filter methods ignore records where `Deletion Flag` is `true` unless `includeDeleted` is explicitly passed.

### Concurrency Locks
* Script lock service handles file edits by blocking consecutive operations for up to 10 seconds.
* This ensures ID sequence calculation remains accurate during simultaneous scans.

---

## 7. Sample Data

This section provides 3 consistent example rows for each table, highlighting linked records.

### Departments
```json
[
  {
    "Department ID": "DEP001",
    "Department Code": "CSE",
    "Department Name": "Computer Science and Engineering",
    "Short Name": "CSE",
    "HOD Name": "Dr. K. S. Rao",
    "HOD Employee ID": "EMP1001",
    "Total Students": 120,
    "Total Coordinators": 5,
    "Total Events Hosted": 12,
    "Total Participants": 450,
    "Status": "Active",
    "Created By": "System",
    "Created At": "2026-07-04T12:00:00Z",
    "Updated By": "System",
    "Updated At": "2026-07-04T12:00:00Z",
    "Remarks": "Main tech department",
    "Deletion Flag": false
  },
  {
    "Department ID": "DEP002",
    "Department Code": "ECE",
    "Department Name": "Electronics and Communication Engineering",
    "Short Name": "ECE",
    "HOD Name": "Dr. P. V. Ramana",
    "HOD Employee ID": "EMP1002",
    "Total Students": 100,
    "Total Coordinators": 3,
    "Total Events Hosted": 8,
    "Total Participants": 320,
    "Status": "Active",
    "Created By": "System",
    "Created At": "2026-07-04T12:00:00Z",
    "Updated By": "System",
    "Updated At": "2026-07-04T12:00:00Z",
    "Remarks": "Core hardware wing",
    "Deletion Flag": false
  },
  {
    "Department ID": "DEP003",
    "Department Code": "EEE",
    "Department Name": "Electrical and Electronics Engineering",
    "Short Name": "EEE",
    "HOD Name": "Dr. M. S. Kumar",
    "HOD Employee ID": "EMP1003",
    "Total Students": 80,
    "Total Coordinators": 2,
    "Total Events Hosted": 6,
    "Total Participants": 180,
    "Status": "Active",
    "Created By": "System",
    "Created At": "2026-07-04T12:00:00Z",
    "Updated By": "System",
    "Updated At": "2026-07-04T12:00:00Z",
    "Remarks": "Core power wing",
    "Deletion Flag": false
  }
]
```

### Students
```json
[
  {
    "Roll Number": "22A91A0501",
    "Student Name": "Satya Balaji Malladi",
    "Email Address": "satya.m@bvc.edu.in",
    "Year": 4,
    "Semester": 2,
    "Section": "A",
    "Gender": "Male",
    "Student Status": "Active",
    "Phone Number": "9876543210",
    "Department ID": "DEP001",
    "Guardian Name": "M. V. Rao",
    "Date of Birth": "2004-05-15",
    "Enrollment Date": "2022-08-15",
    "Last Updated At": "2026-07-07 19:00:00",
    "Notes": "Symposium Lead Student"
  },
  {
    "Roll Number": "22A91A0401",
    "Student Name": "Aarav Sharma",
    "Email Address": "aarav.s@bvc.edu.in",
    "Year": 4,
    "Semester": 2,
    "Section": "B",
    "Gender": "Male",
    "Student Status": "Active",
    "Phone Number": "9876543211",
    "Department ID": "DEP002",
    "Guardian Name": "S. K. Sharma",
    "Date of Birth": "2004-08-20",
    "Enrollment Date": "2022-08-15",
    "Last Updated At": "2026-07-07 19:05:00",
    "Notes": ""
  },
  {
    "Roll Number": "22A91A0201",
    "Student Name": "Divya Patel",
    "Email Address": "divya.p@bvc.edu.in",
    "Year": 4,
    "Semester": 2,
    "Section": "A",
    "Gender": "Female",
    "Student Status": "Active",
    "Phone Number": "9876543212",
    "Department ID": "DEP003",
    "Guardian Name": "K. R. Patel",
    "Date of Birth": "2004-11-03",
    "Enrollment Date": "2022-08-15",
    "Last Updated At": "2026-07-07 19:10:00",
    "Notes": ""
  }
]
```

### Users
```json
[
  {
    "User ID": "USR0001",
    "Employee ID": "EMP0001",
    "First Name": "Admin",
    "Last Name": "User",
    "Email Address": "admin@bvc.edu.in",
    "Phone Number": "9988776655",
    "Department": "CSE",
    "Title/Designation": "Super Admin",
    "Username": "admin_bvc",
    "Password Hash": "d033e22ae348aeb5660fc2140aec35850c4da997",
    "Salt": "salt123",
    "Authentication Provider": "Local",
    "First Login": false,
    "Role": "Admin",
    "Status": "Active",
    "Profile Picture URL": "https://bvc.edu.in/images/admin.jpg",
    "Failed Login Attempts": 0,
    "Account Locked": false,
    "Last Login Timestamp": "2026-07-07 18:00:00",
    "Last Logout Timestamp": "2026-07-07 18:30:00",
    "Password Reset Required": false,
    "Password Last Changed": "2026-07-04 10:00:00",
    "Password Expiry Date": "2026-10-04 10:00:00",
    "Two-Factor Enabled": false,
    "Two-Factor Secret": "",
    "OTP": "",
    "OTP Expiry": "",
    "OTP Attempts": 0,
    "Popup Notifications": true,
    "Notification Sound": true,
    "Theme Preference": "Default",
    "Language": "en-IN",
    "Timezone": "Asia/Kolkata",
    "Bio/Notes": "System administrator",
    "Created By": "System",
    "Created At": "2026-07-04 09:00:00",
    "Updated By": "System",
    "Updated At": "2026-07-07 18:30:00",
    "Deletion Flag": false
  },
  {
    "User ID": "USR0002",
    "Employee ID": "EMP0002",
    "First Name": "Rama",
    "Last Name": "Krishna",
    "Email Address": "rama.k@bvc.edu.in",
    "Phone Number": "9988776656",
    "Department": "CSE",
    "Title/Designation": "Assistant Professor",
    "Username": "rama_cse",
    "Password Hash": "a5fd2e47e348aeb5660fc2140aec35850c4da998",
    "Salt": "salt456",
    "Authentication Provider": "Local",
    "First Login": false,
    "Role": "Coordinator",
    "Status": "Active",
    "Profile Picture URL": "https://bvc.edu.in/images/rama.jpg",
    "Failed Login Attempts": 0,
    "Account Locked": false,
    "Last Login Timestamp": "2026-07-07 18:45:00",
    "Last Logout Timestamp": "",
    "Password Reset Required": false,
    "Password Last Changed": "2026-07-04 10:15:00",
    "Password Expiry Date": "2026-10-04 10:15:00",
    "Two-Factor Enabled": false,
    "Two-Factor Secret": "",
    "OTP": "",
    "OTP Expiry": "",
    "OTP Attempts": 0,
    "Popup Notifications": true,
    "Notification Sound": true,
    "Theme Preference": "Default",
    "Language": "en-IN",
    "Timezone": "Asia/Kolkata",
    "Bio/Notes": "Event Coordinator CSE",
    "Created By": "System",
    "Created At": "2026-07-04 09:10:00",
    "Updated By": "System",
    "Updated At": "2026-07-07 18:45:00",
    "Deletion Flag": false
  },
  {
    "User ID": "USR0003",
    "Employee ID": "EMP0003",
    "First Name": "Sita",
    "Last Name": "Devi",
    "Email Address": "sita.d@bvc.edu.in",
    "Phone Number": "9988776657",
    "Department": "ECE",
    "Title/Designation": "Associate Professor",
    "Username": "sita_ece",
    "Password Hash": "99df3d27e348aeb5660fc2140aec35850c4da999",
    "Salt": "salt789",
    "Authentication Provider": "Local",
    "First Login": false,
    "Role": "Coordinator",
    "Status": "Active",
    "Profile Picture URL": "https://bvc.edu.in/images/sita.jpg",
    "Failed Login Attempts": 0,
    "Account Locked": false,
    "Last Login Timestamp": "2026-07-07 18:50:00",
    "Last Logout Timestamp": "",
    "Password Reset Required": false,
    "Password Last Changed": "2026-07-04 10:20:00",
    "Password Expiry Date": "2026-10-04 10:20:00",
    "Two-Factor Enabled": false,
    "Two-Factor Secret": "",
    "OTP": "",
    "OTP Expiry": "",
    "OTP Attempts": 0,
    "Popup Notifications": true,
    "Notification Sound": true,
    "Theme Preference": "Default",
    "Language": "en-IN",
    "Timezone": "Asia/Kolkata",
    "Bio/Notes": "Event Coordinator ECE",
    "Created By": "System",
    "Created At": "2026-07-04 09:20:00",
    "Updated By": "System",
    "Updated At": "2026-07-07 18:50:00",
    "Deletion Flag": false
  }
]
```

### Events
```json
[
  {
    "Event ID": "EVT-2026-0001",
    "Event Name": "Tech Symposium 2026",
    "Description": "Annual college technical symposium",
    "Location": "Seminar Hall 1",
    "Event Category": "Technical",
    "Organizer": "DEP001",
    "Start Date": "2026-07-07",
    "End Date": "2026-07-07",
    "Start Time": "09:00:00",
    "End Time": "17:00:00",
    "Attendance Type": "Single Scan",
    "Barcode Attendance": true,
    "Manual Attendance": false,
    "Capacity": 200,
    "Registered Count": 150,
    "Event Status": "Active",
    "Report Generated": false,
    "Report Date": "",
    "Remarks": "Successful event setup",
    "Created At": "2026-07-04T12:00:00Z",
    "Updated At": "2026-07-07T12:00:00Z",
    "Last Attendance Sync": "",
    "Notes": "Notes for symposium"
  },
  {
    "Event ID": "EVT-2026-0002",
    "Event Name": "Embedded Systems Workshop",
    "Description": "Hands-on training workshop on IoT",
    "Location": "IoT Lab",
    "Event Category": "Workshop",
    "Organizer": "DEP002",
    "Start Date": "2026-07-08",
    "End Date": "2026-07-09",
    "Start Time": "10:00:00",
    "End Time": "16:00:00",
    "Attendance Type": "Single Scan",
    "Barcode Attendance": true,
    "Manual Attendance": true,
    "Capacity": 50,
    "Registered Count": 45,
    "Event Status": "Upcoming",
    "Report Generated": false,
    "Report Date": "",
    "Remarks": "Hardware kits ready",
    "Created At": "2026-07-05T10:00:00Z",
    "Updated At": "2026-07-05T10:00:00Z",
    "Last Attendance Sync": "",
    "Notes": ""
  },
  {
    "Event ID": "EVT-2026-0003",
    "Event Name": "Power Grid Seminar",
    "Description": "Guest lecture on smart grids",
    "Location": "E-Classroom",
    "Event Category": "Seminar",
    "Organizer": "DEP003",
    "Start Date": "2026-07-10",
    "End Date": "2026-07-10",
    "Start Time": "14:00:00",
    "End Time": "16:00:00",
    "Attendance Type": "Single Scan",
    "Barcode Attendance": false,
    "Manual Attendance": true,
    "Capacity": 100,
    "Registered Count": 85,
    "Event Status": "Upcoming",
    "Report Generated": false,
    "Report Date": "",
    "Remarks": "",
    "Created At": "2026-07-06T11:00:00Z",
    "Updated At": "2026-07-06T11:00:00Z",
    "Last Attendance Sync": "",
    "Notes": ""
  }
]
```

### EventCoordinators
```json
[
  {
    "Assignment ID": "ASN00001",
    "Event ID": "EVT-2026-0001",
    "User ID": "USR0002",
    "Assignment Role": "Lead Coordinator",
    "Assignment Status": "Active",
    "Assigned By": "USR0001",
    "Assigned Date": "2026-07-04",
    "Updated By": "USR0001",
    "Updated Date": "2026-07-04",
    "Remarks": "Assigned for CSE Symposium"
  },
  {
    "Assignment ID": "ASN00002",
    "Event ID": "EVT-2026-0002",
    "User ID": "USR0003",
    "Assignment Role": "Assistant Coordinator",
    "Assignment Status": "Active",
    "Assigned By": "USR0001",
    "Assigned Date": "2026-07-05",
    "Updated By": "USR0001",
    "Updated Date": "2026-07-05",
    "Remarks": "Assigned for ECE Workshop"
  },
  {
    "Assignment ID": "ASN00003",
    "Event ID": "EVT-2026-0003",
    "User ID": "USR0003",
    "Assignment Role": "Lead Coordinator",
    "Assignment Status": "Active",
    "Assigned By": "USR0001",
    "Assigned Date": "2026-07-06",
    "Updated By": "USR0001",
    "Updated Date": "2026-07-06",
    "Remarks": "Assigned for EEE Seminar"
  }
]
```

### EventParticipants
```json
[
  {
    "Participant ID": "ASN00004",
    "Event ID": "EVT-2026-0001",
    "Roll Number": "22A91A0501",
    "Registration Type": "Self",
    "Registration Status": "Active",
    "Attendance Status": "Present",
    "Approval Status": "Approved",
    "Approved By": "USR0002",
    "Registration Date": "2026-07-07",
    "Registration Time": "08:30:00",
    "Registration Timestamp": "2026-07-07 08:30:00",
    "Attendance Timestamp": "2026-07-07 09:05:00",
    "Certificate Issued": false,
    "Certificate ID": "",
    "Created At": "2026-07-07 08:30:00",
    "Updated At": "2026-07-07 09:05:00",
    "Created By": "USR0002",
    "Deletion Flag": false,
    "Last Action": "Scanned",
    "Remarks": "",
    "Last Sync Timestamp": "2026-07-07 09:05:00"
  },
  {
    "Participant ID": "ASN00005",
    "Event ID": "EVT-2026-0001",
    "Roll Number": "22A91A0401",
    "Registration Type": "Self",
    "Registration Status": "Active",
    "Attendance Status": "Present",
    "Approval Status": "Approved",
    "Approved By": "USR0002",
    "Registration Date": "2026-07-07",
    "Registration Time": "08:45:00",
    "Registration Timestamp": "2026-07-07 08:45:00",
    "Attendance Timestamp": "2026-07-07 09:12:00",
    "Certificate Issued": false,
    "Certificate ID": "",
    "Created At": "2026-07-07 08:45:00",
    "Updated At": "2026-07-07 09:12:00",
    "Created By": "USR0002",
    "Deletion Flag": false,
    "Last Action": "Scanned",
    "Remarks": "",
    "Last Sync Timestamp": "2026-07-07 09:12:00"
  },
  {
    "Participant ID": "ASN00006",
    "Event ID": "EVT-2026-0002",
    "Roll Number": "22A91A0401",
    "Registration Type": "Invited",
    "Registration Status": "Active",
    "Attendance Status": "Absent",
    "Approval Status": "Approved",
    "Approved By": "USR0003",
    "Registration Date": "2026-07-07",
    "Registration Time": "10:00:00",
    "Registration Timestamp": "2026-07-07 10:00:00",
    "Attendance Timestamp": "",
    "Certificate Issued": false,
    "Certificate ID": "",
    "Created At": "2026-07-07 10:00:00",
    "Updated At": "2026-07-07 10:00:00",
    "Created By": "USR0003",
    "Deletion Flag": false,
    "Last Action": "Registered",
    "Remarks": "",
    "Last Sync Timestamp": "2026-07-07 10:00:00"
  }
]
```

### Attendance
```json
[
  {
    "Attendance ID": "ATT-2026-000001",
    "Event ID": "EVT-2026-0001",
    "Roll Number": "22A91A0501",
    "User ID": "USR0002",
    "Attendance Status": "Present",
    "Attendance Method": "Barcode",
    "Date": "2026-07-07",
    "Time": "09:05:00",
    "Timestamp": "2026-07-07 09:05:00",
    "Is Undo": false,
    "Undo Reason": "",
    "Undo Timestamp": "",
    "Correction Requested": false,
    "Correction Status": "",
    "Correction Reason": "",
    "Correction Handled By": "",
    "Location": "Seminar Hall 1",
    "Remarks": "Marked at main entrance",
    "Created At": "2026-07-07T09:05:00Z",
    "Updated At": "2026-07-07T09:05:00Z",
    "Sync Status": "Synced"
  },
  {
    "Attendance ID": "ATT-2026-000002",
    "Event ID": "EVT-2026-0001",
    "Roll Number": "22A91A0401",
    "User ID": "USR0002",
    "Attendance Status": "Present",
    "Attendance Method": "Barcode",
    "Date": "2026-07-07",
    "Time": "09:12:00",
    "Timestamp": "2026-07-07 09:12:00",
    "Is Undo": false,
    "Undo Reason": "",
    "Undo Timestamp": "",
    "Correction Requested": false,
    "Correction Status": "",
    "Correction Reason": "",
    "Correction Handled By": "",
    "Location": "Seminar Hall 1",
    "Remarks": "Marked at main entrance",
    "Created At": "2026-07-07T09:12:00Z",
    "Updated At": "2026-07-07T09:12:00Z",
    "Sync Status": "Synced"
  },
  {
    "Attendance ID": "ATT-2026-000003",
    "Event ID": "EVT-2026-0001",
    "Roll Number": "22A91A0201",
    "User ID": "USR0002",
    "Attendance Status": "Present",
    "Attendance Method": "Manual",
    "Date": "2026-07-07",
    "Time": "09:30:00",
    "Timestamp": "2026-07-07 09:30:00",
    "Is Undo": false,
    "Undo Reason": "",
    "Undo Timestamp": "",
    "Correction Requested": false,
    "Correction Status": "",
    "Correction Reason": "",
    "Correction Handled By": "",
    "Location": "Seminar Hall 1",
    "Remarks": "Manual entry by coordinator",
    "Created At": "2026-07-07T09:30:00Z",
    "Updated At": "2026-07-07T09:30:00Z",
    "Sync Status": "Synced"
  }
]
```

### Sessions
```json
[
  {
    "Session ID": "SES000001",
    "User ID": "USR0001",
    "Username": "admin_bvc",
    "Login Timestamp": "2026-07-07 18:00:00",
    "Last Activity Timestamp": "2026-07-07 18:30:00",
    "Expiry Time": "2026-07-08 02:30:00",
    "Logout Timestamp": "2026-07-07 18:30:00",
    "Session Status": "Logged Out",
    "IP Address": "192.168.1.10",
    "User Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Device Type": "Desktop",
    "OS": "Windows",
    "Browser": "Chrome",
    "Location": "Campus Admin Block",
    "Login Method": "Local",
    "Session Token": "tok_abc123xyz456",
    "Created By": "System",
    "Created At": "2026-07-07 18:00:00",
    "Updated By": "System",
    "Updated At": "2026-07-07 18:30:00",
    "Deletion Flag": false,
    "Remarks": "Clean logout"
  },
  {
    "Session ID": "SES000002",
    "User ID": "USR0002",
    "Username": "rama_cse",
    "Login Timestamp": "2026-07-07 18:45:00",
    "Last Activity Timestamp": "2026-07-07 19:30:00",
    "Expiry Time": "2026-07-08 02:45:00",
    "Logout Timestamp": "",
    "Session Status": "Active",
    "IP Address": "192.168.1.15",
    "User Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Device Type": "Desktop",
    "OS": "Windows",
    "Browser": "Chrome",
    "Location": "CSE Department Lab",
    "Login Method": "Local",
    "Session Token": "tok_def456uvw789",
    "Created By": "System",
    "Created At": "2026-07-07 18:45:00",
    "Updated By": "System",
    "Updated At": "2026-07-07 19:30:00",
    "Deletion Flag": false,
    "Remarks": "Active session"
  },
  {
    "Session ID": "SES000003",
    "User ID": "USR0003",
    "Username": "sita_ece",
    "Login Timestamp": "2026-07-07 18:50:00",
    "Last Activity Timestamp": "2026-07-07 19:25:00",
    "Expiry Time": "2026-07-08 02:50:00",
    "Logout Timestamp": "",
    "Session Status": "Active",
    "IP Address": "192.168.4.22",
    "User Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
    "Device Type": "Mobile",
    "OS": "Android",
    "Browser": "Chrome Mobile",
    "Location": "ECE Seminar Hall",
    "Login Method": "Local",
    "Session Token": "tok_ghi789rst012",
    "Created By": "System",
    "Created At": "2026-07-07 18:50:00",
    "Updated By": "System",
    "Updated At": "2026-07-07 19:25:00",
    "Deletion Flag": false,
    "Remarks": "Active session"
  }
]
```

### GeneratedReports
```json
[
  {
    "Report ID": "RPT000001",
    "Event ID": "EVT-2026-0001",
    "Generated By User ID": "USR0001",
    "Report Name": "Tech Symposium Attendance Report",
    "Report Type": "Attendance",
    "Generated Date": "2026-07-07",
    "Generated Time": "17:15:00",
    "Generated Timestamp": "2026-07-07 17:15:00",
    "Report Status": "Generated",
    "PDF Available": true,
    "Excel Available": true,
    "CSV Available": true,
    "Print Available": true,
    "Total Downloads": 5,
    "Last Downloaded By": "USR0001",
    "Last Downloaded Date": "2026-07-07",
    "File Path": "/reports/tech_symp_2026.pdf",
    "Remarks": "Auto-generated on event completion"
  },
  {
    "Report ID": "RPT000002",
    "Event ID": "EVT-2026-0001",
    "Generated By User ID": "USR0002",
    "Report Name": "Tech Symposium Financial Report",
    "Report Type": "Financial",
    "Generated Date": "2026-07-07",
    "Generated Time": "17:30:00",
    "Generated Timestamp": "2026-07-07 17:30:00",
    "Report Status": "Generated",
    "PDF Available": true,
    "Excel Available": false,
    "CSV Available": false,
    "Print Available": true,
    "Total Downloads": 2,
    "Last Downloaded By": "USR0002",
    "Last Downloaded Date": "2026-07-07",
    "File Path": "/reports/tech_symp_fin.pdf",
    "Remarks": "Coordinator manual generation"
  },
  {
    "Report ID": "RPT000003",
    "Event ID": "EVT-2026-0002",
    "Generated By User ID": "USR0003",
    "Report Name": "Embedded Workshop Roster",
    "Report Type": "Registration",
    "Generated Date": "2026-07-07",
    "Generated Time": "19:00:00",
    "Generated Timestamp": "2026-07-07 19:00:00",
    "Report Status": "Generated",
    "PDF Available": false,
    "Excel Available": true,
    "CSV Available": true,
    "Print Available": false,
    "Total Downloads": 1,
    "Last Downloaded By": "USR0003",
    "Last Downloaded Date": "2026-07-07",
    "File Path": "/reports/embed_roster.xlsx",
    "Remarks": "Initial roster download"
  }
]
```

### Settings
```json
[
  {
    "Setting ID": "SET001",
    "Category": "System",
    "Key": "COLLEGE_NAME",
    "Value": "BVC Engineering College",
    "Data Type": "String",
    "Description": "Name of the educational institution",
    "Editable": false,
    "Status": "Active",
    "Created By": "System",
    "Created At": "2026-07-04 09:00:00",
    "Updated By": "System",
    "Updated At": "2026-07-04 09:00:00",
    "Notes": "Institutional constant"
  },
  {
    "Setting ID": "SET002",
    "Category": "Security",
    "Key": "SESSION_TIMEOUT_MINUTES",
    "Value": "480",
    "Data Type": "Integer",
    "Description": "Session expiration in minutes",
    "Editable": true,
    "Status": "Active",
    "Created By": "System",
    "Created At": "2026-07-04 09:00:00",
    "Updated By": "System",
    "Updated At": "2026-07-04 09:00:00",
    "Notes": "Security timeout threshold"
  },
  {
    "Setting ID": "SET003",
    "Category": "Attendance",
    "Key": "ATTENDANCE_WINDOW_MINUTES",
    "Value": "15",
    "Data Type": "Integer",
    "Description": "Buffer in minutes allowed to mark attendance after start/end",
    "Editable": true,
    "Status": "Active",
    "Created By": "System",
    "Created At": "2026-07-04 09:00:00",
    "Updated By": "System",
    "Updated At": "2026-07-04 09:00:00",
    "Notes": ""
  }
]
```

### AuditLogs
```json
[
  {
    "Log ID": "LOG000001",
    "User ID": "USR0001",
    "Employee ID": "EMP0001",
    "Username": "admin_bvc",
    "Module": "AuthService",
    "Action": "LOGIN",
    "Record ID": "USR0001",
    "Record Type": "User",
    "Description": "User admin_bvc logged in successfully",
    "Old Value": "",
    "New Value": "",
    "Status": "SUCCESS",
    "IP Address": "192.168.1.10",
    "Device": "Desktop",
    "Browser": "Chrome",
    "Location": "Campus Admin Block",
    "Session ID": "SES000001",
    "Session Token": "tok_abc123xyz456",
    "Error Message": "",
    "Execution Time (ms)": 45,
    "Created By": "System",
    "Created At": "2026-07-07 18:00:00",
    "Updated By": "System",
    "Updated At": "2026-07-07 18:00:00",
    "Deletion Flag": false,
    "Remarks": ""
  },
  {
    "Log ID": "LOG000002",
    "User ID": "USR0002",
    "Employee ID": "EMP0002",
    "Username": "rama_cse",
    "Module": "StudentService",
    "Action": "CREATE_STUDENT",
    "Record ID": "STU00001",
    "Record Type": "Student",
    "Description": "Created student profile for Satya Balaji Malladi",
    "Old Value": "",
    "New Value": "{\"Roll Number\":\"22A91A0501\",\"Student Name\":\"Satya Balaji Malladi\",\"Department ID\":\"DEP001\"}",
    "Status": "SUCCESS",
    "IP Address": "192.168.1.15",
    "Device": "Desktop",
    "Browser": "Chrome",
    "Location": "CSE Department Lab",
    "Session ID": "SES000002",
    "Session Token": "tok_def456uvw789",
    "Error Message": "",
    "Execution Time (ms)": 120,
    "Created By": "System",
    "Created At": "2026-07-07 19:00:00",
    "Updated By": "System",
    "Updated At": "2026-07-07 19:00:00",
    "Deletion Flag": false,
    "Remarks": ""
  },
  {
    "Log ID": "LOG000003",
    "User ID": "USR0002",
    "Employee ID": "EMP0002",
    "Username": "rama_cse",
    "Module": "AttendanceService",
    "Action": "MARK_ATTENDANCE",
    "Record ID": "ATT-2026-000001",
    "Record Type": "Attendance",
    "Description": "Marked attendance for Roll 22A91A0501 as Present via Barcode",
    "Old Value": "",
    "New Value": "{\"Attendance ID\":\"ATT-2026-000001\",\"Roll Number\":\"22A91A0501\",\"Status\":\"Present\"}",
    "Status": "SUCCESS",
    "IP Address": "192.168.1.15",
    "Device": "Desktop",
    "Browser": "Chrome",
    "Location": "CSE Department Lab",
    "Session ID": "SES000002",
    "Session Token": "tok_def456uvw789",
    "Error Message": "",
    "Execution Time (ms)": 85,
    "Created By": "System",
    "Created At": "2026-07-07 19:05:00",
    "Updated By": "System",
    "Updated At": "2026-07-07 19:05:00",
    "Deletion Flag": false,
    "Remarks": ""
  }
]
```

### Notifications (Pending Implementation)
```json
[
  {
    "Notification ID": "NOT000001",
    "User ID": "USR0002",
    "Message": "New Event Assignment: Tech Symposium 2026",
    "Status": "Unread",
    "Created At": "2026-07-04 12:00:00",
    "Created By": "System"
  },
  {
    "Notification ID": "NOT000002",
    "User ID": "USR0002",
    "Message": "Participant Satya Balaji Malladi added to Tech Symposium 2026",
    "Status": "Read",
    "Created At": "2026-07-07 08:30:00",
    "Created By": "System"
  },
  {
    "Notification ID": "NOT000003",
    "User ID": "USR0003",
    "Message": "System configuration settings updated by administrator",
    "Status": "Unread",
    "Created At": "2026-07-07 19:15:00",
    "Created By": "System"
  }
]
```
