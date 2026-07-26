/**
 * Global Configuration for BVC Engineering College Attendance Management System
 * This file serves as the Single Source of Truth for all modules.
 * @namespace CONFIG
 */
const CONFIG = {
  APP: {
    NAME: 'BVC Engineering College Attendance System',
    ENVIRONMENT: 'Production',
    VERSION: '2.0.1',
    RELEASE_DATE: '2026-07-04'
  },

  SYSTEM: {
    MAINTENANCE_MODE: false
  },

  SPREADSHEET: {
    ID: '1lxOHCKXPr3cY3-N6rXDLWR2wzhgfEHWYwWdFunYybbw'
  },

  SUPABASE: {
    URL: 'https://esfqyvkcurklxjqfurih.supabase.co', // Updated with your project URL
    KEY: 'sb_publishable_9pnIBMiHqiQcGtASmbMWCA_TUxw44gW'      // Publishable API Key
  },

  SHEETS: {
    AI_ANALYTICS_CACHE: "AI_Analytics_Cache",
    API_KEYS: "ApiKeys",
    ARCHIVES_ATTENDANCE: "Archives_Attendance",
    ARCHIVES_AUDITLOGS: "Archives_AuditLogs",
    ATTENDANCE: "Attendance",
    ATTENDANCE_QUEUE: "AttendanceQueue",
    AUDITLOGS: "AuditLogs",
    CERTIFICATES: "Certificates",
    DEPARTMENTS: "Departments",
    DIAGNOSTICS: "Diagnostics",
    EVENT_COORDINATORS: "EventCoordinators",
    EVENT_PARTICIPANTS: "EventParticipants",
    EVENT_SESSIONS: "EventSessions",
    EVENTS: "Events",
    GENERATED_REPORTS: "GeneratedReports",
    LMS_INTEGRATIONS: "LMS_Integrations",
    NOTIFICATION_TEMPLATES: "NotificationTemplates",
    NOTIFICATIONS: "Notifications",
    USER_PERMISSIONS: "UserPermissions",
    EVENT_ASSIGNMENTS: "EventAssignments",
    EXPORT_TEMPLATES: "ExportTemplates",
    EVENT_TEMPLATES: "EventTemplates",
    ATTENDANCE_CORRECTIONS: "AttendanceCorrections",
    TEST_HISTORY: "TestHistory",
    SESSIONS: "Sessions",
    SETTINGS: "Settings",
    STUDENTS: "Students",
    OTHER_COLLEGE_STUDENTS: "OtherCollegeStudents",
    SYSTEM_HEALTH_LOGS: "SystemHealthLogs",
    USERS: "Users"
  },

  /**
   * Centralized header-name map (exact match to Google Sheets header texts).
   */
  COLUMNS: {
    // Users
    USER_ID: 'User ID',
    USER_FIRST_NAME: 'First Name',
    USER_LAST_NAME: 'Last Name',
    USER_EMAIL_ADDRESS: 'Email Address',
    USER_USERNAME: 'Username',
    USER_PASSWORD_HASH: 'Password Hash',
    USER_ROLE: 'Role',
    USER_STATUS: 'Status',
    USER_EMPLOYEE_ID: "Employee ID",
    USER_PHONE: 'Phone',
    USER_DEPARTMENT: 'Department',
    USER_CREATED_AT: 'Created Date',
    USER_LAST_LOGIN: 'Last Login',
    USER_PROFILE_COMPLETED: 'ProfileCompleted',
    USER_ONLINE_STATUS: 'OnlineStatus',
    USER_LAST_SEEN: 'LastSeen',
    USER_LAST_LOGIN_TS: 'LastLogin',
    USER_ALT_PHONE: 'Alternate Phone',
    USER_PROFILE_PHOTO: 'Profile Photo',
    USER_DESIGNATION: 'Title/Designation',

    // Backward compatibility aliases
    USER_FULL_NAME: 'First Name', // alias for compatibility
    USER_EMAIL: 'Email Address',  // alias for compatibility

    // Students Core Constants
    STUDENT_ID: "Student ID",
    STUDENT_ROLL_NUMBER: "Roll Number",
    STUDENT_NAME: "Student Name",
    STUDENT_DEPARTMENT_ID: "Department ID",
    STUDENT_BRANCH: "Branch",
    STUDENT_YEAR: "Year",
    STUDENT_SECTION: "Section",
    STUDENT_STATUS: "Student Status",

    // Student Optional Columns
    STUDENT_EMAIL: "Email Address",
    STUDENT_PHONE: "Phone Number",
    STUDENT_GENDER: "Gender",
    STUDENT_PARENT_NAME: "Parent Name",
    STUDENT_PARENT_PHONE: "Parent Phone",
    STUDENT_ADDRESS: "Address",
    STUDENT_DOB: "Date of Birth",
    STUDENT_ADMISSION_YEAR: "Admission Year",
    STUDENT_BLOOD_GROUP: "Blood Group",

    // Departments
    DEPARTMENT_ID: 'Department ID',
    DEPARTMENT_NAME: 'Department Name',
    DEPARTMENT_CODE: "Department Code",

    // Events
    EVENT_ID: 'Event ID',
    EVENT_NAME: 'Event Name',
    EVENT_BARCODE_ATTENDANCE: 'Barcode Attendance',
    EVENT_MANUAL_ATTENDANCE: 'Manual Attendance',
    EVENT_STATUS: 'Event Status',
    VENUE: 'Location',
    COORDINATOR_ID: 'Organizer',
    START_DATE: 'Start Date',
    END_DATE: 'End Date',
    START_TIME: 'Start Time',
    END_TIME: 'End Time',
    DESCRIPTION: 'Description',
    DEPARTMENTS: 'Departments',
    YEARS: 'Years',
    CAPACITY: 'Capacity',
    LAST_ACTION: 'Last Action',
    LAST_ACTION_AT: 'Last Action At',
    LAST_ACTION_BY: 'Last Action By',
    EVENT_COMPLETED_AT: 'Completed At',
    EVENT_ARCHIVE_STATUS: 'Archive Status',

    // Event Registration Configuration
    EVENT_ENABLE_REGISTRATION: 'Enable Registration',
    EVENT_REGISTRATION_OPEN: 'Registration Open Date & Time',
    EVENT_REGISTRATION_CLOSE: 'Registration Close Date & Time',
    EVENT_MAXIMUM_SEATS: 'Maximum Seats',
    EVENT_ALLOW_SPOT_REGISTRATION: 'Allow Spot Registration',
    EVENT_REGISTRATION_FIELDS: 'Registration Fields',
    EVENT_TERMS_AND_CONDITIONS: 'Terms & Conditions',
    EVENT_REGISTRATION_URL: 'Registration URL',

    // Attendance
    ATTENDANCE_ID: 'Attendance ID',
    ATTENDANCE_EVENT_ID: 'Event ID',
    ATTENDANCE_ROLL_NUMBER: 'Roll Number',
    ATTENDANCE_STATUS: 'Attendance Status',
    ATTENDANCE_TIME: 'Attendance Time',
    ATTENDANCE_METHOD: 'Attendance Method',

    // USER PROFILE COLUMNS
    USER_PHONE: "Phone Number",
    USER_PROFILE_PICTURE: "Profile Picture URL",
    USER_BIO: "Bio/Notes",
    USER_THEME: "Theme Preference",
    USER_LANGUAGE: "Language",
    USER_TIMEZONE: "Timezone",
    USER_POPUP_NOTIFICATIONS: "Popup Notifications",
    USER_NOTIFICATION_SOUND: "Notification Sound",

    // Sessions
    SESSION_ID: 'Session ID',
    SESSION_USER_ID: 'User ID',
    SESSION_USERNAME: 'Username',
    SESSION_LOGIN_TIMESTAMP: 'Login Timestamp',
    SESSION_LAST_ACTIVITY_TIMESTAMP: 'Last Activity Timestamp',
    SESSION_LOGOUT_TIMESTAMP: 'Logout Timestamp',
    EXPIRY_TIME: 'Expiry Time',
    SESSION_STATUS: 'Session Status',
    SESSION_IP_ADDRESS: 'IP Address',
    SESSION_USER_AGENT: 'User Agent',
    SESSION_DEVICE_TYPE: 'Device Type',
    SESSION_OS: 'OS',
    SESSION_BROWSER: 'Browser',
    SESSION_LOCATION: 'Location',
    SESSION_LOGIN_METHOD: 'Login Method',
    SESSION_TOKEN: 'Session Token',

    CREATED_BY: 'Created By',
    CREATED_AT: 'Created At',
    UPDATED_BY: 'Updated By',
    UPDATED_AT: 'Updated At',
    DELETION_FLAG: 'Deletion Flag',
    REMARKS: 'Remarks',
    
    USER_OTP: "OTP",
    USER_OTP_EXPIRY: "OTP Expiry",
    USER_OTP_ATTEMPTS: "OTP Attempts",
    
    // Audit Logs
    LOG_ID: 'Log ID',
    LOG_USER_ID: 'User ID',
    LOG_MODULE: 'Module',
    LOG_ACTION: 'Action',

    // Event Coordinators / Assignments
    ASSIGNMENT_ID: 'Assignment ID',
    ASSIGNMENT_EVENT_ID: 'Event ID',
    ASSIGNMENT_USER_ID: 'User ID',

    // Event Participants custom field data
    PARTICIPANT_CUSTOM_DATA: 'Custom Fields Data',

    // Auditing / generic fallbacks
    STATUS: 'Status',
    ROLE: 'Role'
  },

  /**
   * ID column mapping by logical sheet name.
   * NOTE: Values must match the exact header texts in each sheet.
   */
  ID_COLUMNS: {
    AI_ANALYTICS_CACHE: 'Cache ID',
    API_KEYS: 'Key ID',
    ARCHIVES_ATTENDANCE: 'Attendance ID',
    ARCHIVES_AUDITLOGS: 'Log ID',
    ATTENDANCE: 'Attendance ID',
    ATTENDANCE_QUEUE: 'Queue ID',
    AUDITLOGS: 'Log ID',
    CERTIFICATES: 'Certificate ID',
    DEPARTMENTS: 'Department ID',
    DIAGNOSTICS: 'Diagnostics',
    EVENT_COORDINATORS: 'Assignment ID',
    EVENT_PARTICIPANTS: 'Participant ID',
    EVENT_SESSIONS: 'Session ID',
    EVENTS: 'Event ID',
    GENERATED_REPORTS: 'Report ID',
    LMS_INTEGRATIONS: 'Integration ID',
    NOTIFICATION_TEMPLATES: 'Template ID',
    NOTIFICATIONS: 'Notification ID',
    SESSIONS: 'Session ID',
    SETTINGS: 'Setting ID',
    STUDENTS: "Student ID",
    SYSTEM_HEALTH_LOGS: 'Log ID',
    USERS: 'User ID'
  },

  /** @type {Object.<string, {prefix: string, digits: number}>} */
  ID_FORMATS: {
    AI_ANALYTICS_CACHE: { prefix: 'PRE', digits: 6 },
    API_KEYS: { prefix: 'KEY', digits: 6 },
    ARCHIVES_ATTENDANCE: { prefix: 'ATT', digits: 6 },
    ARCHIVES_AUDITLOGS: { prefix: 'LOG', digits: 6 },
    ATTENDANCE: { prefix: 'ATT', digits: 6 },
    ATTENDANCE_QUEUE: { prefix: 'QUE', digits: 6 },
    AUDITLOGS: { prefix: 'LOG', digits: 6 },
    CERTIFICATES: { prefix: 'CRT', digits: 6 },
    DEPARTMENTS: { prefix: 'DEP', digits: 3 },
    EVENT_COORDINATORS: { prefix: 'ASN', digits: 5 },
    EVENT_PARTICIPANTS: { prefix: 'PAR', digits: 5 },
    EVENT_SESSIONS: { prefix: 'SLT', digits: 6 },
    EVENTS: { prefix: 'EVT', digits: 4 },
    GENERATED_REPORTS: { prefix: 'RPT', digits: 6 },
    LMS_INTEGRATIONS: { prefix: 'MAP', digits: 6 },
    NOTIFICATION_TEMPLATES: { prefix: 'TPL', digits: 3 },
    NOTIFICATIONS: { prefix: 'NOT', digits: 6 },
    SESSIONS: { prefix: 'SES', digits: 6 },
    SETTINGS: { prefix: 'SET', digits: 3 },
    SYSTEM_HEALTH_LOGS: { prefix: 'HMT', digits: 6 },
    USERS: { prefix: 'USR', digits: 4 },
    STUDENTS: { prefix: 'STU', digits: 5 }
  },

  REQUIRED_FIELDS: {
    AI_ANALYTICS_CACHE: ['Cache ID', 'Query Hash'],
    API_KEYS: ['Key ID', 'User ID', 'Key Hash'],
    ARCHIVES_ATTENDANCE: ['Attendance ID', 'Event ID', 'Roll Number'],
    ARCHIVES_AUDITLOGS: ['Log ID', 'User ID'],
    ATTENDANCE: ['Attendance ID', 'Event ID', 'Roll Number', 'Attendance Status'],
    ATTENDANCE_QUEUE: ['Queue ID', 'Event ID', 'Status'],
    AUDITLOGS: ['Log ID', 'User ID', 'Module', 'Action'],
    CERTIFICATES: ['Certificate ID', 'User ID', 'Event ID'],
    DEPARTMENTS: ['Department ID', 'Department Name', 'Status'],
    EVENT_COORDINATORS: ['Assignment ID', 'Event ID', 'User ID'],
    EVENT_PARTICIPANTS: ['Participant ID', 'Event ID', 'Roll Number'],
    EVENT_SESSIONS: ['Session ID', 'Event ID', 'Start Time'],
    EVENTS: ['Event ID', 'Event Name', 'Event Status'],
    GENERATED_REPORTS: ['Report ID', 'Event ID', 'Generated Date', 'Status'],
    LMS_INTEGRATIONS: ['Integration ID', 'LMS Name'],
    NOTIFICATION_TEMPLATES: ['Template ID', 'Name', 'Channel'],
    NOTIFICATIONS: ['Notification ID', 'User ID', 'Message', 'Status'],
    SESSIONS: ['Session ID', 'User ID', 'Session Token'],
    SETTINGS: ['Setting ID', 'Category', 'Key', 'Value'],
    STUDENTS: ['Roll Number', 'Student Name', 'Department ID', 'Year', 'Student Status'],
    SYSTEM_HEALTH_LOGS: ['Log ID', 'Component', 'Status'],
    USERS: ["User ID", "Employee ID", "First Name", "Last Name", "Email Address", "Username", "Password Hash", "Role", "Status"]
  },

  /**
   * Shared user-facing and system messages.
   */
  MESSAGES: {
    SUCCESS_DEFAULT: 'Success',
    ERROR_DEFAULT: 'Error occurred',
    VALIDATION_FAILED: 'Validation failed',
    UNAUTHORIZED: 'Unauthorized access.',
    SESSION_EXPIRED: 'Session expired. Please login again.',
    DUPLICATE_RECORD: 'Duplicate record.',
    NOT_FOUND: 'Record not found.',
    ACCOUNT_UNLOCKED: "Account unlocked successfully.",
    ACCOUNT_UNLOCK_FAILED: "Failed to unlock account.",

    // Department Messages
    DEPARTMENT_CREATED: "Department created successfully.",
    DEPARTMENT_CREATE_FAILED: "Department creation failed.",
    DEPARTMENT_NAME_EXISTS: "Department name already exists.",
    DEPARTMENT_CODE_EXISTS: "Department code already exists.",
    DEPARTMENT_UPDATED: "Department updated successfully.",
    DEPARTMENT_UPDATE_FAILED: "Department update failed.",
    DEPARTMENT_DELETED: "Department deleted successfully.",
    DEPARTMENT_DELETE_FAILED: "Department deletion failed.",
    DEPARTMENT_ACTIVATED: "Department activated successfully.",
    DEPARTMENT_ACTIVATE_FAILED: "Department activation failed.",
    DEPARTMENT_DEACTIVATED: "Department deactivated successfully.",
    DEPARTMENT_DEACTIVATE_FAILED: "Department deactivation failed.",
    DEPARTMENT_NOT_FOUND: "Department not found.",

    // Event Messages
    INVALID_COORDINATOR: "Invalid or inactive coordinator specified.",
    EVENT_ALREADY_EXISTS: "An event with the same name, date, time and venue already exists.",
    EVENT_CREATED: "Event created successfully.",
    EVENT_CREATE_FAILED: "Event creation failed.",
    EVENT_UPDATED: "Event updated successfully.",
    EVENT_UPDATE_FAILED: "Event update failed.",
    EVENT_DELETED: "Event deleted successfully.",
    EVENT_DELETE_FAILED: "Event deletion failed.",
    EVENT_NOT_FOUND: "Event not found."
  },

  ROLES: {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    HOD: 'HOD',
    COORDINATOR: 'Coordinator'
  },

  USER_STATUS: { ACTIVE: 'Active', INACTIVE: 'Inactive' },
  EVENT_STATUS: { DRAFT: 'Draft', UPCOMING: 'Upcoming', ACTIVE: 'Active', STOPPED: 'Stopped', COMPLETED: 'Completed', CANCELLED: 'Cancelled' },
  ATTENDANCE_STATUS: { PRESENT: 'Present', ABSENT: 'Absent' },
  SESSION_STATUS: { ACTIVE: 'Active', EXPIRED: 'Expired', LOGGED_OUT: 'Logged Out' },
  REPORT_STATUS: { PENDING: 'Pending', GENERATED: 'Generated', FAILED: 'Failed' },
  NOTIFICATION_STATUS: { UNREAD: 'Unread', READ: 'Read' },
  DEPARTMENT_STATUS: { ACTIVE: 'Active', INACTIVE: 'Inactive' },

  PARTICIPANT_STATUS: {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive'
  },
  STUDENT_STATUS: {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive'
  },

  ATTENDANCE: {
    METHODS: { BARCODE: 'Barcode', MANUAL: 'Manual' },
    DEFAULT_METHOD: 'Barcode',
    ALLOW_UNDO: true,
    UNDO_MINUTES: 2,
    ALLOW_CORRECTION_REQUEST: true
  },

  ATTENDANCE_METHODS: null,

  BARCODE: {
    DEFAULT_CAMERA: 'Back',
    AUTO_RESTART: true,
    SUCCESS_POPUP_DELAY_MS: 2000,
    ERROR_POPUP_DELAY_MS: 2000,
    SUPPORTED_TYPES: ['Barcode', 'QR Code']
  },

  SECURITY: {
    SESSION_TIMEOUT_MINUTES: 480,
    PASSWORD_HASH_ALGO: 'SHA-256',
    MAX_LOGIN_ATTEMPTS: 15,
    MAX_OTP_ATTEMPTS: 10,
    PASSWORD_MIN_LENGTH: 8,
    ALLOW_MULTIPLE_SESSIONS: false,
    OTP_EXPIRY_MINUTES: 10,
    SESSION_CACHE_TTL_SECONDS: 300,
    LAST_ACTIVITY_THROTTLE_MS: 900000
  },

VALIDATION: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    ROLL_NUMBER: /^[A-Za-z0-9_\-\.\/\s]{1,30}$/,
    PHONE: /^[0-9]{10}$/,
    YEAR: /^[1-4]$/,
    SECTION: /^[A-C]$/
  },

  SENSITIVE_FIELDS: ['Password', 'Password Hash'],
  EXPORT_FORMATS: ['PDF', 'Excel', 'CSV', 'Print'],

  REPORTS: {
    AUTO_GENERATE: true,
    KEEP_HISTORY: true
  },

  EXPORT: {
    FORMATS: ['PDF', 'Excel', 'CSV', 'Print']
  },

  NOTIFICATIONS: {
    POPUP_ENABLED: true,
    SOUND_ENABLED: true,
    AUTO_DISMISS_SECONDS: 3
  },

  ACADEMICS: {
    DEPARTMENTS: ['CSE', 'CSE-AIML', 'CSE-DS', 'ECE', 'EEE', 'Civil', 'Mechanical', 'MBA'],
    YEARS: [1, 2, 3, 4],
    SECTIONS: ['A', 'B', 'C']
  },

  DATE_TIME: {
    TIMEZONE: 'Asia/Kolkata',
    DATE_FORMAT: 'yyyy-MM-dd',
    TIME_FORMAT: 'HH:mm:ss',
    TIMESTAMP_FORMAT: 'yyyy-MM-dd HH:mm:ss',
    LOCALE: 'en-IN',
    DATE_ONLY: 'yyyy-MM-dd',
    TIME_ONLY: 'HH:mm:ss',
    FORMAT: 'yyyy-MM-dd HH:mm:ss'
  },

  LOGGING: {
    ENABLED: true,
    AUDIT_ENABLED: true,
    ERROR_LOGGING_ENABLED: true,
    LEVEL: 'INFO'
  },

  DEFAULT_SETTINGS: {
    COLLEGE_NAME: 'BVC Engineering College',
    THEME: 'Default',
    ATTENDANCE_WINDOW_MINUTES: 15
  }
};

