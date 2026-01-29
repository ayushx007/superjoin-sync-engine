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

module.exports = router;