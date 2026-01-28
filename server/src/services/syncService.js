const { syncSchema } = require('./schemaEngine');
const { v4: uuidv4 } = require('uuid'); // You might need to install: npm install uuid

const handleSync = async (headers, rowData) => {
  try {
    const DynamicModel = await syncSchema(headers);
    
    // Prepare the DB Row
    const dbRow = {};
    headers.forEach(h => {
      const cleanHeader = h.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      dbRow[cleanHeader] = rowData[h];
    });

    // CHECK: Does the incoming data have our Ghost ID?
    // In the sheet, we will look for a header named 'superjoin_id'
    const incomingId = rowData['superjoin_id'];

    if (incomingId) {
      // CASE 1: UPDATE
      // We rely on the Ghost ID to find the record
      await DynamicModel.update(dbRow, {
        where: { superjoin_id: incomingId }
      });
      console.log(`✅ Updated Row: ${incomingId}`);
      return { status: 'updated', id: incomingId };
    } else {
      // CASE 2: INSERT
      // Generate a new UUID
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