const axios = require('axios');
const { sequelize } = require('../config/db');
const { TABLE_NAME } = require('./schemaEngine');

// CONFIGURATION
// 🔴 REPLACE THIS with your Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx6FFQUOoUKe8Z7kwdTQSfRNdm-u_93DGS2K29LYjkXV2QP2PPLk-2xaNE-3g5lqs9LWA/exec';

// State: Track the last time we synced
// GLOBAL STATE: Add this outside the function to track history
let lastKnownCount = -1; // Start at -1 to force a check on first boot
let lastSyncTime = new Date();

const pollDatabase = async () => {
  try {
    const safetyBuffer = new Date(lastSyncTime.getTime() - 5000); 

    // 1. Fetch Updates
    const updates = await sequelize.query(
      `SELECT * FROM ${TABLE_NAME} WHERE updatedAt > :lastTime`, 
      { replacements: { lastTime: safetyBuffer }, type: sequelize.QueryTypes.SELECT }
    );

    // 2. Fetch All Valid IDs (Heartbeat)
    const allRows = await sequelize.query(
      `SELECT superjoin_id FROM ${TABLE_NAME}`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const validIds = allRows.map(r => r.superjoin_id);
    const currentCount = validIds.length;

    // 3. THE FIX: Trigger if count DROPS to zero (or changes significantly)
    // We send data if:
    // A. There are new updates
    // B. The DB is not empty (standard sync)
    // C. The DB *IS* empty, but it wasn't empty last time (The Truncate Event)
    
    const hasDrasticChange = (currentCount === 0 && lastKnownCount > 0);
    
    if (updates.length > 0 || currentCount > 0 || hasDrasticChange) {
      
      console.log(`📤 Sync Triggered. Updates: ${updates.length}, Count: ${currentCount}`);

      const response = await axios.post(GOOGLE_SCRIPT_URL, { 
        updates: updates,
        valid_ids: validIds // This will be [] if truncated
      });
      
      lastSyncTime = new Date();
    }

    // Update history for next run
    lastKnownCount = currentCount;

  } catch (error) {
    console.error('⚠️ Polling Error:', error.message);
  }
};

const startPolling = () => {
  console.log('⏳ Polling Started...');
  setInterval(pollDatabase, 10000);
};

module.exports = { startPolling };