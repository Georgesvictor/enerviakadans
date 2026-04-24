import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

/**
 * BullMQ setup voor async jobs (PDF generatie, VEKA verificatie,
 * email notificaties).
 *
 * Gebruik Upstash Redis in productie: REDIS_URL=redis://...
 *
 * Worker-processen moeten apart draaien — zie `scripts/worker.ts`
 * of deploy als aparte Vercel Background Function.
 */

const connectionUrl = process.env.REDIS_URL;

export const connection = connectionUrl
  ? new IORedis(connectionUrl, { maxRetriesPerRequest: null })
  : null;

export const QUEUES = {
  pdf: "pdf-generation",
  veka: "veka-verification",
} as const;

export const pdfQueue = connection
  ? new Queue(QUEUES.pdf, { connection })
  : null;
export const vekaQueue = connection
  ? new Queue(QUEUES.veka, { connection })
  : null;

export async function enqueueVEKAVerificatie(dossierId: string) {
  if (!vekaQueue) return; // geen Redis → skip
  await vekaQueue.add(
    "verify",
    { dossierId },
    { attempts: 3, backoff: { type: "exponential", delay: 5_000 } },
  );
}
