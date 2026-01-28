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
    const query = `SELECT * FROM ${TABLE_NAME} WHERE updatedAt > :lastTime`;
    const updates = await sequelize.query(query, {
      replacements: { lastTime: lastSyncTime },
      type: sequelize.QueryTypes.SELECT
    });

    if (updates.length > 0) {
      console.log(`Changes detected: ${updates.length} rows.`);
      
      // 🕵️‍♂️ DEBUGGING THE RESPONSE
      const response = await axios.post(GOOGLE_SCRIPT_URL, { updates }, {
        headers: { 'Content-Type': 'application/json' },
        maxRedirects: 5
      });
      
      // 🔴 THIS LOG WILL REVEAL THE TRUTH
      console.log('📬 Google Response:', typeof response.data === 'object' ? JSON.stringify(response.data) : response.data);
      
      lastSyncTime = new Date();
    }
  } catch (error) {
    if (error.response) {
      // Log the full HTML if Google sends an error page
      console.error('❌ Google Error Status:', error.response.status);
      console.error('❌ Google Error Body:', error.response.data);
    } else {
      console.error('⚠️ Polling Error:', error.message);
    }
  }
};

const startPolling = () => {
  console.log('⏳ Polling Started...');
  setInterval(pollDatabase, 10000);
};

module.exports = { startPolling };