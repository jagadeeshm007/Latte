# ADR-0006: Use Groq gpt-oss-120b with strict JSON schema as the rubric judge

- Status: Accepted
- Date: 2026-10-14
- Task: SCC-1
- Deciders: the requester (product owner), engineering
- Area: llm
- Reversibility: cheap: model and provider are configuration

## Context

One model call per call scores the transcript (REQ-009), max_tokens is capped at 1000 (REQ-024), and the judge must return parseable findings every time. Groq lists strict structured outputs only for gpt-oss-20b, gpt-oss-120b and qwen3.8-27b; prices per 1M tokens: 120b $0.15 in / $0.60 out, 20b $0.075 / $0.30, qwen $0.80 / $4.00.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| openai/gpt-oss-120b, strict json_schema, reasoning_effort low (chosen) | reasoning tokens count toward the 1000-token cap, so effort must stay low | structured judging at low cost |
| openai/gpt-oss-20b | weaker on nuanced misrepresentation; kept as fallback | high volume where the eval still passes |
| qwen/qwen3.8-27b with reasoning none | about 5x the price | if gpt-oss fails the eval |
| llama-3.3-70b-versatile | no strict mode; listed Enterprise, contact sales | no |

## Decision

We will call openai/gpt-oss-120b through the gateway with a strict json_schema response format, reasoning_effort low, temperature 0, static instructions first and the transcript last, because strict mode removes parse failures and the price keeps a 5-minute call under a cent.

## Consequences

Prompt caching on the static prefix cuts input cost by half on hits. The eval gate decides any model change. Revisit when the eval fails or Groq changes model availability.

## Commits us to

Groq openai/gpt-oss-120b (fallback openai/gpt-oss-20b)
