# Superjoin FDE Assignment: Live 2-Way Sync Engine

A production-grade synchronization engine between Google Sheets and MySQL, designed to handle high-concurrency edits and rate limits.

## 🚀 Architecture
- **Backend:** Node.js (Express)
- **Database:** TiDB (MySQL Compatible Serverless)
- **Queue System:** BullMQ + Redis (Upstash) for burst handling
- **Frontend:** React + Tailwind CSS
- **Middleware:** Google Apps Script (GAS) with "Buffered Locking"

## ✅ Edge Case Handling Matrix
| Scenario | Strategy | Status |
| :--- | :--- | :--- |
| **Infinite Loops** | Source Tagging (Service Account Logic) | ⏳ Pending |
| **Burst Edits (Drag-Down)** | Redis Job Queue + Debouncing | ⏳ Pending |
| **Race Conditions** | "Last Write Wins" Timestamp Logic | ⏳ Pending |
| **Network Failures** | Exponential Backoff Retries | ⏳ Pending |

## 🛠 Setup Instructions
(To be added)