const axios = require('axios');
const { sequelize } = require('../config/db');
const { TABLE_NAME } = require('./schemaEngine');

// CONFIGURATION
// 🔴 REPLACE THIS with your Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx6FFQUOoUKe8Z7kwdTQSfRNdm-u_93DGS2K29LYjkXV2QP2PPLk-2xaNE-3g5lqs9LWA/exec';

// State: Track the last time we synced
let lastSyncTime = new Date();

const pollDatabase = async () => {
  try {
    // 1. SAFETY BUFFER (Existing Logic)
    const safetyBuffer = new Date(lastSyncTime.getTime() - 5000); 

    // 2. FETCH UPDATES (Standard Sync)
    const updates = await sequelize.query(
      `SELECT * FROM ${TABLE_NAME} WHERE updatedAt > :lastTime`, 
      { replacements: { lastTime: safetyBuffer }, type: sequelize.QueryTypes.SELECT }
    );

    // 3. FETCH HEARTBEAT (The New Deletion Logic) 💓
    // Get a list of ALL valid IDs currently in the DB
    const allRows = await sequelize.query(
      `SELECT superjoin_id FROM ${TABLE_NAME}`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const validIds = allRows.map(r => r.superjoin_id);

    // 4. SEND TO SHEET (If there are updates OR just to validate existence)
    // We send this even if updates.length is 0, so deletions reflect immediately
    // To save bandwidth, you could only send if validIds.length != lastKnownCount
    // But for this assignment, sending it every cycle is safer.
    
    if (updates.length > 0 || validIds.length > 0) { 
      const response = await axios.post(GOOGLE_SCRIPT_URL, { 
        updates: updates,
        valid_ids: validIds // 👈 Sending the "Death Note" list
      });
      
      console.log(`📤 Synced: ${updates.length} updates. Validated ${validIds.length} active rows.`);
      lastSyncTime = new Date();
    }

  } catch (error) {
    console.error('⚠️ Polling Error:', error.message);
  }
};

const startPolling = () => {
  console.log('⏳ Polling Started...');
  setInterval(pollDatabase, 10000);
};

module.exports = { startPolling };