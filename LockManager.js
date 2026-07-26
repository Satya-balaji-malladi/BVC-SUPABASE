/**
 * LockManager.js
 * Centralized, production-grade LockService abstraction layer.
 * Enforces deadlock-safe lock acquisition and execution wrappers.
 */
const LockManager = {
  
  /**
   * PRIVATE: Resolves appropriate Lock instance based on type.
   * @param {string} lockType 'Script', 'Document', or 'User'
   * @return {Lock} Apps Script Lock instance
   */
  _getLock: function(lockType) {
    if (lockType === 'User') return LockService.getUserLock();
    if (lockType === 'Document') return LockService.getDocumentLock();
    return LockService.getScriptLock();
  },

  /**
   * Executes a callback within a safe Lock block.
   * Ensures the lock is guaranteed to be released in a finally block.
   * @param {string} [lockType='Script'] 'Script', 'Document', or 'User'
   * @param {number} [timeoutMs=10000] Lock wait timeout in milliseconds
   * @param {function} callback Function block to execute within lock
   * @return {any} Return value of the callback
   */
  withLock: function(lockType, timeoutMs, callback) {
    const lock = this._getLock(lockType || 'Script');
    const timeout = timeoutMs || 10000;
    const ok = lock.tryLock(timeout);
    if (!ok) {
      throw new Error("Concurrency Lock Timeout: Failed to acquire " + (lockType || 'Script') + " lock within " + timeout + "ms");
    }
    try {
      return callback();
    } finally {
      try {
        lock.releaseLock();
      } catch (e) {
        Logger.log("LockManager: failed to release " + (lockType || 'Script') + " lock: " + e.message);
      }
    }
  }
};
