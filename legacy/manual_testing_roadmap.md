# 🧪 BVC Event Attendance System — Manual Testing Roadmap

> Test in order. Each phase depends on the previous one being stable.
> Use **Super Admin** credentials for Phase 1–3. Switch roles as instructed.

---

## ✅ Phase 1 — Authentication & Session

### 1.1 Login
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 1 | Open the app URL | Login page loads cleanly, no errors | |
| 2 | Submit with empty fields | Error: "fields required" | |
| 3 | Submit with wrong password | Error: "Invalid credentials" | |
| 4 | Submit with valid Super Admin credentials | Redirects to Dashboard | |
| 5 | Check browser localStorage | `sessionToken` key is set | |

### 1.2 Session Persistence
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 6 | Refresh the page after login | Stays on Dashboard, not kicked to login | |
| 7 | Open a new tab with the app URL | Stays logged in (same session) | |

### 1.3 Logout
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 8 | Click Logout | Redirected to Login page | |
| 9 | Press browser Back after logout | Should NOT go back to dashboard (session invalid) | |

### 1.4 Forgot Password
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 10 | Click "Forgot Password" on login page | Forgot Password form loads | |
| 11 | Enter a non-existent Employee ID | Error message shown | |
| 12 | Enter a valid Employee ID | Success message / email sent | |

---

## ✅ Phase 2 — Profile Page

### 2.1 Profile Loading Speed
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 13 | Click "My Profile" in the sidebar | Profile data appears **instantly** (< 1 second) | |
| 14 | Check all fields visible | Name, Username, Employee ID, Department, Last Login all populated | |

### 2.2 Update Personal Details
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 15 | Change First Name and click Save | Success toast, name updates in sidebar too | |
| 16 | Enter 9-digit phone number and Save | Error: "must be 10-digit" | |
| 17 | Enter valid 10-digit phone and Save | Success | |

### 2.3 Change Password
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 18 | Enter mismatched new/confirm passwords | Error: "passwords do not match" | |
| 19 | Enter new password < 6 chars | Error: "minimum 6 characters" | |
| 20 | Enter correct current + valid new password | Success toast, form resets | |

---

## ✅ Phase 3 — Dashboard

| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 21 | Open Dashboard | Stats cards load (Total Users, Students, Events, Attendance) | |
| 22 | Verify stat numbers are non-zero (if seeded data exists) | Numbers visible, no "NaN" or "--" | |
| 23 | Check recent events list | Events appear in table | |
| 24 | Check charts/graphs (if any) | Render without JS errors in console | |

---

## ✅ Phase 4 — User Management (Super Admin)

### 4.1 View Users
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 25 | Navigate to Users module | User list loads | |
| 26 | Search for a user by name | Filters correctly | |
| 27 | Filter by Role (HOD, Coordinator, etc.) | List narrows correctly | |

### 4.2 Create User
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 28 | Click Add User → submit empty form | Validation errors shown | |
| 29 | Create a new Coordinator with all valid fields | Success, user appears in list | |
| 30 | Check new user's **Status** in the list | Status = **Inactive** (new business rule) | |
| 31 | Try creating same Employee ID again | Error: "already exists" | |

### 4.3 Edit & Delete User
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 32 | Edit a user's phone number | Success, updates in list | |
| 33 | Soft-delete a user | User disappears from active list | |
| 34 | Restore the deleted user | User reappears | |

---

## ✅ Phase 5 — Student Management

### 5.1 View Students
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 35 | Navigate to Students module | Student list loads | |
| 36 | Search by Roll Number | Filters correctly | |
| 37 | Filter by Department | List narrows | |

### 5.2 Create Student
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 38 | Add new student with valid Roll No, Name, Dept | Success | |
| 39 | Check new student's **Student Status** | Status = **Inactive** | |
| 40 | Try duplicate roll number | Error: "Roll number already exists" | |

### 5.3 Edit & Delete
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 41 | Edit student's Year or Section | Success | |
| 42 | Soft-delete a student | Student removed from active list | |

### 5.4 Export Students
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 43 | Click Export → CSV | Downloads a valid CSV file with student data | |
| 44 | Click Export → PDF | Downloads or opens a printable PDF | |

---

## ✅ Phase 6 — Event Management

### 6.1 Create Event
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 45 | Navigate to Events | Event list loads | |
| 46 | Create new event with today's date (start = end = today) | Event created successfully | |
| 47 | Create event without required fields | Validation errors | |
| 48 | Verify event status is **Active** or **Upcoming** | Status visible in list | |

### 6.2 Edit Event
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 49 | Edit event name or venue | Updates saved | |
| 50 | Change event status to Completed | Status changes in list | |

### 6.3 Assign Coordinator
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 51 | Open event → Assign a coordinator | Coordinator appears in event's coordinator list | |

### 6.4 Delete Event
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 52 | Delete an event | Event removed from active list | |

