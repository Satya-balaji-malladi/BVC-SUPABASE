/**
 * Centralized utility for standardizing and working with department codes.
 * Ensures consistent checking across the application, resolving issues like 'DEPT_CSE' vs 'CSE'.
 */

export const DEPARTMENTS = {
  CSE: 'CSE',
  ECE: 'ECE',
  EEE: 'EEE',
  MECH: 'MECH',
  CIVIL: 'CIVIL',
  IT: 'IT',
  AIDS: 'AIDS',
  AIML: 'AIML',
  BSH: 'BSH'
};

/**
 * Normalizes a department string (removes DEPT_ prefixes and whitespace).
 * e.g., 'DEPT_CSE' -> 'CSE', ' cse ' -> 'CSE'
 * @param {string} dept 
 * @returns {string} Normalized department code
 */
export const normalizeDepartment = (dept) => {
  if (!dept) return '';
  let cleaned = String(dept).toUpperCase().trim();
  if (cleaned.startsWith('DEPT_')) {
    cleaned = cleaned.substring(5);
  }
  return cleaned;
};

/**
 * Gets a standardized display label for a department.
 * @param {string} dept 
 * @returns {string} 
 */
export const getDepartmentLabel = (dept) => {
  const norm = normalizeDepartment(dept);
  return norm || 'All Departments';
};

/**
 * Checks if two department strings represent the same department.
 * @param {string} dept1 
 * @param {string} dept2 
 * @returns {boolean}
 */
export const isSameDepartment = (dept1, dept2) => {
  if (!dept1 || !dept2) return false;
  return normalizeDepartment(dept1) === normalizeDepartment(dept2);
};

/**
 * Checks if a user's department matches a target department (often used for HOD checks).
 * @param {string} userDept 
 * @param {string} targetDept 
 * @returns {boolean}
 */
export const isUserInDepartment = (userDept, targetDept) => {
  return isSameDepartment(userDept, targetDept);
};
