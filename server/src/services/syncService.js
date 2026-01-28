const { syncSchema, TABLE_NAME } = require('./schemaEngine');

/**
 * Service to handle incoming data sync
 * @param {Array} headers - List of column names
 * @param {Object} rowData - The actual data { id: 1, name: 'Ayush' }
 */
const handleSync = async (headers, rowData) => {
  try {
    // 1. Ensure Schema Exists (The "Magic" Engine)
    // We await this to ensure columns exist before we try to write data
    const DynamicModel = await syncSchema(headers);

    // 2. Prepare Data
    // We need to map "Email Address" (JSON) -> "email_address" (DB Column)
    const dbRow = {};
    headers.forEach(h => {
      const cleanHeader = h.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      // match the incoming row data to the clean column name
      // Note: We handle the case where rowData keys might be raw or clean
      dbRow[cleanHeader] = rowData[h] || rowData[cleanHeader] || null;
    });

    // 3. The "Upsert" (Insert or Update)
    // If ID exists, Update. If not, Insert.
    // This is crucial for "Idempotency" (Running it twice won't duplicate data)
    await DynamicModel.upsert(dbRow);

    console.log(`✅ Synced Row: ${JSON.stringify(dbRow)}`);
    return { success: true };

  } catch (error) {
    console.error('❌ Sync Error:', error);
    throw error;
  }
};

module.exports = { handleSync };