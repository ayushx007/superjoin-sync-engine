const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

// POST /api/sync/webhook
router.post('/webhook', syncController.syncSheetToDB);

module.exports = router;