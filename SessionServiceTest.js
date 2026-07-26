function testCreateSession() {

  Logger.log("===== TEST : createSession =====");

  try {

    // Get an existing user
    const user = DatabaseService.findOne(
      "USERS",
      "Username",
      "jdoe"
    );

    if (!user) {
      Logger.log("❌ Test User Not Found");
      return;
    }

    const session = SessionService.createSession(user);

    if (session) {
      Logger.log("✅ PASS");
      Logger.log(JSON.stringify(session));
    } else {
      Logger.log("❌ FAIL");
    }

  } catch (e) {

    Logger.log("❌ EXCEPTION");
    Logger.log(e.message);

  }

}
function testGetSession() {

  Logger.log("===== TEST : getSession =====");

  try {

    // Create a session first
    const user = DatabaseService.findOne(
      "USERS",
      "Username",
      "jdoe"
    );

    const createdSession = SessionService.createSession(user);

    const token = createdSession["Session Token"];

    // Fetch the same session
    const session = SessionService.getSession(token);

    if (session) {
      Logger.log("✅ PASS");
      Logger.log(JSON.stringify(session));
    } else {
      Logger.log("❌ FAIL");
    }

  } catch (e) {

    Logger.log("❌ EXCEPTION");
    Logger.log(e.message);

  }

}
function testValidateSession() {

  Logger.log("===== TEST : validateSession =====");

  try {

    const user = DatabaseService.findOne(
      "USERS",
      "Username",
      "jdoe"
    );

    const session = SessionService.createSession(user);

    const token = session["Session Token"];

    const result = SessionService.validateSession(token);

    if(result){

      Logger.log("✅ PASS");

    }else{

      Logger.log("❌ FAIL");

    }

  } catch(e){

    Logger.log(e);

  }

}
function debugLatestSession() {

  Logger.log("===== DEBUG SESSION =====");

  var rows = DatabaseService.readAllRows("SESSIONS");

  Logger.log(JSON.stringify(rows[rows.length-1]));

}
function debugCreateSession() {

  const user = DatabaseService.findOne(
      "USERS",
      "Username",
      "jdoe"
  );

  const session = SessionService.createSession(user);

  Logger.log("TOKEN");
  Logger.log(session["Session Token"]);

  const record = DatabaseService.findOne(
      "SESSIONS",
      "Session Token",
      session["Session Token"]
  );

  Logger.log("DATABASE RECORD");
  Logger.log(JSON.stringify(record));

}
function debugSessionRead() {
  var records = DatabaseService.readAllRows("SESSIONS");
  Logger.log(JSON.stringify(records[records.length - 1]));
}
function debugHeadersAndRow() {

  var sheet = DatabaseService.getSheet("SESSIONS");

  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  var row = sheet.getRange(sheet.getLastRow(),1,1,sheet.getLastColumn()).getValues()[0];

  Logger.log("HEADERS");
  Logger.log(JSON.stringify(headers));

  Logger.log("ROW");
  Logger.log(JSON.stringify(row));

}
function testSessionWrite() {

  var sheet = DatabaseService.getSheet("SESSIONS");

  var row = sheet.getLastRow() + 1;

  sheet.getRange(row,4).setValue(123);
  sheet.getRange(row,5).setValue(456);
  sheet.getRange(row,6).setValue(789);

  Logger.log(sheet.getRange(row,4,1,3).getValues());

}
function inspectSessionColumns() {
  var sheet = DatabaseService.getSheet("SESSIONS");

  Logger.log("Last Column: " + sheet.getLastColumn());

  for (var c = 4; c <= 6; c++) {
    var range = sheet.getRange(2, c); // Login, Last Activity, Expiry
    Logger.log(
      "Col " + c +
      " | NumberFormat = " + range.getNumberFormat() +
      " | DataValidation = " + (range.getDataValidation() ? "YES" : "NO")
    );
  }
}

function runSessionServiceUnitTests() {
  Logger.log('--- Running SessionServiceUnitTests ---');
  testCreateSession();
  testGetSession();
  testValidateSession();
  Logger.log('--- SessionServiceUnitTests Completed ---');
}