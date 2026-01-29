const { syncSchema } = require('./schemaEngine');
const { v4: uuidv4 } = require('uuid'); // ensure you run: npm install uuid

const handleSync = async (headers, rowData) => {
  try {
    // 1. Ensure Table Exists & Get Model
    const DynamicModel = await syncSchema(headers);
    
    // 2. Prepare the DB Row
    const dbRow = {};
    headers.forEach(h => {
      // Normalize headers to match your schemaEngine logic
      if (h) {
        const cleanHeader = h.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        dbRow[cleanHeader] = rowData[h];
      }
    });

    // 3. CHECK: Does the incoming data have our Ghost ID?
    // We look for the 'superjoin_id' field in the incoming payload
    const incomingId = rowData['superjoin_id'];

    if (incomingId) {
      // 🔄 CASE 1: UPDATE
      // The row already has an ID, so we update it.
      // We exclude 'superjoin_id' from the update payload to prevent PK collisions (optional safety)
      delete dbRow.superjoin_id; 

      const [updatedRows] = await DynamicModel.update(dbRow, {
        where: { superjoin_id: incomingId }
      });

      if (updatedRows > 0) {
        console.log(`✅ Updated Row: ${incomingId}`);
        return { status: 'updated', id: incomingId };
      } else {
        console.warn(`⚠️ Update requested for ID ${incomingId} but row not found. Treating as Insert.`);
        // Fallback: If ID exists in sheet but not DB (rare), recreate it? 
        // For now, let's just proceed to insert logic or return error. 
        // Let's stick to simple "Update failed" to keep it clean.
        return { status: 'skipped', message: 'Row not found in DB' };
      }

    } else {
      // 🆕 CASE 2: INSERT
      // No ID found, so this is a brand new row.
      
      const newId = uuidv4();
      dbRow['superjoin_id'] = newId;
      
      await DynamicModel.create(dbRow);
      console.log(`✅ Created New Row: ${newId}`);
      
      // CRITICAL: Return the new ID so the Sheet can save it
      return { status: 'created', id: newId };
    }

  } catch (error) {
    console.error('❌ Sync Error:', error);
    throw error;
  }
};

module.exports = { handleSync };