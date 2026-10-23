// Upload a folder of recordings as one batch, wait for every call to be
// scored, and save the results CSV.
//
//   LATTE_URL=https://your-latte-domain LATTE_API_KEY=latte_... \
//   pnpm --filter @scc/examples upload-and-wait ./calls \
//     --agent <id> --team <id> --product <id> --date 2026-10-22 --out results.csv
//
// Recordings must be stereo WAV or MP3, agent on the left channel. Scopes:
// calls:write, batches:read, exports:read.
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";

import type { BatchDetail, LatteClient, UploadFile } from "@latte/sdk";

import { latteFromEnv } from "./client.ts";

export interface CallDetails {
  agentId: string;
  teamId: string;
  productId: string;
  /** YYYY-MM-DD */
  callDate: string;
}

export interface FolderResult {
  batch: BatchDetail;
  /** Files that could not be uploaded, with why; the rest carried on. */
  failed: { filename: string; error: string }[];
  csv: string;
}

/** uploadFolder sends every .wav and .mp3 in folder as one batch, waits for it, and returns its results CSV. */
export async function uploadFolder(
  latte: LatteClient,
  folder: string,
  details: CallDetails,
  opts: { name?: string; onProgress?: (done: number, total: number) => void; pollMs?: number } = {},
): Promise<FolderResult> {
  const names = (await readdir(folder)).filter((n) => /\.(wav|mp3)$/i.test(n)).sort();
  if (names.length === 0) throw new Error(`no .wav or .mp3 files in ${folder}`);
  const files: UploadFile[] = await Promise.all(
    names.map(async (filename) => ({
      filename,
      data: new Uint8Array(await readFile(path.join(folder, filename))),
      ...details,
    })),
  );
  const upload = await latte.batches.create(files, {
    name: opts.name ?? path.basename(path.resolve(folder)),
    ...(opts.onProgress ? { onProgress: opts.onProgress } : {}),
  });
  if (!upload.batchId) {
    throw new Error(`no file could be uploaded: ${upload.failed.map((f) => f.error).join("; ")}`);
  }
  const batch = await latte.batches.wait(
    upload.batchId,
    opts.pollMs === undefined ? {} : { intervalMs: opts.pollMs },
  );
  const csv = await latte.batches.resultsCsv(batch.id);
  return { batch, failed: upload.failed, csv };
}

/** main: the command line; args without the node and script names. */
export async function main(args: string[], latte: () => LatteClient = latteFromEnv): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      agent: { type: "string" },
      team: { type: "string" },
      product: { type: "string" },
      date: { type: "string" },
      name: { type: "string" },
      out: { type: "string", default: "results.csv" },
    },
  });
  const [folder] = positionals;
  if (!folder || !values.agent || !values.team || !values.product || !values.date) {
    throw new Error(
      "usage: upload-and-wait <folder> --agent <id> --team <id> --product <id> --date YYYY-MM-DD",
    );
  }
  const result = await uploadFolder(
    latte(),
    folder,
    {
      agentId: values.agent,
      teamId: values.team,
      productId: values.product,
      callDate: values.date,
    },
    {
      ...(values.name ? { name: values.name } : {}),
      onProgress: (done, total) => {
        process.stdout.write(`uploaded ${String(done)}/${String(total)}\n`);
      },
    },
  );
  for (const f of result.failed) process.stderr.write(`not uploaded: ${f.filename}: ${f.error}\n`);
  await writeFile(values.out, result.csv);
  const { batch } = result;
  process.stdout.write(
    `${batch.name}: ${String(batch.scored)} scored, ${String(batch.flagged)} flagged, ${String(batch.failed)} failed; results in ${values.out}\n`,
  );
}

if (import.meta.main) await main(process.argv.slice(2));
