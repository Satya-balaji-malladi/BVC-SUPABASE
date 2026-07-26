/**
 * Code.js
 * 
 * Entry point for Google Apps Script Web App container.
 * Handles HTTP GET/POST endpoints, SPA component injection, and template loaders.
 * Exposes no business API wrappers directly (consolidated in Api.js).
 */

/**
 * GET handler to serve initial HTML templates.
 * Supports routing via query parameters: page=Login, page=ForgotPassword, page=Dashboard, page=Coordinator.
 */
function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) || 'Login';
  
  if (page.toLowerCase() === 'forgotpassword') {
    return HtmlService.createTemplateFromFile('ForgotPassword')
        .evaluate()
        .setTitle('Forgot Password - BVC System')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (page.toLowerCase() === 'completeprofile') {
    return HtmlService.createTemplateFromFile('CompleteProfile')
        .evaluate()
        .setTitle('Complete Profile - BVC System')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  if (page.toLowerCase() === 'dashboard') {
    return HtmlService.createTemplateFromFile('Index')
        .evaluate()
        .setTitle('Dashboard - Admin')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (page.toLowerCase() === 'coordinator') {
    try {
      return HtmlService.createTemplateFromFile('Coordinator')
          .evaluate()
          .setTitle('Dashboard - Coordinator')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (e) {
      // Fallback if CoordinatorIndex doesn't exist yet
      return HtmlService.createTemplateFromFile('Index')
          .evaluate()
          .setTitle('Dashboard - Coordinator (Fallback)')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  }

  if (page.toLowerCase() === 'register' || page.toLowerCase() === 'registration') {
    var template = HtmlService.createTemplateFromFile('RegistrationForm');
    template.eventId = (e && e.parameter && e.parameter.eventId) || '';
    return template.evaluate()
        .setTitle('Event Registration - BVC System')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  if (page.toLowerCase() === 'login') {
    return HtmlService.createTemplateFromFile('Login')
        .evaluate()
        .setTitle('Login - BVC System')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  // Default fallback to Login
  return HtmlService.createTemplateFromFile('Login')
      .evaluate()
      .setTitle('Login - BVC System')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * POST handler for external API requests.
 */
function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var args = postData.arguments || [];
    
    var result;
    if (typeof this[action] === 'function') {
      result = this[action].apply(null, args);
    } else if (typeof globalThis[action] === 'function') {
      result = globalThis[action].apply(null, args);
    } else {
      throw new Error("Method " + action + " not found on server.");
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log("[ERROR] doPost: " + error.message);
    var errResp = { success: false, message: error.message };
    return ContentService.createTextOutput(JSON.stringify(errResp))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Returns the raw HTML content for Vanilla SPA navigation
 * to avoid Chrome sandbox top-navigation blocks.
 */
function getPageContent(page) {
  var p = (page || 'login').toLowerCase();
  try {
    if (p === 'forgotpassword') return HtmlService.createTemplateFromFile('ForgotPassword').evaluate().getContent();
    if (p === 'completeprofile') return HtmlService.createTemplateFromFile('CompleteProfile').evaluate().getContent();
    if (p === 'dashboard') return HtmlService.createTemplateFromFile('Index').evaluate().getContent();
    if (p === 'register' || p === 'registration') return HtmlService.createTemplateFromFile('RegistrationForm').evaluate().getContent();
    if (p === 'coordinator') {
      try {
        return HtmlService.createTemplateFromFile('Coordinator').evaluate().getContent();
      } catch (e) {
        return HtmlService.createTemplateFromFile('Index').evaluate().getContent();
      }
    }
    return HtmlService.createTemplateFromFile('Login').evaluate().getContent();
  } catch (e) {
    return "Error loading page: " + e.message;
  }
}

/**
 * Returns the raw HTML content of an inner component (Dashboard, Users, Events, etc.)
 * to be injected into the App Shell's pageContainer.
 */
function getComponentHtml(component) {
  try {
    if (!component) return '';
    var name = component.charAt(0).toUpperCase() + component.slice(1);
    return HtmlService.createTemplateFromFile(name).evaluate().getContent();
  } catch (e) {
    // Return empty state or error if component not found
    return `<div class="alert alert-danger m-4"><i class="bi bi-exclamation-triangle-fill me-2"></i> Failed to load component: ${component}</div>`;
  }
}

/**
 * Returns the deployment URL.
 */
function getScriptUrl() {
  try {
    return ScriptApp.getService().getUrl();
  } catch(e) {
    return "";
  }
}

/**
 * Helper function to include external HTML files within the template
 * @param {string} filename 
 */
function include(filename) {
  return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
}
