function startCpuMonitor({ limit = 70, intervalMs = 5000, consecutiveChecks = 2, onExceeded } = {}) {
  let lastUsage = process.cpuUsage();
  let lastTime = process.hrtime.bigint();
  let hits = 0;

  const timer = setInterval(() => {
    const now = process.hrtime.bigint();
    const usage = process.cpuUsage();

    const cpuDeltaUs = usage.user + usage.system - (lastUsage.user + lastUsage.system);
    const wallDeltaUs = Number(now - lastTime) / 1000;
    lastUsage = usage;
    lastTime = now;

    const cpuPercent = wallDeltaUs > 0 ? (cpuDeltaUs / wallDeltaUs) * 100 : 0;

    if (cpuPercent >= limit) {
      hits += 1;
      console.warn(
        `[cpu] ${cpuPercent.toFixed(1)}% >= ${limit}% (check ${hits}/${consecutiveChecks})`
      );
      if (hits >= consecutiveChecks) {
        clearInterval(timer);
        onExceeded(cpuPercent);
        return;
      }
    } else {
      hits = 0;
      console.log(`[cpu] ${cpuPercent.toFixed(1)}%`);
    }
  }, intervalMs);

  timer.unref();
  return () => clearInterval(timer);
}

module.exports = { startCpuMonitor };