// Backward compatible derived aliases
CONFIG.ATTENDANCE_METHODS = Object.values(CONFIG.ATTENDANCE.METHODS);
CONFIG.SECURITY.MIN_PASSWORD_LENGTH = CONFIG.SECURITY.PASSWORD_MIN_LENGTH;
CONFIG.SECURITY.MAX_PASSWORD_LENGTH = 32;
CONFIG.SECURITY.OTP_LENGTH = 6;

// ==========================================================
// EXTENDED PRODUCTION CONFIG
// ==========================================================

CONFIG.SETTING_STATUS = CONFIG.SETTING_STATUS || { ACTIVE: 'Active', INACTIVE: 'Inactive' };

CONFIG.VALIDATION = CONFIG.VALIDATION || {};
CONFIG.VALIDATION.USERNAME = CONFIG.VALIDATION.USERNAME || /^[a-zA-Z0-9_\-]{3,32}$/;
CONFIG.VALIDATION.DEPARTMENT_CODE = CONFIG.VALIDATION.DEPARTMENT_CODE || /^[A-Z]{2,4}[0-9]{0,3}[A-Za-z\-]*$/;

CONFIG.ATTENDANCE = CONFIG.ATTENDANCE || {};
CONFIG.ATTENDANCE.DEFAULT_WINDOW_MINUTES = CONFIG.ATTENDANCE.DEFAULT_WINDOW_MINUTES || (CONFIG.DEFAULT_SETTINGS ? CONFIG.DEFAULT_SETTINGS.ATTENDANCE_WINDOW_MINUTES : 15);

