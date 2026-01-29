const axios = require('axios');
const { sequelize } = require('../config/db');
const { TABLE_NAME } = require('./schemaEngine');

// CONFIGURATION
// 🔴 REPLACE THIS with your Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx6FFQUOoUKe8Z7kwdTQSfRNdm-u_93DGS2K29LYjkXV2QP2PPLk-2xaNE-3g5lqs9LWA/exec';

// State: Track the last time we synced
// GLOBAL STATE (Must be outside the function)
let lastKnownCount = -1; // Start at -1 to force a sync on first boot
let lastSyncTime = new Date();

const pollDatabase = async () => {
  try {
    const safetyBuffer = new Date(lastSyncTime.getTime() - 5000); 

    // 1. Check for UPDATES (Rows that changed)
    const updates = await sequelize.query(
      `SELECT * FROM ${TABLE_NAME} WHERE updatedAt > :lastTime`, 
      { replacements: { lastTime: safetyBuffer }, type: sequelize.QueryTypes.SELECT }
    );

    // 2. Check for EXISTENCE (Heartbeat)
    const allRows = await sequelize.query(
      `SELECT superjoin_id FROM ${TABLE_NAME}`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const validIds = allRows.map(r => r.superjoin_id);
    const currentCount = validIds.length;

    // 3. THE LOGIC FIX: Sync if updates found OR if the row count changed
    // If you truncate: currentCount becomes 0. lastKnownCount was 5. 0 != 5. -> SYNC TRIGGERS.
    const countHasChanged = currentCount !== lastKnownCount;
    
    if (updates.length > 0 || countHasChanged) {
      
      console.log(`📤 Syncing. Updates: ${updates.length}, Total Rows: ${currentCount} (Prev: ${lastKnownCount})`);

      await axios.post(GOOGLE_SCRIPT_URL, { 
        updates: updates,
        valid_ids: validIds // Sends [] if truncated
      });
      
      lastSyncTime = new Date();
    }

    // Update history for next loop
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