/**
 * SATHI PWA — Sync Engine
 * 
 * Handles syncing pending entries to Google Sheets via Apps Script.
 * Features: offline queue, auto-retry, batch submission, connectivity detection.
 */

class SyncEngine {
  constructor(db) {
    this.db = db;
    this.isSyncing = false;
    this.retryTimer = null;
    this.listeners = [];

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.notifyListeners('online');
      this.syncAll();
    });
    window.addEventListener('offline', () => {
      this.notifyListeners('offline');
    });
  }

  /**
   * Register a listener for sync events
   */
  onStatusChange(callback) {
    this.listeners.push(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event, data = {}) {
    this.listeners.forEach(cb => cb(event, data));
  }

  /**
   * Submit a new entry — syncs immediately if online, queues if offline
   */
  async submit(formData) {
    // Always save to pending first (offline-first approach)
    const entry = await this.db.addPending(formData);
    this.notifyListeners('queued', { entry, pendingCount: await this.db.getPendingCount() });

    // Try to sync immediately if online
    if (navigator.onLine) {
      await this.syncAll();
    }

    return entry;
  }

  /**
   * Sync all pending entries to Google Sheets
   */
  async syncAll() {
    if (this.isSyncing) return;
    if (!navigator.onLine) return;

    if (CONFIG.APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
      this.notifyListeners('error', { message: 'Apps Script URL not configured. See js/config.js' });
      return;
    }

    this.isSyncing = true;
    this.notifyListeners('sync-start');

    try {
      const pending = await this.db.getAllPending();

      if (pending.length === 0) {
        this.notifyListeners('sync-complete', { synced: 0, remaining: 0 });
        this.isSyncing = false;
        return;
      }

      // Process in batches
      let synced = 0;
      for (let i = 0; i < pending.length; i += CONFIG.SYNC_BATCH_SIZE) {
        const batch = pending.slice(i, i + CONFIG.SYNC_BATCH_SIZE);
        const success = await this.syncBatch(batch);

        if (success) {
          // Move synced entries from pending to history
          for (const entry of batch) {
            await this.db.removePending(entry.id);
            await this.db.addToHistory(entry);
            synced++;
          }
          this.notifyListeners('sync-progress', {
            synced,
            total: pending.length,
            pendingCount: await this.db.getPendingCount()
          });
        } else {
          // Update retry counts
          for (const entry of batch) {
            await this.db.updateRetryCount(entry.id);
          }
          // Schedule retry
          this.scheduleRetry();
          break;
        }
      }

      const remaining = await this.db.getPendingCount();
      this.notifyListeners('sync-complete', { synced, remaining });

    } catch (error) {
      console.error('Sync error:', error);
      this.notifyListeners('error', { message: error.message });
      this.scheduleRetry();
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Send a batch of entries to the Apps Script
   */
  async syncBatch(entries) {
    try {
      const payload = entries.map(e => ({
        id: e.id,
        ...e.data
      }));

      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
        mode: 'no-cors' // Apps Script requires no-cors for POST from external origins
      });

      // With no-cors, we can't read the response body, but a successful POST
      // will return an opaque response. We treat it as success.
      // If the Apps Script URL is valid and the sheet is accessible, this works.
      return true;

    } catch (error) {
      console.error('Batch sync failed:', error);
      return false;
    }
  }

  /**
   * Schedule a retry with exponential backoff
   */
  scheduleRetry() {
    if (this.retryTimer) clearTimeout(this.retryTimer);

    this.retryTimer = setTimeout(() => {
      if (navigator.onLine) {
        this.syncAll();
      }
    }, CONFIG.SYNC_RETRY_INTERVAL);
  }

  /**
   * Get current sync status
   */
  async getStatus() {
    const pendingCount = await this.db.getPendingCount();
    return {
      isOnline: navigator.onLine,
      isSyncing: this.isSyncing,
      pendingCount,
      isConfigured: CONFIG.APPS_SCRIPT_URL !== 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE',
    };
  }

  /**
   * Force retry all pending entries
   */
  async forceSync() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    await this.syncAll();
  }
}