---

## ✅ Phase 7 — Attendance & Status Engine

> **This is the most critical phase** — tests the core business rule.

### 7.1 Mark Attendance
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 53 | Open a **currently running** event (today's date) | Attendance panel loads | |
| 54 | Mark a student (Roll No) as PRESENT | Attendance recorded, success message | |
| 55 | Check that student's **Status** in Students module | Status = **Active** ✅ | |
| 56 | Mark another student ABSENT | No status change (still Inactive) | |

### 7.2 Status Reverts After Event Ends
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 57 | Set a past event's date to yesterday | Student who attended is now **Inactive** again | |
| 58 | Check a student who attended TODAY's event | Status = **Active** ✅ | |

### 7.3 Delete Attendance
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 59 | Remove attendance record for a student | Student status recalculates to **Inactive** | |

### 7.4 Attendance Export
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 60 | Export attendance list for an event | CSV/PDF downloads correctly | |

---

## ✅ Phase 8 — Reports & Analytics

| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 61 | Open Reports module | Page loads without errors | |
| 62 | Generate Event Report for a specific event | Report shows attendance data | |
| 63 | Generate Student Report for a roll number | Shows all events attended | |
| 64 | Generate Department Report | Shows stats per department | |
| 65 | Generate Date Range Report | Filtered results by date | |
| 66 | Export any report to CSV | File downloads | |
| 67 | Open Analytics module | Charts load | |

---

## ✅ Phase 9 — Settings

| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 68 | Open Settings | Settings panel loads | |
| 69 | Update a setting and save | Saved successfully | |
| 70 | Toggle a setting on/off | UI reflects the change | |

---

## ✅ Phase 10 — Role-Based Access Control (RBAC)

### Login as HOD
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 71 | Login as an HOD user | Dashboard loads | |
| 72 | Open Users module | Can only see users in their department | |
| 73 | Try to access Monitoring/Test Center | Should be blocked / not in sidebar | |
| 74 | Create a student for their own department | Success | |
| 75 | Try to create faculty for a different department | Error: "can only create for own department" | |

### Login as Coordinator
| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 76 | Login as a Coordinator | Dashboard loads (limited view) | |
| 77 | Open an event assigned to them | Attendance page accessible | |
| 78 | Try to access Users module | Should be blocked | |

---

## ✅ Phase 11 — Faculty Management

| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 79 | Create a new Faculty member | User + Faculty record created | |
| 80 | Check Faculty's default **Status** | Status = **Inactive** | |
| 81 | Edit faculty department | Updated in both Users and Faculty tables | |
| 82 | Deactivate faculty | Status = Inactive in faculty list | |

---

## ✅ Phase 12 — Monitoring & Health Check

| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 83 | Open Monitoring module | System metrics visible | |
| 84 | Run System Health Check | All services show OK/Green | |

---

## ✅ Phase 13 — Complete Profile Flow (First Login)

| # | Action | Expected Result | ✅/❌ |
|---|--------|-----------------|-------|
| 85 | Login as a new user who hasn't completed profile | Redirected to "Complete Profile" page | |
| 86 | Submit without required fields | Validation errors | |
| 87 | Submit with all valid data | Profile saved, redirected to dashboard | |

---

## 🐛 Edge Cases to Test

| # | Scenario | Expected Result | ✅/❌ |
|---|----------|-----------------|-------|
| 88 | Very long names in form fields (100+ chars) | Handled gracefully | |
| 89 | Special characters in search (e.g., `'; DROP TABLE`) | No crash or injection | |
| 90 | Open 2 browser tabs, make changes in one, refresh the other | No stale data crash | |
| 91 | Click a button rapidly (double-click submit) | No duplicate records | |
| 92 | Navigate away during a slow operation | No JS errors on return | |
| 93 | Extremely long roll number or Employee ID | Validation should cap / reject | |

---

## 📋 Test Summary Tracker

| Module | Total Tests | Passed | Failed | Notes |
|--------|------------|--------|--------|-------|
| Authentication | 12 | | | |
| Profile | 8 | | | |
| Dashboard | 4 | | | |
| User Management | 10 | | | |
| Student Management | 9 | | | |
| Event Management | 8 | | | |
| Attendance & Status | 8 | | | |
| Reports & Analytics | 7 | | | |
| Settings | 3 | | | |
| RBAC | 8 | | | |
| Faculty Management | 4 | | | |
| Monitoring | 2 | | | |
| Complete Profile | 3 | | | |
| Edge Cases | 6 | | | |
| **TOTAL** | **96** | | | |

---

> [!TIP]
> **Test Order matters**: Always create data before testing delete/edit on it.
> For Status Engine tests (Phase 7), make sure the event's Start Date = today's date.

> [!IMPORTANT]
> After each major test, check the **browser console** (F12) for any red errors.
> Any `[API ERROR]` or `Failed to load` messages should be reported.
