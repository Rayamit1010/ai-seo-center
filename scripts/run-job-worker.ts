import { runWorkerPass } from "../lib/server/job-worker";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPollIntervalMs() {
  const configured = Number(process.env.JOB_WORKER_POLL_INTERVAL_MS ?? "15000");
  return Number.isFinite(configured) && configured >= 1000 ? configured : 15000;
}

let shuttingDown = false;

async function main() {
  const pollIntervalMs = getPollIntervalMs();

  const stop = (signal: string) => {
    if (!shuttingDown) {
      shuttingDown = true;
      console.log(`Worker received ${signal}. Finishing the current cycle before exit...`);
    }
  };

  process.on("SIGINT", () => stop("SIGINT"));
  process.on("SIGTERM", () => stop("SIGTERM"));

  console.log(`Background worker started. Poll interval: ${pollIntervalMs}ms`);

  while (!shuttingDown) {
    const startedAt = Date.now();
    try {
      const result = await runWorkerPass();
      console.log(
        `[worker-pass] queued-agent-cycles=${result.queuedAgentCycles} queued-schedules=${result.queuedSchedules} processed-jobs=${result.processedJobs}`
      );
    } catch (error) {
      console.error("Background worker pass failed:", error);
    }

    const elapsedMs = Date.now() - startedAt;
    const waitMs = Math.max(pollIntervalMs - elapsedMs, 1000);

    if (!shuttingDown) {
      await sleep(waitMs);
    }
  }

  console.log("Background worker stopped cleanly.");
}

main().catch((error) => {
  console.error("Background worker crashed:", error);
  process.exit(1);
});
