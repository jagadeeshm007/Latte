# High Level Design: <system or feature>

<!-- Template guidance: every section below carries a comment saying what goes
     there (What), what a strong entry has (Good) and a one-line example
     (Example). Delete each comment when you fill its section. An HLD says
     what a system delivers, what it deliberately does not and where it
     breaks, for reviewers and for whoever writes the LLDs; it stops at the
     component boundary (no module layout, queries or class names). Every
     claim about the existing system comes from the code; anything else is
     prefixed "assumption:". Agree section 1 before writing section 2; the
     summary and the component table sit at the top but are written last.
     Every major section ends with a "**Risks this leaves open**" line and
     at least one bullet: a section with no risks has not been examined. -->

- Task: TASK-ID
- Author, date
- Status: Draft | Reviewed | Approved
- PRD: link
- ADRs: docs/architecture/decisions.md
- Tenets: docs/architecture/tenets.md

## Summary

<!-- What: two sentences a client can read alone: the shape of the system
     and the one or two choices that define it; then the system diagram
     path.
     Good: names the actual runtime, store and boundary, and what was
     deliberately left out; the diagram line is
     "Diagram: docs/architecture/diagrams/<Project>_SystemArchitecture_v<N>.svg",
     drawn by architecture-diagram from docs/architecture/architecture.json,
     with <N> the HLD version.
     Example: "One Go service on managed containers, backed by one Postgres,
     serves the web and mobile clients over one REST API; no broker and no
     second store. Invoices are reported by SQL over the domain tables, with
     no ETL in the first release." -->

## What gets built

<!-- What: one row per deployable component, in the columns
     Component | Kind | Stack | Responsibility | Repository.
     Good: Kind is frontend, backend, worker, infrastructure or data; Stack
     names the actual framework and libraries; Repository is the repo-plan
     name that builds it, "existing: <repo>" or "none (<reason>)".
     Example: "| Orders Api | backend | Go, net/http, pgx, goose | orders,
     invoices and the outbox worker; owns the one database | ShopOrdersApi |" -->

| Component | Kind | Stack | Responsibility | Repository |
| --- | --- | --- | --- | --- |

## 1. Goal and non-goals

<!-- What: what this delivers in three sentences, then a list of what it
     deliberately does not do. List the ids it serves (REQ-nnn, US-nn-nnn,
     ADR-nnnn); a pasted brief with no ids reads "Serves: unnumbered".
     Good: the user agreed this section before anything else was written;
     each non-goal is something a reader might reasonably expect.
     Example: "Non-goal: refunds; partial refunds stay manual in the admin
     console until US-07-002." -->

## 2. Users and flows

<!-- What: the actors and the two or three flows that matter, as numbered
     steps per actor.
     Good: two or three flows, not every screen; each step names the
     component it touches, and the story id it serves where there is one.
     Example: "3. Store admin uploads the price list CSV; the importer
     rejects the whole file on the first row with a bad SKU (US-02-004)." -->

## 3. Architecture

<!-- What: one mermaid diagram, then one paragraph per component:
     responsibility, owner, what it talks to and how; then the risks.
     Good: every component named was found in the code or is prefixed
     "assumption:"; a store, queue or auth choice points at its ADR or reads
     "ADR needed: <title>", never decided here; each risk names a failure
     the boundaries allow, not a generic worry.
     Example: "billing-worker (payments team): consumes invoice.issued from
     the jobs queue, calls the payment provider over HTTPS, writes payments.
     Risk: one process hosts the admin and the customer routes, so a panic in
     reporting takes down checkout." -->

**Risks this leaves open**

- <what can go wrong that this design does not fully solve>

## 4. Data

<!-- What: the entities, who owns each, the store, retention and the
     migrations the design implies; then the risks.
     Good: the store comes from an ADR or reads "ADR needed"; PII entities
     say so; the full model is left to data-model and linked.
     Example: "order: owned by checkout, Postgres (ADR-0004), kept 7 years;
     one new table, see docs/design/data-model.md." -->

**Risks this leaves open**

- <what can go wrong that this design does not fully solve>

## 5. Interfaces

<!-- What: every API, event and message this introduces or changes, with
     the location of its contract.
     Good: each entry names the contract path (an api/openapi.yaml path, a
     schema file, an event sheet) and says new or changed; the shapes live
     in the contract, not repeated here.
     Example: "POST /v1/orders (new), api/openapi.yaml; event order.placed
     v1 (new), docs/events/order.md." -->

## 6. External integrations

<!-- What: every third party on the runtime path, one paragraph or
     subsection each: what it is used for, what happens when it is down,
     slow or rate limited, and when its credential leaks; then what was
     deliberately not integrated; then the risks.
     Good: each failure says what the user sees and how it recovers; the
     credential names where it lives and who rotates it; a provider with no
     fallback says so plainly.
     Example: "Payment provider down: checkout returns the standard 503
     envelope and the cart is kept; webhooks are replayed from the
     provider's dashboard; key in the vault, rotated by the platform lead." -->

### Deliberately not integrated

<!-- What: the services a reader might expect and will not find, each with
     the reason.
     Good: every entry is something someone would plausibly add (an
     analytics SDK, a managed identity provider, a CRM); the reason names
     the ADR, the cost or the privacy rule that kept it out.
     Example: "- No crash-reporting SDK: it would capture screen state on the
     invoice view, which holds customer data (ADR-0003)." -->

