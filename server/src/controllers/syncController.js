const syncService = require('../services/syncService');

exports.syncSheetToDB = async (req, res) => {
  try {
    const { headers, row } = req.body;

    // 1. Validate
    if (!headers || !row) {
      // CRITICAL: Use 'return' to stop execution here
      return res.status(400).json({ error: 'Missing headers or row data' });
    }

    // 2. Call Service
    const result = await syncService.handleSync(headers, row);

    // 3. Send Success Response
    // CRITICAL: Use 'return' to ensure we don't accidentally run code below
    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ Controller Error:', error);
    
    // 4. Safety Check
    // Only send an error response if we haven't sent one already
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};