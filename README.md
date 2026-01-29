# Superjoin Sync Engine 🔄

A robust, bi-directional synchronization engine between **Google Sheets** and **TiDB (MySQL)**, designed to handle high-concurrency, burst edits, and distributed race conditions.

## 🚀 Key Features

* **Real-Time Sync (Sheet → DB):** Uses **Redis Queue (BullMQ)** to buffer incoming webhooks, preventing server crashes during "drag-down" bursts (50+ rows).
* **Polling Sync (DB → Sheet):** Background poller checks for database changes every 10 seconds and syncs them back to the Sheet.
* **Conflict Resolution:**
* **Ghost ID:** Uses a `superjoin_id` column to track rows independent of content.
* **Smart Merging:** Handles "Fast-Typing" race conditions by merging rapid updates (within 15s) into a single database record.
* **Loop Breaking:** Prevents infinite sync loops by identifying system-generated edits.


* **Dynamic Schema:** Automatically adjusts the SQL table structure to match Google Sheet headers on the fly.
* **Live Dashboard:** A React-based control center to visualize data and simulate database updates.

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** TiDB (Serverless MySQL)
* **Queue:** Redis (Upstash) + BullMQ
* **Frontend:** React, Vite, Tailwind CSS
* **Integration:** Google Apps Script (GAS) with `LockService`

## ✅ Edge Case Handling Matrix

| Scenario | Solution Implemented | Status |
| --- | --- | --- |
| **Infinite Sync Loops** | **Source Tagging:** GAS script ignores edits triggered by the system's own write-backs. | ✅ **DONE** |
| **Burst Edits (Drag-Down)** | **Queue Buffering:** Redis captures 100+ simultaneous requests; Worker processes them sequentially. | ✅ **DONE** |
| **Race Conditions (Fast Typing)** | **Heuristic Deduplication:** Server merges "ID-less" rows created within 15s of each other. | ✅ **DONE** |
| **Multiplayer Conflicts** | **Mutex Locking:** GAS `LockService` forces concurrent users to wait in line, preventing overwrite collisions. | ✅ **DONE** |
| **Schema Evolution** | **Dynamic Alter:** Sequalize logic detects new columns and runs `ALTER TABLE` automatically. | ✅ **DONE** |

## ⚙️ Setup Instructions

### 1. Prerequisites

* Node.js (v18+)
* Redis URL (Upstash or Local)
* TiDB / MySQL Connection String

### 2. Installation

```bash
# Clone the repository
git clone [your-repo-link]
cd superjoin-sync-engine

# Install Backend Dependencies
npm install

# Install Frontend Dependencies
cd client
npm install
cd ..

```

### 3. Configuration

Create a `.env` file in the root directory:

```env
PORT=3000
DB_HOST=gateway01.us-west-2.prod.aws.tidbcloud.com
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=test
DB_PORT=4000
REDIS_URL=redis://default:your_redis_password@your_endpoint:6379

```

### 4. Running the Project

```bash
# Start the Backend (Server + Worker + Poller)
npm start

# The Frontend is served statically via the Backend at http://localhost:3000

```

## 🧪 Testing the Solution

### 1. The "Burst" Test (Queue)

* Open the Google Sheet.
* Type "Test" in a cell and drag the handle down **20 rows**.
* **Observation:** The server does not crash. The **Dashboard** shows rows populating sequentially as the Worker processes the queue.

### 2. The "Reverse Sync" Test (Poller)

* Open the **Live Dashboard**.
* Click any cell (e.g., "Role") and edit the value (e.g., change "Intern" to "CTO").
* **Observation:** A toast notification confirms the save. Within 10 seconds, the **Google Sheet** updates automatically to match.

### 3. The "Fast-Type" Test (Race Condition)

* In the Google Sheet, type "Name" then immediately tab and type "Role" (very fast).
* **Observation:** The system detects the temporal proximity and merges these two events into a **single database row** instead of creating duplicates.