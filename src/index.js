require('dotenv').config();
const path = require('path');
const { fork } = require('child_process');

const SERVER_FILE = path.join(__dirname, 'server.js');
const GRACE_MS = 5000;

let child = null;
let restartCount = 0;
let stopping = false;

function startServer() {
  child = fork(SERVER_FILE, [], {
    env: process.env,
    stdio: 'inherit',
    silent: false,
  });
  console.log(`[supervisor] Forked server pid ${child.pid}`);

  child.on('exit', (code, signal) => {
    console.log(`[supervisor] Server exited (code=${code}, signal=${signal})`);
    if (!stopping) {
      restartCount += 1;
      console.log(`[supervisor] Restarting server in 1s... (restart #${restartCount})`);
      setTimeout(startServer, 1000);
    }
  });
}

function stopAll(signal) {
  stopping = true;
  console.log(`[supervisor] ${signal} received — stopping server`);
  if (child) {
    try {
      child.send('shutdown');
    } catch (_) {
      child.kill();
    }
    setTimeout(() => {
      if (child && child.exitCode === null) child.kill('SIGKILL');
      process.exit(0);
    }, GRACE_MS);
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => stopAll('SIGINT'));
process.on('SIGTERM', () => stopAll('SIGTERM'));

startServer();
