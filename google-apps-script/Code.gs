/**
 * SATHI PWA — Google Apps Script Backend
 * 
 * This script receives field data from the PWA via POST
 * and appends it as a new row to the Google Sheet.
 * 
 * SETUP:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1ZexGXO6uKaMKoR5fR7WKFCQzJHcK8iBr-clXBTE4228/edit
 * 2. Go to Extensions → Apps Script
 * 3. Replace the default code with this entire file
 * 4. Click Deploy → New Deployment
 * 5. Select Type: Web App
 * 6. Execute as: Me
 * 7. Who has access: Anyone
 * 8. Click Deploy and copy the Web App URL
 * 9. Paste that URL into js/config.js → APPS_SCRIPT_URL
 */

// Sheet configuration
const SHEET_ID = '1ZexGXO6uKaMKoR5fR7WKFCQzJHcK8iBr-clXBTE4228';
const SHEET_NAME = 'Sheet1'; // Change if your sheet tab has a different name

/**
 * Handle GET requests (for testing connectivity)
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'SATHI PWA Backend is running',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST requests from the PWA
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Support batch submissions (array of entries)
    const entries = Array.isArray(data) ? data : [data];
    const results = [];
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error('Sheet "' + SHEET_NAME + '" not found. Check the SHEET_NAME variable.');
    }
    
    for (const entry of entries) {
      const row = buildRow(entry);
      sheet.appendRow(row);
      results.push({ id: entry.id || null, status: 'success' });
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        message: results.length + ' row(s) added successfully',
        results: results,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Build a row array from the submitted data object.
 * Column order matches the sheet exactly (28 columns).
 */
function buildRow(data) {
  return [
    // Section 1: Observation Metadata (6 columns)
    data.date || '',                    // दिनांक (Date)
    data.timingWindow || '',            // समय अंतराल (Timing Window)
    data.plot || '',                    // प्लॉट (Plot: ID & Type)
    data.cropType || '',                // फसल का प्रकार (Crop Type)
    data.cropGrowthStage || '',         // फसल विकास चरण (Crop Growth Stage)
    data.replicate || '',               // प्रतिकृति (Replicate)
    
    // Section 2: 8-in-1 Soil Sensor (7 columns)
    toNumber(data.vwc),                 // VWC %
    toNumber(data.soilTemp),            // Soil Temperature °C
    toNumber(data.ec),                  // Electrical Conductivity dS/m
    toNumber(data.soilPh),              // Soil pH
    toNumber(data.nitrogen),            // Available Nitrogen mg/kg
    toNumber(data.phosphorus),          // Available Phosphorus mg/kg
    toNumber(data.potassium),           // Available Potassium mg/kg
    
    // Section 3: Digital Canopy Psychrometer (4 columns)
    toNumber(data.dryBulbTemp),         // Dry-Bulb Air Temp °C
    toNumber(data.rh),                  // Relative Humidity %
    toNumber(data.wetBulbTemp),         // Wet-Bulb Temp °C
    toNumber(data.dewPointTemp),        // Dew Point Temp °C
    
    // Section 4: Handheld IR Thermometer (4 columns)
    toNumber(data.leafSpot1),           // Leaf Spot 1 °C
    toNumber(data.leafSpot2),           // Leaf Spot 2 °C
    toNumber(data.leafSpot3),           // Leaf Spot 3 °C
    toNumber(data.canopyTemp),          // Canopy Temperature °C
    
    // Section 5: Auto-calculated Indicators (4 columns)
    toNumber(data.canopyStressDelta),   // Canopy Stress Delta ΔT °C
    toNumber(data.wetBulbDepression),   // Wet-Bulb Depression °C
    toNumber(data.dewPointSpread),      // Dew Point Spread °C
    toNumber(data.vpd),                 // VPD kPa
    
    // Section 6: Field Notes / Operator (2 columns)
    data.observerName || '',            // Field Observer Name
    data.fieldNotes || '',              // Field Notes / Actions Taken
    
    // Section 7: Manual Atmospheric Readings (2 columns)
    data.windSpeed || '',               // Wind Speed (Beaufort Scale)
    toNumber(data.barometricPressure)   // Barometric Pressure hPa
  ];
}

/**
 * Safely convert to number, returns empty string if invalid
 */
function toNumber(val) {
  if (val === null || val === undefined || val === '') return '';
  const num = Number(val);
  return isNaN(num) ? '' : num;
}
