import { enqueueBackgroundJob, drainQueuedJobs } from "@/lib/server/job-queue";
import { claimDueAgentCycles } from "@/lib/services/agent-automation-service";
import { claimDueReportSchedules } from "@/lib/services/report-automation-service";
import { prisma } from "@/lib/db";

export type WorkerPassResult = {
  queuedAgentCycles: number;
  queuedSchedules: number;
  processedJobs: number;
  queuedEmailBatches: number;
};

export async function runWorkerPass(): Promise<WorkerPassResult> {
  const dueAgentCycles = await claimDueAgentCycles();
  for (const cycle of dueAgentCycles) {
    await enqueueBackgroundJob({
      name: "run-agent-cycle",
      payload: {
        userId: cycle.userId,
      },
    });
  }

  const dueSchedules = await claimDueReportSchedules();
  for (const schedule of dueSchedules) {
    await enqueueBackgroundJob({
      name: "run-report-schedule",
      payload: {
        scheduleId: schedule.id,
        userId: schedule.userId,
        auditId: schedule.auditId,
        targetUrl: schedule.targetUrl,
        clientName: schedule.clientName,
        projectName: schedule.projectName,
        recipientEmail: schedule.recipientEmail,
        frequency: schedule.frequency as "daily" | "weekly" | "monthly",
        weekday: schedule.weekday,
        monthDay: schedule.monthDay,
        hour: schedule.hour,
        minute: schedule.minute,
        timezone: schedule.timezone,
        processingRunAt: schedule.processingRunAt?.toISOString() || null,
        deliveryMode: schedule.deliveryMode as "email" | "draft",
      },
    });
  }

  // Enqueue outreach email batch if there are pending items due
  const pendingEmailCount = await prisma.emailQueue.count({
    where: { status: "pending", scheduledFor: { lte: new Date() } },
  });
  let queuedEmailBatches = 0;
  if (pendingEmailCount > 0) {
    await enqueueBackgroundJob({ name: "process-email-queue", payload: { batchSize: 20 } });
    queuedEmailBatches = 1;
  }

  const limit = Number(process.env.JOB_DRAIN_BATCH_SIZE ?? "10");
  const processedJobs = await drainQueuedJobs(Number.isFinite(limit) ? limit : 10);

  return {
    queuedAgentCycles: dueAgentCycles.length,
    queuedSchedules: dueSchedules.length,
    processedJobs,
    queuedEmailBatches,
  };
}
