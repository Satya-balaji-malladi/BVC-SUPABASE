function TEST_UserService() {
  try {
    var result = UserService.getAllUsers();
    Logger.log("getAllUsers() Success: " + (result !== undefined));
    Logger.log("Is Array: " + Array.isArray(result));
    Logger.log("Count: " + (Array.isArray(result) ? result.length : 0));
    return result;
  } catch (e) {
    Logger.log("Error in TEST_UserService: " + e.message);
    return false;
  }
}
