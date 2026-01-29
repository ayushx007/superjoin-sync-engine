// CONFIGURATION
const API_URL = 'https://superjoin-sync-engine.onrender.com/api/sync/webhook';
const ID_HEADER = 'superjoin_id';

/**
 * ------------------------------------------------------------------
 * TRIGGER: handleEdit
 * Fires automatically when a user edits a cell.
 * Syncs data FROM Sheet TO Database.
 * ------------------------------------------------------------------
 */
function handleEdit(e) {
  if (!e) return;

  // 🔒 MULTIPLAYER LOCK
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000); // Wait up to 5s for other users
  } catch (error) {
    Logger.log('⚠️ Could not get lock. System busy.');
    return;
  }

  try {
    const range = e.range;
    const sheet = range.getSheet();
    const startRow = range.getRow();
    const numRows = range.getNumRows(); // 👈 DETECT DRAG DEPTH
    const lastCol = sheet.getLastColumn();
    
    // 1. DATA PRE-FETCH
    // Fetch ALL headers and ALL data for the dragged range in one go (Efficiency)
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const allRowsData = sheet.getRange(startRow, 1, numRows, lastCol).getValues(); 

    // 2. LOOP THROUGH EVERY AFFECTED ROW
    for (let i = 0; i < numRows; i++) {
      const currentRowIndex = startRow + i;
      
      // Skip Header Row
      if (currentRowIndex === 1) continue;

      // Extract data for this specific row from the batch
      const rowDataRaw = allRowsData[i];
      
      // 3. LOOP BREAKER CHECK
      // If the edit was in the 'superjoin_id' column, ignore it.
      const idHeaderIndex = headers.indexOf(ID_HEADER);
      const editedColStart = range.getColumn();
      const editedColEnd = editedColStart + range.getNumColumns() - 1;
      
      // If ID column is inside the edited range, skip to prevent loops
      if (idHeaderIndex !== -1) {
        const idColNum = idHeaderIndex + 1;
        if (idColNum >= editedColStart && idColNum <= editedColEnd) {
           continue; 
        }
      }

      // 4. MAP & SEND
      const rowPayload = {};
      headers.forEach((header, index) => {
        if (header) {
          rowPayload[header] = rowDataRaw[index];
        }
      });

      // Send to Backend (Redis Queue will buffer these rapid requests)
      const result = syncRowToBackend(headers, rowPayload);

      // 5. WRITE-BACK (Optional: Immediate ID update if backend returns it)
      if (result && result.id) {
        writeBackId(sheet, currentRowIndex, result.id, headers);
      }
    }

  } catch (err) {
    Logger.log('❌ Error in handleEdit: ' + err.toString());
  } finally {
    lock.releaseLock();
  }
}

/**
 * HELPER: writeBackId
 * Writes the new UUID into the 'superjoin_id' column
 */
function writeBackId(sheet, row, newId, headers) {
  let idColIndex = headers.indexOf(ID_HEADER);
  
  // If column doesn't exist, create it!
  if (idColIndex === -1) {
    const lastCol = sheet.getLastColumn();
    sheet.getRange(1, lastCol + 1).setValue(ID_HEADER); 
    idColIndex = lastCol; 
    headerMap[ID_HEADER.toLowerCase()] = idColIndex;
    Logger.log("🆕 Created 'superjoin_id' column.");
  }

  sheet.getRange(row, idColIndex + 1).setValue(newId);
  Logger.log("✍️ Wrote ID back to Sheet: " + newId);
}

/**
 * WORKER: syncRowToBackend
 * Sends HTTP POST to Node.js
 */
