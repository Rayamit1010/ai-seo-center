import { runWorkerPass } from "../lib/server/job-worker";

async function main() {
  const result = await runWorkerPass();
  console.log(`Queued ${result.queuedAgentCycles} due agent cycle(s).`);
  console.log(`Queued ${result.queuedSchedules} due report schedule(s).`);
  console.log(`Processed ${result.processedJobs} queued job(s).`);
}

main().catch((error) => {
  console.error("Failed to drain queued jobs:", error);
  process.exit(1);
});
