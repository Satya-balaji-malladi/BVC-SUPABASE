/**
 * Service for handling user management.
 * Responsibilities: CRUD operations for users, activation/deactivation, and searching.
 */
const UserService = {

  /**
   * Checks if a username is available.
   * @param {string} username 
   * @returns {boolean} True if available.
   */
  _isUsernameAvailable: function(username) {
    return !DatabaseService.exists(CONFIG.SHEETS.USERS, 'username', username);
  },

  /**
   * Checks if an email is available.
   * @param {string} email 
   * @returns {boolean} True if available.
   */
  _isEmailAvailable: function(email) {
    return !DatabaseService.exists(CONFIG.SHEETS.USERS, 'email', email);
  },

  /**
   * Creates a new user.
   * @param {object} userData 
   * @returns {object} Standard response object.
   */
  createUser: function(userData) {
    Logger.log("BACKEND STEP 3: UserService.createUser started");
    const userToCreate = Object.assign({}, userData);
    userToCreate.role = userToCreate.role || CONFIG.ROLES.COORDINATOR;
    userToCreate.status = userToCreate.status || CONFIG.USER_STATUS.ACTIVE;
    userToCreate.password = userToCreate.password || Utils.generateRandomPassword();

    Logger.log("BACKEND STEP 4: Calling ValidationService.validateUser");
    const validationResult = ValidationService.validateUser(userToCreate);
    if (!validationResult.valid) {
      Logger.log("BACKEND STEP 4: Validation failed: " + validationResult.errors.join(' '));
      return Utils.buildResponse(false, validationResult.errors.join(' '));
    }

    if (!this._isUsernameAvailable(userToCreate.username)) {
      Logger.log("BACKEND STEP 4: Username taken");
      return Utils.buildResponse(false, CONFIG.MESSAGES.USERNAME_EXISTS || 'Username already exists.');
    }

    if (!this._isEmailAvailable(userToCreate.email)) {
      Logger.log("BACKEND STEP 4: Email taken");
      return Utils.buildResponse(false, CONFIG.MESSAGES.EMAIL_EXISTS || 'Email already exists.');
    }

    const userId = IdService.generateUserId();
    
    const newUser = {
      user_id: userId,
      full_name: userToCreate.full_name,
      username: userToCreate.username,
      email: userToCreate.email,
      role: userToCreate.role,
      status: userToCreate.status,
      password: userToCreate.password,
      created_at: Utils.formatDate(Utils.getCurrentDate())
    };

    Logger.log("BACKEND STEP 5: Calling DatabaseService.insertRow for user: " + newUser.user_id);
    const success = DatabaseService.insertRow(CONFIG.SHEETS.USERS, newUser);
    Logger.log("BACKEND STEP 6: DatabaseService.insertRow returned: " + success);

    if (success) {
      return Utils.buildResponse(true, CONFIG.MESSAGES.USER_CREATED || 'User created successfully.', { user: Utils.sanitizeUser(newUser) });
    }
    return Utils.buildResponse(false, CONFIG.MESSAGES.USER_CREATE_FAILED || 'Failed to create user in database.');
  },

  /**
   * Updates an existing user.
   * @param {string} userId 
   * @param {object} userData 
   * @returns {object} Standard response object.
   */
  updateUser: function(userId, userData) {
    const usersSheet = CONFIG.SHEETS.USERS;
    
    if (!DatabaseService.exists(usersSheet, 'user_id', userId)) {
      return Utils.buildResponse(false, CONFIG.MESSAGES.USER_NOT_FOUND || 'User not found.');
    }
    
    const existingRecords = DatabaseService.findByColumn(usersSheet, 'user_id', userId);
    const existingUser = existingRecords[0];
    
    const updatedUser = Object.assign({}, existingUser, userData);
    
    const validationResult = ValidationService.validateUser(updatedUser);
    if (!validationResult.valid) {
      return Utils.buildResponse(false, validationResult.errors.join(' '));
    }

    if (userData.username && userData.username !== existingUser.username) {
      if (!this._isUsernameAvailable(userData.username)) {
        return Utils.buildResponse(false, CONFIG.MESSAGES.USERNAME_EXISTS || 'Username already exists.');
      }
    }

    if (userData.email && userData.email !== existingUser.email) {
      if (!this._isEmailAvailable(userData.email)) {
        return Utils.buildResponse(false, CONFIG.MESSAGES.EMAIL_EXISTS || 'Email already exists.');
      }
    }

    const success = DatabaseService.updateRow(usersSheet, 'user_id', userId, userData);
    if (success) {
      return Utils.buildResponse(true, CONFIG.MESSAGES.USER_UPDATED || 'User updated successfully.', { user: Utils.sanitizeUser(updatedUser) });
    }
    return Utils.buildResponse(false, CONFIG.MESSAGES.USER_UPDATE_FAILED || 'Failed to update user in database.');
  },

  /**
   * Deletes a user.
   * @param {string} userId 
   * @returns {object} Standard response object.
   */
  deleteUser: function(userId) {
    const usersSheet = CONFIG.SHEETS.USERS;
    
    if (!DatabaseService.exists(usersSheet, 'user_id', userId)) {
      return Utils.buildResponse(false, CONFIG.MESSAGES.USER_NOT_FOUND || 'User not found.');
    }

    const success = DatabaseService.deleteRow(usersSheet, 'user_id', userId);
    if (success) {
      return Utils.buildResponse(true, CONFIG.MESSAGES.USER_DELETED || 'User deleted successfully.');
    }
    return Utils.buildResponse(false, CONFIG.MESSAGES.USER_DELETE_FAILED || 'Failed to delete user.');
  },

  /**
   * Activates a user.
   * @param {string} userId 
   * @returns {object} Standard response object.
   */
  activateUser: function(userId) {
    return this.updateUser(userId, { status: CONFIG.USER_STATUS.ACTIVE });
  },

  /**
   * Deactivates a user.
   * @param {string} userId 
   * @returns {object} Standard response object.
   */
  deactivateUser: function(userId) {
    return this.updateUser(userId, { status: CONFIG.USER_STATUS.INACTIVE });
  },

  /**
   * Gets a user by ID.
   * @param {string} userId 
   * @returns {object|null} The user object or null.
   */
  getUserById: function(userId) {
    const records = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, 'user_id', userId);
    return records.length > 0 ? Utils.sanitizeUser(records[0]) : null;
  },

  /**
   * Gets a user by Username.
   * @param {string} username 
   * @returns {object|null} The user object or null.
   */
  getUserByUsername: function(username) {
    const records = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, 'username', username);
    return records.length > 0 ? Utils.sanitizeUser(records[0]) : null;
  },

  /**
   * Gets a user by Email.
   * @param {string} email 
   * @returns {object|null} The user object or null.
   */
  getUserByEmail: function(email) {
    const records = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, 'email', email);
    return records.length > 0 ? Utils.sanitizeUser(records[0]) : null;
  },

  /**
   * Gets all users.
   * @returns {object[]} Array of safe user objects.
   */
  getAllUsers: function() {
    const records = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
    Logger.log("STEP 4 - UserService.getAllUsers received from DB: " + typeof records + " / Array? " + Array.isArray(records) + " / Length: " + records.length);
    const sanitized = records.map(user => Utils.sanitizeUser(user));
    Logger.log("STEP 4 - UserService returning sanitized array: " + Array.isArray(sanitized) + " / Length: " + sanitized.length);
    return sanitized;
  },

  /**
   * Searches users by keyword (username, full_name, or email).
   * @param {string} keyword 
   * @returns {object[]} Array of matching user objects.
   */
  searchUsers: function(keyword) {
    if (Utils.checkEmptyValue(keyword)) return [];
    
    const records = DatabaseService.readAllRows(CONFIG.SHEETS.USERS);
    const lowerKeyword = keyword.toLowerCase();
    
    const results = records.filter(user => {
      return (user.username && user.username.toLowerCase().includes(lowerKeyword)) ||
             (user.full_name && user.full_name.toLowerCase().includes(lowerKeyword)) ||
             (user.email && user.email.toLowerCase().includes(lowerKeyword));
    });

    return results.map(user => Utils.sanitizeUser(user));
  }
};
