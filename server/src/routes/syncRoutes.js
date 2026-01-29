const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

// POST /api/sync/webhook
router.post('/webhook', syncController.syncSheetToDB);
router.put('/update', async (req, res) => {
  try {
    const { superjoin_id, column, value } = req.body;

    if (!superjoin_id || !column) {
      return res.status(400).json({ error: "Missing superjoin_id or column" });
    }

    // Safety: Prevent editing system columns
    if (['superjoin_id', 'createdAt', 'updatedAt'].includes(column)) {
      return res.status(403).json({ error: "Cannot edit system columns directly" });
    }

    // 1. Sanitize the Column Name (Prevent SQL Injection)
    // We only allow alphanumeric + underscores
    const cleanColumn = column.replace(/[^a-zA-Z0-9_]/g, '');

    // 2. Perform the Update
    // We explicitly set updatedAt = NOW() to trigger the Reverse Sync Poller
    await sequelize.query(
      `UPDATE ${TABLE_NAME} SET ${cleanColumn} = :value, updatedAt = NOW() WHERE superjoin_id = :id`,
      {
        replacements: { value: value, id: superjoin_id }
      }
    );

    console.log(`✏️ Dashboard Edit: Updated ${cleanColumn} to '${value}' for ID ${superjoin_id}`);
    
    res.json({ success: true, message: "Update successful" });

  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;