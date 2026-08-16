export const ROLES = {
  SUPER_ADMIN: 'SuperAdmin',
  DEVELOPER: 'Developer',
  HOD: 'HOD',
  DEPARTMENT_ADMIN: 'DepartmentAdmin',
  EVENT_ADMIN: 'EventAdmin',
  FACULTY: 'Faculty',
  COORDINATOR: 'Coordinator',
  FACULTY_COORDINATOR: 'Faculty Coordinator',
  EVENT_COORDINATOR: 'Event Coordinator',
  STUDENT_COORDINATOR: 'Student Coordinator',
  GUEST_COORDINATOR: 'Guest Coordinator',
  STUDENT: 'Student',
  GUEST: 'Guest',
};

/**
 * Normalizes a role string for comparison by removing spaces, underscores, and capitalizing.
 * e.g., 'Event Admin' -> 'EVENTADMIN'
 */
export const normalizeRole = (role) => {
  if (!role) return '';
  return String(role).replace(/[\s_]+/g, '').toUpperCase();
};

/**
 * Checks if a user's role exists in a list of allowed roles.
 * @param {string} userRole 
 * @param {string[]} allowedRoles 
 * @returns {boolean}
 */
export const hasRole = (userRole, allowedRoles) => {
  if (!userRole || !Array.isArray(allowedRoles)) return false;
  const normalizedUserRole = normalizeRole(userRole);
  return allowedRoles.some(r => normalizeRole(r) === normalizedUserRole);
};

export const isSuperAdmin = (role) => normalizeRole(role) === 'SUPERADMIN';

export const isDeveloper = (role) => normalizeRole(role) === 'DEVELOPER';

export const isSuperAdminOrDev = (role) => isSuperAdmin(role) || isDeveloper(role);

export const isHOD = (role) => ['HOD', 'DEPARTMENTADMIN'].includes(normalizeRole(role));

export const isEventAdmin = (role) => normalizeRole(role) === 'EVENTADMIN';

export const isFaculty = (role) => normalizeRole(role) === 'FACULTY';

export const isStudent = (role) => normalizeRole(role) === 'STUDENT';

export const isGuest = (role) => normalizeRole(role) === 'GUEST';

export const isCoordinator = (role) => {
  const norm = normalizeRole(role);
  return [
    'COORDINATOR', 
    'FACULTYCOORDINATOR', 
    'EVENTCOORDINATOR', 
    'STUDENTCOORDINATOR', 
    'GUESTCOORDINATOR'
  ].includes(norm);
};

/**
 * Gets a clean dashboard route base path based on a role
 */
export const getDashboardBasePathForRole = (role) => {
  const norm = normalizeRole(role);
  
  if (norm === 'SUPERADMIN') return '/super-admin';
  if (norm === 'DEVELOPER') return '/developer';
  if (norm === 'HOD' || norm === 'DEPARTMENTADMIN') return '/department-admin';
  
  // Faculty & EventAdmins go to select-event first, but their dashboard is event-admin
  if (norm === 'FACULTY' || norm === 'EVENTADMIN') return '/select-event';
  
  // Coordinators and others go to select-event -> coordinator
  if (isCoordinator(norm) || norm === 'STUDENT' || norm === 'GUEST') return '/select-event';
  
  return '/login';
};
