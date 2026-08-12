/**
 * Google Apps Script - REST API Entry Point for BVC Event Management System
 * This file serves as the backend Microservice for sending emails.
 * It is called by the React Frontend (hosted on GitHub Pages).
 */

// Configure developer email
const DEVELOPER_EMAIL = "satya.developer@example.com"; // User should change this

/**
 * Handle HTTP POST Requests from React Frontend
 */
function doPost(e) {
  // Always return CORS headers for cross-origin requests from GitHub Pages
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No data provided");
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    
    var responseData = {};

    switch (action) {
      case "sendFeedbackAlert":
        responseData = handleFeedbackAlert(payload.data);
        break;
      case "sendInlineCredentials":
        responseData = handleInlineCredentials(payload.data);
        break;
      case "sendEventAssignment":
        responseData = handleEventAssignment(payload.data);
        break;
      default:
        throw new Error("Unknown action: " + action);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: responseData
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
  }
}

/**
 * Handle HTTP OPTIONS Requests (Preflight for CORS)
 */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
}


// ==========================================
// EMAIL HANDLERS
// ==========================================

function handleFeedbackAlert(data) {
  const type = data.type; // 'Feedback' or 'Problem/Bug'
  const description = data.description;
  const userRole = data.userRole || 'Unknown Role';
  
  const subject = `[BVC System Alert] New ${type} Submitted`;
  const body = `
Hello Developer,

A new ${type} has been submitted to the BVC Event Management System.

Sender Role: ${userRole}
Details:
${description}

Please log in to the Developer Dashboard to review this ticket.

Best,
BVC System
  `;
  
  GmailApp.sendEmail(DEVELOPER_EMAIL, subject, body);
  return { message: "Developer notified" };
}

function handleInlineCredentials(data) {
  const email = data.email;
  const name = data.name;
  const password = data.password;
  const eventName = data.eventName;
  
  const subject = `Your Credentials for BVC Event: ${eventName}`;
  const body = `
Hello ${name},

You have been granted temporary access to the BVC Event Management System for the event: ${eventName}.

Login Details:
URL: https://<YOUR_GITHUB_PAGES_URL>
Email: ${email}
Temporary Password: ${password}

Please log in to access your dashboard. Your account will automatically expire when the event is completed.

Best,
BVC Administration
  `;
  
  GmailApp.sendEmail(email, subject, body);
  return { message: "Credentials sent" };
}

function handleEventAssignment(data) {
  const email = data.email;
  const name = data.name;
  const eventName = data.eventName;
  const role = data.role; // 'Event Admin' or 'Coordinator'
  
  const subject = `BVC System - Assigned to Event: ${eventName}`;
  const body = `
Hello ${name},

You have been assigned as an ${role} for the upcoming event: ${eventName}.

Please log in to the BVC Event Management System to view your responsibilities and manage the event.

Best,
BVC Administration
  `;
  
  GmailApp.sendEmail(email, subject, body);
  return { message: "Assignment email sent" };
}
