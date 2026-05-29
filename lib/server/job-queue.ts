import { prisma } from "@/lib/db";
import { summarizeError } from "@/lib/errors";
import { runAgentCycle } from "@/lib/agent";
import { markAuditFailed, processAuditJob } from "@/lib/services/audit-service";
import {
  generateScheduledReport,
  markScheduleRunComplete,
  markScheduleRunFailed,
  sendReportEmail,
} from "@/lib/services/report-automation-service";
import { bulkCheckRankings } from "@/lib/rank-tracker/dataforseo";
import { sendOutreachEmail } from "@/lib/resend";

async function processOutreachEmailQueue(batchSize: number) {
  const now = new Date();
  const emails = await prisma.emailQueue.findMany({
    where: {
      status: "pending",
      scheduledFor: { lte: now },
    },
    take: batchSize,
    include: { prospect: { select: { campaignId: true } } },
  });

  for (const email of emails) {
    await prisma.emailQueue.update({ where: { id: email.id }, data: { status: "sending", attempts: { increment: 1 } } });
    try {
      const result = await sendOutreachEmail({
        from: email.fromEmail,
        to: email.toEmail,
        subject: email.subject,
        body: email.body,
      });
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: { status: "sent", sentAt: new Date(), resendId: result.id ?? null },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isFinal = email.attempts + 1 >= email.maxAttempts;
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: { status: isFinal ? "failed" : "pending", errorMessage: msg },
      });
    }
  }
}

export type ProcessAuditJob = {
  name: "process-audit";
  payload: {
    auditId: string;
    userId: string;
    data: {
      url?: string;
      htmlContent?: string;
      inputType: "url" | "paste";
    };
  };
};

export type SendReportEmailJob = {
  name: "send-report-email";
  payload: {
    userId: string;
    reportId: string;
    recipientEmail?: string;
  };
};

export type RunReportScheduleJob = {
  name: "run-report-schedule";
  payload: {
    scheduleId: string;
    userId: string;
    auditId?: string | null;
    targetUrl: string;
    clientName: string;
    projectName: string;
    recipientEmail: string;
    frequency: "daily" | "weekly" | "monthly";
    weekday?: number | null;
    monthDay?: number | null;
    hour: number;
    minute: number;
    timezone?: string | null;
    processingRunAt?: string | null;
    deliveryMode: "email" | "draft";
  };
};

export type RunAgentCycleJob = {
  name: "run-agent-cycle";
  payload: {
    userId: string;
  };
};

export type RankCheckJob = {
  name: "rank-check";
  payload: {
    keywordIds: string[];
    userId: string;
  };
};

export type ProcessEmailQueueJob = {
  name: "process-email-queue";
  payload: {
    batchSize?: number;
  };
};

export type BackgroundJob =
  | ProcessAuditJob
  | SendReportEmailJob
  | RunReportScheduleJob
  | RunAgentCycleJob
  | RankCheckJob
  | ProcessEmailQueueJob;

type QueueProvider = "database" | "memory" | "redis";

type QueueAdapter = {
  enqueue(job: BackgroundJob): Promise<void>;
  drain(limit?: number): Promise<number>;
};

type JobStatusEvent = {
  id: string;
  userId: string | null;
  jobName: BackgroundJob["name"];
  success: boolean;
  createdAt: string;
  reason: string | null;
  rawError: string | null;
  attempts?: number;
};

type PersistedBackgroundJob = {
  id: string;
  userId: string | null;
  jobName: BackgroundJob["name"];
  payload: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  availableAt: Date;
  processingStartedAt: Date | null;
  leaseUntil: Date | null;
  lockedBy: string | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

const JOB_LEASE_MS: Record<BackgroundJob["name"], number> = {
  "process-audit": 20 * 60 * 1000,
  "send-report-email": 5 * 60 * 1000,
  "run-report-schedule": 15 * 60 * 1000,
  "run-agent-cycle": 20 * 60 * 1000,
  "rank-check": 10 * 60 * 1000,
  "process-email-queue": 5 * 60 * 1000,
};

const JOB_MAX_ATTEMPTS: Record<BackgroundJob["name"], number> = {
  "process-audit": 3,
  "send-report-email": 1,
  "run-report-schedule": 1,
  "run-agent-cycle": 1,
  "rank-check": 2,
  "process-email-queue": 3,
};

const globalForQueue = globalThis as unknown as {
  backgroundQueuePending?: { count: number };
  backgroundQueueEvents?: JobStatusEvent[];
  backgroundQueueDrainState?: { scheduled: boolean; draining: boolean };
};

const queuePending = globalForQueue.backgroundQueuePending ?? { count: 0 };
const queueEvents = globalForQueue.backgroundQueueEvents ?? [];
const queueDrainState = globalForQueue.backgroundQueueDrainState ?? {
  scheduled: false,
  draining: false,
};

if (process.env.NODE_ENV !== "production") {
  globalForQueue.backgroundQueuePending = queuePending;
  globalForQueue.backgroundQueueEvents = queueEvents;
  globalForQueue.backgroundQueueDrainState = queueDrainState;
}

function getJobUserId(job: BackgroundJob) {
  return "userId" in job.payload ? job.payload.userId ?? null : null;
}

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Upstash Redis REST credentials are not configured");
  }

  return { url, token };
}

