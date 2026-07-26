/**
 * Entry point for Google Apps Script Web App
 */
function doGet(e) {
  // Returns the Index.html as an HtmlOutput object
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('BVC Event Attendance Admin')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * Helper function to include external HTML files within the template
 * @param {string} filename 
 */
function include(filename) {
  return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
}

// ==========================================
// Global API Wrappers (callable by google.script.run)
// ==========================================

function getAllEvents() {
  try {
    const res = Controller.Event.getAllEvents();
    // Force serialization to strip any Google Apps Script internal types (like Dates) that might break google.script.run
    const serialized = JSON.parse(JSON.stringify(res || []));
    Logger.log("Global getAllEvents() returning array of length: " + serialized.length);
    return serialized;
  } catch (e) {
    Logger.log("Error in global getAllEvents: " + e.message);
    return [];
  }
}

function getAllUsers() {
  try {
    const res = Controller.User.getAllUsers();
    Logger.log("STEP 2 - Code.js received from Controller: " + typeof res + " / Array? " + Array.isArray(res) + " / Length: " + (res ? res.length : 0));
    // Force serialization to strip any Google Apps Script internal types (like Dates)
    const serialized = JSON.parse(JSON.stringify(res || []));
    Logger.log("STEP 2 - Code.js returning serialized: " + typeof serialized + " / Array? " + Array.isArray(serialized) + " / Length: " + serialized.length);
    return serialized;
  } catch (e) {
    Logger.log("STEP 2 - Error in global getAllUsers: " + e.message);
    return [];
  }
}

function createUser(userData) {
  try {
    Logger.log("BACKEND STEP 1: Code.js createUser started.");
    const result = Controller.User.createUser(userData);
    const serialized = JSON.parse(JSON.stringify(result || {}));
    Logger.log("BACKEND STEP 8: Code.js createUser finished. Returning: " + JSON.stringify(serialized));
    return serialized;
  } catch (e) {
    Logger.log("BACKEND EXCEPTION in Code.js createUser: " + e.message + "\\n" + e.stack);
    return { success: false, message: "Backend crash: " + e.message };
  }
}

function getAllStudents() {
  try {
    const res = Controller.Student.getAllStudents();
    return JSON.parse(JSON.stringify(res || []));
  } catch(e) {
    return [];
  }
}

function getDashboardSummary() {
  try {
    const res = Controller.Report.getDashboardSummary();
    return JSON.parse(JSON.stringify(res || {}));
  } catch(e) {
    return {};
  }
}

function getAttendanceByEvent(eventId) {
  try {
    const res = Controller.Attendance.getAttendanceByEvent(eventId);
    return JSON.parse(JSON.stringify(res || []));
  } catch(e) {
    return [];
  }
}
