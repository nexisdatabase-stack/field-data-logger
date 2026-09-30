/**
 * SATHI PWA — Configuration
 * 
 * ⚠️ IMPORTANT: Replace APPS_SCRIPT_URL with your deployed Google Apps Script Web App URL.
 * See google-apps-script/Code.gs for deployment instructions.
 */

const CONFIG = {
  // Google Apps Script Web App URL — default or fallback
  APPS_SCRIPT_URL: 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE',

  /**
   * Returns configured Apps Script URL (prefers localStorage if set)
   */
  getScriptUrl() {
    const local = localStorage.getItem('field_logger_script_url');
    if (local && local.trim()) return local.trim();
    return this.APPS_SCRIPT_URL;
  },

  /**
   * Save Apps Script URL in localStorage
   */
  setScriptUrl(url) {
    if (url && url.trim()) {
      localStorage.setItem('field_logger_script_url', url.trim());
    } else {
      localStorage.removeItem('field_logger_script_url');
    }
  },

  // Google Sheet ID (for reference)
  SHEET_ID: '1ZexGXO6uKaMKoR5fR7WKFCQzJHcK8iBr-clXBTE4228',

  // Sync settings
  SYNC_RETRY_INTERVAL: 30000,     // 30 seconds between retry attempts
  SYNC_MAX_RETRIES: 10,           // Max retry attempts per entry
  SYNC_BATCH_SIZE: 5,             // Max entries per batch POST

  // GPS settings
  GPS_TIMEOUT: 10000,             // 10 seconds GPS timeout
  GPS_MAX_AGE: 60000,             // Accept cached position up to 1 minute old
  GPS_HIGH_ACCURACY: true,

  // IndexedDB
  DB_NAME: 'sathi_field_data',
  DB_VERSION: 1,
  STORE_PENDING: 'pending_entries',
  STORE_HISTORY: 'submission_history',
};

/**
 * Dropdown options matching the Google Sheet data
 */
