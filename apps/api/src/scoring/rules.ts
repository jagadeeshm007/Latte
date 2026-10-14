import type { ScoringSegment } from "./types.ts";

// The rule net: phrase patterns for prohibited statements in English,
// romanised Hinglish and Devanagari, run on agent lines before and apart from
// the judge. It can only add risk (tenet 3): a hit becomes a rule finding and
// sends the call to QA; it never clears a judge finding. False alarms cost a
// reviewer a minute; a missed "guaranteed returns" claim costs far more.

interface Pattern {
  re: RegExp;
  /** Skip the hit when a negation sits just before it ("not guaranteed returns"). */
  negatable?: boolean;
}

const NEGATION =
  /\b(no|not|never|nahi|nahin|na|without|koi bhi nahi)\b[^.!?]{0,20}$|(नहीं|ना)\s*\S*\s*$/i;

export const RULES: Record<string, Pattern[]> = {
  guaranteed_returns: [
    {
      re: /\bguarantee(?:d)?\s+(?:\d+\s*(?:%|percent|per cent)\s+)?(?:return|returns|income|profit|growth|interest|bonus)\b/i,
      negatable: true,
    },
    {
      re: /\b(?:return|returns|profit|income)\s+(?:is|are|will be)\s+(?:fully\s+)?guaranteed\b/i,
      negatable: true,
    },
    {
      re: /\b(?:assured|fixed|sure[- ]?shot|confirmed)\s+(?:return|returns|profit|income)\b/i,
      negatable: true,
    },
    { re: /\b(?:no|zero)\s+risk\s+(?:at\s+all|hai|whatsoever)\b/i },
    { re: /\brisk[- ]free\b/i, negatable: true },
    { re: /\b100\s*(?:%|percent|per cent)\s+(?:safe|guaranteed|sure|secure)\b/i, negatable: true },
    { re: /\bpakk[ae]\s+(?:return|returns|munafa|profit|paisa)\b/i },
    { re: /\b(?:return|returns|munafa)\s+(?:pakka|fix|guaranteed)\s+(?:hai|milega|milenge)\b/i },
    { re: /\bpaisa\s+(?:double|dugna)\b/i },
    { re: /गारंटी|पक्का\s+(?:रिटर्न|मुनाफा)/ },
  ],
  false_urgency: [
    {
      re: /\b(?:offer|scheme|discount|rate|deal)s?\s+(?:only\s+)?(?:ends?|expires?|closes?|khatam)\s+(?:today|tonight|aaj)\b/i,
    },
    {
      re: /\b(?:only|sirf)\s+(?:\w+\s+)?(?:\d+|two|three|four|five|do|teen)\s+(?:policies|policy|slots|seats|units)\s+(?:are\s+)?(?:left|bache|remaining)\b/i,
    },
    { re: /\blast\s+(?:day|chance)\b/i, negatable: true },
    { re: /\baaj\s+hi\s+(?:lena|le\s+lijiye|lo|kariye|karna|khatam|sign)\b/i },
    {
      re: /\b(?:price|premium|rate)s?\s+(?:will\s+)?(?:go(?:es)?\s+up|increase|badh\w*)\s+(?:from\s+)?(?:tomorrow|kal)\b/i,
    },
    { re: /\b(?:decide|sign|pay)\s+(?:right\s+)?now\s+or\b/i },
    { re: /अभी\s+नहीं\s+तो\s+कभी\s+नहीं|आज\s+ही\s+(?:खत्म|आखिरी)/ },
  ],
  misrepresentation: [
    {
      re: /\b(?:just|exactly|same)\s+(?:like|as)\s+(?:a|an|your)?\s*(?:fixed deposit|fd|savings account|bank deposit|recurring deposit)\b/i,
    },
    {
      re: /\b(?:it|this|yeh)\s+(?:is|hai)\s+(?:a|an|ek)?\s*(?:fixed deposit|fd|savings account|bank account)\b/i,
      negatable: true,
    },
    {
      re: /\b(?:government|sarkari|govt\.?)\s+(?:backed|guaranteed|guarantee)\b/i,
      negatable: true,
    },
    { re: /\bno\s+(?:lock[- ]?in|surrender\s+charges?|hidden\s+charges?|charges\s+at\s+all)\b/i },
    {
      re: /\b(?:withdraw|nikal)\w*\s+(?:anytime|kabhi\s+bhi)\s+(?:without|bina)\s+(?:any\s+)?(?:charge|penalty|loss)/i,
    },
  ],
};

export interface RuleHit {
  itemKey: string;
  seq: number;
  match: string;
}

/** findRuleHits returns at most one hit per item per agent line. */
export function findRuleHits(
  segments: ScoringSegment[],
  rules: Record<string, Pattern[]> = RULES,
): RuleHit[] {
  const hits: RuleHit[] = [];
  for (const segment of segments) {
    if (segment.channel !== "agent") {
      continue;
    }
    for (const [itemKey, patterns] of Object.entries(rules)) {
      for (const { re, negatable } of patterns) {
        const m = re.exec(segment.text);
        if (!m) {
          continue;
        }
        if (negatable && NEGATION.test(segment.text.slice(0, m.index))) {
          continue;
        }
        hits.push({ itemKey, seq: segment.seq, match: m[0] });
        break;
      }
    }
  }
  return hits;
}
