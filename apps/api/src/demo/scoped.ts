import type { Gateway } from "@scc/gateway";

import type { JobDeps } from "../jobs/handlers.ts";
import type { Enqueue } from "../jobs/queue.ts";
import type { Storage } from "../storage.ts";

// The demo's view of shared services (ADR-0033): storage keys live under
// demo/ and jobs carry workspace "demo", so the code that uses them is the
// same code real calls use.

/** The bucket folder that holds every demo object; the main purge leaves it alone. */
export const DEMO_FOLDER = "demo";

/** demoStorage maps every key under demo/; a demo caller cannot name an object outside it. */
export function demoStorage(inner: Storage): Storage {
  const key = (path: string) => `${DEMO_FOLDER}/${path}`;
  return {
    signUpload: (path) => inner.signUpload(key(path)),
    signDownload: (path, seconds, downloadAs) => inner.signDownload(key(path), seconds, downloadAs),
    exists: (path) => inner.exists(key(path)),
    download: (path) => inner.download(key(path)),
    remove: (paths) => inner.remove(paths.map(key)),
    list: (prefix) => inner.list(prefix ? key(prefix) : DEMO_FOLDER),
    ensureBucket: () => inner.ensureBucket(),
  };
}

/** demoEnqueue tags every job for the demo schema, follow-ups included. */
export function demoEnqueue(inner: Enqueue): Enqueue {
  return (queue, data, options) => inner(queue, { ...data, workspace: "demo" }, options);
}

/**
 * demoJobDeps is the pipeline's dependencies on the demo schema: the demo
 * pool, storage under demo/, follow-up jobs tagged for the demo, and a
 * gateway whose ledger (and month budget) is the demo's own.
 */
export function demoJobDeps(base: JobDeps, demoPool: JobDeps["pool"], gateway: Gateway): JobDeps {
  return {
    pool: demoPool,
    storage: demoStorage(base.storage),
    gateway,
    enqueue: demoEnqueue(base.enqueue),
    log: base.log,
  };
}
