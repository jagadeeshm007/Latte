// Turn a dialler or CRM export into scored calls, without audio.
//
//   LATTE_URL=... LATTE_API_KEY=latte_... \
//   pnpm --filter @scc/examples transcript-import export.json --name "Dialler, 22 Oct"
//
// export.json is a list of calls as your system exports them; the field names
// below are an example, so map yours in toTranscripts. The transcript is
// labelled text, one turn per line: "Agent: ..." / "Customer: ...", with an
// optional time such as "[00:41]". Scope: calls:write.
import { readFile } from "node:fs/promises";
import process from "node:process";
import { parseArgs } from "node:util";

import type { BatchUploadResult, LatteClient, TranscriptInput } from "@latte/sdk";

import { latteFromEnv } from "./client.ts";

/** One call as the example export has it. */
export interface ExportedCall {
  id: string;
  agentId: string;
  teamId: string;
  productId: string;
  /** YYYY-MM-DD */
  date: string;
  /** en-IN unless given; hi-IN, ta-IN and the other Indian languages are translated before scoring. */
  language?: TranscriptInput["language"];
  transcript: string;
}

const REQUIRED = ["id", "agentId", "teamId", "productId", "date", "transcript"] as const;

/** The required fields a row lacks or leaves empty. */
function missingFields(row: unknown): string[] {
  if (typeof row !== "object" || row === null) return [...REQUIRED];
  const fields = row as Record<string, unknown>;
  return REQUIRED.filter((key) => typeof fields[key] !== "string" || fields[key] === "");
}

function isExportedCall(row: unknown): row is ExportedCall {
  return missingFields(row).length === 0;
}

/** toTranscripts checks each exported call and maps it to what the SDK sends; it names the first bad row. */
export function toTranscripts(rows: unknown): TranscriptInput[] {
  if (!Array.isArray(rows)) throw new Error("the export must be a JSON list of calls");
  return rows.map((row: unknown, i) => {
    if (!isExportedCall(row)) {
      throw new Error(`call ${String(i + 1)} has no ${missingFields(row).join(", ")}`);
    }
    return {
      originalFilename: `${row.id}.txt`,
      agentId: row.agentId,
      teamId: row.teamId,
      productId: row.productId,
      callDate: row.date,
      ...(row.language ? { language: row.language } : {}),
      text: row.transcript,
    };
  });
}

/** importExport sends every call as one batch, in chunks of up to 50. */
export function importExport(
  latte: LatteClient,
  rows: unknown,
  name: string,
): Promise<BatchUploadResult> {
  return latte.batches.createFromTranscripts(toTranscripts(rows), { name });
}

/** main: the command line; args without the node and script names. */
export async function main(args: string[], latte: () => LatteClient = latteFromEnv): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { name: { type: "string", default: "Transcript import" } },
  });
  const [file] = positionals;
  if (!file) throw new Error("usage: transcript-import <export.json> [--name <batch name>]");
  const rows: unknown = JSON.parse(await readFile(file, "utf8"));
  const result = await importExport(latte(), rows, values.name);
  for (const f of result.failed) process.stderr.write(`not imported: ${f.filename}: ${f.error}\n`);
  process.stdout.write(
    `batch ${String(result.batchId)}: ${String(result.callIds.length)} calls queued for scoring\n`,
  );
}

if (import.meta.main) await main(process.argv.slice(2));
