const { syncQueue } = require('../queue/queue'); // Import the Queue

exports.syncSheetToDB = async (req, res) => {
  try {
    const { headers, row } = req.body;

    if (!headers || !row) {
      return res.status(400).json({ error: 'Missing headers or row data' });
    }

    // 🔥 THE UPGRADE: Don't write to DB. Add to Queue.
    // This returns instantly, so Google Sheets never times out.
    await syncQueue.add('sync-row', { headers, row });

    // Return a "Ghost ID" immediately if we can (Advanced), 
    // or just say "Queued" for now. 
    // For this assignment, we'll return "Queued" and let the Poller handle the update back to Sheet.
    return res.status(200).json({ status: 'queued', message: 'Update added to queue' });

  } catch (error) {
    console.error('❌ Queue Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};