CONFIG.EXPORT = CONFIG.EXPORT || { FORMATS: ['PDF', 'Excel', 'CSV', 'Print'] };
CONFIG.EXPORT_FORMATS = CONFIG.EXPORT_FORMATS || CONFIG.EXPORT.FORMATS || ['PDF', 'Excel', 'CSV', 'Print'];

CONFIG.SECURITY = CONFIG.SECURITY || {};
CONFIG.SECURITY.TOKEN_LENGTH = CONFIG.SECURITY.TOKEN_LENGTH || 32;
CONFIG.SECURITY.HASH_ALGORITHM = CONFIG.SECURITY.HASH_ALGORITHM || CONFIG.SECURITY.PASSWORD_HASH_ALGO;
CONFIG.SECURITY.ALLOWED_FILE_TYPES = CONFIG.SECURITY.ALLOWED_FILE_TYPES || ['application/pdf', 'application/vnd.ms-excel', 'text/csv', 'image/png', 'image/jpeg'];
CONFIG.SECURITY.ALLOWED_EXPORT_FORMATS = CONFIG.SECURITY.ALLOWED_EXPORT_FORMATS || (CONFIG.EXPORT && CONFIG.EXPORT.FORMATS ? CONFIG.EXPORT.FORMATS : ['PDF', 'Excel', 'CSV', 'Print']);

