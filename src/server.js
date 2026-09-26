require('dotenv').config();
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { initScheduler } = require('./services/scheduler');
const { startCpuMonitor } = require('./services/cpuMonitor');

const PORT = process.env.PORT || 3000;
let server;

async function start() {
  const mongoUri = await connectDB();
  app.locals.mongoUri = mongoUri;
  await initScheduler();

  server = app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT} (pid ${process.pid})`);
  });

  startCpuMonitor({
    limit: Number(process.env.CPU_LIMIT || 70),
    intervalMs: Number(process.env.CPU_CHECK_INTERVAL_MS || 5000),
    onExceeded: (cpu) => shutdown(`cpu usage ${cpu.toFixed(1)}% exceeded limit`),
  });
}

async function shutdown(reason) {
  console.log(`[server] Shutting down (${reason})`);
  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  } catch (err) {
    console.error('[server] Error during shutdown:', err.message);
  } finally {
    process.exit(0);
  }
}

// Supervisor sends 'shutdown' when CPU > threshold
process.on('message', (msg) => {
  if (msg === 'shutdown') shutdown('cpu limit reached');
});
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
