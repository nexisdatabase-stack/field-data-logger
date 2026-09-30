/**
 * SATHI PWA — Main Application Logic
 * 
 * Handles form rendering, validation, GPS capture,
 * auto-calculation of biophysical indicators, and submission.
 */

// Global instances
let db;
let syncEngine;

// ── Initialization ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize database
    db = new SathiDB();
    await db.init();

    // Initialize sync engine
    syncEngine = new SyncEngine(db);
    syncEngine.onStatusChange(handleSyncEvent);

    // Set up form
    populateDropdowns();
    setDefaultDate();
    attachEventListeners();
    updateSyncBadge();
    updateOnlineStatus();

    // Check for pending entries and try syncing
    syncEngine.syncAll();

    console.log('Field Data Logger PWA initialized successfully');
  } catch (error) {
    console.error('Initialization error:', error);
    showToast('ऐप लोड करने में त्रुटि / Error loading app', 'error');
  }
});

// ── Dropdown Population ─────────────────────────────────────────────

function populateDropdowns() {
  populateSelect('timingWindow', DROPDOWN_OPTIONS.timingWindows);
  populateDatalist('plotList', DROPDOWN_OPTIONS.plotIds);
  populateDatalist('plotTypeList', DROPDOWN_OPTIONS.plotTypes);
  populateDatalist('cropTypeList', DROPDOWN_OPTIONS.cropTypes);
  populateSelect('cropGrowthStage', DROPDOWN_OPTIONS.cropGrowthStages);
  populateSelect('replicate', DROPDOWN_OPTIONS.replicates);
  populateSelect('windSpeed', DROPDOWN_OPTIONS.windSpeeds);
}

function populateSelect(id, options) {
  const select = document.getElementById(id);
  if (!select) return;

  // Keep the existing placeholder option
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  });
}

function populateDatalist(id, options) {
  const datalist = document.getElementById(id);
  if (!datalist) return;

  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.label = opt.label;
    datalist.appendChild(option);
  });
}

function setDefaultDate() {
  const dateInput = document.getElementById('date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

// ── Event Listeners ─────────────────────────────────────────────────

function attachEventListeners() {
  // Form submission
  document.getElementById('dataForm').addEventListener('submit', handleSubmit);

  // Auto-calculate on input change
  const calcFields = ['leafSpot1', 'leafSpot2', 'leafSpot3', 'dryBulbTemp', 'rh', 'wetBulbTemp', 'dewPointTemp'];
  calcFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calculateIndicators);
  });

  // GPS button
  document.getElementById('captureGps').addEventListener('click', captureGPS);

  // Section toggles
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.parentElement;
      section.classList.toggle('collapsed');
    });
  });

  // Sync button
  document.getElementById('syncBtn').addEventListener('click', () => {
    syncEngine.forceSync();
  });

  // History button
  document.getElementById('historyBtn').addEventListener('click', showHistory);

  // Clear form button
  document.getElementById('clearBtn').addEventListener('click', clearForm);

  // Online/offline events
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
}

// ── GPS Capture ─────────────────────────────────────────────────────

function captureGPS() {
  const btn = document.getElementById('captureGps');
  const display = document.getElementById('gpsDisplay');
  
  btn.disabled = true;
  btn.textContent = '📡 स्थान प्राप्त कर रहे हैं... / Getting location...';

  if (!navigator.geolocation) {
    display.textContent = 'GPS उपलब्ध नहीं / GPS not available';
    btn.disabled = false;
    btn.textContent = '📍 स्थान प्राप्त करें / Capture GPS';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      const acc = position.coords.accuracy.toFixed(0);

      document.getElementById('gpsLat').value = lat;
      document.getElementById('gpsLng').value = lng;
      display.innerHTML = `<strong>📍 ${lat}, ${lng}</strong> (±${acc}m)`;
      display.classList.add('gps-success');

      btn.disabled = false;
      btn.textContent = '📍 स्थान अपडेट करें / Update GPS';
    },
    (error) => {
      display.textContent = `GPS त्रुटि / GPS Error: ${error.message}`;
      display.classList.add('gps-error');
      btn.disabled = false;
      btn.textContent = '📍 स्थान प्राप्त करें / Capture GPS';
    },
    {
      enableHighAccuracy: CONFIG.GPS_HIGH_ACCURACY,
      timeout: CONFIG.GPS_TIMEOUT,
      maximumAge: CONFIG.GPS_MAX_AGE,
    }
  );
}

// ── Auto-Calculation (Section 5) ────────────────────────────────────