// Shared Messaging Engine Additions
CONFIG.MESSAGES = CONFIG.MESSAGES || {};
CONFIG.MESSAGES.INVALID_CREDENTIALS = CONFIG.MESSAGES.INVALID_CREDENTIALS || 'Invalid credentials.';
CONFIG.MESSAGES.ACCOUNT_INACTIVE = CONFIG.MESSAGES.ACCOUNT_INACTIVE || 'Account is inactive.';
CONFIG.MESSAGES.ACCOUNT_LOCKED = CONFIG.MESSAGES.ACCOUNT_LOCKED || 'Account is locked.';
CONFIG.MESSAGES.INVALID_PASSWORD = CONFIG.MESSAGES.INVALID_PASSWORD || 'Invalid password.';
CONFIG.MESSAGES.MULTIPLE_SESSIONS_NOT_ALLOWED = CONFIG.MESSAGES.MULTIPLE_SESSIONS_NOT_ALLOWED || 'Multiple sessions are not allowed.';
CONFIG.MESSAGES.LOGIN_SUCCESS = CONFIG.MESSAGES.LOGIN_SUCCESS || 'Login successful.';
CONFIG.MESSAGES.LOGOUT_SUCCESS = CONFIG.MESSAGES.LOGOUT_SUCCESS || 'Logout successful.';
CONFIG.MESSAGES.LOGOUT_FAILED = CONFIG.MESSAGES.LOGOUT_FAILED || 'Logout failed.';
CONFIG.MESSAGES.AUTH_SUCCESS = CONFIG.MESSAGES.AUTH_SUCCESS || 'Authentication successful.';
CONFIG.MESSAGES.SESSION_INVALID = CONFIG.MESSAGES.SESSION_INVALID || 'Session is invalid.';
CONFIG.MESSAGES.USER_NOT_FOUND_SESSION = CONFIG.MESSAGES.USER_NOT_FOUND_SESSION || 'User not found for session.';