async function callRedisPipeline(commands: Array<Array<string | number>>) {
  const { url, token } = getRedisConfig();
  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Redis queue request failed with status ${response.status}`);
  }

  return (await response.json()) as Array<{ result?: unknown; error?: string }>;
}

function recordLegacyQueueEvent(job: BackgroundJob, outcome: { success: boolean; error?: unknown; attempts?: number }) {
  const summary = outcome.error ? summarizeError(outcome.error) : null;

  queueEvents.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: getJobUserId(job),
    jobName: job.name,
    success: outcome.success,
    createdAt: new Date().toISOString(),
    reason: summary?.human ?? null,
    rawError: summary?.raw ?? null,
    attempts: outcome.attempts,
  });

  if (queueEvents.length > 25) {
    queueEvents.splice(25);
  }
}

function getQueueProvider(): QueueProvider {
  const provider = process.env.JOB_QUEUE_PROVIDER?.toLowerCase();
  const hasRedisConfig =
    Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
    Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

  if (provider === "memory") {
    return "memory";
  }

  if (provider === "redis" && hasRedisConfig) {
    return "redis";
  }

  return "database";
}

function isLocalFallbackEnabled() {
  return process.env.JOB_QUEUE_REMOTE_ONLY !== "true";
}

function getJobLeaseMs(jobName: BackgroundJob["name"]) {
  return JOB_LEASE_MS[jobName];
}

function getJobMaxAttempts(jobName: BackgroundJob["name"]) {
  return JOB_MAX_ATTEMPTS[jobName];
}

function getRetryDelayMs(jobName: BackgroundJob["name"], attempts: number) {
  const baseByJob: Record<BackgroundJob["name"], number[]> = {
    "process-audit": [30_000, 2 * 60_000, 10 * 60_000],
    "send-report-email": [0],
    "run-report-schedule": [60_000, 5 * 60_000, 15 * 60_000],
    "run-agent-cycle": [0],
    "rank-check": [60_000, 5 * 60_000],
    "process-email-queue": [30_000, 2 * 60_000, 5 * 60_000],
  };

  const delays = baseByJob[jobName];
  return delays[Math.min(Math.max(attempts - 1, 0), delays.length - 1)] ?? 0;
}

function serializeJobPayload(job: BackgroundJob) {
  return JSON.stringify(job.payload);
}

function parsePersistedJob(jobName: string, payload: string): BackgroundJob {
  const parsedPayload = JSON.parse(payload) as BackgroundJob["payload"];

  switch (jobName) {
    case "process-audit":
      return { name: "process-audit", payload: parsedPayload as ProcessAuditJob["payload"] };
    case "send-report-email":
      return { name: "send-report-email", payload: parsedPayload as SendReportEmailJob["payload"] };
    case "run-report-schedule":
      return { name: "run-report-schedule", payload: parsedPayload as RunReportScheduleJob["payload"] };
    case "run-agent-cycle":
      return { name: "run-agent-cycle", payload: parsedPayload as RunAgentCycleJob["payload"] };
    case "rank-check":
      return { name: "rank-check", payload: parsedPayload as RankCheckJob["payload"] };
    case "process-email-queue":
      return { name: "process-email-queue", payload: parsedPayload as ProcessEmailQueueJob["payload"] };
    default:
      throw new Error(`Unknown background job type: ${jobName}`);
  }
}

async function executeBackgroundJob(job: BackgroundJob) {
  switch (job.name) {
    case "process-audit":
      await processAuditJob(
        job.payload.auditId,
        job.payload.userId,
        job.payload.data
      );
      return;
    case "send-report-email":
      await sendReportEmail(job.payload);
      return;
    case "run-report-schedule": {
      const generated = await generateScheduledReport({
        userId: job.payload.userId,
        auditId: job.payload.auditId,
        targetUrl: job.payload.targetUrl,
        clientName: job.payload.clientName,
        projectName: job.payload.projectName,
        recipientEmail: job.payload.recipientEmail,
      });

      if (job.payload.deliveryMode === "email") {
        await sendReportEmail({
          userId: job.payload.userId,
          reportId: generated.reportId,
          recipientEmail: job.payload.recipientEmail,
        });
      }

      await markScheduleRunComplete(job.payload.scheduleId);
      return;
    }
    case "run-agent-cycle":
      await runAgentCycle(job.payload.userId);
      return;
    case "rank-check":
      await bulkCheckRankings(job.payload.keywordIds);
      return;
    case "process-email-queue":
      await processOutreachEmailQueue(job.payload.batchSize ?? 20);
      return;
  }
}

async function handleFinalJobFailure(job: BackgroundJob) {
  switch (job.name) {
    case "process-audit":
      await markAuditFailed(job.payload.auditId);
      return;
    case "run-report-schedule":
      await markScheduleRunFailed(job.payload.scheduleId);
      return;
    default:
      return;
  }
}

async function handleJobSuccess(job: BackgroundJob, attempts?: number) {
  if (getQueueProvider() !== "database") {
    recordLegacyQueueEvent(job, { success: true, attempts });
  }
}

async function handleJobFailure(job: BackgroundJob, error: unknown, attempts?: number) {
  if (getQueueProvider() !== "database") {
    recordLegacyQueueEvent(job, { success: false, error, attempts });
  }
}

function getDatabaseWorkerId() {
  return [
    process.env.HOSTNAME || process.env.COMPUTERNAME || "local",
    process.pid,
  ].join(":");
}

async function claimDatabaseJobs(limit = 10, now = new Date()) {
  const candidates = (await prisma.backgroundJob.findMany({
    where: {
      OR: [
        {
          status: "pending",
          availableAt: { lte: now },
        },
        {
          status: "processing",
          leaseUntil: { lt: now },
        },
      ],
    },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    take: limit * 4,
  })) as PersistedBackgroundJob[];

  const claimed: Array<PersistedBackgroundJob & { job: BackgroundJob }> = [];
  const workerId = getDatabaseWorkerId();

  for (const candidate of candidates) {
    if (claimed.length >= limit) {
      break;
    }

    if (candidate.attempts >= candidate.maxAttempts) {
      await prisma.backgroundJob.updateMany({
        where: {
          id: candidate.id,
          status: candidate.status,
          attempts: candidate.attempts,
          leaseUntil: candidate.leaseUntil,
        },
        data: {
          status: "dead_letter",
          completedAt: now,
          leaseUntil: null,
          processingStartedAt: null,
          lockedBy: null,
          lastError:
            candidate.lastError ||
            "The job reached its retry limit before it could finish.",
        },
      });
      continue;
    }

    const leaseUntil = new Date(now.getTime() + getJobLeaseMs(candidate.jobName));
    const claim = await prisma.backgroundJob.updateMany({
      where: {
        id: candidate.id,
        status: candidate.status,
        attempts: candidate.attempts,
        availableAt: candidate.availableAt,
        leaseUntil: candidate.leaseUntil,
      },
      data: {
        status: "processing",
        attempts: { increment: 1 },
        processingStartedAt: now,
        leaseUntil,
        lockedBy: workerId,
      },
    });

    if (claim.count !== 1) {
      continue;
    }

    try {
      claimed.push({
        ...candidate,
        attempts: candidate.attempts + 1,
        processingStartedAt: now,
        leaseUntil,
        lockedBy: workerId,
        job: parsePersistedJob(candidate.jobName, candidate.payload),
      });
    } catch (error) {
      const summary = summarizeError(error);
      await prisma.backgroundJob.update({
        where: { id: candidate.id },
        data: {
          status: "dead_letter",
          completedAt: now,
          leaseUntil: null,
          processingStartedAt: null,
          lockedBy: null,
          lastError: summary.raw || summary.human,
        },
      });
    }
  }

  return claimed;
}

async function acknowledgeDatabaseJob(jobId: string) {
  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: {
      status: "completed",
      completedAt: new Date(),
      leaseUntil: null,
      processingStartedAt: null,
      lockedBy: null,
      lastError: null,
    },
  });
}

async function retryOrDeadLetterDatabaseJob(
  record: PersistedBackgroundJob & { job: BackgroundJob },
  error: unknown
) {
  const summary = summarizeError(error);
  const isFinalAttempt = record.attempts >= record.maxAttempts;

  if (isFinalAttempt) {
    await handleFinalJobFailure(record.job).catch((cleanupError) => {
      console.error(`Final failure cleanup for ${record.job.name} failed:`, cleanupError);
    });

    await prisma.backgroundJob.update({
      where: { id: record.id },
      data: {
        status: "dead_letter",
        completedAt: new Date(),
        leaseUntil: null,
        processingStartedAt: null,
        lockedBy: null,
        lastError: summary.raw || summary.human,
      },
    });
    return;
  }

  const retryDelayMs = getRetryDelayMs(record.job.name, record.attempts);
  const nextAttemptAt = new Date(Date.now() + retryDelayMs);

  await prisma.backgroundJob.update({
    where: { id: record.id },
    data: {
      status: "pending",
      availableAt: nextAttemptAt,
      leaseUntil: null,
      processingStartedAt: null,
      lockedBy: null,
      lastError: summary.raw || summary.human,
    },
  });
}

async function getDatabaseQueueDepths(userId?: string) {
  const counts = await prisma.backgroundJob.groupBy({
    by: ["status"],
    where: userId ? { userId } : undefined,
    _count: { _all: true },
  });

  const lookup = counts.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.status] = item._count._all;
    return accumulator;
  }, {});

  return {
    pending: lookup.pending ?? 0,
    processing: lookup.processing ?? 0,
    completed: lookup.completed ?? 0,
    deadLetter: lookup.dead_letter ?? 0,
  };
}

async function getDatabaseRecentEvents(userId?: string) {
  const jobs = await prisma.backgroundJob.findMany({
    where: {
      ...(userId ? { userId } : {}),
      status: { in: ["completed", "dead_letter"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  return jobs.map<JobStatusEvent>((job) => ({
    id: job.id,
    userId: job.userId,
    jobName: job.jobName as BackgroundJob["name"],
    success: job.status === "completed",
    createdAt: job.updatedAt.toISOString(),
    reason:
      job.status === "completed"
        ? null
        : summarizeError(job.lastError || "The job moved to dead letter after repeated failures.").human,
    rawError: job.status === "completed" ? null : job.lastError,
    attempts: job.attempts,
  }));
}

async function drainDatabaseQueue(limit = 10) {
  const claimedJobs = await claimDatabaseJobs(limit);
  let processed = 0;

  for (const record of claimedJobs) {
    queuePending.count += 1;
    try {
      await executeBackgroundJob(record.job);
      await acknowledgeDatabaseJob(record.id);
      await handleJobSuccess(record.job, record.attempts);
    } catch (error) {
      console.error(`Background job ${record.job.name} failed:`, error);
      await retryOrDeadLetterDatabaseJob(record, error);
      await handleJobFailure(record.job, error, record.attempts);
    } finally {
      processed += 1;
      queuePending.count = Math.max(0, queuePending.count - 1);
    }
  }

  return processed;
}

async function scheduleLocalDatabaseDrain() {
  if (!isLocalFallbackEnabled() || getQueueProvider() !== "database") {
    return;
  }

  if (queueDrainState.scheduled || queueDrainState.draining) {
    return;
  }

  queueDrainState.scheduled = true;

  queueMicrotask(() => {
    if (queueDrainState.draining) {
      queueDrainState.scheduled = false;
      return;
    }

    queueDrainState.scheduled = false;
    queueDrainState.draining = true;

    void (async () => {
      try {
        while (true) {
          const processed = await drainDatabaseQueue(
            Number(process.env.JOB_DRAIN_BATCH_SIZE ?? "10")
          );
          if (processed === 0) {
            break;
          }
        }
      } catch (error) {
        console.error("Local database queue drain failed:", error);
      } finally {
        queueDrainState.draining = false;
      }
    })();
  });
}

const databaseQueueAdapter: QueueAdapter = {
  async enqueue(job) {
    await prisma.backgroundJob.create({
      data: {
        userId: getJobUserId(job),
        jobName: job.name,
        payload: serializeJobPayload(job),
        status: "pending",
        maxAttempts: getJobMaxAttempts(job.name),
        availableAt: new Date(),
      },
    });

    await scheduleLocalDatabaseDrain();
  },
  async drain(limit = 10) {
    return drainDatabaseQueue(limit);
  },
};

const memoryQueueAdapter: QueueAdapter = {
  async enqueue(job) {
    queuePending.count += 1;
    queueMicrotask(() => {
      void executeBackgroundJob(job)
        .then(() => handleJobSuccess(job, 1))
        .catch((error) => {
          console.error("Background job failed:", error);
          recordLegacyQueueEvent(job, { success: false, error, attempts: 1 });
        })
        .finally(() => {
          queuePending.count = Math.max(0, queuePending.count - 1);
        });
    });
  },
  async drain() {
    return 0;
  },
};

const redisQueueAdapter: QueueAdapter = {
  async enqueue(job) {
    const queueName = process.env.JOB_QUEUE_REDIS_KEY || "seo-command-center:jobs";
    const serializedJob = JSON.stringify(job);

    await callRedisPipeline([
      ["LPUSH", queueName, serializedJob],
      ["LTRIM", queueName, 0, 999],
      ["EXPIRE", queueName, 60 * 60 * 24],
    ]);

    if (isLocalFallbackEnabled()) {
      await memoryQueueAdapter.enqueue(job);
    }
  },
  async drain(limit = 10) {
    const queueName = process.env.JOB_QUEUE_REDIS_KEY || "seo-command-center:jobs";
    let processed = 0;

    for (let index = 0; index < limit; index += 1) {
      const result = await callRedisPipeline([["RPOP", queueName]]);
      const rawJob = result[0]?.result;
      if (typeof rawJob !== "string" || rawJob.length === 0) {
        break;
      }

      const job = JSON.parse(rawJob) as BackgroundJob;
      try {
        await executeBackgroundJob(job);
        await handleJobSuccess(job, 1);
      } catch (error) {
        console.error(`Legacy redis queue job ${job.name} failed:`, error);
        await handleFinalJobFailure(job).catch((cleanupError) => {
          console.error(`Failed legacy job cleanup for ${job.name}:`, cleanupError);
        });
        await handleJobFailure(job, error, 1);
      }
      processed += 1;
    }

    return processed;
  },
};

function getQueueAdapter(): QueueAdapter {
  switch (getQueueProvider()) {
    case "memory":
      return memoryQueueAdapter;
    case "redis":
      return redisQueueAdapter;
    case "database":
    default:
      return databaseQueueAdapter;
  }
}

export async function enqueueBackgroundJob(job: BackgroundJob) {
  await getQueueAdapter().enqueue(job);
}

export async function drainQueuedJobs(limit = 10) {
  return getQueueAdapter().drain(limit);
}

async function getRedisQueueDepth() {
  if (getQueueProvider() !== "redis") {
    return 0;
  }

  const queueName = process.env.JOB_QUEUE_REDIS_KEY || "seo-command-center:jobs";
  const result = await callRedisPipeline([["LLEN", queueName]]);
  return Number(result[0]?.result ?? 0);
}

export async function getJobQueueStatus(userId?: string) {
  const provider = getQueueProvider();

  if (provider === "database") {
    const depths = await getDatabaseQueueDepths(userId);
    const recentEvents = await getDatabaseRecentEvents(userId);

    return {
      provider,
      remoteOnly: !isLocalFallbackEnabled(),
      localPending: queuePending.count,
      remotePending: depths.pending + depths.processing,
      processing: depths.processing,
      deadLetter: depths.deadLetter,
      totalPending: depths.pending + depths.processing,
      recentEvents,
    };
  }

  const pendingRemote = await getRedisQueueDepth().catch(() => 0);

  return {
    provider,
    remoteOnly: process.env.JOB_QUEUE_REMOTE_ONLY === "true",
    localPending: queuePending.count,
    remotePending: pendingRemote,
    processing: 0,
    deadLetter: 0,
    totalPending: queuePending.count + pendingRemote,
    recentEvents: userId
      ? queueEvents.filter((event) => event.userId === userId)
      : queueEvents,
  };
}
