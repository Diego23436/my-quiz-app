/**
 * Teacher/Admin Authentication Credentials
 * Hardcoded credentials for authorized teachers and admins
 * DO NOT expose this in frontend code in production
 */

export const authorizedUsers = {
  // Admin 1
  "bilongue30@gmail.com": {
    password: "00123456789",
    role: "admin",
    name: "Admin User 1",
  },
  // Admin 2 / Teacher (same credentials for now)
  "kamwamacsim@gmail.com": {
    password: "0012345678900",
    role: "teacher", // Can be changed to "teacher" if needed
    name: "Teacher User ",
  },
};

/**
 * Check if email is a teacher or admin
 * @param {string} email - Email to check
 * @returns {boolean} True if user is teacher/admin
 */
export const isTeacherOrAdmin = (email) => {
  return email.toLowerCase() in authorizedUsers;
};

/**
 * Verify teacher/admin credentials
 * @param {string} email - Email address
 * @param {string} password - Password
 * @returns {object|null} User object if valid, null otherwise
 */
export const verifyCredentials = (email, password) => {
  const user = authorizedUsers[email.toLowerCase()];
  if (user && user.password === password) {
    return { email: email.toLowerCase(), role: user.role, name: user.name };
  }
  return null;
};

/**
 * Get user role
 * @param {string} email - Email address
 * @returns {string|null} Role if found, null otherwise
 */
export const getUserRole = (email) => {
  const user = authorizedUsers[email.toLowerCase()];
  return user ? user.role : null;
};
