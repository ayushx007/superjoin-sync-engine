const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const { sequelize } = require('../config/db');
const { TABLE_NAME } = require('../services/schemaEngine');

// 1. WEBHOOK: Sheet -> DB (Existing)
router.post('/webhook', syncController.syncSheetToDB);

// 2. DASHBOARD DATA: Fetch all rows for the UI
router.get('/data', async (req, res) => {
  try {
    const [results] = await sequelize.query(
      `SELECT * FROM ${TABLE_NAME} ORDER BY createdAt DESC`
    );
    res.json(results);
  } catch (error) {
    console.error("Dashboard Fetch Error:", error);
    res.status(500).json([]);
  }
});

// 3. INLINE EDIT: Dashboard -> DB
router.put('/update', async (req, res) => {
  try {
    const { superjoin_id, column, value } = req.body;
    
    // Sanitize column name to prevent SQL injection
    const cleanColumn = column.replace(/[^a-zA-Z0-9_]/g, '');

    await sequelize.query(
      `UPDATE ${TABLE_NAME} SET ${cleanColumn} = :value, updatedAt = NOW() WHERE superjoin_id = :id`,
      { replacements: { value, id: superjoin_id } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Dashboard Update Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✂️ Prune Endpoint: Enhanced Deletion Logic
router.post('/prune', async (req, res) => {
  try {
    const { active_ids, active_cols } = req.body;
    
    // 1. DATA SYNC (Rows)
    // We use a cleaner check for empty sheets
    const hasActiveRows = Array.isArray(active_ids) && active_ids.length > 0;

    if (!hasActiveRows) {
      console.log("🧹 Sheet data cleared. Truncating table...");
      await sequelize.query(`DELETE FROM ${TABLE_NAME}`);
    } else {
      // ✅ THE FIX: Use standard 'IN' logic with replacements
      // This ensures Sequelize handles the array of strings correctly
      console.log(`✂️ Syncing: Keeping ${active_ids.length} rows.`);
      await sequelize.query(
        `DELETE FROM ${TABLE_NAME} WHERE superjoin_id NOT IN (:ids)`,
        { 
          replacements: { ids: active_ids },
          type: sequelize.QueryTypes.DELETE 
        }
      );
    }

    // 2. SCHEMA SYNC (Columns)
    // Standardize headers and handle system columns
    const [columns] = await sequelize.query(`DESCRIBE ${TABLE_NAME}`);
    const dbColNames = columns.map(c => c.Field);
    
    const validSheetCols = active_cols 
      ? active_cols.map(c => c.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')) 
      : [];
    
    const systemCols = ['superjoin_id', 'createdat', 'updatedat', 'id']; 

    for (const col of dbColNames) {
      if (!validSheetCols.includes(col.toLowerCase()) && !systemCols.includes(col.toLowerCase())) {
        console.log(`🔥 Prune: Dropping Column '${col}'`);
        await sequelize.query(`ALTER TABLE ${TABLE_NAME} DROP COLUMN ${col}`);
      }
    }

    res.json({ success: true, message: "Sync complete" });

  } catch (error) {
    console.error("Prune Error Detail:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;