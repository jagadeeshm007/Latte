---
paths:
  - "src/**"
  - "app/**"
  - "lib/**"
  - "internal/**"
  - "cmd/**"
  - "pkg/**"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.go"
  - "**/*.py"
  - "**/*.kt"
  - "**/*.swift"
  - "**/*.dart"
---

# Code rules that hold in every stack (loaded when a source file is touched)

- Validate at the boundary, trust inside. Every request, response, message
  and config value is validated once, where it enters, with a schema the
  code derives its types from (Zod, Pydantic, Go structs with validation,
  Kotlin data classes with `require`, Swift `Codable` with checks).
- Errors carry context and are handled once. Wrap with what you were doing;
  map to a status code or user message at the edge; never swallow, never
  log and rethrow.
- No derived state stored. Compute it during render or on read. The server
  cache (TanStack Query, Room, Core Data) is the only copy of server data.
- No premature memoisation, caching or abstraction. Measure first.
- Names say what a thing is for. A function under thirty lines does one
  thing; a file under four hundred lines has one reason to change.
- Comments explain why, never what. Public functions get a one-line doc
  comment. TODOs carry the task id.
- Logs are structured, carry the request or trace id, and never contain a
  secret or PII.
- Feature flags default off; every flag has an owner and a removal task.
- Generated UI components under `src/components/ui/` (shadcn and similar)
  are regenerated from their source, never edited by hand; wrap or extend
  them in a sibling component instead.
