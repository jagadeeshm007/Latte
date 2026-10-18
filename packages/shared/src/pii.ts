// Personal data in transcripts (ADR-0023): find it, and mask it. Speech-to-
// text writes numbers as digits, so the detectors work on digit runs (with
// the spaces and dashes people say between groups) and a few fixed shapes.
// Each match keeps a hint people can check against (the last four digits),
// never the whole value. Numbers spelled out in words are not caught.

export const PII_KINDS = ["card", "aadhaar", "phone", "account", "pan", "ifsc", "email"] as const;
export type PiiKind = (typeof PII_KINDS)[number];

export interface PiiSpan {
  start: number;
  end: number;
  kind: PiiKind;
  /** What replaces the match, e.g. "[card ••••1111]". */
  mask: string;
}

const LABEL: Record<PiiKind, string> = {
  card: "card",
  aadhaar: "Aadhaar",
  phone: "phone",
  account: "account",
  pan: "PAN",
  ifsc: "IFSC",
  email: "email",
};

/** luhn: the check digit card numbers carry. */
export function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/** verhoeff: the check digit Aadhaar numbers carry. */
export function verhoeff(digits: string): boolean {
  let c = 0;
  const reversed = digits.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = VERHOEFF_D[c]?.[VERHOEFF_P[i % 8]?.[Number(reversed[i])] ?? 0] ?? 0;
  }
  return c === 0;
}

/** What a run of digits most likely is, or null when it is nothing personal (an amount, a date). */
function classifyDigits(digits: string): PiiKind | null {
  if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) return "card";
  if (digits.length === 12 && /^[2-9]/.test(digits) && verhoeff(digits)) return "aadhaar";
  if (digits.length === 10 && /^[6-9]/.test(digits)) return "phone";
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2)))
    return "phone";
  if (digits.length >= 9 && digits.length <= 18) return "account";
  return null;
}

const DIGIT_RUN = /\+?\d(?:[ -]?\d){8,22}/g;
const SHAPES: [PiiKind, RegExp][] = [
  ["email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ["pan", /\b[A-Za-z]{5}\d{4}[A-Za-z]\b/g],
  ["ifsc", /\b[A-Za-z]{4}0[A-Za-z0-9]{6}\b/g],
];

/** findPii: the personal data in a text, in order, never overlapping. */
export function findPii(text: string): PiiSpan[] {
  const spans: PiiSpan[] = [];
  for (const [kind, pattern] of SHAPES) {
    for (const m of text.matchAll(pattern)) {
      spans.push({ start: m.index, end: m.index + m[0].length, kind, mask: `[${LABEL[kind]}]` });
    }
  }
  for (const m of text.matchAll(DIGIT_RUN)) {
    const digits = m[0].replace(/\D/g, "");
    const kind = classifyDigits(digits);
    if (!kind) continue;
    spans.push({
      start: m.index,
      end: m.index + m[0].length,
      kind,
      mask: `[${LABEL[kind]} ••••${digits.slice(-4)}]`,
    });
  }
  // The first match wins where two overlap (an email holding digits, say).
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: PiiSpan[] = [];
  for (const s of spans) {
    const last = kept.at(-1);
    if (!last || s.start >= last.end) kept.push(s);
  }
  return kept;
}

/** redactText replaces each piece of personal data with its mask. */
export function redactText(text: string, spans = findPii(text)): string {
  let out = "";
  let at = 0;
  for (const s of spans) {
    out += text.slice(at, s.start) + s.mask;
    at = s.end;
  }
  return out + text.slice(at);
}

/**
 * redactWords masks the words of a line the same way as its text: words are
 * joined with spaces, and each word touching a match is replaced (the first
 * with the mask, the rest with a dot), so read-along timing still lines up.
 */
export function redactWords<W extends { text: string }>(words: W[]): { words: W[]; count: number } {
  const joined = words.map((w) => w.text).join(" ");
  const spans = findPii(joined);
  if (spans.length === 0) return { words, count: 0 };
  let offset = 0;
  const used = new Set<PiiSpan>();
  const out = words.map((w) => {
    const start = offset;
    const end = offset + w.text.length;
    offset = end + 1;
    const hit = spans.find((s) => s.start < end && s.end > start);
    if (!hit) return w;
    const first = !used.has(hit);
    used.add(hit);
    return { ...w, text: first ? hit.mask : "•" };
  });
  return { words: out, count: spans.length };
}
