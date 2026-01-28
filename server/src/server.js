const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/db')
const syncRoutes = require('./routes/syncRoutes');
const { startPolling } = require('./services/pollingService');

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
    startPolling();
    
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