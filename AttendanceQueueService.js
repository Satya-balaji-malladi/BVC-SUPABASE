/**
 * AttendanceQueueService.js
 * High-Performance Asynchronous Attendance Queue & Batch Processor.
 * Eliminates scanner latency by enqueuing scans for sub-50ms instant UI feedback.
 */
const AttendanceQueueService = {
  _queueKey: "attendance_scan_queue_buffer",
  _queueMemoryBuffer: [],

  getQueue: function() {
    try {
      if (typeof CacheManager !== 'undefined') {
        const cached = CacheManager.get(this._queueKey);
        if (cached && Array.isArray(cached)) return cached;
      }
      return this._queueMemoryBuffer || [];
    } catch (e) {
      return this._queueMemoryBuffer || [];
    }
  },

  _saveQueue: function(queue) {
    this._queueMemoryBuffer = queue;
    if (typeof CacheManager !== 'undefined') {
      CacheManager.put(this._queueKey, queue, 1800);
    }
  },

  /**
   * Enqueues an incoming scan payload instantly for sub-50ms UI response.
   */
  enqueueScan: function(attendanceData, sessionUserId) {
    const startTime = Date.now();
    try {
      if (!attendanceData) return Utils.buildResponse(false, 'Invalid scan payload');

      var eventId = attendanceData.eventId || attendanceData.event_id || attendanceData['Event ID'];
      var rollNumber = attendanceData.rollNumber || attendanceData.roll_number || attendanceData['Roll Number'];
      var status = attendanceData.status || attendanceData['Attendance Status'] || 'PRESENT';

      if (!eventId || !rollNumber) {
        return Utils.buildResponse(false, 'Missing required event ID or roll number');
      }

      var scanItem = {
        scanId: 'QSCAN-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        eventId: String(eventId).trim(),
        rollNumber: String(rollNumber).trim().toUpperCase(),
        status: String(status).toUpperCase(),
        method: attendanceData.method || 'BARCODE',
        scannedBy: sessionUserId || 'Scanner',
        timestamp: new Date().toISOString(),
        queuedAt: Date.now(),
        statusState: 'QUEUED'
      };

      var queue = this.getQueue();

      var duplicateInQueue = queue.some(function(item) {
        return item.eventId === scanItem.eventId &&
               item.rollNumber === scanItem.rollNumber &&
               item.statusState !== 'FAILED';
      });

      if (duplicateInQueue) {
        return Utils.buildResponse(false, 'Scan already queued for this student.');
      }

      queue.push(scanItem);
      this._saveQueue(queue);

      var elapsed = Date.now() - startTime;
      Logger.log("ATTENDANCE_QUEUE | Enqueued scan " + scanItem.scanId + " in " + elapsed + "ms");

      // ⚡ Synchronous batch flush removed to guarantee sub-50ms instant UI response.
      // Batch processing is handled via markOpenEventAttendanceFast or background worker.

      return Utils.buildResponse(true, 'Scan accepted instantly', {
        scanId: scanItem.scanId,
        instantSuccess: true,
        responseTimeMs: elapsed,
        queuePosition: queue.length
      });
    } catch (error) {
      Logger.log("AttendanceQueueService.enqueueScan error: " + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, 'Queue enqueueing failed');
    }
  },

  /**
   * Flushes and processes pending queue batch to Google Sheets.
   */
  processQueueBatch: function() {
    try {
      var queue = this.getQueue();
      var pending = queue.filter(function(i) { return i.statusState === 'QUEUED'; });

      if (pending.length === 0) {
        return { success: true, processed: 0, remaining: 0 };
      }

      var lock = LockService.getScriptLock();
      if (!lock.tryLock(5000)) {
        return { success: false, message: 'Lock contention, retrying next tick' };
      }

      var processedCount = 0;
      try {
        pending.forEach(function(item) {
          item.statusState = 'PROCESSING';
          var res = AttendanceService.markAttendance({
            eventId: item.eventId,
            rollNumber: item.rollNumber,
            status: item.status,
            method: item.method
          }, item.scannedBy);

          if (res && res.success) {
            item.statusState = 'COMPLETED';
            processedCount++;
          } else {
            item.statusState = 'FAILED';
            item.error = res ? res.message : 'Write failed';
          }
        });

        var remainingQueue = queue.filter(function(i) { return i.statusState !== 'COMPLETED'; });
        this._saveQueue(remainingQueue);

        return { success: true, processed: processedCount, remaining: remainingQueue.length };
      } finally {
        lock.releaseLock();
      }
    } catch (error) {
      Logger.log("AttendanceQueueService.processQueueBatch error: " + (error && error.message ? error.message : error));
      return { success: false, message: error.message };
    }
  },

  getQueueStatus: function() {
    var queue = this.getQueue();
    var queued = queue.filter(function(i) { return i.statusState === 'QUEUED'; }).length;
    var processing = queue.filter(function(i) { return i.statusState === 'PROCESSING'; }).length;
    var failed = queue.filter(function(i) { return i.statusState === 'FAILED'; }).length;

    return {
      totalInQueue: queue.length,
      queuedCount: queued,
      processingCount: processing,
      failedCount: failed,
      health: failed === 0 ? 'HEALTHY' : 'WARNING'
    };
  },

  clearQueue: function() {
    this._saveQueue([]);
    return Utils.buildResponse(true, 'Queue buffer cleared');
  }
};
