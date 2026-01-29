const { syncSchema } = require('./schemaEngine');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize'); // 👈 IMPORT THIS

const handleSync = async (headers, rowData) => {
  try {
    const DynamicModel = await syncSchema(headers);
    
    // Prepare DB Row (Lowercase keys)
    const dbRow = {};
    headers.forEach(h => {
      if (h) {
        const cleanHeader = h.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        dbRow[cleanHeader] = rowData[h];
      }
    });

    const incomingId = rowData['superjoin_id'];

    if (incomingId) {
      // ✅ UPDATE EXISTING
      delete dbRow.superjoin_id;
      await DynamicModel.update(dbRow, { where: { superjoin_id: incomingId } });
      console.log(`✅ Updated Row: ${incomingId}`);
      return { status: 'updated', id: incomingId };

    } else {
      // 🕵️‍♂️ SMART MERGE LOGIC (The Fix)
      // Check if we created a row with this NAME in the last 15 seconds
      // "headers[0]" is usually the Name/Primary identifier
      const primaryCol = headers[0].trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      const primaryValue = dbRow[primaryCol];

      let existingRecord = null;
      if (primaryValue) {
        existingRecord = await DynamicModel.findOne({
          where: {
            [primaryCol]: primaryValue,
            createdAt: { [Op.gt]: new Date(Date.now() - 15000) } // Created < 15s ago
          }
        });
      }

      if (existingRecord) {
        // ✨ MERGE: It's the same person! Update the existing row.
        await existingRecord.update(dbRow);
        console.log(`✨ Fast-Type Merge: Combined into ${existingRecord.superjoin_id}`);
        return { status: 'updated', id: existingRecord.superjoin_id };
      } else {
        // 🆕 GENUINE NEW ROW
        const newId = uuidv4();
        dbRow['superjoin_id'] = newId;
        await DynamicModel.create(dbRow);
        console.log(`✅ Created New Row: ${newId}`);
        return { status: 'created', id: newId };
      }
    }

  } catch (error) {
    console.error('❌ Sync Error:', error);
    throw error;
  }
};

module.exports = { handleSync };