function calculateIndicators() {
  const ls1 = parseFloat(document.getElementById('leafSpot1').value);
  const ls2 = parseFloat(document.getElementById('leafSpot2').value);
  const ls3 = parseFloat(document.getElementById('leafSpot3').value);
  const tAir = parseFloat(document.getElementById('dryBulbTemp').value);
  const rh = parseFloat(document.getElementById('rh').value);
  const tWb = parseFloat(document.getElementById('wetBulbTemp').value);
  const tDp = parseFloat(document.getElementById('dewPointTemp').value);

  // Canopy Temperature = average of 3 leaf spots
  let tCanopy = NaN;
  const leafSpots = [ls1, ls2, ls3].filter(v => !isNaN(v));
  if (leafSpots.length > 0) {
    tCanopy = leafSpots.reduce((a, b) => a + b, 0) / leafSpots.length;
    document.getElementById('canopyTemp').value = tCanopy.toFixed(1);
  }

  // Canopy Stress Delta = T_canopy - T_air
  if (!isNaN(tCanopy) && !isNaN(tAir)) {
    document.getElementById('canopyStressDelta').value = (tCanopy - tAir).toFixed(1);
  }

  // Wet-Bulb Depression = T_air - T_wb
  if (!isNaN(tAir) && !isNaN(tWb)) {
    document.getElementById('wetBulbDepression').value = (tAir - tWb).toFixed(1);
  }

  // Dew Point Spread = T_air - T_dp
  if (!isNaN(tAir) && !isNaN(tDp)) {
    document.getElementById('dewPointSpread').value = (tAir - tDp).toFixed(1);
  }

  // VPD (Vapor Pressure Deficit) — Magnus formula
  if (!isNaN(tAir) && !isNaN(rh)) {
    const es = 0.6108 * Math.exp((17.27 * tAir) / (tAir + 237.3)); // Saturation VP in kPa
    const ea = es * (rh / 100); // Actual VP
    const vpd = es - ea;
    document.getElementById('vpd').value = vpd.toFixed(2);
  }
}

// ── Form Submission ─────────────────────────────────────────────────

