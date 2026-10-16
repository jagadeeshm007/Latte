// Regional transcript lines to English for the judge (ADR-0014). Lines go in
// numbered batches under Sarvam Translate's 2,000-character limit, so a long
// call is a handful of requests rather than one per line. The numbers come
// back with the translation; when they do not, that batch is retried line by
// line, so a translation always lines up with its original line.

/** Translates one piece of text to English; the job passes a gateway-backed function. */
export type TranslateText = (text: string) => Promise<string>;

/** Room under Sarvam Translate's 2,000 characters for the line numbers and newlines. */
export const TRANSLATE_BATCH_CHARS = 1800;

const NUMBERED = /^\s*\[(\d+)\]\s*(.*)$/;

function batches(lines: string[]): number[][] {
  const out: number[][] = [];
  let current: number[] = [];
  let size = 0;
  for (const [i, line] of lines.entries()) {
    const cost = line.length + 8;
    if (current.length > 0 && size + cost > TRANSLATE_BATCH_CHARS) {
      out.push(current);
      current = [];
      size = 0;
    }
    current.push(i);
    size += cost;
  }
  if (current.length > 0) out.push(current);
  return out;
}

/** parseNumbered reads "[n] text" lines back; null unless every number 1..count is there once. */
function parseNumbered(text: string, count: number): string[] | null {
  const found = new Map<number, string>();
  for (const line of text.split("\n")) {
    const m = NUMBERED.exec(line);
    if (!m) continue;
    const n = Number(m[1]);
    if (found.has(n)) return null;
    found.set(n, (m[2] ?? "").trim());
  }
  if (found.size !== count) return null;
  const out: string[] = [];
  for (let n = 1; n <= count; n++) {
    const t = found.get(n);
    if (t === undefined) return null;
    out.push(t);
  }
  return out;
}

/** translateLines returns one English translation per line, in order. */
export async function translateLines(lines: string[], translate: TranslateText): Promise<string[]> {
  const out: string[] = new Array<string>(lines.length).fill("");
  for (const batch of batches(lines)) {
    const numbered = batch.map((i, k) => `[${String(k + 1)}] ${lines[i] ?? ""}`).join("\n");
    const parsed = parseNumbered(await translate(numbered), batch.length);
    if (parsed) {
      for (const [k, i] of batch.entries()) out[i] = parsed[k] ?? "";
      continue;
    }
    for (const i of batch) {
      out[i] = (await translate(lines[i] ?? "")).trim();
    }
  }
  return out;
}
