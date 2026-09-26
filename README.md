# worker thread — Insurance Policy Service

Express + MongoDB (Mongoose) service implementing:

- **Task 1**: CSV/XLSX bulk upload via **worker threads**, policy search by username, per-user policy aggregation — across 6 collections (`agents`, `users`, `accounts`, `lobs`, `carriers`, `policyinfos`).
- **Task 2**: real-time CPU monitor that restarts the server at 70% utilisation, and a scheduled post-service that inserts a message into the DB at a given day/time.

## Setup

```bash
npm install
cp .env or edit .env
```

Set `MONGO_URI` in `.env`, or run without a local MongoDB using the in-memory server:

```env
USE_MEMORY_DB=true
```

## Run

```bash
npm start           # supervisor + server (CPU monitor active, auto-restart at 70%)
npm run start:server  # server only, no supervisor
```

## API

### Task 1

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload `.csv`/`.xlsx` (multipart field `file`). Parsed & inserted inside a `worker_threads` worker. |
| GET | `/api/policies/search?username=<name>` | Policy info for users matching `username` (first name or email, case-insensitive). |
| GET | `/api/policies/aggregate` | Policies aggregated per user (count + policy numbers). |

```bash
curl -F "file=@data.csv" http://localhost:3000/api/upload
curl "http://localhost:3000/api/policies/search?username=Lura"
curl http://localhost:3000/api/policies/aggregate
```

### Task 2

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/messages/schedule` | Body `{ "message", "day", "time" }`. `day` accepts `today`, `tomorrow`, a weekday (`monday`…) or a date (`2026-09-30`); `time` accepts `HH:mm` or `h:mm AM/PM`. The message is inserted into `messages` at that time.

```bash
curl -X POST http://localhost:3000/api/messages/schedule \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","day":"monday","time":"14:30"}'
```

Pending jobs are persisted in `scheduledjobs` and re-armed on restart.

## Layout

```
src/
  index.js                 supervisor + CPU monitor (npm start)
  server.js                app bootstrap, graceful shutdown
  app.js                   express app
  config/db.js             mongoose connect (+ optional in-memory mongo)
  models/                  Agent, User, Account, Lob, Carrier, PolicyInfo, ScheduledJob, Message
  workers/uploadWorker.js  worker_threads CSV/XLSX -> MongoDB ingestion
  controllers/             upload / policy / message handlers
  services/scheduler.js    day+time parsing, node-schedule jobs
  routes/index.js
```
