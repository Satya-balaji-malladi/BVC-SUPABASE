const GOOGLE_APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

export const emailService = {
  /**
   * Send Feedback or Bug Alert to Developer
   */
  sendFeedbackAlert: async (data) => {
    return _sendPostRequest('sendFeedbackAlert', data);
  },

  /**
   * Send Inline Credentials to Faculty/Coordinators
   * @param {Object} data - { email, name, password, eventName }
   */
  sendInlineCredentials: async (data) => {
    return _sendPostRequest('sendInlineCredentials', data);
  },

  /**
   * Send Event Assignment Notification
   * @param {Object} data - { email, name, eventName, role }
   */
  sendEventAssignment: async (data) => {
    return _sendPostRequest('sendEventAssignment', data);
  }
};

async function _sendPostRequest(action, data) {
  if (!GOOGLE_APPS_SCRIPT_URL) {
    console.warn('VITE_APPS_SCRIPT_URL is not defined in .env. Skipping email sending.', { action, data });
    return { success: false, message: 'URL not configured' };
  }

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Bypass CORS preflight issues with GAS
      },
      body: JSON.stringify({ action, data }),
    });

    const result = await response.json();
    return { success: result.status === 'success', ...result };
  } catch (error) {
    console.error(`Email Service Error [${action}]:`, error);
    return { success: false, error };
  }
}
