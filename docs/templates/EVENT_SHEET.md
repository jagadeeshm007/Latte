# Event design sheet

<!-- Template guidance: every product analytics event, designed before it
     is emitted; the generated catalogue and analytics-events audit compare the
     code with this table, so one row per event, never per platform. Product,
     data and engineering read it. Every comment says what goes there (What),
     what a strong entry has (Good) and an example (Example). Delete each
     comment when you fill its section. -->

Every product analytics event, designed before it is emitted. Code emits
exactly this list. No PII in properties.

<!-- What: one row per event: when it fires, its properties, platforms,
     owner and the task or story that added it.
     Good: one trigger in one place; properties as name: type with each
     enumeration spelled out; standard properties come from the context
     layer; no PII (user text hashed or dropped, identity via identify);
     rows from derived journeys are marked derived until the backlog agrees.
     Example: "`report_filed` | a receptionist confirms a report's patient
     match | `match_method: auto|manual`, `pages: int` | web | labs-team |
     ENG-471" -->

| Event name | When it fires | Properties (name: type) | Platform | Owner | Added in |
| --- | --- | --- | --- | --- | --- |
| `screen_viewed` | a screen becomes visible | `screen: string` | web, ios, android | | TASK-ID |

## Naming

<!-- What: the naming rule this sheet follows.
     Good: keep the rule as written; add only the enumerations or prefixes
     this product fixes, and never rename a shipped event.
     Example: "Screen views are `screen_viewed` with a `screen` property,
     never one event per screen." -->

`object_verb` in snake_case, past tense: `invoice_paid`, `search_submitted`.
Properties in snake_case. Enumerations listed in the property column.

## Identity

<!-- What: which id identifies a user, a session and a device, and where
     each is set.
     Good: names the file or module that sets each id and the moments
     identify fires; the user id is the account id, never the email; details
     live in tracking-plan.md.
     Example: "User: account id, set by identify in src/analytics/index.ts
     on login and signup; reset on logout." -->

Which id identifies a user, a session, a device, and where it is set.
