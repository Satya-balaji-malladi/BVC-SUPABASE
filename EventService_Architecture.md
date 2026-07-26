# EventService Architecture Analysis

## 1. Purpose
`EventService.js` is the core backend service managing the lifecycle, retrieval, and auditing of events within the BVC Event Attendance Management System. It abstracts all business logic, duplicate event prevention, date/status evaluations, and coordinator validations for event entities.

---

## 2. Responsibilities
* **CRUD Operations**: Handle event registration (`createEvent`), updating (`updateEvent`), and soft-deletion (`deleteEvent`).
* **Lifecycle Evaluation**: Dynamically determine event statuses (`Draft`, `Upcoming`, `Active`, `Completed`, `Cancelled`) based on current timestamps, start/end dates, and existing status values.
* **Access Control Helper**: Match events against active, valid coordinators.
* **Retrieval & Querying**: Provide functions to search, filter, sort, paginate, and fetch events by ID, coordinator, status, or date.
* **Cache Management**: Maintain a transient call-level cache of sanitized events to minimize repetitive sheet read operations.
* **Audit Logging & Notifications**: Interface with `AuditService` and `NotificationService` to track and notify relevant stakeholders of event updates.

---

## 3. Dependencies
* [DatabaseService.js](file:///c:/Users/DELL/Desktop/BVC-Event-Attendance-System/DatabaseService.js): To read, query, insert, and update event records in Google Sheets.
* [UserService.js](file:///c:/Users/DELL/Desktop/BVC-Event-Attendance-System/UserService.js): To validate coordinator existence and state.
* [ValidationService.js](file:///c:/Users/DELL/Desktop/BVC-Event-Attendance-System/ValidationService.js): To ensure incoming event data complies with formatting rules.
* [IdService.js](file:///c:/Users/DELL/Desktop/BVC-Event-Attendance-System/IdService.js): To generate unique event identifier tokens.
* [AuditService.js](file:///c:/Users/DELL/Desktop/BVC-Event-Attendance-System/AuditService.js): To record operational changes.
* [NotificationService.js](file:///c:/Users/DELL/Desktop/BVC-Event-Attendance-System/NotificationService.js): To distribute alert updates to coordinators.
* [Utils.js](file:///c:/Users/DELL/Desktop/BVC-Event-Attendance-System/Utils.js): For data sanitization, response formatting, date formatting, and text manipulation.

---

## 4. Database Tables Used
* **`Events`**: Main read/write table. Contains the primary event database.
* **`Users`**: Read-only table. Used to verify coordinator properties and permissions.

---

## 5. CONFIG Values Used
* `CONFIG.SHEETS.EVENTS`: Represents the physical sheet name "Events".
* `CONFIG.COLUMNS.EVENT_ID`: Column header mapping for the event unique ID.
* `CONFIG.COLUMNS.EVENT_NAME`: Column header mapping for event name.
* `CONFIG.COLUMNS.DESCRIPTION`: Column header mapping for event description text.
* `CONFIG.COLUMNS.START_DATE`: Column header mapping for event start date.
* `CONFIG.COLUMNS.END_DATE`: Column header mapping for event end date.
* `CONFIG.COLUMNS.START_TIME`: Column header mapping for event start time.
* `CONFIG.COLUMNS.END_TIME`: Column header mapping for event end time.
* `CONFIG.COLUMNS.VENUE`: Column header mapping for event venue.
* `CONFIG.COLUMNS.COORDINATOR_ID`: Column header mapping for the event coordinator's user ID.
* `CONFIG.COLUMNS.STATUS`: Column header mapping for status.
* `CONFIG.COLUMNS.DEPARTMENTS`: Column header mapping for allowed academic departments.
* `CONFIG.COLUMNS.YEARS`: Column header mapping for allowed student years.
* `CONFIG.COLUMNS.CAPACITY`: Column header mapping for capacity.
* `CONFIG.COLUMNS.DELETION_FLAG`: Column header mapping for the soft delete flag.
* `CONFIG.COLUMNS.CREATED_AT`, `CONFIG.COLUMNS.CREATED_BY`, `CONFIG.COLUMNS.UPDATED_AT`, `CONFIG.COLUMNS.UPDATED_BY`: Audit headers.
* `CONFIG.COLUMNS.LAST_ACTION`, `CONFIG.COLUMNS.LAST_ACTION_AT`, `CONFIG.COLUMNS.LAST_ACTION_BY`: Activity logs.
* `CONFIG.EVENT_STATUS`: Maps values: `DRAFT`, `UPCOMING`, `ACTIVE`, `STOPPED`, `COMPLETED`, `CANCELLED`.
* `CONFIG.ROLES.COORDINATOR`: Value string `'Coordinator'`.
* `CONFIG.USER_STATUS.ACTIVE`: Value string `'Active'`.
* `CONFIG.MESSAGES`: Standard localized notifications (`EVENT_CREATED`, `EVENT_NOT_FOUND`, etc.).

---

## 6. Utility & Validation Methods Used
* `Utils.buildResponse(success, message, data)`: Format return states.
* `Utils.sanitizeEvent(event)`: Filter sensitive attributes.
* `Utils.trimText(text)`: Clear leading/trailing whitespace.
* `Utils.capitalizeWords(text)`: Format text casing.
* `Utils.formatDate(date)`: Normalize date structures.
* `Utils.checkEmptyValue(val)`: Assert check-empty states.
* `ValidationService.validateEvent(payload)`: Check core event schema.

---

## 7. Possible Risks & Naming Inconsistencies
* **Missing Method Underscores**: In the original code, the private function `_evaluateEventStatus_` is declared with a trailing underscore, but is called in three methods (`getEventsByCoordinator`, `getEventsByStatus`, and `getEventsByDate`) as `_evaluateEventStatus` (omitting the trailing underscore). This will trigger a runtime TypeError.
* **Audit Columns Safe Guard**: `createEvent` calls `this._ensureAuditColumns()` if it exists, which is missing from `EventService.js`.
* **Transient Cache Persistence**: The local cache variables (`_allActiveSanitizedEvents_` and `_activeEventsForDedup_`) are attached directly to the `EventService` object. While safe within a single script execution, they do not persist across separate web requests, which is standard for Apps Script executions.
* **Lack of Concurrency Lock in Update**: Unlike `DatabaseService`, `updateEvent` does not explicitly wrap its logic check in script locks, making it potentially vulnerable to race conditions if multiple coordinators edit the same event simultaneously.

---

## 8. Function List

### Private / Internal Helpers
1. `_normalizeEventTime_(timeValue)`: Trims and normalizes time input to "HH:mm".
2. `_safeDeletionFlag_(eventRecord)`: Extract standard boolean soft-delete status.
3. `_getActiveEventsForDedup_()`: Retrieve cached array of undeleted events.
4. `_evaluateEventStatus_(eventRecord)`: Determine date/time based status.
5. `_getAllActiveSanitizedEvents_()`: Map, evaluate, and sanitize all active events.
6. `_getEventValidationPayload_(eventData)`: Extract properties expected by ValidationService.
7. `_invalidateCaches_()`: Clear the local memory cache.
8. `_isDuplicateEvent(name, startDate, venue, startTime, excludeId)`: Inspect for overlapping schedules.

### Public API
1. `createEvent(eventData)`: Add a new event record with validations.
2. `updateEvent(eventId, eventData)`: Modify an existing event.
3. `deleteEvent(eventId, updatedBy)`: Soft-delete an event and mark as cancelled.
4. `getEventById(eventId)`: Lookup a single active event by ID.
5. `getAllEvents()`: Retrieve list of all active sanitized events.
6. `searchEvents(keyword)`: Filter active events by keyword match.
7. `getEventsByCoordinator(coordinatorId)`: Fetch events assigned to a specific coordinator.
8. `getEventsByStatus(status)`: Fetch events matching a specific status string.
9. `getEventsByDate(date)`: Fetch events starting on a specific date.
10. `filterEvents(filters)`: Apply compound filter criteria to active events.
11. `sortEvents(sortBy, order)`: Sort list of active events by fields.
12. `paginateEvents(page, pageSize)`: Chunk active event collections for lists.

---

## 9. Function Dependency Graph

```text
createEvent ──> _getEventValidationPayload_ ──> ValidationService.validateEvent
            ──> _isDuplicateEvent ──> _getActiveEventsForDedup_ ──> _safeDeletionFlag_
            ──> _normalizeEventTime_
            ──> _invalidateCaches_

updateEvent ──> getEventById
            ──> _getEventValidationPayload_
            ──> _isDuplicateEvent
            ──> _invalidateCaches_

deleteEvent ──> _invalidateCaches_

getEventById ──> _evaluateEventStatus_
             ──> _safeDeletionFlag_

getAllEvents ──> _getAllActiveSanitizedEvents_ ──> _evaluateEventStatus_
                                                ──> _safeDeletionFlag_

searchEvents ──> _getAllActiveSanitizedEvents_

getEventsByCoordinator ──> _evaluateEventStatus_ (originally named without underscore)

getEventsByStatus ──> _evaluateEventStatus_ (originally named without underscore)

getEventsByDate ──> _evaluateEventStatus_ (originally named without underscore)

filterEvents ──> getAllEvents

sortEvents ──> getAllEvents

paginateEvents ──> getAllEvents
```

---

## 10. Expected Execution Flow

```text
[Client / API Router Call]
         │
         ▼
    createEvent(eventData)
         │
         ├──► 1. Verify Coordinator exists and is Active (via UserService)
         ├──► 2. Map and Validate Event Schema (via ValidationService)
         ├──► 3. Check for duplicates in same venue, date & time (via _isDuplicateEvent)
         ├──► 4. Generate Event ID (via IdService)
         ├──► 5. Insert Record (via DatabaseService)
         ├──► 6. Invalidate Local Cache (_invalidateCaches_)
         ├──► 7. Log Action (via AuditService) & Notify Coordinator
         │
         ▼
  [JSON Result returned to Router]
```
