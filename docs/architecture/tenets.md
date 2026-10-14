# System design tenets: SalesCall

Rules this team holds itself to on this project. Each is here because
somebody could plausibly do the opposite, and a reviewer can point at a
breach.

## 1. Every model call goes through the gateway

**No file outside apps/api/src/gateway imports a model SDK, builds a provider URL or calls fetch on a model endpoint; a lint rule enforces it.**

Budget, max_tokens cap, cost logging and replay only hold if nothing bypasses them (REQ-022, ADR-0006).

_A breach looks like:_ an MR that adds `fetch("https://api.groq.com/...")` in the eval renderer "just for seed audio".

## 2. Timestamps come from segments, never from the model

**A finding's start and end time is copied from the transcript segment it cites; the model's own time strings are never stored.**

Evidence must play the right moment (REQ-015); models invent times.

_A breach looks like:_ an MR that parses `"t": "02:31"` from the judge output into findings.start_ms.

## 3. The rule net can only add risk, never remove it

**Rule-based prohibited-phrase hits are added as findings and can route a call to QA; no code path lets a rule clear or downgrade a model finding.**

False negatives on prohibited statements are the metric that matters (PRD B4); the net is a floor, not a filter.

_A breach looks like:_ an MR that drops a model "guaranteed returns" finding because no regex matched it.

## 4. Ownership is a SQL predicate

**Every agent-scoped query carries `agent_id = <caller's agent>` in the WHERE clause; a call an agent does not own answers 404, not 403.**

Agents must not see each other's calls or recordings (US-00-001, US-02-003).

_A breach looks like:_ an MR that fetches a call by id and then compares call.agentId in TypeScript.

## 5. Tests and CI never call a model

**The gateway runs in replay mode in tests and CI; a test that needs a new response records it once with `make eval-record` and commits the cassette.**

REQ-027; CI must be free and deterministic.

_A breach looks like:_ an MR whose test reads GROQ_API_KEY or sets MODEL_MODE=live.

## 6. Payloads carry ids, workers re-read rows

**Job payloads contain only ids; the worker loads the call, rubric and status at run time and exits early if the call is no longer in the expected state.**

Queued payloads go stale; a rubric edit or a manual retry must not be undone by an old job.

_A breach looks like:_ an MR that puts the transcript or rubric JSON in the score job payload.

## 7. No secret reaches the browser

**The web build reads only VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY; any other VITE_ variable or server key in apps/web fails review.**

The secret key and Groq key would give full data access and spend (ADR-0003).

_A breach looks like:_ an MR adding VITE_GROQ_API_KEY to call Whisper from the browser.
