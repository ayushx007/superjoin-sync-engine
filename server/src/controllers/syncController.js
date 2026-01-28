const syncService = require('../services/syncService');

exports.syncSheetToDB = async (req, res) => {
  try {
    const { headers, row } = req.body;

    // 1. Basic Validation
    if (!headers || !row) {
      return res.status(400).json({ error: 'Missing headers or row data' });
    }

    // 2. Call Service
    // In the future, we will wrap this in a Queue (BullMQ) for the "Burst" handling
    await syncService.handleSync(headers, row);

    res.status(200).json({ message: 'Sync successful' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};