CONFIG.MESSAGES.USER_NOT_FOUND = CONFIG.MESSAGES.USER_NOT_FOUND || 'User not found.';
CONFIG.MESSAGES.USER_RECORD_MISSING = CONFIG.MESSAGES.USER_RECORD_MISSING || 'User record missing.';
CONFIG.MESSAGES.PASSWORD_CHANGED = CONFIG.MESSAGES.PASSWORD_CHANGED || 'Password changed successfully.';
CONFIG.MESSAGES.PASSWORD_CHANGE_FAILED = CONFIG.MESSAGES.PASSWORD_CHANGE_FAILED || 'Password change failed.';
CONFIG.MESSAGES.INCORRECT_OLD_PASSWORD = CONFIG.MESSAGES.INCORRECT_OLD_PASSWORD || 'Old password is incorrect.';
CONFIG.MESSAGES.PASSWORD_RESET_SUCCESS = CONFIG.MESSAGES.PASSWORD_RESET_SUCCESS || 'Password reset successfully.';
CONFIG.MESSAGES.PASSWORD_RESET_FAILED = CONFIG.MESSAGES.PASSWORD_RESET_FAILED || 'Password reset failed.';

CONFIG.MESSAGES.OTP_GENERATION_FAILED = CONFIG.MESSAGES.OTP_GENERATION_FAILED || 'OTP generation failed.';
CONFIG.MESSAGES.OTP_GENERATED = CONFIG.MESSAGES.OTP_GENERATED || 'OTP generated.';
CONFIG.MESSAGES.OTP_GENERATED_SUCCESS = CONFIG.MESSAGES.OTP_GENERATED_SUCCESS || 'OTP generated.';
CONFIG.MESSAGES.OTP_VERIFIED = CONFIG.MESSAGES.OTP_VERIFIED || 'OTP verified.';
CONFIG.MESSAGES.OTP_VERIFICATION_FAILED = CONFIG.MESSAGES.OTP_VERIFICATION_FAILED || 'OTP verification failed.';
CONFIG.MESSAGES.OTP_MAX_ATTEMPTS_EXCEEDED = CONFIG.MESSAGES.OTP_MAX_ATTEMPTS_EXCEEDED || 'OTP max attempts exceeded.';
CONFIG.MESSAGES.OTP_EXPIRED = CONFIG.MESSAGES.OTP_EXPIRED || 'OTP expired.';
CONFIG.MESSAGES.OTP_INVALID = CONFIG.MESSAGES.OTP_INVALID || 'OTP invalid.';
CONFIG.MESSAGES.OTP_VERIFIED_SUCCESS = CONFIG.MESSAGES.OTP_VERIFIED_SUCCESS || 'OTP verified successfully.';
CONFIG.MESSAGES.OTP_VERIFICATION_SUCCESS = CONFIG.MESSAGES.OTP_VERIFICATION_SUCCESS || 'OTP verified successfully.';
CONFIG.MESSAGES.OTP_INVALID_OR_EXPIRED = CONFIG.MESSAGES.OTP_INVALID_OR_EXPIRED || 'OTP invalid or expired.';
CONFIG.MESSAGES.OTP_VERIFIED_OK = CONFIG.MESSAGES.OTP_VERIFIED_OK || 'OTP verified.';
CONFIG.MESSAGES.OTP_VERIFICATION_OK = CONFIG.MESSAGES.OTP_VERIFICATION_OK || 'OTP verified.';
CONFIG.MESSAGES.OTP_VERIFIED_MESSAGE = CONFIG.MESSAGES.OTP_VERIFIED_MESSAGE || 'OTP verified.';
CONFIG.MESSAGES.OTP_VERIFICATION_MESSAGE = CONFIG.MESSAGES.OTP_VERIFICATION_MESSAGE || 'OTP verified.';
CONFIG.MESSAGES.OTP_VERIFIED_STATUS = CONFIG.MESSAGES.OTP_VERIFICATION_STATUS || 'OTP verified.';
CONFIG.MESSAGES.FIRST_LOGIN = CONFIG.MESSAGES.FIRST_LOGIN || 'First login detected. Please change your password.';