- <service>: <why it was kept out>

**Risks this leaves open**

- <what can go wrong that this design does not fully solve>

## 7. Failure modes

<!-- What: one row per component: what fails, how it is noticed, what the
     user sees, how it recovers.
     Good: no blank cells; a cell nobody can fill is written UNDEFINED so
     the gap is visible and counted.
     Example: "| billing-worker | provider 5xx | payment_failures_total
     alert | 'Payment pending' banner | retry with backoff, 6 tries |" -->

## 8. Scaling and limits

<!-- What: expected load, the first bottleneck, and the number at which the
     design stops working; then the risks.
     Good: numbers with units and where they came from; "scales
     horizontally" is not a number and leaves the section unfinished.
     Example: "Peak 120 orders/min (last sale, Grafana); first limit is the
     stock row lock near 900/min; past that, shard by warehouse." -->

**Risks this leaves open**

- <what can go wrong that this design does not fully solve>

## 9. Security and privacy

<!-- What: the auth model, authorisation per resource, the PII touched and
     the secrets needed; then the risks.
     Good: authorisation says who may do what to which resource, not just
     "authenticated"; the auth model points at its ADR or "ADR needed".
     Example: "Orders: a customer reads only their own; store staff read
     their store's; secret PAYMENT_KEY_SECRET from the vault." -->

**Risks this leaves open**

- <what can go wrong that this design does not fully solve>

## 10. Observability

<!-- What: the logs, metrics, traces and alerts, each alert with its
     runbook name; then the risks.
     Good: named metrics and alerts with thresholds, not "we will add
     monitoring"; an alert without a runbook name is not finished.
     Example: "Alert OrderErrorRateHigh (5xx over 2% for 5 min), runbook
     docs/runbooks/order-errors.md." -->

**Risks this leaves open**

- <what can go wrong that this design does not fully solve>

## 11. Analytics

<!-- What: where product events come from, where they are stored, which
     business question each answers, and the reporting path; then the
     risks.
     Good: a table of question to source; product events kept apart from
     the audit trail; a count that is a lower bound says so; the store
     points at its ADR ("analytics store" key) or reads "ADR needed".
     Example: "| Do customers abandon checkout? | checkout_started events
     against orders rows; a lower bound, lost on network failure |" -->

**Risks this leaves open**

- <what can go wrong that this design does not fully solve>

## 12. Rollout and rollback

<!-- What: the flags, the phases, the migration order and how to back out
     at each phase; then the risks.
     Good: a way back is written for every phase, not only the last; the
     migration order is explicit when schema and code ship separately;
     work in flight at a cutover (jobs already queued in the old path,
     rows mid-state) has a stated fate in both directions.
     Example: "Phase 2: flag orders_v2 on for 3 pilot stores; back out by
     turning the flag off; new rows stay and v1 ignores them." -->

**Risks this leaves open**

- <what can go wrong that this design does not fully solve>

## 13. Outside the standard stack

<!-- What: every technology in this design that is not a default in the
     tech-decision catalogue, each with the ADR that chose it and the sign-off
     it needs from the Architect or the Engineering Manager.
     Good: one line per technology, deduplicated across ADRs, with the
     reviewer and the state of the sign-off; when there is none, write
     "None: every technology is a catalogue default".
     Example: "- Caddy (compute, ADR-0007): Architect sign-off pending." -->

## 14. Repository plan

<!-- What: the repositories that build the components above, mirrored from
     docs/architecture/repo-plan.json, as Repository | Path | Stack id |
     Responsibility | Apps.
     Good: names are <Project><Component> PascalCase; paths sit under the
     Client, Server or Infrastructure subgroup; the stack id is one the kit
     scaffolds, so new-repo can create each entry as written.
     Example: "| ShopOrdersApi | Shop/Server/ShopOrdersApi | go-api | the one
     backend service | none |" -->

## 15. Decisions and conflicts

<!-- What: the count of ADRs and of settled conflicts, pointing at
     docs/architecture/decisions.md, and every ADR still needed.
     Good: each contradiction found between the ADRs, the stories and the
     data model is settled in the register, not argued here; an open
     conflict blocks Approved.
     Example: "12 ADRs, 5 conflicts settled (2 Proposed), 0 open; ADR
     needed: search store." -->

## 16. What the review found

<!-- What: the independent review by critic, which wrote none of this:
     a "Reviewed by:" line, then one "### <SEVERITY>: <title>" per finding
     graded BLOCKER, MAJOR, MINOR or NIT, each with what is wrong,
     "Conflicts with:" (the ADRs, sections, stories or tables it
     contradicts), "Fix:" and "Status: open | fixed (<where>) | accepted
     (<who>)".
     Good: BLOCKER means it cannot be built as written, MAJOR costs weeks;
     the HLD is not Approved while a BLOCKER is open.
     Example: "### BLOCKER: ADR-0005 keeps secrets in a manager ADR-0007
     excludes / Conflicts with: ADR-0005, ADR-0007 / Fix: move the signing
     key to the per-environment config ADR-0009 set up / Status: open" -->

## 17. Open questions and assumptions

<!-- What: each open question and each "assumption:" from the sections
     above, with an owner and a date.
     Good: an owner who can answer it and the date it blocks; a question
     with no owner is counted as missing in the output contract.
     Example: "assumption: stores never share customers across tenants;
     owner Priya (product), answer by 2026-10-05." -->
