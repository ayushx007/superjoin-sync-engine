const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/db')
const syncRoutes = require('./routes/syncRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Essential for parsing JSON webhooks

// Health Check (Critical for Render/Railway deployment)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Start Server
const startServer = async () => {
  try {
    await connectDB(); 
    // --- TEMPORARY TEST BLOCK ---
    const { syncSchema } = require('./services/schemaEngine');
    console.log("🧪 Testing Schema Engine...");
    
    // Simulate fetching headers from Google Sheets
    const mockHeaders = ['id', 'Name', 'Email Address', 'Status'];
    await syncSchema(mockHeaders);
    app.use('/api/sync', syncRoutes);
    // ----------------------------
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  }
};

startServer();