// Student Service Specific Production Messages
CONFIG.MESSAGES.STUDENT_CREATED = CONFIG.MESSAGES.STUDENT_CREATED || "Student created successfully.";
CONFIG.MESSAGES.STUDENT_CREATE_FAILED = CONFIG.MESSAGES.STUDENT_CREATE_FAILED || "Student creation failed.";
CONFIG.MESSAGES.STUDENT_UPDATED = CONFIG.MESSAGES.STUDENT_UPDATED || "Student updated successfully.";
CONFIG.MESSAGES.STUDENT_UPDATE_FAILED = CONFIG.MESSAGES.STUDENT_UPDATE_FAILED || "Student update failed.";
CONFIG.MESSAGES.STUDENT_DELETED = CONFIG.MESSAGES.STUDENT_DELETED || "Student deleted successfully.";
CONFIG.MESSAGES.STUDENT_DELETE_FAILED = CONFIG.MESSAGES.STUDENT_DELETE_FAILED || "Student deletion failed.";
CONFIG.MESSAGES.STUDENT_ACTIVATED = CONFIG.MESSAGES.STUDENT_ACTIVATED || "Student activated successfully.";
CONFIG.MESSAGES.STUDENT_ACTIVATE_FAILED = CONFIG.MESSAGES.STUDENT_ACTIVATE_FAILED || "Student activation failed.";
CONFIG.MESSAGES.STUDENT_DEACTIVATED = CONFIG.MESSAGES.STUDENT_DEACTIVATED || "Student deactivated successfully.";
CONFIG.MESSAGES.STUDENT_DEACTIVATE_FAILED = CONFIG.MESSAGES.STUDENT_DEACTIVATE_FAILED || "Student deactivation failed.";
CONFIG.MESSAGES.STUDENT_ALREADY_ACTIVE = CONFIG.MESSAGES.STUDENT_ALREADY_ACTIVE || "Student is already active.";
CONFIG.MESSAGES.STUDENT_ALREADY_INACTIVE = CONFIG.MESSAGES.STUDENT_ALREADY_INACTIVE || "Student is already inactive.";
CONFIG.MESSAGES.STUDENT_NOT_FOUND = CONFIG.MESSAGES.STUDENT_NOT_FOUND || "Student not found.";
CONFIG.MESSAGES.ROLL_NUMBER_EXISTS = CONFIG.MESSAGES.ROLL_NUMBER_EXISTS || "Roll number already exists.";
CONFIG.MESSAGES.INVALID_DEPARTMENT = CONFIG.MESSAGES.INVALID_DEPARTMENT || "Invalid or inactive department specified.";