function syncRowToBackend(headers, rowData) {
  const payload = {
    headers: headers,
    row: rowData
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  try {
    const response = UrlFetchApp.fetch(API_URL, options);
    const json = JSON.parse(response.getContentText());
    Logger.log("✅ Sync Result: " + JSON.stringify(json));
    return json;
  } catch (error) {
    Logger.log("❌ Sync Failed: " + error.toString());
    return null;
  }
}

/**
 * ------------------------------------------------------------------
 * TRIGGER: doPost
 * Fires when Node.js pushes updates TO the Sheet.
 * ------------------------------------------------------------------
 */
function doPost(e) {
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    if (!doc) doc = SpreadsheetApp.openById('YOUR_SHEET_ID_HERE'); 
    const sheet = doc.getSheets()[0];
    const data = JSON.parse(e.postData.contents);

    // --- 1. SETUP ---
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headerMap = {};
    headers.forEach((h, i) => { if(h) headerMap[h.toString().toLowerCase()] = i; });
    
    let idColIndex = headerMap['superjoin_id'];
    if (idColIndex === undefined) {
      // Auto-create ID column if missing
      const lastCol = sheet.getLastColumn();
      sheet.getRange(1, lastCol + 1).setValue('superjoin_id');
      idColIndex = lastCol;
      headerMap['superjoin_id'] = idColIndex;
    }

    // --- 2. APPLY UPDATES (The Missing Logic Restored) ---
    const updates = data.updates || [];
    const lastRow = sheet.getLastRow();
    
    // Fetch all existing IDs and Names for matching
    // We fetch ranges safely to avoid errors on empty sheets
    let allIds = [];
    let allNames = [];
    
    if (lastRow > 1) {
      allIds = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues().flat();
      
      const nameColIndex = headerMap['name'];
      if (nameColIndex !== undefined) {
        allNames = sheet.getRange(2, nameColIndex + 1, lastRow - 1, 1).getValues().flat();
      }
    }

    updates.forEach(update => {
      const recordId = update['superjoin_id'];
      let rowIndex = allIds.indexOf(recordId);
      let sheetRow;

      // A. Match by ID (Existing Row)
      if (rowIndex !== -1) {
        sheetRow = rowIndex + 2;
      } 
      // B. Match by Name (New Row waiting for ID)
      // ⚡ THIS IS THE PART THAT WAS MISSING
      else if (update['name']) { 
         const nameIndex = allNames.indexOf(update['name']);
         if (nameIndex !== -1) {
           sheetRow = nameIndex + 2;
         }
      }

      // C. Perform the Update
      if (sheetRow) {
        Object.keys(update).forEach(key => {
          // Don't overwrite system columns
          if (key === 'superjoin_id' || key === 'createdAt' || key === 'updatedAt') return;
          
          const colIndex = headerMap[key.toLowerCase()];
          if (colIndex !== undefined) {
             sheet.getRange(sheetRow, colIndex + 1).setValue(update[key]);
          }
        });
        
        // ⚡ CRITICAL: Always write the ID back to the sheet
        // This ensures the row gets "linked" immediately
        sheet.getRange(sheetRow, idColIndex + 1).setValue(recordId);
      }
    });

    // --- 3. THE REAPER (Deletion Logic) ---
    const validDbIds = data.valid_ids; 

    // Allow execution if validDbIds is an array (even if empty!)
    if (validDbIds && Array.isArray(validDbIds)) {
      
      const currentLastRow = sheet.getLastRow();
      
      if (currentLastRow > 1) {
        // Re-fetch IDs because the Update step above might have just added some!
        const currentIds = sheet.getRange(2, idColIndex + 1, currentLastRow - 1, 1).getValues().flat();
        
        // Iterate BACKWARDS to delete safely
        for (let i = currentIds.length - 1; i >= 0; i--) {
          const sheetId = currentIds[i];
          const realRowIndex = i + 2;

          // LOGIC: If the ID is NOT in the valid list, Delete it.
          if (sheetId && sheetId.length > 5 && !validDbIds.includes(sheetId)) {
            sheet.deleteRow(realRowIndex);
            Logger.log("☠️ Reaper: Deleted Row " + realRowIndex);
          }
        }
      }
    }

    return ContentService.createTextOutput("✅ Sync & Prune Complete");

  } catch (error) {
    return ContentService.createTextOutput("FATAL ERROR: " + error.toString());
  }
}

/**
 * ------------------------------------------------------------------
 * TRIGGER: handleChange
 * Fires on structure changes (Delete Row, Delete Column, etc.)
 * ------------------------------------------------------------------
 */
function handleChange(e) {
  // Only react to removals
  if (e.changeType !== 'REMOVE_ROW' && e.changeType !== 'REMOVE_COLUMN' && e.changeType !== 'OTHER') return;

  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  // 1. Get Current Headers (For Column Sync)
  // If sheet is empty, headers is empty list
  const headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];

  // 2. Get All Existing IDs (For Row Sync)
  // Find ID column index dynamically
  let idList = [];
  const idHeaderIndex = headers.indexOf('superjoin_id'); // Ensure this matches your CONST variable

  if (idHeaderIndex !== -1 && lastRow > 1) {
    // Get all IDs currently remaining in the sheet
    idList = sheet.getRange(2, idHeaderIndex + 1, lastRow - 1, 1).getValues().flat();
    // Filter out empty strings just in case
    idList = idList.filter(id => id && id.length > 5);
  }

  // 3. Send Snapshot to Backend
  pruneDatabase(idList, headers);
}

function pruneDatabase(activeIds, activeHeaders) {
  const payload = {
    active_ids: activeIds,
    active_cols: activeHeaders
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  try {
    // We reuse the base URL but hit a new endpoint
    const pruneUrl = API_URL.replace('/webhook', '/prune'); 
    UrlFetchApp.fetch(pruneUrl, options);
    Logger.log("✂️ Prune request sent. Active Rows: " + activeIds.length);
  } catch (err) {
    Logger.log("❌ Prune Failed: " + err.toString());
  }
}