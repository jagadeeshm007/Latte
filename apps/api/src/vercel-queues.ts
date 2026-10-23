import { waitUntil } from "@vercel/functions";
import { QueueClient } from "@vercel/queue";

import { nodeFunctionHandler, vercelPushConsumer } from "./jobs/adapters/vercel.ts";
import { PIPELINE_QUEUES, runPipelineJob } from "./jobs/drain.ts";
import type { JobDeps } from "./jobs/handlers.ts";
import { QUEUES } from "./jobs/queue.ts";
import { openServerless } from "./serverless.ts";
import { deliverDue } from "./webhooks/sender.ts";

// The Vercel Queues consumer function (ADR-0032), built unless JOB_QUEUE=pgboss
// (scripts/vercel-build.js). Its triggers subscribe it to the transcribe and
// score topics; Vercel calls it once per message, at most each trigger's
// maxConcurrency at a time, and redelivers a message whose handler throws.

const { log, pool, storage, queue, gateway, webhookDeps } = await openServerless();
const jobDeps: JobDeps = { pool, storage, gateway, enqueue: queue, log };

const callback = vercelPushConsumer(
  new QueueClient(),
  PIPELINE_QUEUES,
  async (topic, delivery) => {
    await runPipelineJob(jobDeps, topic, delivery);
    // A scored call queues its webhooks; send them now rather than at the next minute's cron.
    if (topic === QUEUES.score) {
      waitUntil(
        deliverDue(webhookDeps).catch((error: unknown) => {
          log.error({ err: error }, "webhook delivery after scoring failed");
        }),
      );
    }
  },
  log,
);

export default nodeFunctionHandler(callback);
