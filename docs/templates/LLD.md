# Low Level Design: <component>

<!-- Template guidance: every section below carries a comment saying what goes
     there (What), what a strong entry has (Good) and a one-line example
     (Example). Delete each comment when you fill its section. An LLD turns
     one component of an agreed HLD into files, types, queries and MRs, for
     the engineers who build it and the reviewers of those MRs. It never
     reopens the goal, the store or the boundaries; a change to any of them
     is an ADR and an HLD edit first. Put the HLD's ids and the AC-US-nn-nnn-k
     ids the tests cover at the top. -->

- Task: TASK-ID, HLD: link, ADRs: links
- Author, date, status

## 1. Scope

<!-- What: the one component this covers and its boundary, in two
     sentences.
     Good: exactly one component; a scope that spans two gets two LLDs. With
     no HLD, the boundary comes from the code and is confirmed with the user.
     Example: "The slot allocator in internal/booking/: it reserves and
     releases slots; payment and notifications stay outside it." -->

## 2. Module layout

<!-- What: the packages and files, and what each owns, mirroring the stack
     skill's layout rules.
     Good: existing files are real paths; new ones are marked (new); a file
     expected to pass 400 lines is split here, not later.
     Example: "internal/booking/allocator.go (new): Reserve and Release,
     owns the slot state machine; about 180 lines." -->

## 3. Types and schemas

<!-- What: the domain types, the boundary schemas (request, response,
     event, config) and the one place each is validated.
     Good: each schema names its single validation point; HTTP shapes point
     at api/openapi.yaml rather than being repeated here.
     Example: "ReserveRequest: POST /v1/slots/reserve in api/openapi.yaml,
     validated once in internal/http/booking_handler.go." -->

## 4. Sequence

<!-- What: one mermaid sequenceDiagram per flow, with an alt block for
     every error branch.
     Good: the error branches are drawn, not described in a sentence; a flow
     with no error branch carries the line "UNDEFINED error branch".
     Example: "alt slot already taken: Allocator->>Handler: ErrSlotTaken;
     Handler->>Client: 409 slot_taken." -->

## 5. Data access

<!-- What: each query with the index it uses and its query shape, the
     transactions and their boundaries, and the migrations in order as
     db-migration names.
     Good: every query names its index or is marked a known full scan with
     the row count ("add index later" is a query without one); each
     transaction says what is inside, what is not and why.
     Example: "Find free slots: WHERE clinic_id = $1 AND starts_at >= $2,
     idx_slots_clinic_starts; migration add_slots_hold_until (expand)." -->

## 6. Errors

<!-- What: each error type, where it is created, where it is wrapped and
     where it is mapped to a status code or user message.
     Good: file-level locations for all three; HTTP errors use the repo's
     JSON error envelope from openapi-spec.
     Example: "ErrSlotTaken: created in allocator.go, wrapped in
     service.go, mapped to 409 slot_taken in booking_handler.go." -->

## 7. Configuration

<!-- What: every variable, its default, and what happens when it is
     missing.
     Good: each variable appears in .env.example; any that does not is
     listed here as missing from it.
     Example: "| SLOT_HOLD_SECONDS | 300 | missing: the default applies and
     startup logs a warning |" -->

## 8. Tests

<!-- What: the unit, integration and end-to-end tests this design needs,
     by name.
     Good: each test has a real name and is tagged with the AC-US-nn-nnn-k
     or TC-nnnn it proves; a category like "unit tests for the allocator"
     is not a name.
     Example: "TestReserve_SecondCallerGetsSlotTaken (unit), proves
     AC-US-02-003-2." -->

## 9. Work breakdown

<!-- What: the tasks in order, each one MR, naming the files it touches,
     the tests it adds and an estimated line count.
     Good: no item over 400 lines; every MR leaves make check green, so an
     item that only compiles after the next one is two items in the wrong
     order. Zero items means the design is not done.
     Example: "2. Allocator and its unit tests: allocator.go (new),
     allocator_test.go (new); about 260 lines." -->

## 10. Assumptions

<!-- What: every statement above that is not proven from the code, the HLD
     or an ADR, one per line with the prefix "assumption:"; the critic's
     three weakest claims go here too when it ran.
     Good: each names what would confirm or break it and who can answer;
     the count here is the "Assumptions: K" line in the report.
     Example: "assumption: at most 40 reservations a second at the 07:00
     peak (from the HLD scaling section); confirm from the March access
     logs, owner: platform on-call." -->
