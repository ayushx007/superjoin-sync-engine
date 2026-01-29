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

// ✂️ Prune Endpoint: Deletes Rows/Cols missing from the Sheet
router.post('/prune', async (req, res) => {
  try {
    const { active_ids, active_cols } = req.body;
    
    console.log(`✂️ Pruning: Retaining ${active_ids.length} rows and ${active_cols.length} columns.`);

    // 1. ROW DELETION LOGIC
    if (active_ids && active_ids.length > 0) {
      // Delete any row whose superjoin_id is NOT in the active list
      await sequelize.query(
        `DELETE FROM ${TABLE_NAME} WHERE superjoin_id NOT IN (:ids)`,
        { replacements: { ids: active_ids } }
      );
    } else {
      // If list is empty, user deleted ALL rows -> Truncate table (keep structure)
      // Be careful: This deletes ALL data
      await sequelize.query(`DELETE FROM ${TABLE_NAME}`); 
    }

    // 2. COLUMN DELETION LOGIC (Advanced)
    // Only run this if you really want to drop columns from DB
    if (active_cols && active_cols.length > 0) {
      // Get current DB columns
      const [columns] = await sequelize.query(`DESCRIBE ${TABLE_NAME}`);
      const dbColNames = columns.map(c => c.Field);
      
      // Standardize sheet headers to DB format
      const validSheetCols = active_cols.map(c => 
        c.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')
      );
      
      // Always keep System Columns
      const systemCols = ['superjoin_id', 'createdat', 'updatedat', 'id']; 

      for (const col of dbColNames) {
        if (!validSheetCols.includes(col.toLowerCase()) && !systemCols.includes(col.toLowerCase())) {
          console.log(`🗑️ Dropping Column: ${col}`);
          await sequelize.query(`ALTER TABLE ${TABLE_NAME} DROP COLUMN ${col}`);
        }
      }
    }

    res.json({ success: true, message: "Prune complete" });

  } catch (error) {
    console.error("Prune Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;