const DROPDOWN_OPTIONS = {

  timingWindows: [
    { value: 'सुबह का भ्रमण (Morning Walk) (07:00 - 08:30 AM)', label: '🌅 सुबह का भ्रमण / Morning Walk (07:00–08:30)' },
    { value: 'दोपहर का भ्रमण (Midday Walk) (12:00 - 02:00 PM)', label: '☀️ दोपहर का भ्रमण / Midday Walk (12:00–14:00)' },
    { value: 'शाम का भ्रमण (Evening Walk) (04:00 - 05:30 PM)', label: '🌇 शाम का भ्रमण / Evening Walk (16:00–17:30)' },
  ],

  /**
   * Plot IDs — suggestions only; users can type any custom Plot ID in the field.
   * Add new plot IDs below as your farm expands.
   */
  plotIds: [
    { value: 'P1', label: 'P1' },
    { value: 'P2', label: 'P2' },
    { value: 'P3', label: 'P3' },
    { value: 'P4', label: 'P4' },
    { value: 'P5', label: 'P5' },
    { value: 'P6', label: 'P6' },
    // ➕ Add more plot IDs here: { value: 'P7', label: 'P7' },
  ],

  /**
   * Plot Types — suggestions only; users can type any custom type in the field.
   * Add new plot types below as needed.
   */
  plotTypes: [
    { value: 'मचान (Machan)', label: 'मचान / Machan' },
    { value: 'अंतर-फसल (Intercropping)', label: 'अंतर-फसल / Intercropping' },
    { value: 'एकल फसल (Monocrop)', label: 'एकल फसल / Monocrop' },
    { value: 'नियंत्रण (Control)', label: 'नियंत्रण / Control' },
    { value: 'बहु-फसल (Multi-crop)', label: 'बहु-फसल / Multi-crop' },
    { value: 'जैविक (Organic)', label: 'जैविक / Organic' },
    // ➕ Add more plot types here: { value: 'Name (English)', label: 'Hindi / English' },
  ],

  /**
   * Crop Types — suggestions only; users can type any custom crop in the field.
   * ➕ TO ADD A NEW CROP: Just copy a line below and change the values.
   *    The user can also type any crop name directly in the form.
   */
  cropTypes: [
    { value: 'टमाटर (Tomato)', label: '🍅 टमाटर / Tomato' },
    { value: 'चना (Chickpea (Gram))', label: '🫘 चना / Chickpea (Gram)' },
    { value: 'गेहूँ (Wheat)', label: '🌾 गेहूँ / Wheat' },
    { value: 'मक्का (Maize)', label: '🌽 मक्का / Maize' },
    { value: 'धान (Rice/Paddy)', label: '🌾 धान / Rice (Paddy)' },
    { value: 'सोयाबीन (Soybean)', label: '🫘 सोयाबीन / Soybean' },
    { value: 'प्याज (Onion)', label: '🧅 प्याज / Onion' },
    { value: 'मिर्च (Chilli)', label: '🌶️ मिर्च / Chilli' },
    { value: 'कपास (Cotton)', label: '🧶 कपास / Cotton' },
    { value: 'मूंगफली (Groundnut)', label: '🥜 मूंगफली / Groundnut' },
    { value: 'आलू (Potato)', label: '🥔 आलू / Potato' },
    { value: 'बैंगन (Brinjal)', label: '🍆 बैंगन / Brinjal' },
    { value: 'भिंडी (Okra/Lady Finger)', label: '🟢 भिंडी / Okra' },
    { value: 'मूंग (Moong Dal)', label: '🫘 मूंग / Moong Dal' },
    { value: 'उड़द (Urad Dal)', label: '🫘 उड़द / Urad Dal' },
    { value: 'अरहर (Tur/Pigeon Pea)', label: '🫘 अरहर / Tur (Pigeon Pea)' },
    { value: 'सरसों (Mustard)', label: '🌼 सरसों / Mustard' },
    { value: 'गन्ना (Sugarcane)', label: '🎋 गन्ना / Sugarcane' },
    // ➕ ADD NEW CROPS HERE — just copy a line and edit:
    // { value: 'हिंदी नाम (English Name)', label: '🌿 हिंदी / English' },
  ],

  cropGrowthStages: [
    { value: 'अंकुरण (Germination / Emergence)', label: '🌱 अंकुरण / Germination' },
    { value: 'वानस्पतिक वृद्धि (Vegetative Growth)', label: '🌿 वानस्पतिक वृद्धि / Vegetative Growth' },
    { value: 'फूल आना / पुष्पन (Active Bloom / Flowering)', label: '🌸 फूल आना / पुष्पन / Flowering' },
    { value: 'फल बनना (Fruit Setting)', label: '🫑 फल बनना / Fruit Setting' },
    { value: 'परिपक्वता (Maturity / Ripening)', label: '🍈 परिपक्वता / Maturity' },
    { value: 'कटाई (Harvesting)', label: '🌾 कटाई / Harvesting' },
  ],

  replicates: [
    { value: 'प्रतिकृति 1 (Replicate 1)', label: 'प्रतिकृति 1 / Replicate 1' },
    { value: 'प्रतिकृति 2 (Replicate 2)', label: 'प्रतिकृति 2 / Replicate 2' },
    { value: 'प्रतिकृति 3 (Replicate 3)', label: 'प्रतिकृति 3 / Replicate 3' },
    { value: 'औसत (Average)', label: '📊 औसत / Average' },
  ],

  windSpeeds: [
    { value: '0 - शांत (Calm) (< 1 km/h)', label: '0 — शांत / Calm (< 1 km/h)' },
    { value: '1 - हल्की हवा (Light Air) (1-5 km/h)', label: '1 — हल्की हवा / Light Air (1–5 km/h)' },
    { value: '2 - मंद समीर (Light Breeze) (6-11 km/h)', label: '2 — मंद समीर / Light Breeze (6–11 km/h)' },
    { value: '3 - मध्यम समीर (Gentle Breeze) (12-19 km/h)', label: '3 — मध्यम समीर / Gentle Breeze (12–19 km/h)' },
    { value: '4 - तेज़ समीर (Moderate Breeze) (20-28 km/h)', label: '4 — तेज़ समीर / Moderate Breeze (20–28 km/h)' },
    { value: '5 - ताज़ी हवा (Fresh Breeze) (29-38 km/h)', label: '5 — ताज़ी हवा / Fresh Breeze (29–38 km/h)' },
    { value: '6 - प्रबल हवा (Strong Breeze) (39-49 km/h)', label: '6 — प्रबल हवा / Strong Breeze (39–49 km/h)' },
  ],
};
