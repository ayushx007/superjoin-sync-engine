const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const syncService = require('../services/syncService');

// 🔴 CONFIGURATION: Use your Upstash URL here (or process.env.REDIS_URL)
// Ideally, put this in your .env file
const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null // Required for BullMQ
});

// 1. Define the Queue
const syncQueue = new Queue('sheet-sync-queue', { connection });

// 2. Define the Worker (The process that actually writes to DB)
const worker = new Worker('sheet-sync-queue', async (job) => {
  console.log(`👷 Worker processing Job #${job.id}`);
  const { headers, row } = job.data;
  
  // Call the original Sync Service we already built
  const result = await syncService.handleSync(headers, row);
  return result;
}, { connection });

worker.on('completed', job => {
  console.log(`✅ Job #${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job #${job.id} failed: ${err.message}`);
});

module.exports = { syncQueue };