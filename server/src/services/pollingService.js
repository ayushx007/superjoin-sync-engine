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
        // 1. Find rows updated recently
        // We use a raw query because it's faster and safer than reloading models
        const query = `
      SELECT * FROM ${TABLE_NAME} 
      WHERE updatedAt > :lastTime
    `;

        const updates = await sequelize.query(query, {
            replacements: { lastTime: lastSyncTime },
            type: sequelize.QueryTypes.SELECT
        });

        if (updates.length > 0) {
            console.log(`Changes detected in DB: ${updates.length} rows.`);

            // 2. Push to Google Sheet
            // The payload structure matches what our GAS doPost expects
            await axios.post(GOOGLE_SCRIPT_URL, { updates });

            console.log('⬆️ Pushed updates to Google Sheet');

            // 3. Update Sync Time
            // Set it to "now" so we only catch new changes next time
            lastSyncTime = new Date();
        }
    } catch (error) {
        // Ignore "Network Error" if Google is sleepy, but log others
        if (error.response) {
            console.error('❌ Google Script Error:', error.response.data);
        } else {
            console.error('⚠️ Polling Check Failed:', error.message);
        }
    }
};

// Start Polling (Every 10 seconds)
const startPolling = () => {
    console.log('⏳ Database Polling Started...');
    setInterval(pollDatabase, 10000);
};

module.exports = { startPolling };