async function handleSubmit(event) {
  event.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ सबमिट हो रहा है... / Submitting...';

  try {
    // Calculate indicators one final time before submit
    calculateIndicators();

    const formData = collectFormData();

    // Validate required fields
    if (!formData.date || !formData.timingWindow || !formData.plot || !formData.cropType || !formData.replicate) {
      showToast('कृपया सभी आवश्यक फ़ील्ड भरें / Please fill all required fields', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = '📤 डेटा सबमिट करें / Submit Data';
      return;
    }

    // Submit via sync engine (queues if offline)
    await syncEngine.submit(formData);

    showToast('✅ डेटा सफलतापूर्वक सबमिट! / Data submitted successfully!', 'success');
    clearForm();
    updateSyncBadge();

  } catch (error) {
    console.error('Submission error:', error);
    showToast('❌ सबमिट करने में त्रुटि / Submission error: ' + error.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '📤 डेटा सबमिट करें / Submit Data';
  }
}

function collectFormData() {
  const getValue = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  const plotId = getValue('plot');
  const plotType = getValue('plotType');
  const plotCombined = plotType ? `${plotId} - ${plotType}` : plotId;

  return {
    // Section 1: Observation Metadata
    date: getValue('date'),
    timingWindow: getValue('timingWindow'),
    plot: plotCombined,
    cropType: getValue('cropType'),
    cropGrowthStage: getValue('cropGrowthStage'),
    replicate: getValue('replicate'),

    // Section 2: Soil Sensor
    vwc: getValue('vwc'),
    soilTemp: getValue('soilTemp'),
    ec: getValue('ec'),
    soilPh: getValue('soilPh'),
    nitrogen: getValue('nitrogen'),
    phosphorus: getValue('phosphorus'),
    potassium: getValue('potassium'),

    // Section 3: Psychrometer
    dryBulbTemp: getValue('dryBulbTemp'),
    rh: getValue('rh'),
    wetBulbTemp: getValue('wetBulbTemp'),
    dewPointTemp: getValue('dewPointTemp'),

    // Section 4: IR Thermometer
    leafSpot1: getValue('leafSpot1'),
    leafSpot2: getValue('leafSpot2'),
    leafSpot3: getValue('leafSpot3'),
    canopyTemp: getValue('canopyTemp'),

    // Section 5: Calculated Indicators
    canopyStressDelta: getValue('canopyStressDelta'),
    wetBulbDepression: getValue('wetBulbDepression'),
    dewPointSpread: getValue('dewPointSpread'),
    vpd: getValue('vpd'),

    // Section 6: Field Notes
    observerName: getValue('observerName'),
    fieldNotes: getValue('fieldNotes'),

    // Section 7: Manual Atmospheric
    windSpeed: getValue('windSpeed'),
    barometricPressure: getValue('barometricPressure'),

    // GPS metadata (not sent to sheet, but stored locally)
    gpsLat: getValue('gpsLat'),
    gpsLng: getValue('gpsLng'),
  };
}

function clearForm() {
  document.getElementById('dataForm').reset();
  setDefaultDate();
  document.getElementById('gpsDisplay').innerHTML = '';
  document.getElementById('gpsDisplay').className = 'gps-display';

  // Clear calculated fields
  ['canopyTemp', 'canopyStressDelta', 'wetBulbDepression', 'dewPointSpread', 'vpd'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ── Sync Status ─────────────────────────────────────────────────────

function handleSyncEvent(event, data) {
  switch (event) {
    case 'queued':
      updateSyncBadge();
      break;
    case 'sync-start':
      document.getElementById('syncBtn').classList.add('syncing');
      break;
    case 'sync-progress':
      updateSyncBadge();
      break;
    case 'sync-complete':
      document.getElementById('syncBtn').classList.remove('syncing');
      updateSyncBadge();
      if (data.synced > 0) {
        showToast(`☁️ ${data.synced} प्रविष्टि सिंक हुई / ${data.synced} entry(s) synced`, 'success');
      }
      break;
    case 'online':
      updateOnlineStatus();
      break;
    case 'offline':
      updateOnlineStatus();
      break;
    case 'error':
      showToast(`⚠️ सिंक त्रुटि / Sync error: ${data.message}`, 'error');
      document.getElementById('syncBtn').classList.remove('syncing');
      break;
  }
}

async function updateSyncBadge() {
  try {
    const count = await db.getPendingCount();
    const badge = document.getElementById('syncBadge');
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  } catch (e) {
    // DB not ready yet
  }
}

function updateOnlineStatus() {
  const indicator = document.getElementById('onlineStatus');
  if (navigator.onLine) {
    indicator.textContent = '🟢 ऑनलाइन / Online';
    indicator.className = 'status-online';
  } else {
    indicator.textContent = '🔴 ऑफ़लाइन / Offline';
    indicator.className = 'status-offline';
  }
}

// ── History Modal ───────────────────────────────────────────────────

async function showHistory() {
  const modal = document.getElementById('historyModal');
  const list = document.getElementById('historyList');
  list.innerHTML = '<p>लोड हो रहा है... / Loading...</p>';
  modal.classList.add('active');

  try {
    const history = await db.getRecentHistory(20);
    const pending = await db.getAllPending();

    if (history.length === 0 && pending.length === 0) {
      list.innerHTML = '<p class="empty-state">कोई प्रविष्टि नहीं / No entries yet</p>';
      return;
    }

    let html = '';

    if (pending.length > 0) {
      html += '<h3>⏳ लंबित / Pending (' + pending.length + ')</h3>';
      pending.forEach(entry => {
        html += renderHistoryItem(entry, 'pending');
      });
    }

    if (history.length > 0) {
      html += '<h3>✅ सिंक्ड / Synced</h3>';
      history.forEach(entry => {
        html += renderHistoryItem(entry, 'synced');
      });
    }

    list.innerHTML = html;
  } catch (error) {
    list.innerHTML = '<p class="error">त्रुटि / Error: ' + error.message + '</p>';
  }
}

function renderHistoryItem(entry, status) {
  const d = entry.data;
  const statusIcon = status === 'pending' ? '⏳' : '✅';
  const time = status === 'pending' ? entry.timestamp : entry.syncedAt;
  const timeStr = new Date(time).toLocaleString('hi-IN');

  return `
    <div class="history-item history-${status}">
      <div class="history-header">
        <span>${statusIcon} ${d.plot || 'N/A'}</span>
        <span class="history-time">${timeStr}</span>
      </div>
      <div class="history-details">
        ${d.date} | ${d.cropType || ''} | ${d.replicate || ''}
      </div>
    </div>
  `;
}

function closeHistory() {
  document.getElementById('historyModal').classList.remove('active');
}

// ── Toast Notifications ─────────────────────────────────────────────

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add('show'));

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Service Worker Registration ─────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}