// Dynamic Column Fallback Protection
CONFIG.COLUMNS = CONFIG.COLUMNS || {};
CONFIG.COLUMNS.USER_FAILED_ATTEMPTS = CONFIG.COLUMNS.USER_FAILED_ATTEMPTS || 'Failed Login Attempts';
CONFIG.COLUMNS.USER_ACCOUNT_LOCKED = CONFIG.COLUMNS.USER_ACCOUNT_LOCKED || 'Account Locked';
CONFIG.COLUMNS.USER_FIRST_LOGIN = CONFIG.COLUMNS.USER_FIRST_LOGIN || 'First Login';
CONFIG.COLUMNS.USER_LAST_LOGOUT = CONFIG.COLUMNS.USER_LAST_LOGOUT || 'Last Logout';
CONFIG.COLUMNS.USER_PASSWORD_LAST_CHANGED = CONFIG.COLUMNS.USER_PASSWORD_LAST_CHANGED || 'Password Last Changed';
CONFIG.COLUMNS.USER_PASSWORD_RESET_REQUIRED = CONFIG.COLUMNS.USER_PASSWORD_RESET_REQUIRED || 'Password Reset Required';
CONFIG.COLUMNS.USER_SALT = CONFIG.COLUMNS.USER_SALT || 'Password Salt';

