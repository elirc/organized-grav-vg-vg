import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const queues = new Map();
let connection = null;

function getConnection() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  return connection;
}

function getQueue(name) {
  const existing = queues.get(name);
  if (existing) {
    return existing;
  }

  const redis = getConnection();
  if (!redis) {
    return null;
  }

  const queue = new Queue(name, { connection: redis });
  queues.set(name, queue);
  return queue;
}

export async function enqueue(name, payload, options = {}) {
  const queue = getQueue(name);
  if (!queue) {
    return {
      queued: false,
      mode: "inline",
      name,
      payload,
    };
  }

  const job = await queue.add(name, payload, options);
  return {
    queued: true,
    mode: "redis",
    jobId: job.id,
  };
}

export function createWorker(name, processor) {
  const redis = getConnection();
  if (!redis) {
    return null;
  }

  return new Worker(name, processor, { connection: redis });
}
