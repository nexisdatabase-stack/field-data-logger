/**
 * SATHI PWA — IndexedDB Wrapper
 * 
 * Provides offline storage for pending field data submissions
 * and a history log of successfully synced entries.
 */

class SathiDB {
  constructor() {
    this.db = null;
    this.dbName = CONFIG.DB_NAME;
    this.dbVersion = CONFIG.DB_VERSION;
  }

  /**
   * Open / initialize the database
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store for pending (not yet synced) entries
        if (!db.objectStoreNames.contains(CONFIG.STORE_PENDING)) {
          const pendingStore = db.createObjectStore(CONFIG.STORE_PENDING, {
            keyPath: 'id',
            autoIncrement: false,
          });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
          pendingStore.createIndex('plot', 'data.plot', { unique: false });
        }

        // Store for submission history (already synced)
        if (!db.objectStoreNames.contains(CONFIG.STORE_HISTORY)) {
          const historyStore = db.createObjectStore(CONFIG.STORE_HISTORY, {
            keyPath: 'id',
            autoIncrement: false,
          });
          historyStore.createIndex('syncedAt', 'syncedAt', { unique: false });
          historyStore.createIndex('date', 'data.date', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Generate a unique ID for entries
   */
  generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }

  // ── Pending Entries ───────────────────────────────────────────────

  /**
   * Add an entry to the pending queue
   */
  async addPending(data) {
    const entry = {
      id: this.generateId(),
      data: data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(CONFIG.STORE_PENDING, 'readwrite');
      const store = tx.objectStore(CONFIG.STORE_PENDING);
      const request = store.add(entry);

      request.onsuccess = () => resolve(entry);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Get all pending entries
   */
  async getAllPending() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(CONFIG.STORE_PENDING, 'readonly');
      const store = tx.objectStore(CONFIG.STORE_PENDING);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Get count of pending entries
   */
  async getPendingCount() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(CONFIG.STORE_PENDING, 'readonly');
      const store = tx.objectStore(CONFIG.STORE_PENDING);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Remove a pending entry (after successful sync)
   */
  async removePending(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(CONFIG.STORE_PENDING, 'readwrite');
      const store = tx.objectStore(CONFIG.STORE_PENDING);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Update retry count for a pending entry
   */
  async updateRetryCount(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(CONFIG.STORE_PENDING, 'readwrite');
      const store = tx.objectStore(CONFIG.STORE_PENDING);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const entry = getReq.result;
        if (entry) {
          entry.retryCount = (entry.retryCount || 0) + 1;
          entry.lastRetry = new Date().toISOString();
          const putReq = store.put(entry);
          putReq.onsuccess = () => resolve(entry);
          putReq.onerror = (e) => reject(e.target.error);
        } else {
          resolve(null);
        }
      };
      getReq.onerror = (e) => reject(e.target.error);
    });
  }

  // ── Submission History ────────────────────────────────────────────

  /**
   * Add entry to history (after successful sync)
   */
  async addToHistory(pendingEntry) {
    const historyEntry = {
      id: pendingEntry.id,
      data: pendingEntry.data,
      createdAt: pendingEntry.timestamp,
      syncedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(CONFIG.STORE_HISTORY, 'readwrite');
      const store = tx.objectStore(CONFIG.STORE_HISTORY);
      const request = store.add(historyEntry);

      request.onsuccess = () => resolve(historyEntry);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Get recent history entries
   */
  async getRecentHistory(limit = 20) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(CONFIG.STORE_HISTORY, 'readonly');
      const store = tx.objectStore(CONFIG.STORE_HISTORY);
      const index = store.index('syncedAt');
      const request = index.openCursor(null, 'prev');
      const results = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Clear all history
   */
  async clearHistory() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(CONFIG.STORE_HISTORY, 'readwrite');
      const store = tx.objectStore(CONFIG.STORE_HISTORY);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }
}
