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
  // 1. Sanity Checks
  if (!e) return;
  
  // 🔒 MULTIPLAYER LOCK: Prevent concurrent execution collisions
  // This ensures User A finishes before User B starts.
  const lock = LockService.getScriptLock();
  try {
    // Wait up to 5 seconds for other users to finish. 
    // If they take longer, we fail gracefully.
    lock.waitLock(5000); 
  } catch (error) {
    Logger.log('⚠️ Could not get lock. Another user is editing heavily.');
    return;
  }

  try {
    const range = e.range;
    const sheet = range.getSheet();
    const row = range.getRow();
    
    // Guard: Ignore edits in the Header Row
    if (row === 1) return;

    // 2. FETCH DATA
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const rowDataRaw = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
    const editedCol = range.getColumn(); 

    // 3. ROBUST LOOP BREAKER 🛡️
    const idHeaderIndex = headers.indexOf(ID_HEADER); // 0-based index

    // If ID column exists AND the edited column matches it (index + 1)
    if (idHeaderIndex !== -1 && editedCol === (idHeaderIndex + 1)) {
      Logger.log("🛡️ Loop Breaker: System wrote ID. Ignoring.");
      return;
    }

    // 4. Map Headers to Data
    const rowPayload = {};
    headers.forEach((header, index) => {
      if (header) {
        rowPayload[header] = rowDataRaw[index];
      }
    });

    // 5. Send to Backend
    const result = syncRowToBackend(headers, rowPayload);
    
    // 6. WRITE-BACK LOGIC (The Ghost ID) 👻
    if (result && result.id) {
      writeBackId(sheet, row, result.id, headers);
    }

  } catch (err) {
    Logger.log('❌ Error in handleEdit: ' + err.toString());
  } finally {
    // 🔓 ALWAYS RELEASE THE LOCK
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
 * Syncs data FROM Database TO Sheet.
 * ------------------------------------------------------------------
 */
function doPost(e) {
  // 🔒 LOCKING HERE TOO: Prevent Poller from clashing with User Edits
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return ContentService.createTextOutput("Busy");

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    // Fallback ID if strictly bound
    if (!doc) doc = SpreadsheetApp.openById('1kRYmFJeUhY_ieaPd8FHms8sJl2e3CjkCW1kLGS1CwdU');
    const sheet = doc.getSheets()[0];

    const data = JSON.parse(e.postData.contents);
    const updates = data.updates;

    if (!updates || updates.length === 0) {
      return ContentService.createTextOutput("No updates received");
    }

    // 1. Map Columns
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headerMap = {};
    headers.forEach((h, i) => {
      if (h) headerMap[h.toString().toLowerCase()] = i; 
    });

    // 2. AUTO-CREATE MISSING 'superjoin_id' COLUMN
    let idColIndex = headerMap[ID_HEADER.toLowerCase()];
    if (idColIndex === undefined) {
      const lastCol = sheet.getLastColumn();
      sheet.getRange(1, lastCol + 1).setValue(ID_HEADER);
      idColIndex = lastCol; 
      headerMap[ID_HEADER.toLowerCase()] = idColIndex;
    }

    // 3. Get All IDs
    const lastRow = sheet.getLastRow();
    const allIds = lastRow > 1 
      ? sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues().flat()
      : [];
    
    // 4. Apply Updates
    updates.forEach(update => {
      const recordId = update[ID_HEADER];
      let rowIndex = allIds.indexOf(recordId);
      let sheetRow;

      if (rowIndex !== -1) {
        sheetRow = rowIndex + 2;
      } else {
        // Queue Delay Logic: Try to match by Name if ID missing
        const nameColIndex = headerMap['name'];
        if (nameColIndex !== undefined && update['name']) {
           const allNames = sheet.getRange(2, nameColIndex + 1, lastRow - 1, 1).getValues().flat();
           const nameIndex = allNames.indexOf(update['name']);
           if (nameIndex !== -1) {
             sheetRow = nameIndex + 2;
             sheet.getRange(sheetRow, idColIndex + 1).setValue(recordId);
           }
        }
      }

      if (sheetRow) {
        Object.keys(update).forEach(key => {
          if (key === ID_HEADER || key === 'createdAt' || key === 'updatedAt') return;
          const colIndex = headerMap[key.toLowerCase()];
          if (colIndex !== undefined) {
            sheet.getRange(sheetRow, colIndex + 1).setValue(update[key]);
          }
        });
        // Ensure ID is written
        sheet.getRange(sheetRow, idColIndex + 1).setValue(recordId);
      }
    });

    return ContentService.createTextOutput("✅ Sync Successful");

  } catch (error) {
    return ContentService.createTextOutput("FATAL GAS ERROR: " + error.toString());
  } finally {
    lock.releaseLock();
  }
}