CONFIG.COLUMNS.USER_OTP = CONFIG.COLUMNS.USER_OTP || 'OTP';
CONFIG.COLUMNS.USER_OTP_EXPIRY = CONFIG.COLUMNS.USER_OTP_EXPIRY || 'OTP Expiry';
CONFIG.COLUMNS.USER_OTP_ATTEMPTS = CONFIG.COLUMNS.USER_OTP_ATTEMPTS || 'OTP Attempts';

CONFIG.COLUMNS.SESSION_ID = 'Session ID';
CONFIG.COLUMNS.SESSION_USER_ID = 'User ID';
CONFIG.COLUMNS.SESSION_USERNAME = 'Username';
CONFIG.COLUMNS.SESSION_TOKEN = 'Session Token';
CONFIG.COLUMNS.SESSION_LOGIN_TIMESTAMP = 'Login Timestamp';
CONFIG.COLUMNS.SESSION_LAST_ACTIVITY_TIMESTAMP = 'Last Activity Timestamp';
CONFIG.COLUMNS.SESSION_LOGOUT_TIMESTAMP = 'Logout Timestamp';
CONFIG.COLUMNS.SESSION_STATUS = 'Session Status';
CONFIG.COLUMNS.EXPIRY_TIME = 'Expiry Time';

CONFIG.COLUMNS.STATUS = CONFIG.COLUMNS.STATUS || 'Status';
CONFIG.COLUMNS.ROLE = CONFIG.COLUMNS.ROLE || 'Role';
CONFIG.COLUMNS.NOTIFICATION_STATUS = CONFIG.COLUMNS.NOTIFICATION_STATUS || 'Status';
CONFIG.COLUMNS.REPORT_STATUS = CONFIG.COLUMNS.REPORT_STATUS || 'Status';
CONFIG.COLUMNS.SETTING_STATUS = CONFIG.COLUMNS.SETTING_STATUS || 'Status';

CONFIG.EXPORT_FORMATS = CONFIG.EXPORT_FORMATS || (CONFIG.EXPORT && CONFIG.EXPORT.FORMATS ? CONFIG.EXPORT.FORMATS : ['PDF', 'Excel', 'CSV', 'Print']);
CONFIG.SETTING_STATUS = CONFIG.SETTING_STATUS || { ACTIVE: 'Active', INACTIVE: 'Inactive' };